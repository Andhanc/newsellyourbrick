import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { properties } from '../data/properties'
import PropertyDetailClassic from './PropertyDetailClassic'
import LoginModal from '../components/LoginModal'
import { isAuthenticated, getUserData } from '../services/authService'
import { getEffectiveAuctionEndTime } from '../utils/auctionReminderBounds'
import {
  getPreviousInternalRoutePath,
  isSafePropertyEntryPath,
  setPropertyEntryFrom,
} from '../utils/propertyNavigation'
import { normalizePropertyMediaFields } from '../utils/propertyImage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function normalizePropertyDetailType(prop) {
  if (!prop) return 'apartment'
  return prop.property_type || prop.propertyType || 'apartment'
}

/** Для напоминаний об аукционе и избранного: всегда непустой source_table */
function resolveSourceTableForDetail(prop) {
  if (!prop) return 'properties_apartments'
  const raw =
    prop.source_table != null && String(prop.source_table).trim() !== ''
      ? String(prop.source_table).trim()
      : null
  if (raw) return raw
  const pt = normalizePropertyDetailType(prop)
  return pt === 'house' || pt === 'villa' ? 'properties_houses' : 'properties_apartments'
}

// Обёртка над страницей объекта:
// Теперь используем единый «классический» layout PropertyDetailClassic
// Для аукционных объектов внутри него отображаются:
// - таймер аукциона
// - блок с аукционной информацией и кнопкой «История ставок»
const PropertyDetailPage = () => {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const [property, setProperty] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  // Получаем объект из state (если передан из MainPage)
  const propertyFromState = location.state?.property
  const initializedFromStateRef = useRef(false)

  useEffect(() => {
    const fromState = location.state?.from
    if (isSafePropertyEntryPath(fromState)) {
      setPropertyEntryFrom(fromState)
      return
    }
    const currentPath = `${location.pathname}${location.search || ''}`
    const previousPath = getPreviousInternalRoutePath(currentPath)
    if (isSafePropertyEntryPath(previousPath)) {
      setPropertyEntryFrom(previousPath)
    }
  }, [location.pathname, location.search, location.state])
  
  useEffect(() => {
    const loadProperty = async () => {
      // Если объект передан из state, используем его один раз как начальные данные
      if (propertyFromState && !initializedFromStateRef.current) {
        setProperty({
          ...propertyFromState,
          source_table: resolveSourceTableForDetail(propertyFromState),
        })
        initializedFromStateRef.current = true
      }
 
      // Загружаем из API (всегда загружаем актуальные данные, включая резервацию)
      if (id) {
        try {
          setIsLoading(true)
          console.log(`🔍 PropertyDetailPage: Загрузка данных объекта ID=${id}`);
          const lang = (i18n.language || 'ru').split('-')[0]
          const response = await fetch(`${API_BASE_URL}/properties/${id}?lang=${lang}`)
          if (response.ok) {
            const result = await response.json()
            console.log('📥 PropertyDetailPage - Ответ от API:', result)
            console.log('📥 PropertyDetailPage - Данные о резервации из API:', {
              is_reserved: result.data?.is_reserved,
              reserved_until: result.data?.reserved_until,
              reserved_by: result.data?.reserved_by
            });
            if (result.success && result.data) {
              const prop = result.data
              console.log('📥 PropertyDetailPage - Данные объекта (prop) - ВСЕ ПОЛЯ:', prop)
              console.log('📥 PropertyDetailPage - Ключевые поля из API:', {
                rooms: prop.rooms,
                bedrooms: prop.bedrooms,
                bathrooms: prop.bathrooms,
                area: prop.area,
                living_area: prop.living_area,
                floor: prop.floor,
                total_floors: prop.total_floors,
                year_built: prop.year_built,
                building_type: prop.building_type,
                balcony: prop.balcony,
                parking: prop.parking,
                elevator: prop.elevator,
                price: prop.price,
                auction_starting_price: prop.auction_starting_price,
                test_drive: prop.test_drive,
                test_drive_type: typeof prop.test_drive,
              })
              console.log('📥 PropertyDetailPage - Все поля из API:', {
                rooms: prop.rooms,
                bedrooms: prop.bedrooms,
                bathrooms: prop.bathrooms,
                area: prop.area,
                living_area: prop.living_area,
                floor: prop.floor,
                total_floors: prop.total_floors,
                year_built: prop.year_built,
                building_type: prop.building_type,
                balcony: prop.balcony,
                parking: prop.parking,
                elevator: prop.elevator,
                garage: prop.garage,
                pool: prop.pool,
                garden: prop.garden,
                electricity: prop.electricity,
                internet: prop.internet,
                security: prop.security,
                furniture: prop.furniture,
                price: prop.price,
                auction_starting_price: prop.auction_starting_price,
              })
              console.log('📥 PropertyDetailPage - Координаты (raw):', prop.coordinates, typeof prop.coordinates)
              
              // Обрабатываем фотографии (включая legacy форматы photos/images)
              const { image: normalizedImage, images: normalizedImages } = normalizePropertyMediaFields(prop)
              let processedImages = normalizedImages
              
              // Если нет фотографий, используем дефолтное изображение
              if (processedImages.length === 0) {
                processedImages = normalizedImage
                  ? [normalizedImage]
                  : ['https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80']
              }
              
              // Обрабатываем видео
              let processedVideos = []
              if (prop.videos && Array.isArray(prop.videos) && prop.videos.length > 0) {
                const normalizeVideo = (video) => {
                  const url = typeof video === 'string' ? video : (video && (video.url || video.embedUrl))
                  if (!url) return video
                  const urlStr = String(url).trim()
                  const youtubeMatch = urlStr.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
                  if (youtubeMatch) {
                    return { type: 'youtube', videoId: youtubeMatch[1], url: urlStr }
                  }
                  const driveMatch = urlStr.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
                  if (driveMatch) {
                    return { type: 'googledrive', videoId: driveMatch[1], url: urlStr }
                  }
                  const driveOpenMatch = urlStr.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/)
                  if (driveOpenMatch) {
                    return { type: 'googledrive', videoId: driveOpenMatch[1], url: urlStr }
                  }
                  return typeof video === 'object' && video ? { type: 'file', url: urlStr, ...video } : { type: 'file', url: urlStr }
                }
                processedVideos = prop.videos.map(video => normalizeVideo(video)).filter(Boolean)
              }
              
              // Обрабатываем координаты
              let coordinates = [53.9045, 27.5615] // Дефолтные координаты (Минск)
              if (prop.coordinates) {
                try {
                  if (typeof prop.coordinates === 'string') {
                    const parsed = JSON.parse(prop.coordinates)
                    if (Array.isArray(parsed) && parsed.length >= 2) {
                      const lat = parseFloat(parsed[0])
                      const lng = parseFloat(parsed[1])
                      // Проверяем, что координаты валидны (широта: -90 до 90, долгота: -180 до 180)
                      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                        coordinates = [lat, lng]
                      } else {
                        console.warn('⚠️ Некорректные координаты:', { lat, lng })
                      }
                    }
                  } else if (Array.isArray(prop.coordinates) && prop.coordinates.length >= 2) {
                    const lat = parseFloat(prop.coordinates[0])
                    const lng = parseFloat(prop.coordinates[1])
                    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                      coordinates = [lat, lng]
                    } else {
                      console.warn('⚠️ Некорректные координаты:', { lat, lng })
                    }
                  }
                } catch (e) {
                  console.warn('Ошибка парсинга coordinates:', e)
                }
              }
              
              console.log('📍 Координаты объекта:', {
                raw: prop.coordinates,
                processed: coordinates,
                location: prop.location
              })
              
              const pt = normalizePropertyDetailType(prop)

              /** Поля аукциона/тест-таймера для getEffectiveAuctionEndTime и PropertyDetailClassic (должны совпадать с ответом API). */
              const testTimerDurationRaw = prop.test_timer_duration
              const testTimerDuration =
                testTimerDurationRaw != null && testTimerDurationRaw !== ''
                  ? Number(testTimerDurationRaw)
                  : null
              const testTimerDurationNorm =
                testTimerDuration != null && Number.isFinite(testTimerDuration) ? testTimerDuration : null

              const auctionContextForEndTime = {
                ...prop,
                test_timer_end_date: prop.test_timer_end_date || null,
                test_timer_duration: testTimerDurationNorm,
                auction_end_date: prop.auction_end_date || null,
                auction_start_date: prop.auction_start_date || null,
                buy_now_winner_user_id: prop.buy_now_winner_user_id ?? null,
                buy_now_completed_at: prop.buy_now_completed_at ?? null,
              }

              // Преобразуем данные из базы в формат для компонентов
              const formattedProperty = {
                id: prop.id,
                title: prop.title,
                name: prop.title,
                description: prop.description || '',
                location: prop.location || '',
                price: prop.price || 0, // Минимальная цена продажи
                currentBid: prop.auction_starting_price || prop.price || 0, // Для аукционов - стартовая ставка
                area: (prop.area !== undefined && prop.area !== null) ? prop.area : 0,
                sqft: (prop.area !== undefined && prop.area !== null) ? prop.area : 0,
                living_area: (prop.living_area !== undefined && prop.living_area !== null && prop.living_area !== '') ? prop.living_area : null,
                livingArea: (prop.living_area !== undefined && prop.living_area !== null && prop.living_area !== '') ? prop.living_area : null,
                rooms: (prop.rooms !== undefined && prop.rooms !== null) ? prop.rooms : ((prop.bedrooms !== undefined && prop.bedrooms !== null) ? prop.bedrooms : 0),
                beds: (prop.bedrooms !== undefined && prop.bedrooms !== null) ? prop.bedrooms : ((prop.rooms !== undefined && prop.rooms !== null) ? prop.rooms : 0),
                bedrooms: (prop.bedrooms !== undefined && prop.bedrooms !== null && prop.bedrooms !== '') ? prop.bedrooms : null,
                bathrooms: (prop.bathrooms !== undefined && prop.bathrooms !== null) ? prop.bathrooms : ((prop.baths !== undefined && prop.baths !== null) ? prop.baths : 0),
                baths: (prop.baths !== undefined && prop.baths !== null) ? prop.baths : ((prop.bathrooms !== undefined && prop.bathrooms !== null) ? prop.bathrooms : 0),
                floor: (prop.floor !== undefined && prop.floor !== null) ? prop.floor : null,
                total_floors: (prop.total_floors !== undefined && prop.total_floors !== null) ? prop.total_floors : null,
                year_built: (prop.year_built !== undefined && prop.year_built !== null) ? prop.year_built : null,
                property_type: pt,
                source_table: resolveSourceTableForDetail(prop),
                building_type: (prop.building_type !== undefined && prop.building_type !== null && prop.building_type !== '') ? prop.building_type : null,
                buildingType: (prop.building_type !== undefined && prop.building_type !== null && prop.building_type !== '') ? prop.building_type : null,
                coordinates: coordinates,
                images: processedImages,
                videos: processedVideos,
                // Дополнительные характеристики - проверяем разные форматы (сохраняем исходные значения из БД)
                balcony: prop.balcony === 1 || prop.balcony === true || prop.balcony === '1' || prop.balcony === 'true',
                parking: prop.parking === 1 || prop.parking === true || prop.parking === '1' || prop.parking === 'true',
                elevator: prop.elevator === 1 || prop.elevator === true || prop.elevator === '1' || prop.elevator === 'true',
                land_area: prop.land_area || null,
                garage: prop.garage === 1 || prop.garage === true || prop.garage === '1' || prop.garage === 'true',
                pool: prop.pool === 1 || prop.pool === true || prop.pool === '1' || prop.pool === 'true',
                garden: prop.garden === 1 || prop.garden === true || prop.garden === '1' || prop.garden === 'true',
                renovation: prop.renovation || null,
                condition: prop.condition || null,
                heating: prop.heating || null,
                water_supply: prop.water_supply || null,
                sewerage: prop.sewerage || null,
                electricity: prop.electricity === 1 || prop.electricity === true || prop.electricity === '1' || prop.electricity === 'true',
                internet: prop.internet === 1 || prop.internet === true || prop.internet === '1' || prop.internet === 'true',
                security: prop.security === 1 || prop.security === true || prop.security === '1' || prop.security === 'true',
                furniture: prop.furniture === 1 || prop.furniture === true || prop.furniture === '1' || prop.furniture === 'true',
                commercial_type: prop.commercial_type || null,
                business_hours: prop.business_hours || null,
                currency: prop.currency || 'USD',
                // Тест-драйв (флаг и удобное булево поле) — отключаем для объектов с долгами
                test_drive: !(
                  prop.sale_type === 'debt' ||
                  prop.is_debt === 1 ||
                  prop.is_debt === true ||
                  prop.has_debt === 1 ||
                  prop.has_debt === true
                ) && (prop.test_drive === 1 || prop.test_drive === true || prop.test_drive === '1' || prop.test_drive === 'true'),
                testDrive: !(
                  prop.sale_type === 'debt' ||
                  prop.is_debt === 1 ||
                  prop.is_debt === true ||
                  prop.has_debt === 1 ||
                  prop.has_debt === true
                ) && (prop.test_drive === 1 || prop.test_drive === true || prop.test_drive === '1' || prop.test_drive === 'true'),
                is_auction:
                  prop.is_auction === 1 ||
                  prop.is_auction === true ||
                  prop.is_auction === '1' ||
                  prop.is_auction === 'true',
                auction_start_date: prop.auction_start_date || null,
                auction_end_date: prop.auction_end_date || null,
                auction_starting_price: prop.auction_starting_price || null,
                endTime: getEffectiveAuctionEndTime(auctionContextForEndTime),
                test_timer_end_date: prop.test_timer_end_date || null,
                test_timer_duration: testTimerDurationNorm,
                buy_now_winner_user_id: prop.buy_now_winner_user_id ?? null,
                buy_now_completed_at: prop.buy_now_completed_at ?? null,
                additional_amenities: prop.additional_amenities || null,
                // Информация о продавце
                seller: prop.first_name && prop.last_name 
                  ? `${prop.first_name} ${prop.last_name}` 
                  : 'Продавец',
                sellerEmail: prop.email || null,
                sellerPhone: prop.phone_number || null,
                // Документы
                ownership_document: prop.ownership_document || null,
                no_debts_document: prop.no_debts_document || null,
                additional_documents: prop.additional_documents || null,
                // Тип сделки и флаги долга
                sale_type: prop.sale_type || null,
                is_debt: prop.is_debt,
                has_debt: prop.has_debt,
                debt_severity: prop.debt_severity || null,
                debt_utilities: prop.debt_utilities,
                debt_mortgage_pledge: prop.debt_mortgage_pledge,
                debt_property_taxes: prop.debt_property_taxes,
                debt_arrest: prop.debt_arrest,
                debt_inherited: prop.debt_inherited,
                debt_third_party: prop.debt_third_party,
                // Резервация
                is_reserved: prop.is_reserved === true || prop.is_reserved === 1 || prop.is_reserved === 'true' || false,
                reserved_until: prop.reserved_until || null,
                reserved_by: prop.reserved_by || null,
                reservation_time_remaining: prop.reservation_time_remaining || null,
              }
              
              console.log('📥 PropertyDetailPage - Данные о резервации:', {
                is_reserved: formattedProperty.is_reserved,
                reserved_until: formattedProperty.reserved_until,
                reserved_by: formattedProperty.reserved_by
              });
              
              console.log('✅ Загружено объявление:', {
                id: formattedProperty.id,
                title: formattedProperty.title,
                price: formattedProperty.price,
                currency: formattedProperty.currency,
                is_auction: formattedProperty.is_auction,
                auction_end_date: formattedProperty.auction_end_date,
                images_count: formattedProperty.images.length,
                coordinates: formattedProperty.coordinates,
                coordinates_type: typeof formattedProperty.coordinates,
                coordinates_is_array: Array.isArray(formattedProperty.coordinates),
                amenities: {
                  balcony: formattedProperty.balcony,
                  parking: formattedProperty.parking,
                  elevator: formattedProperty.elevator,
                  garage: formattedProperty.garage,
                  pool: formattedProperty.pool,
                  garden: formattedProperty.garden,
                  electricity: formattedProperty.electricity,
                  internet: formattedProperty.internet,
                  security: formattedProperty.security,
                  furniture: formattedProperty.furniture,
                },
                raw_amenities: {
                  balcony: prop.balcony,
                  parking: prop.parking,
                  elevator: prop.elevator,
                  garage: prop.garage,
                  pool: prop.pool,
                  garden: prop.garden,
                  electricity: prop.electricity,
                  internet: prop.internet,
                  security: prop.security,
                  furniture: prop.furniture,
                }
              })
              setProperty(formattedProperty)
            } else {
              setError('Объявление не найдено')
            }
          } else {
            setError('Ошибка при загрузке объявления')
          }
        } catch (err) {
          console.error('Ошибка загрузки объявления:', err)
          setError('Ошибка при загрузке объявления')
        } finally {
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    }

    loadProperty()
  }, [id, propertyFromState])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <p>Загрузка...</p>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <p>{error || 'Объявление не найдено'}</p>
      </div>
    )
  }
  
  const searchParams = new URLSearchParams(location.search)
  const isClassicFromQuery = searchParams.get('classic') === '1'

  // Определяем, является ли объект аукционным
  const hasAuctionFlag =
    property.is_auction === true ||
    property.is_auction === 1 ||
    property.isAuction === true

  const hasEndTime =
    (property.endTime != null && property.endTime !== '') ||
    (property.test_timer_end_date != null && property.test_timer_end_date !== '') ||
    (property.auction_end_date != null && property.auction_end_date !== '')

  const hasTestCircularTimer =
    property.test_timer_end_date != null && property.test_timer_end_date !== ''

  const isAuction = (hasAuctionFlag && hasEndTime) || hasTestCircularTimer

  // Если явно запрошен классический (неаукционный) вид через ?classic=1,
  // принудительно отключаем аукционный режим
  const finalIsAuction = isClassicFromQuery ? false : isAuction

  // Проверяем, находимся ли мы в кабинете продавца (по URL или другим признакам)
  // Если пользователь пришел из кабинета продавца, показываем документы
  const isOwnerDashboard = location.pathname.includes('/owner') || 
                           document.referrer.includes('/owner') ||
                           location.state?.fromOwnerDashboard

  const handleLoginModalClose = () => {
    setIsLoginModalOpen(false)
    const userData = getUserData()
    if (!isAuthenticated() || !userData?.isLoggedIn) {
      navigate('/')
    }
  }

  // Всегда используем PropertyDetailClassic, передавая флаг аукциона
  return (
    <>
      <PropertyDetailClassic
        property={{ ...property, isAuction: finalIsAuction }}
        showDocuments={isOwnerDashboard}
        onRequireLogin={() => setIsLoginModalOpen(true)}
      />
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={handleLoginModalClose}
      />
    </>
  )
}

export default PropertyDetailPage


