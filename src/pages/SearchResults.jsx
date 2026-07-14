import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiSliders } from 'react-icons/fi'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import PropertyListingCard from '../components/PropertyListingCard'
import CatalogDesktopFilters from '../components/CatalogDesktopFilters'
import SharesMobileFiltersDrawer from '../components/SharesMobileFiltersDrawer'
import BuyerEmptyState from '../components/buyer-mobile/BuyerEmptyState'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { getApiBaseUrl } from '../utils/apiConfig'
import {
  EMPTY_CATALOG_FILTERS,
  filterPropertiesBySearchQuery,
  getCatalogFilterBounds,
  loadCatalogFiltersFromSession,
  mergeCatalogFilters,
  persistCatalogFilters,
  sanitizeCatalogFilters,
} from '../utils/catalogFilters'
import './SearchResults.css'
import '../components/PropertyList.css'
import '../components/PropertyListingGrid.css'
import { getPropertyDetailPath, auctionListingDedupeKey, buildPropertyDetailNavigation } from '../utils/propertyDetailUrl'
import { formatPropertyForListingCard } from '../utils/formatPropertyListingCard'
import { fetchSearchCatalogProperties } from '../utils/propertySearchCatalog'
import { groupPropertiesByCatalogSection } from '../utils/catalogSearchSections'
import {
  filterPropertiesStrict,
  normalizeSearchPriceFilters,
} from '../utils/propertySearchFilters'
import { isPropertyListingSoldOut } from '../utils/auctionReminderBounds'
import { getSearchResultsPropertyPath, parseSearchResultsGeoRoute } from '../utils/searchResultsGeoUrl'
import { readHeroSearchPrefilter } from '../utils/heroSearchFilters'

const MOBILE_BREAKPOINT = 768

function isHiddenSoldListing(property) {
  if (!property) return true
  if (property.status === 'sold') return true
  return isPropertyListingSoldOut(property)
}

function SearchResultsGrid({ properties, onOpen, linkGeo }) {
  return (
    <div className="properties-grid property-listing-grid search-results__grid">
      {properties.map((property) => (
        <PropertyListingCard
          key={auctionListingDedupeKey(property)}
          property={property}
          href={getSearchResultsPropertyPath(property, linkGeo)}
          onOpen={onOpen}
          showActions={false}
          pinFooter
        />
      ))}
    </div>
  )
}

