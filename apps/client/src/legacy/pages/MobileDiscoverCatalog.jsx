import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiArrowUpRight } from 'react-icons/fi'
import Footer from '../components/Footer'
import MobileDiscoverFaq from '../components/MobileDiscoverFaq'
import InvestorPropertyShowcaseSection from '../components/InvestorPropertyShowcaseSection'
import { usePropertyFavorites, PROPERTY_FAVORITES_NEEDED } from '../context/PropertyFavoritesContext'
import { useInvestorHomeShowcases } from '../hooks/useInvestorHomeShowcases'
import { fetchPublishedArticles } from '../services/newsApi'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { showNotification } from '../utils/toastHelper'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { publicAsset } from '../utils/publicAsset'
import { AppleIcon, GooglePlayIcon } from '../components/icons/ContactChannelIcons'
import './InvestorHomePage.css'
import '../styles/discoverAuctionCards.css'

const BUY_NOW_PHOTO = publicAsset(
  'images/home-sale-formats/summer-2026/sale-format-auction-summer.webp',
)
const DEBTS_PHOTO = publicAsset(
  'images/home-sale-formats/summer-2026/sale-format-shares-summer.webp',
)
const CARD_GESTURE = 100
/** Finger travel that flips a card mid-gesture, and the shorter flick fallback. */
const TOUCH_GESTURE = 30
const FLICK_GESTURE = 18
/** Duration of the pager's own scroll animation. */
const PAGER_MS = 230
/*
 * Reaching the first card (auction) is plain native scroll — paging starts only
 * once it is parked. Leaving upwards releases back onto the welcome block.
 */
const EXIT_RELEASE = 0.92
/*
 * Telling a trackpad's inertia tail from a fresh flick: the tail only decays,
 * so a quiet gap, a rising delta or a spent-out delta all end it.
 */
const WHEEL_FLICK_GAP = 140
const WHEEL_RISE = 6
const WHEEL_TAIL = 4
const ANDROID_URL = 'https://play.google.com/store/apps'
const IOS_URL = 'https://apps.apple.com/'

const FORMAT_CARD_META = {
  auction: { tone: 'sheet' },
  buy_now: { tone: 'photo', photo: BUY_NOW_PHOTO },
  shares: { tone: 'sheet' },
}

function getFallbackNews(t) {
  return [
    {
      id: 'crimea-top',
      slug: null,
      image: '/images/external/photo-1565008576549-57569a49371d-2725bbeba2.jpg',
      badge: t('newsPage_static_crimeaBadge'),
      title: t('newsPage_static_crimeaTitle'),
      excerpt: t('newsPage_static_crimeaExcerpt'),
      date: t('newsPage_static_crimeaDate'),
    },
    {
      id: 'kaliningrad-small',
      slug: null,
      image: '/images/external/photo-1449824913935-59a10b8d2000-e6bb6de958.jpg',
      badge: t('newsPage_static_kaliningradBadge'),
      title: t('newsPage_static_kaliningradTitle'),
      excerpt: t('newsPage_static_kaliningradExcerpt'),
      date: t('newsPage_static_kaliningradDate'),
    },
    {
      id: 'architecture',
      slug: null,
      image: '/images/external/photo-1486406146926-c627a92ad1ab-f0c377ec01.jpg',
      badge: t('newsPage_static_architectureBadge'),
      title: t('newsPage_static_architectureTitle'),
      excerpt: t('newsPage_static_architectureExcerpt'),
      date: t('newsPage_static_architectureDate'),
    },
    {
      id: 'beach-aerial',
      slug: null,
      image: '/images/external/photo-1507525428034-b723cf961d3e-ae413f8ef9.jpg',
      badge: t('newsPage_static_beachBadge'),
      title: t('newsPage_static_beachTitle'),
      excerpt: t('newsPage_static_beachExcerpt'),
      date: t('newsPage_static_beachDate'),
    },
  ]
}

