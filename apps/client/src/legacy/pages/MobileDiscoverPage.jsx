import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiBookmark,
  FiGrid,
  FiPieChart,
  FiSearch,
  FiShoppingBag,
  FiX,
} from 'react-icons/fi'
import { HiOutlineSparkles } from 'react-icons/hi2'
import { MdGavel, MdOutlineReceiptLong } from 'react-icons/md'
import Header from '../components/Header'
import MobileDiscoverCatalog from './MobileDiscoverCatalog'
import { publicAsset } from '../utils/publicAsset'
import { getMainScrollEl, scrollMainTo } from '../utils/mainScroll'
import { CO_INVESTMENT_PATH } from '../utils/sectionRoutes'
import './MobileDiscoverPage.css'

const HERO_IMAGE = publicAsset('images/mobile-discover/hero-townhouses.png')
const WELCOME_HOUSE = publicAsset('images/mobile-discover/welcome-summer.png')

const SALE_CARDS = [
  {
    id: 'auction',
    title: 'Аукцион',
    description: 'Участвуйте в торгах и приобретайте объекты по лучшей цене',
    image: publicAsset('images/home-sale-formats/summer-2026/sale-format-auction-summer.webp'),
    imagePosition: '36% center',
    to: '/auction?filter=auction',
    theme: 'auction',
    Icon: MdGavel,
  },
  {
    id: 'buy_now',
    title: 'Купить сейчас',
    description: 'Покупайте недвижимость по фиксированной цене без ожидания',
    image: publicAsset('images/home-sale-formats/summer-2026/sale-format-buy-now-summer.webp'),
    imagePosition: '42% center',
    to: '/auction?filter=buy_now',
    theme: 'buy',
    Icon: FiShoppingBag,
  },
  {
    id: 'debts',
    title: 'Долги',
    description: 'Инвестируйте в объекты с задолженностью и получайте высокую доходность',
    image: publicAsset('images/home-sale-formats/summer-2026/sale-format-debts-summer.webp'),
    imagePosition: '46% center',
    to: '/debts',
    theme: 'debts',
    Icon: MdOutlineReceiptLong,
  },
  {
    id: 'shares',
    title: 'Доли',
    description: 'Покупайте доли в премиальных объектах и инвестируйте с умом',
    image: publicAsset('images/home-sale-formats/summer-2026/sale-format-shares-summer.webp'),
    imagePosition: '42% center',
    to: CO_INVESTMENT_PATH,
    theme: 'shares',
    Icon: FiPieChart,
  },
]

const MENU_ITEMS = [
  { id: 'auction', label: 'Аукцион', to: '/auction?filter=auction', Icon: MdGavel },
  { id: 'buy', label: 'Купить', to: '/auction?filter=buy_now', Icon: FiShoppingBag },
  { id: 'shares', label: 'Доли', to: CO_INVESTMENT_PATH, Icon: FiPieChart },
  { id: 'debts', label: 'Долги', to: '/debts', Icon: MdOutlineReceiptLong },
  { id: 'ai', label: 'AI', to: '/chat', Icon: HiOutlineSparkles },
]

const WHEEL_THRESHOLD = 40
const TOUCH_THRESHOLD = 56
const COVER_MS = 140
const HOLD_MS = 70
const REVEAL_MS = 480

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Two locked screens — never scroll halfway between them.
 * Intentional down → white flash → stage.
 * Intentional up → white flash → hero.
 */
