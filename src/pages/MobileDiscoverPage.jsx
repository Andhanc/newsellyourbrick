import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
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

const HERO_VIDEO = publicAsset('media/auth-summer-villa.mp4')
const HERO_POSTER = publicAsset('media/auth-summer-villa-poster.jpg')
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

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Two persistent screens swap only while the white veil fully covers them. */
export default function MobileDiscoverPage() {
  const { t } = useTranslation()
  const { user, isLoaded: userLoaded } = useUser()
  const { session, isLoaded: sessionLoaded } = useSession()
  const authSessionId = session?.id || ''
  const [shortcutsUnlocked, setShortcutsUnlocked] = useState(() => isSiteUserSignedIn(user, userLoaded))
  const navigate = useNavigate()
  const shellRef = useRef(null)
  const heroVideoRef = useRef(null)
  const flashRef = useRef(null)
  const flashAnimationRef = useRef(null)
  const activeScreenRef = useRef('hero')
  const stageScrollRef = useRef(null)
  const launchSliderRef = useRef(null)
  const launchScrollLeftRef = useRef(null)
  const lotteryDialogRef = useRef(null)
  const lotteryTriggerRef = useRef(null)
  const catalogSentinelRef = useRef(null)

  const [screen, setScreen] = useState('hero') // hero | stage
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

  compassOfferBlockedRef.current = compassDrawerOpen

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('md-page-active')
    scrollMainTo(0, 0, 'instant')
    const layout = getMainScrollEl()
    if (layout) layout.style.overflowY = 'hidden'
    return () => {
      root.classList.remove('md-page-active', 'md-hero-chrome')
      flashAnimationRef.current?.cancel()
      if (layout) layout.style.overflowY = ''
    }
  }, [])

  // Keep Safari chrome transparent without fighting native scrolling.
  useEffect(() => {
    const root = document.documentElement
    const metas = Array.from(document.querySelectorAll('meta[name="theme-color"]'))
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const narrowQuery = window.matchMedia('(max-width: 1023px)')
    const paintTheme = (color) => {
      metas.forEach((meta) => meta.setAttribute('content', color))
    }
    const apply = () => {
      const immersive = screen === 'hero' && ios && narrowQuery.matches
      root.classList.toggle('md-hero-chrome', immersive)
      paintTheme(immersive ? 'transparent' : '#ffffff')
    }
    apply()
    narrowQuery.addEventListener('change', apply)
    return () => {
      narrowQuery.removeEventListener('change', apply)
      root.classList.remove('md-hero-chrome')
      paintTheme('#ffffff')
    }
  }, [screen])

  useEffect(() => {
    const video = heroVideoRef.current
    if (!video) return undefined
    if (screen !== 'hero') {
      video.pause()
      return undefined
    }

    let heroVisible = true
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePlayback = () => {
      if (!heroVisible || motionQuery.matches || document.hidden) {
        video.pause()
        return
      }
      video.play()?.catch(() => {
        // Keep the poster visible if the browser blocks autoplay.
      })
    }
    const observer = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting
      updatePlayback()
    }, { root: shellRef.current })
    observer.observe(video)
    updatePlayback()
    motionQuery.addEventListener('change', updatePlayback)
    document.addEventListener('visibilitychange', updatePlayback)
    return () => {
      observer.disconnect()
      video.pause()
      motionQuery.removeEventListener('change', updatePlayback)
      document.removeEventListener('visibilitychange', updatePlayback)
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

  // The veil is composited over the page; the video never unmounts or resets.
  const flashTransition = useCallback(async (move) => {
    if (!flashRef.current) {
      move?.()
      return
    }
    if (flashAnimationRef.current) return
    const veil = flashRef.current
    const reduceMotion = prefersReducedMotion()
    let animation
    try {
      animation = veil.animate([
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.6 },
        { opacity: 1, offset: 1 },
      ], {
        duration: reduceMotion ? 100 : 240, easing: 'ease-out', fill: 'forwards',
      })
      flashAnimationRef.current = animation
      await animation.finished
      move?.()
      animation.cancel()
      animation = veil.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: reduceMotion ? 140 : 480, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards',
      })
      flashAnimationRef.current = animation
      await animation.finished
    } catch {
      // Navigation or unmount can cancel an in-flight flash.
    } finally {
      animation?.cancel()
      flashAnimationRef.current = null
    }
  }, [])

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

  const goTo = useCallback((next) => {
    if (next === activeScreenRef.current || flashAnimationRef.current) return
    const stage = stageScrollRef.current
    if (!stage) return
    flashTransition(() => {
      // Commit the new screen while the veil is completely white.
      flushSync(() => {
        activeScreenRef.current = next
        setScreen(next)
        setIsStageNavExpanded(false)
        if (next === 'stage') setStageEntered(true)
      })
      stage.scrollTop = 0
    })
  }, [flashTransition])

  // Start the flash on the first upward movement, before the finger is lifted.
  useEffect(() => {
    const shell = shellRef.current
    const stage = stageScrollRef.current
    if (!shell || !stage) return undefined
    let gesture = null
    let suppressClickUntil = 0
    let wheelActive = false
    let wheelStartedAtTop = false
    let wheelLocked = false
    let wheelTimer
    const modalOpen = () => document.documentElement.classList.contains('login-modal-open')
      || document.documentElement.classList.contains('site-nav-drawer-open')
    const consume = (event) => {
      if (event.cancelable) event.preventDefault()
      event.stopPropagation()
    }
    const onStart = (event) => {
      gesture = event.touches.length === 1 && !modalOpen()
        ? {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
            screen: activeScreenRef.current,
            atTop: stage.scrollTop <= 1,
            started: Boolean(flashAnimationRef.current),
          }
        : null
    }
    const onMove = (event) => {
      if (!gesture || event.touches.length !== 1 || modalOpen()) return
      if (gesture.started || flashAnimationRef.current) {
        consume(event)
        return
      }
      const dx = event.touches[0].clientX - gesture.x
      const dy = gesture.y - event.touches[0].clientY
      if (Math.abs(dy) <= Math.abs(dx) * 1.15) return
      const forward = gesture.screen === 'hero' && dy > 0
      const backward = gesture.screen === 'stage' && gesture.atTop && dy < 0
      if (!forward && !backward) return
      // Prevent the browser from beginning a native vertical pan at the boundary.
      consume(event)
      if (Math.abs(dy) < 10) return
      gesture.started = true
      goTo(forward ? 'stage' : 'hero')
    }
    const onEnd = () => {
      if (gesture?.started) suppressClickUntil = Date.now() + 350
      gesture = null
    }
    const onClick = (event) => {
      if (gesture?.started || Date.now() < suppressClickUntil || flashAnimationRef.current) consume(event)
    }
    const onWheel = (event) => {
      if (event.defaultPrevented || event.shiftKey || modalOpen()) return
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return
      if (!wheelActive) wheelStartedAtTop = stage.scrollTop <= 1
      wheelActive = true
      window.clearTimeout(wheelTimer)
      wheelTimer = window.setTimeout(() => {
        wheelActive = false
        wheelLocked = false
      }, 180)
      if (wheelLocked || flashAnimationRef.current) {
        wheelLocked = true
        consume(event)
        return
      }
      const forward = activeScreenRef.current === 'hero' && event.deltaY > 0
      const backward = activeScreenRef.current === 'stage'
        && wheelStartedAtTop && stage.scrollTop <= 1 && event.deltaY < 0
      if (!forward && !backward) return
      consume(event)
      wheelLocked = true
      goTo(forward ? 'stage' : 'hero')
    }
    shell.addEventListener('touchstart', onStart, { passive: true, capture: true })
    shell.addEventListener('touchmove', onMove, { passive: false, capture: true })
    shell.addEventListener('touchend', onEnd, { passive: true, capture: true })
    shell.addEventListener('touchcancel', onEnd, { passive: true, capture: true })
    shell.addEventListener('wheel', onWheel, { passive: false, capture: true })
    shell.addEventListener('click', onClick, { capture: true })
    return () => {
      window.clearTimeout(wheelTimer)
      shell.removeEventListener('touchstart', onStart, true)
      shell.removeEventListener('touchmove', onMove, true)
      shell.removeEventListener('touchend', onEnd, true)
      shell.removeEventListener('touchcancel', onEnd, true)
      shell.removeEventListener('wheel', onWheel, true)
      shell.removeEventListener('click', onClick, true)
    }
  }, [goTo])

  useEffect(() => {
    const stage = stageScrollRef.current
    if (!stage) return undefined
    const updateNav = () => setIsStageNavExpanded(stage.scrollTop > 0)
    updateNav()
    stage.addEventListener('scroll', updateNav, { passive: true })
    return () => stage.removeEventListener('scroll', updateNav)
  }, [])

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

  return (
    <SiteChatDock
      wrapperClassName="md-discover-ai-floats"
      hideFab={screen === 'hero' || isFooterNear}
    >
    <div
      ref={shellRef}
      className={`md md--${screen}`}
    >
        <section className="md-hero" aria-label={t('discoverPage_welcomeAria')} aria-hidden={screen !== 'hero'} inert={screen !== 'hero'}>
          <div className="md-hero__brand" aria-label="SellYourBrick">
            <span aria-hidden="true">Sell</span>
            <span className="md-hero__brand-accent" aria-hidden="true">Your</span>
            <span aria-hidden="true">Brick</span>
          </div>

          <div className="md-hero__copy">
            <h1 className="md-hero__title">
              <span className="md-hero__title-main">{t('discoverPage_heroTitleLine1')}</span>{' '}
              <span className="md-hero__title-accent">{t('discoverPage_heroTitleLine2')}</span>
            </h1>
            <p className="md-hero__lead">{t('discoverPage_heroLead')}</p>
          </div>

          <div className="md-hero__visual" aria-hidden="true">
            <video
              ref={heroVideoRef}
              className="md-hero__video"
              autoPlay={!prefersReducedMotion()}
              loop
              muted
              playsInline
              preload="metadata"
              poster={HERO_POSTER}
              tabIndex={-1}
            >
              <source src={HERO_VIDEO} type="video/mp4" />
            </video>
            <div className="md-hero__veil" />
          </div>

          <div className="md-hero__safari-clear md-hero__safari-clear--top" aria-hidden="true" />
          <div className="md-hero__safari-clear" aria-hidden="true" />

          <button
            type="button"
            className="md-hero__scroll"
            onClick={() => goTo('stage')}
            aria-label={t('startBtn')}
          >
            <span className="md-hero__start-label">{t('startBtn')}</span>
          </button>
        </section>

        <section
          ref={stageScrollRef}
          className={`md-stage${stageEntered ? ' is-ready' : ''}`}
          aria-label={t('discoverPage_saleFormatsAria')}
          aria-hidden={screen !== 'stage'}
          inert={screen !== 'stage'}
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
    </div>
    <div ref={flashRef} className="md-flash" aria-hidden="true" />
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
