import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MdBed, MdOutlineBathtub, MdDirectionsCar } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import { properties } from '../data/properties'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import { hasBuyNowOption, hasAuctionBuyNowListingForm } from '../utils/hasBuyNowOption'
import PropertyTimer from './PropertyTimer'
import CircularTimer from './CircularTimer'
import { PropertyListingSkeletonGrid } from './PropertyListingSkeletonGrid'
import { AuctionMobileListingSkeleton, readAuctionMobileViewMode } from './AuctionMobileListingSkeleton'
import AuctionDesktopFilters from './AuctionDesktopFilters'
import AuctionListingSaleToggle from './AuctionListingSaleToggle'
import './AuctionListingSaleToggle.css'
import PageBreadcrumbs from './PageBreadcrumbs'
import AuctionPropertyCard from './AuctionPropertyCard'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import ImageWithSkeleton from './ImageWithSkeleton'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { formatPropertyPrice } from '../utils/currency'
import { showNotification } from '../utils/toastHelper'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import {
  getEffectiveAuctionEndTime,
  hasTestTimerDateString,
  isBuyNowPurchaseCompleted,
  isEffectiveAuctionTimerExpired,
  isAuctionListingEnded,
  shouldShowCircularAuctionTimer,
} from '../utils/auctionReminderBounds'
import { getPropertyCardImage } from '../utils/propertyImage'
import { resolveAuctionCurrentBidValue } from '../services/auctionListCache'
import { getPropertyDetailPath, auctionListingDedupeKey, PROPERTY_DETAIL_AUCTION_TAB_BIDS, buildPropertyDetailNavigation } from '../utils/propertyDetailUrl'
import { isPrivateClubAuctionLot } from '../utils/isPrivateClubAuctionLot'
import {
  matchesAuctionPropertyTypesFilter,
  matchesAuctionSaleTypesFilter,
} from '../utils/auctionDesktopFilterMatch'
import {
  isAuctionRoute,
  parseAuctionFilterPath,
} from '../utils/auctionFilterUrl'
import { readHeroSearchPrefilter } from '../utils/heroSearchFilters'
import { getAuctionContextPropertyPath } from '../utils/listingContextUrl'
import { buildCatalogCityPath } from '../utils/catalogGeoUrl'
import {
  buildLocationOptionsFromProperties,
  propertyMatchesLocationFilter,
} from '../utils/propertySearchLocation'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import './PropertyList.css'

const PropertySearchModalLazy = lazy(() => import('./PropertySearchModal'))
const AuctionMobileLayoutLazy = lazy(() => import('./ui/AuctionMobileLayout'))

const MOBILE_BREAKPOINT = 768
const AUCTION_DESKTOP_PAGE_SIZE = 20

const PROPERTY_FILTER_ITEMS = [
  { kind: 'type', value: 'все', labelKey: 'propertyTypeAll' },
  { kind: 'type', value: 'квартира', labelKey: 'propertyTypeFlat' },
  { kind: 'type', value: 'апартаменты', labelKey: 'propertyTypeApartment' },
  { kind: 'type', value: 'вилла', labelKey: 'propertyTypeVilla' },
  { kind: 'type', value: 'дом', labelKey: 'propertyTypeHouse' },
  { kind: 'sale', value: 'ended', labelKey: 'auctionFilterEnded' },
]