function getShowcaseSections(t) {
  return [
    {
      id: 'auction',
      sectionId: 'invest-objects-auction',
      variant: 'auction',
      title: t('auction'),
      subtitle: t('discoverPage_showcaseAuctionSubtitle'),
      ctaLabel: t('goTo'),
      to: '/auction?filter=auction',
      itemsKey: 'auctionSection',
    },
    {
      id: 'buy_now',
      sectionId: 'invest-objects-buy-now',
      variant: 'buyNow',
      title: t('buyNowSectionTitle'),
      subtitle: t('discoverPage_showcaseBuyNowSubtitle'),
      ctaLabel: t('goTo'),
      to: '/auction/buy-now',
      itemsKey: 'buyNowSection',
    },
    {
      id: 'shares',
      sectionId: 'invest-objects-shares',
      variant: 'shares',
      title: t('shares'),
      subtitle: t('discoverPage_showcaseSharesSubtitle'),
      ctaLabel: t('goTo'),
      to: '/shares',
      itemsKey: 'sharesSection',
    },
    {
      id: 'debts',
      sectionId: 'invest-objects-debts',
      variant: 'debts',
      title: t('debtsTitle'),
      subtitle: t('discoverPage_showcaseDebtsSubtitle'),
      ctaLabel: t('goTo'),
      to: '/debts',
      itemsKey: 'debtsSection',
    },
  ]
}

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

/**
 * Debts use one sticky panel with the same park point as other format cards.
 * A short park tail keeps the panel locked; then the rest of the page scrolls normally.
 */
function DebtsFlow({ index, children }) {
  return (
    <div className="md-debts-scene" style={{ zIndex: index + 1 }}>
      {/* The debts photo and property cards move together with page scroll. */}
      <div className="md-debts-pin">
        <div className="md-debts-pin__media" aria-hidden="true">
          <img
            className="md-debts-pin__photo"
            src={DEBTS_PHOTO}
            alt=""
            width={1080}
            height={1920}
            loading="lazy"
            decoding="async"
          />
          <div className="md-debts-pin__shade" />
        </div>

        <div
          className="md-debts-pin__showcase"
          data-md-format-card=""
          data-md-format="debts"
        >
          {children}
        </div>

      </div>

      <div className="md-debts-pin__park" aria-hidden="true" />
    </div>
  )
}

