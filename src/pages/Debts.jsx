import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldQuestionMark, ShieldAlert, ShieldCheck } from 'lucide-react'
import DebtsPageHeader from '../components/DebtsPageHeader'
import DebtsPageFilters from '../components/DebtsPageFilters'
import DebtsListingMeta from '../components/DebtsListingMeta'
import DebtsPropertyCard, { DebtsPropertyCardSkeleton } from '../components/DebtsPropertyCard'
import Header from '../components/Header'
import SiteChatDock from '../components/SiteChatDock'
import FlipCard from '../components/ui/FlipCard'
import DepositButton from '../components/DepositButton'
import DepositButtonSkeleton from '../components/DepositButtonSkeleton'
import AuctionMobileLayout from '../components/ui/AuctionMobileLayout'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import { formatPropertyPrice } from '../utils/currency'
import { getPropertyCardImage } from '../utils/propertyImage'
import { fetchUserDeposit } from '../utils/depositApi'
import { fetchDedupe } from '../utils/fetchDedupe'
import { fetchNumericDbUserIdForApi, getStoredNumericUserId } from '../services/authService'
import { resolveAuctionCurrentBidValue } from '../services/auctionListCache'
import {
  AuctionMobileListingSkeleton,
  readAuctionMobileViewMode,
} from '../components/AuctionMobileListingSkeleton'
import './Shares.css'
import '../components/PropertyList.css'
import { auctionListingDedupeKey } from '../utils/propertyDetailUrl'
import {
  EMPTY_DEBTS_FILTERS,
  applyDebtsPageFilters,
  getDebtsPriceBounds,
  getDebtsDebtBounds,
  getDebtsFilterOptions,
  getDebtsPurchaseCounts,
  DEBTS_MOBILE_FILTER_ITEMS,
} from '../utils/debtsPageFilters'
import { getDebtsRiskStats, sortDebts } from '../utils/debtsListing'
import { buildCatalogCityPath } from '../utils/catalogGeoUrl'
import { getDebtsContextPropertyPath } from '../utils/listingContextUrl'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const MOBILE_BREAKPOINT = 768

const Debts = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState('newest')
  const [openRiskCard, setOpenRiskCard] = useState(null)
  const [debtsFilters, setDebtsFilters] = useState(EMPTY_DEBTS_FILTERS)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const searchFiltersBarRef = useRef(null)
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
            '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'
          )
          const location = p.location || [p.city, p.country].filter(Boolean).join(', ') || ''
          const priceNumber = p.price != null && p.price !== '' ? Number(p.price) : 0
          const debtAmount = p.debt_amount != null && p.debt_amount !== '' ? Number(p.debt_amount) : null
          const currentBidValue = resolveAuctionCurrentBidValue(p)
          const currentBid = currentBidValue > 0 ? currentBidValue : null

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

  useEffect(() => {
    if (debtsFilters.country === 'all' || debtsFilters.city === 'all') return
    const typeToCatalogPlural = {
      апартаменты: 'apartments',
      квартира: 'apartments',
      вилла: 'villas',
      дом: 'houses',
      коммерческая: 'commercial',
    }
    const path = buildCatalogCityPath({
      country: debtsFilters.country,
      city: debtsFilters.city,
      typePlural: typeToCatalogPlural[debtsFilters.propertyType] || undefined,
      sale: 'debts',
    })
    if (path) navigate(path)
  }, [
    debtsFilters.country,
    debtsFilters.city,
    debtsFilters.propertyType,
    navigate,
  ])

  const priceBounds = useMemo(() => getDebtsPriceBounds(apiDebts), [apiDebts])
  const debtBounds = useMemo(() => getDebtsDebtBounds(apiDebts), [apiDebts])

  const filtered = useMemo(
    () => sortDebts(applyDebtsPageFilters(apiDebts, debtsFilters, searchQuery), sortKey),
    [apiDebts, debtsFilters, searchQuery, sortKey],
  )

  const riskStats = useMemo(() => getDebtsRiskStats(apiDebts), [apiDebts])
  const filterOptions = useMemo(() => getDebtsFilterOptions(apiDebts), [apiDebts])
  const purchaseCounts = useMemo(() => getDebtsPurchaseCounts(apiDebts), [apiDebts])

  const openProperty = (property) => {
    const targetPath = getDebtsContextPropertyPath(property, {
      country: debtsFilters.country,
      city: debtsFilters.city,
    })
    navigate(targetPath, { state: { property } })
  }

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
    <div className="shares-page shares-page--debts shares-page--debts-redesign">
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

        <DebtsPageHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="debts-page-body">
          {isDebtsDesktop ? (
            <div className="debts-page-layout">
              <DebtsPageFilters
                filters={debtsFilters}
                onFiltersChange={setDebtsFilters}
                priceBounds={priceBounds}
                debtBounds={debtBounds}
                riskStats={riskStats}
                purchaseCounts={purchaseCounts}
                filterOptions={filterOptions}
              />

              <div className="debts-page-layout__main">
                <section className="debts-listing-section" aria-label={t('debtsTitle')}>
                  <DebtsListingMeta
                    total={filtered.length}
                    sortKey={sortKey}
                    onSortChange={setSortKey}
                  />

                  <div
                    id="properties-grid"
                    className="debts-listing-grid debts-listing-grid--grid"
                    aria-busy={loadingDebts}
                  >
                  {loadingDebts
                    ? Array.from({ length: 6 }, (_, i) => <DebtsPropertyCardSkeleton key={`sk-${i}`} />)
                    : null}

                  {!loadingDebts && filtered.length === 0 ? (
                    <div className="debts-listing-empty">
                      <p>{t('debtsEmpty')}</p>
                    </div>
                  ) : null}

                  {!loadingDebts
                    ? filtered.map((property) => (
                        <DebtsPropertyCard
                          key={auctionListingDedupeKey(property)}
                          property={property}
                          isFavorite={isPropertyLiked(property)}
                          onFavoriteToggle={handleFavoriteToggle}
                          href={getDebtsContextPropertyPath(property, {
                            country: debtsFilters.country,
                            city: debtsFilters.city,
                          })}
                          onOpen={openProperty}
                        />
                      ))
                    : null}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="shares-listing-shell">
              <div className="shares-listing-layout">
                <div className="shares-listing-layout__main">
                  <div
                    ref={searchFiltersBarRef}
                    className={`search-filters-bar search-filters-bar--auction-mobile${
                      mobileFiltersOpen
                        ? ' search-filters-bar--types-expanded'
                        : ' search-filters-bar--types-collapsed'
                    }`}
                  >
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
                  </div>

                  <div className="shares-grid" aria-busy={loadingDebts}>
                    {loadingDebts && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div
                          className="properties-grid properties-grid--mobile-auction"
                          aria-busy="true"
                        >
                          <AuctionMobileListingSkeleton
                            viewMode={readAuctionMobileViewMode()}
                            debtsCards
                          />
                        </div>
                      </div>
                    )}

                    {!loadingDebts && filtered.length === 0 && (
                      <div className="shares-no-results">
                        <p>{t('debtsEmpty')}</p>
                      </div>
                    )}

                    {!loadingDebts && filtered.length > 0 && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div className="properties-grid properties-grid--mobile-auction">
                          <AuctionMobileLayout
                            properties={filtered}
                            formatPrice={formatPrice}
                            isFavorite={isPropertyLiked}
                            onFavoriteToggle={handleFavoriteToggle}
                            debtsCards
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
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

