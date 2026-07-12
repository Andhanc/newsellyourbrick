import { useEffect, useState, useCallback, useMemo, useRef, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldQuestionMark, ShieldAlert, ShieldCheck, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import DebtsDesktopFilters from '../components/DebtsDesktopFilters'
import SharesMobileFiltersDrawer from '../components/SharesMobileFiltersDrawer'
import '../components/DebtsDesktopFilters.css'
import AuctionListingSaleToggle from '../components/AuctionListingSaleToggle'
import '../components/AuctionListingSaleToggle.css'
import DebtsListingMeta from '../components/DebtsListingMeta'
import DebtsPropertyCard, { DebtsPropertyCardSkeleton } from '../components/DebtsPropertyCard'
import AuctionCategoryCtaCards from '../components/AuctionCategoryCtaCards'
import ListingPagePagination from '../components/ListingPagePagination'
import Header from '../components/Header'
import FlipCard from '../components/ui/FlipCard'
import DepositButton from '../components/DepositButton'
import DepositButtonSkeleton from '../components/DepositButtonSkeleton'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import { formatPropertyPrice } from '../utils/currency'
import { getPropertyCardImage } from '../utils/propertyImage'
import { fetchUserDeposit } from '../utils/depositApi'
import { canShowBuyerDeposit } from '../utils/depositVisibility'
import { fetchDedupe } from '../utils/fetchDedupe'
import { fetchNumericDbUserIdForApi, getStoredNumericUserId } from '../services/authService'
import { resolveAuctionCurrentBidValue } from '../services/auctionListCache'
import {
  AuctionMobileListingSkeleton,
  readAuctionMobileViewMode,
} from '../components/AuctionMobileListingSkeleton'
import './Shares.css'
import '../components/PropertyList.css'
import '../styles/hrShowcaseDebtsCards.css'
import { auctionListingDedupeKey } from '../utils/propertyDetailUrl'
import {
  EMPTY_DEBTS_FILTERS,
  applyDebtsPageFilters,
  getDebtsPriceBounds,
  getDebtsDebtBounds,
  getDebtsFilterOptions,
} from '../utils/debtsPageFilters'
import { getDebtsRiskStats, sortDebts } from '../utils/debtsListing'
import { buildCatalogCityPath } from '../utils/catalogGeoUrl'
import { getDebtsContextPropertyPath } from '../utils/listingContextUrl'

const SiteChatDockLazy = lazy(() => import('../components/SiteChatDock'))
const AuctionMobileLayoutLazy = lazy(() => import('../components/ui/AuctionMobileLayout'))

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const MOBILE_BREAKPOINT = 768
const DEBTS_PAGE_SIZE = 16
const DEBTS_HERO_BG = '/images/sellyourbrick/about/about-category-debts.jpg'

const Debts = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState('newest')
  const [openRiskCard, setOpenRiskCard] = useState(null)
  const [debtsFilters, setDebtsFilters] = useState(EMPTY_DEBTS_FILTERS)
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(true)
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false)
  const searchFiltersBarRef = useRef(null)
  const [apiDebts, setApiDebts] = useState([])
  const [loadingDebts, setLoadingDebts] = useState(true)
  const [dbUserId, setDbUserId] = useState(() => getStoredNumericUserId())
  const [userDeposit, setUserDeposit] = useState(0)
  const [depositLoading, setDepositLoading] = useState(() => Boolean(getStoredNumericUserId()))
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT,
  )
  const [debtsPage, setDebtsPage] = useState(1)

  const [showChatDock, setShowChatDock] = useState(false)

  useEffect(() => {
    const reveal = () => setShowChatDock(true)
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(reveal, { timeout: 4500 })
      return () => window.cancelIdleCallback(id)
    }
    const t = window.setTimeout(reveal, 1500)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const isDebtsDesktop = !isMobile

  const debtsPropertyTypes = useMemo(
    () =>
      debtsFilters.propertyTypes?.length
        ? debtsFilters.propertyTypes
        : debtsFilters.propertyType !== 'все'
          ? [debtsFilters.propertyType]
          : [],
    [debtsFilters.propertyTypes, debtsFilters.propertyType],
  )

  const debtsRisks = useMemo(
    () =>
      debtsFilters.risks?.length
        ? debtsFilters.risks
        : debtsFilters.risk !== 'all'
          ? [debtsFilters.risk]
          : [],
    [debtsFilters.risks, debtsFilters.risk],
  )

  const setDebtsPropertyTypes = (updater) => {
    setDebtsFilters((prev) => {
      const current =
        prev.propertyTypes?.length
          ? prev.propertyTypes
          : prev.propertyType !== 'все'
            ? [prev.propertyType]
            : []
      const next = typeof updater === 'function' ? updater(current) : updater
      return { ...prev, propertyTypes: next, propertyType: 'все' }
    })
  }

  const setDebtsRisks = (updater) => {
    setDebtsFilters((prev) => {
      const current =
        prev.risks?.length ? prev.risks : prev.risk !== 'all' ? [prev.risk] : []
      const next = typeof updater === 'function' ? updater(current) : updater
      return { ...prev, risks: next, risk: 'all' }
    })
  }

  const scrollToDebtsGrid = () => {
    document.getElementById('properties-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const resetDebtsFilters = useCallback(() => {
    setDebtsFilters({ ...EMPTY_DEBTS_FILTERS })
  }, [])

  const debtsSaleToggleMode =
    !debtsFilters.showAuction && debtsFilters.showBuyNow ? 'buy_now' : 'all'

  const handleDebtsSaleToggleChange = (mode) => {
    setDebtsFilters((prev) =>
      mode === 'buy_now'
        ? { ...prev, showAuction: false, showBuyNow: true }
        : { ...prev, showAuction: true, showBuyNow: true },
    )
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
    if (!dbUserId || !canShowBuyerDeposit()) {
      setUserDeposit(0)
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
    const singleType =
      debtsFilters.propertyTypes?.length === 1
        ? debtsFilters.propertyTypes[0]
        : debtsFilters.propertyType !== 'все'
          ? debtsFilters.propertyType
          : ''
    const path = buildCatalogCityPath({
      country: debtsFilters.country,
      city: debtsFilters.city,
      typePlural: typeToCatalogPlural[singleType] || undefined,
      sale: 'debts',
    })
    if (path) navigate(path)
  }, [
    debtsFilters.country,
    debtsFilters.city,
    debtsFilters.propertyType,
    debtsFilters.propertyTypes,
    navigate,
  ])

  const priceBounds = useMemo(() => getDebtsPriceBounds(apiDebts), [apiDebts])
  const debtBounds = useMemo(() => getDebtsDebtBounds(apiDebts), [apiDebts])

  const filtered = useMemo(
    () => sortDebts(applyDebtsPageFilters(apiDebts, debtsFilters, searchQuery), sortKey),
    [apiDebts, debtsFilters, searchQuery, sortKey],
  )

  const debtsTotalPages = Math.max(1, Math.ceil(filtered.length / DEBTS_PAGE_SIZE))
  const safeDebtsPage = Math.min(debtsPage, debtsTotalPages)

  useEffect(() => {
    if (debtsPage > debtsTotalPages) {
      setDebtsPage(debtsTotalPages)
    }
  }, [debtsPage, debtsTotalPages])

  useEffect(() => {
    setDebtsPage(1)
  }, [
    searchQuery,
    sortKey,
    debtsPropertyTypes,
    debtsRisks,
    debtsFilters.country,
    debtsFilters.city,
    debtsFilters.minDebt,
    debtsFilters.maxDebt,
    debtsFilters.minPrice,
    debtsFilters.maxPrice,
    debtsFilters.showAuction,
    debtsFilters.showBuyNow,
  ])

  const displayedDebts = useMemo(() => {
    const start = (safeDebtsPage - 1) * DEBTS_PAGE_SIZE
    return filtered.slice(start, start + DEBTS_PAGE_SIZE)
  }, [filtered, safeDebtsPage])

  const goToDebtsPage = (page) => {
    const next = Math.max(1, Math.min(page, debtsTotalPages))
    setDebtsPage(next)
    requestAnimationFrame(() => {
      document.getElementById('properties-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const riskStats = useMemo(() => getDebtsRiskStats(apiDebts), [apiDebts])
  const filterOptions = useMemo(() => getDebtsFilterOptions(apiDebts), [apiDebts])

  const mobileDebtsActiveFilterCount = useMemo(() => {
    let count = debtsPropertyTypes.length + debtsRisks.length
    if (debtsFilters.country && debtsFilters.country !== 'all') count += 1
    if (debtsFilters.city && debtsFilters.city !== 'all') count += 1
    if (debtsFilters.minDebt !== '' || debtsFilters.maxDebt !== '') count += 1
    if (debtsFilters.minPrice !== '' || debtsFilters.maxPrice !== '') count += 1
    return count
  }, [
    debtsPropertyTypes,
    debtsRisks,
    debtsFilters.country,
    debtsFilters.city,
    debtsFilters.minDebt,
    debtsFilters.maxDebt,
    debtsFilters.minPrice,
    debtsFilters.maxPrice,
  ])

  const debtsDesktopFilterProps = useMemo(
    () => ({
      propertyTypes: debtsPropertyTypes,
      setPropertyTypes: setDebtsPropertyTypes,
      risks: debtsRisks,
      setRisks: setDebtsRisks,
      locationOptions: filterOptions.locations,
      country: debtsFilters.country,
      city: debtsFilters.city,
      setCountry: (value) => setDebtsFilters((prev) => ({ ...prev, country: value })),
      setCity: (value) => setDebtsFilters((prev) => ({ ...prev, city: value })),
      minDebt: debtsFilters.minDebt,
      maxDebt: debtsFilters.maxDebt,
      setMinDebt: (value) => setDebtsFilters((prev) => ({ ...prev, minDebt: value })),
      setMaxDebt: (value) => setDebtsFilters((prev) => ({ ...prev, maxDebt: value })),
      minPrice: debtsFilters.minPrice,
      maxPrice: debtsFilters.maxPrice,
      setMinPrice: (value) => setDebtsFilters((prev) => ({ ...prev, minPrice: value })),
      setMaxPrice: (value) => setDebtsFilters((prev) => ({ ...prev, maxPrice: value })),
      debtBounds,
      priceBounds,
      riskStats,
      onApply: scrollToDebtsGrid,
    }),
    [
      debtsPropertyTypes,
      debtsRisks,
      filterOptions.locations,
      debtsFilters.country,
      debtsFilters.city,
      debtsFilters.minDebt,
      debtsFilters.maxDebt,
      debtsFilters.minPrice,
      debtsFilters.maxPrice,
      debtBounds,
      priceBounds,
      riskStats,
    ],
  )

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
      <section className="debts-hero-scene" aria-labelledby="debts-hero-title">
        <img className="debts-hero-scene__bg" src={DEBTS_HERO_BG} alt="" aria-hidden />
        <div className="debts-hero-scene__overlay" aria-hidden />
        <div className="debts-hero-scene__inner">
          <header className="debts-hero-scene__header">
            <h1 id="debts-hero-title" className="debts-hero-scene__title">
              {t('debtsTitle')}
            </h1>
            <p className="debts-hero-scene__lead">{t('debtsSectionSubtitle')}</p>
          </header>
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
        </div>
      </section>

      <main className="shares-container shares-container--debts-main">
        <div className="debts-page-body">
          <div
            className={
              isDebtsDesktop
                ? `shares-listing-shell${
                    desktopFiltersOpen
                      ? ' shares-listing-shell--with-filters'
                      : ' shares-listing-shell--filters-hidden'
                  }`
                : 'shares-listing-shell'
            }
          >
            <div
              className={`${
                isDebtsDesktop
                  ? `shares-listing-layout auction-desktop-layout${
                      desktopFiltersOpen ? '' : ' auction-desktop-layout--filters-hidden'
                    }`
                  : 'shares-listing-layout'
              }`.trim()}
            >
              {isDebtsDesktop && desktopFiltersOpen ? (
                <DebtsDesktopFilters {...debtsDesktopFilterProps} />
              ) : null}

              <div
                className={`${
                  isDebtsDesktop ? 'auction-desktop-layout__main' : 'shares-listing-layout__main'
                }${
                  isDebtsDesktop && !desktopFiltersOpen
                    ? ' auction-desktop-layout__main--filters-hidden'
                    : ''
                }`.trim()}
              >
                <div className="auction-listing-search-stack">
                <div
                  ref={searchFiltersBarRef}
                  className={`search-filters-bar${
                    isDebtsDesktop ? ' search-filters-bar--auction-desktop' : ''
                  }${
                    !isDebtsDesktop ? ' search-filters-bar--auction-mobile' : ''
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
                      <button type="button" className="search-clear" onClick={() => setSearchQuery('')}>
                        ×
                      </button>
                    ) : null}
                  </div>
                  {!isDebtsDesktop ? (
                    <div className="filters-and-types-grid">
                      <button
                        type="button"
                        className={`filters-button${
                          mobileDebtsActiveFilterCount > 0 ? ' is-active' : ''
                        }`}
                        aria-expanded={filtersDrawerOpen}
                        onClick={() => setFiltersDrawerOpen(true)}
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
                        <span className="filters-button__label">{t('filters')}</span>
                        {mobileDebtsActiveFilterCount > 0 ? (
                          <span className="filters-badge" aria-hidden="true">
                            {mobileDebtsActiveFilterCount}
                          </span>
                        ) : null}
                      </button>
                    </div>
                  ) : null}
                </div>
                {isDebtsDesktop ? (
                  <AuctionListingSaleToggle
                    value={debtsSaleToggleMode}
                    onChange={handleDebtsSaleToggleChange}
                  />
                ) : null}
                </div>

                {isDebtsDesktop ? (
                  <section
                    className="debts-listing-section hr-showcases hr-showcases--debts-listing"
                    aria-label={t('debtsTitle')}
                  >
                    <DebtsListingMeta
                      total={filtered.length}
                      sortKey={sortKey}
                      onSortChange={setSortKey}
                    />

                    <div
                      id="properties-grid"
                      className="debts-listing-grid debts-listing-grid--grid properties-grid properties-grid--auction-cards"
                      aria-busy={loadingDebts}
                    >
                      {loadingDebts
                        ? Array.from({ length: 6 }, (_, i) => (
                            <DebtsPropertyCardSkeleton key={`sk-${i}`} />
                          ))
                        : null}

                      {!loadingDebts && filtered.length === 0 ? (
                        <div className="debts-listing-empty">
                          <p>{t('debtsEmpty')}</p>
                        </div>
                      ) : null}

                      {!loadingDebts
                        ? displayedDebts.map((property) => (
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

                    {!loadingDebts ? (
                      <ListingPagePagination
                        currentPage={safeDebtsPage}
                        totalPages={debtsTotalPages}
                        onPageChange={goToDebtsPage}
                      />
                    ) : null}
                  </section>
                ) : (
                  <div className="shares-grid" aria-busy={loadingDebts}>
                    {loadingDebts ? (
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
                    ) : null}

                    {!loadingDebts && filtered.length === 0 ? (
                      <div className="shares-no-results">
                        <p>{t('debtsEmpty')}</p>
                      </div>
                    ) : null}

                    {!loadingDebts && filtered.length > 0 ? (
                      <div className="hr-showcases hr-showcases--debts-listing" style={{ gridColumn: '1 / -1' }}>
                        <div id="properties-grid" className="properties-grid properties-grid--mobile-auction">
                          <Suspense fallback={<AuctionMobileListingSkeleton debtsCards />}>
                            <AuctionMobileLayoutLazy
                              properties={displayedDebts}
                              formatPrice={formatPrice}
                              isFavorite={isPropertyLiked}
                              onFavoriteToggle={handleFavoriteToggle}
                              debtsCards
                            />
                          </Suspense>
                        </div>
                        <ListingPagePagination
                          currentPage={safeDebtsPage}
                          totalPages={debtsTotalPages}
                          onPageChange={goToDebtsPage}
                        />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <AuctionCategoryCtaCards variant="debtsPage" />
      {showChatDock ? (
        <Suspense fallback={null}>
          <SiteChatDockLazy wrapperClassName="shares-floats" recommendationProperties={apiDebts}>
            {dbUserId && canShowBuyerDeposit() ? (
              depositLoading ? (
                <DepositButtonSkeleton />
              ) : (
                <DepositButton amount={userDeposit} />
              )
            ) : null}
          </SiteChatDockLazy>
        </Suspense>
      ) : null}

      {!isDebtsDesktop ? (
        <SharesMobileFiltersDrawer
          isOpen={filtersDrawerOpen}
          onClose={() => setFiltersDrawerOpen(false)}
          title={t('filters')}
          applyLabel={t('auctionApplyFilters')}
          onApply={scrollToDebtsGrid}
          resetLabel={t('catalogResetFilters')}
          onReset={resetDebtsFilters}
        >
          <DebtsDesktopFilters {...debtsDesktopFilterProps} variant="drawer" />
        </SharesMobileFiltersDrawer>
      ) : null}
    </div>
  )
}

export default Debts
