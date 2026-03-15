import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import PropertyTimer from '../components/PropertyTimer'
import { properties } from '../data/properties'
import { FiHeart, FiMapPin, FiArrowRight } from 'react-icons/fi'
import { MdBed, MdOutlineBathtub } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import './Favorites.css'

// Импортируем данные из MainPage (в реальном приложении лучше вынести в отдельный файл)
const recommendedProperties = [
  {
    id: 1,
    tag: 'House',
    name: 'Lakeshore Blvd West',
    location: '70 Washington Square South, New York, NY 10012, United States',
    price: 797500,
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80'],
    beds: 2,
    baths: 2,
    sqft: 2000,
    isAuction: true,
    currentBid: 750000,
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
  },
  {
    id: 2,
    tag: 'House',
    name: 'Eleanor Pena Property',
    location: 'Costa Adeje, Tenerife, Spain',
    price: 1200,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'],
    beds: 2,
    baths: 1,
    sqft: 1500,
    isAuction: true,
    currentBid: 1100,
    endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
  },
]

const nearbyProperties = [
  {
    id: 1,
    tag: 'House',
    name: 'Bessie Cooper Property',
    location: 'Los Cristianos, Tenerife, Spain',
    price: 1000,
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'],
    beds: 2,
    baths: 2,
    sqft: 1800,
    isAuction: true,
    currentBid: 950,
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
  },
  {
    id: 2,
    tag: 'Apartment',
    name: 'Darrell Steward Property',
    location: 'Puerto de la Cruz, Tenerife, Spain',
    price: 980,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'],
    beds: 1,
    baths: 1,
    sqft: 1200,
    isAuction: true,
    currentBid: 920,
    endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
  },
]

const apartmentsData = [
  {
    id: 1,
    name: 'Тропарево Парк',
    location: 'Costa Adeje, Tenerife',
    price: 8500372,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'],
    beds: 2,
    baths: 1,
    sqft: 850,
    isAuction: true,
    currentBid: 8000000,
    endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
  },
]

const villasData = [
  {
    id: 1,
    name: 'Villa Paradise',
    location: 'Costa Adeje, Tenerife',
    price: 12000000,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'],
    beds: 4,
    baths: 3,
    sqft: 2500,
    isAuction: true,
    currentBid: 11000000,
    endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000 + 58 * 60 * 1000 + 53 * 1000).toISOString(),
  },
]

