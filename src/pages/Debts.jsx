import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { useTranslation } from 'react-i18next'
import { PanelLeftClose, PanelLeftOpen, ShieldQuestionMark, ShieldAlert, ShieldCheck } from 'lucide-react'
import DebtsDesktopFilters from '../components/DebtsDesktopFilters'
import Header from '../components/Header'
import SiteChatDock from '../components/SiteChatDock'
import PageBreadcrumbs from '../components/PageBreadcrumbs'
import DepositButton from '../components/DepositButton'
import DepositButtonSkeleton from '../components/DepositButtonSkeleton'
import FlipCard from '../components/ui/FlipCard'
import PropertyTimer from '../components/PropertyTimer'
import PropertyShareButton from '../components/PropertyShareButton'
import CircularTimer from '../components/CircularTimer'
import AuctionMobileLayout from '../components/ui/AuctionMobileLayout'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import { hasBuyNowOption } from '../utils/hasBuyNowOption'
import { formatPropertyPrice } from '../utils/currency'
import { getPropertyCardImage } from '../utils/propertyImage'
import { fetchUserDeposit } from '../utils/depositApi'
import { fetchDedupe } from '../utils/fetchDedupe'
import { fetchNumericDbUserIdForApi, getStoredNumericUserId } from '../services/authService'
import { PropertyListingSkeletonGrid } from '../components/PropertyListingSkeletonGrid'
import {
  AuctionMobileListingSkeleton,
  readAuctionMobileViewMode,
} from '../components/AuctionMobileListingSkeleton'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import './Shares.css'
import '../components/PropertyList.css'
import { getPropertyDetailPath, auctionListingDedupeKey } from '../utils/propertyDetailUrl'
import {
  EMPTY_DEBTS_FILTERS,
  applyDebtsPageFilters,
  getDebtsPriceBounds,
  DEBTS_MOBILE_FILTER_ITEMS,
} from '../utils/debtsPageFilters'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const MOBILE_BREAKPOINT = 768

const Debts = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const [searchQuery, setSearchQuery] = useState('')
  const [debtsFilters, setDebtsFilters] = useState(EMPTY_DEBTS_FILTERS)
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(true)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const searchFiltersBarRef = useRef(null)
  const [openRiskCard, setOpenRiskCard] = useState(null)
  const [apiDebts, setApiDebts] = useState([])
  const [loadingDebts, setLoadingDebts] = useState(true)
  const [dbUserId, setDbUserId] = useState(() => getStoredNumericUserId())
  const [userDeposit, setUserDeposit] = useState(0)
  const [depositLoading, setDepositLoading] = useState(() => Boolean(getStoredNumericUserId()))
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT,
  )

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
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

  const isDebtsDesktop = !isMobile

  const setPropertyType = (propertyType) => {
    setDebtsFilters((prev) => ({ ...prev, propertyType }))
  }

  const setRiskFilter = (risk) => {
    setDebtsFilters((prev) => ({ ...prev, risk }))
  }

  const setMinPriceFilter = (minPrice) => {
    setDebtsFilters((prev) => ({ ...prev, minPrice }))
  }

  const setMaxPriceFilter = (maxPrice) => {
    setDebtsFilters((prev) => ({ ...prev, maxPrice }))
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const id = await fetchNumericDbUserIdForApi({ clerkUser: null, clerkUserLoaded: false })
      if (!cancelled && id) setDbUserId(id)
    }

    /** Депозит/ID не нужны для первой отрисовки списка долгов — после idle не мешаем LCP */
    const schedule =
      typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
        ? () =>
            window.requestIdleCallback(
              () => {
                void run()
              },
              { timeout: 6000 },
            )
        : () => window.setTimeout(() => void run(), 1800)

    const idleIdOrTimer = schedule()
    return () => {
      cancelled = true
      if (typeof idleIdOrTimer === 'number') {
        if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
          window.cancelIdleCallback(idleIdOrTimer)
        } else if (typeof window !== 'undefined') {
          window.clearTimeout(idleIdOrTimer)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!dbUserId) {
      setDepositLoading(false)
      return
    }

    let cancelled = false
    setDepositLoading(true)

    const run = async () => {
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
    }

    let idleIdOrTimer =
      typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(
            () => {
              void run()
            },
            { timeout: 8000 },
          )
        : window.setTimeout(() => void run(), 400)

    return () => {
      cancelled = true
      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        window.cancelIdleCallback(idleIdOrTimer)
      } else if (typeof window !== 'undefined') {
        window.clearTimeout(idleIdOrTimer)
      }
    }
  }, [dbUserId])

  const loadDebts = useCallback(async () => {
    try {
      const res = await fetchDedupe(`${API_BASE}/properties/debts`)
      const json = await (res.ok ? res.json() : { success: false, data: [] })
      if (json.success && Array.isArray(json.data)) {
        const isDebtRecord = (p) => {
          if (!p) return false
          if (p.sale_type === 'debt') return true
          if (p.is_debt === 1 || p.is_debt === true) return true
          if (p.has_debt === 1 || p.has_debt === true) return true
          if (p.debt_amount != null && p.debt_amount !== '' && !Number.isNaN(Number(p.debt_amount))) return true
          if (typeof p.debt_severity === 'string' && ['red', 'yellow', 'green'].includes(p.debt_severity)) return true
          return false
        }

        const mapped = json.data.filter(isDebtRecord).map((p) => {
          const image = getPropertyCardImage(
            p,
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
          )
          const location = p.location || [p.city, p.country].filter(Boolean).join(', ') || ''
          const priceNumber = p.price != null && p.price !== '' ? Number(p.price) : 0
          const debtAmount = p.debt_amount != null && p.debt_amount !== '' ? Number(p.debt_amount) : null
          const currentBidRaw =
            p.currentBid ??
            p.auction_current_bid ??
            p.auctionCurrentBid ??
            p.auction_starting_price ??
            p.auctionStartingPrice ??
            null
          const currentBid = currentBidRaw != null && currentBidRaw !== '' ? Number(currentBidRaw) : null

          const endTime =
            p.endTime ??
            p.auction_end_time ??
            p.auctionEndTime ??
            p.auction_end_date ??
            p.auctionEndDate ??
            null

          return {
            ...p,
            id: p.id,
            title: p.title || p.name || '',
            location,
            image,
            images: image ? [image] : [],
            price: priceNumber,
            debt_amount: debtAmount,
            currentBid,
            area: p.area || p.sqft || 0,
            rooms: p.rooms || p.bedrooms || 0,
            endTime,
            isAuction:
              p.isAuction === true ||
              p.is_auction === 1 ||
              p.is_auction === true ||
              (endTime != null && endTime !== '') ||
              (p.test_timer_end_date != null && p.test_timer_end_date !== ''),
            sale_type: p.sale_type || 'debt',
            is_debt: p.is_debt ?? 1,
            has_debt: p.has_debt ?? 1,
          }
        })
        setApiDebts(mapped)
      } else {
        setApiDebts([])
      }
    } catch (_) {
      setApiDebts([])
    } finally {
      setLoadingDebts(false)
    }
  }, [])

  useEffect(() => {
    void loadDebts()
  }, [loadDebts])

  const priceBounds = useMemo(() => getDebtsPriceBounds(apiDebts), [apiDebts])

  const filtered = useMemo(
    () => applyDebtsPageFilters(apiDebts, debtsFilters, searchQuery),
    [apiDebts, debtsFilters, searchQuery],
  )

  const formatPrice = (n, currency = 'USD') => {
    if (!n || Number.isNaN(Number(n))) return '—'
    return formatPropertyPrice(n, currency, { compact: true })
  }

  const isPropertyLiked = (property) =>
    isFavorite(property, hasDbBackedProperty(property) ? undefined : 'property')

  const handleFavoriteToggle = (property, e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(property, hasDbBackedProperty(property) ? undefined : 'property')
  }

  return (
    <div className="shares-page shares-page--debts">
      <Header />
      <div className="shares-page__bg" />
      <main className="shares-container">
        <div className="shares-flip-cards shares-flip-cards--debts">
          <FlipCard
            color="#DC2626"
            icon={ShieldQuestionMark}
            title={t('debtsHighRisk')}
            subtitle={t('debtsHighRiskSubtitle')}
            description={t('debtsHighRiskDescription')}
            features={[
              t('debtsHighRiskFeature1'),
              t('debtsHighRiskFeature2'),
              t('debtsHighRiskFeature3'),
              t('debtsHighRiskFeature4'),
            ]}
            ctaText={t('debtsHighRiskCta')}
            clickToFlip
            isFlipped={openRiskCard === 'high'}
            onFlipChange={(next) => setOpenRiskCard(next ? 'high' : null)}
          />
          <FlipCard
            color="#CA8A04"
            icon={ShieldAlert}
            title={t('debtsMediumRisk')}
            subtitle={t('debtsMediumRiskSubtitle')}
            description={t('debtsMediumRiskDescription')}
            features={[
              t('debtsMediumRiskFeature1'),
              t('debtsMediumRiskFeature2'),
              t('debtsMediumRiskFeature3'),
              t('debtsMediumRiskFeature4'),
            ]}
            ctaText={t('debtsMediumRiskCta')}
            clickToFlip
            isFlipped={openRiskCard === 'medium'}
            onFlipChange={(next) => setOpenRiskCard(next ? 'medium' : null)}
          />
          <FlipCard
            color="#16A34A"
            icon={ShieldCheck}
            title={t('debtsLowRisk')}
            subtitle={t('debtsLowRiskSubtitle')}
            description={t('debtsLowRiskDescription')}
            features={[
              t('debtsLowRiskFeature1'),
              t('debtsLowRiskFeature2'),
              t('debtsLowRiskFeature3'),
              t('debtsLowRiskFeature4'),
            ]}
            ctaText={t('debtsLowRiskCta')}
            clickToFlip
            isFlipped={openRiskCard === 'low'}
            onFlipChange={(next) => setOpenRiskCard(next ? 'low' : null)}
          />
        </div>

        <div
          className={`shares-listing-shell${
            isDebtsDesktop && desktopFiltersOpen ? ' shares-listing-shell--with-filters' : ''
          }${isDebtsDesktop && !desktopFiltersOpen ? ' shares-listing-shell--filters-hidden' : ''}`}
        >
          <div className="page-context-heading page-context-heading--listing-auction">
            <div className="page-context-heading--listing-auction-inner">
              <h1 className="page-context-heading__title page-context-heading__title--auction-script">
                {t('debtsTitle')}
              </h1>
              <PageBreadcrumbs className="page-breadcrumbs--flat-club" separator=">" />
            </div>
          </div>

          <div
            className={`shares-listing-layout${
              isDebtsDesktop
                ? ` auction-desktop-layout${
                    desktopFiltersOpen ? '' : ' auction-desktop-layout--filters-hidden'
                  }`
                : ''
            }`}
          >
          {isDebtsDesktop && desktopFiltersOpen ? (
            <DebtsDesktopFilters
              propertyType={debtsFilters.propertyType}
              setPropertyType={setPropertyType}
              riskFilter={debtsFilters.risk}
              setRiskFilter={setRiskFilter}
              minPrice={debtsFilters.minPrice}
              maxPrice={debtsFilters.maxPrice}
              setMinPrice={setMinPriceFilter}
              setMaxPrice={setMaxPriceFilter}
              priceBounds={priceBounds}
              onApply={() => {
                document.getElementById('properties-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            />
          ) : null}

          <div
            className={`shares-listing-layout__main${
              isDebtsDesktop ? ' auction-desktop-layout__main' : ''
            }${
              isDebtsDesktop && !desktopFiltersOpen ? ' auction-desktop-layout__main--filters-hidden' : ''
            }`.trim()}
          >
            <div
              ref={searchFiltersBarRef}
              className={`search-filters-bar${
                isDebtsDesktop ? ' search-filters-bar--auction-desktop' : ' search-filters-bar--auction-mobile'
              }${
                isMobile
                  ? mobileFiltersOpen
                    ? ' search-filters-bar--types-expanded'
                    : ' search-filters-bar--types-collapsed'
                  : ''
              }`}
            >
              {isDebtsDesktop ? (
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
                    {DEBTS_MOBILE_FILTER_ITEMS.map((item) => (
                      <button
                        key={`${item.kind}-${item.value}`}
                        type="button"
                        className={`type-button ${
                          item.kind === 'type'
                            ? debtsFilters.propertyType === item.value
                              ? 'active'
                              : ''
                            : debtsFilters.risk === item.value
                              ? 'active'
                              : ''
                        }`}
                        onClick={() => {
                          if (item.kind === 'type') {
                            setPropertyType(item.value)
                          } else {
                            setRiskFilter(debtsFilters.risk === item.value ? 'all' : item.value)
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

        <div className="shares-grid" aria-busy={loadingDebts}>
          {loadingDebts && (
            <div style={{ gridColumn: '1 / -1' }}>
              {isMobile ? (
                <div
                  className="properties-grid properties-grid--mobile-auction"
                  aria-busy="true"
                >
                  <AuctionMobileListingSkeleton viewMode={readAuctionMobileViewMode()} />
                </div>
              ) : (
                <div className="properties-grid" aria-hidden="true">
                  <PropertyListingSkeletonGrid count={6} />
                </div>
              )}
            </div>
          )}

          {!loadingDebts && filtered.length === 0 && (
            <div className="shares-no-results">
              <p>{t('debtsEmpty')}</p>
            </div>
          )}

          {!loadingDebts && filtered.length > 0 && (
            <>
              {isMobile ? (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="properties-grid properties-grid--mobile-auction">
                    <AuctionMobileLayout
                      properties={filtered}
                      formatPrice={formatPrice}
                      isFavorite={isPropertyLiked}
                      onFavoriteToggle={handleFavoriteToggle}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div id="properties-grid" className="properties-grid">
                    {filtered.map((property) => {
                      const propertyTitle = property.title || property.name || ''
                      const propertyImages = property.images || (property.image ? [property.image] : [])
                      const propertyImage =
                        propertyImages[0] ||
                        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
                      const propertyImageProps = buildResponsiveImageProps(propertyImage, {
                        widths: [320, 480, 640, 800],
                        sizes: '(max-width: 500px) 50vw, (max-width: 768px) 50vw, (max-width: 1200px) 50vw, 33vw',
                        quality: 72,
                        fit: 'crop',
                      })
                      const hasTestTimer =
                        property.test_timer_end_date != null && property.test_timer_end_date !== ''
                      const hasTimer =
                        (property.isAuction === true &&
                          property.endTime != null &&
                          property.endTime !== '') ||
                        hasTestTimer
                      const isReserved = property.is_reserved === true || property.is_reserved === 1
                      const showBuyNow = hasBuyNowOption(property)

                      const greenTimerBlock =
                        hasTimer && !isReserved && !hasTestTimer && property.endTime ? (
                          <div className="property-timer-wrapper">
                            <PropertyTimer endTime={property.endTime} compact={true} />
                          </div>
                        ) : null

                      const redTimerBlock =
                        hasTimer && !isReserved && hasTestTimer ? (
                          <div className="property-timer-wrapper">
                            <CircularTimer
                              endTime={property.test_timer_end_date}
                              size={120}
                              strokeWidth={6}
                            />
                          </div>
                        ) : null

                      const hasDebtAmount =
                        property.debt_amount != null &&
                        property.debt_amount !== '' &&
                        !Number.isNaN(Number(property.debt_amount))

                      return (
                        <div
                          key={auctionListingDedupeKey(property)}
                          className="property-card"
                          onClick={(e) => {
                            if (e.target.closest('button') || e.target.closest('a')) return
                            if (!ensureCanOpenProperty()) return
                            navigate(getPropertyDetailPath(property.id, { property }), { state: { property } })
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="property-link">
                            <div className="property-image-container">
                              <img {...propertyImageProps} alt={propertyTitle} className="property-image" />
                              <div className="property-media-actions">
                                <button
                                  type="button"
                                  className={`property-favorite ${isPropertyLiked(property) ? 'active' : ''}`}
                                  onClick={(e) => handleFavoriteToggle(property, e)}
                                  aria-label={t('favorites')}
                                >
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                                    <path
                                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      fill={isPropertyLiked(property) ? 'currentColor' : 'none'}
                                    />
                                  </svg>
                                </button>
                                <PropertyShareButton property={property} />
                              </div>
                              {isReserved && (
                                <div className="property-reserved-overlay">
                                  <div className="reserved-overlay-icon">🔒</div>
                                  <div className="reserved-overlay-text">{t('reserved')}</div>
                                </div>
                              )}
                              {!isReserved && showBuyNow && (
                                <div className="property-badges-center">
                                  <div className="property-buy-badge">
                                    <span>{t('buyNowSectionTitle')}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="property-content">
                              {greenTimerBlock}
                              {redTimerBlock}
                              <h3 className="property-title">{propertyTitle}</h3>
                              <p className="property-location">{property.location || ''}</p>

                              <div className="property-content-bottom">
                                <div className="property-bid-info" style={{ display: 'grid', gap: 6 }}>
                                  {hasDebtAmount && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                      <span className="bid-label">{t('debtsDebtAmount')}</span>
                                      <span className="bid-value">{formatPrice(property.debt_amount, property.currency)}</span>
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                    <span className="bid-label">{t('currentBid')}</span>
                                    <span className="bid-value">
                                      {formatPrice(property.currentBid || property.price || 0, property.currency)}
                                    </span>
                                  </div>
                                </div>

                                <div className="property-actions" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-liquid-glass"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      if (!ensureCanOpenProperty()) return
                                      navigate(getPropertyDetailPath(property.id, { property }), { state: { property } })
                                    }}
                                    disabled={isReserved}
                                    style={{
                                      opacity: isReserved ? 0.5 : 1,
                                      cursor: isReserved ? 'not-allowed' : 'pointer',
                                    }}
                                  >
                                    {isReserved ? t('objectReserved') : t('placeBid')}
                                  </button>
                                  {showBuyNow && (
                                    <button
                                      type="button"
                                      className="btn btn-buy-now btn-liquid-glass-buy"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (!ensureCanOpenProperty()) return
                                        navigate(getPropertyDetailPath(property.id, { property }), { state: { property } })
                                      }}
                                      disabled={isReserved}
                                      style={{
                                        opacity: isReserved ? 0.5 : 1,
                                        cursor: isReserved ? 'not-allowed' : 'pointer',
                                      }}
                                    >
                                      {isReserved ? t('objectReserved') : t('buyNowSectionTitle')}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
          </div>
        </div>
        </div>
      </main>
      <SiteChatDock wrapperClassName="shares-floats" recommendationProperties={apiDebts}>
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

export default Debts

