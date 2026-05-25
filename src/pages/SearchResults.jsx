import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiAlertCircle } from 'react-icons/fi'
import PageBackButton from '../components/PageBackButton'
import PropertyListingCard from '../components/PropertyListingCard'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { getApiBaseUrl } from '../utils/apiConfig'
import './SearchResults.css'
import '../components/PropertyListingGrid.css'
import { getPropertyDetailPath, auctionListingDedupeKey } from '../utils/propertyDetailUrl'
import { formatPropertyForListingCard } from '../utils/formatPropertyListingCard'
import { fetchSearchCatalogProperties } from '../utils/propertySearchCatalog'
import {
  filterPropertiesStrict,
  normalizeSearchPriceFilters,
} from '../utils/propertySearchFilters'
import {
  hasPropertyListingTimer,
  isPropertyListingSoldOut,
} from '../utils/auctionReminderBounds'

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
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedFilters = sessionStorage.getItem('propertySearchFilters')
    if (savedFilters) {
      searchProperties(JSON.parse(savedFilters))
    } else {
      setLoading(false)
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

  const { withTimer, withoutTimer, splitByTimer } = useMemo(() => {
    const timerList = []
    const noTimerList = []
    for (const property of properties) {
      if (hasPropertyListingTimer(property)) {
        timerList.push(property)
      } else {
        noTimerList.push(property)
      }
    }
    return {
      withTimer: timerList,
      withoutTimer: noTimerList,
      splitByTimer: timerList.length > 0 && noTimerList.length > 0,
    }
  }, [properties])

  const openProperty = (property) => {
    if (!ensureCanOpenProperty()) return
    navigate(getPropertyDetailPath(property.id, { property }), {
      state: { property },
    })
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
          onClick={() => navigate('/#landing-property-search', { state: { openPropertySearch: true } })}
        />

        <h1 className="search-results__title">
          Результаты поиска
          {properties.length > 0 && (
            <span className="search-results__count">({properties.length})</span>
          )}
        </h1>

        {properties.length === 0 ? (
          <div className="search-results__empty">
            <FiAlertCircle size={48} />
            <h2>Ничего не найдено</h2>
            <p>Попробуйте изменить параметры поиска</p>
            <button
              type="button"
              className="search-results__button"
              onClick={() => navigate('/auction')}
            >
              Вернуться на главную
            </button>
          </div>
        ) : splitByTimer ? (
          <div className="search-results__sections property-listing-grid-sections">
            <SearchResultsGrid properties={withTimer} onOpen={openProperty} />
            <div className="property-listing-grid-divider" role="separator" aria-hidden="true" />
            <SearchResultsGrid properties={withoutTimer} onOpen={openProperty} />
          </div>
        ) : (
          <SearchResultsGrid properties={properties} onOpen={openProperty} />
        )}
      </div>
    </div>
  )
}

export default SearchResults
