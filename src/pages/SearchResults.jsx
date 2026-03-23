import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MdBed, MdOutlineBathtub } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import { FiArrowLeft, FiAlertCircle } from 'react-icons/fi'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { getApiBaseUrl } from '../utils/apiConfig'
import './SearchResults.css'

const SearchResults = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(null)
  const [showApproximateMessage, setShowApproximateMessage] = useState(false)

  useEffect(() => {
    // Получаем фильтры из sessionStorage
    const savedFilters = sessionStorage.getItem('propertySearchFilters')
    if (savedFilters) {
      const parsedFilters = JSON.parse(savedFilters)
      setFilters(parsedFilters)
      searchProperties(parsedFilters)
    } else {
      setLoading(false)
    }
  }, [])

  const searchProperties = async (searchFilters) => {
    try {
      setLoading(true)
      const API_BASE_URL = await getApiBaseUrl()
      
      // Загружаем все свойства
      const types = ['commercial', 'villa', 'apartment', 'house']
      const allProperties = []

      for (const type of types) {
        try {
          // Загружаем одобренные объявления
          const approvedUrl = `${API_BASE_URL}/properties/approved?type=${type}`
          const approvedResponse = await fetch(approvedUrl)
          if (approvedResponse.ok) {
            const data = await approvedResponse.json()
            if (data.success && data.data) {
              const nonAuction = data.data.filter(prop => 
                !prop.is_auction || prop.is_auction === 0 || prop.is_auction === false
              )
              allProperties.push(...nonAuction)
            }
          }

          // Загружаем аукционные объявления
          const auctionUrl = `${API_BASE_URL}/properties/auctions?type=${type}`
          const auctionResponse = await fetch(auctionUrl)
          if (auctionResponse.ok) {
            const data = await auctionResponse.json()
            if (data.success && data.data) {
              allProperties.push(...data.data)
            }
          }
        } catch (error) {
          console.error(`Ошибка загрузки типа ${type}:`, error)
        }
      }

      // Форматируем свойства
      const formattedProperties = allProperties.map(prop => ({
        ...prop,
        title: prop.title || prop.name || '',
        location: prop.location || '',
        price: prop.price || (prop.auction_starting_price || 0),
        rooms: prop.rooms || prop.beds || prop.bedrooms || 0,
        bedrooms: prop.bedrooms || prop.rooms || prop.beds || 0,
        bathrooms: prop.bathrooms || 0,
        area: prop.area || prop.sqft || 0,
        sqft: prop.area || prop.sqft || 0,
        property_type: prop.property_type || '',
        images: prop.images || (prop.image ? [prop.image] : []),
        image: prop.image || (prop.images && prop.images[0] ? prop.images[0] : null)
      }))

      // Применяем фильтры
      let filtered = formattedProperties

      // Фильтр по цене
      if (searchFilters.minPrice) {
        const minPrice = parseFloat(searchFilters.minPrice)
        filtered = filtered.filter(p => p.price >= minPrice)
      }
      if (searchFilters.maxPrice) {
        const maxPrice = parseFloat(searchFilters.maxPrice)
        filtered = filtered.filter(p => p.price <= maxPrice)
      }

      // Фильтр по региону
      if (searchFilters.region) {
        filtered = filtered.filter(p => 
          (p.location || '').toLowerCase().includes(searchFilters.region.toLowerCase())
        )
      }

      // Фильтр по типу недвижимости
      if (searchFilters.propertyType) {
        const typeMap = {
          'Квартира': ['apartment'],
          'Апартаменты': ['commercial'],
          'Вилла': ['villa'],
          'Дом': ['house'],
          'Таунхаус': ['house']
        }
        const targetTypes = typeMap[searchFilters.propertyType] || []
        filtered = filtered.filter(p => targetTypes.includes(p.property_type))
      }

      // Фильтр по количеству комнат
      if (searchFilters.rooms) {
        const rooms = parseInt(searchFilters.rooms)
        filtered = filtered.filter(p => {
          const propRooms = p.rooms || p.bedrooms || 0
          if (rooms === 5) {
            return propRooms >= 5
          }
          return propRooms === rooms
        })
      }

      // Фильтр по площади
      if (searchFilters.minArea) {
        const minArea = parseFloat(searchFilters.minArea)
        filtered = filtered.filter(p => (p.area || 0) >= minArea)
      }
      if (searchFilters.maxArea) {
        const maxArea = parseFloat(searchFilters.maxArea)
        filtered = filtered.filter(p => (p.area || 0) <= maxArea)
      }

      // Если ничего не найдено, ищем максимально похожие объекты
      if (filtered.length === 0) {
        setShowApproximateMessage(true)
        filtered = findSimilarProperties(formattedProperties, searchFilters)
      } else {
        setShowApproximateMessage(false)
      }

      setProperties(filtered)
    } catch (error) {
      console.error('Ошибка поиска:', error)
      setProperties([])
    } finally {
      setLoading(false)
    }
  }

  const findSimilarProperties = (allProperties, filters) => {
    // Вычисляем "близость" каждого объекта к запросу
    const scored = allProperties.map(prop => {
      let score = 0
      let maxScore = 0

      // Цена (0-30 баллов)
      if (filters.minPrice || filters.maxPrice) {
        maxScore += 30
        const price = prop.price || 0
        if (filters.minPrice && filters.maxPrice) {
          const minPrice = parseFloat(filters.minPrice)
          const maxPrice = parseFloat(filters.maxPrice)
          const avgPrice = (minPrice + maxPrice) / 2
          const diff = Math.abs(price - avgPrice)
          const range = maxPrice - minPrice
          if (range > 0) {
            score += Math.max(0, 30 - (diff / range) * 30)
          }
        } else if (filters.minPrice) {
          const minPrice = parseFloat(filters.minPrice)
          if (price >= minPrice) {
            score += 30
          } else {
            score += Math.max(0, 30 - (minPrice - price) / minPrice * 30)
          }
        } else if (filters.maxPrice) {
          const maxPrice = parseFloat(filters.maxPrice)
          if (price <= maxPrice) {
            score += 30
          } else {
            score += Math.max(0, 30 - (price - maxPrice) / maxPrice * 30)
          }
        }
      }

      // Регион (0-25 баллов)
      if (filters.region) {
        maxScore += 25
        const location = (prop.location || '').toLowerCase()
        const region = filters.region.toLowerCase()
        if (location.includes(region)) {
          score += 25
        } else {
          // Частичное совпадение
          const words = region.split(' ')
          for (const word of words) {
            if (location.includes(word)) {
              score += 10
              break
            }
          }
        }
      }

      // Тип недвижимости (0-20 баллов)
      if (filters.propertyType) {
        maxScore += 20
        const typeMap = {
          'Квартира': ['apartment'],
          'Апартаменты': ['commercial'],
          'Вилла': ['villa'],
          'Дом': ['house'],
          'Таунхаус': ['house']
        }
        const targetTypes = typeMap[filters.propertyType] || []
        if (targetTypes.includes(prop.property_type)) {
          score += 20
        }
      }

      // Комнаты (0-15 баллов)
      if (filters.rooms) {
        maxScore += 15
        const rooms = parseInt(filters.rooms)
        const propRooms = prop.rooms || prop.bedrooms || 0
        if (rooms === 5) {
          if (propRooms >= 5) score += 15
          else score += Math.max(0, 15 - (5 - propRooms) * 3)
        } else {
          const diff = Math.abs(propRooms - rooms)
          score += Math.max(0, 15 - diff * 5)
        }
      }

      // Площадь (0-10 баллов)
      if (filters.minArea || filters.maxArea) {
        maxScore += 10
        const area = prop.area || 0
        if (filters.minArea && filters.maxArea) {
          const minArea = parseFloat(filters.minArea)
          const maxArea = parseFloat(filters.maxArea)
          const avgArea = (minArea + maxArea) / 2
          const diff = Math.abs(area - avgArea)
          const range = maxArea - minArea
          if (range > 0) {
            score += Math.max(0, 10 - (diff / range) * 10)
          }
        } else if (filters.minArea) {
          const minArea = parseFloat(filters.minArea)
          if (area >= minArea) {
            score += 10
          } else {
            score += Math.max(0, 10 - (minArea - area) / minArea * 10)
          }
        } else if (filters.maxArea) {
          const maxArea = parseFloat(filters.maxArea)
          if (area <= maxArea) {
            score += 10
          } else {
            score += Math.max(0, 10 - (area - maxArea) / maxArea * 10)
          }
        }
      }

      return { property: prop, score, maxScore }
    })

    // Сортируем по score и берем топ-10
    scored.sort((a, b) => {
      const aRatio = a.maxScore > 0 ? a.score / a.maxScore : 0
      const bRatio = b.maxScore > 0 ? b.score / b.maxScore : 0
      return bRatio - aRatio
    })

    return scored.slice(0, 10).map(item => item.property)
  }

  const formatPrice = (price) => {
    if (price >= 1000000) {
      return `€${(price / 1000000).toFixed(1)}M`
    }
    return `€${price.toLocaleString('ru-RU')}`
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
        <button 
          className="search-results__back"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft size={20} />
          <span>Назад</span>
        </button>

        {showApproximateMessage && (
          <div className="search-results__message">
            <FiAlertCircle size={24} />
            <div>
              <h3>Максимально приближенный объект к вашим запросам</h3>
              <p>К сожалению, точных совпадений не найдено. Показаны объекты, наиболее близкие к вашим критериям.</p>
            </div>
          </div>
        )}

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
              className="search-results__button"
              onClick={() => navigate('/auction')}
            >
              Вернуться на главную
            </button>
          </div>
        ) : (
          <div className="search-results__grid">
            {properties.map((property) => {
              const propertyImage = property.image || property.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
              
              return (
                <div
                  key={property.id}
                  className="search-results__card"
                  onClick={() => {
                    if (!ensureCanOpenProperty()) return
                    navigate(`/property/${property.id}`, { state: { property } })
                  }}
                >
                  <div className="search-results__card-image">
                    <img src={propertyImage} alt={property.title} />
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
                      {formatPrice(property.price)}
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
