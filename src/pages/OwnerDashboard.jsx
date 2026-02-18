import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FiHome, 
  FiDollarSign, 
  FiList, 
  FiTrendingUp,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiPlus,
  FiLogOut,
  FiUser,
  FiSettings,
  FiBarChart2,
  FiX,
  FiDownload,
  FiChevronDown,
  FiCalendar,
  FiDollarSign as FiDollar,
  FiClock,
  FiAlertCircle,
  FiCheck,
  FiTag
} from 'react-icons/fi'
import { MdBed, MdOutlineBathtub } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import WelcomeModal from '../components/WelcomeModal'
import QuickAddCard from '../components/QuickAddCard'
import FileUploadModal from '../components/FileUploadModal'
import PropertyCalculatorModal from '../components/PropertyCalculatorModal'
import BiddingHistoryModal from '../components/BiddingHistoryModal'
import CountrySelect, { countries as countryList } from '../components/CountrySelect'
import { getUserData, saveUserData, logout, clearUserData } from '../services/authService'
import './OwnerDashboard.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// Демонстрационные данные объявлений владельца
const mockOwnerProperties = [
  {
    id: 1,
    title: 'Lakeshore Blvd West',
    location: 'Costa Adeje, Tenerife',
    price: 797500,
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
    beds: 2,
    baths: 2,
    sqft: 2000,
    status: 'active',
    views: 1245,
    inquiries: 23,
    publishedDate: '2024-01-15'
  },
  {
    id: 2,
    title: 'Eleanor Pena Property',
    location: 'Playa de las Américas, Tenerife',
    price: 1200000,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    beds: 3,
    baths: 2,
    sqft: 1800,
    status: 'sold',
    views: 2156,
    inquiries: 45,
    publishedDate: '2023-11-20',
    soldDate: '2024-02-10',
    buyer: {
      name: 'Мария Иванова',
      email: 'maria.ivanova@example.com',
      phone: '+7 (999) 123-45-67',
      purchasePrice: 1200000
    }
  },
  {
    id: 3,
    title: 'Bessie Cooper Property',
    location: 'Los Cristianos, Tenerife',
    price: 950000,
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    beds: 2,
    baths: 1,
    sqft: 1500,
    status: 'active',
    views: 892,
    inquiries: 12,
    publishedDate: '2024-02-01'
  },
  {
    id: 4,
    title: 'Darrell Steward Property',
    location: 'Puerto de la Cruz, Tenerife',
    price: 680000,
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80',
    beds: 1,
    baths: 1,
    sqft: 1200,
    status: 'pending',
    views: 567,
    inquiries: 8,
    publishedDate: '2024-02-20'
  }
]

