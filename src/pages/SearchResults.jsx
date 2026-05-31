import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiAlertCircle } from 'react-icons/fi'
import PageBackButton from '../components/PageBackButton'
import PropertyListingCard from '../components/PropertyListingCard'
import PropertySearchFiltersPanel, {
  EMPTY_CATALOG_FILTERS,
} from '../components/PropertySearchFiltersPanel'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { getApiBaseUrl } from '../utils/apiConfig'
import './SearchResults.css'
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

function isHiddenSoldListing(property) {
  if (!property) return true
  if (property.status === 'sold') return true
  return isPropertyListingSoldOut(property)
}

function SearchResultsGrid({ properties, onOpen }) {
  return (
    <div className="properties-grid property-listing-grid search-results__grid">
      {properties.map((property) => (
        <PropertyListingCard
          key={auctionListingDedupeKey(property)}
          property={property}
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
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilters, setActiveFilters] = useState(EMPTY_CATALOG_FILTERS)

  useEffect(() => {
    try {
      const savedFilters = sessionStorage.getItem('propertySearchFilters')
      const parsed = savedFilters ? JSON.parse(savedFilters) : EMPTY_CATALOG_FILTERS
      const filters = parsed && typeof parsed === 'object' ? parsed : EMPTY_CATALOG_FILTERS
      setActiveFilters(filters)
      searchProperties(filters)
    } catch {
      setActiveFilters(EMPTY_CATALOG_FILTERS)
      searchProperties(EMPTY_CATALOG_FILTERS)
    }
  }, [])

  const searchProperties = async (searchFilters) => {
    try {
      setLoading(true)
      const API_BASE_URL = await getApiBaseUrl()
      const catalog = await fetchSearchCatalogProperties(API_BASE_URL)

      const formattedProperties = catalog.map((prop) => formatPropertyForListingCard(prop))

      const priceBounds = {
        min: Number(searchFilters._priceBoundMin) || 1,
        max: Number(searchFilters._priceBoundMax) || 1_000_000,
      }
      const filtered = filterPropertiesStrict(
        formattedProperties,
        normalizeSearchPriceFilters(searchFilters, priceBounds)
      ).filter((property) => !isHiddenSoldListing(property))

      setProperties(filtered)
    } catch (error) {
      console.error('Ошибка поиска:', error)
      setProperties([])
    } finally {
      setLoading(false)
    }
  }

  const groupedSections = useMemo(
    () => groupPropertiesByCatalogSection(properties, activeFilters),
    [properties, activeFilters]
  )

  const totalUniqueCount = useMemo(() => {
    const seen = new Set()
    for (const section of groupedSections) {
      for (const property of section.properties) {
        seen.add(auctionListingDedupeKey(property))
      }
    }
    return seen.size
  }, [groupedSections])

  const openProperty = (property, { auctionTab } = {}) => {
    if (!ensureCanOpenProperty()) return
    const { pathname, state } = buildPropertyDetailNavigation(property, {
      auctionTab: auctionTab || undefined,
    })
    navigate(pathname, { state })
  }

  const handleApplyFilters = (nextFilters) => {
    setActiveFilters(nextFilters)
    searchProperties(nextFilters || EMPTY_CATALOG_FILTERS)
  }

  if (loading) {
    return (
      <div className="search-results">
        <div className="search-results__loading">
          <div className="search-results__spinner"></div>
          <p>Поиск недвижимости...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="search-results">
      <div className="search-results__container">
        <PageBackButton
          className="search-results__back"
          onClick={() => navigate('/#landing-property-search')}
        />

        <PropertySearchFiltersPanel
          initialFilters={activeFilters}
          onApplyFilters={handleApplyFilters}
        />

        {totalUniqueCount === 0 ? (
          <div className="search-results__empty">
            <FiAlertCircle size={48} />
            <h2>Ничего не найдено</h2>
            <p>Попробуйте изменить параметры поиска</p>
            <button
              type="button"
              className="search-results__button"
              onClick={() => {
                sessionStorage.setItem('propertySearchFilters', JSON.stringify(EMPTY_CATALOG_FILTERS))
                setActiveFilters(EMPTY_CATALOG_FILTERS)
                searchProperties(EMPTY_CATALOG_FILTERS)
              }}
            >
              Показать все объекты
            </button>
          </div>
        ) : (
          <div className="search-results__sections property-listing-grid-sections">
            {groupedSections.map((section, index) => (
              <div key={section.key} className="search-results__section">
                <h2 className="search-results__section-title">
                  {t(section.labelKey)}
                  <span className="search-results__section-count">({section.properties.length})</span>
                </h2>
                <SearchResultsGrid properties={section.properties} onOpen={openProperty} />
                {index < groupedSections.length - 1 ? (
                  <div className="property-listing-grid-divider" role="separator" aria-hidden="true" />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchResults
