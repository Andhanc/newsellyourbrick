import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdBed, MdOutlineBathtub } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import { FiAlertCircle } from 'react-icons/fi'
import PageBackButton from '../components/PageBackButton'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { getApiBaseUrl } from '../utils/apiConfig'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import './SearchResults.css'
import { getPropertyDetailPath } from '../utils/propertyDetailUrl'
import { getPropertyListPrice } from '../utils/propertySearchLocation'
import { fetchSearchCatalogProperties } from '../utils/propertySearchCatalog'
import {
  filterPropertiesStrict,
  normalizeSearchPriceFilters,
} from '../utils/propertySearchFilters'
import { formatPropertyPrice } from '../utils/currency'

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

      const formattedProperties = catalog.map((prop) => {
        const price = getPropertyListPrice(prop)
        return {
          ...prop,
          title: prop.title || prop.name || '',
          location: prop.location || '',
          price,
          rooms: prop.rooms || prop.beds || prop.bedrooms || 0,
          bedrooms: prop.bedrooms || prop.rooms || prop.beds || 0,
          bathrooms: prop.bathrooms || 0,
          area: prop.area || prop.sqft || 0,
          sqft: prop.area || prop.sqft || 0,
          property_type: prop.property_type || '',
          images: prop.images || (prop.image ? [prop.image] : []),
          image: prop.image || (prop.images && prop.images[0] ? prop.images[0] : null),
        }
      })

      const priceBounds = {
        min: Number(searchFilters._priceBoundMin) || 1,
        max: Number(searchFilters._priceBoundMax) || 1_000_000,
      }
      setProperties(
        filterPropertiesStrict(
          formattedProperties,
          normalizeSearchPriceFilters(searchFilters, priceBounds)
        )
      )
    } catch (error) {
      console.error('Ошибка поиска:', error)
      setProperties([])
    } finally {
      setLoading(false)
    }
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
        ) : (
          <div className="search-results__grid">
            {properties.map((property) => {
              const propertyImageSafe =
                property.image ||
                property.images?.[0] ||
                'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
              const propertyImageProps = buildResponsiveImageProps(propertyImageSafe, {
                widths: [320, 480, 640, 800],
                sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
                quality: 72,
                fit: 'crop',
              })
              const displayPrice = getPropertyListPrice(property) || property.price || 0

              return (
                <div
                  key={`${property.property_type || 'p'}-${property.id}`}
                  className="search-results__card"
                  onClick={() => {
                    if (!ensureCanOpenProperty()) return
                    navigate(getPropertyDetailPath(property.id, { property }), {
                      state: { property },
                    })
                  }}
                >
                  <div className="search-results__card-image">
                    <img {...propertyImageProps} alt={property.title} />
                  </div>
                  <div className="search-results__card-content">
                    <h3 className="search-results__card-title">{property.title}</h3>
                    <p className="search-results__card-location">{property.location}</p>
                    <div className="search-results__card-specs">
                      {property.rooms > 0 && (
                        <div className="search-results__card-spec">
                          <MdBed size={18} />
                          <span>{property.rooms}</span>
                        </div>
                      )}
                      {property.bathrooms > 0 && (
                        <div className="search-results__card-spec">
                          <MdOutlineBathtub size={18} />
                          <span>{property.bathrooms}</span>
                        </div>
                      )}
                      {property.area > 0 && (
                        <div className="search-results__card-spec">
                          <BiArea size={18} />
                          <span>{property.area} м²</span>
                        </div>
                      )}
                    </div>
                    <div className="search-results__card-price">
                      {formatPropertyPrice(displayPrice, property.currency, { locale: 'ru-RU' })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchResults
