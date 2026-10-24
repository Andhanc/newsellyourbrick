import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSession, useUser } from '@clerk/clerk-react'
import {
  FiArrowUpRight,
  FiSearch,
  FiX,
} from 'react-icons/fi'
import { Sparkles } from 'lucide-react'
import SiteChatDock from '../components/SiteChatDock'
import { publicAsset } from '../utils/publicAsset'
import { getMainScrollEl, scrollMainTo } from '../utils/mainScroll'
import { wheelDeltaYInPixels } from '../utils/wheelDelta'
import { COMPASS_PATH, CO_INVESTMENT_PATH, TEST_DRIVE_PATH } from '../utils/sectionRoutes'
import {
  COMPASS_BANNER_SRC,
  COMPASS_PROMPT_DELAY_MS,
  getStrategyTitleKey,
  getCompassOfferSessionId,
  hasCompassOfferShown,
  markCompassIntroPending,
  markCompassOfferShown,
  markCompassPrompted,
  readCompassState,
} from '../utils/investmentCompass'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { isSoftLaunchFeatureBlocked } from '../utils/softLaunchAccess'
import { CLERK_DB_USER_SYNCED } from '../services/authService'
import './MobileDiscoverPage.css'

const Header = lazy(() => import('../components/Header'))
const MobileDiscoverCatalog = lazy(() => import('./MobileDiscoverCatalog'))
const MobileDiscoverTopListings = lazy(() => import('../components/MobileDiscoverTopListings'))
const InvestmentCompassDrawer = lazy(() => import('../components/InvestmentCompassDrawer'))
const InvestmentCompassPromoModal = lazy(() => import('../components/InvestmentCompassPromoModal'))

const HERO_IMAGE = publicAsset('images/mobile-discover/welcome-summer.png')
const WELCOME_HOUSE = publicAsset('images/mobile-discover/welcome-summer.png')

function getLaunchCards(t) {
  const photo = (name) => publicAsset(`images/test-drive/property-${name}.png`)
  const icon = (name) => publicAsset(`images/home-sale-formats/icons/${name}-3d.png`)
  return [
    {
      id: 'auction', iconSrc: icon('auction'), title: t('auction'), to: '/auction?filter=auction',
      caption: t('discoverPage_shortcutAuction'),
      photos: [photo('marbella'), photo('nice'), photo('paphos')],
    },
    {
      id: 'buy_now', iconSrc: icon('buy-now'), title: t('buyNowSectionTitle'), to: '/auction/buy-now',
      caption: t('discoverPage_shortcutBuyNow'),
      photos: [photo('sorrento'), photo('barcelona'), photo('santorini')],
    },
    {
      id: 'debts', iconSrc: icon('debts'), title: t('debtsTitle'), to: '/debts',
      caption: t('discoverPage_shortcutDebts'),
      photos: [photo('barcelona'), photo('paphos'), photo('nice')],
    },
    {
      id: 'shares', iconSrc: icon('shares'), title: t('coInvestment'), to: CO_INVESTMENT_PATH,
      caption: t('discoverPage_shortcutShares'),
      photos: [photo('santorini'), photo('marbella'), photo('sorrento')],
    },
    {
      id: 'development', iconSrc: publicAsset('images/mobile-discover/development-3d.webp'), title: t('develop.title'), to: '/development',
      caption: t('discoverPage_shortcutDevelop'),
      photos: [publicAsset('images/development/costa-adeje-cover.png'), photo('santorini'), photo('marbella')],
    },
  ]
}

