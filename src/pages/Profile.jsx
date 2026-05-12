import { useState, useRef, useEffect, useMemo } from 'react'
import { FiAward } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser, useClerk, useAuth } from '@clerk/clerk-react'
import { getUserData, saveUserData, logout, clearUserData } from '../services/authService'
import VerificationToast from '../components/VerificationToast'
import VerificationModal from '../components/VerificationModal'
import SellerVerificationModal from '../components/SellerVerificationModal'
import PricingCards from '../components/ui/PricingCards'
import { startProSubscriptionCheckout } from '../utils/subscriptionCheckout'
import { showNotification } from '../utils/toastHelper'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { formatBillingReasonForUi } from '../utils/formatBillingReason'
import { fetchVerificationStatus } from '../utils/verificationStatusApi'
import { fetchUserById } from '../utils/usersApi'
import BuyerCabinetSidebar from '../components/BuyerCabinetSidebar'
import { useChainedAppLayoutScroll } from '../hooks/useChainedAppLayoutScroll'
import { effectiveDisplayTier, userHasVipAccess, SUBSCRIPTION_BILLING_UPDATED_EVENT } from '../hooks/useCabinetOverviewData'
import './Profile.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const Profile = () => {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const billingLocale = (() => {
    const code = (i18n.language || 'ru').split('-')[0]
    const map = { ru: 'ru-RU', en: 'en-US', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', sv: 'sv-SE' }
    return map[code] || 'en-US'
  })()
  const { user, isLoaded: userLoaded } = useUser()
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const { signOut } = useClerk()
  const [isLoading, setIsLoading] = useState(true)
  const [profileData, setProfileData] = useState({
    name: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    avatar: null,
    country: '',
    countryFlag: '',
    address: '',
    passportSeries: '',
    passportNumber: '',
    identificationNumber: '',
    userIdNumber: '',
    role: 'buyer',
    vipUntil: null,
    vipActive: false,
  })
  const profilePageRef = useRef(null)
  const profileMainScrollRef = useRef(null)
  const passportInputRef = useRef(null)
  const selfieInputRef = useRef(null)
  const passportWithFaceInputRef = useRef(null)

  useChainedAppLayoutScroll(profilePageRef, profileMainScrollRef, {
    active: !isLoading && userLoaded,
  })
  const [userId, setUserId] = useState(null)
  const [uploading, setUploading] = useState({ passport: false, selfie: false, passportWithFace: false })
  const [userDocuments, setUserDocuments] = useState({ passport: null, selfie: null, passportWithFace: null })
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false)
  const [isVerificationFormOpen, setIsVerificationFormOpen] = useState(false)
  const [documentsCompleted, setDocumentsCompleted] = useState(false)
  const [subscriptionBilling, setSubscriptionBilling] = useState(null)
  const [subscriptionBillingLoading, setSubscriptionBillingLoading] = useState(false)
  // Используем proxy из vite.config.js или полный URL
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

  useEffect(() => {
    if (!userLoaded) return
    if (!isSiteUserSignedIn(user, userLoaded)) {
      requestOpenLoginModal({ wizard: true })
      navigate('/', { replace: true })
    }
  }, [user, userLoaded, navigate])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setSubscriptionBillingLoading(true)
    fetch(`${API_BASE_URL}/users/${userId}/subscription-billing`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (json.success && json.data) setSubscriptionBilling(json.data)
        else setSubscriptionBilling(null)
      })
      .catch(() => {
        if (!cancelled) setSubscriptionBilling(null)
      })
      .finally(() => {
        if (!cancelled) setSubscriptionBillingLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, API_BASE_URL])

  useEffect(() => {
    if (!userId) return
    const onBilling = () => {
      fetch(`${API_BASE_URL}/users/${userId}/subscription-billing`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.data) setSubscriptionBilling(json.data)
        })
        .catch(() => {})
    }
    window.addEventListener(SUBSCRIPTION_BILLING_UPDATED_EVENT, onBilling)
    return () => window.removeEventListener(SUBSCRIPTION_BILLING_UPDATED_EVENT, onBilling)
  }, [userId, API_BASE_URL])
  
  // Загрузка данных пользователя из БД
  const loadUserDataFromDB = async (userId) => {
    if (!userId) return
    
    try {
      const user = await fetchUserById(API_BASE_URL, userId)
      if (user) {
          console.log('📥 Profile: Загружены данные пользователя из БД:', {
            id: user.id,
            user_id_number: user.user_id_number,
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim()
          })
          
          // Если у пользователя нет user_id_number, генерируем его
          if (!user.user_id_number) {
            console.log('🔄 Profile: У пользователя нет user_id_number, генерируем через обновление...')
            try {
              const updateResponse = await fetch(`${API_BASE_URL}/users/${userId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
              })
              
              if (updateResponse.ok) {
                const updateData = await updateResponse.json()
                if (updateData.success && updateData.data?.user_id_number) {
                  console.log('✅ Profile: user_id_number сгенерирован:', updateData.data.user_id_number)
                  user.user_id_number = updateData.data.user_id_number
                }
              }
            } catch (error) {
              console.warn('⚠️ Profile: Не удалось сгенерировать user_id_number:', error)
            }
          }
          
          // Обновляем profileData данными из БД
          const vipUntilRaw = user.vip_until || null
          const vipUntilMs = vipUntilRaw ? new Date(vipUntilRaw).getTime() : 0
          const vipActive = Boolean(vipUntilMs && vipUntilMs > Date.now())

          setProfileData(prev => ({
            ...prev,
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            email: user.email || prev.email,
            phone: user.phone_number || prev.phone,
            country: user.country || prev.country,
            address: user.address || '',
            passportSeries: user.passport_series || '',
            passportNumber: user.passport_number || '',
            identificationNumber: user.identification_number || '',
            userIdNumber: user.user_id_number || '',
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || prev.name,
            role: user.role || prev.role || 'buyer',
            vipUntil: vipUntilRaw,
            vipActive,
          }))

          const roleNorm = user.role === 'seller' || user.role === 'owner' ? 'seller' : 'buyer'
          try {
            const gd = getUserData()
            if (gd.isLoggedIn) {
              const displayName =
                `${user.first_name || ''} ${user.last_name || ''}`.trim() || gd.name || t('buyerCabinet_userPlaceholder')
              saveUserData(
                {
                  name: displayName,
                  email: user.email || gd.email,
                  id: String(userId),
                  picture: gd.picture,
                  role: roleNorm,
                  phone: user.phone_number || gd.phone || '',
                  phoneFormatted: gd.phoneFormatted || user.phone_number || ''
                },
                gd.loginMethod || 'clerk'
              )
            }
            if (roleNorm === 'seller' && window.location.pathname === '/profile') {
              navigate('/owner', { replace: true })
            }
          } catch (e) {
            console.warn('⚠️ Profile: не удалось синхронизировать localStorage с ролью из БД', e)
          }
          
          console.log('✅ Profile: profileData обновлен, userIdNumber:', user.user_id_number || 'отсутствует')
      }
    } catch (error) {
      console.error('Ошибка загрузки данных пользователя:', error)
    }
  }

  // Загрузка документов пользователя
  const loadUserDocuments = async (userId) => {
    if (!userId) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/documents/user/${userId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          // Берем только последние документы каждого типа (на случай если их несколько)
          const passportDocs = data.data.filter(doc => doc.document_type === 'passport')
          const passportWithFaceDocs = data.data.filter(doc => doc.document_type === 'passport_with_face')
          const selfieDocs = data.data.filter(doc => doc.document_type === 'selfie')
          
          const documents = {
            passport: passportDocs.length > 0 ? passportDocs[0] : null,
            passportWithFace: passportWithFaceDocs.length > 0 ? passportWithFaceDocs[0] : null,
            selfie: selfieDocs.length > 0 ? selfieDocs[0] : null
          }
          
          // Проверяем, загружены ли все три документа
          const allUploaded = !!(documents.passport && documents.selfie && documents.passportWithFace)
          setDocumentsCompleted(allUploaded)
          
          console.log('Загружены документы пользователя:', documents)
          setUserDocuments(documents)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки документов:', error)
    }
  }
  
  const handleDocumentUpload = async (type, file) => {
    if (!file) {
      showNotification('Файл не выбран')
      return
    }
    
    if (!userId) {
      requestOpenLoginModal({ wizard: true })
      console.error('userId не установлен:', userId)
      return
    }

    // Преобразуем userId в число и проверяем валидность
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : Number(userId)
    if (isNaN(numericUserId) || numericUserId <= 0) {
      console.error('❌ Неверный формат userId:', userId)
      showNotification('Ошибка: Неверный формат ID пользователя. Ожидается положительное число')
      return
    }
    
    setUploading(prev => ({ ...prev, [type]: true }))
    
    try {
      const formData = new FormData()
      formData.append('document_photo', file)
      formData.append('user_id', String(numericUserId))
      
      // Определяем тип документа
      let documentType = 'passport'
      if (type === 'selfie') {
        documentType = 'selfie'
      } else if (type === 'passportWithFace') {
        documentType = 'passport_with_face'
      }
      formData.append('document_type', documentType)
      
      console.log('📤 Загрузка документа:', {
        type,
        userId,
        fileName: file.name,
        fileSize: file.size,
        apiUrl: `${API_BASE_URL}/documents`
      })
      
      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        body: formData
      })
      
      console.log('📥 Ответ сервера:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Данные от сервера:', data)
        
        if (data.success) {
          showNotification('Документ успешно загружен и отправлен на верификацию')
          // Обновляем состояние сразу
          const newDoc = {
            id: data.data.id,
            document_type: data.data.document_type,
            document_photo: data.data.document_photo,
            verification_status: data.data.verification_status || 'pending',
            created_at: data.data.created_at
          }
          // Определяем ключ для сохранения документа
          let docKey = 'passport'
          if (documentType === 'selfie') {
            docKey = 'selfie'
          } else if (documentType === 'passport_with_face') {
            docKey = 'passportWithFace'
          }
          
          setUserDocuments(prev => ({
            ...prev,
            [docKey]: newDoc
          }))
          // Перезагружаем документы пользователя для синхронизации
          await loadUserDocuments(userId)
          // Загружаем статус верификации после загрузки документа
          await loadVerificationStatus(userId)
          // Отправляем событие для обновления уведомления о верификации
          window.dispatchEvent(new Event('verification-status-update'))
        } else {
          showNotification(data.error || 'Ошибка загрузки документа')
        }
      } else {
        const errorText = await response.text().catch(() => 'Неизвестная ошибка')
        console.error('❌ Ошибка сервера:', response.status, errorText)
        
        let errorMessage = 'Ошибка загрузки документа'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = `Ошибка ${response.status}: ${errorText.substring(0, 100)}`
        }
        
        showNotification(errorMessage)
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки документа:', error)
      
      if (error.message === 'Failed to fetch') {
        showNotification('Не удалось подключиться к серверу. Убедитесь, что сервер запущен на порту 3000.')
      } else {
        showNotification(`Ошибка: ${error.message}`)
      }
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }))
    }
  }

  // Загружаем статус верификации
  const loadVerificationStatus = async (userId, force = false) => {
    if (!userId) return
    try {
      const status = await fetchVerificationStatus(API_BASE_URL, userId, { ttlMs: 20000, force })
      if (status) setVerificationStatus(status)
    } catch (error) {
      console.error('Ошибка загрузки статуса верификации:', error)
    }
  }

  useEffect(() => {
    if (!userId) return
    const onPush = () => {
      loadVerificationStatus(userId, true)
      loadUserDocuments(userId)
    }
    window.addEventListener('verification-status-update', onPush)
    return () => window.removeEventListener('verification-status-update', onPush)
  }, [userId])

  // Проверяем заполненность документов
  const isDocumentsComplete = () => {
    // Приоритет userDocuments (более актуальные данные, загружаются при открытии страницы)
    // Проверяем наличие всех трех документов
    const hasDocumentsFromState = !!(userDocuments.passport && userDocuments.selfie && userDocuments.passportWithFace)
    if (hasDocumentsFromState) return true
    
    // Если userDocuments пусты, проверяем verificationStatus
    const hasDocumentsFromStatus = verificationStatus?.hasDocuments || false
    return hasDocumentsFromStatus
  }

  // Проверяем заполненность базовых данных
  const isBasicInfoComplete = () => {
    if (!verificationStatus?.missingFields) return false
    const { missingFields } = verificationStatus
    return !missingFields.firstName && 
           !missingFields.lastName && 
           !missingFields.emailOrPhone && 
           !missingFields.country && 
           !missingFields.address
  }

  // Проверяем заполненность паспортных данных
  const isPassportDataComplete = () => {
    if (!verificationStatus?.missingFields) return false
    const { missingFields } = verificationStatus
    return !missingFields.passportNumber && 
           !missingFields.identificationNumber
  }

  // Проверяем, нужно ли показывать индикатор для "Данные"
  const shouldShowDataIndicator = () => {
    // Если verificationStatus еще не загружен, не показываем (чтобы избежать ложных срабатываний)
    if (!verificationStatus) {
      return false
    }
    
    // Если missingFields нет, считаем данные неполными (на всякий случай показываем индикатор)
    if (!verificationStatus.missingFields) {
      return true
    }
    
    const { missingFields } = verificationStatus
    
    // Проверяем базовые данные
    const hasBasicMissing = !!(missingFields.firstName || missingFields.lastName || 
                                missingFields.emailOrPhone || missingFields.country || 
                                missingFields.address)
    
    // Проверяем паспортные данные
    const hasPassportMissing = !!(missingFields.passportNumber || 
                                   missingFields.identificationNumber)
    
    // Показываем точку если есть хотя бы одно незаполненное поле
    const shouldShow = hasBasicMissing || hasPassportMissing
    
    if (shouldShow) {
      console.log('🔴 Profile: Показываем индикатор "Данные"', {
        hasBasicMissing,
        hasPassportMissing,
        missingFields
      })
    }
    
    return shouldShow
  }

  // Синхронизируем данные Clerk с localStorage и загружаем данные пользователя
  useEffect(() => {
    // Ждем загрузки данных Clerk
    if (!userLoaded || !authLoaded) {
      setIsLoading(true)
      return
    }

    setIsLoading(false)

    console.log('Profile: Auth state', { isSignedIn, userLoaded, authLoaded, hasUser: !!user })

    // Если пользователь авторизован через Clerk, но user еще не загружен, ждем
    if (isSignedIn && !user) {
      console.log('Profile: User is signed in but user data not loaded yet, waiting...')
      setIsLoading(true)
      return
    }

    if (isSignedIn && user) {
      // Пользователь авторизован через Clerk
      console.log('Profile: Clerk user object', user)
      console.log('Profile: Clerk user data loaded', {
        fullName: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        primaryEmailAddress: user.primaryEmailAddress,
        emailAddresses: user.emailAddresses,
        imageUrl: user.imageUrl,
        profileImageUrl: user.profileImageUrl,
        primaryPhoneNumber: user.primaryPhoneNumber,
        phoneNumbers: user.phoneNumbers
      })
      
      // Формируем имя пользователя
      let userName = t('buyerCabinet_userPlaceholder')
      if (user.fullName) {
        userName = user.fullName
      } else if (user.firstName || user.lastName) {
        userName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
      } else if (user.username) {
        userName = user.username
      }
      
      // Получаем email
      let userEmail = ''
      if (user.primaryEmailAddress?.emailAddress) {
        userEmail = user.primaryEmailAddress.emailAddress
      } else if (user.emailAddresses && user.emailAddresses.length > 0) {
        userEmail = user.emailAddresses[0].emailAddress || ''
      }
      
      // Получаем изображение
      let userImage = ''
      if (user.imageUrl) {
        userImage = user.imageUrl
      } else if (user.profileImageUrl) {
        userImage = user.profileImageUrl
      }
      
      // Получаем телефон
      let userPhone = ''
      if (user.primaryPhoneNumber?.phoneNumber) {
        userPhone = user.primaryPhoneNumber.phoneNumber
      } else if (user.phoneNumbers && user.phoneNumbers.length > 0) {
        userPhone = user.phoneNumbers[0].phoneNumber || ''
      }
      
      const oauthRoleRaw =
        sessionStorage.getItem('clerk_oauth_user_role') ||
        user.publicMetadata?.role ||
        localStorage.getItem('userRole') ||
        'buyer'
      const normalizedClerkRole =
        oauthRoleRaw === 'seller' || oauthRoleRaw === 'owner' ? 'seller' : 'buyer'

      const clerkUserData = {
        name: userName,
        email: userEmail,
        picture: userImage,
        id: user.id || '',
        phone: userPhone,
        phoneFormatted: userPhone,
        role: normalizedClerkRole
      }
      
      console.log('Profile: Processed Clerk user data', clerkUserData)
      
      // Сохраняем данные Clerk в localStorage для совместимости со старой системой (роль нужна для isOwnerLoggedIn и /owner)
      saveUserData(clerkUserData, 'clerk')
      
      // Находим или создаем пользователя в БД и получаем его ID
      const findOrCreateUserInDB = async () => {
        try {
          let dbUserId = null
          
          // Сначала пытаемся найти пользователя по email
          let foundUser = null
          if (userEmail) {
            const emailResponse = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(userEmail.toLowerCase())}`)
            if (emailResponse.ok) {
              const emailData = await emailResponse.json()
              if (emailData.success && emailData.data) {
                foundUser = emailData.data
                dbUserId = foundUser.id
                console.log('✅ Пользователь найден в БД по email:', dbUserId)
              }
            }
          }
          
          // Если не нашли по email, пытаемся по телефону
          if (!dbUserId && userPhone) {
            const phoneDigits = userPhone.replace(/\D/g, '')
            if (phoneDigits) {
              const phoneResponse = await fetch(`${API_BASE_URL}/users/phone/${phoneDigits}`)
              if (phoneResponse.ok) {
                const phoneData = await phoneResponse.json()
                if (phoneData.success && phoneData.data) {
                  foundUser = phoneData.data
                  dbUserId = foundUser.id
                  console.log('✅ Пользователь найден в БД по телефону:', dbUserId)
                }
              }
            }
          }
          
          // Если пользователь найден, но у него нет user_id_number, генерируем его
          if (foundUser && !foundUser.user_id_number) {
            console.log('🔄 Profile: У пользователя нет user_id_number, генерируем...')
            try {
              const updateResponse = await fetch(`${API_BASE_URL}/users/${dbUserId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
              })
              
              if (updateResponse.ok) {
                const updateData = await updateResponse.json()
                if (updateData.success && updateData.data?.user_id_number) {
                  console.log('✅ Profile: user_id_number сгенерирован:', updateData.data.user_id_number)
                  foundUser.user_id_number = updateData.data.user_id_number
                  // Перезагружаем данные пользователя из БД, чтобы получить все обновленные данные
                  await loadUserDataFromDB(dbUserId)
                }
              }
            } catch (error) {
              console.warn('⚠️ Profile: Не удалось сгенерировать user_id_number:', error)
            }
          }
          
          // Если пользователь не найден, создаем его
          if (!dbUserId) {
            const oauthFlowMode = sessionStorage.getItem('clerk_oauth_flow_mode') || 'register'
            if (oauthFlowMode === 'login') {
              // В режиме "вход" нового пользователя в БД не создаём:
              // открываем регистрацию.
              sessionStorage.setItem('login_modal_force_open', 'true')
              sessionStorage.setItem('login_modal_mode', 'register')

              const forcedRole = sessionStorage.getItem('clerk_oauth_user_role') || localStorage.getItem('userRole') || 'buyer'
              sessionStorage.setItem('login_modal_user_role', forcedRole === 'seller' || forcedRole === 'owner' ? 'seller' : 'buyer')

              clearUserData()
              navigate('/', { replace: true })
              return
            }

            const nameParts = userName.split(' ')
            const firstName = nameParts[0] || t('buyerCabinet_userPlaceholder')
            const lastName = nameParts.slice(1).join(' ') || ''
            
            // Получаем роль из sessionStorage (сохранена при регистрации через Clerk)
            // Или из localStorage, или по умолчанию 'buyer'
            const savedRole = sessionStorage.getItem('clerk_oauth_user_role')
            const storedRole = localStorage.getItem('userRole')
            const userRole = savedRole || storedRole || 'buyer'
            
            // Очищаем сохраненную роль после использования
            if (savedRole) {
              sessionStorage.removeItem('clerk_oauth_user_role')
            }
            
            console.log('Profile: Создание пользователя Clerk в БД с ролью:', userRole)
            
            const createResponse = await fetch(`${API_BASE_URL}/users`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                email: userEmail || null,
                phone_number: userPhone ? userPhone.replace(/\D/g, '') : null,
                role: userRole === 'seller' ? 'seller' : 'buyer',
                is_verified: 0,
                is_online: 1
              })
            })
            
            if (createResponse.ok) {
              const createData = await createResponse.json()
              if (createData.success && createData.data) {
                dbUserId = createData.data.id
                console.log('✅ Пользователь создан в БД:', dbUserId)
              }
            } else {
              const errorData = await createResponse.json().catch(() => ({}))
              console.error('❌ Ошибка создания пользователя:', errorData)
            }
          }
          
          // Используем ID из БД
          if (dbUserId) {
            setUserId(dbUserId)
            // Обновляем localStorage с правильным ID
            localStorage.setItem('userId', String(dbUserId))
            // Загружаем данные пользователя из БД (включая user_id_number)
            await loadUserDataFromDB(dbUserId)
            loadUserDocuments(dbUserId)
            loadVerificationStatus(dbUserId)
          } else {
            console.warn('⚠️ Не удалось получить ID пользователя из БД')
            // Fallback на ID из localStorage
            const fallbackId = localStorage.getItem('userId')
            if (fallbackId && fallbackId !== 'null' && fallbackId !== 'undefined' && /^\d+$/.test(fallbackId)) {
              const numericFallbackId = parseInt(fallbackId, 10)
              if (!isNaN(numericFallbackId) && numericFallbackId > 0) {
                setUserId(numericFallbackId)
                await loadUserDataFromDB(numericFallbackId)
                loadUserDocuments(numericFallbackId)
                loadVerificationStatus(numericFallbackId)
              }
            }
          }
        } catch (error) {
          console.error('❌ Ошибка при получении/создании пользователя в БД:', error)
          // Fallback на ID из localStorage
          const fallbackId = localStorage.getItem('userId')
          if (fallbackId && fallbackId !== 'null' && fallbackId !== 'undefined' && /^\d+$/.test(fallbackId)) {
            const numericFallbackId = parseInt(fallbackId, 10)
            if (!isNaN(numericFallbackId) && numericFallbackId > 0) {
              setUserId(numericFallbackId)
              await loadUserDataFromDB(numericFallbackId)
              loadUserDocuments(numericFallbackId)
              loadVerificationStatus(numericFallbackId)
            }
          }
        }
      }
      
      findOrCreateUserInDB()
      
      const newProfileData = {
        name: clerkUserData.name || t('buyerCabinet_userPlaceholder'),
        phone: clerkUserData.phoneFormatted || clerkUserData.phone || '',
        email: clerkUserData.email || '',
        avatar: clerkUserData.picture || null,
        country: '',
        countryFlag: ''
      }
      
      console.log('Profile: Setting profile data', newProfileData)
      console.log('Profile: Current profileData before update', profileData)
      
      setProfileData(newProfileData)
      
      // Проверяем, что данные действительно обновились
      setTimeout(() => {
        console.log('Profile: Profile data after update should be', newProfileData)
      }, 100)
    } else {
      // Проверяем старую систему авторизации
      const userData = getUserData()
      
      console.log('Profile: Checking localStorage data', userData)
      
      if (userData.isLoggedIn) {
        setProfileData({
          name: userData.name || t('buyerCabinet_userPlaceholder'),
          phone: userData.phoneFormatted || userData.phone || '',
          email: userData.email || '',
          avatar: userData.picture || null,
          country: userData.country || '',
          countryFlag: userData.countryFlag || ''
        })
        
        // Находим или создаем пользователя в БД и получаем его ID
        const findOrCreateUser = async () => {
          try {
            let dbUserId = null
            const userEmail = userData.email
            const userPhone = userData.phone || userData.phoneFormatted

            // Числовой ID из сессии (email/Telegram/WhatsApp и т.д.) — не полагаемся только на email/телефон
            const storedNumericId = userData.id || localStorage.getItem('userId')
            if (!dbUserId && storedNumericId && /^\d+$/.test(String(storedNumericId))) {
              const numericSessionId = parseInt(String(storedNumericId), 10)
              if (numericSessionId > 0) {
                try {
                  const meResponse = await fetch(`${API_BASE_URL}/users/${numericSessionId}`)
                  if (meResponse.ok) {
                    const meJson = await meResponse.json()
                    if (meJson.success && meJson.data?.id) {
                      dbUserId = meJson.data.id
                      console.log('✅ Пользователь найден по сохранённому ID БД:', dbUserId)
                    }
                  }
                } catch (e) {
                  console.warn('⚠️ Profile: не удалось загрузить пользователя по сохранённому ID', e)
                }
              }
            }
            
            // Сначала пытаемся найти пользователя по email
            if (!dbUserId && userEmail) {
              const emailResponse = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(userEmail.toLowerCase())}`)
              if (emailResponse.ok) {
                const emailData = await emailResponse.json()
                if (emailData.success && emailData.data) {
                  dbUserId = emailData.data.id
                  console.log('✅ Пользователь найден в БД по email:', dbUserId)
                }
              }
            }
            
            // Если не нашли по email, пытаемся по телефону
            if (!dbUserId && userPhone) {
              const phoneDigits = userPhone.replace(/\D/g, '')
              if (phoneDigits) {
                const phoneResponse = await fetch(`${API_BASE_URL}/users/phone/${phoneDigits}`)
                if (phoneResponse.ok) {
                  const phoneData = await phoneResponse.json()
                  if (phoneData.success && phoneData.data) {
                    dbUserId = phoneData.data.id
                    console.log('✅ Пользователь найден в БД по телефону:', dbUserId)
                  }
                }
              }
            }
            
            // Если пользователь не найден, создаём только при отсутствии валидного ID в сессии
            if (!dbUserId) {
              const nameParts = (userData.name || t('buyerCabinet_userPlaceholder')).split(' ')
              const firstName = nameParts[0] || t('buyerCabinet_userPlaceholder')
              const lastName = nameParts.slice(1).join(' ') || ''
              
              // Используем роль из userData или localStorage
              const storedRole = localStorage.getItem('userRole')
              const userRole = userData.role || storedRole || 'buyer'
              
              console.log('Profile: Создание пользователя (старая система) в БД с ролью:', userRole)
              
              const createResponse = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  first_name: firstName,
                  last_name: lastName,
                  email: userEmail || null,
                  phone_number: userPhone ? userPhone.replace(/\D/g, '') : null,
                  role: userRole === 'seller' ? 'seller' : 'buyer',
                  is_verified: 0,
                  is_online: 1
                })
              })
              
              if (createResponse.ok) {
                const createData = await createResponse.json()
                if (createData.success && createData.data) {
                  dbUserId = createData.data.id
                  console.log('✅ Пользователь создан в БД:', dbUserId)
                }
              } else {
                const errorData = await createResponse.json().catch(() => ({}))
                console.error('❌ Ошибка создания пользователя:', errorData)
              }
            }
            
            // Используем ID из БД и подтягиваем поля профиля (в т.ч. user_id_number — «номер покупателя»)
            if (dbUserId) {
              setUserId(dbUserId)
              localStorage.setItem('userId', String(dbUserId))
              await loadUserDataFromDB(dbUserId)
              loadUserDocuments(dbUserId)
              loadVerificationStatus(dbUserId)
            } else {
              console.warn('⚠️ Не удалось получить ID пользователя из БД')
              const fallbackId = userData.id || localStorage.getItem('userId')
              if (fallbackId) {
                // Преобразуем fallbackId в число и проверяем валидность
                const numericFallbackId = typeof fallbackId === 'string' ? parseInt(fallbackId, 10) : Number(fallbackId)
                if (!isNaN(numericFallbackId) && numericFallbackId > 0) {
                  setUserId(numericFallbackId)
                  await loadUserDataFromDB(numericFallbackId)
                  loadUserDocuments(numericFallbackId)
                  loadVerificationStatus(numericFallbackId)
                }
              }
            }
          } catch (error) {
            console.error('❌ Ошибка при получении/создании пользователя в БД:', error)
            const fallbackId = userData.id || localStorage.getItem('userId')
            if (fallbackId) {
              // Преобразуем fallbackId в число и проверяем валидность
              const numericFallbackId = typeof fallbackId === 'string' ? parseInt(fallbackId, 10) : Number(fallbackId)
              if (!isNaN(numericFallbackId) && numericFallbackId > 0) {
                setUserId(numericFallbackId)
                await loadUserDataFromDB(numericFallbackId)
                loadUserDocuments(numericFallbackId)
                loadVerificationStatus(numericFallbackId)
              }
            }
          }
        }
        
        findOrCreateUser()
      } else {
        // Если не авторизован, перенаправляем на главную страницу
        console.warn('⚠️ Пользователь не авторизован, перенаправление на главную')
        navigate('/', { replace: true })
      }
    }
  }, [user, userLoaded, isSignedIn, authLoaded])

  // Отслеживаем изменения profileData для отладки
  useEffect(() => {
    console.log('Profile: profileData changed', profileData)
  }, [profileData])

  const handleLogout = async () => {
    if (!window.confirm(t('buyerCabinet_logoutConfirm'))) {
      return
    }

    sessionStorage.setItem('clerk_logout_in_progress', 'true')

    try {
      // 1. Если пользователь авторизован через Clerk — выходим из Clerk
      if (user && signOut) {
        await signOut({
          redirectUrl: `${window.location.origin}/`
        })
      }
    } catch (error) {
      console.warn('⚠️ Ошибка при выходе из Clerk:', error)
      // Даже при ошибке продолжаем локальный выход
    }

    try {
      // 2. Всегда очищаем локальную сессию и помечаем пользователя оффлайн в БД
      await logout()
    } catch (error) {
      console.warn('⚠️ Ошибка при локальном выходе:', error)
    } finally {
      sessionStorage.removeItem('clerk_logout_in_progress')
    }

    // 3. Перенаправляем на главную и перезагружаем приложение
    window.location.assign('/')
  }

  const profileShowsVip = useMemo(() => {
    const untilMs = profileData.vipUntil ? new Date(profileData.vipUntil).getTime() : 0
    const fromDb = Boolean(untilMs && untilMs > Date.now())
    const fromBilling = userHasVipAccess({
      subscription: subscriptionBilling?.subscription,
      vipClub: subscriptionBilling?.vipClub,
    })
    return fromDb || fromBilling
  }, [profileData.vipUntil, subscriptionBilling])

  // Показываем индикатор загрузки, пока данные не загружены
  if (isLoading || !userLoaded) {
    return (
      <div className="profile-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#666', marginBottom: '16px' }}>{t('buyerCabinet_loadingProfile')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page" ref={profilePageRef}>
      {/* Всплывающее уведомление о прогрессе верификации */}
      {userId && <VerificationToast userId={userId} />}
      
      {/* Модальное окно верификации */}
      {userId && (
        <>
          <SellerVerificationModal
            isOpen={isVerificationModalOpen}
            onClose={() => setIsVerificationModalOpen(false)}
            userId={userId}
            onComplete={async () => {
              // Обновляем документы пользователя и статус верификации
              await loadUserDocuments(userId)
              await loadVerificationStatus(userId)
              return true
            }}
          />
          <VerificationModal
            isOpen={isVerificationFormOpen}
            onClose={() => setIsVerificationFormOpen(false)}
            userId={userId}
            onComplete={async () => {
              // Обновляем документы пользователя и статус верификации
              await loadUserDocuments(userId)
              await loadVerificationStatus(userId)
              setIsVerificationFormOpen(false)
              return true
            }}
          />
        </>
      )}
      
      <div className="profile-container buyer-cabinet-layout-container">
        <BuyerCabinetSidebar
          onLogout={handleLogout}
          showDataIndicator={shouldShowDataIndicator()}
        />

        <main className="profile-main buyer-cabinet-layout-main">
          <div className="buyer-cabinet-main-scroll" ref={profileMainScrollRef}>
          <div className="profile-header">
            <div className="profile-header-top">
              <div className="profile-avatar-wrapper">
                <div className="profile-avatar">
                  {profileData.avatar ? (
                    <img src={profileData.avatar} alt="Avatar" className="avatar-image" />
                  ) : (
                    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                      <defs>
                        <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#0ABAB5" />
                          <stop offset="100%" stopColor="#089a95" />
                        </linearGradient>
                      </defs>
                      <circle cx="60" cy="60" r="60" fill="url(#avatarGradient)"/>
                      <circle cx="60" cy="48" r="18" fill="white" opacity="0.9"/>
                      <path d="M30 90 Q30 75 60 75 Q90 75 90 90 L90 100 L30 100 Z" fill="white" opacity="0.9"/>
                    </svg>
                  )}
                </div>
                {profileShowsVip && (
                  <span
                    className="profile-vip-badge"
                    title={t('profileVipBadgeTitle')}
                    aria-label={t('profileVipBadgeTitle')}
                  >
                    <FiAward className="profile-vip-badge__icon" aria-hidden />
                    <span className="profile-vip-badge__text">VIP</span>
                  </span>
                )}
              </div>
              <div className="profile-info">
                <div className="profile-name">
                  <h1>{profileData.name || t('loading')}</h1>
                </div>
              </div>
            </div>
            <div className="profile-header-left">
              <div className="profile-badges-row">
                <div className="profile-status-badge profile-badge profile-badge-cell">
                  <span className="profile-status-label">{t('buyerCabinet_yourStatus')}</span>
                  <span className={`profile-status-value profile-status-value--${profileData.role === 'seller' ? 'seller' : 'buyer'}`}>
                    {profileData.role === 'seller' ? t('buyerCabinet_roleSeller') : t('buyerCabinet_roleBuyer')}
                  </span>
                </div>
                {profileData.userIdNumber ? (
                  <div className="profile-badge profile-badge--number profile-badge-cell">
                    <span className="profile-badge-label">Ваш ID</span>
                    <span className="profile-badge-value">{profileData.userIdNumber}</span>
                  </div>
                ) : (
                  <div className="profile-badge profile-badge-cell profile-badge--placeholder" aria-hidden />
                )}
              </div>
            </div>
          </div>

          <div className="profile-sections">
            {(subscriptionBillingLoading ||
              subscriptionBilling?.subscription ||
              (subscriptionBilling?.payments && subscriptionBilling.payments.length > 0)) && (
              <section className="profile-section profile-section--billing">
                <div className="section-header">
                  <h2 className="section-title">{t('buyerCabinet_billingTitle')}</h2>
                  <div className="section-subtitle">{t('buyerCabinet_billingSubtitle')}</div>
                </div>
                {subscriptionBillingLoading ? (
                  <div className="profile-billing-loading">{t('buyerCabinet_billingLoading')}</div>
                ) : (
                  <div className="profile-billing">
                    {subscriptionBilling?.subscription && (
                      <div className="profile-billing-plan">
                        <div className="profile-billing-plan__badge">Pro</div>
                        <div className="profile-billing-plan__body">
                          <div className="profile-billing-plan__row">
                            <span className="profile-billing-label">{t('buyerCabinet_billingStatus')}</span>
                            <span className="profile-billing-value profile-billing-value--status">
                              {(() => {
                                const st = subscriptionBilling.subscription.status
                                const map = {
                                  active: t('buyerCabinet_subStatus_active'),
                                  canceled: t('buyerCabinet_subStatus_canceled'),
                                  past_due: t('buyerCabinet_subStatus_past_due'),
                                  trialing: t('buyerCabinet_subStatus_trialing'),
                                  incomplete: t('buyerCabinet_subStatus_incomplete'),
                                  incomplete_expired: t('buyerCabinet_subStatus_incomplete_expired'),
                                  unpaid: t('buyerCabinet_subStatus_unpaid'),
                                  paused: t('buyerCabinet_subStatus_paused'),
                                }
                                return map[st] || st || '—'
                              })()}
                            </span>
                          </div>
                          {subscriptionBilling.subscription.current_period_end && (
                            <div className="profile-billing-plan__row">
                              <span className="profile-billing-label">{t('buyerCabinet_periodEnd')}</span>
                              <span className="profile-billing-value">
                                {new Date(subscriptionBilling.subscription.current_period_end).toLocaleString(
                                  billingLocale,
                                  {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                  }
                                )}
                              </span>
                            </div>
                          )}
                          {subscriptionBilling.subscription.cancel_at_period_end === 1 && (
                            <p className="profile-billing-hint">{t('buyerCabinet_cancelPeriodHint')}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {subscriptionBilling?.payments && subscriptionBilling.payments.length > 0 && (
                      <div className="profile-billing-payments">
                        <h3 className="profile-billing-payments__title">{t('buyerCabinet_payments')}</h3>
                        <ul className="profile-billing-payments__list">
                          {subscriptionBilling.payments.map((p) => {
                            const reasonLabel = formatBillingReasonForUi(p.billing_reason)
                            return (
                              <li key={p.id} className="profile-billing-payment">
                                <div className="profile-billing-payment__main">
                                  <span className="profile-billing-payment__amount">
                                    {(() => {
                                      const cur = (p.currency || 'eur').toUpperCase()
                                      const amt = (p.amount_cents ?? 0) / 100
                                      try {
                                        return new Intl.NumberFormat(billingLocale, {
                                          style: 'currency',
                                          currency: cur,
                                        }).format(amt)
                                      } catch {
                                        return `${amt} ${cur}`
                                      }
                                    })()}
                                  </span>
                                  <span className="profile-billing-payment__date">
                                    {p.paid_at
                                      ? new Date(p.paid_at).toLocaleString(billingLocale, {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : '—'}
                                  </span>
                                </div>
                                {reasonLabel && (
                                  <span className="profile-billing-payment__reason">{reasonLabel}</span>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}
                    {!subscriptionBilling?.subscription &&
                      (!subscriptionBilling?.payments || subscriptionBilling.payments.length === 0) && (
                        <p className="profile-billing-empty">{t('buyerCabinet_billingEmpty')}</p>
                      )}
                  </div>
                )}
              </section>
            )}

            <section className="profile-section">
              <div className="section-header">
                <h2 className="section-title">{t('buyerCabinet_sectionSubscriptions')}</h2>
                <div className="section-subtitle">{t('buyerCabinet_sectionSubscriptionsSubtitle')}</div>
              </div>
              <div className="profile-subscriptions-cards">
                <PricingCards
                  compact
                  mobileTwoColumn
                  currentPlanVisual={effectiveDisplayTier(
                    subscriptionBilling?.subscription,
                    subscriptionBilling?.vipClub
                  )}
                  onBookCall={async (plan, billingCycle = 'monthly') => {
                    const tier = effectiveDisplayTier(
                      subscriptionBilling?.subscription,
                      subscriptionBilling?.vipClub
                    )
                    if (plan === 'starter') {
                      showNotification(t('buyerCabinet_toastStarter'), 'info')
                      return
                    }
                    if (plan === 'vip') {
                      showNotification(t('buyerCabinet_toastVipSoon'), 'info')
                      return
                    }
                    if (plan !== 'pro') {
                      return
                    }
                    if (tier === 'pro' || tier === 'vip') {
                      showNotification(t('buyerCabinet_toastDuplicateSubscription'), 'info')
                      return
                    }
                    const userData = getUserData()
                    const uid = userData?.id ?? localStorage.getItem('userId')
                    const result = await startProSubscriptionCheckout({
                      userId: uid,
                      customerEmail: profileData.email || userData?.email,
                      billingCycle,
                    })
                    if (!result.ok) {
                      const msg =
                        result.error === 'already_subscribed_pro'
                          ? t('buyerCabinet_toastDuplicateSubscription')
                          : result.error || t('buyerCabinet_checkoutError')
                      showNotification(
                        msg,
                        result.error === 'already_subscribed_pro' ? 'info' : 'error',
                      )
                    }
                  }}
                />
              </div>
            </section>

          </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Profile

