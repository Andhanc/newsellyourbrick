import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import { FiArrowRight } from 'react-icons/fi'
import Header from '@/components/Header'
import HeroRolePitchModal from '@/components/HeroRolePitchModal'
import { FrostedGlassCard } from '@/components/ui/interactive-frosted-glass-card'
import { scrollMainTo } from '@/utils/mainScroll'
import { ensureCanOpenProperty } from '@/utils/propertyAccessGuard'
import { buildPropertyDetailNavigation } from '@/utils/propertyDetailUrl'
import {
  fetchAuctionList,
  getCachedList,
  hasCachedList,
} from '@/services/auctionListCache'
import { getStoredNumericUserId, getUserData } from '@/services/authService'
import {
  getCabinetHomePath,
  getCabinetProfilePath,
  isSellerCabinetRole,
  readStoredUserRole,
} from '@/utils/cabinetRoutes'
import { publicAsset } from '@/utils/publicAsset'
import { requestOpenLoginModal } from '@/utils/requestOpenLoginModal'
import SybLandingSearchBar from '@/components/SybLandingSearchBar'
import SybLandingPromoBlocks from '@/components/SybLandingPromoBlocks'
import SybLandingNewsShowcase from '@/components/SybLandingNewsShowcase'
import SybLandingBottomSections from '@/components/SybLandingBottomSections'
import SybLandingListingShowcases from '@/components/SybLandingListingShowcases'
import './SellYourBrickLandingPage.css'

const HERO_ISLAND_BG = publicAsset('images/sellyourbrick/canary-islands-hero.jpg')

const DIRECTION_CARDS = [
  {
    key: 'auction',
    titleKey: 'auction',
    countKey: 'sybLandingCountAuction',
    href: '/auction',
    image: '/images/external/photo-1560518883-ce09059eeffa-95dd949987.jpg',
    offset: 0,
    accent: '#0ea5e9',
    accentSoft: '#e0f2fe',
  },
  {
    key: 'buy_now',
    titleKey: 'buyNowSectionTitle',
    countKey: 'sybLandingCountBuyNow',
    href: '/auction?filter=buy_now',
    image: '/images/external/photo-1600585154340-be6161a56a0c-08c1b1d59d.jpg',
    offset: 1,
    accent: '#f59e0b',
    accentSoft: '#fef3c7',
  },
  {
    key: 'shares',
    titleKey: 'shares',
    countKey: 'sybLandingCountShares',
    href: '/shares',
    image: '/images/external/photo-1486406146926-c627a92ad1ab-f0c377ec01.jpg',
    offset: 2,
    accent: '#8b5cf6',
    accentSoft: '#ede9fe',
  },
  {
    key: 'debts',
    titleKey: 'debtsTitle',
    countKey: 'sybLandingCountDebts',
    href: '/debts',
    image: '/images/external/photo-1450101499163-c8848c66ca85-eb206c83e6.jpg',
    offset: 3,
    accent: '#ef4444',
    accentSoft: '#fee2e2',
  },
]

