import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import Header from '../components/Header'
import SiteChatDock from '../components/SiteChatDock'
import PageBreadcrumbs from '../components/PageBreadcrumbs'
import DepositButton from '../components/DepositButton'
import DepositButtonSkeleton from '../components/DepositButtonSkeleton'
import SharesDesktopFilters from '../components/SharesDesktopFilters'
import { AnimatedMarqueeHero } from '../components/ui/hero-3'
import { fetchUserDeposit } from '../utils/depositApi'
import { fetchNumericDbUserIdForApi, getStoredNumericUserId } from '../services/authService'
import './Shares.css'
import { getPropertyCardImage } from '../utils/propertyImage'
import { ShareCardSkeletonGrid } from '../components/ShareCardSkeletonGrid'
import PropertyShareButton from '../components/PropertyShareButton'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import '../components/PropertyList.css'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import { formatPropertyPrice } from '../utils/currency'
import {
  EMPTY_SHARES_FILTERS,
  applySharesPageFilters,
  getSharesPriceBounds,
  SHARES_MOBILE_FILTER_ITEMS,
  isShareSoldOut,
} from '../utils/sharesPageFilters'

const MOBILE_BREAKPOINT = 768

// Фотографии разных объектов недвижимости для бегущей строки
const HERO_MARQUEE_IMAGES = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&auto=format&fit=crop&q=70', // villa with pool
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&auto=format&fit=crop&q=70', // penthouse
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&auto=format&fit=crop&q=70', // mountain lodge
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&auto=format&fit=crop&q=70', // seaside apartment
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&auto=format&fit=crop&q=70', // downtown loft
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=900&auto=format&fit=crop&q=70', // family home
]

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

// Демо-объекты долей (показываются вместе с объектами из API)
const SHARE_CARD_FALLBACK =
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'

const DEMO_SHARE_OBJECTS = [
  {
    id: 'share-demo-1',
    title: 'Квартира в центре, 2-комн.',
    location: 'Минск, ул. Примерная, 10',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
    totalPrice: 120000,
    pricePerShare: 6000,
    totalShares: 20,
    sharesSold: 8,
    myShares: 0,
    area: 65,
    rooms: 2,
  },
  {
    id: 'share-demo-2',
    title: 'Апартаменты с видом на море',
    location: 'Барселона, Eixample',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
    totalPrice: 250000,
    pricePerShare: 12500,
    totalShares: 20,
    sharesSold: 15,
    myShares: 2,
    area: 95,
    rooms: 3,
  },
  {
    id: 'share-demo-3',
    title: 'Студия в историческом центре',
    location: 'Вена, 1-й район',
    image: 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=800&q=80',
    totalPrice: 180000,
    pricePerShare: 9000,
    totalShares: 20,
    sharesSold: 20,
    myShares: 0,
    area: 42,
    rooms: 1,
  },
]