export default function MobileDiscoverPage() {
  const navigate = useNavigate()
  const shellRef = useRef(null)
  const stageScrollRef = useRef(null)
  const busyRef = useRef(false)
  const screenRef = useRef('hero')
  const touchStartY = useRef(0)
  const wheelAcc = useRef(0)
  const timersRef = useRef([])

  const [screen, setScreen] = useState('hero') // hero | stage
  const [flashPhase, setFlashPhase] = useState('idle') // idle | cover | reveal
  const [menuOpen, setMenuOpen] = useState(false)
  const [saved, setSaved] = useState(() => new Set())
  const [stageEntered, setStageEntered] = useState(false)
  const [welcomeQuery, setWelcomeQuery] = useState('')

  screenRef.current = screen

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
  }, [])

  const later = useCallback((fn, ms) => {
    const id = window.setTimeout(fn, ms)
    timersRef.current.push(id)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('md-page-active')
    scrollMainTo(0, 0, 'instant')
    const layout = getMainScrollEl()
    if (layout) layout.style.overflowY = 'hidden'
    return () => {
      root.classList.remove('md-page-active')
      clearTimers()
      if (layout) layout.style.overflowY = ''
    }
  }, [clearTimers])

  const goTo = useCallback(
    (next) => {
      if (busyRef.current) return
      if (screenRef.current === next) return
      busyRef.current = true
      setMenuOpen(false)

      const finish = () => {
        busyRef.current = false
        wheelAcc.current = 0
      }

      if (prefersReducedMotion()) {
        setScreen(next)
        setStageEntered(next === 'stage')
        setFlashPhase('idle')
        finish()
        return
      }

      // 1) Cover everything with white BEFORE swapping screens
      setFlashPhase('cover')

      later(() => {
        // 2) Swap under the veil — user never sees a split frame
        setScreen(next)
        if (next === 'stage') {
          setStageEntered(false)
          if (stageScrollRef.current) stageScrollRef.current.scrollTop = 0
        }

        later(() => {
          if (next === 'stage') setStageEntered(true)
          // 3) Softly lift the veil
          setFlashPhase('reveal')
          later(() => {
            setFlashPhase('idle')
            finish()
          }, REVEAL_MS)
        }, HOLD_MS)
      }, COVER_MS)
    },
    [later],
  )

  // Wheel: accumulate intent, then jump screens
  useEffect(() => {
    const el = shellRef.current
    if (!el) return undefined

    const onWheel = (event) => {
      if (document.documentElement.classList.contains('login-modal-open')) return
      if (busyRef.current || flashPhase !== 'idle') {
        event.preventDefault()
        return
      }

      const current = screenRef.current
      const stageEl = stageScrollRef.current

      // On stage, allow inner scroll until edges
      if (current === 'stage' && stageEl) {
        const atTop = stageEl.scrollTop <= 2
        const canScroll = stageEl.scrollHeight > stageEl.clientHeight + 4
        const atBottom =
          !canScroll ||
          stageEl.scrollTop + stageEl.clientHeight >= stageEl.scrollHeight - 2
        const goingUp = event.deltaY < 0
        const goingDown = event.deltaY > 0

        // Content can scroll — drive stage directly (card strip steals default wheel)
        if (canScroll && ((goingDown && !atBottom) || (goingUp && !atTop))) {
          wheelAcc.current = 0
          stageEl.scrollTop += event.deltaY
          event.preventDefault()
          return
        }
        if (goingDown && atBottom) {
          // End of stage — don't jump further, don't block bounce awkwardly
          wheelAcc.current = 0
          return
        }
        if (goingUp && atTop) {
          event.preventDefault()
          wheelAcc.current += event.deltaY
          if (Math.abs(wheelAcc.current) >= WHEEL_THRESHOLD) goTo('hero')
          return
        }
      }

      event.preventDefault()
      wheelAcc.current += event.deltaY

      if (current === 'hero' && wheelAcc.current >= WHEEL_THRESHOLD) {
        goTo('stage')
      } else if (current === 'stage' && wheelAcc.current <= -WHEEL_THRESHOLD) {
        goTo('hero')
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [flashPhase, goTo])

  // Touch swipe
  useEffect(() => {
    const el = shellRef.current
    if (!el) return undefined

    const onStart = (event) => {
      touchStartY.current = event.touches[0]?.clientY ?? 0
    }

    const onEnd = (event) => {
      if (document.documentElement.classList.contains('login-modal-open')) return
      if (busyRef.current || flashPhase !== 'idle') return
      const endY = event.changedTouches[0]?.clientY ?? touchStartY.current
      const dy = touchStartY.current - endY
      const current = screenRef.current
      const stageEl = stageScrollRef.current

      if (current === 'hero' && dy > TOUCH_THRESHOLD) {
        goTo('stage')
        return
      }

      if (current === 'stage' && dy < -TOUCH_THRESHOLD) {
        const atTop = !stageEl || stageEl.scrollTop <= 2
        if (atTop) goTo('hero')
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchend', onEnd)
    }
  }, [flashPhase, goTo])

  const toggleSaved = (id) => {
    setSaved((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const flashClass =
    flashPhase === 'cover' ? ' is-cover' : flashPhase === 'reveal' ? ' is-reveal' : ''

  return (
    <div
      ref={shellRef}
      className={`md md--${screen}${flashPhase !== 'idle' ? ' is-flashing' : ''}`}
    >
      <div className={`md-flash${flashClass}`} aria-hidden="true" />

      {screen === 'hero' && (
        <section className="md-hero" aria-label="Welcome">
          <div className="md-hero__glow" aria-hidden="true" />

          <div className="md-hero__copy">
            <h1 className="md-hero__title">
              <span className="md-hero__title-line">Find Your Dream</span>
              <span className="md-hero__title-line">Home Easily</span>
            </h1>
            <p className="md-hero__lead">
              Now you can find your dream house easily and quickly at a low price
            </p>
          </div>

          <div className="md-hero__visual" aria-hidden="true">
            <img
              className="md-hero__image"
              src={HERO_IMAGE}
              alt=""
              width={1080}
              height={1920}
              decoding="async"
              fetchPriority="high"
            />
            <div className="md-hero__veil" />
          </div>

          <button
            type="button"
            className="md-hero__scroll"
            onClick={() => goTo('stage')}
            aria-label="Go to next screen"
          >
            <span className="md-hero__scroll-arrow" aria-hidden="true" />
          </button>
        </section>
      )}

      {screen === 'stage' && (
        <section
          ref={stageScrollRef}
          className={`md-stage${stageEntered ? ' is-ready' : ''}`}
          aria-label="Sale formats"
        >
          <div className={`md-site-nav${stageEntered ? ' is-in' : ''}`}>
            <Header />
          </div>

          <div className="md-stage__sheet">
            <div className="md-stage__intro">
              <h2 className="md-stage__title">
                Four <span className="md-stage__title-accent">Sales</span> Strategies
              </h2>
              <p className="md-stage__subtitle">Discover the best home for you</p>
            </div>

            <div className="md-cards" role="list">
              {SALE_CARDS.map((card, index) => {
                const isSaved = saved.has(card.id)
                const CardIcon = card.Icon
                return (
                  <article
                    key={card.id}
                    className={`md-card md-card--${card.theme}`}
                    role="listitem"
                    style={{
                      '--md-card-i': index,
                      '--md-card-image-position': card.imagePosition,
                    }}
                    aria-label={`${card.title}. ${card.description}`}
                  >
                    <div className="md-card__frame">
                      <img
                        className="md-card__image"
                        src={card.image}
                        alt=""
                        width={1536}
                        height={1024}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                      <div className="md-card__shade" aria-hidden="true" />
                      <div className="md-card__body">
                        <div className="md-card__copy">
                          <span className="md-card__icon" aria-hidden>
                            <CardIcon />
                          </span>
                          <h3 className="md-card__title">{card.title}</h3>
                          <p className="md-card__description">{card.description}</p>
                        </div>
                        <div className="md-card__actions">
                          <Link className="md-card__cta" to={card.to}>
                            Подробнее
                          </Link>
                          <button
                            type="button"
                            className={`md-card__save${isSaved ? ' is-on' : ''}`}
                            aria-label={isSaved ? 'Убрать из избранного' : 'Сохранить'}
                            aria-pressed={isSaved}
                            onClick={() => toggleSaved(card.id)}
                          >
                            <FiBookmark aria-hidden />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="md-welcome__copy">
              <h2 className="md-welcome__title">Buying Property Is Easy!</h2>
              <p className="md-welcome__lead">
                Find your next space, feel at home.
                <br />
                Where comfort meets convenience.
              </p>
            </div>
          </div>

          <section className="md-welcome" aria-label="Welcome">
            <div className="md-welcome__media">
              <img
                className="md-welcome__photo"
                src={WELCOME_HOUSE}
                alt=""
                width={1600}
                height={1200}
                loading="lazy"
                decoding="async"
              />
              <svg
                className="md-welcome__curve"
                viewBox="0 0 100 32"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M0 0 H100 V6 Q50 28 0 6 Z" fill="#ffffff" />
              </svg>

              <div className="md-welcome__brand" aria-label="SellYourBrick">
                <span className="md-welcome__brand-text">
                  <span className="md-welcome__brand-word">Sell</span>
                  <span className="md-welcome__brand-word md-welcome__brand-word--accent">Your</span>
                  <span className="md-welcome__brand-word">Brick</span>
                </span>
              </div>

              <div className="md-welcome__actions">
                <form
                  className="md-welcome__search"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const q = welcomeQuery.trim()
                    navigate(q ? `/auction?q=${encodeURIComponent(q)}` : '/auction')
                  }}
                >
                  <FiSearch className="md-welcome__search-icon" aria-hidden />
                  <input
                    className="md-welcome__search-input"
                    type="search"
                    value={welcomeQuery}
                    onChange={(event) => setWelcomeQuery(event.target.value)}
                    placeholder="Search city, villa, apartment…"
                    aria-label="Search properties"
                  />
                  <button type="submit" className="md-welcome__search-go" aria-label="Search">
                    <FiSearch aria-hidden />
                  </button>
                </form>

                <Link className="md-welcome__cta" to="/auction">
                  View all properties
                </Link>
              </div>

              <svg
                className="md-welcome__curve md-welcome__curve--bottom"
                viewBox="0 0 100 32"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {/* Soft white scoop at the bottom of the photo */}
                <path d="M0 32 H100 V20 Q50 6 0 20 Z" fill="#ffffff" />
              </svg>
            </div>
          </section>

          <MobileDiscoverCatalog />

          <div className={`md-fab${menuOpen ? ' is-open' : ''}`}>
            {menuOpen && (
              <button
                type="button"
                className="md-fab__away"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              />
            )}

            <nav
              className="md-fab__rail"
              aria-label="Sale formats menu"
              aria-hidden={!menuOpen}
              inert={!menuOpen ? true : undefined}
            >
              {MENU_ITEMS.map((item, index) => {
                const Icon = item.Icon
                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    className="md-fab__item"
                    style={{ '--md-fab-i': index }}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="md-fab__item-icon" aria-hidden>
                      <Icon />
                    </span>
                    <span className="md-fab__item-label">{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <button
              type="button"
              className="md-fab__toggle"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <FiX aria-hidden /> : <FiGrid aria-hidden />}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