const OwnerDashboard = () => {
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [activeTab, setActiveTab] = useState('properties') // 'properties' или 'analytics'
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [showFileUploadModal, setShowFileUploadModal] = useState(false)
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false)
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false)
  const [isSalesExpanded, setIsSalesExpanded] = useState(false)
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false)
  const [selectedPropertyForHistory, setSelectedPropertyForHistory] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all') // 'all', 'active', 'pending', 'rejected'
  const [propertiesLoading, setPropertiesLoading] = useState(false)
  const [ownerProfile, setOwnerProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    phone: '',
    country: '',
    countryFlag: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isProfileEditing, setIsProfileEditing] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [originalProfile, setOriginalProfile] = useState(null) // Сохраняем исходные данные профиля
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false)
  const [userId, setUserId] = useState(null)
  const [userDocuments, setUserDocuments] = useState({ passport: null, passportWithFace: null })
  const [uploading, setUploading] = useState({ passport: false, passportWithFace: false })
  const passportInputRef = useRef(null)
  const passportWithFaceInputRef = useRef(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [propertyToDelete, setPropertyToDelete] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false)

  useEffect(() => {
    // Проверяем, авторизован ли владелец
    const isOwnerLoggedIn = localStorage.getItem('isOwnerLoggedIn')
    if (!isOwnerLoggedIn) {
      navigate('/')
    } else {
      // Подтягиваем данные пользователя из локального хранилища
      const userData = getUserData()
      if (userData && userData.isLoggedIn) {
        // Парсим имя из полного имени
        const fullName = userData.name || 'Пользователь'
        const nameParts = fullName.split(' ').filter(Boolean)
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        setOwnerProfile(prev => ({
          ...prev,
          firstName: firstName,
          lastName: lastName,
          email: userData.email || '',
          username: userData.username || '',
          password: '', // Пароль не храним в открытом виде
          phone: userData.phoneFormatted || userData.phone || '',
          country: userData.country || '',
          countryFlag: userData.countryFlag || ''
        }))

        // Дополнительно загружаем актуальные данные из БД (если есть ID)
        const loadFromDb = async () => {
          // Используем числовой ID из БД (из localStorage), а не Clerk ID
          const dbUserId = localStorage.getItem('userId')
          if (!dbUserId || !/^\d+$/.test(dbUserId)) return
          try {
            const response = await fetch(`${API_BASE_URL}/users/${dbUserId}`)
            if (response.ok) {
              const result = await response.json()
              if (result.success && result.data) {
                const dbUser = result.data
                // Находим флаг страны
                const selectedCountry = countryList.find(c => c.name === dbUser.country)
                setOwnerProfile(prev => ({
                  ...prev,
                  firstName: prev.firstName || dbUser.first_name || '',
                  lastName: prev.lastName || dbUser.last_name || '',
                  email: prev.email || dbUser.email || '',
                  username: prev.username || dbUser.username || '',
                  phone: prev.phone || dbUser.phone_number || '',
                  country: prev.country || dbUser.country || '',
                  countryFlag: selectedCountry ? selectedCountry.flag : prev.countryFlag || ''
                }))
              }
            }
          } catch (error) {
            console.warn('⚠️ Не удалось загрузить данные владельца из БД:', error)
          }
        }

        loadFromDb()
        
        // Загружаем статус верификации и документы
        if (userData.id) {
          setUserId(userData.id)
          // При первой загрузке проверяем непросмотренное уведомление о верификации
          checkVerificationNotification(userData.id)
          // При первой загрузке не показываем уведомление (isStatusUpdate = false)
          loadVerificationStatus(userData.id, false)
          loadUserDocuments(userData.id)
          // Загружаем объявления пользователя
          loadUserProperties(userData.id)
        }
      }

      // Показываем модальное окно приветствия при первом входе
      // Для тестирования можно временно убрать проверку hasSeenWelcome
      const hasSeenWelcome = localStorage.getItem('hasSeenWelcome')
      if (!hasSeenWelcome) {
        // Небольшая задержка для корректного рендеринга
        setTimeout(() => {
          setShowWelcomeModal(true)
        }, 100)
      }
    }
  }, [navigate])

  // Загружаем объявления пользователя
  const loadUserProperties = async (userId) => {
    if (!userId) return
    setPropertiesLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/properties/user/${userId}`)
      if (response.ok) {
        const result = await response.json()
        console.log('📥 Загружены объявления:', result.data?.length || 0)
        console.log('📥 Первое объявление (для отладки):', result.data?.[0])
        if (result.success && result.data) {
          // Преобразуем данные из базы в формат для отображения
          const formattedProperties = result.data.map(prop => {
            // Обрабатываем фотографии
            let imageUrl = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80'
            
            // Проверяем и парсим photos, если это строка
            let photosArray = prop.photos
            if (typeof photosArray === 'string') {
              try {
                photosArray = JSON.parse(photosArray)
              } catch (e) {
                console.warn('Ошибка парсинга photos:', e)
                photosArray = []
              }
            }
            
            // Если photos - массив и не пустой
            if (Array.isArray(photosArray) && photosArray.length > 0) {
              const firstPhoto = photosArray[0]
              
              // Получаем базовый URL без /api
              const baseUrl = API_BASE_URL.replace('/api', '').replace(/\/$/, '')
              
              // Обрабатываем строку (URL)
              if (typeof firstPhoto === 'string') {
                const photoStr = firstPhoto.trim()
                
                // Data URL (base64) - используем как есть
                if (photoStr.startsWith('data:')) {
                  imageUrl = photoStr
                }
                // Полный HTTP/HTTPS URL - используем как есть
                else if (photoStr.startsWith('http://') || photoStr.startsWith('https://')) {
                  imageUrl = photoStr
                }
                // Путь начинается с /uploads/ - добавляем базовый URL
                else if (photoStr.startsWith('/uploads/')) {
                  imageUrl = `${baseUrl}${photoStr}`
                }
                // Путь начинается с uploads/ без слеша - добавляем / и базовый URL
                else if (photoStr.startsWith('uploads/')) {
                  imageUrl = `${baseUrl}/${photoStr}`
                }
                // Относительный путь - добавляем /uploads/
                else {
                  imageUrl = `${baseUrl}/uploads/${photoStr}`
                }
              } 
              // Обрабатываем объект с полем url
              else if (firstPhoto && typeof firstPhoto === 'object' && firstPhoto.url) {
                const photoUrl = String(firstPhoto.url).trim()
                
                // Data URL (base64) - используем как есть
                if (photoUrl.startsWith('data:')) {
                  imageUrl = photoUrl
                }
                // Полный HTTP/HTTPS URL - используем как есть
                else if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
                  imageUrl = photoUrl
                }
                // Путь начинается с /uploads/ - добавляем базовый URL
                else if (photoUrl.startsWith('/uploads/')) {
                  imageUrl = `${baseUrl}${photoUrl}`
                }
                // Путь начинается с uploads/ без слеша - добавляем / и базовый URL
                else if (photoUrl.startsWith('uploads/')) {
                  imageUrl = `${baseUrl}/${photoUrl}`
                }
                // Относительный путь - добавляем /uploads/
                else {
                  imageUrl = `${baseUrl}/uploads/${photoUrl}`
                }
              }
              
              console.log('🖼️ Обработано фото для объявления:', prop.id, 'URL длина:', imageUrl.length, 'начинается с:', imageUrl.substring(0, 50))
            } else {
              console.warn('⚠️ Нет фотографий для объявления:', prop.id, 'photos:', prop.photos, 'photosArray:', photosArray)
            }
            
            // Для домов/вилл используем bedrooms, для квартир/апартаментов - rooms
            const isHouseOrVilla = prop.property_type === 'house' || prop.property_type === 'villa'
            const beds = isHouseOrVilla 
              ? (prop.bedrooms || 0)
              : (prop.bedrooms || prop.rooms || 0)
            
            return {
            id: prop.id,
            title: prop.title || 'Без названия',
            location: prop.location || 'Не указано',
            price: prop.price || 0,
            image: imageUrl,
            beds: beds,
            baths: prop.bathrooms || 0,
            sqft: prop.area || 0,
            property_type: prop.property_type || 'apartment',
            land_area: prop.land_area || null,
            bedrooms: prop.bedrooms || null,
            floors: prop.floors || prop.total_floors || null,
            status: prop.moderation_status === 'approved' ? 'active' : 
                   prop.moderation_status === 'pending' ? 'pending' : 
                   prop.moderation_status === 'rejected' ? 'rejected' : 'pending',
            moderationStatus: prop.moderation_status, // Сохраняем оригинальный статус
            views: 0, // TODO: добавить подсчет просмотров
            inquiries: 0, // TODO: добавить подсчет запросов
            publishedDate: prop.created_at || new Date().toISOString(),
            rejectionReason: prop.rejection_reason || null,
            isAuction: prop.is_auction === 1 || prop.is_auction === true || prop.is_auction === '1' || prop.is_auction === 'true'
          }
          })
          setProperties(formattedProperties)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки объявлений:', error)
    } finally {
      setPropertiesLoading(false)
    }
  }

  // Сохраняем предыдущий статус верификации для отслеживания изменений
  const previousVerificationStatus = useRef(false)
  const hasCheckedNotification = useRef(false)

  // Проверяем непросмотренное уведомление о верификации
  const checkVerificationNotification = async (userId) => {
    if (!userId || hasCheckedNotification.current) return
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/user/${userId}/unread`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          // Ищем непросмотренное уведомление о верификации
          const verificationNotif = result.data.find(
            n => n.type === 'verification_success' && n.view_count === 0
          )
          if (verificationNotif) {
            // Показываем уведомление только если есть непросмотренное уведомление
            setShowVerificationSuccess(true)
            // Автоматически скрываем уведомление через 5 секунд
            setTimeout(() => {
              setShowVerificationSuccess(false)
            }, 5000)
            // Отмечаем уведомление как просмотренное
            try {
              await fetch(`${API_BASE_URL}/notifications/${verificationNotif.id}/view`, {
                method: 'PUT'
              })
            } catch (err) {
              console.warn('Не удалось отметить уведомление как просмотренное:', err)
            }
          }
          hasCheckedNotification.current = true
        }
      }
    } catch (error) {
      console.error('Ошибка проверки уведомлений:', error)
    }
  }

  // Загружаем статус верификации
  const loadVerificationStatus = async (userId, isStatusUpdate = false) => {
    if (!userId) return
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/verification-status`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const status = result.data
          const wasVerified = previousVerificationStatus.current
          const isNowVerified = status.isVerified
          
          setVerificationStatus(status)
          
          // Показываем уведомление только если:
          // 1. Статус изменился с неверифицированного на верифицированный (при событии обновления)
          // 2. Это означает, что администратор только что одобрил пользователя
          if (isStatusUpdate && isNowVerified && !wasVerified) {
            setShowVerificationSuccess(true)
            // Автоматически скрываем уведомление через 5 секунд
            setTimeout(() => {
              setShowVerificationSuccess(false)
            }, 5000)
          }
          
          // Обновляем предыдущий статус
          previousVerificationStatus.current = isNowVerified
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки статуса верификации:', error)
    }
  }

  // Слушаем событие обновления статуса верификации (только при одобрении администратором)
  useEffect(() => {
    const handleStatusUpdate = () => {
      if (userId) {
        // При событии обновления передаем флаг isStatusUpdate = true
        loadVerificationStatus(userId, true)
      }
    }
    
    window.addEventListener('verification-status-update', handleStatusUpdate)
    return () => window.removeEventListener('verification-status-update', handleStatusUpdate)
  }, [userId])

  // Проверяем, все ли поля заполнены
  const isAllFieldsFilled = () => {
    if (!verificationStatus) return false
    // Считаем профиль "завершенным", если либо все поля заполнены и есть документы,
    // либо пользователь уже верифицирован администратором
    return (
      verificationStatus.isVerified === true ||
      (verificationStatus.isReady && verificationStatus.hasDocuments)
    )
  }

  // Обработчик кнопки "Пройти верификацию"
  const handleStartVerification = () => {
    // Закрываем панель профиля и переходим на страницу профиля покупателя
    setIsProfilePanelOpen(false)
    // Здесь можно добавить навигацию на страницу профиля, если нужно
    // navigate('/profile')
  }

  // Загружаем документы пользователя
  const loadUserDocuments = async (userId) => {
    if (!userId) return
    try {
      const response = await fetch(`${API_BASE_URL}/documents/user/${userId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const docs = result.data
          const passport = docs.find(d => d.document_type === 'passport')
          const passportWithFace = docs.find(d => d.document_type === 'passport_with_face')
          setUserDocuments({
            passport: passport || null,
            passportWithFace: passportWithFace || null
          })
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки документов пользователя:', error)
    }
  }

  // Загружаем документ
  const handleDocumentUpload = async (type, file) => {
    if (!userId) {
      alert('Ошибка: ID пользователя не найден. Пожалуйста, обновите страницу.')
      return
    }

    setUploading(prev => ({ ...prev, [type]: true }))

    try {
      const formData = new FormData()
      formData.append('document_photo', file)
      formData.append('user_id', String(userId))
      formData.append('document_type', type === 'passport' ? 'passport' : 'passport_with_face')

      console.log('📤 Загрузка документа:', {
        type,
        userId,
        fileName: file.name,
        fileSize: file.size
      })

      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          alert('Документ успешно загружен и отправлен на верификацию')
          // Обновляем состояние
          const newDoc = {
            id: data.data.id,
            document_type: data.data.document_type,
            document_photo: data.data.document_photo,
            verification_status: data.data.verification_status || 'pending',
            created_at: data.data.created_at
          }
          setUserDocuments(prev => ({
            ...prev,
            [type === 'passport' ? 'passport' : 'passportWithFace']: newDoc
          }))
          // Перезагружаем документы
          await loadUserDocuments(userId)
          // Загружаем статус верификации
          await loadVerificationStatus(userId)
          // Отправляем событие для обновления
          window.dispatchEvent(new Event('verification-status-update'))
        } else {
          alert(data.error || 'Ошибка загрузки документа')
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Неизвестная ошибка' }))
        alert(errorData.error || 'Ошибка загрузки документа')
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки документа:', error)
      alert(`Ошибка: ${error.message || 'Неизвестная ошибка'}`)
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }))
    }
  }

  // Сохраняем флаг после закрытия модального окна
  const handleWelcomeClose = () => {
    setShowWelcomeModal(false)
    localStorage.setItem('hasSeenWelcome', 'true')
  }

  const handleProfileFieldChange = (field, value) => {
    setOwnerProfile(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Проверяем, есть ли несохраненные изменения
  const hasUnsavedChanges = () => {
    if (!isProfileEditing || !originalProfile) return false
    
    // Исключаем пароль из сравнения, так как он не сохраняется в исходных данных
    const fieldsToCompare = ['firstName', 'lastName', 'email', 'username', 'phone', 'country', 'countryFlag']
    
    return fieldsToCompare.some(field => {
      return ownerProfile[field] !== originalProfile[field]
    }) || (ownerProfile.password && ownerProfile.password.trim() !== '')
  }

  // Обработчик закрытия панели профиля с проверкой изменений
  const handleCloseProfilePanel = () => {
    if (hasUnsavedChanges()) {
      const shouldClose = window.confirm(
        'У вас есть несохраненные изменения. Вы уверены, что хотите закрыть панель? Все несохраненные изменения будут потеряны.\n\n' +
        'Для сохранения изменений нажмите "Сохранить".\n' +
        'Для отмены изменений нажмите "Отмена".'
      )
      
      if (!shouldClose) {
        return // Не закрываем панель
      }
      
      // Восстанавливаем исходные данные
      if (originalProfile) {
        setOwnerProfile({ ...originalProfile, password: '' })
      }
      setIsProfileEditing(false)
      setShowPassword(false)
      setOriginalProfile(null)
    }
    
    setIsProfilePanelOpen(false)
  }


  const handleProfileSave = async () => {
    try {
      setIsSavingProfile(true)
      const userData = getUserData()

      if (!userData.id) {
        alert('Ошибка: ID пользователя не найден. Пожалуйста, войдите заново.')
        return
      }

      // Подготавливаем данные для отправки в БД
      const updateData = {
        first_name: ownerProfile.firstName || null,
        last_name: ownerProfile.lastName || null,
        email: ownerProfile.email || null,
        username: ownerProfile.username || null,
        phone_number: ownerProfile.phone || null,
        country: ownerProfile.country || null
      }
      
      // Если пароль указан, добавляем его в данные обновления
      if (ownerProfile.password && ownerProfile.password.trim() !== '') {
        updateData.password = ownerProfile.password
      }

      // Используем числовой ID из БД (из localStorage), а не Clerk ID
      const dbUserId = localStorage.getItem('userId')
      if (!dbUserId || !/^\d+$/.test(dbUserId)) {
        alert('Ошибка: ID пользователя не найден. Пожалуйста, обновите страницу.')
        console.error('userId не установлен:', dbUserId)
        return
      }

      console.log('💾 Сохранение данных профиля в БД:', {
        userId: dbUserId,
        updateData
      })

      // Обновляем данные в БД
      const response = await fetch(`${API_BASE_URL}/users/${dbUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Неизвестная ошибка' }))
        console.error('❌ Ошибка при сохранении в БД:', errorData)
        alert(`Ошибка при сохранении данных: ${errorData.error || 'Неизвестная ошибка'}`)
        return
      }

      const result = await response.json()
      
      if (!result.success) {
        console.error('❌ Сервер вернул ошибку:', result.error)
        alert(`Ошибка при сохранении данных: ${result.error || 'Неизвестная ошибка'}`)
        return
      }

      console.log('✅ Данные успешно сохранены в БД:', result.data)

      // Обновляем данные в localStorage
      const fullName = `${ownerProfile.firstName || ''} ${ownerProfile.lastName || ''}`.trim() || userData.name
      const updatedUserData = {
        ...userData,
        name: fullName,
        firstName: ownerProfile.firstName || userData.firstName,
        lastName: ownerProfile.lastName || userData.lastName,
        email: ownerProfile.email || userData.email,
        username: ownerProfile.username || userData.username,
        phone: ownerProfile.phone || userData.phone,
        phoneFormatted: ownerProfile.phone || userData.phoneFormatted,
        country: ownerProfile.country || userData.country,
        countryFlag: ownerProfile.countryFlag || userData.countryFlag
      }
      
      // Пароль не сохраняем в localStorage в открытом виде

      saveUserData(updatedUserData, userData.loginMethod || 'whatsapp')
      
      // Перезагружаем статус верификации после сохранения
      await loadVerificationStatus(dbUserId)
      
      // Отправляем событие для обновления статуса верификации
      window.dispatchEvent(new Event('verification-status-update'))
      
      // Обновляем исходные данные после успешного сохранения (до очистки пароля)
      const savedProfile = { ...ownerProfile, password: '' }
      setOriginalProfile(savedProfile)
      
      // Очищаем пароль после сохранения
      setOwnerProfile(prev => ({ ...prev, password: '' }))
      setShowPassword(false)
      
      // Выходим из режима редактирования после успешного сохранения
      setIsProfileEditing(false)
      
      alert('✅ Данные профиля успешно сохранены!')
    } catch (error) {
      console.error('❌ Ошибка при сохранении профиля владельца:', error)
      alert(`Ошибка при сохранении данных: ${error.message || 'Неизвестная ошибка'}`)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleLogout = async () => {
    if (window.confirm('Вы уверены, что хотите выйти?')) {
      try {
        // Используем функцию logout из authService для полной очистки данных
        // logout() вызывает clearUserData(), который удаляет все пользовательские данные
        await logout()
        // Перенаправляем на главную страницу
        navigate('/')
        // Небольшая задержка перед перезагрузкой, чтобы данные успели очиститься
        setTimeout(() => {
          window.location.reload()
        }, 100)
      } catch (error) {
        console.error('Ошибка при выходе:', error)
        // В случае ошибки все равно очищаем данные через clearUserData
        clearUserData()
        localStorage.removeItem('userRole')
        localStorage.removeItem('isLoggedIn')
        localStorage.removeItem('userData')
        navigate('/')
        setTimeout(() => {
          window.location.reload()
        }, 100)
      }
    }
  }

  // Статистика
  const totalProperties = properties.length
  const soldProperties = properties.filter(p => p.status === 'sold').length
  const activeProperties = properties.filter(p => p.status === 'active').length
  const pendingProperties = properties.filter(p => p.status === 'pending').length
  const rejectedProperties = properties.filter(p => p.status === 'rejected').length
  const totalRevenue = properties
    .filter(p => p.status === 'sold')
    .reduce((sum, p) => sum + (p.price || 0), 0)
  const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0)
  const totalInquiries = properties.reduce((sum, p) => sum + (p.inquiries || 0), 0)

  const handleDeleteProperty = (id) => {
    const property = properties.find(p => p.id === id)
    if (property) {
      setPropertyToDelete(property)
      setDeleteReason('')
      setShowDeleteModal(true)
    }
  }

  const handleConfirmDelete = async () => {
    if (!propertyToDelete) return
    
    if (!deleteReason.trim()) {
      alert('Пожалуйста, укажите причину удаления')
      return
    }

    setIsSubmittingDelete(true)
    try {
      const response = await fetch(`${API_BASE_URL}/properties/${propertyToDelete.id}/delete-request`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: deleteReason.trim()
        })
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        alert('Запрос на удаление отправлен на модерацию')
        // Обновляем список объявлений
        if (userId) {
          await loadUserProperties(userId)
        }
        setShowDeleteModal(false)
        setPropertyToDelete(null)
        setDeleteReason('')
      } else {
        alert(result.error || 'Ошибка при отправке запроса на удаление')
      }
    } catch (error) {
      console.error('Ошибка при отправке запроса на удаление:', error)
      alert('Ошибка при отправке запроса на удаление')
    } finally {
      setIsSubmittingDelete(false)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
    setPropertyToDelete(null)
    setDeleteReason('')
  }

  const handleEditProperty = (id) => {
    navigate(`/property/${id}/edit`)
  }

  const handleViewProperty = (id) => {
    navigate(`/property/${id}`, { state: { fromOwnerDashboard: true } })
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { text: 'Активно', class: 'status-badge--active' },
      sold: { text: 'Продано', class: 'status-badge--sold' },
      pending: { text: 'На модерации', class: 'status-badge--pending' },
      rejected: { text: 'Отклонено', class: 'status-badge--rejected' }
    }
    const config = statusConfig[status] || statusConfig.pending
    return <span className={`status-badge ${config.class}`}>{config.text}</span>
  }

  // Фильтрация объявлений по статусу
  const getFilteredProperties = () => {
    if (activeFilter === 'all') {
      return properties
    } else if (activeFilter === 'active') {
      return properties.filter(p => p.status === 'active')
    } else if (activeFilter === 'pending') {
      return properties.filter(p => p.status === 'pending')
    } else if (activeFilter === 'rejected') {
      return properties.filter(p => p.status === 'rejected')
    }
    return properties
  }

  const handleExportToExcel = () => {
    // Формируем данные для Excel отчета
    const analyticsData = []
    
    // Заголовки
    analyticsData.push([
      'Название', 
      'Локация', 
      'Цена', 
      'Спальни', 
      'Ванные', 
      'Площадь (м²)', 
      'Статус', 
      'Просмотры', 
      'Запросы', 
      'Дата публикации'
    ])
    
    // Данные по объявлениям
    properties.forEach(property => {
      const statusText = property.status === 'active' ? 'Активно' : 
                        property.status === 'sold' ? 'Продано' : 
                        'На модерации'
      
      analyticsData.push([
        property.title,
        property.location,
        property.price,
        property.beds,
        property.baths,
        property.sqft,
        statusText,
        property.views,
        property.inquiries,
        new Date(property.publishedDate).toLocaleDateString('ru-RU')
      ])
    })
    
    // Добавляем итоговую статистику
    analyticsData.push([])
    analyticsData.push(['ИТОГОВАЯ СТАТИСТИКА'])
    analyticsData.push(['Всего объявлений', totalProperties])
    analyticsData.push(['Активных объявлений', activeProperties])
    analyticsData.push(['Продано объявлений', soldProperties])
    analyticsData.push(['Всего просмотров', totalViews])
    analyticsData.push(['Всего запросов', totalInquiries])
    analyticsData.push(['Общая выручка', properties
      .filter(p => p.status === 'sold')
      .reduce((sum, p) => sum + p.price, 0)])
    analyticsData.push(['Средняя цена', 
      Math.round(properties.reduce((sum, p) => sum + p.price, 0) / totalProperties)])
    analyticsData.push(['Конверсия просмотры → запросы', 
      totalViews > 0 ? ((totalInquiries / totalViews) * 100).toFixed(1) + '%' : '0%'])
    analyticsData.push(['Конверсия запросы → продажи', 
      totalInquiries > 0 ? ((soldProperties / totalInquiries) * 100).toFixed(1) + '%' : '0%'])
    
    // Преобразуем в CSV формат
    const csvContent = analyticsData
      .map(row => row.map(cell => {
        // Экранируем кавычки и запятые
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return `"${cell.replace(/"/g, '""')}"`
        }
        return cell
      }).join(','))
      .join('\n')
    
    // Добавляем BOM для правильной кодировки в Excel
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `analytics_report_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="owner-dashboard">
      <header className="owner-dashboard__header">
        <div className="owner-dashboard__header-content">
          <div className="owner-dashboard__header-left">
            <h1 className="owner-dashboard__title">
              {`${ownerProfile.firstName || ''} ${ownerProfile.lastName || ''}`.trim() || 'Ваш кабинет продавца'}
            </h1>
            <p className="owner-dashboard__subtitle">Управление вашей недвижимостью</p>
          </div>
          <div className="owner-dashboard__header-right">
            <button 
              className="owner-dashboard__icon-btn"
              onClick={() => {
                setIsProfilePanelOpen(true)
                setIsSettingsPanelOpen(false)
              }}
              aria-label="Профиль"
            >
              <FiUser size={20} />
            </button>
            <button 
              className="owner-dashboard__icon-btn"
              onClick={() => {
                setIsSettingsPanelOpen(true)
                setIsProfilePanelOpen(false)
              }}
              aria-label="Настройки"
            >
              <FiSettings size={20} />
            </button>
            <button 
              className="owner-dashboard__add-btn"
              onClick={() => navigate('/owner/property/new')}
            >
              <FiPlus size={20} />
              <span>Добавить объявление</span>
            </button>
            <button 
              className="owner-dashboard__logout-btn"
              onClick={handleLogout}
            >
              <FiLogOut size={20} />
              <span>Выйти</span>
            </button>
          </div>
        </div>
        
        {/* Переключатель вкладок */}
        <div className="owner-dashboard__tabs">
          <button
            className={`owner-dashboard__tab ${activeTab === 'properties' ? 'owner-dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('properties')}
          >
            <FiList size={20} />
            <span>Объявления</span>
          </button>
          <button
            className={`owner-dashboard__tab ${activeTab === 'analytics' ? 'owner-dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <FiBarChart2 size={20} />
            <span>Аналитика</span>
          </button>
        </div>
      </header>

      {/* Уведомление о необходимости заполнить данные */}
      {verificationStatus && !verificationStatus.isReady && (
        <div className="owner-verification-notification">
          <div className="owner-verification-notification__content">
            <div className="owner-verification-notification__icon">
              <FiAlertCircle size={24} />
            </div>
            <div className="owner-verification-notification__text">
              <h4 className="owner-verification-notification__title">Заполните данные для верификации</h4>
              <p className="owner-verification-notification__message">
                Для прохождения верификации необходимо заполнить все поля в разделе профиля. 
                Перейдите в профиль, чтобы завершить заполнение данных.
              </p>
            </div>
            <button
              className="owner-verification-notification__button"
              onClick={() => setIsProfilePanelOpen(true)}
            >
              Перейти в профиль
            </button>
          </div>
        </div>
      )}

      {/* Уведомление об успешной верификации */}
      {showVerificationSuccess && (
        <div className="owner-verification-success">
          <div className="owner-verification-success__content">
            <div className="owner-verification-success__icon">
              <FiCheck size={24} />
            </div>
            <div className="owner-verification-success__text">
              <h4 className="owner-verification-success__title">Поздравляем!</h4>
              <p className="owner-verification-success__message">
                Ваша верификация успешно одобрена администратором. Теперь вы можете использовать все возможности платформы.
              </p>
            </div>
            <button
              className="owner-verification-success__close"
              onClick={() => setShowVerificationSuccess(false)}
            >
              <FiX size={20} />
            </button>
          </div>
        </div>
      )}

      <div className="owner-dashboard__content">
        {/* Статистика - показывается всегда */}
        <section className="owner-dashboard__stats">
          <QuickAddCard onClick={() => setShowFileUploadModal(true)} />

          <div className="stat-card stat-card--properties">
            <div className="stat-card__icon">
              <FiHome size={32} />
            </div>
            <div className="stat-card__content">
              <h3 className="stat-card__label">Всего объявлений</h3>
              <p className="stat-card__value">{totalProperties}</p>
              <p className="stat-card__subtext">Активных: {activeProperties}</p>
            </div>
          </div>

          <div className="stat-card stat-card--views">
            <div className="stat-card__icon">
              <FiEye size={32} />
            </div>
            <div className="stat-card__content">
              <h3 className="stat-card__label">Просмотры</h3>
              <p className="stat-card__value">{totalViews.toLocaleString('ru-RU')}</p>
              <p className="stat-card__subtext">Запросов: {totalInquiries}</p>
            </div>
          </div>

          <div className="stat-card stat-card--trending">
            <div className="stat-card__icon">
              <FiTrendingUp size={32} />
            </div>
            <div className="stat-card__content">
              <h3 className="stat-card__label">Средняя цена</h3>
              <p className="stat-card__value">
                ${totalProperties > 0 ? Math.round(properties.reduce((sum, p) => sum + (p.price || 0), 0) / totalProperties).toLocaleString('ru-RU') : '0'}
              </p>
              <p className="stat-card__subtext">За объект</p>
            </div>
          </div>
        </section>

        {/* Блок "Рассчитать стоимость объекта" */}
        {activeTab === 'properties' && (
          <div className="property-calculator-card">
            <div className="property-calculator-card__image">
              <img 
                src="https://t4.ftcdn.net/jpg/18/28/02/25/360_F_1828022572_oAUGr6FsgeCSUty8xFbtsj2pOwXdthho.jpg" 
                alt="Рассчитать стоимость объекта" 
              />
            </div>
            <div className="property-calculator-card__content">
              <h2 className="property-calculator-card__title">Рассчитать стоимость объекта</h2>
              <p className="property-calculator-card__description">
                Узнайте рыночную стоимость вашей недвижимости за несколько минут
              </p>
              <button 
                className="property-calculator-card__button"
                onClick={() => setIsCalculatorModalOpen(true)}
              >
                Начать расчет
              </button>
            </div>
          </div>
        )}

        {/* Контент вкладок */}
        {activeTab === 'properties' && (
          <section className="owner-dashboard__properties">
          <div className="owner-dashboard__section-header">
            <h2 className="owner-dashboard__section-title">
              <FiList size={24} />
              Мои объявления
            </h2>
            <div className="owner-dashboard__filters">
              <button 
                className={`filter-btn ${activeFilter === 'all' ? 'filter-btn--active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                Все
              </button>
              <button 
                className={`filter-btn ${activeFilter === 'active' ? 'filter-btn--active' : ''}`}
                onClick={() => setActiveFilter('active')}
              >
                Активные
              </button>
              <button 
                className={`filter-btn ${activeFilter === 'pending' ? 'filter-btn--active' : ''}`}
                onClick={() => setActiveFilter('pending')}
              >
                На модерации
              </button>
              <button 
                className={`filter-btn ${activeFilter === 'rejected' ? 'filter-btn--active' : ''}`}
                onClick={() => setActiveFilter('rejected')}
              >
                Отклонено
              </button>
            </div>
          </div>

          <div className="properties-list">
            {propertiesLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>Загрузка объявлений...</p>
              </div>
            ) : getFilteredProperties().length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>У вас пока нет объявлений</p>
              </div>
            ) : (
              getFilteredProperties().map((property) => (
              <div key={property.id} className="property-card-owner">
                <div className="property-card-owner__image">
                  <img 
                    src={property.image} 
                    alt={property.title}
                    onError={(e) => {
                      // Если изображение не загрузилось, используем дефолтное
                      e.target.src = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80'
                    }}
                  />
                  {getStatusBadge(property.status)}
                </div>

                <div className="property-card-owner__content">
                  <div className="property-card-owner__header">
                    <div className="property-card-owner__title-wrapper">
                      <h3 className="property-card-owner__title">{property.title}</h3>
                      {property.isAuction && (
                        <div className="auction-indicator">
                          <FiTag size={16} />
                          <span>Аукционный объект</span>
                        </div>
                      )}
                    </div>
                    <div className="property-card-owner__price">
                      ${property.price.toLocaleString('ru-RU')}
                    </div>
                  </div>

                  <p className="property-card-owner__location">{property.location}</p>

                  <div className="property-card-owner__info">
                    <div className="property-card-owner__info-item">
                      <MdBed size={16} />
                      <span>{property.beds}</span>
                    </div>
                    <div className="property-card-owner__info-item">
                      <MdOutlineBathtub size={16} />
                      <span>{property.baths}</span>
                    </div>
                    <div className="property-card-owner__info-item">
                      <BiArea size={16} />
                      <span>{property.sqft} м²</span>
                    </div>
                  </div>

                  <div className="property-card-owner__stats">
                    <div className="property-card-owner__stat">
                      <FiEye size={14} />
                      <span>{property.views} просмотров</span>
                    </div>
                    <div className="property-card-owner__stat">
                      <span>{property.inquiries} запросов</span>
                    </div>
                    <div className="property-card-owner__stat">
                      <span>Опубликовано: {new Date(property.publishedDate).toLocaleDateString('ru-RU')}</span>
                    </div>
                    {property.rejectionReason && !property.rejectionReason.startsWith('EDIT:') && (
                      <div className="property-card-owner__stat" style={{ color: '#ef4444', fontWeight: 500 }}>
                        <FiAlertCircle size={14} />
                        <span>Причина отклонения: {property.rejectionReason}</span>
                      </div>
                    )}
                    {property.rejectionReason && property.rejectionReason.startsWith('EDIT:') && (
                      <div className="property-card-owner__stat" style={{ color: '#0ABAB5', fontWeight: 500 }}>
                        <FiClock size={14} />
                        <span>Запрос на редактирование отправлен на модерацию</span>
                      </div>
                    )}
                  </div>

                  <div className="property-card-owner__actions">
                    {property.status === 'active' && (
                      <button
                        className="action-btn action-btn--history"
                        onClick={() => setSelectedPropertyForHistory(property)}
                      >
                        <FiClock size={16} />
                        История
                      </button>
                    )}
                    <button
                      className="action-btn action-btn--view"
                      onClick={() => handleViewProperty(property.id)}
                    >
                      <FiEye size={16} />
                      Просмотр
                    </button>
                    <button
                      className="action-btn action-btn--edit"
                      onClick={() => handleEditProperty(property.id)}
                    >
                      <FiEdit2 size={16} />
                      Редактировать
                    </button>
                    <button
                      className="action-btn action-btn--delete"
                      onClick={() => handleDeleteProperty(property.id)}
                    >
                      <FiTrash2 size={16} />
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        </section>
        )}

        {activeTab === 'analytics' && (
          <section className="owner-dashboard__analytics">
            <div className="analytics-section">
              <div className="analytics-section__header">
                <h2 className="analytics-section__title">Аналитика продаж</h2>
                <button 
                  className="analytics-section__export-btn"
                  onClick={handleExportToExcel}
                  aria-label="Получить Excel отчет"
                >
                  <FiDownload size={18} />
                  <span>Получить Excel отчет</span>
                </button>
              </div>
              
              <div className="analytics-grid">
                <div className="analytics-card">
                  <h3 className="analytics-card__title">Динамика продаж</h3>
                  <div className="analytics-chart">
                    <div className="chart-placeholder">
                      <p>График динамики продаж</p>
                      <div className="chart-bars">
                        <div className="chart-bar" style={{ height: '60%' }}></div>
                        <div className="chart-bar" style={{ height: '80%' }}></div>
                        <div className="chart-bar" style={{ height: '45%' }}></div>
                        <div className="chart-bar" style={{ height: '90%' }}></div>
                        <div className="chart-bar" style={{ height: '70%' }}></div>
                        <div className="chart-bar" style={{ height: '85%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="analytics-card">
                  <h3 className="analytics-card__title">Топ объявления</h3>
                  <div className="top-properties">
                    {properties
                      .sort((a, b) => b.views - a.views)
                      .slice(0, 3)
                      .map((property, index) => (
                        <div key={property.id} className="top-property-item">
                          <div className="top-property-item__rank">#{index + 1}</div>
                          <div className="top-property-item__content">
                            <h4 className="top-property-item__title">{property.title}</h4>
                            <p className="top-property-item__stats">
                              {property.views} просмотров · {property.inquiries} запросов
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="analytics-card">
                  <h3 className="analytics-card__title">Конверсия</h3>
                  <div className="conversion-stats">
                    <div className="conversion-item">
                      <span className="conversion-item__label">Просмотры → Запросы</span>
                      <span className="conversion-item__value">
                        {totalViews > 0 ? ((totalInquiries / totalViews) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="conversion-item">
                      <span className="conversion-item__label">Запросы → Продажи</span>
                      <span className="conversion-item__value">
                        {totalInquiries > 0 ? ((soldProperties / totalInquiries) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="conversion-item">
                      <span className="conversion-item__label">Общая конверсия</span>
                      <span className="conversion-item__value">
                        {totalViews > 0 ? ((soldProperties / totalViews) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Блоки "Статистика по статусам" и "Мои продажи" в одной линии */}
              <div className="analytics-bottom-row">
                <div className="analytics-card analytics-card--half">
                  <h3 className="analytics-card__title">Статистика по статусам</h3>
                  <div className="status-stats">
                    <div className="status-stat-item">
                      <div className="status-stat-item__indicator status-stat-item__indicator--active"></div>
                      <div className="status-stat-item__content">
                        <span className="status-stat-item__label">Активные</span>
                        <span className="status-stat-item__value">{activeProperties}</span>
                      </div>
                    </div>
                    <div className="status-stat-item">
                      <div className="status-stat-item__indicator status-stat-item__indicator--sold"></div>
                      <div className="status-stat-item__content">
                        <span className="status-stat-item__label">Продано</span>
                        <span className="status-stat-item__value">{soldProperties}</span>
                      </div>
                    </div>
                    <div className="status-stat-item">
                      <div className="status-stat-item__indicator status-stat-item__indicator--pending"></div>
                      <div className="status-stat-item__content">
                        <span className="status-stat-item__label">На модерации</span>
                        <span className="status-stat-item__value">{pendingProperties}</span>
                      </div>
                    </div>
                    <div className="status-stat-item">
                      <div className="status-stat-item__indicator status-stat-item__indicator--rejected"></div>
                      <div className="status-stat-item__content">
                        <span className="status-stat-item__label">Отклонено</span>
                        <span className="status-stat-item__value">{rejectedProperties}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Блок "Мои продажи" */}
                <div className="my-sales-card my-sales-card--inline">
                  <button 
                  className="my-sales-card__header"
                  onClick={() => setIsSalesExpanded(!isSalesExpanded)}
                  aria-expanded={isSalesExpanded}
                >
                  <h3 className="my-sales-card__title">Мои продажи</h3>
                  <FiChevronDown 
                    size={24} 
                    className={`my-sales-card__icon ${isSalesExpanded ? 'my-sales-card__icon--expanded' : ''}`}
                  />
                  </button>
                  
                  {isSalesExpanded && (
                    <div className="my-sales-card__content">
                    {properties.filter(p => p.status === 'sold' && p.buyer).length > 0 ? (
                      <div className="sales-list">
                        {properties
                          .filter(p => p.status === 'sold' && p.buyer)
                          .map((property) => (
                            <div key={property.id} className="sale-item">
                              <div className="sale-item__image">
                                <img src={property.image} alt={property.title} />
                              </div>
                              <div className="sale-item__info">
                                <h4 className="sale-item__property-title">{property.title}</h4>
                                <p className="sale-item__property-location">{property.location}</p>
                                
                                <div className="sale-item__buyer">
                                  <div className="sale-item__buyer-info">
                                    <div className="sale-item__buyer-field">
                                      <FiUser size={16} />
                                      <span className="sale-item__buyer-label">Покупатель:</span>
                                      <span className="sale-item__buyer-value">{property.buyer.name}</span>
                                    </div>
                                    <div className="sale-item__buyer-field">
                                      <FiDollar size={16} />
                                      <span className="sale-item__buyer-label">Цена продажи:</span>
                                      <span className="sale-item__buyer-value sale-item__buyer-value--price">
                                        ${property.buyer.purchasePrice.toLocaleString('ru-RU')}
                                      </span>
                                    </div>
                                    <div className="sale-item__buyer-field">
                                      <FiCalendar size={16} />
                                      <span className="sale-item__buyer-label">Дата продажи:</span>
                                      <span className="sale-item__buyer-value">
                                        {new Date(property.soldDate).toLocaleDateString('ru-RU', {
                                          day: 'numeric',
                                          month: 'long',
                                          year: 'numeric'
                                        })}
                                      </span>
                                    </div>
                                    <div className="sale-item__buyer-field">
                                      <span className="sale-item__buyer-label">Email:</span>
                                      <span className="sale-item__buyer-value">{property.buyer.email}</span>
                                    </div>
                                    <div className="sale-item__buyer-field">
                                      <span className="sale-item__buyer-label">Телефон:</span>
                                      <span className="sale-item__buyer-value">{property.buyer.phone}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="sales-empty">
                        <p>У вас пока нет завершенных продаж</p>
                      </div>
                    )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Модальное окно приветствия */}
      <WelcomeModal 
        isOpen={showWelcomeModal}
        onClose={handleWelcomeClose}
        userName={`${ownerProfile.firstName || ''} ${ownerProfile.lastName || ''}`.trim() || 'Ваш кабинет продавца'}
      />

      {/* Модальное окно загрузки файла */}
      <FileUploadModal
        isOpen={showFileUploadModal}
        onClose={() => setShowFileUploadModal(false)}
        onSuccess={() => {
          // Здесь можно обновить список объявлений после успешной загрузки
          console.log('Файл успешно загружен!')
        }}
      />

      {/* Модальное окно калькулятора стоимости */}
      <PropertyCalculatorModal
        isOpen={isCalculatorModalOpen}
        onClose={() => setIsCalculatorModalOpen(false)}
      />

      {/* Модальное окно истории ставок */}
      <BiddingHistoryModal
        isOpen={!!selectedPropertyForHistory}
        onClose={() => setSelectedPropertyForHistory(null)}
        property={selectedPropertyForHistory}
      />

      {/* Модальное окно удаления объявления */}
      {showDeleteModal && propertyToDelete && (
        <div 
          className="delete-modal-overlay"
          onClick={handleCancelDelete}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
        >
          <div 
            className="delete-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
                Удаление объявления
              </h2>
              <button
                onClick={handleCancelDelete}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FiX size={24} />
              </button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 1rem 0', color: '#4b5563', fontSize: '0.95rem' }}>
                Вы собираетесь отправить запрос на удаление объявления <strong>"{propertyToDelete.title || 'Без названия'}"</strong>.
              </p>
              <p style={{ margin: '0 0 1rem 0', color: '#4b5563', fontSize: '0.95rem' }}>
                Пожалуйста, укажите причину удаления. Запрос будет отправлен на модерацию администратору.
              </p>
              <label 
                htmlFor="delete-reason"
                style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500', 
                  color: '#111827',
                  fontSize: '0.95rem'
                }}
              >
                Причина удаления <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                id="delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Например: Объект уже продан, ошибка в данных, передумал продавать..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
                disabled={isSubmittingDelete}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelDelete}
                disabled={isSubmittingDelete}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSubmittingDelete ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                  opacity: isSubmittingDelete ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isSubmittingDelete) {
                    e.target.style.backgroundColor = '#e5e7eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmittingDelete) {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isSubmittingDelete || !deleteReason.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: isSubmittingDelete || !deleteReason.trim() ? '#9ca3af' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSubmittingDelete || !deleteReason.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (!isSubmittingDelete && deleteReason.trim()) {
                    e.target.style.backgroundColor = '#b91c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmittingDelete && deleteReason.trim()) {
                    e.target.style.backgroundColor = '#dc2626';
                  }
                }}
              >
                {isSubmittingDelete ? (
                  <>
                    <span>Отправка...</span>
                  </>
                ) : (
                  <>
                    <FiTrash2 size={16} />
                    Отправить на модерацию
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Панель профиля */}
      {isProfilePanelOpen && (
        <>
          <div 
            className="owner-sidebar-backdrop"
            onClick={handleCloseProfilePanel}
          />
          <div className="owner-sidebar-panel owner-sidebar-panel--profile">
            <div className="owner-sidebar-panel__content">
              <div className="owner-sidebar-panel__header">
                <h3 className="owner-sidebar-panel__title">Профиль</h3>
                <button 
                  type="button" 
                  className="owner-sidebar-panel__close"
                  onClick={handleCloseProfilePanel}
                  aria-label="Закрыть профиль"
                >
                  <FiX size={20} />
                </button>
              </div>
              <div className="owner-sidebar-panel__body">
                {/* Кнопки редактирования профиля */}
                <div className="owner-profile-section owner-profile-section--actions">
                  <div className="owner-profile-actions">
                    {isProfileEditing ? (
                      <>
                        <button
                          className="owner-profile-section__button owner-profile-section__button--primary"
                          onClick={handleProfileSave}
                          disabled={isSavingProfile}
                        >
                          {isSavingProfile ? 'Сохранение...' : 'Сохранить'}
                        </button>
                        <button
                        type="button"
                        className="owner-profile-section__button"
                        onClick={() => {
                          // Восстанавливаем исходные данные при отмене
                          if (originalProfile) {
                            setOwnerProfile({ ...originalProfile, password: '' })
                          }
                          setIsProfileEditing(false)
                          setShowPassword(false)
                          setOriginalProfile(null)
                        }}
                        disabled={isSavingProfile}
                        style={{ marginLeft: 8 }}
                      >
                        Отмена
                      </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="owner-profile-section__button"
                        onClick={() => {
                          // Сохраняем исходные данные перед началом редактирования
                          setOriginalProfile({ ...ownerProfile })
                          setIsProfileEditing(true)
                        }}
                      >
                        Редактировать профиль
                      </button>
                    )}
                  </div>
                </div>

                <div className="owner-profile-section">
                  <h4 className="owner-profile-section__title">Имя</h4>
                  <input
                    type="text"
                    className="owner-profile-section__value-input"
                    value={ownerProfile.firstName}
                    onChange={(e) => handleProfileFieldChange('firstName', e.target.value)}
                    placeholder="Введите имя"
                    disabled={!isProfileEditing}
                  />
                </div>
                <div className="owner-profile-section">
                  <h4 className="owner-profile-section__title">Фамилия</h4>
                  <input
                    type="text"
                    className="owner-profile-section__value-input"
                    value={ownerProfile.lastName}
                    onChange={(e) => handleProfileFieldChange('lastName', e.target.value)}
                    placeholder="Введите фамилию"
                    disabled={!isProfileEditing}
                  />
                </div>
                <div className="owner-profile-section">
                  <h4 className="owner-profile-section__title">Страна</h4>
                  {isProfileEditing ? (
                    <CountrySelect
                      value={ownerProfile.country}
                      onChange={(countryName) => {
                        // Находим страну в списке для получения флага
                        const selectedCountry = countryList.find(c => c.name === countryName)
                        handleProfileFieldChange('country', countryName)
                        if (selectedCountry) {
                          handleProfileFieldChange('countryFlag', selectedCountry.flag)
                        }
                      }}
                      placeholder="Выберите страну"
                    />
                  ) : (
                    <div className="owner-profile-section__value">
                      {(() => {
                        const selectedCountry = countryList.find(c => c.name === ownerProfile.country)
                        return ownerProfile.country ? (
                          <>
                            {selectedCountry && <span style={{ marginRight: '6px' }}>{selectedCountry.flag}</span>}
                            {ownerProfile.country}
                          </>
                        ) : (
                          'Не указана'
                        )
                      })()}
                    </div>
                  )}
                </div>
                <div className="owner-profile-section">
                  <h4 className="owner-profile-section__title">Подписка</h4>
                  <p className="owner-profile-section__value">Базовая</p>
                  <button className="owner-profile-section__button">Изменить подписку</button>
                </div>
                <div className="owner-profile-section">
                  <h4 className="owner-profile-section__title">Почта</h4>
                  <input
                    type="email"
                    className="owner-profile-section__value-input"
                    value={ownerProfile.email}
                    onChange={(e) => handleProfileFieldChange('email', e.target.value)}
                    placeholder="Введите email"
                    disabled={!isProfileEditing}
                  />
                </div>
                <div className="owner-profile-section">
                  <h4 className="owner-profile-section__title">Логин</h4>
                  <input
                    type="text"
                    className="owner-profile-section__value-input"
                    value={ownerProfile.username}
                    onChange={(e) => handleProfileFieldChange('username', e.target.value)}
                    placeholder="Введите логин"
                    disabled={!isProfileEditing}
                  />
                </div>
                <div className="owner-profile-section">
                  <h4 className="owner-profile-section__title">Пароль</h4>
                  <div style={{ position: 'relative' }}>
                    {isProfileEditing ? (
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="owner-profile-section__value-input"
                        value={ownerProfile.password}
                        onChange={(e) => handleProfileFieldChange('password', e.target.value)}
                        placeholder="Введите новый пароль"
                        style={{ paddingRight: '40px' }}
                      />
                    ) : (
                      <div className="owner-profile-section__value" style={{ color: '#666' }}>
                        ••••••••
                      </div>
                    )}
                    {isProfileEditing && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          color: '#666'
                        }}
                        aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                      >
                        {showPassword ? (
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M2.5 2.5L17.5 17.5M10 3.75C6.25 3.75 3.33 5.83 1.67 8.33C1.25 8.92 1.25 10.08 1.67 10.67C2.5 11.92 3.75 13.33 5 14.17M10 16.25C13.75 16.25 16.67 14.17 18.33 11.67C18.75 11.08 18.75 9.92 18.33 9.33C17.92 8.75 17.25 8 16.67 7.5M12.5 12.5C12.08 12.92 11.42 13.33 10.67 13.33C9.17 13.33 7.92 12.08 7.92 10.58C7.92 9.83 8.33 9.17 8.75 8.75M10 6.67V3.33" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M10 3.75C6.25 3.75 3.33 5.83 1.67 8.33C1.25 8.92 1.25 10.08 1.67 10.67C3.33 13.17 6.25 15.25 10 15.25C13.75 15.25 16.67 13.17 18.33 10.67C18.75 10.08 18.75 8.92 18.33 8.33C16.67 5.83 13.75 3.75 10 3.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div className="owner-profile-section">
                  <h4 className="owner-profile-section__title">WhatsApp</h4>
                  <input
                    type="tel"
                    className="owner-profile-section__value-input"
                    value={ownerProfile.phone}
                    onChange={(e) => handleProfileFieldChange('phone', e.target.value)}
                    placeholder="Введите номер телефона"
                    disabled={!isProfileEditing}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Панель настроек */}
      {isSettingsPanelOpen && (
        <>
          <div 
            className="owner-sidebar-backdrop"
            onClick={() => setIsSettingsPanelOpen(false)}
          />
          <div className="owner-sidebar-panel owner-sidebar-panel--settings">
            <div className="owner-sidebar-panel__content">
              <div className="owner-sidebar-panel__header">
                <h3 className="owner-sidebar-panel__title">Настройки</h3>
                <button 
                  type="button" 
                  className="owner-sidebar-panel__close"
                  onClick={() => setIsSettingsPanelOpen(false)}
                  aria-label="Закрыть настройки"
                >
                  <FiX size={20} />
                </button>
              </div>
              <div className="owner-sidebar-panel__body">
                <div className="owner-settings-section">
                  <h4 className="owner-settings-section__title">Смена языка</h4>
                  <select className="owner-settings-section__select">
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>
                <div className="owner-settings-section">
                  <h4 className="owner-settings-section__title">Смена пароля</h4>
                  <button className="owner-settings-section__button">Изменить пароль</button>
                </div>
                <div className="owner-settings-section">
                  <h4 className="owner-settings-section__title">Уведомления</h4>
                  <div className="owner-settings-section__toggle">
                    <label className="owner-toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="owner-toggle-slider"></span>
                    </label>
                    <span className="owner-toggle-label">Включить уведомления</span>
                  </div>
                  <div className="owner-settings-section__toggle">
                    <label className="owner-toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="owner-toggle-slider"></span>
                    </label>
                    <span className="owner-toggle-label">Email уведомления</span>
                  </div>
                  <div className="owner-settings-section__toggle">
                    <label className="owner-toggle-switch">
                      <input type="checkbox" />
                      <span className="owner-toggle-slider"></span>
                    </label>
                    <span className="owner-toggle-label">SMS уведомления</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default OwnerDashboard
