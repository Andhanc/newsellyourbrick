import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { FaPencilAlt } from 'react-icons/fa'
import { useUser, useAuth } from '@clerk/clerk-react'
import { getUserData, logout, sendEmailVerificationCode, verifyEmailForProfileUpdate, validatePassword, saveUserData } from '../services/authService'
import EmailVerificationModal from '../components/EmailVerificationModal'
import PassportRecognitionModal from '../components/PassportRecognitionModal'
import CountrySelect, { countries as countryList } from '../components/CountrySelect'
import VerificationToast from '../components/VerificationToast'
import { extractPassportData } from '../services/aiService'
import { showNotification } from '../utils/toastHelper'
import './Data.css'
import './Profile.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const Data = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user: clerkUser, isLoaded: userLoaded } = useUser()
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    login: '',
    password: '',
    phone: '',
    country: '',
    countryFlag: '',
    address: '',
    passportSeries: '',
    passportNumber: '',
    identificationNumber: ''
  })
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [originalEmail, setOriginalEmail] = useState('')
  const [userId, setUserId] = useState(null)
  const [isWhatsAppUser, setIsWhatsAppUser] = useState(false)
  const [isRecognizingPassport, setIsRecognizingPassport] = useState(false)
  const [showPassportRecognitionModal, setShowPassportRecognitionModal] = useState(false)
  const [extractedPassportData, setExtractedPassportData] = useState(null)
  const passportInputRef = useRef(null)
  const editSnapshotRef = useRef(null) // снимок данных при входе в режим редактирования
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordView, setShowPasswordView] = useState(false)

  // Вспомогательная функция для форматирования номера телефона с плюсом
  const formatPhoneWithPlus = (phone) => {
    if (!phone) return ''
    // Убираем все пробелы и нецифровые символы, кроме +
    const cleaned = phone.replace(/[^\d+]/g, '')
    // Если номер начинается с цифр, добавляем плюс
    if (cleaned && !cleaned.startsWith('+')) {
      return '+' + cleaned
    }
    return cleaned
  }

  // Загружаем данные пользователя при монтировании компонента
  useEffect(() => {
    const loadUserData = async () => {
      const savedUserData = getUserData()
      
      if (savedUserData.isLoggedIn) {
        // Определяем, зарегистрирован ли пользователь через WhatsApp
        const whatsAppUser = savedUserData.loginMethod === 'whatsapp' || 
                            (savedUserData.phone && !savedUserData.email)
        setIsWhatsAppUser(whatsAppUser)
        setUserId(savedUserData.id)
        
        // Проверяем, зарегистрирован ли пользователь через Clerk
        const isClerkUser = savedUserData.loginMethod === 'clerk' || (isSignedIn && clerkUser)
        
        // Если пользователь зарегистрирован через Clerk, проверяем, что ID числовой (из БД)
        // Если ID из Clerk (например, user_xxxxx), нужно найти или создать пользователя в БД
        const isNumericId = savedUserData.id && /^\d+$/.test(savedUserData.id.toString())
        
        // Если пользователь авторизован в localStorage, загружаем его данные
        // Также пытаемся синхронизировать с БД, если есть ID
        if (savedUserData.id) {
          try {
            // Если пользователь через Clerk и ID не числовой (ID из Clerk), 
            // нужно найти пользователя в БД по email/телефону или создать его
            if (isClerkUser && !isNumericId) {
              console.log('⚠️ Data: Пользователь Clerk с ID из Clerk, синхронизируем с БД...')
              
              let dbUserId = null
              
              // Получаем email и телефон из Clerk или localStorage
              let userEmail = ''
              let userPhone = ''
              let userName = savedUserData.name || ''
              
              if (isSignedIn && clerkUser && userLoaded) {
                // Используем данные из Clerk, если доступны
                if (clerkUser.primaryEmailAddress?.emailAddress) {
                  userEmail = clerkUser.primaryEmailAddress.emailAddress
                } else if (clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0) {
                  userEmail = clerkUser.emailAddresses[0].emailAddress || ''
                }
                
                if (clerkUser.primaryPhoneNumber?.phoneNumber) {
                  userPhone = clerkUser.primaryPhoneNumber.phoneNumber
                } else if (clerkUser.phoneNumbers && clerkUser.phoneNumbers.length > 0) {
                  userPhone = clerkUser.phoneNumbers[0].phoneNumber || ''
                }
                
                if (clerkUser.fullName) {
                  userName = clerkUser.fullName
                } else if (clerkUser.firstName || clerkUser.lastName) {
                  userName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()
                }
              } else {
                // Используем данные из localStorage
                userEmail = savedUserData.email || ''
                userPhone = savedUserData.phone || savedUserData.phoneFormatted || ''
              }
              
              // Сначала пытаемся найти пользователя по email
              if (userEmail) {
                const emailResponse = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(userEmail.toLowerCase())}`)
                if (emailResponse.ok) {
                  const emailData = await emailResponse.json()
                  if (emailData.success && emailData.data) {
                    dbUserId = emailData.data.id
                    console.log('✅ Data: Пользователь найден в БД по email:', dbUserId)
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
                      console.log('✅ Data: Пользователь найден в БД по телефону:', dbUserId)
                    }
                  }
                }
              }
              
              // Если пользователь не найден, создаем его
              if (!dbUserId) {
                const nameParts = userName.split(' ')
                const firstName = nameParts[0] || 'Пользователь'
                const lastName = nameParts.slice(1).join(' ') || ''
                
                // Получаем роль из localStorage или sessionStorage
                const savedRole = sessionStorage.getItem('clerk_oauth_user_role') || 
                                localStorage.getItem('userRole') || 
                                savedUserData.role || 
                                'buyer'
                
                console.log('Data: Создание пользователя Clerk в БД с ролью:', savedRole)
                
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
                    role: savedRole === 'seller' ? 'seller' : 'buyer',
                    is_verified: 0,
                    is_online: 1
                  })
                })
                
                if (createResponse.ok) {
                  const createData = await createResponse.json()
                  if (createData.success && createData.data) {
                    dbUserId = createData.data.id
                    console.log('✅ Data: Пользователь создан в БД:', dbUserId)
                    
                    // Обновляем localStorage с правильным ID из БД
                    const updatedUserData = {
                      ...savedUserData,
                      id: dbUserId.toString()
                    }
                    saveUserData(updatedUserData, 'clerk')
                    localStorage.setItem('userId', String(dbUserId))
                  }
                } else {
                  const errorData = await createResponse.json().catch(() => ({}))
                  console.error('❌ Data: Ошибка создания пользователя:', errorData)
                }
              } else {
                // Если нашли пользователя, обновляем localStorage с правильным ID из БД
                const updatedUserData = {
                  ...savedUserData,
                  id: dbUserId.toString()
                }
                saveUserData(updatedUserData, 'clerk')
                localStorage.setItem('userId', String(dbUserId))
              }
              
              // Если нашли или создали пользователя, обновляем savedUserData.id для дальнейшего использования
              if (dbUserId) {
                savedUserData.id = dbUserId.toString()
                setUserId(dbUserId)
              }
            }
            
            // Теперь пытаемся загрузить данные из БД, используя числовой ID
            const userIdToFetch = savedUserData.id && /^\d+$/.test(savedUserData.id.toString()) 
              ? savedUserData.id 
              : null
            
            if (userIdToFetch) {
              const response = await fetch(`${API_BASE_URL}/users/${userIdToFetch}`)
              if (response.ok) {
                const result = await response.json()
                if (result.success && result.data) {
                  // Обновляем данные из БД
                  const dbUser = result.data
                  const nameParts = (dbUser.first_name && dbUser.last_name 
                    ? `${dbUser.first_name} ${dbUser.last_name}`.trim()
                    : savedUserData.name || '').split(' ')
                  const firstName = nameParts[0] || dbUser.first_name || ''
                  const lastName = nameParts.slice(1).join(' ') || dbUser.last_name || ''
                  
                  const email = dbUser.email || savedUserData.email || ''
                  setOriginalEmail(email)
                  
                  // Форматируем номер телефона с плюсом
                  const phoneFromDB = dbUser.phone_number || ''
                  const phoneFormatted = formatPhoneWithPlus(savedUserData.phoneFormatted || phoneFromDB)
                  
                  setUserData({
                    firstName: firstName,
                    lastName: lastName,
                    middleName: '',
                    email: email,
                    login: savedUserData.login || '',
                    password: savedUserData.password || '', // Загружаем пароль из localStorage, если есть
                    phone: phoneFormatted,
                    country: dbUser.country || savedUserData.country || '',
                    countryFlag: savedUserData.countryFlag || '',
                    address: dbUser.address || '',
                    passportSeries: dbUser.passport_series || '',
                    passportNumber: dbUser.passport_number || '',
                    identificationNumber: dbUser.identification_number || ''
                  })
                  
                  // Обновляем информацию о пользователе WhatsApp, если email был null или is_verified = 0
                  if (whatsAppUser && dbUser.phone_number && (!dbUser.email || dbUser.is_verified === 0)) {
                    setIsWhatsAppUser(true)
                  }
                  
                  return
                }
              } else if (response.status === 404) {
                console.warn('⚠️ Data: Пользователь не найден в БД (404), будет использован fallback')
              }
            }
          } catch (error) {
            console.warn('⚠️ Не удалось загрузить данные из БД, используем localStorage:', error.message)
          }
        }
        
        // Fallback: используем данные из localStorage
        const nameParts = (savedUserData.name || '').split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        const email = savedUserData.email || ''
        setOriginalEmail(email)
        
        // Форматируем номер телефона с плюсом
        const phoneFromStorage = savedUserData.phoneFormatted || savedUserData.phone || ''
        const phoneFormattedStorage = formatPhoneWithPlus(phoneFromStorage)
        
        setUserData({
          firstName: firstName,
          lastName: lastName,
          middleName: '',
          email: email,
          login: savedUserData.login || '',
          password: savedUserData.password || '', // Загружаем пароль из localStorage, если есть
          phone: phoneFormattedStorage,
          country: savedUserData.country || '',
          countryFlag: savedUserData.countryFlag || '',
          address: '',
          passportSeries: '',
          passportNumber: '',
          identificationNumber: ''
        })
      } else {
        // Если не авторизован, перенаправляем на главную страницу
        console.warn('⚠️ Пользователь не авторизован, перенаправление на главную')
        navigate('/')
      }
    }
    
    loadUserData()
  }, [navigate, isSignedIn, clerkUser, userLoaded, authLoaded])

  // Загружаем статус верификации при изменении userId или userData
  useEffect(() => {
    if (userId) {
      loadVerificationStatus()
    }
  }, [userId, userData])

  // Скролл и подсветка поля по параметру ?highlight=fieldName (переход из уведомления верификации)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const highlight = params.get('highlight')
    if (!highlight) return

    let removeTimerId = null
    const timerId = setTimeout(() => {
      const el = document.getElementById(`data-field-${highlight}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('data-field--highlight')
        removeTimerId = setTimeout(() => {
          el.classList.remove('data-field--highlight')
          navigate(location.pathname, { replace: true })
        }, 1800)
      } else {
        navigate(location.pathname, { replace: true })
      }
    }, 300)

    return () => {
      clearTimeout(timerId)
      if (removeTimerId) clearTimeout(removeTimerId)
    }
  }, [location.search, location.pathname, navigate])

  const loadVerificationStatus = async () => {
    if (!userId) return
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/verification-status`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setVerificationStatus(result.data)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки статуса верификации:', error)
    }
  }

  // Функции для проверки заполненности блоков
  const isBasicInfoComplete = () => {
    if (!verificationStatus?.missingFields) return false
    const { missingFields } = verificationStatus
    return !missingFields.firstName && 
           !missingFields.lastName && 
           !missingFields.emailOrPhone && 
           !missingFields.country && 
           !missingFields.address
  }

  const isPassportDataComplete = () => {
    if (!verificationStatus?.missingFields) return false
    const { missingFields } = verificationStatus
    return !missingFields.passportSeries && 
           !missingFields.passportNumber && 
           !missingFields.identificationNumber
  }

  const isDocumentsComplete = () => {
    return verificationStatus?.hasDocuments || false
  }

  // Проверяем, нужно ли показывать индикатор для "Данные"
  const shouldShowDataIndicator = () => {
    // Если verificationStatus еще не загружен, не показываем
    if (!verificationStatus) return false
    return !isBasicInfoComplete() || !isPassportDataComplete()
  }

  // Проверяем, нужно ли показывать индикатор для "Профиль"
  const shouldShowProfileIndicator = () => {
    // Если verificationStatus еще не загружен, не показываем
    if (!verificationStatus) return false
    return !isDocumentsComplete()
  }

  const [connectedAccounts, setConnectedAccounts] = useState({
    google: true
  })

  // Проверка: есть ли несохранённые изменения (сравниваем с снимком при входе в редактирование)
  const hasUnsavedChanges = (() => {
    if (!isEditing || !editSnapshotRef.current) return false
    const s = editSnapshotRef.current
    const normalizePhone = (p) => (p || '').replace(/\D/g, '')
    return (
      (userData.firstName || '') !== (s.firstName || '') ||
      (userData.lastName || '') !== (s.lastName || '') ||
      (userData.email || '') !== (s.email || '') ||
      (userData.login || '') !== (s.login || '') ||
      (userData.password || '') !== (s.password || '') ||
      normalizePhone(userData.phone) !== normalizePhone(s.phone) ||
      (userData.country || '') !== (s.country || '') ||
      (userData.address || '') !== (s.address || '') ||
      (userData.passportSeries || '') !== (s.passportSeries || '') ||
      (userData.passportNumber || '') !== (s.passportNumber || '') ||
      (userData.identificationNumber || '') !== (s.identificationNumber || '')
    )
  })()

  const handleEdit = () => {
    editSnapshotRef.current = { ...userData }
    setIsEditing(true)
  }

  const handleCancel = () => {
    editSnapshotRef.current = null
    setIsEditing(false)
  }

  const handleSave = async () => {
    try {
      const savedUserData = getUserData()
      
      // Если пользователь не авторизован, просто сохраняем в localStorage
      if (!savedUserData.isLoggedIn || !savedUserData.id) {
        console.warn('⚠️ Пользователь не авторизован, данные сохранены только локально')
        setIsEditing(false)
        return
      }
      
      // Проверяем, зарегистрирован ли пользователь через Clerk
      const isClerkUser = savedUserData.loginMethod === 'clerk' || (isSignedIn && clerkUser)
      
      // Если пользователь через Clerk и ID не числовой (ID из Clerk), 
      // нужно найти или создать пользователя в БД перед сохранением
      const isNumericId = savedUserData.id && /^\d+$/.test(savedUserData.id.toString())
      
      if (isClerkUser && !isNumericId) {
        console.log('⚠️ Data handleSave: Пользователь Clerk с ID из Clerk, синхронизируем с БД перед сохранением...')
        
        try {
          let dbUserId = null
          
          // Получаем email и телефон из Clerk или localStorage
          let userEmail = userData.email || savedUserData.email || ''
          let userPhone = userData.phone || savedUserData.phone || savedUserData.phoneFormatted || ''
          let userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || savedUserData.name || ''
          
          if (isSignedIn && clerkUser && userLoaded) {
            // Используем данные из Clerk, если они более свежие
            if (!userEmail && clerkUser.primaryEmailAddress?.emailAddress) {
              userEmail = clerkUser.primaryEmailAddress.emailAddress
            }
            if (!userPhone && clerkUser.primaryPhoneNumber?.phoneNumber) {
              userPhone = clerkUser.primaryPhoneNumber.phoneNumber
            }
            if (!userName && clerkUser.fullName) {
              userName = clerkUser.fullName
            }
          }
          
          // Сначала пытаемся найти пользователя по email
          if (userEmail) {
            const emailResponse = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(userEmail.toLowerCase())}`)
            if (emailResponse.ok) {
              const emailData = await emailResponse.json()
              if (emailData.success && emailData.data) {
                dbUserId = emailData.data.id
                console.log('✅ Data handleSave: Пользователь найден в БД по email:', dbUserId)
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
                  console.log('✅ Data handleSave: Пользователь найден в БД по телефону:', dbUserId)
                }
              }
            }
          }
          
          // Если пользователь не найден, создаем его
          if (!dbUserId) {
            const nameParts = userName.split(' ')
            const firstName = nameParts[0] || userData.firstName || 'Пользователь'
            const lastName = nameParts.slice(1).join(' ') || userData.lastName || ''
            
            // Получаем роль из localStorage или sessionStorage
            const savedRole = sessionStorage.getItem('clerk_oauth_user_role') || 
                            localStorage.getItem('userRole') || 
                            savedUserData.role || 
                            'buyer'
            
            console.log('Data handleSave: Создание пользователя Clerk в БД с ролью:', savedRole)
            
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
                role: savedRole === 'seller' ? 'seller' : 'buyer',
                is_verified: 0,
                is_online: 1
              })
            })
            
            if (createResponse.ok) {
              const createData = await createResponse.json()
              if (createData.success && createData.data) {
                dbUserId = createData.data.id
                console.log('✅ Data handleSave: Пользователь создан в БД:', dbUserId)
                
                // Обновляем localStorage с правильным ID из БД
                const updatedUserData = {
                  ...savedUserData,
                  id: dbUserId.toString()
                }
                saveUserData(updatedUserData, 'clerk')
                localStorage.setItem('userId', String(dbUserId))
              }
            } else {
              const errorData = await createResponse.json().catch(() => ({}))
              console.error('❌ Data handleSave: Ошибка создания пользователя:', errorData)
            }
          } else {
            // Если нашли пользователя, обновляем localStorage с правильным ID из БД
            const updatedUserData = {
              ...savedUserData,
              id: dbUserId.toString()
            }
            saveUserData(updatedUserData, 'clerk')
            localStorage.setItem('userId', String(dbUserId))
          }
          
          // Обновляем savedUserData.id для дальнейшего использования
          if (dbUserId) {
            savedUserData.id = dbUserId.toString()
            setUserId(dbUserId)
          } else {
            // Если не удалось создать или найти пользователя, показываем ошибку
            showNotification('❌ Не удалось синхронизировать данные с базой данных. Попробуйте обновить страницу.')
            return
          }
        } catch (error) {
          console.error('❌ Data handleSave: Ошибка синхронизации с БД:', error)
          showNotification('❌ Ошибка синхронизации с базой данных. Попробуйте обновить страницу.')
          return
        }
      }

      // Проверяем, изменился ли email для пользователя WhatsApp
      const emailChanged = userData.email && userData.email !== originalEmail
      
      if (emailChanged && isWhatsAppUser && userData.email.trim() !== '') {
        // Если email изменился для пользователя WhatsApp, требуем подтверждение
        // Сначала отправляем код подтверждения
        try {
          const emailLower = userData.email.toLowerCase()
          const codeResult = await sendEmailVerificationCode(emailLower)
          
          if (codeResult.success) {
            // Сохраняем новый email как pending
            setPendingEmail(emailLower)
            // Показываем модальное окно для ввода кода
            setShowEmailVerificationModal(true)
            return // Не сохраняем данные, пока не подтвержден email
          } else {
            showNotification(codeResult.error || 'Не удалось отправить код подтверждения. Попробуйте позже.')
            return
          }
        } catch (error) {
          console.error('Ошибка отправки кода подтверждения:', error)
          showNotification('Ошибка отправки кода подтверждения. Попробуйте позже.')
          return
        }
      }

      // Форматируем номер телефона (убираем все кроме цифр)
      const phoneDigits = userData.phone ? userData.phone.replace(/\D/g, '') || null : null

      // Подготавливаем данные для отправки на backend
      const updateData = {
        first_name: userData.firstName || null,
        last_name: userData.lastName || null,
        email: userData.email || null,
        phone_number: phoneDigits,
        address: userData.address || null,
        country: userData.country || null,
        passport_series: userData.passportSeries || null,
        passport_number: userData.passportNumber || null,
        identification_number: userData.identificationNumber || null
      }
      
      // Если пароль заполнен, валидируем и добавляем его в данные для обновления
      // ВАЖНО: пароль отправляется только если поле заполнено (для изменения существующего пароля)
      if (userData.password && userData.password.trim() !== '') {
        // Валидация пароля по требованиям (заглавная буква, спецсимвол, цифра)
        const passwordValidation = validatePassword(userData.password.trim())
        if (!passwordValidation.valid) {
          showNotification(passwordValidation.message)
          return // Не сохраняем, если пароль не валиден
        }
        
        updateData.password = userData.password.trim() // Пароль будет захеширован на backend
        console.log('🔐 Пароль будет обновлен при сохранении')
      } else {
        // Если пароль пустой, не отправляем его (не меняем существующий пароль)
        console.log('ℹ️ Пароль не изменен (поле пустое)')
      }

      console.log('📤 Отправка данных на сервер:', {
        userId: savedUserData.id,
        apiUrl: `${API_BASE_URL}/users/${savedUserData.id}`,
        updateData: { ...updateData, password: updateData.password ? '***скрыт***' : undefined }
      })

      // Отправляем данные на backend
      const response = await fetch(`${API_BASE_URL}/users/${savedUserData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const result = await response.json()
        
        // Проверяем, требуется ли подтверждение email
        if (result.requiresVerification === true) {
          // Если требуется подтверждение, отправляем код и показываем модальное окно
          try {
            const emailLower = (userData.email || '').toLowerCase()
            if (emailLower) {
              const codeResult = await sendEmailVerificationCode(emailLower)
              
              if (codeResult.success) {
                setPendingEmail(emailLower)
                setShowEmailVerificationModal(true)
                return
              } else {
                showNotification(codeResult.error || 'Не удалось отправить код подтверждения. Попробуйте позже.')
                return
              }
            }
          } catch (error) {
            console.error('Ошибка отправки кода подтверждения:', error)
            showNotification('Ошибка отправки кода подтверждения. Попробуйте позже.')
            return
          }
        }
        
        console.log('✅ Данные успешно сохранены в БД:', result.data)
        
        // Форматируем номер телефона с плюсом для обновления состояния
        const formattedPhone = formatPhoneWithPlus(userData.phone || '')
        
        // Обновляем данные в localStorage
        const updatedUserData = {
          ...savedUserData,
          name: `${userData.firstName} ${userData.lastName}`.trim(),
          email: result.data?.email || userData.email || savedUserData.email,
          phoneFormatted: formattedPhone || savedUserData.phoneFormatted,
          phone: phoneDigits || savedUserData.phone,
          country: userData.country || savedUserData.country,
          address: userData.address || savedUserData.address
        }
        localStorage.setItem('userData', JSON.stringify(updatedUserData))
        
        // Обновляем originalEmail после успешного сохранения
        setOriginalEmail(result.data?.email || userData.email || originalEmail)
        
        // Сохраняем пароль в localStorage, если он был изменен
        const currentUserData = getUserData()
        if (userData.password && userData.password.trim() !== '') {
          const updatedUserDataWithPassword = {
            ...currentUserData,
            password: userData.password // Сохраняем пароль локально для показа
          }
          localStorage.setItem('userData', JSON.stringify(updatedUserDataWithPassword))
        }
        
        // Обновляем состояние, включая номер телефона с плюсом
        // Пароль НЕ очищаем, чтобы можно было его видеть
        setUserData(prev => ({ 
          ...prev, 
          phone: formattedPhone || prev.phone
        }))
        
        editSnapshotRef.current = null
        setIsEditing(false)
        // Перезагружаем статус верификации после сохранения
        loadVerificationStatus()
        // Отправляем событие для обновления уведомления о верификации
        window.dispatchEvent(new Event('verification-status-update'))
        showNotification('Данные успешно сохранены!')
      } else {
        const errorText = await response.text().catch(() => 'Не удалось получить детали ошибки')
        let errorData = {}
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText || `Ошибка ${response.status}: ${response.statusText}` }
        }
        
        console.error('❌ Ошибка при сохранении в БД:', response.status, errorData.error || 'Неизвестная ошибка')
        
        // Формируем информативное сообщение об ошибке
        let errorMessage = '⚠️ Данные сохранены локально, но не в БД.\n\n'
        
        // Если это ошибка валидации пароля, показываем детальную информацию
        if (response.status === 400 && errorData.passwordValidation) {
          errorMessage = errorData.error || errorData.message || 'Пароль не соответствует требованиям'
          if (errorData.passwordValidation.missing && errorData.passwordValidation.missing.length > 0) {
            errorMessage += `\n\nДобавьте: ${errorData.passwordValidation.missing.join(', ')}`
          }
          if (errorData.passwordValidation.present && errorData.passwordValidation.present.length > 0) {
            errorMessage += `\nУже есть: ${errorData.passwordValidation.present.join(', ')}`
          }
        } else if (response.status === 404) {
          errorMessage += '❌ Пользователь не найден в базе данных.'
        } else if (response.status === 409) {
          errorMessage += '❌ Конфликт данных: ' + (errorData.error || 'Пользователь с такими данными уже существует')
        } else if (response.status === 500) {
          errorMessage += '❌ Ошибка сервера: ' + (errorData.error || 'Внутренняя ошибка сервера')
          errorMessage += '\n\n💡 Проверьте логи сервера для подробностей.'
        } else {
          errorMessage += '❌ Ошибка ' + response.status + ': ' + (errorData.error || response.statusText)
        }
        
        errorMessage += '\n\n💡 Убедитесь, что:\n- Backend сервер запущен\n- База данных доступна\n- URL API правильный: ' + API_BASE_URL
        
        // Fallback: сохраняем только в localStorage
        const updatedUserData = {
          ...savedUserData,
          name: `${userData.firstName} ${userData.lastName}`.trim(),
          email: userData.email || savedUserData.email,
          phoneFormatted: userData.phone || savedUserData.phoneFormatted,
          phone: phoneDigits || savedUserData.phone,
          country: userData.country || savedUserData.country,
          address: userData.address || savedUserData.address
        }
        localStorage.setItem('userData', JSON.stringify(updatedUserData))
        
        showNotification(errorMessage)
        editSnapshotRef.current = null
        setIsEditing(false)
      }
    } catch (error) {
      console.error('❌ Ошибка при сохранении данных:', error)
      console.error('   Тип ошибки:', error.name)
      console.error('   Сообщение:', error.message)
      console.error('   Stack:', error.stack)
      
      // Определяем тип ошибки для более информативного сообщения
      let errorMessage = '⚠️ Ошибка при сохранении. Данные сохранены локально.'
      
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        errorMessage += '\n\n💡 Проверьте:\n- Запущен ли сервер (npm run server или node server/server.js)\n- Правильно ли указан API_BASE_URL\n- Доступен ли сервер по адресу ' + API_BASE_URL
      } else if (error.message?.includes('replace')) {
        errorMessage += '\n\n❌ Ошибка обработки данных: ' + error.message
        errorMessage += '\n\n💡 Убедитесь, что все поля заполнены корректно.'
      } else {
        errorMessage += '\n\nОшибка: ' + (error.message || 'Неизвестная ошибка')
      }
      
      // Fallback: сохраняем только в localStorage
      const savedUserData = getUserData()
      const updatedUserData = {
        ...savedUserData,
        name: `${userData.firstName} ${userData.lastName}`.trim(),
        email: userData.email || savedUserData.email,
        phoneFormatted: userData.phone || savedUserData.phoneFormatted,
        country: userData.country || savedUserData.country,
        address: userData.address || savedUserData.address
      }
      localStorage.setItem('userData', JSON.stringify(updatedUserData))
      
      showNotification(errorMessage)
      editSnapshotRef.current = null
      setIsEditing(false)
    }
  }
  
  // Обработчик успешного подтверждения email
  const handleEmailVerificationSuccess = async (userDataOrCode) => {
    try {
      // После подтверждения email на сервере, загружаем обновленные данные пользователя
      if (!userId) {
        console.error('Ошибка: userId не определен')
        setShowEmailVerificationModal(false)
        setPendingEmail('')
        return
      }
      
      // Сохраняем email перед очисткой pendingEmail
      const confirmedEmailForUpdate = pendingEmail || userData.email
      
      // Закрываем модальное окно сразу после успешного подтверждения
      setShowEmailVerificationModal(false)
      setPendingEmail('')

      // Сначала загружаем обновленные данные пользователя с сервера
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            // Обновляем данные из БД
            const dbUser = result.data
            const nameParts = (dbUser.first_name && dbUser.last_name 
              ? `${dbUser.first_name} ${dbUser.last_name}`.trim()
              : dbUser.first_name || '').split(' ')
            const firstName = nameParts[0] || dbUser.first_name || ''
            const lastName = nameParts.slice(1).join(' ') || dbUser.last_name || ''
            
            const confirmedEmail = dbUser.email || confirmedEmailForUpdate
            
            // Обновляем состояние полностью с новым email
            setUserData(prev => {
              // Форматируем номер телефона с плюсом
              const phoneFromDB = dbUser.phone_number || ''
              const formattedPhone = formatPhoneWithPlus(phoneFromDB || prev.phone || '')
              
              return {
                ...prev,
                firstName: firstName,
                lastName: lastName,
                email: confirmedEmail,
                phone: formattedPhone,
                country: dbUser.country || prev.country || '',
                address: dbUser.address || prev.address || '',
                passportSeries: dbUser.passport_series || prev.passportSeries || '',
                passportNumber: dbUser.passport_number || prev.passportNumber || '',
                identificationNumber: dbUser.identification_number || prev.identificationNumber || '',
                password: '' // Очищаем пароль
              }
            })
            
            // Обновляем originalEmail
            setOriginalEmail(confirmedEmail)
            
            // Обновляем localStorage с данными с сервера
            const savedUserData = getUserData()
            const updatedUserData = {
              ...savedUserData,
              ...result.data,
              email: confirmedEmail
            }
            localStorage.setItem('userData', JSON.stringify(updatedUserData))
            
            console.log('✅ Данные пользователя обновлены с сервера:', result.data)
            
            // Обновляем остальные данные, если они были изменены (имя, фамилия и т.д.)
            const phoneDigits = userData.phone.replace(/\D/g, '') || null
            const updateData = {
              first_name: userData.firstName || null,
              last_name: userData.lastName || null,
              phone_number: phoneDigits,
              address: userData.address || null,
              country: userData.country || null,
              passport_series: userData.passportSeries || null,
              passport_number: userData.passportNumber || null,
              identification_number: userData.identificationNumber || null
            }
            
            if (userData.password && userData.password.trim() !== '') {
              updateData.password = userData.password.trim()
            }
            
            // Обновляем остальные данные на сервере, если они были изменены
            try {
              const updateResponse = await fetch(`${API_BASE_URL}/users/${userId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
              })
              
              if (updateResponse.ok) {
                const updateResult = await updateResponse.json()
                if (updateResult.success && updateResult.data) {
                  console.log('✅ Все данные успешно сохранены:', updateResult.data)
                  
                  // Обновляем состояние еще раз с данными с сервера
                  const updatedDbUser = updateResult.data
                  const updatedNameParts = (updatedDbUser.first_name && updatedDbUser.last_name 
                    ? `${updatedDbUser.first_name} ${updatedDbUser.last_name}`.trim()
                    : updatedDbUser.first_name || '').split(' ')
                  const updatedFirstName = updatedNameParts[0] || updatedDbUser.first_name || ''
                  const updatedLastName = updatedNameParts.slice(1).join(' ') || updatedDbUser.last_name || ''
                  
                  setUserData(prev => {
                    // Форматируем номер телефона с плюсом
                    const updatedPhoneFromDB = updatedDbUser.phone_number || ''
                    const updatedFormattedPhone = formatPhoneWithPlus(updatedPhoneFromDB || prev.phone || '')
                    
                    return {
                      ...prev,
                      firstName: updatedFirstName,
                      lastName: updatedLastName,
                      email: updatedDbUser.email || confirmedEmail || prev.email,
                      phone: updatedFormattedPhone,
                      address: updatedDbUser.address || prev.address,
                      country: updatedDbUser.country || prev.country,
                      passportSeries: updatedDbUser.passport_series || prev.passportSeries,
                      passportNumber: updatedDbUser.passport_number || prev.passportNumber,
                      identificationNumber: updatedDbUser.identification_number || prev.identificationNumber,
                      password: '' // Очищаем пароль
                    }
                  })
                  
                  // Обновляем originalEmail на случай, если email изменился
                  if (updatedDbUser.email) {
                    setOriginalEmail(updatedDbUser.email)
                  }
                  
                  // Обновляем localStorage
                  const currentSavedData = getUserData()
                  const finalUpdatedData = {
                    ...currentSavedData,
                    ...updateResult.data
                  }
                  localStorage.setItem('userData', JSON.stringify(finalUpdatedData))
                }
              }
            } catch (updateError) {
              console.warn('⚠️ Не удалось сохранить остальные данные:', updateError)
            }
            
            // Выходим из режима редактирования
            setIsEditing(false)
            
            showNotification('Email успешно подтвержден и данные сохранены!')
            return // Прерываем выполнение, так как уже все обновили
          }
        }
      } catch (error) {
        console.warn('⚠️ Не удалось загрузить данные с сервера, используем localStorage:', error)
        // Fallback: используем данные из localStorage
        const savedUserData = getUserData()
        if (savedUserData.email) {
          setUserData(prev => ({
            ...prev,
            email: savedUserData.email
          }))
          setOriginalEmail(savedUserData.email)
          
          setIsEditing(false)
          showNotification('Email успешно подтвержден! Данные обновлены из локального хранилища.')
          return
        }
      }
    } catch (error) {
      console.error('Ошибка обновления данных после подтверждения email:', error)
      showNotification('Email подтвержден, но возникла ошибка при обновлении данных. Попробуйте обновить страницу.')
      
      // Закрываем модальное окно даже при ошибке
      setShowEmailVerificationModal(false)
      setPendingEmail('')
    }
  }

  const handleChange = (field, value) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleDisconnectAccount = (account) => {
    setConnectedAccounts(prev => ({
      ...prev,
      [account]: false
    }))
  }

  const handleDeleteAccount = () => {
    if (window.confirm('Вы уверены, что хотите удалить аккаунт? Это действие необратимо.')) {
      // Здесь можно добавить логику удаления аккаунта
      showNotification('Аккаунт будет удален')
    }
  }

  const handleLogout = async () => {
    if (window.confirm('Вы уверены, что хотите выйти?')) {
      await logout()
      navigate('/')
      // Небольшая задержка перед перезагрузкой, чтобы данные успели очиститься
      setTimeout(() => {
        window.location.reload() // Перезагружаем страницу для обновления состояния
      }, 100)
    }
  }

  // Обработка распознавания паспорта
  const handlePassportRecognition = async (file) => {
    setIsRecognizingPassport(true)
    
    try {
      // Динамически импортируем Tesseract.js только при необходимости
      const Tesseract = await import('tesseract.js')
      
      console.log('📸 Начало распознавания паспорта...')
      
      // Распознаем текст с помощью Tesseract.js
      const { data: { text } } = await Tesseract.recognize(file, 'rus+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log('🔄 Прогресс:', Math.round(m.progress * 100) + '%')
          }
        }
      })
      
      console.log('✅ Текст распознан:', text.substring(0, 200) + '...')
      
      // Отправляем распознанный текст на сервер для извлечения данных через AI
      const response = await fetch(`${API_BASE_URL}/passport/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recognizedText: text })
      })
      
      if (!response.ok) {
        throw new Error('Ошибка при извлечении данных из паспорта')
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        console.log('✅ Данные извлечены:', result.data)
        
        // Сохраняем извлеченные данные
        setExtractedPassportData(result.data)
        
        // Автоматически заполняем поля
        const extracted = result.data
        setUserData(prev => ({
          ...prev,
          firstName: extracted.firstName || prev.firstName,
          lastName: extracted.lastName || prev.lastName,
          middleName: extracted.middleName || prev.middleName,
          passportSeries: extracted.passportSeries || prev.passportSeries,
          passportNumber: extracted.passportNumber || prev.passportNumber,
          identificationNumber: extracted.identificationNumber || prev.identificationNumber,
          address: extracted.address || prev.address,
          email: extracted.email || prev.email
        }))
        
        // Показываем модальное окно с подтверждением
        setShowPassportRecognitionModal(true)
      } else {
        throw new Error('Не удалось извлечь данные из паспорта')
      }
    } catch (error) {
      console.error('❌ Ошибка при распознавании паспорта:', error)
      showNotification('Ошибка при распознавании паспорта: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setIsRecognizingPassport(false)
    }
  }

  // Обработка подтверждения распознавания
  const handlePassportRecognitionConfirm = () => {
    // Убеждаемся, что мы в режиме редактирования
    if (!isEditing) {
      setIsEditing(true)
    }
    // Закрываем модальное окно (оно закроется автоматически через onConfirm)
  }

  return (
    <div className="data-page">
      <div className="data-container">
        <aside className="data-sidebar">
          <div className="sidebar-header" style={{ marginTop: '24px', display: 'flex', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="back-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 24px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#0ABAB5',
                fontSize: '18px',
                fontWeight: '600',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Назад</span>
            </button>
            <button 
              type="button"
              className="header-logout-button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleLogout()
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M7 2H3C2.44772 2 2 2.44772 2 3V15C2 15.5523 2.44772 16 3 16H7M12 13L15 10M15 10L12 7M15 10H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Выйти</span>
            </button>
          </div>
          <nav className="sidebar-nav">
            <Link to="/profile" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" fill="currentColor"/>
                <path d="M10 12C5.58172 12 2 13.7909 2 16V20H18V16C18 13.7909 14.4183 12 10 12Z" fill="currentColor"/>
              </svg>
              <span>Профиль</span>
              {shouldShowProfileIndicator() && (
                <span className="nav-item-indicator"></span>
              )}
            </Link>
            <Link to="/data" className="nav-item active">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M6 8H14M6 12H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>Данные</span>
              {shouldShowDataIndicator() && (
                <span className="nav-item-indicator"></span>
              )}
            </Link>
            <Link to="/subscriptions" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L12.5 7.5L19 10L12.5 12.5L10 19L7.5 12.5L1 10L7.5 7.5L10 2Z" fill="currentColor"/>
              </svg>
              <span>Подписки</span>
            </Link>
            <Link to="/history" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M6 8H14M6 12H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>История</span>
            </Link>
            <Link to="/chat" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M7 8H13M7 12H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>Чат</span>
            </Link>
            <a href="#" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L12.5 7.5L19 10L12.5 12.5L10 19L7.5 12.5L1 10L7.5 7.5L10 2Z" fill="currentColor"/>
              </svg>
              <span>Понравилось</span>
            </a>
          </nav>

          <button 
            className="logout-button" 
            onClick={handleLogout}
            style={{ marginTop: 'auto', marginBottom: '24px', marginLeft: '16px', marginRight: '16px' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M7 2H3C2.44772 2 2 2.44772 2 3V15C2 15.5523 2.44772 16 3 16H7M12 13L15 10M15 10L12 7M15 10H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Выйти</span>
          </button>
        </aside>

        <main className="data-main">
          <div className="data-header">
            <h1>Личные данные</h1>
            <div className="data-edit-controls">
                {!isEditing ? (
                  <button type="button" className="data-edit-btn" onClick={handleEdit} aria-label="Редактировать">
                    <FaPencilAlt size={18} />
                    <span>Редактировать</span>
                  </button>
                ) : (
                  <>
                    <button type="button" className="data-cancel-btn" onClick={handleCancel} aria-label="Отменить">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Отменить</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="data-save-btn"
                  onClick={handleSave}
                  disabled={!isEditing || !hasUnsavedChanges}
                  aria-label="Сохранить"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M15 4.5L6.75 12.75L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Сохранить</span>
                </button>
              </div>
          </div>

          <div className="data-content">
            {/* Всплывающее уведомление о прогрессе верификации */}
            {userId && <VerificationToast userId={userId} />}

            <section className="data-section">
              <h2 className="section-title">
                Основная информация
                {verificationStatus && !isBasicInfoComplete() && (
                  <span className="section-indicator section-indicator--incomplete"></span>
                )}
              </h2>
              <div className="data-grid">
                <div id="data-field-firstName" className="data-field">
                  <label>Имя</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={userData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      className="data-input"
                    />
                  ) : (
                    <div className="data-value">{userData.firstName || 'Не указано'}</div>
                  )}
                </div>

                <div id="data-field-lastName" className="data-field">
                  <label>Фамилия</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={userData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      className="data-input"
                    />
                  ) : (
                    <div className="data-value">{userData.lastName || 'Не указано'}</div>
                  )}
                </div>

                <div id="data-field-emailOrPhone" className="data-field">
                  <label>Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={userData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="data-input"
                    />
                  ) : (
                    <div className="data-value">{userData.email || 'Не указан'}</div>
                  )}
                </div>

                <div className="data-field">
                  <label>Логин</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={userData.login}
                      onChange={(e) => handleChange('login', e.target.value)}
                      className="data-input"
                      placeholder="Введите логин"
                    />
                  ) : (
                    <div className="data-value">{userData.login || 'Не указан'}</div>
                  )}
                </div>

                <div className="data-field">
                  <label>Пароль</label>
                  {isEditing ? (
                    <div className="data-input-password-wrapper">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={userData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        className="data-input data-input--password"
                        placeholder={userData.password ? "Введите новый пароль или оставьте текущий" : "Введите новый пароль"}
                      />
                      <button
                        type="button"
                        className="data-input-password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? "Скрыть пароль" : "Показать пароль"}
                      >
                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>
                  ) : (
                    <div className="data-value data-value--password">
                      {showPasswordView && userData.password ? userData.password : '••••••••'}
                      {userData.password && (
                        <button
                          type="button"
                          className="data-value-password-toggle"
                          onClick={() => setShowPasswordView(!showPasswordView)}
                          title={showPasswordView ? "Скрыть пароль" : "Показать пароль"}
                        >
                          {showPasswordView ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="data-field">
                  <label>Номер телефона</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={userData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="data-input"
                    />
                  ) : (
                    <div className="data-value">{formatPhoneWithPlus(userData.phone) || 'Не указан'}</div>
                  )}
                </div>

                <div id="data-field-country" className="data-field">
                  <label>Страна *</label>
                  {isEditing ? (
                    <CountrySelect
                      value={userData.country}
                      onChange={(value) => handleChange('country', value)}
                      placeholder="Выберите страну"
                      className="data-input"
                    />
                  ) : (
                    <div className="data-value">
                      {(() => {
                        const selectedCountry = countryList.find(c => c.name === userData.country);
                        return userData.country ? (
                          <>
                            {selectedCountry && <span style={{ marginRight: '6px' }}>{selectedCountry.flag}</span>}
                            {userData.country}
                          </>
                        ) : (
                          'Не указана'
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div id="data-field-address" className="data-field">
                  <label>Адрес проживания</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={userData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      className="data-input"
                      placeholder="Введите адрес"
                    />
                  ) : (
                    <div className="data-value">{userData.address || 'Не указан'}</div>
                  )}
                </div>
              </div>
            </section>

            <section className="data-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="section-title">
                  Паспортные данные
                  {verificationStatus && !isPassportDataComplete() && (
                    <span className="section-indicator section-indicator--incomplete"></span>
                  )}
                </h2>
                <button
                  className="recognize-passport-button recognize-passport-button--desktop"
                  onClick={() => passportInputRef.current?.click()}
                  disabled={isRecognizingPassport}
                >
                  {isRecognizingPassport ? (
                    <>
                      <span className="spinner" style={{ 
                        width: '16px', 
                        height: '16px', 
                        border: '2px solid #fff', 
                        borderTop: '2px solid transparent', 
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></span>
                      Распознавание...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      Распознать с фото паспорта
                    </>
                  )}
                </button>
              </div>
              <input
                ref={passportInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files[0]
                  if (!file) return
                  
                  await handlePassportRecognition(file)
                  // Сбрасываем input
                  e.target.value = ''
                }}
              />
              <div className="data-grid">
                <div id="data-field-passportSeries" className="data-field">
                  <label>Серия паспорта</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={userData.passportSeries}
                      onChange={(e) => handleChange('passportSeries', e.target.value)}
                      className="data-input"
                      maxLength="2"
                    />
                  ) : (
                    <div className="data-value">{userData.passportSeries}</div>
                  )}
                </div>

                <div id="data-field-passportNumber" className="data-field">
                  <label>Номер паспорта</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={userData.passportNumber}
                      onChange={(e) => handleChange('passportNumber', e.target.value)}
                      className="data-input"
                    />
                  ) : (
                    <div className="data-value">{userData.passportNumber}</div>
                  )}
                </div>

                <div id="data-field-identificationNumber" className="data-field data-field-full">
                  <label>Идентификационный номер</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={userData.identificationNumber}
                      onChange={(e) => handleChange('identificationNumber', e.target.value)}
                      className="data-input"
                    />
                  ) : (
                    <div className="data-value">{userData.identificationNumber}</div>
                  )}
                </div>
              </div>

              {/* Мобильная кнопка распознавания паспорта под формой */}
              <button
                className="recognize-passport-button recognize-passport-button--mobile"
                onClick={() => passportInputRef.current?.click()}
                disabled={isRecognizingPassport}
              >
                {isRecognizingPassport ? (
                  <>
                    <span className="spinner" style={{ 
                      width: '16px', 
                      height: '16px', 
                      border: '2px solid #fff', 
                      borderTop: '2px solid transparent', 
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></span>
                    Распознавание...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    Распознать с фото паспорта
                  </>
                )}
              </button>
            </section>

            <section className="data-section">
              <h2 className="section-title">Подключенные аккаунты</h2>
              <div className="connected-accounts">
                <div className="account-item">
                  <div className="account-info">
                    <div className="account-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    </div>
                    <div className="account-details">
                      <div className="account-name">Google</div>
                      <div className="account-status">
                        {connectedAccounts.google ? 'Подключен' : 'Не подключен'}
                      </div>
                    </div>
                  </div>
                  {connectedAccounts.google && (
                    <button
                      className="disconnect-button"
                      onClick={() => handleDisconnectAccount('google')}
                    >
                      Отключить
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="data-section danger-section">
              <div className="danger-actions">
                <div className="danger-info">
                  <h3>Удаление аккаунта</h3>
                  <p>После удаления аккаунта все ваши данные будут безвозвратно удалены. Это действие нельзя отменить.</p>
                </div>
                <button className="delete-account-button" onClick={handleDeleteAccount}>
                  Удалить аккаунт
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>
      
      {/* Модальное окно подтверждения email */}
      <EmailVerificationModal
        isOpen={showEmailVerificationModal}
        onClose={() => {
          // При закрытии без подтверждения возвращаем email к исходному значению
          setUserData(prev => ({
            ...prev,
            email: originalEmail
          }))
          setShowEmailVerificationModal(false)
          setPendingEmail('')
        }}
        onSuccess={handleEmailVerificationSuccess}
        email={pendingEmail}
        isProfileUpdate={true}
        userId={userId}
      />

      {/* Модальное окно распознавания паспорта */}
      <PassportRecognitionModal
        isOpen={showPassportRecognitionModal}
        onClose={() => {
          setShowPassportRecognitionModal(false)
          setExtractedPassportData(null)
        }}
        onConfirm={handlePassportRecognitionConfirm}
        extractedData={extractedPassportData}
      />
    </div>
  )
}

export default Data

