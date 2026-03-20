import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import { MdBed, MdOutlineBathtub, MdDirectionsCar } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import { properties } from '../data/properties'
import { isAuthenticated } from '../services/authService'
import { showNotification } from '../utils/toastHelper'
import PropertyTimer from './PropertyTimer'
import CircularTimer from './CircularTimer'
import PropertySearchModal from './PropertySearchModal'
import AnimatedLoadingSkeleton from './ui/AnimatedLoadingSkeleton'
import { MarqueeAnimation } from './ui/MarqueeAnimation'
import './PropertyList.css'

const MOBILE_BREAKPOINT = 768

// Проверка, что у объекта реально есть опция "Купить сейчас"
const hasBuyNowOption = (property) => {
  if (!property) return false

  const isAuction =
    property.isAuction === true ||
    property.is_auction === 1 ||
    property.is_auction === true

  const buyNowPrice = property.price ? Number(property.price) : 0

  // Стартовая цена аукциона
  const startingPriceRaw =
    property.auction_starting_price ??
    property.auctionStartingPrice ??
    property.currentBid ??
    0
  const startingPrice = startingPriceRaw ? Number(startingPriceRaw) : 0

  // Время окончания аукциона / тест-таймера
  const endTimeRaw =
    property.test_timer_end_date ||
    property.endTime ||
    property.auction_end_date ||
    null

  let timerExpired = false
  if (endTimeRaw) {
    const endTs = new Date(endTimeRaw).getTime()
    if (!Number.isNaN(endTs)) {
      timerExpired = endTs <= Date.now()
    }
  }

  const effectiveCurrentBid = property.currentBid
    ? Number(property.currentBid)
    : startingPrice

  // Для аукционных объектов "Купить сейчас" есть только если:
  // - указана цена buyNowPrice > 0
  // - она строго больше стартовой цены
  // - таймер не истёк
  // - текущая ставка меньше этой цены
  if (isAuction) {
    return (
      buyNowPrice > 0 &&
      buyNowPrice > startingPrice &&
      !timerExpired &&
      effectiveCurrentBid < buyNowPrice
    )
  }

  // Фолбэк для неаукционных объектов (на всякий случай)
  return buyNowPrice > 0
}

const PROPERTY_TYPE_KEYS = {
  'все': 'propertyTypeAll',
  'квартира': 'propertyTypeFlat',
  'апартаменты': 'propertyTypeApartment',
  'вилла': 'propertyTypeVilla',
  'дом': 'propertyTypeHouse'
}