const SearchResults = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const routeGeo = useMemo(
    () => parseSearchResultsGeoRoute({ country: params.country, city: params.city }),
    [params.country, params.city],
  )
  const routeCountry = routeGeo.country
  const routeCity = routeGeo.region
  const heroSearchPrefilter = useMemo(
    () => readHeroSearchPrefilter(location.state),
    [location.state],
  )
  const [catalogProperties, setCatalogProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilters, setActiveFilters] = useState(EMPTY_CATALOG_FILTERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(true)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT,
  )
  const searchFiltersBarRef = useRef(null)
  const autoScrolledRef = useRef(false)

  const isSearchDesktop = !isMobile

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (isSearchDesktop) setMobileFiltersOpen(false)
  }, [isSearchDesktop])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const API_BASE_URL = await getApiBaseUrl()
        const catalog = await fetchSearchCatalogProperties(API_BASE_URL)
        if (cancelled) return
        const formatted = catalog
          .map((prop) => formatPropertyForListingCard(prop))
          .filter((property) => !isHiddenSoldListing(property))
        const bounds = getCatalogFilterBounds(formatted)
        const initialFilters = sanitizeCatalogFilters(
          heroSearchPrefilter
            ? mergeCatalogFilters(heroSearchPrefilter, EMPTY_CATALOG_FILTERS)
            : loadCatalogFiltersFromSession(bounds),
          bounds,
        )
        if (routeCountry && routeCity) {
          initialFilters.country = routeCountry
          initialFilters.region = routeCity
        }
        persistCatalogFilters(initialFilters)
        setCatalogProperties(formatted)
        setActiveFilters(initialFilters)
      } catch (error) {
        console.error('Ошибка загрузки каталога:', error)
        if (!cancelled) setCatalogProperties([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [heroSearchPrefilter, routeCountry, routeCity])

  const filterBounds = useMemo(
    () => getCatalogFilterBounds(catalogProperties),
    [catalogProperties],
  )

  const filteredProperties = useMemo(() => {
    const priceBounds = {
      min: filterBounds.priceMin,
      max: filterBounds.priceMax,
    }
    const normalized = normalizeSearchPriceFilters(activeFilters, priceBounds)
    const strict = filterPropertiesStrict(catalogProperties, normalized)
    return filterPropertiesBySearchQuery(strict, searchQuery)
  }, [catalogProperties, activeFilters, searchQuery, filterBounds.priceMin, filterBounds.priceMax])

  const groupedSections = useMemo(
    () => groupPropertiesByCatalogSection(filteredProperties, activeFilters),
    [filteredProperties, activeFilters],
  )
  const linkGeo = useMemo(
    () => ({
      country: activeFilters.country || routeCountry,
      region: activeFilters.region || routeCity,
    }),
    [activeFilters.country, activeFilters.region, routeCountry, routeCity],
  )

  const totalUniqueCount = useMemo(() => {
    const seen = new Set()
    for (const property of filteredProperties) {
      seen.add(auctionListingDedupeKey(property))
    }
    return seen.size
  }, [filteredProperties])

  const activeFilterCount = useMemo(() => {
    let count = Array.isArray(activeFilters.purchaseTypes)
      ? activeFilters.purchaseTypes.length
      : 0
    if (activeFilters.country) count += 1
    if (activeFilters.region) count += 1
    if (activeFilters.propertyType) count += 1
    if (activeFilters.rooms) count += 1
    if (activeFilters.minPrice !== '' || activeFilters.maxPrice !== '') count += 1
    return count
  }, [activeFilters])

  useEffect(() => {
    if (!location.state?.fromPropertySearchBlock) return
    if (typeof location.state?.searchQuery === 'string' && location.state.searchQuery.trim()) {
      setSearchQuery(location.state.searchQuery.trim())
    }
    if (loading || autoScrolledRef.current) return

    const target = document.getElementById('search-results-grid')
    if (!target) return

    autoScrolledRef.current = true
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [loading, location.state])

  const openProperty = (property, { auctionTab } = {}) => {
    if (!ensureCanOpenProperty()) return
    const { pathname, state } = buildPropertyDetailNavigation(property, {
      auctionTab: auctionTab || undefined,
    })
    const targetPath = getSearchResultsPropertyPath(property, linkGeo)
    navigate(targetPath === getPropertyDetailPath(property) ? pathname : targetPath, { state })
  }

  const sanitizeActiveFilters = (nextFilters) =>
    sanitizeCatalogFilters(nextFilters, {
      priceMin: filterBounds.priceMin,
      priceMax: filterBounds.priceMax,
    })

  const commitFilters = (nextFilters) => {
    const sanitized = sanitizeActiveFilters(nextFilters)
    setActiveFilters(sanitized)
    persistCatalogFilters(sanitized)
  }

  const handleDesktopFilterChange = (updater) => {
    setActiveFilters((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      const sanitized = sanitizeActiveFilters(next)
      persistCatalogFilters(sanitized)
      return sanitized
    })
  }

  const handleResetFilters = () => {
    commitFilters(EMPTY_CATALOG_FILTERS)
    setSearchQuery('')
  }

  if (loading) {
    return (
      <div className="search-results-page">
        <Header />
        <div className="search-results search-results--loading">
          <div className="search-results__loading">
            <div className="search-results__spinner"></div>
            <p>Поиск недвижимости...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="search-results-page">
      <Header />
      <main className="search-results search-results--catalog-layout">
      <div className="search-results__container">
        <div
          className={`search-results__listing-shell shares-listing-shell${
            isSearchDesktop && desktopFiltersOpen ? ' shares-listing-shell--with-filters' : ''
          }${isSearchDesktop && !desktopFiltersOpen ? ' shares-listing-shell--filters-hidden' : ''}`}
        >
          <div
            className={`search-results__layout shares-listing-layout${
              isSearchDesktop
                ? ` auction-desktop-layout${
                    desktopFiltersOpen ? '' : ' auction-desktop-layout--filters-hidden'
                  }`
                : ''
            }`}
          >
            {isSearchDesktop && desktopFiltersOpen ? (
              <CatalogDesktopFilters
                filters={activeFilters}
                onChange={handleDesktopFilterChange}
                priceBounds={{ min: filterBounds.priceMin, max: filterBounds.priceMax }}
              />
            ) : null}

            <div
              className={`search-results__main shares-listing-layout__main${
                isSearchDesktop ? ' auction-desktop-layout__main' : ''
              }${
                isSearchDesktop && !desktopFiltersOpen
                  ? ' auction-desktop-layout__main--filters-hidden'
                  : ''
              }`.trim()}
            >
              {!isSearchDesktop ? (
                <div className="search-filters-bar search-filters-bar--auction-mobile search-results__mobile-search">
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
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={`search-results__mobile-filters-btn${
                      activeFilterCount > 0 ? ' is-active' : ''
                    }`}
                    onClick={() => setMobileFiltersOpen(true)}
                    aria-label={t('filters')}
                    aria-expanded={mobileFiltersOpen}
                  >
                    <FiSliders size={20} aria-hidden />
                    {activeFilterCount > 0 ? (
                      <span className="search-results__mobile-filters-count" aria-hidden>
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </button>
                </div>
              ) : (
                <div
                  ref={searchFiltersBarRef}
                  className="search-filters-bar search-filters-bar--auction-desktop"
                >
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
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </div>
              )}

              <div id="search-results-grid" className="search-results__body">
                {totalUniqueCount === 0 ? (
                  <BuyerEmptyState
                    className="search-results__empty"
                    eyebrow="Новый шанс для выбора"
                    title="Подходящих объектов пока нет"
                    description="Снимем ограничения и снова покажем весь каталог — ваши параметры поиска не потеряются навсегда."
                    primaryLabel="Показать весь каталог"
                    onPrimary={handleResetFilters}
                    secondaryLabel="Все направления"
                    onSecondary={() => navigate('/sections')}
                  />
                ) : (
                  <div className="search-results__sections property-listing-grid-sections">
                    {groupedSections.map((section, index) => (
                      <div key={section.key} className="search-results__section">
                        <h2 className="search-results__section-title">
                          {t(section.labelKey)}
                          <span className="search-results__section-count">
                            ({section.properties.length})
                          </span>
                        </h2>
                        <SearchResultsGrid properties={section.properties} onOpen={openProperty} linkGeo={linkGeo} />
                        {index < groupedSections.length - 1 ? (
                          <div
                            className="property-listing-grid-divider"
                            role="separator"
                            aria-hidden="true"
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!isSearchDesktop ? (
                <SharesMobileFiltersDrawer
                  isOpen={mobileFiltersOpen}
                  onClose={() => setMobileFiltersOpen(false)}
                  title={t('filters')}
                  applyLabel={`${t('auctionApplyFilters')} · ${totalUniqueCount}`}
                  onApply={() => setMobileFiltersOpen(false)}
                  resetLabel={t('catalogResetFilters')}
                  onReset={handleResetFilters}
                >
                  <CatalogDesktopFilters
                    filters={activeFilters}
                    onChange={handleDesktopFilterChange}
                    priceBounds={{ min: filterBounds.priceMin, max: filterBounds.priceMax }}
                    variant="drawer"
                  />
                </SharesMobileFiltersDrawer>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      </main>
      <Footer />
    </div>
  )
}

export default SearchResults