function AppDownloadSection() {
  const { t } = useTranslation()
  return (
    <section className="md-app-download" aria-labelledby="md-app-download-title">
      <div className="md-app-download__inner">
        <img
          className="md-app-download__art"
          src={publicAsset('images/app-download/tiffany-chair-banner.webp')}
          alt=""
          loading="lazy"
          width="1536"
          height="1024"
        />
        <div className="md-app-download__copy">
          <p className="md-app-download__kicker">{t('discoverPage_appKicker')}</p>
          <h2 id="md-app-download-title" className="md-app-download__title" aria-label="SellYourBrick">
            <span>Sell</span>
            <span className="md-app-download__brand-accent">Your</span>
            <span>Brick</span>
          </h2>
          <p className="md-app-download__lead">{t('discoverPage_appTitleRest')}</p>
          <div className="md-app-download__stores">
            <a href={IOS_URL} target="_blank" rel="noopener noreferrer" className="md-app-download__store">
              <AppleIcon aria-hidden="true" />
              <span>App Store</span>
            </a>
            <a href={ANDROID_URL} target="_blank" rel="noopener noreferrer" className="md-app-download__store">
              <GooglePlayIcon aria-hidden="true" />
              <span>Google Play</span>
            </a>
          </div>
          <Link to="/app" className="md-app-download__download">
            <span>{t('discoverPage_appDownload')}</span>
            <FiArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function NewsSection({ articles }) {
  const { t } = useTranslation()
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
              {t('news')}
            </h2>
            <Link to="/news" className="md-news__all">
              <span>{t('sybLandingNewsViewAll')}</span>
              <FiArrowRight aria-hidden />
            </Link>
          </div>
          <p className="md-news__subtitle">{t('discoverPage_newsSubtitle')}</p>
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
                  {t('newsPage_heroRead')}
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
                        {t('newsPage_heroRead')}
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
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const jumpingRef = useRef(false)
  const wheelAcc = useRef(0)
  const [newsArticles, setNewsArticles] = useState(() => getFallbackNews(t))
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const {
    loading,
    auctionSection,
    buyNowSection,
    debtsSection,
    sharesSection,
  } = useInvestorHomeShowcases()

  useEffect(() => {
    window.dispatchEvent(new Event(PROPERTY_FAVORITES_NEEDED))
  }, [])

  const itemsByKey = {
    auctionSection,
    buyNowSection,
    sharesSection,
    debtsSection,
  }

  const showcaseSections = getShowcaseSections(t)

  useEffect(() => {
    let cancelled = false
    const fallback = getFallbackNews(t)
    setNewsArticles(fallback)
    fetchPublishedArticles()
      .then((articles) => {
        if (cancelled || !Array.isArray(articles) || articles.length === 0) return
        const fromApi = articles.slice(0, 4).map((article) => ({
          id: article.id,
          slug: article.slug,
          image: article.image,
          badge: article.badge || t('newsPage_mobileBadgeFallback'),
          title: article.title,
          excerpt: article.excerpt,
          date: article.date,
        }))
        const filled = [...fromApi]
        for (const item of fallback) {
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
  }, [t, i18n.language])

  const showPropertyAuthRequiredToast = useCallback(() => {
    showNotification(t('discoverPage_authToOpenProperty'), 'warning', 7000)
    requestOpenLoginModal({ wizard: true })
  }, [t])

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
   * Format stack scroll:
   * - Default (hard pager): one small vertical swipe = one card. Native drag
   *   between parks is blocked so auction / buy-now / shares never rest half-covered.
   * - Optional native settle: data-native-format-scroll="true" — free finger,
   *   then snap to nearest park after the gesture ends.
   */
  useEffect(() => {
    const catalog = rootRef.current
    const stage = catalog?.closest('.md-stage')
    if (!catalog || !stage) return undefined

    const hardPager = stage.dataset.nativeFormatScroll !== 'true'

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

    const cardStepHeight = (card) => {
      // Debts marker sits inside the sticky pin — use the pin height for parks.
      const pin = card?.closest?.('.md-debts-pin')
      if (pin) return pin.offsetHeight || stage.clientHeight
      const section = card?.closest?.('.md-format-card')
      if (section) return section.offsetHeight || stage.clientHeight
      return card?.offsetHeight || stage.clientHeight
    }

    /*
     * Park offsets are layout, not scroll state, so they are measured once and
     * reused — the scroll handler must never trigger a stack of layout reads.
     */
    let geometryDirty = true
    let parks = []
    let tailTop = Number.POSITIVE_INFINITY

    const measure = () => {
      if (!geometryDirty) return
      geometryDirty = false

      const origin = getOrigin()
      const cards = getFlipCards()
      const tail = getFreeTail()
      tailTop = tail ? elTop(tail) : Number.POSITIVE_INFINITY

      if (!origin || !cards.length) {
        parks = []
        return
      }
      let y = elTop(origin)
      parks = cards.map((card) => {
        const at = y
        y += cardStepHeight(card)
        return at
      })
    }

    const invalidateGeom = () => {
      geometryDirty = true
    }
    window.addEventListener('resize', invalidateGeom)
    window.addEventListener('orientationchange', invalidateGeom)
    const geometryObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(invalidateGeom)
      : null
    // Observe layout changes, rather than reflowing the sticky stack during scroll.
    for (const node of [stage, catalog, catalog.parentElement, ...getFlipCards()]) {
      if (node) geometryObserver?.observe(node)
    }

    const cardTop = (index) => {
      measure()
      return parks[index] ?? 0
    }

    const nearestFlipIndex = () => {
      measure()
      if (!parks.length) return -1
      let best = 0
      let bestDist = Infinity
      parks.forEach((park, index) => {
        const dist = Math.abs(stage.scrollTop - park)
        if (dist < bestDist) {
          bestDist = dist
          best = index
        }
      })
      return best
    }

    const freeTailTop = () => {
      measure()
      return tailTop
    }

    const lastCardTop = () => {
      measure()
      return parks.length ? parks[parks.length - 1] : 0
    }

    const inFreeTail = () => stage.scrollTop >= freeTailTop() - 8

    /** Past debts park into app (same photo) — free native scroll */
    const inDebtsContinue = () => {
      measure()
      if (!parks.length) return false
      return stage.scrollTop > lastCardTop() + 36 && !inFreeTail()
    }

    const inFlipZone = () => {
      measure()
      if (!parks.length) return false
      return (
        stage.scrollTop >= parks[0] - 12 &&
        !inFreeTail() &&
        !inDebtsContinue()
      )
    }

    const entryReleaseY = () =>
      Math.max(0, cardTop(0) - stage.clientHeight * EXIT_RELEASE)

    const reduceMotion = () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let animFrame = 0

    const stopAnim = () => {
      if (!animFrame) return
      window.cancelAnimationFrame(animFrame)
      animFrame = 0
    }

    /*
     * Own rAF animation instead of scrollTo({behavior:'smooth'}): smooth scroll
     * is deferred by the browser until touchend, which is what left drawers
     * hanging half-open while the finger was still down.
     */
    const jumpToY = (top) => {
      const limit = Math.max(0, stage.scrollHeight - stage.clientHeight)
      const target = Math.min(Math.max(0, top), limit)
      stopAnim()
      wheelAcc.current = 0

      if (reduceMotion() || Math.abs(stage.scrollTop - target) < 2) {
        stage.scrollTop = target
        jumpingRef.current = false
        return
      }

      const from = stage.scrollTop
      const distance = target - from
      const startedAt = performance.now()
      jumpingRef.current = true

      const step = (now) => {
        const progress = Math.min(1, (now - startedAt) / PAGER_MS)
        stage.scrollTop = from + distance * (1 - (1 - progress) ** 3)
        if (progress < 1) {
          animFrame = window.requestAnimationFrame(step)
          return
        }
        animFrame = 0
        stage.scrollTop = target
        jumpingRef.current = false
      }
      animFrame = window.requestAnimationFrame(step)
    }

    const jumpToFlip = (index) => {
      measure()
      if (index < 0 || index >= parks.length) return
      jumpToY(parks[index])
    }

    /** Snap to nearest format park — used by native settle and hard pager. */
    const settleFlip = () => {
      if (touching || jumpingRef.current || !inFlipZone()) return
      const current = nearestFlipIndex()
      if (current < 0) return
      const target = cardTop(current)
      if (Math.abs(stage.scrollTop - target) > 10) jumpToY(target)
    }

    let settleTimer = 0
    let touching = false

    const scheduleSettle = (delay = 120) => {
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(() => {
        if (touching || jumpingRef.current) return
        if (document.documentElement.classList.contains('login-modal-open')) return
        settleFlip()
      }, delay)
    }

    const isPropertyCarouselTarget = (target) =>
      Boolean(
        target?.closest?.(
          '.invest-showcase__scroller, .home-showcase__scroller, .md-cards',
        ),
      )

    // ——— Native mode: free finger scroll, snap when gesture / momentum ends ———
    if (!hardPager) {
      const onNativeTouchStart = () => {
        touching = true
        window.clearTimeout(settleTimer)
      }
      const onNativeTouchEnd = () => {
        touching = false
        scheduleSettle(90)
      }
      const onNativeScroll = () => {
        if (document.documentElement.classList.contains('login-modal-open')) return
        if (touching || jumpingRef.current || !inFlipZone()) return
        scheduleSettle(140)
      }

      stage.addEventListener('touchstart', onNativeTouchStart, { passive: true })
      stage.addEventListener('touchend', onNativeTouchEnd, { passive: true })
      stage.addEventListener('touchcancel', onNativeTouchEnd, { passive: true })
      stage.addEventListener('scroll', onNativeScroll, { passive: true })
      return () => {
        window.clearTimeout(settleTimer)
        stopAnim()
        geometryObserver?.disconnect()
        window.removeEventListener('resize', invalidateGeom)
        window.removeEventListener('orientationchange', invalidateGeom)
        stage.removeEventListener('touchstart', onNativeTouchStart)
        stage.removeEventListener('touchend', onNativeTouchEnd)
        stage.removeEventListener('touchcancel', onNativeTouchEnd)
        stage.removeEventListener('scroll', onNativeScroll)
      }
    }

    // ——— Hard pager (one small vertical swipe = one card) ———
    const commitFlipByDelta = (dy) => {
      measure()
      if (!parks.length) return false
      const last = parks.length - 1

      if (inFreeTail()) {
        if (dy < 0 && stage.scrollTop <= freeTailTop() + 32) {
          jumpToFlip(last)
          return true
        }
        return false
      }

      if (inDebtsContinue()) {
        if (dy < 0 && stage.scrollTop <= lastCardTop() + 64) {
          jumpToFlip(last)
          return true
        }
        return false
      }

      // Above the stack the auction sheet rises with plain native scroll.
      if (!inFlipZone()) return false

      const current = nearestFlipIndex()
      if (dy > 0) {
        if (current >= last) {
          jumpToY(lastCardTop() + Math.min(220, stage.clientHeight * 0.32))
        } else {
          jumpToFlip(current + 1)
        }
        return true
      }
      if (current <= 0) {
        jumpToY(entryReleaseY())
        return true
      }
      jumpToFlip(current - 1)
      return true
    }

    /** True when the pager — not native scroll — must own this vertical move. */
    const pagerOwnsMove = (dy) => {
      if (inFlipZone()) return true
      if (inFreeTail()) return dy < 0 && stage.scrollTop <= freeTailTop() + 32
      if (inDebtsContinue()) return dy < 0 && stage.scrollTop <= lastCardTop() + 64
      return false
    }

    /*
     * The page shell also listens for wheel and drives `.md-stage` scroll by
     * hand, so a prevented wheel must stop propagating — otherwise the stack
     * still creeps to a mid-park offset.
     */
    const takeOverWheel = (event) => {
      event.preventDefault()
      event.stopPropagation()
    }

    /*
     * Trackpads keep firing wheel events for about a second after the fingers
     * lift, so one flick must not be counted twice. Waiting for silence would
     * swallow the next flick, so the decaying tail is detected instead.
     */
    let lastWheelAt = 0
    let lastWheelDelta = 0
    let flickSpent = false

    const onWheel = (event) => {
      if (document.documentElement.classList.contains('login-modal-open')) return
      // Horizontal trackpad motion belongs to the property rail, even mid-flip.
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) return

      const now = performance.now()
      const mag = Math.abs(event.deltaY)
      const lastMag = Math.abs(lastWheelDelta)
      const reversed =
        event.deltaY !== 0 &&
        lastWheelDelta !== 0 &&
        Math.sign(event.deltaY) !== Math.sign(lastWheelDelta)
      const tailOver =
        now - lastWheelAt >= WHEEL_FLICK_GAP ||
        reversed ||
        mag > lastMag + WHEEL_RISE ||
        mag <= WHEEL_TAIL
      lastWheelAt = now
      lastWheelDelta = event.deltaY
      if (tailOver) flickSpent = false
      const sameFlick = !tailOver

      if (jumpingRef.current) {
        takeOverWheel(event)
        return
      }

      measure()
      if (!parks.length) return
      const last = parks.length - 1

      if (flickSpent && sameFlick) {
        wheelAcc.current = 0
        if (inFlipZone()) takeOverWheel(event)
        return
      }

      if (inFreeTail()) {
        if (event.deltaY < 0 && stage.scrollTop <= freeTailTop() + 24) {
          takeOverWheel(event)
          wheelAcc.current += event.deltaY
          if (Math.abs(wheelAcc.current) >= CARD_GESTURE) {
            wheelAcc.current = 0
            flickSpent = true
            jumpToFlip(last)
          }
          return
        }
        wheelAcc.current = 0
        return
      }

      if (inDebtsContinue()) {
        if (event.deltaY < 0 && stage.scrollTop <= lastCardTop() + 56) {
          takeOverWheel(event)
          wheelAcc.current += event.deltaY
          if (Math.abs(wheelAcc.current) >= CARD_GESTURE) {
            wheelAcc.current = 0
            flickSpent = true
            jumpToFlip(last)
          }
          return
        }
        wheelAcc.current = 0
        return
      }

      // Above the stack: the auction sheet rises with plain native scroll.
      if (!inFlipZone()) {
        wheelAcc.current = 0
        return
      }

      // Keep native horizontal pan on property carousels (trackpad / shift-wheel)
      if (
        isPropertyCarouselTarget(event.target) &&
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ) {
        return
      }

      // Hard lock in flip zone — no native scroll between cards
      takeOverWheel(event)
      wheelAcc.current += event.deltaY
      if (Math.abs(wheelAcc.current) < CARD_GESTURE) return

      const current = nearestFlipIndex()
      const goingDown = wheelAcc.current > 0
      wheelAcc.current = 0
      flickSpent = true

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
        jumpToY(entryReleaseY())
        return
      }
      jumpToFlip(current - 1)
    }

    let startX = 0
    let startY = 0
    let committed = false
    let owned = false
    let axisLock = /** @type {null | 'x' | 'y'} */ (null)

    const onTouchStart = (event) => {
      const touch = event.touches[0]
      if (!touch) return
      touching = true
      window.clearTimeout(settleTimer)
      startX = touch.clientX
      startY = touch.clientY
      committed = false
      owned = false
      axisLock = null

      // A tap or horizontal swipe must never change the vertical position.
    }

    const onTouchMove = (event) => {
      if (document.documentElement.classList.contains('login-modal-open')) return

      const touch = event.touches[0]
      if (!touch) return
      const totalX = Math.abs(touch.clientX - startX)
      const totalY = Math.abs(touch.clientY - startY)
      if (!axisLock && (totalX > 8 || totalY > 8)) {
        axisLock = totalX > totalY ? 'x' : 'y'
      }
      // Horizontal card pans stay fully native; an undecided gesture counts as
      // vertical so the very first move is already blocked from dragging.
      if (axisLock === 'x') return
      if (!axisLock && totalX > totalY) return

      const dy = startY - touch.clientY
      if (!pagerOwnsMove(dy)) return

      // Native vertical drag is dead here: the drawer moves in one animated
      // step instead of following the finger.
      event.preventDefault()
      owned = true

      // Exactly one card per gesture — the finger must lift before the next.
      if (committed || jumpingRef.current) return
      if (Math.abs(dy) < TOUCH_GESTURE) return
      if (commitFlipByDelta(dy)) committed = true
    }

    const onTouchEnd = (event) => {
      touching = false
      if (document.documentElement.classList.contains('login-modal-open')) return
      const endY = event.changedTouches[0]?.clientY ?? startY
      const endX = event.changedTouches[0]?.clientX ?? startX
      const dy = startY - endY
      const wasHorizontal = axisLock === 'x'
      axisLock = null

      if (committed || jumpingRef.current || wasHorizontal) return
      // Native scroll is still settling — the scroll handler finishes it,
      // so we never animate against live momentum.
      if (!owned) return

      // Short flick still counts, so the drawer never waits for a longer swipe.
      if (Math.abs(dy) >= FLICK_GESTURE && Math.abs(endX - startX) <= Math.abs(dy)) {
        if (commitFlipByDelta(dy)) {
          committed = true
          return
        }
      }
      settleFlip()
    }

    const onTouchCancel = () => {
      touching = false
      axisLock = null
      owned = false
      committed = false
      scheduleSettle(140)
    }

    /*
     * The cards only refuse native vertical drag while the stack is parked —
     * above it the welcome block scrolls without any pager binding.
     */
    const syncLock = () => {
      const lock = inFlipZone() ? 'on' : 'off'
      if (stage.dataset.formatLock !== lock) stage.dataset.formatLock = lock
    }

    let prevTop = stage.scrollTop

    const onScroll = () => {
      if (document.documentElement.classList.contains('login-modal-open')) return
      const top = stage.scrollTop
      const firstPark = cardTop(0)
      const crossedIn = prevTop < firstPark - 4 && top >= firstPark - 4
      prevTop = top
      if (jumpingRef.current) return

      // Native momentum stops at the auction park instead of shooting through
      // it into the next card.
      if (crossedIn) {
        stage.scrollTop = firstPark
        prevTop = firstPark
        syncLock()
        return
      }

      syncLock()
      if (!inFlipZone()) return
      scheduleSettle(140)
    }

    syncLock()

    const moveOpts = { passive: false, capture: true }
    const passiveOpts = { passive: true, capture: true }

    stage.addEventListener('wheel', onWheel, { passive: false })
    stage.addEventListener('scroll', onScroll, { passive: true })
    stage.addEventListener('touchstart', onTouchStart, passiveOpts)
    stage.addEventListener('touchmove', onTouchMove, moveOpts)
    stage.addEventListener('touchend', onTouchEnd, passiveOpts)
    stage.addEventListener('touchcancel', onTouchCancel, passiveOpts)
    return () => {
      window.clearTimeout(settleTimer)
      stopAnim()
      geometryObserver?.disconnect()
      window.removeEventListener('resize', invalidateGeom)
      window.removeEventListener('orientationchange', invalidateGeom)
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('scroll', onScroll)
      stage.removeEventListener('touchstart', onTouchStart, passiveOpts)
      stage.removeEventListener('touchmove', onTouchMove, moveOpts)
      stage.removeEventListener('touchend', onTouchEnd, passiveOpts)
      stage.removeEventListener('touchcancel', onTouchCancel, passiveOpts)
    }
  }, [loading])

  const auction = showcaseSections.find((s) => s.id === 'auction')
  const buyNow = showcaseSections.find((s) => s.id === 'buy_now')
  const shares = showcaseSections.find((s) => s.id === 'shares')
  const debts = showcaseSections.find((s) => s.id === 'debts')

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

  return (
    <div ref={rootRef} className="md-catalog invest-home-page discover-auction-cards">
      <div className="md-format-stack">
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
        <AppDownloadSection />
        <NewsSection articles={newsArticles} />
        <MobileDiscoverFaq />
        <div className="md-footer-wrap">
          <Footer />
        </div>
      </div>
    </div>
  )
}