const PropertyList = ({
  auctionProperties = null,
  onOpenAIChat,
  loading = false,
  floatWidgetsHiddenByFooter = false,
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoaded: userLoaded } = useUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [propertyType, setPropertyType] = useState('все')
  const [saleFilter, setSaleFilter] = useState('all')
  const [tooltip, setTooltip] = useState({ show: false, text: '', x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT)

  useEffect(() => {
    if (!isSearchModalOpen) return
    const handleClickOutside = (e) => {
      if (filtersWrapRef.current && !filtersWrapRef.current.contains(e.target)) {
        setIsSearchModalOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSearchModalOpen])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  
  // Маппинг категорий из URL (английские) в русские названия для фильтра
  const categoryMap = {
    'Apartment': 'апартаменты',
    'Villa': 'вилла',
    'Flat': 'квартира',
    'Townhouse': 'дом',
    'House': 'дом'
  }
  
  // Читаем параметры из URL при загрузке и прокручиваем к объектам
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const category = searchParams.get('category')
    const filter = searchParams.get('filter')
    
    if (category && categoryMap[category]) {
      setPropertyType(categoryMap[category])
    }
    
    // Применяем фильтр типа продажи (аукцион / купить сейчас)
    if (filter === 'auction') {
      setSaleFilter('auction')
    } else if (filter === 'buy_now') {
      setSaleFilter('buy_now')
    } else {
      setSaleFilter('all')
    }
    
    // Прокрутка к блоку объектов при наличии параметров в URL
    if (location.search.includes('category=')) {
      setTimeout(() => {
        const element = document.getElementById('properties-grid')
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 300) // Небольшая задержка для применения фильтров
    }
  }, [location.search])
  const [favorites, setFavorites] = useState(() => {
    // Загружаем из localStorage
    const savedFavorites = localStorage.getItem('favoriteProperties')
    if (savedFavorites) {
      try {
        const parsed = JSON.parse(savedFavorites)
        const favoritesMap = new Map(Object.entries(parsed))
        const favoriteIds = new Set()
        // Проверяем все свойства из localStorage, не только текущие
        favoritesMap.forEach((value, key) => {
          if (value && key.startsWith('property-')) {
            const id = key.replace('property-', '')
            favoriteIds.add(id)
          }
        })
        return favoriteIds
      } catch (e) {
        console.error('Ошибка при загрузке избранного:', e)
      }
    }
    return new Set()
  })
  
  // Обновляем избранное при изменении auctionProperties
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteProperties')
    if (savedFavorites) {
      try {
        const parsed = JSON.parse(savedFavorites)
        const favoritesMap = new Map(Object.entries(parsed))
        const favoriteIds = new Set()
        favoritesMap.forEach((value, key) => {
          if (value && key.startsWith('property-')) {
            const id = key.replace('property-', '')
            favoriteIds.add(id)
          }
        })
        setFavorites(favoriteIds)
      } catch (e) {
        console.error('Ошибка при обновлении избранного:', e)
      }
    }
  }, [auctionProperties])
  const [visibleCount, setVisibleCount] = useState(9)

  const formatPrice = (price) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`
    }
    return `$${price.toLocaleString('en-US')}`
  }

  // Используем переданные аукционные объявления или статические данные
  const propertiesToUse = auctionProperties || properties

  const filteredProperties = propertiesToUse.filter(property => {
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
    if (location.pathname === '/auction' && isDebtProperty) {
      return false
    }
    // На странице аукциона исключаем объекты с долями (долевая продажа)
    if (location.pathname === '/auction' && isShareProperty) {
      return false
    }

    // Фильтрация по типу недвижимости
    if (propertyType !== 'все') {
      // Если есть property_type из API, используем его
      if (property.property_type) {
        const typeMap = {
          'квартира': ['apartment'],
          'апартаменты': ['commercial'],
          'вилла': ['villa'],
          'дом': ['house']
        }
        if (typeMap[propertyType] && !typeMap[propertyType].includes(property.property_type)) {
          return false
        }
      } else {
        // Иначе используем старую логику по названию
        const titleLower = property.title.toLowerCase()
        const typeMatch = {
          'квартира': titleLower.includes('квартир') || titleLower.includes('студи'),
          'апартаменты': titleLower.includes('апартамент'),
          'вилла': titleLower.includes('вилл'),
          'дом': titleLower.includes('дом') || titleLower.includes('таунхаус')
        }
        
        if (!typeMatch[propertyType]) {
          return false
        }
      }
    }
    
    // Фильтрация по типу продажи
    if (saleFilter === 'auction' && property.isAuction !== true) {
      return false
    }
    if (saleFilter === 'buy_now' && !hasBuyNowPrice) {
      return false
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

  useEffect(() => {
    setVisibleCount(9)
  }, [searchQuery, propertyType])

  const isAuctionPage = location.pathname === '/auction'

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
        className={`property-list${floatWidgetsHiddenByFooter ? ' property-list--footer-near' : ''}`}
      >
        <div className="property-list-container">
        <div className="property-list-header">
          <div className="property-list-marquee-double">
            <div className="marquee-row marquee-row--top">
              <MarqueeAnimation
                direction="left"
                baseVelocity={-3}
                className="marquee-row__text text-white"
              >
                {t('activeAuctions')}
              </MarqueeAnimation>
            </div>
            <div className="marquee-row marquee-row--bottom">
              <MarqueeAnimation
                direction="right"
                baseVelocity={-3}
                className="marquee-row__text text-white"
              >
                {t('activeAuctions')}
              </MarqueeAnimation>
            </div>
          </div>
          {isMobile && isAuctionPage && onOpenAIChat && (
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
          )}
        </div>
        
        <div className="search-filters-bar">
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
          <div className="filters-and-types-grid">
            <button 
              className="filters-button"
              onClick={() => setIsSearchModalOpen(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              {t('filters')}
            </button>
            <div className="property-types">
              {(['все', 'квартира', 'апартаменты', 'вилла', 'дом']).map((type) => (
                <button
                  key={type}
                  className={`type-button ${propertyType === type ? 'active' : ''}`}
                  onClick={() => setPropertyType(type)}
                >
                  {t(PROPERTY_TYPE_KEYS[type])}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <AnimatedLoadingSkeleton />
        ) : filteredProperties.length === 0 ? (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3 className="no-results-title">{t('nothingFound')}</h3>
            <p className="no-results-text">{t('noResultsHint')}</p>
          </div>
        ) : (
          <>
            <div id="properties-grid" className="properties-grid">
              {filteredProperties.slice(0, visibleCount).map((property) => {
                const propertyTitle = property.title || property.name || ''
                const propertyImages = property.images || (property.image ? [property.image] : [])
                const propertyImage = propertyImages[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
                const hasTestTimer = property.test_timer_end_date != null && property.test_timer_end_date !== ''
                const hasTimer = (property.isAuction === true && property.endTime != null && property.endTime !== '') || hasTestTimer
                const isDebtProperty =
                  property.sale_type === 'debt' ||
                  property.is_debt === 1 ||
                  property.is_debt === true ||
                  property.has_debt === 1 ||
                  property.has_debt === true
                const hasTestDrive =
                  !isDebtProperty &&
                  (property.test_drive === 1 || property.testDrive === true || property.test_drive === true)
                const isReserved = property.is_reserved === true || property.is_reserved === 1
                const hasBuyNowPrice = hasBuyNowOption(property)
                
                // Проверяем, закончился ли таймер
                const checkTimerExpired = () => {
                  if (hasTestTimer && property.test_timer_end_date) {
                    const now = new Date().getTime();
                    const end = new Date(property.test_timer_end_date).getTime();
                    return end <= now;
                  }
                  if (property.endTime) {
                    const now = new Date().getTime();
                    const end = new Date(property.endTime).getTime();
                    return end <= now;
                  }
                  return false;
                };
                const isTimerExpired = checkTimerExpired();

                // Зеленый линейный таймер (PropertyTimer)
                const greenTimerBlock = hasTimer && !isReserved && !hasTestTimer && (
                  <div className="property-timer-wrapper">
                    <PropertyTimer endTime={property.endTime} compact={true} />
                  </div>
                );

                // Красный круглый таймер (CircularTimer)
                const redTimerBlock = hasTimer && !isReserved && hasTestTimer && (
                  <div className="property-timer-wrapper">
                    <CircularTimer 
                      endTime={property.test_timer_end_date} 
                      size={isMobile ? 56 : 120} 
                      strokeWidth={isMobile ? 4 : 6} 
                    />
                  </div>
                );

                return (
            <div 
              key={property.id} 
              className="property-card"
              onClick={(e) => {
                // Проверяем, что клик не по кнопке или ссылке
                if (e.target.closest('button') || e.target.closest('a')) {
                  return
                }
                console.log('Navigating to property:', property.id)
                navigate(`/property/${property.id}`, {
                  state: { property }
                })
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="property-link">
                <div className="property-image-container">
                  <img 
                    src={propertyImage} 
                    alt={propertyTitle}
                    className="property-image"
                  />
                  {isReserved && (
                    <div className="property-reserved-overlay">
                      <div className="reserved-overlay-icon">🔒</div>
                      <div className="reserved-overlay-text">{t('reserved')}</div>
                    </div>
                  )}
                  {(hasBuyNowPrice || hasTestDrive) && (
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
                            navigate(`/property/${property.id}`, {
                              state: { property }
                            })
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
                            navigate(`/property/${property.id}`, {
                              state: { property }
                            })
                          }}
                        >
                          <span>{t('testDrive')}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <button 
                    className={`property-favorite ${favorites.has(property.id) ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      
                      // Проверяем авторизацию через Clerk или старую систему
                      const isClerkAuth = user && userLoaded
                      const isOldAuth = isAuthenticated()
                      const isFavorite = favorites.has(property.id)
                      
                      // Разрешаем удаление из избранного без авторизации, но добавление требует авторизации
                      if (!isFavorite && !isClerkAuth && !isOldAuth) {
                        showNotification(t('loginToAddFavorites'))
                        return
                      }
                      
                      const newFavorites = new Set(favorites)
                      
                      if (isFavorite) {
                        newFavorites.delete(property.id)
                      } else {
                        newFavorites.add(property.id)
                      }
                      setFavorites(newFavorites)
                      
                      // Сохраняем в localStorage в формате, совместимом с MainPage
                      const savedFavorites = localStorage.getItem('favoriteProperties')
                      let favoritesMap = new Map()
                      if (savedFavorites) {
                        try {
                          const parsed = JSON.parse(savedFavorites)
                          favoritesMap = new Map(Object.entries(parsed))
                        } catch (e) {
                          console.error('Ошибка:', e)
                        }
                      }
                      favoritesMap.set(`property-${property.id}`, !isFavorite)
                      const obj = Object.fromEntries(favoritesMap)
                      localStorage.setItem('favoriteProperties', JSON.stringify(obj))
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path 
                        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        fill={favorites.has(property.id) ? "currentColor" : "none"}
                      />
                    </svg>
                  </button>
                </div>
                <div className="property-content">
                  {isMobile ? (
                    <>
                      {greenTimerBlock}
                      <h3 className="property-title">{propertyTitle}</h3>
                      {redTimerBlock}
                    </>
                  ) : (
                    <>
                      {greenTimerBlock}
                      {redTimerBlock}
                      <h3 className="property-title">{propertyTitle}</h3>
                    </>
                  )}
                  {!hasTimer && property.description && (
                    <p className="property-description">{property.description}</p>
                  )}
                  <p className="property-location">{property.location || ''}</p>
                  
                  {/* Обертка для данных, закрепленных снизу */}
                  <div className="property-content-bottom">
                    {/* Основные характеристики для аукционных карточек - в стиле личного кабинета продавца */}
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
                        <span className="bid-value">{formatPrice(property.currentBid || property.price || 0)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="property-price">{formatPrice(property.price || 0)}</div>
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
                    <div className="property-actions" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="btn btn-primary btn-liquid-glass"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          navigate(`/property/${property.id}`, {
                            state: { property }
                          })
                        }}
                        disabled={isReserved}
                        style={{
                          opacity: isReserved ? 0.5 : 1,
                          cursor: isReserved ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {isReserved ? t('objectReserved') : t('placeBid')}
                      </button>
                      {hasBuyNowPrice && (
                        <button 
                          className="btn btn-buy-now btn-liquid-glass-buy"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (isReserved) {
                              showNotification(t('objectReservedNotification'))
                              return
                            }
                            navigate(`/property/${property.id}`, {
                              state: { property }
                            })
                          }}
                          disabled={isReserved}
                          style={{
                            opacity: isReserved ? 0.5 : 1,
                            cursor: isReserved ? 'not-allowed' : 'pointer'
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

            {filteredProperties.length > visibleCount && (
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

      {isSearchModalOpen && (
        <PropertySearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
        />
      )}
    </section>
    </>
  )
}

export default PropertyList