const Shares = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const [searchQuery, setSearchQuery] = useState('')
  const [sharesFilters, setSharesFilters] = useState(EMPTY_SHARES_FILTERS)
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(true)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT,
  )
  const searchFiltersBarRef = useRef(null)
  const [apiShares, setApiShares] = useState([])
  const [loadingShares, setLoadingShares] = useState(true)
  const [compactShareCards, setCompactShareCards] = useState(false)
  const [dbUserId, setDbUserId] = useState(() => getStoredNumericUserId())
  const [userDeposit, setUserDeposit] = useState(0)
  const [depositLoading, setDepositLoading] = useState(() => Boolean(getStoredNumericUserId()))

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => {
      setCompactShareCards(mq.matches)
      setIsMobile(mq.matches)
    }
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!isMobile || !mobileFiltersOpen) return
    const handlePointerDown = (e) => {
      if (searchFiltersBarRef.current && !searchFiltersBarRef.current.contains(e.target)) {
        setMobileFiltersOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [isMobile, mobileFiltersOpen])

  const isSharesDesktop = !isMobile

  const setPropertyType = (propertyType) => {
    setSharesFilters((prev) => ({ ...prev, propertyType }))
  }

  const setAvailabilityFilter = (availability) => {
    setSharesFilters((prev) => ({ ...prev, availability }))
  }

  const setMinPriceFilter = (minPrice) => {
    setSharesFilters((prev) => ({ ...prev, minPrice }))
  }

  const setMaxPriceFilter = (maxPrice) => {
    setSharesFilters((prev) => ({ ...prev, maxPrice }))
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const id = await fetchNumericDbUserIdForApi({ clerkUser: null, clerkUserLoaded: false })
      if (!cancelled && id) setDbUserId(id)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!dbUserId) {
      setDepositLoading(false)
      return
    }
    let cancelled = false
    setDepositLoading(true)

    ;(async () => {
      try {
        const deposit = await fetchUserDeposit(API_BASE, dbUserId, { ttlMs: 15000 })
        if (
          !cancelled &&
          deposit &&
          typeof deposit.depositAmount === 'number'
        ) {
          setUserDeposit(deposit.depositAmount || 0)
        }
      } catch {
        if (!cancelled) setUserDeposit(0)
      } finally {
        if (!cancelled) setDepositLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [dbUserId])

  const loadShares = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/properties/shares`)
      const json = await (res.ok ? res.json() : { success: false, data: [] })
      if (json.success && Array.isArray(json.data)) {
        setApiShares(json.data.map((p) => ({
          ...p,
          id: p.shareId || `${p.property_type}-${p.id}`,
          image: getPropertyCardImage(p, SHARE_CARD_FALLBACK),
        })))
      }
    } catch (_) {
      setApiShares([])
    } finally {
      setLoadingShares(false)
    }
  }, [])

  useEffect(() => {
    void loadShares()
  }, [loadShares])

  const allShareObjects = [...DEMO_SHARE_OBJECTS, ...apiShares]
  const priceBounds = useMemo(() => getSharesPriceBounds(allShareObjects), [allShareObjects])

  const filtered = useMemo(
    () => applySharesPageFilters(allShareObjects, sharesFilters, searchQuery),
    [allShareObjects, sharesFilters, searchQuery],
  )

  const formatPrice = (n, currency = 'USD') =>
    formatPropertyPrice(n, currency, { compact: true })

  const toShareFavoriteProperty = (obj) => ({
    ...obj,
    title: obj.title,
    name: obj.title,
    sale_type: 'share',
    is_shared_ownership: true,
  })

  const isShareLiked = (obj) =>
    isFavorite(
      toShareFavoriteProperty(obj),
      hasDbBackedProperty(obj) ? undefined : 'share',
    )

  const handleShareFavoriteToggle = (obj, e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(
      toShareFavoriteProperty(obj),
      hasDbBackedProperty(obj) ? undefined : 'share',
    )
  }

  return (
    <div className="shares-page shares-page--catalog">
      <Header />
      <div className="shares-page__bg" />
      <AnimatedMarqueeHero
        title={
          <>
            {t('sharesHeroTitleLine1')}
            <br />
            <span className="shares-hero__title-marker">{t('sharesHeroTitleLine2')}</span>
          </>
        }
        description={t('sharesHeroDescription')}
        images={HERO_MARQUEE_IMAGES}
        className="animated-marquee-hero--shares"
      />
      <main className="shares-container shares-container--catalog">
        <div
          className={`shares-listing-shell${
            isSharesDesktop && desktopFiltersOpen ? ' shares-listing-shell--with-filters' : ''
          }${isSharesDesktop && !desktopFiltersOpen ? ' shares-listing-shell--filters-hidden' : ''}`}
        >
          <div className="page-context-heading page-context-heading--listing-auction">
            <div className="page-context-heading--listing-auction-inner">
              <h1 className="page-context-heading__title page-context-heading__title--auction-script">
                {t('shares')}
              </h1>
              <PageBreadcrumbs className="page-breadcrumbs--flat-club" separator=">" />
            </div>
          </div>

          <div
            className={`shares-listing-layout${
              isSharesDesktop
                ? ` auction-desktop-layout${
                    desktopFiltersOpen ? '' : ' auction-desktop-layout--filters-hidden'
                  }`
                : ''
            }`}
          >
            {isSharesDesktop && desktopFiltersOpen ? (
              <SharesDesktopFilters
                propertyType={sharesFilters.propertyType}
                setPropertyType={setPropertyType}
                availabilityFilter={sharesFilters.availability}
                setAvailabilityFilter={setAvailabilityFilter}
                minPrice={sharesFilters.minPrice}
                maxPrice={sharesFilters.maxPrice}
                setMinPrice={setMinPriceFilter}
                setMaxPrice={setMaxPriceFilter}
                priceBounds={priceBounds}
                onApply={() => {
                  document.getElementById('shares-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              />
            ) : null}

            <div
              className={`shares-listing-layout__main${
                isSharesDesktop ? ' auction-desktop-layout__main' : ''
              }${
                isSharesDesktop && !desktopFiltersOpen ? ' auction-desktop-layout__main--filters-hidden' : ''
              }`.trim()}
            >
              <div
                ref={searchFiltersBarRef}
                className={`search-filters-bar${
                  isSharesDesktop ? ' search-filters-bar--auction-desktop' : ' search-filters-bar--auction-mobile'
                }${
                  isMobile
                    ? mobileFiltersOpen
                      ? ' search-filters-bar--types-expanded'
                      : ' search-filters-bar--types-collapsed'
                    : ''
                }`}
              >
                {isSharesDesktop ? (
                  <button
                    type="button"
                    className="auction-desktop-filters-toggle"
                    onClick={() => setDesktopFiltersOpen((open) => !open)}
                    aria-label={
                      desktopFiltersOpen ? t('auctionToggleFiltersHide') : t('auctionToggleFiltersShow')
                    }
                    aria-expanded={desktopFiltersOpen}
                  >
                    {desktopFiltersOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                  </button>
                ) : null}
                <div className="search-box">
                  <svg
                    className="search-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    className="search-input"
                    placeholder={t('searchPlaceholderLong')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      className="search-clear"
                      onClick={() => setSearchQuery('')}
                      aria-label={t('clearSearch')}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
                {isMobile ? (
                  <div className="filters-and-types-grid">
                    <button
                      type="button"
                      className="filters-button"
                      aria-expanded={mobileFiltersOpen}
                      onClick={() => setMobileFiltersOpen((open) => !open)}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                      </svg>
                      {t('filters')}
                    </button>
                    <div className="property-types property-types--auction-mobile">
                      {SHARES_MOBILE_FILTER_ITEMS.map((item) => (
                        <button
                          key={`${item.kind}-${item.value}`}
                          type="button"
                          className={`type-button ${
                            item.kind === 'type'
                              ? sharesFilters.propertyType === item.value
                                ? 'active'
                                : ''
                              : sharesFilters.availability === item.value
                                ? 'active'
                                : ''
                          }`}
                          onClick={() => {
                            if (item.kind === 'type') {
                              setPropertyType(item.value)
                            } else {
                              setAvailabilityFilter(
                                sharesFilters.availability === item.value ? 'all' : item.value,
                              )
                            }
                          }}
                        >
                          {t(item.labelKey)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

        <div id="shares-grid" className="shares-grid" aria-busy={loadingShares}>
          {loadingShares ? (
            <ShareCardSkeletonGrid count={6} />
          ) : filtered.length === 0 ? (
            <div className="shares-no-results">
              <p>{t('sharesEmpty')}</p>
            </div>
          ) : (
            filtered.map((obj) => {
              const rawSoldPercent = (obj.totalShares > 0) ? Math.round((obj.sharesSold / obj.totalShares) * 100) : 0
              const soldPercent = Math.max(0, Math.min(rawSoldPercent, 100))
              const isSoldOut = isShareSoldOut(obj)
              const total = Math.max(1, Number(obj.totalShares) || 1)
              const sold = Math.min(obj.sharesSold || 0, total)
              const remaining = Math.max(total - sold, 0)
              const cardImage = getPropertyCardImage(obj, SHARE_CARD_FALLBACK)
              const cardImageProps = buildResponsiveImageProps(cardImage, {
                widths: [320, 480, 640, 800],
                sizes: '(max-width: 768px) 50vw, (max-width: 1024px) 50vw, 33vw',
                quality: 72,
                fit: 'crop',
              })
              return (
              <article
                key={obj.id}
                className={`share-card ${isSoldOut ? 'share-card--sold-out' : ''}`}
                onClick={() => navigate(`/shares/${obj.id}`, { state: { shareObject: obj } })}
              >
                <div className="share-card__image-wrap">
                  <div className="property-media-actions property-media-actions--compact">
                    <button
                      type="button"
                      className={`property-favorite ${isShareLiked(obj) ? 'active' : ''}`}
                      onClick={(e) => handleShareFavoriteToggle(obj, e)}
                      aria-label={t('favorites')}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill={isShareLiked(obj) ? 'currentColor' : 'none'}
                        />
                      </svg>
                    </button>
                    <PropertyShareButton property={obj} variant="compact" iconSize={16} />
                  </div>
                  <div className="share-card__scale" aria-hidden>
                    <div className="share-card__scale-track">
                      <div
                        className="share-card__scale-fill"
                        style={{ height: `${(sold / total) * 100}%` }}
                      />
                    </div>
                    <span className="share-card__scale-label share-card__scale-label--bottom">0%</span>
                    <span className="share-card__scale-label share-card__scale-label--top">100%</span>
                    <span className="share-card__scale-sold" style={{ bottom: `${soldPercent}%` }}>
                      {soldPercent}%
                    </span>
                  </div>
                  <img
                    {...cardImageProps}
                    alt={obj.title}
                    className="share-card__image"
                  />
                  <div
                    className="share-card__sold-overlay"
                    style={{ height: `${soldPercent}%` }}
                    aria-hidden
                  >
                    {!isSoldOut && soldPercent > 0 && (
                      <span className="share-card__sold-percent">
                        {t(compactShareCards ? 'sharesRemainingCompact' : 'sharesRemainingCount', { remaining })}
                      </span>
                    )}
                  </div>
                  {isSoldOut && (
                    <div className="share-card__sold-out-label">{t('sharesSoldOut')}</div>
                  )}
                </div>
                <div className="share-card__content">
                  <h2 className="share-card__title">{obj.title}</h2>
                  <p className="share-card__location">{obj.location}</p>
                  {obj.area && (
                    <p className="share-card__specs">
                      {obj.area} {t('squareMeters')} · {obj.rooms} {t('roomsShort')}
                    </p>
                  )}
                  <div className="share-card__prices">
                    <div className="share-card__price-total">
                      {t('sharesTotalCost')} <strong>{formatPrice(obj.totalPrice, obj.currency)}</strong>
                    </div>
                    <div className="share-card__price-per-share">
                      {t('sharesPerShare')} <strong>{formatPrice(obj.pricePerShare, obj.currency)}</strong>
                    </div>
                  </div>
                  <div className="share-card__footer">
                    <span className="share-card__sold">
                      {isSoldOut ? t('sharesAllSold') : t('sharesSoldCount', { sold, total })}
                    </span>
                  </div>
                </div>
              </article>
              )
            })
          )}
        </div>
            </div>
          </div>
        </div>
      </main>
      <SiteChatDock
        wrapperClassName="shares-floats"
        recommendationProperties={allShareObjects}
        onRecommendationClick={(share) =>
          navigate(`/shares/${share.id}`, { state: { shareObject: share } })
        }
      >
        {dbUserId ? (
          depositLoading ? (
            <DepositButtonSkeleton />
          ) : (
            <DepositButton amount={userDeposit} />
          )
        ) : null}
      </SiteChatDock>
    </div>
  )
}

export default Shares