function PaperclipIcon({ clipId }) {
  const gradientId = `syb-clip-metal-${clipId}`
  const shadowId = `syb-clip-shadow-${clipId}`

  return (
    <svg
      className="syb-clip-card__paperclip"
      width="54"
      height="78"
      viewBox="0 0 54 78"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="10" y1="6" x2="44" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="24%" stopColor="#d5dde8" />
          <stop offset="50%" stopColor="#95a3b5" />
          <stop offset="72%" stopColor="#edf1f6" />
          <stop offset="100%" stopColor="#66758a" />
        </linearGradient>
        <linearGradient id={`${gradientId}-shine`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="42%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <filter id={shadowId} x="-25%" y="-12%" width="150%" height="135%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.3" />
        </filter>
      </defs>
      <g filter={`url(#${shadowId})`} transform="translate(3 2)">
        <path
          d="M37.125 14.25V46.31a6.75 6.75 0 0 1-6.75 6.75h-1.688a6.75 6.75 0 0 1-6.75-6.75V22.69m27 0V14.25a6.75 6.75 0 0 0-6.75-6.75h-1.688a6.75 6.75 0 0 0-6.75 6.75v5.063"
          stroke={`url(#${gradientId})`}
          strokeWidth="5.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M37.125 14.25V46.31a6.75 6.75 0 0 1-6.75 6.75h-1.688a6.75 6.75 0 0 1-6.75-6.75V22.69m27 0V14.25a6.75 6.75 0 0 0-6.75-6.75h-1.688a6.75 6.75 0 0 0-6.75 6.75v5.063"
          stroke={`url(#${gradientId}-shine)`}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />
      </g>
    </svg>
  )
}

export default function SellYourBrickLandingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isLoaded: userLoaded } = useUser()
  const [auctionProperties, setAuctionProperties] = useState(() => getCachedList())
  const [loading, setLoading] = useState(() => !hasCachedList())
  const [heroRolePitch, setHeroRolePitch] = useState(null)
  const [isHeroCtaAdaptive, setIsHeroCtaAdaptive] = useState(false)

  useEffect(() => {
    scrollMainTo(0, 0, 'instant')
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsHeroCtaAdaptive(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const isLoggedIn = getUserData().isLoggedIn || (userLoaded && !!user)

  const openLoginDirectRegister = useCallback((role) => {
    sessionStorage.setItem('login_modal_mode', 'register')
    sessionStorage.setItem('login_modal_user_role', role === 'seller' ? 'seller' : 'buyer')
    requestOpenLoginModal({ wizard: false })
  }, [])

  const handleHeroInvestorCardClick = useCallback(() => {
    if (!isLoggedIn) {
      openLoginDirectRegister('buyer')
      return
    }
    if (isSellerCabinetRole(readStoredUserRole())) {
      setHeroRolePitch('buyer')
      return
    }
    navigate(getCabinetProfilePath())
  }, [isLoggedIn, navigate, openLoginDirectRegister])

  const handleHeroSellerCardClick = useCallback(() => {
    if (!isLoggedIn) {
      openLoginDirectRegister('seller')
      return
    }
    const role = readStoredUserRole()
    if (isSellerCabinetRole(role)) {
      navigate(getCabinetHomePath(role))
      return
    }
    setHeroRolePitch('seller')
  }, [isLoggedIn, navigate, openLoginDirectRegister])

  const handleHeroRolePitchPrimary = useCallback(() => {
    const kind = heroRolePitch
    setHeroRolePitch(null)
    if (kind === 'seller') {
      openLoginDirectRegister('seller')
    } else if (kind === 'buyer') {
      openLoginDirectRegister('buyer')
    }
  }, [heroRolePitch, openLoginDirectRegister])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!hasCachedList()) setLoading(true)
      try {
        const viewerId = getStoredNumericUserId()
        const list = await fetchAuctionList(viewerId ?? undefined)
        if (!cancelled) setAuctionProperties(list)
      } catch (error) {
        console.error('SellYourBrick landing auction load:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleOpenProperty = useCallback(
    (property) => {
      if (!ensureCanOpenProperty()) return
      const { pathname, state } = buildPropertyDetailNavigation(property)
      navigate(pathname, { state })
    },
    [navigate],
  )

  return (
    <div className="syb-landing">
      <section className="syb-hero" aria-labelledby="syb-hero-title">
        <div className="syb-hero__panel">
          <div className="syb-hero__bg" aria-hidden>
            <img
              src={HERO_ISLAND_BG}
              alt=""
              className="syb-hero__bg-image"
              width={1920}
              height={1080}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </div>
          <div className="syb-hero__overlay" aria-hidden />

          <Header />

          <div className="syb-hero__content">
            <div className="syb-hero__main">
              <h1 id="syb-hero-title" className="syb-hero__title">
                {t('sybLandingHeroTitle')}
              </h1>
              <p className="syb-hero__subtitle">{t('sybLandingHeroSubtitle')}</p>
              <div className="syb-hero__actions">
                <Link to="/auction" className="syb-hero__cta syb-hero__cta--primary" onClick={() => scrollMainTo(0, 0, 'instant')}>
                  <span>{t('sybLandingHeroCta')}</span>
                  <span className="syb-hero__cta-icon" aria-hidden>
                    <FiArrowRight size={18} />
                  </span>
                </Link>
                <Link to="/sections" className="syb-hero__cta syb-hero__cta--ghost" onClick={() => scrollMainTo(0, 0, 'instant')}>
                  {t('sybLandingHeroSecondaryCta')}
                </Link>
              </div>
              <div className="syb-hero__bubble">
                <p>{t('sybLandingHeroBubble')}</p>
              </div>
            </div>

            <div className="syb-hero__role-cards">
              <FrostedGlassCard
                variant="investor"
                title={t('becomeInvestor')}
                buttonText={t('startBtn')}
                onButtonClick={handleHeroInvestorCardClick}
              >
                {t('investorCardText')}
              </FrostedGlassCard>
              <FrostedGlassCard
                variant="seller"
                title={t('becomeSeller')}
                buttonText={isHeroCtaAdaptive ? t('startBtn') : t('listProperty')}
                onButtonClick={handleHeroSellerCardClick}
              >
                {t('sellerCardText')}
              </FrostedGlassCard>
            </div>
          </div>
        </div>

        <div className="syb-hero__search-dock">
          <SybLandingSearchBar />
        </div>
      </section>

      <section className="syb-directions" aria-labelledby="syb-directions-title">
        <div className="syb-directions__panel">
          <h2 id="syb-directions-title" className="syb-directions__title">
            {t('sybLandingDirectionsTitle')}
          </h2>
          <div className="syb-directions__grid">
            {DIRECTION_CARDS.map((card) => (
              <Link
                key={card.key}
                to={card.href}
                className={`syb-clip-card syb-clip-card--${card.key} syb-clip-card--offset-${card.offset}`}
                style={{
                  '--clip-accent': card.accent,
                  '--clip-soft': card.accentSoft,
                }}
                onClick={() => scrollMainTo(0, 0, 'instant')}
              >
                <div className="syb-clip-card__clip" aria-hidden>
                  <PaperclipIcon clipId={card.key} />
                </div>
                <div className="syb-clip-card__inner">
                  <h3 className="syb-clip-card__title">{t(card.titleKey)}</h3>
                  <div className="syb-clip-card__illustration">
                    <img src={card.image} alt="" loading="lazy" decoding="async" />
                  </div>
                  <span className="syb-clip-card__badge">{t(card.countKey)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SybLandingListingShowcases
        properties={auctionProperties}
        loading={loading}
        onOpen={handleOpenProperty}
      />

      <HeroRolePitchModal
        variant={heroRolePitch}
        isOpen={heroRolePitch != null}
        onClose={() => setHeroRolePitch(null)}
        onPrimary={handleHeroRolePitchPrimary}
        title={
          heroRolePitch === 'seller'
            ? t('heroPitchBecomeSellerTitle')
            : t('heroPitchBecomeBuyerTitle')
        }
        body={
          heroRolePitch === 'seller'
            ? t('heroPitchBecomeSellerBody')
            : t('heroPitchBecomeBuyerBody')
        }
        primaryLabel={
          heroRolePitch === 'seller'
            ? t('heroPitchBecomeSellerCta')
            : t('heroPitchBecomeBuyerCta')
        }
        closeLabel={t('close')}
      />

      <SybLandingPromoBlocks />

      <SybLandingNewsShowcase />

      <SybLandingBottomSections />
    </div>
  )
}
