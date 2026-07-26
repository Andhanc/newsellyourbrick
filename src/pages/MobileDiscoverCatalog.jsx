import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaApple, FaGooglePlay } from 'react-icons/fa'
import { FiArrowRight, FiArrowUpRight } from 'react-icons/fi'
import Footer from '../components/Footer'
import MobileDiscoverFaq from '../components/MobileDiscoverFaq'
import InvestorPropertyShowcaseSection from '../components/InvestorPropertyShowcaseSection'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { useInvestorHomeShowcases } from '../hooks/useInvestorHomeShowcases'
import { fetchPublishedArticles } from '../services/newsApi'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { showNotification } from '../utils/toastHelper'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { publicAsset } from '../utils/publicAsset'
import './InvestorHomePage.css'
import '../styles/discoverAuctionCards.css'

const FLIP_PIN_PHOTO = publicAsset('images/mobile-discover/welcome-summer.png')
const BUY_NOW_PHOTO = publicAsset('images/mobile-discover/buy-now-summer.png')
const DEBTS_PHOTO = publicAsset('images/mobile-discover/debts-summer-cliff.png')
const CARD_GESTURE = 140
const TOUCH_GESTURE = 72
const JUMP_LOCK_MS = 680
const ANDROID_URL = 'https://play.google.com/store/apps'
const IOS_URL = 'https://apps.apple.com/'

const FORMAT_CARD_META = {
  auction: { tone: 'sheet' },
  buy_now: { tone: 'photo', photo: BUY_NOW_PHOTO },
  shares: { tone: 'sheet' },
}

const FALLBACK_NEWS = [
  {
    id: 'crimea-top',
    slug: null,
    image: '/images/external/photo-1565008576549-57569a49371d-2725bbeba2.jpg',
    badge: 'К морю',
    title: 'Топ-10 курортных городов южного берега Крыма',
    excerpt: 'Куда стоит поехать за морем, природой и спокойным отдыхом.',
    date: '25 мар 2026',
  },
  {
    id: 'kaliningrad-small',
    slug: null,
    image: '/images/external/photo-1449824913935-59a10b8d2000-e6bb6de958.jpg',
    badge: 'Идеи для поездок',
    title: 'Малые города Калининградской области на выходные',
    excerpt: 'Зеленоградск, Светлогорск и другие уютные точки без толп.',
    date: '22 мар 2026',
  },
  {
    id: 'architecture',
    slug: null,
    image: '/images/external/photo-1486406146926-c627a92ad1ab-f0c377ec01.jpg',
    badge: 'Архитектура',
    title: 'Города с необычной архитектурой: куда поехать в 2026',
    excerpt: 'От модерна до авангарда — прогулки, которые превращаются в экскурсию.',
    date: '15 мар 2026',
  },
  {
    id: 'beach-aerial',
    slug: null,
    image: '/images/external/photo-1507525428034-b723cf961d3e-ae413f8ef9.jpg',
    badge: 'К морю',
    title: 'Пляжи с чистой водой и удобной инфраструктурой',
    excerpt: 'Побережья, куда комфортно добраться из крупных городов.',
    date: '10 мар 2026',
  },
]

const SHOWCASE_SECTIONS = [
  {
    id: 'auction',
    sectionId: 'invest-objects-auction',
    variant: 'auction',
    title: 'Аукцион',
    subtitle: 'Находите скрытые возможности и приобретайте объекты по лучшей цене',
    ctaLabel: 'Перейти',
    to: '/auction?filter=auction',
    itemsKey: 'auctionSection',
  },
  {
    id: 'buy_now',
    sectionId: 'invest-objects-buy-now',
    variant: 'buyNow',
    title: 'Купить сейчас',
    subtitle: 'Готовые объекты по фиксированной цене без торгов',
    ctaLabel: 'Перейти',
    to: '/auction?filter=buy_now',
    itemsKey: 'buyNowSection',
  },
  {
    id: 'shares',
    sectionId: 'invest-objects-shares',
    variant: 'shares',
    title: 'Доли',
    subtitle: 'Инвестируйте в доли крупных объектов от минимальных сумм',
    ctaLabel: 'Перейти',
    to: '/shares',
    itemsKey: 'sharesSection',
  },
  {
    id: 'debts',
    sectionId: 'invest-objects-debts',
    variant: 'debts',
    title: 'Долги',
    subtitle: 'Инвестируйте в долговые инструменты под залог недвижимости',
    ctaLabel: 'Перейти',
    to: '/debts',
    itemsKey: 'debtsSection',
  },
]

