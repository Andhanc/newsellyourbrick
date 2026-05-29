import { useState, useEffect, useRef, useMemo } from 'react'
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
import PropertySearchModal from './PropertySearchModal'
import { PropertyListingSkeletonGrid } from './PropertyListingSkeletonGrid'
import { AuctionMobileListingSkeleton, readAuctionMobileViewMode } from './AuctionMobileListingSkeleton'
import AuctionMobileLayout from './ui/AuctionMobileLayout'
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
import { getPropertyDetailPath, auctionListingDedupeKey } from '../utils/propertyDetailUrl'
import { isPrivateClubAuctionLot } from '../utils/isPrivateClubAuctionLot'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import './PropertyList.css'

const MOBILE_BREAKPOINT = 768

const PROPERTY_FILTER_ITEMS = [
  { kind: 'type', value: 'все', labelKey: 'propertyTypeAll' },
  { kind: 'type', value: 'квартира', labelKey: 'propertyTypeFlat' },
  { kind: 'type', value: 'апартаменты', labelKey: 'propertyTypeApartment' },
  { kind: 'type', value: 'вилла', labelKey: 'propertyTypeVilla' },
  { kind: 'type', value: 'дом', labelKey: 'propertyTypeHouse' },
  { kind: 'sale', value: 'buy_now', labelKey: 'buyNowSectionTitle' },
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
  const [propertyType, setPropertyType] = useState('все')
  const [saleFilter, setSaleFilter] = useState('all')
  const [tooltip, setTooltip] = useState({ show: false, text: '', x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT)
  const [mobileAuctionTypesOpen, setMobileAuctionTypesOpen] = useState(false)
  const searchFiltersBarRef = useRef(null)

  useEffect(() => {
    if (!isMobile || location.pathname !== '/auction' || !mobileAuctionTypesOpen) return
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
  
  // Читаем параметры из URL при загрузке и прокручиваем к объектам
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const category = searchParams.get('category')
    const filter = searchParams.get('filter')
    
    const normalizedCategory = normalizeCategoryFromUrl(category)
    if (normalizedCategory) setPropertyType(normalizedCategory)
    
    // Применяем фильтр типа продажи (аукцион / купить сейчас)
    if (filter === 'auction') {
      setSaleFilter('auction')
    } else if (filter === 'buy_now') {
      setSaleFilter('buy_now')
    } else if (filter === 'ended') {
      setSaleFilter('ended')
    } else {
      setSaleFilter('all')
    }
    
    // Прокрутка к блоку объектов при фильтре категории или «Купить сейчас»
    if (location.search.includes('category=') || filter === 'buy_now' || filter === 'ended') {
      setTimeout(() => {
        const element = document.getElementById('properties-grid')
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 300) // Небольшая задержка для применения фильтров
    }
  }, [location.search])
  const [visibleCount, setVisibleCount] = useState(9)

  const isPropertyLiked = (property) =>
    isFavorite(property, hasDbBackedProperty(property) ? undefined : 'property')

  const formatPrice = (price, currency = 'USD') =>
    formatPropertyPrice(price, currency, { compact: true })

  const isAuctionEnded = (property) => isAuctionListingEnded(property)

  // Используем переданные аукционные объявления или статические данные
  const propertiesToUse = auctionProperties || properties

  /** На /auction раз в секунду пересчитываем «таймер истёк» и сортировку (завершённые в конец) */
  const [auctionNowTick, setAuctionNowTick] = useState(0)
  useEffect(() => {
    if (location.pathname !== '/auction') return undefined
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
          'квартира': ['apartment', 'flat'],
          // Исторически "Apartment" из ссылок главной может приходить в обе модели: apartment/commercial.
          'апартаменты': ['commercial', 'apartment'],
          'вилла': ['villa'],
          'дом': ['house', 'townhouse']
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
    if (saleFilter === 'ended' && !isAuctionEnded(property)) {
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

    if (location.pathname !== '/auction') return list

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
    propertyType,
    saleFilter,
    searchQuery,
    auctionNowTick,
  ])

  useEffect(() => {
    setVisibleCount(9)
  }, [searchQuery, propertyType, saleFilter])

  const isAuctionPage = location.pathname === '/auction'
  const isAuctionMobileFilters = isMobile && isAuctionPage

  const handleFavoriteToggle = (property, e) => {
    e.preventDefault()
    e.stopPropagation()
    const mockCat = hasDbBackedProperty(property) ? null : 'property'
    return toggleFavorite(property, mockCat || 'property')
  }

  const openProperty = (property) => {
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
    navigate(getPropertyDetailPath(property.id, { property }), {
      state: { property },
    })
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
        }`}
      >
        <div className="property-list-container">
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
          ref={searchFiltersBarRef}
          className={`search-filters-bar${
            isAuctionMobileFilters ? ' search-filters-bar--auction-mobile' : ''
          }${
            isAuctionMobileFilters
              ? mobileAuctionTypesOpen
                ? ' search-filters-bar--types-expanded'
                : ' search-filters-bar--types-collapsed'
              : ''
          }`}
        >
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
                      ? propertyType === item.value
                        ? 'active'
                        : ''
                      : saleFilter === item.value
                        ? 'active'
                        : ''
                  }`}
                  onClick={() => {
                    if (item.kind === 'type') {
                      setPropertyType(item.value)
                      setSaleFilter('all')
                    } else {
                      setSaleFilter(item.value)
                      setPropertyType('все')
                    }
                  }}
                >
                  {t(item.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
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
                <AuctionMobileLayout
                  properties={filteredProperties.slice(0, visibleCount)}
                  formatPrice={formatPrice}
                  isFavorite={isPropertyLiked}
                  onFavoriteToggle={handleFavoriteToggle}
                  viewerHasVip={viewerHasVip}
                />
              </div>
            ) : (
            <div id="properties-grid" className="properties-grid">
              {filteredProperties.slice(0, visibleCount).map((property) => {
                const propertyTitle = property.title || property.name || ''
                const propertyImage = getPropertyCardImage(
                  property,
                  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
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
                  location.pathname === '/auction' &&
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
                      openProperty(property)
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