const Favorites = () => {
  const navigate = useNavigate()
  const [favoriteProperties, setFavoriteProperties] = useState(new Map())
  const [favoriteAuctions, setFavoriteAuctions] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Загружаем избранное из localStorage
  useEffect(() => {
    try {
      const loadFavorites = () => {
        const savedFavorites = localStorage.getItem('favoriteProperties')
        if (savedFavorites) {
          try {
            const parsed = JSON.parse(savedFavorites)
            const favoritesMap = new Map(Object.entries(parsed))
            setFavoriteProperties(favoritesMap)
          } catch (e) {
            console.error('Ошибка при загрузке избранного:', e)
          }
        }
        setIsLoading(false)
      }
      
      loadFavorites()
    } catch (error) {
      console.error('Ошибка при инициализации:', error)
      setIsLoading(false)
    }
  }, [])

  // Собираем все аукционы и фильтруем избранные
  useEffect(() => {
    try {
      const allAuctions = []

      // Добавляем из properties (используем id напрямую)
      if (properties && Array.isArray(properties)) {
        properties.forEach((property) => {
          if (favoriteProperties.get(`property-${property.id}`)) {
            allAuctions.push({
              ...property,
              category: 'property',
              key: `property-${property.id}`,
              title: property.title,
              name: property.title,
            })
          }
        })
      }

      // Добавляем из recommendedProperties
      if (recommendedProperties && Array.isArray(recommendedProperties)) {
        recommendedProperties.forEach((property) => {
          if (favoriteProperties.get(`recommended-${property.id}`)) {
            allAuctions.push({
              ...property,
              category: 'recommended',
              key: `recommended-${property.id}`,
            })
          }
        })
      }

      // Добавляем из nearbyProperties
      if (nearbyProperties && Array.isArray(nearbyProperties)) {
        nearbyProperties.forEach((property) => {
          if (favoriteProperties.get(`nearby-${property.id}`)) {
            allAuctions.push({
              ...property,
              category: 'nearby',
              key: `nearby-${property.id}`,
            })
          }
        })
      }

      // Добавляем из apartmentsData
      if (apartmentsData && Array.isArray(apartmentsData)) {
        apartmentsData.forEach((property) => {
          if (favoriteProperties.get(`apartment-${property.id}`)) {
            allAuctions.push({
              ...property,
              category: 'apartment',
              key: `apartment-${property.id}`,
            })
          }
        })
      }

      // Добавляем из villasData
      if (villasData && Array.isArray(villasData)) {
        villasData.forEach((property) => {
          if (favoriteProperties.get(`villa-${property.id}`)) {
            allAuctions.push({
              ...property,
              category: 'villa',
              key: `villa-${property.id}`,
            })
          }
        })
      }

      setFavoriteAuctions(allAuctions)
    } catch (error) {
      console.error('Ошибка при фильтрации аукционов:', error)
    }
  }, [favoriteProperties])

  // Обновляем список при изменении localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const savedFavorites = localStorage.getItem('favoriteProperties')
      if (savedFavorites) {
        try {
          const parsed = JSON.parse(savedFavorites)
          const favoritesMap = new Map(Object.entries(parsed))
          setFavoriteProperties(favoritesMap)
        } catch (e) {
          console.error('Ошибка при загрузке избранного:', e)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    const onFocus = () => handleStorageChange()
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const formatPrice = (price) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`
    }
    return `$${price.toLocaleString('en-US')}`
  }

  const toggleFavorite = (key) => {
    const newFavorites = new Map(favoriteProperties)
    newFavorites.set(key, false)
    setFavoriteProperties(newFavorites)
    
    // Сохраняем в localStorage
    const obj = Object.fromEntries(newFavorites)
    localStorage.setItem('favoriteProperties', JSON.stringify(obj))
    
    // Обновляем список
    setFavoriteAuctions((prev) => prev.filter((auction) => auction.key !== key))
  }

  const getPropertyRoute = (auction) => {
    if (auction.category === 'property') {
      return `/property/${auction.id}`
    }
    // Для других категорий можно использовать другой маршрут
    return `/property/${auction.id}`
  }

  if (isLoading) {
    return (
      <div className="favorites-page">
        <Header />
        <div className="favorites-container">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Загрузка...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="favorites-page">
      <Header />
      <div className="favorites-container">
        <div className="favorites-header">
          <h1 className="favorites-title">
            <FiHeart className="favorites-title-icon" />
            Понравилось
          </h1>
          <p className="favorites-subtitle">
            Все аукционы, которые вы добавили в избранное
          </p>
        </div>

        {favoriteAuctions.length > 0 ? (
          <div className="favorites-grid">
            {favoriteAuctions.map((auction) => (
              <div key={auction.key} className="favorite-card">
                <Link to={getPropertyRoute(auction)} className="favorite-card-link">
                  <div className="favorite-card-image">
                    <img 
                      src={auction.image || auction.images?.[0]} 
                      alt={auction.name || auction.title}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
                      }}
                    />
                    <button
                      className="favorite-card-heart active"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleFavorite(auction.key)
                      }}
                      aria-label="Удалить из избранного"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path 
                          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="favorite-card-content">
                    {auction.endTime && (
                      <div className="favorite-card-timer">
                        <PropertyTimer 
                          endTime={typeof auction.endTime === 'string' ? auction.endTime : auction.endTime.toISOString()} 
                          compact={true} 
                        />
                      </div>
                    )}
                    <h3 className="favorite-card-title">
                      {auction.name || auction.title}
                    </h3>
                    <p className="favorite-card-location">
                      <FiMapPin size={14} />
                      {auction.location}
                    </p>
                    <div className="favorite-card-details">
                      {auction.beds && (
                        <span className="favorite-card-detail">
                          <MdBed size={16} />
                          {auction.beds}
                        </span>
                      )}
                      {auction.baths && (
                        <span className="favorite-card-detail">
                          <MdOutlineBathtub size={16} />
                          {auction.baths}
                        </span>
                      )}
                      {auction.sqft && (
                        <span className="favorite-card-detail">
                          <BiArea size={16} />
                          {auction.sqft} м²
                        </span>
                      )}
                      {auction.area && (
                        <span className="favorite-card-detail">
                          <BiArea size={16} />
                          {auction.area} м²
                        </span>
                      )}
                    </div>
                    <div className="favorite-card-price">
                      {auction.isAuction && auction.currentBid ? (
                        <>
                          <span className="favorite-card-price-label">Текущая ставка:</span>
                          <span className="favorite-card-price-value">{formatPrice(auction.currentBid)}</span>
                        </>
                      ) : (
                        <>
                          <span className="favorite-card-price-label">Цена:</span>
                          <span className="favorite-card-price-value">{formatPrice(auction.price)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="favorites-empty">
            <FiHeart size={64} className="favorites-empty-icon" />
            <h2 className="favorites-empty-title">У вас пока нет избранных аукционов</h2>
            <p className="favorites-empty-text">
              Добавляйте понравившиеся аукционы в избранное, чтобы не потерять их
            </p>
            <button 
              className="favorites-empty-button"
              onClick={() => navigate('/auction')}
            >
              Перейти к аукционам
              <FiArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Favorites