function getSaleCards(t) {
  return [
    {
      id: 'map',
      title: t('map'),
      featureTitle: t('map'),
      to: '/map',
      iconSrc: publicAsset('images/mobile-discover/map-tiffany-pin.webp'),
      artHeight: 480,
    },
    {
      id: 'investor',
      title: t('calculator'),
      featureTitle: t('calculator'),
      to: '/calculator',
      iconSrc: publicAsset('images/mobile-discover/investor-calculator-tiffany.webp'),
      artHeight: 320,
      glass: true,
    },
    {
      id: 'vip',
      title: t('discoverPage_vipProperties'),
      featureTitle: t('discoverPage_vipProperties'),
      to: '/private-club',
      iconSrc: publicAsset('images/mobile-discover/vip-house-tiffany.webp'),
      artHeight: 439,
      glass: true,
    },
    {
      id: 'test_drive',
      title: t('testDrive'),
      featureTitle: t('testDriveLanding_heroTitle'),
      to: TEST_DRIVE_PATH,
      iconSrc: publicAsset('images/mobile-discover/test-drive-tiffany-luggage.webp'),
      artHeight: 960,
    },
  ]
}

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
  const { t } = useTranslation()
  const { user, isLoaded: userLoaded } = useUser()
  const { session, isLoaded: sessionLoaded } = useSession()
  const authSessionId = session?.id || ''
  const [shortcutsUnlocked, setShortcutsUnlocked] = useState(() => isSiteUserSignedIn(user, userLoaded))
  const navigate = useNavigate()
  const shellRef = useRef(null)
  const stageScrollRef = useRef(null)
  const launchSliderRef = useRef(null)
  const launchScrollLeftRef = useRef(null)
  const lotteryDialogRef = useRef(null)
  const lotteryTriggerRef = useRef(null)
  const catalogSentinelRef = useRef(null)
  const busyRef = useRef(false)
  const screenRef = useRef('hero')
  const touchStartY = useRef(0)
  const touchStartX = useRef(0)
  const wheelAcc = useRef(0)
  const timersRef = useRef([])

  const [screen, setScreen] = useState('hero') // hero | stage
  const [flashPhase, setFlashPhase] = useState('idle') // idle | cover | reveal
  const [stageEntered, setStageEntered] = useState(false)
  const [isStageNavExpanded, setIsStageNavExpanded] = useState(false)
  const [isFooterNear, setIsFooterNear] = useState(false)
  const [catalogReady, setCatalogReady] = useState(false)
  const [welcomeQuery, setWelcomeQuery] = useState('')
  const [activeLaunchCard, setActiveLaunchCard] = useState(0)
  const [lotteryComingSoonOpen, setLotteryComingSoonOpen] = useState(false)
  const [compassDrawerOpen, setCompassDrawerOpen] = useState(false)
  const [compassOfferOpen, setCompassOfferOpen] = useState(false)
  const [compassBannerDismissed, setCompassBannerDismissed] = useState(false)
  const compassResultStrategy = readCompassState().result?.strategy || ''
  const compassOfferBlockedRef = useRef(false)

  const saleCards = getSaleCards(t)
  const launchCards = getLaunchCards(t)

  const scrollLaunchTo = useCallback((index) => {
    const rail = launchSliderRef.current
    if (!rail) return
    const count = rail.querySelectorAll('.md-launch__item').length
    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth)
    const left = count <= 1 || maxScroll <= 0 ? 0 : (index / (count - 1)) * maxScroll
    launchScrollLeftRef.current = left
    rail.style.scrollSnapType = 'none'
    rail.scrollLeft = left
    setActiveLaunchCard(index)
  }, [])

  useLayoutEffect(() => {
    const rail = launchSliderRef.current
    const left = launchScrollLeftRef.current
    if (!rail || left == null) return
    rail.style.scrollSnapType = 'none'
    if (Math.abs(rail.scrollLeft - left) > 1) rail.scrollLeft = left
  }, [activeLaunchCard])

  useEffect(() => {
    if (!lotteryComingSoonOpen) return undefined
    const dialog = lotteryDialogRef.current
    const stage = stageScrollRef.current
    const previousOverflow = stage?.style.overflowY
    if (stage) stage.style.overflowY = 'hidden'
    dialog.showModal()
    dialog.querySelector('.md-lottery-modal__confirm')?.focus()
    return () => {
      dialog.close()
      if (stage) stage.style.overflowY = previousOverflow
      lotteryTriggerRef.current?.focus({ preventScroll: true })
    }
  }, [lotteryComingSoonOpen])

  useEffect(() => {
    const refreshShortcutAccess = () => setShortcutsUnlocked(isSiteUserSignedIn(user, userLoaded))
    refreshShortcutAccess()
    window.addEventListener(CLERK_DB_USER_SYNCED, refreshShortcutAccess)
    window.addEventListener('storage', refreshShortcutAccess)
    window.addEventListener('focus', refreshShortcutAccess)
    return () => {
      window.removeEventListener(CLERK_DB_USER_SYNCED, refreshShortcutAccess)
      window.removeEventListener('storage', refreshShortcutAccess)
      window.removeEventListener('focus', refreshShortcutAccess)
    }
  }, [user, userLoaded])

  const handleDiscoverSearch = (event) => {
    event.preventDefault()
    const query = welcomeQuery.trim()
    navigate(query ? `/search-results?q=${encodeURIComponent(query)}` : '/search-results')
  }

  const openSearchAssistant = () => {
    if (isSoftLaunchFeatureBlocked('aiAssistant')) {
      navigate('/chat?assistant=1')
      return
    }
    window.dispatchEvent(new CustomEvent('openAIChat'))
  }

  screenRef.current = screen
  compassOfferBlockedRef.current = compassDrawerOpen

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
      root.classList.remove('md-page-active', 'md-hero-chrome')
      clearTimers()
      if (layout) layout.style.overflowY = ''
    }
  }, [clearTimers])

  /* iPhone Safari: сплошной theme-color / фон body рисует непрозрачные плашки.
   * На герое включаем прозрачное стекло и сдвигаем документ на runway,
   * чтобы под статус-баром было небо, а под тулбаром — фото. */
  useEffect(() => {
    const root = document.documentElement
    const metas = Array.from(document.querySelectorAll('meta[name="theme-color"]'))
    const STAGE_CHROME = '#ffffff'
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const narrowQuery = window.matchMedia('(max-width: 1023px)')
    let frame = 0
    let stuckAt = -1

    const readRunway = () => {
      const value = Number.parseFloat(getComputedStyle(root).getPropertyValue('--md-safari-runway'))
      return Number.isFinite(value) && value > 0 ? value : 64
    }

    const paintTheme = (color) => {
      metas.forEach((meta) => meta.setAttribute('content', color))
    }

    const apply = () => {
      const immersive = screen === 'hero' && ios && narrowQuery.matches
      window.cancelAnimationFrame(frame)
      if (!immersive) {
        root.classList.remove('md-hero-chrome')
        paintTheme(STAGE_CHROME)
        window.scrollTo(0, 0)
        return
      }
      root.classList.add('md-hero-chrome')
      paintTheme('transparent')
      frame = window.requestAnimationFrame(() => {
        window.scrollTo(0, readRunway())
      })
    }

    const pinScroll = () => {
      if (!root.classList.contains('md-hero-chrome')) return
      const runway = readRunway()
      if (Math.abs(window.scrollY - runway) <= 1) {
        stuckAt = -1
        return
      }
      if (stuckAt === window.scrollY) return
      stuckAt = window.scrollY
      window.scrollTo(0, runway)
    }

    apply()
    narrowQuery.addEventListener('change', apply)
    window.addEventListener('scroll', pinScroll, { passive: true })

    return () => {
      window.cancelAnimationFrame(frame)
      narrowQuery.removeEventListener('change', apply)
      window.removeEventListener('scroll', pinScroll)
      root.classList.remove('md-hero-chrome')
      paintTheme(STAGE_CHROME)
      window.scrollTo(0, 0)
    }
  }, [screen])

  const openCompassDrawer = useCallback(() => {
    setCompassDrawerOpen(true)
  }, [])

  const closeCompassDrawer = useCallback(() => {
    setCompassDrawerOpen(false)
    markCompassPrompted()
  }, [])

  const startCompass = useCallback(() => {
    markCompassPrompted()
    markCompassIntroPending()
    setCompassDrawerOpen(false)
    setCompassOfferOpen(false)
    navigate(COMPASS_PATH)
  }, [navigate])

  useEffect(() => {
    setCompassOfferOpen(false)
    if (!sessionLoaded || !shortcutsUnlocked) {
      return undefined
    }

    const sessionId = getCompassOfferSessionId(authSessionId)
    if (!sessionId || hasCompassOfferShown(sessionId)) return undefined

    const enteredAt = Date.now()
    const id = window.setInterval(() => {
      if (hasCompassOfferShown(sessionId)) {
        window.clearInterval(id)
        return
      }
      if (Date.now() - enteredAt < COMPASS_PROMPT_DELAY_MS) return
      if (compassOfferBlockedRef.current || document.documentElement.classList.contains('login-modal-open')) return

      markCompassOfferShown(sessionId)
      setCompassOfferOpen(true)
      window.clearInterval(id)
    }, 200)

    return () => window.clearInterval(id)
  }, [shortcutsUnlocked, sessionLoaded, authSessionId])

  const goTo = useCallback(
    (next) => {
      if (busyRef.current) return
      if (screenRef.current === next) return
      busyRef.current = true

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
      // The format-stack pager already consumed this wheel — never re-drive
      // stage scroll by hand, that is what parked drawers half-open.
      if (event.defaultPrevented) return
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) return
      if (busyRef.current || flashPhase !== 'idle') {
        event.preventDefault()
        return
      }

      const current = screenRef.current
      const stageEl = stageScrollRef.current
      const dy = wheelDeltaYInPixels(event, stageEl?.clientHeight || el.clientHeight)

      // On stage, allow inner scroll until edges
      if (current === 'stage' && stageEl) {
        const atTop = stageEl.scrollTop <= 2
        const canScroll = stageEl.scrollHeight > stageEl.clientHeight + 4
        const atBottom =
          !canScroll ||
          stageEl.scrollTop + stageEl.clientHeight >= stageEl.scrollHeight - 2
        const goingUp = dy < 0
        const goingDown = dy > 0

        // Keep native, inertial scrolling. Only horizontal rails need their
        // vertical wheel routed to the stage, since they can swallow it.
        if (canScroll && ((goingDown && !atBottom) || (goingUp && !atTop))) {
          wheelAcc.current = 0
          if (event.target.closest?.('.md-cards, .invest-showcase__scroller, .home-showcase__scroller')) {
            stageEl.scrollTop += dy
            event.preventDefault()
          }
          return
        }
        if (goingDown && atBottom) {
          // End of stage — don't jump further, don't block bounce awkwardly
          wheelAcc.current = 0
          return
        }
        if (goingUp && atTop) {
          event.preventDefault()
          wheelAcc.current = Math.min(0, wheelAcc.current) + dy
          if (Math.abs(wheelAcc.current) >= WHEEL_THRESHOLD) goTo('hero')
          return
        }
      }

      event.preventDefault()
      if (current === 'hero') {
        // Upward gestures on the first screen must not build a negative debt
        // that makes the next downward gesture feel stuck.
        wheelAcc.current = dy > 0 ? Math.max(0, wheelAcc.current) + dy : 0
        if (wheelAcc.current >= WHEEL_THRESHOLD) goTo('stage')
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [flashPhase, goTo])

  useEffect(() => {
    if (screen !== 'stage') {
      setIsFooterNear(false)
      return undefined
    }

    const stage = stageScrollRef.current
    const footer = stage?.querySelector('.md-footer-wrap')
    if (!stage || !footer || typeof IntersectionObserver === 'undefined') {
      setIsFooterNear(false)
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsFooterNear(Boolean(entry?.isIntersecting)),
      {
        root: stage,
        rootMargin: '0px 0px -12% 0px',
        threshold: [0, 0.01],
      },
    )

    observer.observe(footer)
    return () => observer.disconnect()
  }, [screen])

  useEffect(() => {
    if (screen !== 'stage') {
      setIsStageNavExpanded(false)
      setActiveLaunchCard(0)
      return undefined
    }

    const stage = stageScrollRef.current
    if (!stage) return undefined
    const updateNav = () => setIsStageNavExpanded(stage.scrollTop > 0)
    updateNav()
    stage.addEventListener('scroll', updateNav, { passive: true })
    return () => stage.removeEventListener('scroll', updateNav)
  }, [screen])


  useEffect(() => {
    if (screen !== 'stage') {
      setCatalogReady(false)
      return undefined
    }

    const stage = stageScrollRef.current
    const sentinel = catalogSentinelRef.current
    if (!stage || !sentinel || typeof IntersectionObserver === 'undefined') {
      setCatalogReady(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setCatalogReady(true)
      },
      {
        root: stage,
        rootMargin: '160px 0px',
        threshold: 0,
      },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [screen, stageEntered])

  // Touch swipe
  useEffect(() => {
    const el = shellRef.current
    if (!el) return undefined

    const onStart = (event) => {
      touchStartY.current = event.touches[0]?.clientY ?? 0
      touchStartX.current = event.touches[0]?.clientX ?? 0
    }

    const onEnd = (event) => {
      if (document.documentElement.classList.contains('login-modal-open')) return
      if (busyRef.current || flashPhase !== 'idle') return
      const endY = event.changedTouches[0]?.clientY ?? touchStartY.current
      const dy = touchStartY.current - endY
      const dx = touchStartX.current - (event.changedTouches[0]?.clientX ?? touchStartX.current)
      // Horizontal carousel swipes must not trigger the vertical screen transition.
      if (Math.abs(dx) > Math.abs(dy)) return
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

  const flashClass =
    flashPhase === 'cover' ? ' is-cover' : flashPhase === 'reveal' ? ' is-reveal' : ''

  return (
    <SiteChatDock
      wrapperClassName="md-discover-ai-floats"
      hideFab={screen === 'hero' || isFooterNear}
    >
    <div
      ref={shellRef}
      className={`md md--${screen}${flashPhase !== 'idle' ? ' is-flashing' : ''}`}
    >
      <div className={`md-flash${flashClass}`} aria-hidden="true" />

      {screen === 'hero' && (
        <section className="md-hero" aria-label={t('discoverPage_welcomeAria')}>
          <div className="md-hero__glow" aria-hidden="true" />

          <div className="md-hero__copy">
            <h1 className="md-hero__title">
              {t('discoverPage_heroTitleLine1')}
              <br />
              {t('discoverPage_heroTitleLine2')}
            </h1>
            <p className="md-hero__lead">{t('discoverPage_heroLead')}</p>
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

          <div className="md-hero__safari-clear md-hero__safari-clear--top" aria-hidden="true" />
          <div className="md-hero__safari-clear" aria-hidden="true" />

          <button
            type="button"
            className="md-hero__scroll"
            onClick={() => goTo('stage')}
            aria-label={t('discoverPage_goToNextScreen')}
          >
            <span className="md-hero__scroll-arrow" aria-hidden="true" />
          </button>
        </section>
      )}

      {screen === 'stage' && (
        <section
          ref={stageScrollRef}
          className={`md-stage${stageEntered ? ' is-ready' : ''}`}
          aria-label={t('discoverPage_saleFormatsAria')}
        >
          <div className={`md-site-nav${isStageNavExpanded ? ' is-expanded' : ' is-hidden'}`}>
            <Suspense fallback={null}>
              <Header />
            </Suspense>
          </div>

          <div className="md-stage__launch">
            <span className="md-launch__brand" role="img" aria-label="SellYouBrick">Sell<span className="md-brand__you">You</span>Brick</span>
            <h2 className="md-launch__headline">
              <span>{t('discoverPage_launchTitleLine1')}</span>
              <span>{t('discoverPage_launchTitleLine2')}</span>
            </h2>
            <div
              ref={launchSliderRef}
              className="md-launch__slider"
              onPointerDown={(event) => {
                launchScrollLeftRef.current = null
                if (event.currentTarget.style.scrollSnapType) event.currentTarget.style.scrollSnapType = ''
              }}
              onScroll={(event) => {
                const rail = event.currentTarget
                const maxScroll = rail.scrollWidth - rail.clientWidth
                setActiveLaunchCard(maxScroll > 0 ? Math.round(Math.max(0, Math.min(1, rail.scrollLeft / maxScroll)) * (launchCards.length - 1)) : 0)
              }}
              role="region"
              aria-label={t('discoverPage_rewardsFormats')}
              aria-roledescription={t('discoverPage_sliderAria')}
              tabIndex={0}
            >
              <div className="md-launch__cards" role="list">
                {launchCards.map((card, index) => (
                  <div className="md-launch__item" role="listitem" key={card.id}>
                    <Link className={`md-launch__card${index === 0 ? ' md-launch__card--featured' : ''}`} to={card.to}>
                      <span className="md-launch__card-heading">
                        <img className="md-launch__section-icon" src={card.iconSrc} alt="" aria-hidden="true" width="28" height="28" decoding="async" />
                        <strong className="md-launch__card-title">{card.title}</strong>
                      </span>
                      <span className="md-launch__card-caption">{card.caption}</span>
                      <span className="md-launch__photos" aria-hidden="true">
                        {card.photos.map((src) => (
                          <img key={src} src={src} alt="" width="40" height="40" decoding="async" />
                        ))}
                      </span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
            <div className="md-launch__dots" role="group" aria-label={t('discoverPage_sliderCount', { count: launchCards.length })}>
              {launchCards.map((card, index) => (
                <button
                  key={card.id}
                  type="button"
                  className={`md-launch__dot${index === activeLaunchCard ? ' is-active' : ''}`}
                  aria-label={card.title}
                  aria-current={index === activeLaunchCard ? 'true' : undefined}
                  onClick={() => scrollLaunchTo(index)}
                />
              ))}
            </div>
            <svg className="md-launch__wave" viewBox="0 0 736 80" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 60 C85 14 145 44 242 52 C304 60 331 0 376 8 C424 12 463 73 514 55 C607 22 663 12 736 70 L736 80 L0 80 Z" fill="white" />
            </svg>
          </div>

          <div className="md-stage__sheet">
            <form className="md-stage__search" onSubmit={handleDiscoverSearch} role="search">
              <button type="submit" className="md-stage__search-submit" aria-label={t('search')}>
                <FiSearch aria-hidden="true" />
              </button>
              <input
                className="md-stage__search-input"
                type="search"
                value={welcomeQuery}
                onChange={(event) => setWelcomeQuery(event.target.value)}
                placeholder={t('discoverPage_searchAria')}
                aria-label={t('discoverPage_searchAria')}
              />
              <button
                type="button"
                className="md-stage__search-ai"
                onClick={openSearchAssistant}
                aria-label={t('aiAssistant')}
              >
                <Sparkles aria-hidden="true" />
                <span>AI</span>
              </button>
            </form>
            {!compassBannerDismissed ? (
              <div className="md-stage__compass">
                <button
                  type="button"
                  className="md-stage__compass-hit"
                  onClick={compassResultStrategy ? () => navigate(COMPASS_PATH) : openCompassDrawer}
                  aria-label={
                    compassResultStrategy
                      ? t('compass_stageResult', { strategy: t(getStrategyTitleKey(compassResultStrategy)) })
                      : t('compass_stageCta')
                  }
                >
                  <span className="md-stage__compass-copy">
                    <strong>
                      {compassResultStrategy ? t('compass_stageResultTitle') : t('compass_stageCtaTitle')}
                    </strong>
                    <span>
                      {compassResultStrategy
                        ? t('compass_stageResultLead', { strategy: t(getStrategyTitleKey(compassResultStrategy)) })
                        : t('compass_stageCtaLead')}
                    </span>
                  </span>
                  <img
                    className="md-stage__compass-art"
                    src={publicAsset(COMPASS_BANNER_SRC)}
                    alt=""
                    width="768"
                    height="768"
                    decoding="async"
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  className="md-stage__compass-close"
                  onClick={() => setCompassBannerDismissed(true)}
                  aria-label={t('compass_stageDismiss')}
                >
                  <FiX aria-hidden="true" />
                </button>
              </div>
            ) : null}

            <Suspense fallback={null}>
              <MobileDiscoverTopListings isSignedIn={shortcutsUnlocked} />
            </Suspense>

            <div className="md-welcome__copy">
              <h2 className="md-welcome__title">{t('discoverPage_welcomeTitle')}</h2>
              <p className="md-welcome__lead">
                {t('discoverPage_welcomeLeadLine1')}
                {' '}
                {t('discoverPage_welcomeLeadLine2')}
              </p>
            </div>

          </div>

          <div className="md-welcome-flow">
            <section className="md-welcome" aria-label={t('discoverPage_welcomeAria')}>
              <div
                className="md-welcome__media"
                style={{ backgroundImage: `url("${WELCOME_HOUSE}")`, '--md-welcome-photo': `url("${WELCOME_HOUSE}")` }}
              >
              <svg
                className="md-welcome__curve"
                viewBox="0 0 100 32"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M0 0 H100 V6 Q50 28 0 6 Z" fill="#ffffff" />
              </svg>

              <div className="md-welcome__carousel">
                <div className="md-rewards">
                  <span className="md-rewards__brand" role="img" aria-label="SellYouBrick">Sell<span className="md-brand__you">You</span>Brick</span>
                  <button ref={lotteryTriggerRef} type="button" className="md-rewards__lottery" aria-haspopup="dialog" aria-controls="md-lottery-coming-soon" onClick={() => setLotteryComingSoonOpen(true)}>
                    <img className="md-rewards__lottery-ticket" src={publicAsset('images/mobile-discover/lottery-tiffany-ticket.webp')} alt="" aria-hidden="true" width="160" height="160" loading="lazy" decoding="async" />
                    <span className="md-rewards__lottery-copy">{t('discoverPage_lotteryText')}</span>
                    <span className="md-rewards__lottery-cta">{t('discoverPage_lotteryAction')}</span>
                  </button>
                  <div className="md-rewards__tiles" role="list" aria-label={t('discoverPage_rewardsFormats')}>
                    {saleCards.map((card, index) => (
                      <div className={`md-rewards__tile md-rewards__tile--${index + 1}`} role="listitem" key={card.id}>
                        <Link className={`md-rewards__tile-link${card.featureTitle ? ` md-rewards__tile-link--feature md-rewards__tile-link--${card.id}` : ''}${card.glass ? ' md-rewards__tile-link--glass' : ''}`} to={card.to} aria-label={card.title}>
                          {card.featureTitle ? (
                            <>
                              <strong className="md-rewards__feature-title">{card.featureTitle}</strong>
                              <img className="md-rewards__feature-art" src={card.iconSrc} alt="" aria-hidden="true" width={card.glass ? 480 : 720} height={card.artHeight} loading="lazy" decoding="async" />
                              <span className="md-rewards__feature-cta">{t('aboutCorp_moreDetails')}</span>
                              <span className="md-rewards__feature-arrow" aria-hidden="true"><FiArrowUpRight /></span>
                            </>
                          ) : (
                            <>
                              <img src={card.iconSrc} alt="" aria-hidden="true" width="512" height="512" decoding="async" />
                              <strong className="md-rewards__tile-title">{card.title}</strong>
                            </>
                          )}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
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

            <div ref={catalogSentinelRef} className="md-catalog-sentinel" aria-hidden="true" />
            {catalogReady ? (
              <Suspense fallback={null}>
                <MobileDiscoverCatalog />
              </Suspense>
            ) : null}
          </div>

        </section>
      )}
    </div>
    <Suspense fallback={null}>
      {compassOfferOpen ? (
        <InvestmentCompassPromoModal
          isOpen={compassOfferOpen}
          onClose={() => setCompassOfferOpen(false)}
          onStart={startCompass}
        />
      ) : null}
      {compassDrawerOpen ? (
        <InvestmentCompassDrawer
          isOpen={compassDrawerOpen}
          onClose={closeCompassDrawer}
          onStart={startCompass}
        />
      ) : null}
    </Suspense>
    <dialog
      ref={lotteryDialogRef}
      id="md-lottery-coming-soon"
      className="md-lottery-modal"
      aria-labelledby="md-lottery-coming-soon-title"
      aria-describedby="md-lottery-coming-soon-description"
      onCancel={(event) => { event.preventDefault(); setLotteryComingSoonOpen(false) }}
      onClose={() => setLotteryComingSoonOpen(false)}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const buttons = event.currentTarget.querySelectorAll('button')
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        if ((!event.shiftKey && document.activeElement === last) || (event.shiftKey && document.activeElement === first)) {
          event.preventDefault()
          ;(event.shiftKey ? last : first).focus()
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setLotteryComingSoonOpen(false)
      }}
    >
      <button type="button" className="md-lottery-modal__close" aria-label={t('close')} onClick={() => setLotteryComingSoonOpen(false)}><FiX aria-hidden="true" /></button>
      <img className="md-lottery-modal__art" src={publicAsset('images/mobile-discover/lottery-tiffany-ticket.webp')} alt="" width="160" height="107" />
      <h2 id="md-lottery-coming-soon-title">{t('discoverPage_lotteryComingSoonTitle')}</h2>
      <p id="md-lottery-coming-soon-description">{t('discoverPage_lotteryComingSoonBody')}</p>
      <button type="button" className="md-lottery-modal__confirm" onClick={() => setLotteryComingSoonOpen(false)}>{t('lottery_gotIt')}</button>
    </dialog>
    </SiteChatDock>
  )
}