function FormatCard({ id, index, tone = 'sheet', photo, children }) {
  return (
    <section
      className={`md-format-card md-format-card--${tone}`}
      data-md-format-card=""
      data-md-format={id}
      style={{ zIndex: index + 1 }}
    >
      {tone === 'photo' && photo ? (
        <>
          <img
            className="md-format-card__photo"
            src={photo}
            alt=""
            width={1080}
            height={1920}
            loading="lazy"
            decoding="async"
          />
          <div className="md-format-card__shade" aria-hidden="true" />
        </>
      ) : null}
      <div className="md-format-card__body">{children}</div>
    </section>
  )
}

/** Debts flip step + app download share one continuous photo */
function DebtsFlow({ index, children }) {
  return (
    <div className="md-debts-flow" style={{ zIndex: index + 1 }}>
      {/* Keeps welcome peek over previous sticky cards while debts/app are in view */}
      <div className="md-debts-flow__veil" aria-hidden="true">
        <img
          className="md-debts-flow__veil-photo"
          src={FLIP_PIN_PHOTO}
          alt=""
          width={1080}
          height={1920}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="md-debts-flow__media" aria-hidden="true">
        <img
          className="md-debts-flow__photo"
          src={DEBTS_PHOTO}
          alt=""
          width={1080}
          height={1920}
          loading="lazy"
          decoding="async"
        />
        <div className="md-debts-flow__shade" />
      </div>
      <div className="md-debts-flow__content">
        <section
          className="md-format-card md-format-card--photo md-format-card--debts-step"
          data-md-format-card=""
          data-md-format="debts"
        >
          <div className="md-format-card__body">{children}</div>
        </section>
        <div className="md-debts-flow__app">
          <AppDownloadSection />
        </div>
      </div>
    </div>
  )
}