const PropertyList = ({
  auctionProperties = null,
  onOpenAIChat,
  loading = false,
  floatWidgetsHiddenByFooter = false,
  viewerHasVip = false,
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [propertyTypes, setPropertyTypes] = useState([])
  const [saleFilters, setSaleFilters] = useState([])
  const [tooltip, setTooltip] = useState({ show: false, text: '', x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT)
  const [mobileAuctionTypesOpen, setMobileAuctionTypesOpen] = useState(false)
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(true)
  const [desktopFiltersTransitioning, setDesktopFiltersTransitioning] = useState(false)
  const desktopFiltersTransitionTimerRef = useRef(null)
  const [minAreaFilter, setMinAreaFilter] = useState('')
  const [maxAreaFilter, setMaxAreaFilter] = useState('')
  const [minPriceFilter, setMinPriceFilter] = useState('')
  const [maxPriceFilter, setMaxPriceFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const searchFiltersBarRef = useRef(null)

  const toggleDesktopFilters = () => {
    setDesktopFiltersTransitioning(true)
    setDesktopFiltersOpen((open) => !open)
    if (desktopFiltersTransitionTimerRef.current) {
      clearTimeout(desktopFiltersTransitionTimerRef.current)
    }
    desktopFiltersTransitionTimerRef.current = setTimeout(() => {
      setDesktopFiltersTransitioning(false)
    }, 320)
  }

  useEffect(() => {
    return () => {
      if (desktopFiltersTransitionTimerRef.current) {
        clearTimeout(desktopFiltersTransitionTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isMobile || !isAuctionRoute(location.pathname) || !mobileAuctionTypesOpen) return
    const handlePointerDown = (e) => {
      if (searchFiltersBarRef.current && !searchFiltersBarRef.current.contains(e.target)) {
        setMobileAuctionTypesOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [isMobile, location.pathname, mobileAuctionTypesOpen])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  
  const normalizeCategoryFromUrl = (rawCategory) => {
    const normalized = String(rawCategory || '')
      .trim()
      .toLowerCase()

    if (!normalized) return null
    if (['apartment', 'apartments', 'апартамент', 'апартаменты'].includes(normalized)) return 'апартаменты'
    if (['flat', 'flats', 'квартира', 'квартиры'].includes(normalized)) return 'квартира'
    if (['villa', 'villas', 'вилла', 'виллы'].includes(normalized)) return 'вилла'
    if (['house', 'houses', 'townhouse', 'townhouses', 'дом', 'дома'].includes(normalized)) return 'дом'
    if (['all', 'все'].includes(normalized)) return 'все'

    return null
  }
  
  // Читаем фильтры из SEO-пути (/auction/buy-now/apartments) или legacy ?filter=
  useEffect(() => {
    const parsed = parseAuctionFilterPath(location.pathname, location.search)

    if (parsed.legacyRedirect && parsed.legacyRedirect !== `${location.pathname}${location.search}`) {
      navigate(parsed.legacyRedirect, { replace: true })
      return
    }

    if (parsed.propertyTypes.length) {
      setPropertyTypes(parsed.propertyTypes)
    } else {
      setPropertyTypes([])
    }

    if (parsed.saleFilters.length) {
      setSaleFilters(parsed.saleFilters)
    } else {
      setSaleFilters([])
    }

    const shouldScroll =
      parsed.propertyTypes.length > 0 ||
      parsed.saleFilters.includes('buy_now') ||
      parsed.saleFilters.includes('ended')

    if (shouldScroll) {
      setTimeout(() => {
        const element = document.getElementById('properties-grid')
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 300)
    }
  }, [location.pathname, location.search, navigate])

  useEffect(() => {
    const prefilter = readHeroSearchPrefilter(location.state)
    if (!prefilter || !isAuctionRoute(location.pathname)) return

    if (prefilter.country) {
      setCountryFilter(String(prefilter.country))
    }
    if (prefilter.minPrice !== undefined && prefilter.minPrice !== '') {
      setMinPriceFilter(String(prefilter.minPrice))
    }
    if (prefilter.maxPrice !== undefined && prefilter.maxPrice !== '') {
      setMaxPriceFilter(String(prefilter.maxPrice))
    }

    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    })
  }, [location.pathname, location.search, location.state, navigate])

  const [visibleCount, setVisibleCount] = useState(9)
  const [auctionPage, setAuctionPage] = useState(1)

  const isPropertyLiked = (property) =>
    isFavorite(property, hasDbBackedProperty(property) ? undefined : 'property')

  const formatPrice = (price, currency = 'USD') =>
    formatPropertyPrice(price, currency, { compact: true })

  const isAuctionEnded = (property) => isAuctionListingEnded(property)

  // Используем переданные аукционные объявления или статические данные
  const propertiesToUse = auctionProperties || properties
  const auctionLocationOptions = useMemo(() => {
    const onlyAuction = propertiesToUse.filter((property) => {
      const isDebtProperty =
        property.sale_type === 'debt' ||
        property.is_debt === 1 ||
        property.is_debt === true ||
        property.has_debt === 1 ||
        property.has_debt === true
      const isShareProperty =
        property.sale_type === 'share' ||
        property.is_shared_ownership === 1 ||
        property.is_shared_ownership === true
      return !isDebtProperty && !isShareProperty
    })
    return buildLocationOptionsFromProperties(onlyAuction)
  }, [propertiesToUse])

  /** На /auction раз в секунду пересчитываем «таймер истёк» и сортировку (завершённые в конец) */
  const [auctionNowTick, setAuctionNowTick] = useState(0)
  useEffect(() => {
    if (!isAuctionRoute(location.pathname)) return undefined
    const id = window.setInterval(() => setAuctionNowTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [location.pathname])

  const filteredProperties = useMemo(() => {
    const list = propertiesToUse.filter((property) => {
    const hasBuyNowPrice = hasBuyNowOption(property)
    const isDebtProperty =
      property.sale_type === 'debt' ||
      property.is_debt === 1 ||
      property.is_debt === true ||
      property.has_debt === 1 ||
      property.has_debt === true
    const isShareProperty =
      property.sale_type === 'share' ||
      property.is_shared_ownership === 1 ||
      property.is_shared_ownership === true

    // На странице аукциона исключаем объекты с долгами
    if (isAuctionRoute(location.pathname) && isDebtProperty) {
      return false
    }
    // На странице аукциона исключаем объекты с долями (долевая продажа)
    if (isAuctionRoute(location.pathname) && isShareProperty) {
      return false
    }

    // Фильтрация по типу недвижимости
    if (!matchesAuctionPropertyTypesFilter(property, propertyTypes)) {
      return false
    }

    // Фильтрация по типу продажи
    if (!matchesAuctionSaleTypesFilter(property, saleFilters, isAuctionEnded)) {
      return false
    }
    if (
      !propertyMatchesLocationFilter(property, {
        country: countryFilter,
        region: cityFilter,
      })
    ) {
      return false
    }

    const propertyArea = Number(property.area ?? property.sqft ?? property.living_area)
    if (minAreaFilter !== '' && Number.isFinite(propertyArea)) {
      if (propertyArea < Number(minAreaFilter)) return false
    }
    if (maxAreaFilter !== '' && Number.isFinite(propertyArea)) {
      if (propertyArea > Number(maxAreaFilter)) return false
    }

    const propertyPrice = Number(property.price)
    if (minPriceFilter !== '' && Number.isFinite(propertyPrice)) {
      if (propertyPrice < Number(minPriceFilter)) return false
    }
    if (maxPriceFilter !== '' && Number.isFinite(propertyPrice)) {
      if (propertyPrice > Number(maxPriceFilter)) return false
    }
    
    // Фильтрация по поисковому запросу
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        (property.title || property.name || '').toLowerCase().includes(query) ||
        (property.location || '').toLowerCase().includes(query)
      )
    }
    
    return true
  })

    if (!isAuctionRoute(location.pathname)) return list

    const auctionTimerEnded = (p) => isAuctionListingEnded(p)

    return [...list].sort((a, b) => {
      const rankPc = (p) =>
        p?.private_club_only === 1 || p?.private_club_only === true || p?.private_club_only === '1' ? 1 : 0
      const pc = rankPc(b) - rankPc(a)
      if (pc !== 0) return pc
      const ea = auctionTimerEnded(a)
      const eb = auctionTimerEnded(b)
      if (ea === eb) return 0
      return ea ? 1 : -1
    })
  }, [
    propertiesToUse,
    location.pathname,
    propertyTypes,
    saleFilters,
    searchQuery,
    minAreaFilter,
    maxAreaFilter,
    minPriceFilter,
    maxPriceFilter,
    countryFilter,
    cityFilter,
    auctionNowTick,
  ])

  useEffect(() => {
    setVisibleCount(9)
    setAuctionPage(1)
  }, [
    searchQuery,
    propertyTypes,
    saleFilters,
    minAreaFilter,
    maxAreaFilter,
    minPriceFilter,
    maxPriceFilter,
    countryFilter,
    cityFilter,
  ])

  const isAuctionPage = isAuctionRoute(location.pathname)
  const isAuctionMobileFilters = isMobile && isAuctionPage
  const isAuctionDesktop = isAuctionPage && !isMobile
  const auctionSaleToggleMode = saleFilters.includes('buy_now') ? 'buy_now' : 'all'

  const handleAuctionSaleToggleChange = (mode) => {
    if (mode === 'buy_now') {
      setSaleFilters(['buy_now'])
      return
    }
    setSaleFilters((prev) => prev.filter((value) => value !== 'buy_now'))
  }

  useEffect(() => {
    const root = document.querySelector('.home-page--auction')
    if (!root) return undefined
    if (!isAuctionDesktop || !desktopFiltersOpen) {
      root.classList.remove('home-page--auction-filters-open')
      return undefined
    }
    root.classList.add('home-page--auction-filters-open')
    return () => root.classList.remove('home-page--auction-filters-open')
  }, [isAuctionDesktop, desktopFiltersOpen])

  const auctionTotalPages = Math.max(
    1,
    Math.ceil(filteredProperties.length / AUCTION_DESKTOP_PAGE_SIZE)
  )
  const safeAuctionPage = Math.min(auctionPage, auctionTotalPages)

  useEffect(() => {
    if (isAuctionDesktop && auctionPage > auctionTotalPages) {
      setAuctionPage(auctionTotalPages)
    }
  }, [isAuctionDesktop, auctionPage, auctionTotalPages])

  const displayedProperties = useMemo(() => {
    if (isMobile && isAuctionPage) {
      return filteredProperties.slice(0, visibleCount)
    }
    if (isAuctionDesktop) {
      const start = (safeAuctionPage - 1) * AUCTION_DESKTOP_PAGE_SIZE
      return filteredProperties.slice(start, start + AUCTION_DESKTOP_PAGE_SIZE)
    }
    return filteredProperties.slice(0, visibleCount)
  }, [
    filteredProperties,
    isMobile,
    isAuctionPage,
    isAuctionDesktop,
    visibleCount,
    safeAuctionPage,
  ])

  const goToAuctionPage = (page) => {
    const next = Math.max(1, Math.min(page, auctionTotalPages))
    setAuctionPage(next)
    requestAnimationFrame(() => {
      document.getElementById('properties-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const auctionFilterBounds = useMemo(() => {
    const areas = propertiesToUse
      .map((p) => Number(p.area ?? p.sqft ?? p.living_area))
      .filter((v) => Number.isFinite(v) && v > 0)
    const prices = propertiesToUse
      .map((p) => Number(p.price))
      .filter((v) => Number.isFinite(v) && v > 0)
    return {
      areaMin: areas.length ? Math.floor(Math.min(...areas)) : 0,
      areaMax: areas.length ? Math.ceil(Math.max(...areas)) : 500,
      priceMin: prices.length ? Math.floor(Math.min(...prices)) : 0,
      priceMax: prices.length ? Math.ceil(Math.max(...prices)) : 1_000_000,
    }
  }, [propertiesToUse])

  const handleFavoriteToggle = (property, e) => {
    e.preventDefault()
    e.stopPropagation()
    const mockCat = hasDbBackedProperty(property) ? null : 'property'
    return toggleFavorite(property, mockCat || 'property')
  }

  const openProperty = (property, { auctionTab } = {}) => {
    if (!ensureCanOpenProperty()) {
      showNotification(
        <span>
          {t('toastOpenListingLoginPrefix')}{' '}
          <button
            type="button"
            className="auth-toast-link"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              requestOpenLoginModal({ wizard: true })
            }}
          >
            {t('toastOpenListingLoginLink')}{' '}
            <span className="auth-toast-link__arrow">→</span>
          </button>
        </span>,
        'warning',
        7000
      )
      return
    }
    const { state } = buildPropertyDetailNavigation(property, {
      auctionTab: auctionTab || undefined,
    })
    const targetPath = getAuctionContextPropertyPath(property, {
      country: countryFilter,
      city: cityFilter,
    })
    navigate(targetPath, { state })
  }

  return (
    <>
      {tooltip.show && (
        <div 
          className="property-tooltip"
          style={{
            position: 'fixed',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, calc(-100% - 8px))',
            zIndex: 1000000
          }}
        >
          <div
            className="property-tooltip-content"
            style={{
              background: '#111827',
              color: '#ffffff',
              padding: '8px 12px',
              borderRadius: '14px',
              fontSize: '13px',
              fontWeight: 400,
              whiteSpace: 'normal',
              maxWidth: '260px',
              minWidth: '180px',
              textAlign: 'center',
              lineHeight: 1.5,
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
              wordWrap: 'break-word'
            }}
          >
            {tooltip.text}
          </div>
          <div
            className="property-tooltip-arrow"
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #111827',
              marginLeft: '50%'
            }}
          ></div>
        </div>
      )}
      <section
        className={`property-list${floatWidgetsHiddenByFooter ? ' property-list--footer-near' : ''}${
          isAuctionMobileFilters ? ' property-list--auction-mobile-page' : ''
        }${isAuctionDesktop ? ' property-list--auction-desktop' : ''}`}
      >
        <div
          className={`property-list-container${
            isAuctionDesktop ? ' property-list-container--auction-desktop' : ''
          }`}
        >
        {isMobile && isAuctionPage && onOpenAIChat && (
          <div className="property-list-header">
            <button
              type="button"
              className="ai-button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onOpenAIChat()
              }}
              aria-label="AI Assistant"
            >
              AI
            </button>
          </div>
        )}

        <div
          className={
            isAuctionDesktop
              ? `shares-listing-shell${
                  desktopFiltersOpen ? ' shares-listing-shell--with-filters' : ' shares-listing-shell--filters-hidden'
                }`
              : undefined
          }
        >
        {isAuctionDesktop ? (
          <div className="page-context-heading page-context-heading--listing-auction">
            <div className="page-context-heading--listing-auction-inner">
              <PageBreadcrumbs className="page-breadcrumbs--flat-club" separator=">" />
            </div>
          </div>
        ) : null}

        <div
          className={`${
            isAuctionDesktop
              ? `shares-listing-layout auction-desktop-layout${
                  desktopFiltersOpen ? '' : ' auction-desktop-layout--filters-hidden'
                }`
              : ''
          }`.trim()}
        >
          {isAuctionDesktop && desktopFiltersOpen ? (
            <AuctionDesktopFilters
              propertyTypes={propertyTypes}
              setPropertyTypes={setPropertyTypes}
              saleFilters={saleFilters}
              setSaleFilters={setSaleFilters}
              locationOptions={auctionLocationOptions}
              country={countryFilter}
              city={cityFilter}
              setCountry={setCountryFilter}
              setCity={setCityFilter}
              minArea={minAreaFilter}
              maxArea={maxAreaFilter}
              setMinArea={setMinAreaFilter}
              setMaxArea={setMaxAreaFilter}
              minPrice={minPriceFilter}
              maxPrice={maxPriceFilter}
              setMinPrice={setMinPriceFilter}
              setMaxPrice={setMaxPriceFilter}
              areaBounds={{
                min: auctionFilterBounds.areaMin,
                max: auctionFilterBounds.areaMax,
              }}
              priceBounds={{
                min: auctionFilterBounds.priceMin,
                max: auctionFilterBounds.priceMax,
              }}
              onApply={() => {
                if (countryFilter && cityFilter) {
                  const typeToCatalogPlural = {
                    апартаменты: 'apartments',
                    квартира: 'apartments',
                    вилла: 'villas',
                    дом: 'houses',
                    коммерческая: 'commercial',
                  }
                  const singleType = propertyTypes.length === 1 ? propertyTypes[0] : ''
                  const path = buildCatalogCityPath({
                    country: countryFilter,
                    city: cityFilter,
                    typePlural: typeToCatalogPlural[singleType] || undefined,
                    sale: 'auction',
                  })
                  if (path) {
                    navigate(path)
                    return
                  }
                }
                const grid = document.getElementById('properties-grid')
                grid?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            />
          ) : null}

          <div
            className={`${
              isAuctionDesktop ? 'auction-desktop-layout__main' : ''
            }${
              isAuctionDesktop && !desktopFiltersOpen
                ? ' auction-desktop-layout__main--filters-hidden'
                : ''
            }`.trim() || undefined}
          >
        <div className={isAuctionPage ? 'auction-listing-search-stack' : undefined}>
        <div
          ref={searchFiltersBarRef}
          className={`search-filters-bar${
            isAuctionDesktop ? ' search-filters-bar--auction-desktop' : ''
          }${
            isAuctionMobileFilters ? ' search-filters-bar--auction-mobile' : ''
          }${
            isAuctionMobileFilters
              ? mobileAuctionTypesOpen
                ? ' search-filters-bar--types-expanded'
                : ' search-filters-bar--types-collapsed'
              : ''
          }`}
        >
          {isAuctionDesktop ? (
            <button
              type="button"
              className="auction-desktop-filters-toggle"
              onClick={toggleDesktopFilters}
              aria-label={
                desktopFiltersOpen ? t('auctionToggleFiltersHide') : t('auctionToggleFiltersShow')
              }
              aria-expanded={desktopFiltersOpen}
            >
              {desktopFiltersOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </button>
          ) : null}
          <div className="search-box">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder={t('searchPlaceholderLong')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="search-clear"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>
          {!isAuctionDesktop ? (
          <div className="filters-and-types-grid">
            <button
              type="button"
              className="filters-button"
              aria-expanded={isAuctionMobileFilters ? mobileAuctionTypesOpen : undefined}
              onClick={() => {
                if (isAuctionMobileFilters) {
                  setMobileAuctionTypesOpen((o) => !o)
                } else {
                  setIsSearchModalOpen(true)
                }
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              {t('filters')}
            </button>
            <div
              className={`property-types${
                isAuctionMobileFilters ? ' property-types--auction-mobile' : ''
              }`}
            >
              {PROPERTY_FILTER_ITEMS.map((item) => (
                <button
                  key={`${item.kind}-${item.value}`}
                  type="button"
                  className={`type-button ${
                    item.kind === 'type'
                      ? item.value === 'все'
                        ? propertyTypes.length === 0
                          ? 'active'
                          : ''
                        : propertyTypes.includes(item.value)
                          ? 'active'
                          : ''
                      : saleFilters.includes(item.value)
                        ? 'active'
                        : ''
                  }`}
                  onClick={() => {
                    if (item.kind === 'type') {
                      if (item.value === 'все') {
                        setPropertyTypes([])
                        return
                      }
                      setPropertyTypes((prev) =>
                        prev.includes(item.value)
                          ? prev.filter((v) => v !== item.value)
                          : [...prev, item.value],
                      )
                    } else {
                      setSaleFilters((prev) =>
                        prev.includes(item.value)
                          ? prev.filter((v) => v !== item.value)
                          : [...prev, item.value],
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
        {isAuctionPage ? (
          <AuctionListingSaleToggle
            value={auctionSaleToggleMode}
            onChange={handleAuctionSaleToggleChange}
          />
        ) : null}
        </div>

        {isAuctionDesktop && desktopFiltersTransitioning ? (
          <div
            className="auction-desktop-layout-loader"
            aria-busy="true"
            aria-live="polite"
            aria-label={t('loading')}
          >
            <div className="auction-desktop-layout-loader__spinner" aria-hidden="true" />
          </div>
        ) : loading ? (
          isMobile && isAuctionPage ? (
            <div
              id="properties-grid"
              className="properties-grid properties-grid--mobile-auction"
              aria-busy="true"
            >
              <AuctionMobileListingSkeleton viewMode={readAuctionMobileViewMode()} />
            </div>
          ) : (
            <div
              id="properties-grid"
              className={`properties-grid${isMobile && isAuctionPage ? ' properties-grid--mobile-auction' : ''}`}
              aria-busy="true"
            >
              <PropertyListingSkeletonGrid count={isMobile ? 6 : 9} />
            </div>
          )
        ) : filteredProperties.length === 0 ? (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3 className="no-results-title">{t('nothingFound')}</h3>
            <p className="no-results-text">{t('noResultsHint')}</p>
          </div>
        ) : (
          <>
            {isMobile && isAuctionPage ? (
              <div id="properties-grid" className="properties-grid properties-grid--mobile-auction">
                <Suspense fallback={<AuctionMobileListingSkeleton />}>
                  <AuctionMobileLayoutLazy
                  properties={displayedProperties}
                  formatPrice={formatPrice}
                  isFavorite={isPropertyLiked}
                  onFavoriteToggle={handleFavoriteToggle}
                  onOpen={openProperty}
                  onTooltip={setTooltip}
                  viewerHasVip={viewerHasVip}
                  />
                </Suspense>
              </div>
            ) : (
            <div
              id="properties-grid"
              className={`properties-grid${isAuctionPage ? ' properties-grid--auction-cards' : ''}`}
            >
              {displayedProperties.map((property) => {
                if (isAuctionPage) {
                  return (
                    <AuctionPropertyCard
                      key={auctionListingDedupeKey(property)}
                      property={property}
                      isFavorite={isPropertyLiked(property)}
                      onFavoriteToggle={handleFavoriteToggle}
                      onOpen={openProperty}
                      onTooltip={setTooltip}
                      viewerHasVip={viewerHasVip}
                      formatPrice={formatPrice}
                    />
                  )
                }

                const propertyTitle = property.title || property.name || ''
                const propertyImage = getPropertyCardImage(
                  property,
                  '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'
                )
                const propertyImageProps = buildResponsiveImageProps(propertyImage, {
                  widths: [320, 480, 640, 800],
                  sizes: '(max-width: 500px) 50vw, (max-width: 768px) 50vw, (max-width: 1200px) 50vw, 33vw',
                  quality: 72,
                  fit: 'crop',
                })
                const buyNowPurchaseCompleted = isBuyNowPurchaseCompleted(property)
                const effectiveAuctionEnd = getEffectiveAuctionEndTime(property)
                const hasTestTimerRaw =
                  !buyNowPurchaseCompleted && hasTestTimerDateString(property)
                const showCircularOnCard = shouldShowCircularAuctionTimer(property)
                const hasTimer =
                  (property.isAuction === true &&
                    (buyNowPurchaseCompleted ||
                      (effectiveAuctionEnd != null &&
                        String(effectiveAuctionEnd).trim() !== ''))) ||
                  hasTestTimerRaw
                const isDebtProperty =
                  property.sale_type === 'debt' ||
                  property.is_debt === 1 ||
                  property.is_debt === true ||
                  property.has_debt === 1 ||
                  property.has_debt === true
                const hasTestDrive =
                  !isDebtProperty &&
                  hasAuctionBuyNowListingForm(property) &&
                  (property.test_drive === 1 || property.testDrive === true || property.test_drive === true)
                const reservedUntilDate = property.reserved_until ? new Date(property.reserved_until) : null
                const isReserved =
                  (property.is_reserved === true || property.is_reserved === 1) &&
                  (!reservedUntilDate || reservedUntilDate > new Date())
                const hasBuyNowPrice = hasBuyNowOption(property)
                const testTimerDurationMs =
                  property.test_timer_duration != null && property.test_timer_duration !== ''
                    ? Number(property.test_timer_duration)
                    : null
                const normalizedTestTimerDuration =
                  testTimerDurationMs != null && Number.isFinite(testTimerDurationMs) && testTimerDurationMs > 0
                    ? testTimerDurationMs
                    : null
                
                const isTimerExpired = isEffectiveAuctionTimerExpired(property)
                const isAuctionEndedCard = isTimerExpired && hasTimer
                const buyNowWinnerId = property.buy_now_winner_user_id
                const showPrivateClubAuctionHero =
                  isAuctionRoute(location.pathname) &&
                  viewerHasVip &&
                  isPrivateClubAuctionLot(property) &&
                  !isAuctionListingEnded(property)

                /** Оверлей на фото — только мобильная сетка карточек (не табы AuctionMobileLayout) */
                const showPrivateClubHeroOnImage =
                  isMobile && showPrivateClubAuctionHero && !isReserved

                /** Десктоп: тот же переливающийся блок в теле карточки */
                const showPrivateClubHeroDesktop =
                  !isMobile && showPrivateClubAuctionHero && !isReserved

                // Зеленый линейный таймер (PropertyTimer) — преаукцион, пока не началась фаза кругового таймера
                const greenTimerBlock =
                  hasTimer && !isReserved && !showCircularOnCard && effectiveAuctionEnd && (
                  <div className="property-timer-wrapper">
                    <PropertyTimer
                      endTime={effectiveAuctionEnd}
                      compact={true}
                      auctionEndedLabel={t('propertyDetailAuctionCompleted')}
                    />
                  </div>
                );

                const circularSize = isMobile ? 56 : 120
                // Красный круглый таймер (CircularTimer)
                const redTimerBlock = hasTimer && !isReserved && showCircularOnCard && (
                  <div className="property-timer-wrapper">
                    <CircularTimer 
                      endTime={property.test_timer_end_date} 
                      size={circularSize} 
                      strokeWidth={isMobile ? 4 : 6}
                      originalDuration={normalizedTestTimerDuration}
                      progressKey={`property-list:${property.id}`}
                      auctionEndedLabel={t(
                        circularSize <= 72
                          ? 'auctionCircularEndedShort'
                          : 'propertyDetailAuctionCompleted'
                      )}
                    />
                  </div>
                );

                /** Тот же вид «аукцион завершён», что после истечения таймера, если сделку закрыли в админке при ещё «живых» датах в БД */
                const buyNowCompletedEndedSeal =
                  hasTimer &&
                  !isReserved &&
                  buyNowPurchaseCompleted &&
                  !showCircularOnCard &&
                  !effectiveAuctionEnd && (
                    <div className="property-timer-wrapper">
                      <CircularTimer
                        endTime={property.buy_now_completed_at}
                        size={circularSize}
                        strokeWidth={isMobile ? 4 : 6}
                        auctionEndedLabel={t(
                          circularSize <= 72
                            ? 'auctionCircularEndedShort'
                            : 'propertyDetailAuctionCompleted'
                        )}
                      />
                    </div>
                  )

                return (
            <div 
              key={auctionListingDedupeKey(property)} 
              className={`property-card${isAuctionEndedCard ? ' property-card--auction-ended' : ''}`}
              onClick={(e) => {
                // Проверяем, что клик не по кнопке или ссылке
                if (e.target.closest('button') || e.target.closest('a')) {
                  return
                }
                console.log('Navigating to property:', property.id)
                openProperty(property)
              }}
              style={{ cursor: 'pointer' }}
            >
              {isAuctionEndedCard ? (
                <div className="property-auction-ended-overlay property-auction-ended-overlay--full-card">
                  <span className="property-auction-ended-overlay__title">{t('auctionSoldOutLabel')}</span>
                  <button
                    type="button"
                    className="property-auction-ended-overlay__result-link"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      openProperty(property, { auctionTab: PROPERTY_DETAIL_AUCTION_TAB_BIDS })
                    }}
                  >
                    <span>{t('auctionResultSummary')}</span>
                    <span aria-hidden>→</span>
                  </button>
                </div>
              ) : null}
              <div className="property-link">
                <div className="property-image-container">
                  <ImageWithSkeleton
                    imgProps={propertyImageProps}
                    alt={propertyTitle}
                    className="property-image"
                    containerClassName="property-image"
                  />
                  {isReserved && (
                    <div className="property-reserved-overlay">
                      <div className="reserved-overlay-icon">🔒</div>
                      <div className="reserved-overlay-text">Забронировано</div>
                    </div>
                  )}
                  {(hasBuyNowPrice || hasTestDrive) &&
                    !isAuctionListingEnded(property) &&
                    !showPrivateClubAuctionHero && (
                    <div className="property-badges-center">
                      {hasBuyNowPrice && (
                        <div 
                          className="property-buy-badge"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setTooltip({
                              show: true,
                              text: t('buyNowTooltip'),
                              x: rect.left + rect.width / 2,
                              y: rect.top - 10
                            })
                          }}
                          onMouseLeave={() => setTooltip({ show: false, text: '', x: 0, y: 0 })}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            openProperty(property)
                          }}
                        >
                          <span>{t('buyNowSectionTitle')}</span>
                        </div>
                      )}
                      {hasTestDrive && (
                        <div 
                          className="property-testdrive-badge"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setTooltip({
                              show: true,
                              text: t('testDriveTooltip'),
                              x: rect.left + rect.width / 2,
                              y: rect.top - 10
                            })
                          }}
                          onMouseLeave={() => setTooltip({ show: false, text: '', x: 0, y: 0 })}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            openProperty(property)
                          }}
                        >
                          <span>{t('testDrive')}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {showPrivateClubHeroOnImage ? (
                    <div
                      className="property-club-mobile-hero"
                      role="group"
                      aria-label={t('auctionPrivateClubLotTooltip')}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="property-club-mobile-hero__shine" aria-hidden="true" />
                      <div className="property-club-mobile-hero__inner">
                        <div className="property-club-mobile-hero__titles">
                          <span className="property-club-mobile-hero__vip">{t('auctionPrivateClubVipBadge')}</span>
                          <span className="property-club-mobile-hero__label">{t('auctionPrivateClubMobileLabel')}</span>
                        </div>
                        <button
                          type="button"
                          className="property-club-mobile-hero__btn"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            openProperty(property)
                          }}
                        >
                          {t('auctionPrivateClubGoCta')}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {showPrivateClubAuctionHero && !isMobile && isReserved ? (
                    <span
                      className="property-vip-club-badge"
                      role="img"
                      aria-label={t('auctionPrivateClubLotTooltip')}
                      title={t('auctionPrivateClubLotTooltip')}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setTooltip({
                          show: true,
                          text: t('auctionPrivateClubLotTooltip'),
                          x: rect.left + rect.width / 2,
                          y: rect.top - 10,
                        })
                      }}
                      onMouseLeave={() => setTooltip({ show: false, text: '', x: 0, y: 0 })}
                      onTouchStart={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setTooltip({
                          show: true,
                          text: t('auctionPrivateClubLotTooltip'),
                          x: rect.left + rect.width / 2,
                          y: rect.top - 10,
                        })
                      }}
                      onTouchEnd={() => {
                        window.setTimeout(() => {
                          setTooltip({ show: false, text: '', x: 0, y: 0 })
                        }, 2200)
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('auctionPrivateClubVipBadge')}
                    </span>
                  ) : null}
                  <div className="property-media-actions">
                    <button 
                      className={`property-favorite ${isPropertyLiked(property) ? 'active' : ''}`}
                      onClick={(e) => handleFavoriteToggle(property, e)}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path 
                          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          fill={isPropertyLiked(property) ? "currentColor" : "none"}
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="property-content">
                  {isMobile ? (
                    <>
                      {greenTimerBlock}
                      {buyNowCompletedEndedSeal}
                      <h3 className="property-title">{propertyTitle}</h3>
                      {redTimerBlock}
                    </>
                  ) : showPrivateClubHeroDesktop ? (
                    <>
                      {greenTimerBlock}
                      {redTimerBlock}
                      {buyNowCompletedEndedSeal}
                      <h3 className="property-title">{propertyTitle}</h3>
                      <div
                        className="property-club-mobile-hero property-club-desktop-hero"
                        role="group"
                        aria-label={t('auctionPrivateClubLotTooltip')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="property-club-mobile-hero__shine" aria-hidden="true" />
                        <div className="property-club-mobile-hero__inner">
                          <div className="property-club-mobile-hero__titles">
                            <span className="property-club-mobile-hero__vip">{t('auctionPrivateClubVipBadge')}</span>
                            <span className="property-club-mobile-hero__label">{t('auctionPrivateClubMobileLabel')}</span>
                          </div>
                          <button
                            type="button"
                            className="property-club-mobile-hero__btn"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              openProperty(property)
                            }}
                          >
                            {t('auctionPrivateClubGoCta')}
                          </button>
                        </div>
                      </div>
                      {hasTimer ? (
                        <div className="property-bid-info property-bid-info--after-club-desktop">
                          <span className="bid-label">{t('currentBid')}</span>
                          <span className="bid-value">{formatPrice(resolveAuctionCurrentBidValue(property), property.currency)}</span>
                        </div>
                      ) : (
                        <div className="property-price property-price--after-club-desktop">
                          {formatPrice(property.price || 0, property.currency)}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {greenTimerBlock}
                      {redTimerBlock}
                      {buyNowCompletedEndedSeal}
                      <h3 className="property-title">{propertyTitle}</h3>
                    </>
                  )}
                  {property.description ? (
                    <p className="property-description">{property.description}</p>
                  ) : null}
                  <p className="property-location">{property.location || ''}</p>
                  {buyNowWinnerId != null && !isAuctionListingEnded(property) && (
                    <p className="property-card-buy-now-winner" role="status">
                      {t('propertyCardBuyNowWinner', { id: buyNowWinnerId })}
                    </p>
                  )}

                  {/* Обертка для данных, закрепленных снизу; margin-top:auto только если есть кнопки — иначе пустой блок растягивает карточку */}
                  <div
                    className={`property-content-bottom${!showPrivateClubHeroDesktop ? ' property-content-bottom--with-actions' : ''}`}
                  >
                    {showPrivateClubHeroDesktop ? (
                      <>
                        {hasTimer && (
                          <div className="property-card-owner__info">
                            <div className="property-card-owner__info-row">
                              {(property.area || property.sqft) && (
                                <div className="property-card-owner__info-item">
                                  <BiArea size={16} />
                                  <span>
                                    {property.area || property.sqft} {t('squareMeters')}
                                  </span>
                                </div>
                              )}
                              {(property.rooms || property.beds || property.bedrooms) && (
                                <div className="property-card-owner__info-item">
                                  <MdBed size={16} />
                                  <span>{property.rooms || property.beds || property.bedrooms}</span>
                                </div>
                              )}
                              {property.bathrooms && (
                                <div className="property-card-owner__info-item">
                                  <MdOutlineBathtub size={16} />
                                  <span>{property.bathrooms}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {!hasTimer && (
                          <div className="property-specs">
                            {(property.rooms || property.beds) && (
                              <div className="spec-item">
                                <MdBed size={18} />
                                <span>{property.rooms || property.beds}</span>
                              </div>
                            )}
                            {(property.area || property.sqft) && (
                              <div className="spec-item">
                                <BiArea size={18} />
                                <span>
                                  {property.area || property.sqft} {t('squareMeters')}
                                </span>
                              </div>
                            )}
                            {property.floor && (
                              <span className="spec-item">
                                {property.floor} {t('floor')}
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {hasTimer && (
                          <div className="property-card-owner__info">
                            <div className="property-card-owner__info-row">
                              {(property.area || property.sqft) && (
                                <div className="property-card-owner__info-item">
                                  <BiArea size={16} />
                                  <span>{property.area || property.sqft} {t('squareMeters')}</span>
                                </div>
                              )}
                              {(property.rooms || property.beds || property.bedrooms) && (
                                <div className="property-card-owner__info-item">
                                  <MdBed size={16} />
                                  <span>{property.rooms || property.beds || property.bedrooms}</span>
                                </div>
                              )}
                              {property.bathrooms && (
                                <div className="property-card-owner__info-item">
                                  <MdOutlineBathtub size={16} />
                                  <span>{property.bathrooms}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                    
                        {hasTimer ? (
                          <div className="property-bid-info">
                            <span className="bid-label">{t('currentBid')}</span>
                            <span className="bid-value">{formatPrice(resolveAuctionCurrentBidValue(property), property.currency)}</span>
                          </div>
                        ) : (
                          <>
                            <div className="property-price">{formatPrice(property.price || 0, property.currency)}</div>
                            <div className="property-specs">
                            {(property.rooms || property.beds) && (
                              <div className="spec-item">
                                <MdBed size={18} />
                                <span>{property.rooms || property.beds}</span>
                              </div>
                            )}
                            {(property.area || property.sqft) && (
                              <div className="spec-item">
                                <BiArea size={18} />
                                <span>{property.area || property.sqft} {t('squareMeters')}</span>
                              </div>
                            )}
                            {property.floor && (
                              <span className="spec-item">{property.floor} {t('floor')}</span>
                            )}
                            </div>
                          </>
                        )}
                      </>
                    )}
                    {!showPrivateClubHeroDesktop && (
                    <div className="property-actions" onClick={(e) => e.stopPropagation()}>
                      {!isAuctionEndedCard ? (
                        <button 
                          className="btn btn-primary btn-liquid-glass"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            openProperty(property)
                          }}
                          disabled={isReserved}
                          style={{
                            opacity: isReserved ? 0.5 : 1,
                            cursor: isReserved ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {isReserved ? t('objectReserved') : t('placeBid')}
                        </button>
                      ) : null}
                      {hasBuyNowPrice && !isAuctionListingEnded(property) && (
                        <button 
                          className="btn btn-buy-now btn-liquid-glass-buy"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (isReserved) {
                              showNotification(t('objectReservedNotification'))
                              return
                            }
                            openProperty(property)
                          }}
                          disabled={isReserved}
                          style={{
                            opacity: isReserved ? 0.45 : 1,
                            cursor: isReserved ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {isReserved ? t('objectReserved') : t('buyNowSectionTitle')}
                        </button>
                      )}
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
                )
              })}
            </div>
            )}

            {isAuctionDesktop && filteredProperties.length > 0 ? (
              <nav className="auction-desktop-pagination" aria-label={t('auctionPaginationLabel')}>
                <button
                  type="button"
                  className="auction-desktop-pagination__arrow"
                  disabled={safeAuctionPage <= 1}
                  onClick={() => goToAuctionPage(safeAuctionPage - 1)}
                  aria-label={t('auctionPaginationPrev')}
                >
                  ←
                </button>
                <div className="auction-desktop-pagination__pages">
                  {Array.from({ length: auctionTotalPages }, (_, index) => index + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      className={`auction-desktop-pagination__page${
                        page === safeAuctionPage ? ' auction-desktop-pagination__page--active' : ''
                      }`}
                      onClick={() => goToAuctionPage(page)}
                      aria-current={page === safeAuctionPage ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="auction-desktop-pagination__arrow"
                  disabled={safeAuctionPage >= auctionTotalPages}
                  onClick={() => goToAuctionPage(safeAuctionPage + 1)}
                  aria-label={t('auctionPaginationNext')}
                >
                  →
                </button>
              </nav>
            ) : null}

            {!isAuctionDesktop && filteredProperties.length > visibleCount && (
              <div className="load-more-container">
                <button
                  className="load-more-button"
                  onClick={() => setVisibleCount(filteredProperties.length)}
                >
                  {t('showMore', { count: filteredProperties.length - visibleCount })}
                </button>
              </div>
            )}
          </>
        )}
          </div>
        </div>
        </div>
      </div>

      {!isAuctionDesktop && isSearchModalOpen ? (
        <Suspense fallback={null}>
          <PropertySearchModalLazy
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          />
        </Suspense>
      ) : null}
    </section>
    </>
  )
}

export default PropertyList