function AppDownloadSection() {
  return (
    <section className="md-app-download" aria-labelledby="md-app-download-title">
      <div className="md-app-download__inner">
        <p className="md-app-download__kicker">Мобильное приложение</p>
        <h2 id="md-app-download-title" className="md-app-download__title">
          <span className="md-app-download__brand">
            <span>Sell</span>
            <span className="md-app-download__brand-accent">Your</span>
            <span>Brick</span>
          </span>
          <span className="md-app-download__title-rest">всегда с собой</span>
        </h2>
        <p className="md-app-download__lead">
          Аукционы, покупки и инвестиции — всё в одном приложении
        </p>

        <div className="md-app-download__actions">
          <a
            className="md-app-download__btn md-app-download__btn--ios"
            href={IOS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="md-app-download__btn-icon" aria-hidden>
              <FaApple />
            </span>
            <span className="md-app-download__btn-copy">
              <span className="md-app-download__btn-eyebrow">Загрузить в</span>
              <span className="md-app-download__btn-label">App Store</span>
            </span>
          </a>

          <a
            className="md-app-download__btn md-app-download__btn--android"
            href={ANDROID_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="md-app-download__btn-icon" aria-hidden>
              <FaGooglePlay />
            </span>
            <span className="md-app-download__btn-copy">
              <span className="md-app-download__btn-eyebrow">Доступно в</span>
              <span className="md-app-download__btn-label">Google Play</span>
            </span>
          </a>
        </div>
      </div>
    </section>
  )
}

function NewsSection({ articles }) {
  const navigate = useNavigate()
  const [featured, ...rest] = articles

  const openArticle = (article) => {
    if (article?.slug) navigate(`/news/${article.slug}`)
    else navigate('/news')
  }

  return (
    <section className="md-news" aria-labelledby="md-news-title">
      <div className="md-news__inner">
        <header className="md-news__header">
          <div className="md-news__title-row">
            <h2 id="md-news-title" className="md-news__title">
              Новости
            </h2>
            <Link to="/news" className="md-news__all">
              <span>Все новости</span>
              <FiArrowRight aria-hidden />
            </Link>
          </div>
          <p className="md-news__subtitle">
            Идеи для поездок, рынок и свежие материалы о недвижимости
          </p>
        </header>

        {featured ? (
          <article className="md-news-feature">
            <button
              type="button"
              className="md-news-feature__hit"
              onClick={() => openArticle(featured)}
              aria-label={featured.title}
            >
              <div className="md-news-feature__media">
                <img
                  src={featured.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={720}
                  height={480}
                />
              </div>
              <div className="md-news-feature__overlay">
                <div className="md-news-feature__meta">
                  {featured.badge ? (
                    <span className="md-news-feature__badge">{featured.badge}</span>
                  ) : null}
                  {featured.date ? (
                    <time className="md-news-feature__date">{featured.date}</time>
                  ) : null}
                </div>
                <h3 className="md-news-feature__title">{featured.title}</h3>
                {featured.excerpt ? (
                  <p className="md-news-feature__excerpt">{featured.excerpt}</p>
                ) : null}
                <span className="md-news-feature__cta" aria-hidden>
                  Читать
                  <FiArrowUpRight />
                </span>
              </div>
            </button>
          </article>
        ) : null}

        {rest.length > 0 ? (
          <ul className="md-news__list">
            {rest.map((article, index) => (
              <li key={article.id || article.slug || index}>
                <article className="md-news-card">
                  <button
                    type="button"
                    className="md-news-card__hit"
                    onClick={() => openArticle(article)}
                    aria-label={article.title}
                  >
                    <div className="md-news-card__media">
                      <img
                        src={article.image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        width={160}
                        height={160}
                      />
                    </div>
                    <div className="md-news-card__body">
                      <div className="md-news-card__meta">
                        {article.badge ? (
                          <span className="md-news-card__badge">{article.badge}</span>
                        ) : null}
                        {article.date ? (
                          <time className="md-news-card__date">{article.date}</time>
                        ) : null}
                      </div>
                      <h3 className="md-news-card__title">{article.title}</h3>
                      <span className="md-news-card__cta" aria-hidden>
                        Читать
                        <FiArrowUpRight />
                      </span>
                    </div>
                  </button>
                </article>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}

/**
 * Property catalog on Mobile Discover — one full screen per sale format.
 */
export default function MobileDiscoverCatalog() {
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const jumpingRef = useRef(false)
  const wheelAcc = useRef(0)
  const [newsArticles, setNewsArticles] = useState(FALLBACK_NEWS)
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const {
    loading,
    auctionSection,
    buyNowSection,
    debtsSection,
    sharesSection,
  } = useInvestorHomeShowcases()

  const itemsByKey = {
    auctionSection,
    buyNowSection,
    sharesSection,
    debtsSection,
  }

  useEffect(() => {
    let cancelled = false
    fetchPublishedArticles()
      .then((articles) => {
        if (cancelled || !Array.isArray(articles) || articles.length === 0) return
        const fromApi = articles.slice(0, 4).map((article) => ({
          id: article.id,
          slug: article.slug,
          image: article.image,
          badge: article.badge || 'Новости',
          title: article.title,
          excerpt: article.excerpt,
          date: article.date,
        }))
        const filled = [...fromApi]
        for (const item of FALLBACK_NEWS) {
          if (filled.length >= 4) break
          if (filled.some((a) => a.id === item.id || a.title === item.title)) continue
          filled.push(item)
        }
        setNewsArticles(filled.slice(0, 4))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const showPropertyAuthRequiredToast = useCallback(() => {
    showNotification('Войдите в аккаунт, чтобы открыть карточку объекта.', 'warning', 7000)
    requestOpenLoginModal({ wizard: true })
  }, [])

  const renderSection = (section) => {
    const items = itemsByKey[section.itemsKey]
    if (!loading && (!items || items.length === 0)) return null

    return (
      <InvestorPropertyShowcaseSection
        key={section.id}
        sectionId={section.sectionId}
        title={section.title}
        subtitle={section.subtitle}
        ctaLabel={section.ctaLabel}
        onCtaClick={() => navigate(section.to)}
        loading={loading}
        items={items || []}
        variant={section.variant}
        navigate={navigate}
        isFavorite={isFavorite}
        toggleFavorite={toggleFavorite}
        ensureCanOpenProperty={ensureCanOpenProperty}
        showPropertyAuthRequiredToast={showPropertyAuthRequiredToast}
      />
    )
  }

  /*
   * Flip cards (auction → buy now → shares → debts): one gesture covers previous.
   * After debts parks, free scroll continues on the same debts photo (app block).
   */
  useEffect(() => {
    const catalog = rootRef.current
    const stage = catalog?.closest('.md-stage')
    if (!catalog || !stage) return undefined

    const elTop = (node) => {
      if (!node) return 0
      const stageRect = stage.getBoundingClientRect()
      const rect = node.getBoundingClientRect()
      return stage.scrollTop + (rect.top - stageRect.top)
    }

    const getOrigin = () => catalog.querySelector('[data-md-format-origin]')
    const getFlipCards = () =>
      Array.from(catalog.querySelectorAll('[data-md-format-card]'))
    const getFreeTail = () => catalog.querySelector('[data-md-free-tail]')

    const cardTop = (index) => {
      const origin = getOrigin()
      const cards = getFlipCards()
      if (!origin || !cards.length) return 0
      let y = elTop(origin)
      for (let i = 0; i < index; i += 1) {
        y += cards[i]?.offsetHeight || stage.clientHeight
      }
      return y
    }

    const nearestFlipIndex = () => {
      const cards = getFlipCards()
      if (!cards.length) return -1
      let best = 0
      let bestDist = Infinity
      cards.forEach((_, index) => {
        const dist = Math.abs(stage.scrollTop - cardTop(index))
        if (dist < bestDist) {
          bestDist = dist
          best = index
        }
      })
      return best
    }

    const freeTailTop = () => {
      const tail = getFreeTail()
      return tail ? elTop(tail) : Number.POSITIVE_INFINITY
    }

    const lastCardTop = () => {
      const cards = getFlipCards()
      if (!cards.length) return 0
      return cardTop(cards.length - 1)
    }

    const inFreeTail = () => stage.scrollTop >= freeTailTop() - 8

    /** Past debts park into app (same photo) — free native scroll */
    const inDebtsContinue = () => {
      const cards = getFlipCards()
      if (!cards.length) return false
      return stage.scrollTop > lastCardTop() + 36 && !inFreeTail()
    }

    const inFlipZone = () => {
      const cards = getFlipCards()
      if (!cards.length) return false
      return (
        stage.scrollTop >= cardTop(0) - 12 &&
        !inFreeTail() &&
        !inDebtsContinue()
      )
    }

    const jumpToY = (top) => {
      jumpingRef.current = true
      wheelAcc.current = 0
      stage.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
      window.setTimeout(() => {
        jumpingRef.current = false
        wheelAcc.current = 0
      }, JUMP_LOCK_MS)
    }

    const jumpToFlip = (index) => {
      const cards = getFlipCards()
      if (index < 0 || index >= cards.length) return
      jumpToY(cardTop(index))
    }

    /** If user nudges off a park point, snap back to nearest card */
    const settleFlip = () => {
      if (jumpingRef.current || !inFlipZone()) return
      const cards = getFlipCards()
      if (!cards.length) return
      const current = nearestFlipIndex()
      const target = cardTop(current)
      if (Math.abs(stage.scrollTop - target) > 10) jumpToY(target)
    }

    let settleTimer = 0

    const onWheel = (event) => {
      if (document.documentElement.classList.contains('login-modal-open')) return
      if (jumpingRef.current) {
        event.preventDefault()
        return
      }

      const cards = getFlipCards()
      if (!cards.length) return
      const last = cards.length - 1

      if (inFreeTail()) {
        if (event.deltaY < 0 && stage.scrollTop <= freeTailTop() + 24) {
          event.preventDefault()
          wheelAcc.current += event.deltaY
          if (Math.abs(wheelAcc.current) >= CARD_GESTURE) {
            wheelAcc.current = 0
            jumpToFlip(last)
          }
          return
        }
        wheelAcc.current = 0
        return
      }

      if (inDebtsContinue()) {
        if (event.deltaY < 0 && stage.scrollTop <= lastCardTop() + 56) {
          event.preventDefault()
          wheelAcc.current += event.deltaY
          if (Math.abs(wheelAcc.current) >= CARD_GESTURE) {
            wheelAcc.current = 0
            jumpToFlip(last)
          }
          return
        }
        wheelAcc.current = 0
        return
      }

      if (!inFlipZone()) {
        if (
          event.deltaY > 0 &&
          stage.scrollTop + stage.clientHeight >= cardTop(0) - 28
        ) {
          event.preventDefault()
          jumpToFlip(0)
        }
        return
      }

      // Hard lock in flip zone — no native scroll between cards
      event.preventDefault()
      wheelAcc.current += event.deltaY
      if (Math.abs(wheelAcc.current) < CARD_GESTURE) return

      const current = nearestFlipIndex()
      const goingDown = wheelAcc.current > 0
      wheelAcc.current = 0

      if (goingDown) {
        if (current >= last) {
          // Release into debts photo continue (app)
          jumpToY(lastCardTop() + Math.min(220, stage.clientHeight * 0.32))
        } else {
          jumpToFlip(current + 1)
        }
        return
      }

      if (current <= 0) {
        jumpToY(Math.max(0, cardTop(0) - stage.clientHeight * 0.42))
        return
      }
      jumpToFlip(current - 1)
    }

    let touchY = 0
    let touchX = 0
    const onTouchStart = (event) => {
      touchY = event.touches[0]?.clientY ?? 0
      touchX = event.touches[0]?.clientX ?? 0
    }
    const onTouchEnd = (event) => {
      if (document.documentElement.classList.contains('login-modal-open')) return
      if (jumpingRef.current) return
      const endY = event.changedTouches[0]?.clientY ?? touchY
      const endX = event.changedTouches[0]?.clientX ?? touchX
      const dy = touchY - endY
      const dx = Math.abs(endX - touchX)
      if (Math.abs(dy) < TOUCH_GESTURE || dx > Math.abs(dy) * 0.8) {
        if (inFlipZone()) settleFlip()
        return
      }

      const cards = getFlipCards()
      if (!cards.length) return
      const last = cards.length - 1

      if (inFreeTail()) {
        if (dy < 0 && stage.scrollTop <= freeTailTop() + 32) {
          jumpToFlip(last)
        }
        return
      }

      if (inDebtsContinue()) {
        if (dy < 0 && stage.scrollTop <= lastCardTop() + 64) {
          jumpToFlip(last)
        }
        return
      }

      if (!inFlipZone()) {
        if (dy > 0 && stage.scrollTop + stage.clientHeight >= cardTop(0) - 36) {
          jumpToFlip(0)
        }
        return
      }

      const current = nearestFlipIndex()
      if (dy > 0) {
        if (current >= last) {
          jumpToY(lastCardTop() + Math.min(220, stage.clientHeight * 0.32))
        } else {
          jumpToFlip(current + 1)
        }
      } else if (current <= 0) {
        jumpToY(Math.max(0, cardTop(0) - stage.clientHeight * 0.42))
      } else {
        jumpToFlip(current - 1)
      }
    }

    const onTouchMove = (event) => {
      if (document.documentElement.classList.contains('login-modal-open')) return
      if (jumpingRef.current) {
        event.preventDefault()
        return
      }
      // Block native drag-scroll only between format card parks
      if (inFlipZone()) event.preventDefault()
    }

    const onScroll = () => {
      if (document.documentElement.classList.contains('login-modal-open')) return
      if (jumpingRef.current || !inFlipZone()) return
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(settleFlip, 90)
    }

    stage.addEventListener('wheel', onWheel, { passive: false })
    stage.addEventListener('scroll', onScroll, { passive: true })
    stage.addEventListener('touchstart', onTouchStart, { passive: true })
    stage.addEventListener('touchmove', onTouchMove, { passive: false })
    stage.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.clearTimeout(settleTimer)
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('scroll', onScroll)
      stage.removeEventListener('touchstart', onTouchStart)
      stage.removeEventListener('touchmove', onTouchMove)
      stage.removeEventListener('touchend', onTouchEnd)
    }
  }, [loading])

  const auction = SHOWCASE_SECTIONS.find((s) => s.id === 'auction')
  const buyNow = SHOWCASE_SECTIONS.find((s) => s.id === 'buy_now')
  const shares = SHOWCASE_SECTIONS.find((s) => s.id === 'shares')
  const debts = SHOWCASE_SECTIONS.find((s) => s.id === 'debts')

  const formatCards = [
    auction ? { id: 'auction', node: renderSection(auction) } : null,
    buyNow ? { id: 'buy_now', node: renderSection(buyNow) } : null,
    shares ? { id: 'shares', node: renderSection(shares) } : null,
    debts ? { id: 'debts', node: renderSection(debts) } : null,
  ]
    .filter((item) => item?.node)
    .map((item) => ({
      ...item,
      ...(FORMAT_CARD_META[item.id] || { tone: 'sheet' }),
    }))

  const pinCount = formatCards.length

  return (
    <div ref={rootRef} className="md-catalog invest-home-page discover-auction-cards">
      <div
        className="md-format-stack"
        style={{ '--md-flip-n': Math.max(pinCount, 1) }}
      >
        {/* Welcome photo pinned through all format peeks, including debts */}
        <div className="md-format-flip__pin" aria-hidden="true">
          <div className="md-format-flip__scene">
            <img
              className="md-format-flip__photo"
              src={FLIP_PIN_PHOTO}
              alt=""
              width={1080}
              height={1920}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>

        <div className="md-format-stack__origin" data-md-format-origin="" aria-hidden="true" />

        {formatCards.map((card, index) =>
          card.id === 'debts' ? (
            <DebtsFlow key={card.id} index={index}>
              {card.node}
            </DebtsFlow>
          ) : (
            <FormatCard
              key={card.id}
              id={card.id}
              index={index}
              tone={card.tone}
              photo={card.photo}
            >
              {card.node}
            </FormatCard>
          ),
        )}
      </div>

      <div className="md-free-tail" data-md-free-tail="">
        <NewsSection articles={newsArticles} />
        <MobileDiscoverFaq />
        <div className="md-footer-wrap">
          <Footer />
        </div>
      </div>
    </div>
  )
}
