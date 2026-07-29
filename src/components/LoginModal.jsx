import { useState, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { FiX, FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiChevronLeft, FiShoppingBag, FiArrowUpRight } from 'react-icons/fi'
import { FaGoogle, FaWhatsapp, FaFacebook, FaTelegram } from 'react-icons/fa'
import { useSignIn, useAuth, useUser } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import { registerWithEmail, loginWithEmail, validatePassword, saveUserData, getReferrerId, checkSellerRegistrationEmail } from '../services/authService'
import { getApiBaseUrl } from '../utils/apiConfig'
import { showNotification } from '../utils/toastHelper'
import { shouldDefaultLoginModalToLogin } from '../utils/visitorAuthDefault'
import { setLoginModalOpen } from '../utils/loginModalDocumentFlag'
import { getCabinetHomePath } from '../utils/cabinetRoutes'
import { isSoftLaunchFeatureBlocked } from '../utils/softLaunchAccess'
import './LoginModal.css'

const LazyWhatsAppVerificationModal = lazy(() => import('./WhatsAppVerificationModal'))
const LazyEmailVerificationModal = lazy(() => import('./EmailVerificationModal'))
const LazyForgotPasswordModal = lazy(() => import('./ForgotPasswordModal'))
const LazyBuyerSellerLinkConfirmModal = lazy(() => import('./BuyerSellerLinkConfirmModal'))
const LazyVerificationDocumentsModal = lazy(() => import('./VerificationDocumentsModal'))
const LazyAnimatedCharacters = lazy(() => import('./AnimatedCharacters'))

/** authEntryVariant: header_wizard — Шаг 1 (роль) → Шаг 2 (вход/регистрация + данные); default — один экран (принудительные OAuth и т.п.) */
const LoginModal = ({ isOpen, onClose, authEntryVariant = 'header_wizard' }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signIn, isLoaded: signInLoaded } = useSignIn()
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const { user, isLoaded: userLoaded } = useUser()
  const [isLogin, setIsLogin] = useState(() => {
    const forcedMode = sessionStorage.getItem('login_modal_mode')
    if (forcedMode === 'register') return false
    if (forcedMode === 'login') return true
    // Первый визит в браузере → регистрация; уже бывали / есть след сессии → вход
    return shouldDefaultLoginModalToLogin()
  }) // true — вход, false — регистрация
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  })
  const [userRole, setUserRole] = useState(() => {
    return sessionStorage.getItem('login_modal_user_role') || 'buyer' // 'buyer' или 'seller'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  /** Ошибка «пароль продавца = пароль покупателя» — текст под кнопкой регистрации, не сверху формы */
  const [registerBottomError, setRegisterBottomError] = useState('')
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)
  const [showBuyerSellerLinkConfirm, setShowBuyerSellerLinkConfirm] = useState(false)
  const [pendingSellerLinkBuyerId, setPendingSellerLinkBuyerId] = useState(null)
  const [sellerRegistrationBuyerId, setSellerRegistrationBuyerId] = useState(null)
  const [showVerificationDocumentsModal, setShowVerificationDocumentsModal] = useState(false)
  const [newUserId, setNewUserId] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [isEmailFocused, setIsEmailFocused] = useState(false)
  const telegramWidgetRef = useRef(null)
  const welcomeVideoRef = useRef(null)
  const [telegramBotUsername, setTelegramBotUsername] = useState(() => import.meta.env?.VITE_TELEGRAM_BOT_USERNAME || '')
  const [telegramConfigLoaded, setTelegramConfigLoaded] = useState(!!import.meta.env?.VITE_TELEGRAM_BOT_USERNAME)
  /** header_wizard: сначала роль → войти/регистрация → форма (в регистрации без повторного выбора роли) */
  const [wizardPhase, setWizardPhase] = useState('form')

  // На Railway VITE_* нет в сборке — загружаем имя бота с сервера при открытии модалки
  const fetchTelegramConfig = () => {
    const fromEnv = import.meta.env?.VITE_TELEGRAM_BOT_USERNAME || ''
    if (fromEnv) {
      setTelegramBotUsername(fromEnv)
      setTelegramConfigLoaded(true)
      return
    }
    getApiBaseUrl().then((apiBase) => {
      const url = apiBase.startsWith('http') ? apiBase : `${window.location.origin}${apiBase.startsWith('/') ? '' : '/'}${apiBase}`
      fetch(`${url.replace(/\/$/, '')}/config`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const username = data?.success && data?.data ? (data.data.telegramBotUsername || '') : ''
          if (username) setTelegramBotUsername(username)
          setTelegramConfigLoaded(true)
        })
        .catch(() => setTelegramConfigLoaded(true))
    }).catch(() => setTelegramConfigLoaded(true))
  }

  useEffect(() => {
    fetchTelegramConfig()
  }, [])

  // При открытии модалки повторно запрашиваем конфиг (на случай если первый запрос был до готовности API)
  useEffect(() => {
    if (isOpen && !telegramBotUsername) {
      fetchTelegramConfig()
    }
  }, [isOpen])

  // При открытии: принудительный режим из sessionStorage, мастер из шапки (до отрисовки — без мигания формы)
  useLayoutEffect(() => {
    if (!isOpen) {
      setWizardPhase('form')
      return
    }

    const forcedMode = sessionStorage.getItem('login_modal_mode')
    if (forcedMode === 'register') {
      setIsLogin(false)
    } else if (forcedMode === 'login') {
      setIsLogin(true)
    } else if (authEntryVariant === 'header_wizard') {
      // Мастер из шапки (роль → форма): по умолчанию первая вкладка — «Зарегистрироваться»
      setIsLogin(false)
    } else {
      setIsLogin(shouldDefaultLoginModalToLogin())
    }

    const forcedRole = sessionStorage.getItem('login_modal_user_role')
    /** Clerk / Profile и т.д. — сразу форма, без шага выбора роли */
    const skipWizardSteps =
      forcedMode === 'login' || forcedMode === 'register'

    sessionStorage.removeItem('login_modal_mode')
    sessionStorage.removeItem('login_modal_user_role')

    if (authEntryVariant === 'header_wizard' && !skipWizardSteps) {
      setWizardPhase('role')
      setUserRole('buyer')
    } else {
      setWizardPhase('form')
      if (forcedRole === 'buyer' || forcedRole === 'seller' || forcedRole === 'owner') {
        if (isSoftLaunchFeatureBlocked('sellerRole') && (forcedRole === 'seller' || forcedRole === 'owner')) {
          setUserRole('buyer')
        } else {
          setUserRole(forcedRole)
        }
      }
    }
  }, [isOpen, authEntryVariant])

  useEffect(() => {
    if (!isSoftLaunchFeatureBlocked('sellerRole')) return
    if (userRole === 'seller' || userRole === 'owner') setUserRole('buyer')
  }, [userRole])

  // Сохраняем режим и роль для callback после редиректа из Telegram
  useEffect(() => {
    if (isOpen) {
      sessionStorage.setItem('telegram_auth_mode', isLogin ? 'login' : 'register')
      sessionStorage.setItem('telegram_auth_role', userRole)
    }
  }, [isOpen, isLogin, userRole])

  // Подключаем скрипт Telegram Login Widget при открытой модалке и наличии бота
  useEffect(() => {
    if (!isOpen || !telegramBotUsername || !telegramWidgetRef.current) return

    const container = telegramWidgetRef.current
    container.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', telegramBotUsername)
    script.setAttribute('data-auth-url', `${window.location.origin}/auth/telegram-callback`)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '8')
    script.async = true
    container.appendChild(script)

    return () => {
      container.innerHTML = ''
    }
  }, [isOpen, telegramBotUsername])

  useEffect(() => {
    setLoginModalOpen(isOpen)
    return () => setLoginModalOpen(false)
  }, [isOpen])

  const isHeaderWizard = authEntryVariant === 'header_wizard'
  const isRoleStep = isHeaderWizard && wizardPhase === 'role'
  const isWelcomeStep = isHeaderWizard && wizardPhase === 'welcome'
  const showAuthForm = !isHeaderWizard || wizardPhase === 'form'

  useEffect(() => {
    const video = welcomeVideoRef.current
    if (!isOpen || !isWelcomeStep || !video) return undefined

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (reduceMotion?.matches) {
      video.pause()
      return undefined
    }

    const playPromise = video.play()
    playPromise?.catch(() => {
      // The poster remains visible when browser autoplay policy blocks playback.
    })

    return () => video.pause()
  }, [isOpen, isWelcomeStep])

  // Не скрываем LoginModal полностью, чтобы EmailVerificationModal мог рендериться
  // Вместо этого скрываем только содержимое LoginModal
  if (!isOpen) return null

  /** Шаг 1 (роль) без цветовой темы buyer/seller; шаг 2 и обычная модалка — как раньше */
  const tintedByRole =
    !isLogin && (!isHeaderWizard || wizardPhase === 'form')

  /** В CSS тема продавца — `.login-modal--seller`; `owner` с бэка использует те же стили */
  const loginModalTintClass = tintedByRole
    ? userRole === 'seller' || userRole === 'owner'
      ? 'login-modal--seller'
      : 'login-modal--buyer'
    : ''

  const handleBackToRoleStep = () => {
    setWizardPhase('role')
    setError('')
    setRegisterBottomError('')
  }

  const handleBackToWelcomeStep = () => {
    setWizardPhase('welcome')
    setError('')
    setRegisterBottomError('')
  }

  /** После создания записи в БД из сессии Clerk — кабинет по выбранной роли */
  const navigateToCabinetAfterClerkDbSync = () => {
    navigate(getCabinetHomePath(userRole === 'owner' ? 'owner' : userRole))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (name === 'password' || name === 'confirmPassword') {
      setRegisterBottomError('')
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setRegisterBottomError('')
    setIsLoading(true)
    
    if (isLogin) {
      // Сначала пробуем войти как администратор (по username или email)
      try {
        const API_BASE_URL = await getApiBaseUrl();
        const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: formData.email, // Может быть как username, так и email
            password: formData.password
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.admin) {
            // Сохраняем информацию о входе администратора и его права доступа
            localStorage.setItem('userRole', 'admin');
            localStorage.setItem('isAdminLoggedIn', 'true');
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('adminPermissions', JSON.stringify(data.admin));
            setIsLoading(false);
            onClose();
            navigate('/admin');
            return;
          }
        }
      } catch (error) {
        console.error('Ошибка при входе администратора:', error);
        // Если ошибка при входе администратора, продолжаем попытку входа как обычный пользователь
      }
      
      // Проверка для владельца недвижимости
      if (formData.email.toLowerCase() === 'owner' && formData.password === '1234') {
        // Сохраняем информацию о входе владельца
        localStorage.setItem('userRole', 'owner')
        localStorage.setItem('isOwnerLoggedIn', 'true')
        setIsLoading(false)
        onClose()
        navigate(getCabinetHomePath('owner'))
        return
      }
      
      // Проверка для клиента
      if (formData.email.toLowerCase() === 'client' && formData.password === '1234') {
        // Сохраняем информацию о входе клиента
        localStorage.setItem('userRole', 'client')
        localStorage.setItem('isLoggedIn', 'true')
        setIsLoading(false)
        onClose()
        navigate('/profile')
        return
      }

      // Панель маркетолога (логин в поле Email — manager / manager)
      if (formData.email.trim().toLowerCase() === 'manager') {
        try {
          const { marketerLogin } = await import('../services/newsApi')
          await marketerLogin('manager', formData.password)
          setIsLoading(false)
          onClose()
          navigate('/marketer')
          return
        } catch (err) {
          setError(err?.message || 'Неверный логин или пароль')
          setIsLoading(false)
          return
        }
      }
      
      // Обычный вход с email/username и паролем
      try {
        console.log('🔐 Попытка входа:', { email: formData.email })
        const result = await loginWithEmail(formData.email, formData.password)
        
        console.log('📥 Результат входа:', result)
        
        if (result.success) {
          // Проверяем, заблокирован ли пользователь (дополнительная проверка)
          if (result.user && result.user.is_blocked === true) {
            // Если пользователь заблокирован, сохраняем его данные для показа модального окна
            // НЕ вызываем saveUserData, но сохраняем информацию о блокировке
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('isBlocked', 'true');
            if (result.user.id) {
              localStorage.setItem('blockedUserId', result.user.id.toString());
            }
            setIsLoading(false);
            onClose();
            // Перезагружаем страницу, чтобы модальное окно блокировки показалось
            setTimeout(() => {
              window.location.reload();
            }, 100);
          } else {
            setIsLoading(false);
            onClose();
            
            // Определяем куда редиректить в зависимости от роли пользователя
            const userRole = result.user?.role || 'buyer';
            const redirectPath = getCabinetHomePath(userRole === 'owner' ? 'owner' : userRole);
            
            console.log('✅ Вход успешен, редирект на:', redirectPath, 'для роли:', userRole);
            
            // Обновляем страницу для применения изменений
            window.location.href = redirectPath;
          }
        } else {
          // Проверяем, заблокирован ли пользователь
          if (result.is_blocked) {
            console.log('🚫 Обнаружена блокировка пользователя при входе:', result);
            
            // Сохраняем данные о блокировке в localStorage
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('isBlocked', 'true');
            
            if (result.user && result.user.id) {
              localStorage.setItem('blockedUserId', result.user.id.toString());
              console.log('💾 Сохранен ID заблокированного пользователя:', result.user.id);
            } else {
              // Если ID нет в результате, пытаемся получить из БД
              const API_BASE_URL = await getApiBaseUrl();
              try {
                const userResponse = await fetch(`${API_BASE_URL}/users/email/${formData.email}`);
                if (userResponse.ok) {
                  const userResult = await userResponse.json();
                  if (userResult.success && userResult.data && userResult.data.id) {
                    localStorage.setItem('blockedUserId', userResult.data.id.toString());
                    console.log('💾 Получен и сохранен ID из БД:', userResult.data.id);
                  }
                }
              } catch (e) {
                console.warn('⚠️ Не удалось получить ID пользователя:', e);
              }
            }
            
            // Сохраняем минимальные данные пользователя для отображения
            const blockedUserData = {
              id: result.user?.id || localStorage.getItem('blockedUserId'),
              email: formData.email,
              name: result.user?.name || formData.email,
              role: result.user?.role || 'buyer'
            };
            localStorage.setItem('userData', JSON.stringify(blockedUserData));
            
            console.log('✅ Данные о блокировке сохранены, перезагружаем страницу...');
            setIsLoading(false);
            onClose();
            
            // Немедленно перезагружаем страницу, чтобы модальное окно блокировки показалось
            setTimeout(() => {
              window.location.reload();
            }, 100);
          } else {
            setError(result.error || 'Неверный email или пароль');
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('❌ Ошибка входа:', error)
        setError(error.message || 'Произошла ошибка при входе. Попробуйте позже.')
        setIsLoading(false)
      }
    } else {
      // Регистрация с email и паролем
      // Проверка паролей
      if (formData.password !== formData.confirmPassword) {
        setError('Пароли не совпадают')
        setIsLoading(false)
        return
      }
      
      if (formData.password.length < 6) {
        setError('Пароль должен содержать минимум 6 символов')
        setIsLoading(false)
        return
      }
      
      // Валидация пароля по требованиям (заглавная буква, спецсимвол, цифра)
      const passwordValidation = validatePassword(formData.password)
      if (!passwordValidation.valid) {
        setError(passwordValidation.message)
        setIsLoading(false)
        return
      }
      
      if (!formData.name || formData.name.trim().length < 2) {
        setError('Имя должно содержать минимум 2 символа')
        setIsLoading(false)
        return
      }

      if (userRole === 'seller' || userRole === 'owner') {
        const chk = await checkSellerRegistrationEmail(formData.email, formData.password)
        if (!chk.success) {
          if (chk.status === 'password_same_as_buyer') {
            setError('')
            setRegisterBottomError(
              chk.error ||
                'Пароль кабинета продавца должен отличаться от пароля кабинета покупателя. Укажите другой пароль.'
            )
          } else {
            setRegisterBottomError('')
            setError(chk.error || 'Не удалось проверить email')
          }
          setIsLoading(false)
          return
        }
        if (chk.status === 'needs_confirmation' && chk.buyerId != null) {
          setPendingSellerLinkBuyerId(chk.buyerId)
          setShowBuyerSellerLinkConfirm(true)
          setIsLoading(false)
          return
        }
        setSellerRegistrationBuyerId(null)
      } else {
        setSellerRegistrationBuyerId(null)
      }
      
      try {
        const result = await registerWithEmail(formData.email, formData.password, formData.name)
        
        if (result.success) {
          // Открываем модальное окно для ввода кода подтверждения
          console.log('✅ Код отправлен, открываем модальное окно для ввода кода', {
            email: formData.email,
            showModal: true
          })
          setIsLoading(false)
          // Закрываем LoginModal и открываем EmailVerificationModal
          setShowEmailVerificationModal(true)
          console.log('📧 showEmailVerificationModal установлен в true')
        } else {
          setError(result.error || 'Не удалось зарегистрироваться')
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Ошибка регистрации:', error)
        setError('Произошла ошибка при регистрации. Попробуйте позже.')
        setIsLoading(false)
      }
    }
  }

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true)
      setError('')

      // Если Clerk уже авторизован, а в нашей БД пользователя нет —
      // не вызываем OAuth снова (иначе получишь "You're already signed in"),
      // а просто создаём пользователя в БД из данных Clerk.
      const localHasDbUser = /^\d+$/.test(String(localStorage.getItem('userId') || ''))
      if (authLoaded && isSignedIn && userLoaded && user && !localHasDbUser) {
        const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api'

        const userName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Пользователь'
        const nameParts = userName.split(' ')
        const firstName = nameParts[0] || 'Пользователь'
        const lastName = nameParts.slice(1).join(' ') || ''

        const userEmail = user.primaryEmailAddress?.emailAddress || (user.emailAddresses?.[0]?.emailAddress || null)
        const userImage = user.imageUrl || user.profileImageUrl || null
        const userPhone = user.primaryPhoneNumber?.phoneNumber || (user.phoneNumbers?.[0]?.phoneNumber || null)

        const referrerId = getReferrerId()
        const roleToUse = (userRole === 'seller' || userRole === 'owner') ? 'seller' : 'buyer'

        const response = await fetch(`${API_BASE_URL}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email: userEmail || null,
            phone_number: userPhone ? String(userPhone).replace(/\D/g, '') : null,
            role: roleToUse,
            is_verified: 0,
            is_online: 1,
            ...(referrerId ? { referrer_id: referrerId } : {})
          })
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || 'Не удалось создать пользователя в БД')
        }

        const data = await response.json()
        if (!data?.success || !data?.data?.id) {
          throw new Error(data?.error || 'Не удалось создать пользователя в БД')
        }

        const dbUserId = data.data.id
        const clerkUserData = {
          name: userName,
          email: userEmail || '',
          picture: userImage,
          id: String(user.id || ''),
          phone: userPhone || '',
          phoneFormatted: userPhone || '',
          role: roleToUse
        }

        saveUserData({ ...clerkUserData, id: dbUserId.toString() }, 'clerk')
        localStorage.setItem('userId', String(dbUserId))

        onClose?.()
        showNotification('Пользователь создан. Продолжаем регистрацию...')
        navigateToCabinetAfterClerkDbSync()
        setIsLoading(false)
        return
      }

      // signUp.authenticateWithRedirect при OAuth часто не активирует сессию Clerk (isSignedIn остаётся false).
      // signIn.authenticateWithRedirect тот же провайдер и создаёт нового пользователя при первом входе — используем для обеих вкладок.
      const clerkRole = (userRole === 'seller' || userRole === 'owner') ? 'seller' : 'buyer'
      sessionStorage.setItem('clerk_oauth_redirect_started', 'true')
      sessionStorage.setItem('clerk_oauth_user_role', clerkRole)
      sessionStorage.setItem('clerk_oauth_flow_mode', isLogin ? 'login' : 'register')

      if (signInLoaded && signIn) {
        const { getClerkOAuthReturnUrl } = await import('../utils/clerkOAuth')
        const returnUrl = getClerkOAuthReturnUrl()
        await signIn.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: returnUrl,
        })
      } else {
        setError('Система авторизации не готова. Попробуйте обновить страницу.')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('LoginModal: Ошибка авторизации через Google (Clerk):', error)
      setError(`Не удалось войти через Google: ${error.message || 'Проверьте настройки'}`)
      setIsLoading(false)
    }
  }

  const handleFacebookAuth = async () => {
    try {
      setIsLoading(true)
      setError('')

      // Аналогичный fallback для случая, когда Clerk уже авторизован,
      // а пользователь ещё не создан в нашей БД.
      const localHasDbUser = /^\d+$/.test(String(localStorage.getItem('userId') || ''))
      if (authLoaded && isSignedIn && userLoaded && user && !localHasDbUser) {
        const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api'

        const userName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Пользователь'
        const nameParts = userName.split(' ')
        const firstName = nameParts[0] || 'Пользователь'
        const lastName = nameParts.slice(1).join(' ') || ''

        const userEmail = user.primaryEmailAddress?.emailAddress || (user.emailAddresses?.[0]?.emailAddress || null)
        const userImage = user.imageUrl || user.profileImageUrl || null
        const userPhone = user.primaryPhoneNumber?.phoneNumber || (user.phoneNumbers?.[0]?.phoneNumber || null)

        const referrerId = getReferrerId()
        const roleToUse = (userRole === 'seller' || userRole === 'owner') ? 'seller' : 'buyer'

        const response = await fetch(`${API_BASE_URL}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email: userEmail || null,
            phone_number: userPhone ? String(userPhone).replace(/\D/g, '') : null,
            role: roleToUse,
            is_verified: 0,
            is_online: 1,
            ...(referrerId ? { referrer_id: referrerId } : {})
          })
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || 'Не удалось создать пользователя в БД')
        }

        const data = await response.json()
        if (!data?.success || !data?.data?.id) {
          throw new Error(data?.error || 'Не удалось создать пользователя в БД')
        }

        const dbUserId = data.data.id

        const clerkUserData = {
          name: userName,
          email: userEmail || '',
          picture: userImage,
          id: String(user.id || ''),
          phone: userPhone || '',
          phoneFormatted: userPhone || '',
          role: roleToUse
        }

        saveUserData({ ...clerkUserData, id: dbUserId.toString() }, 'clerk')
        localStorage.setItem('userId', String(dbUserId))

        onClose?.()
        showNotification('Пользователь создан. Продолжаем регистрацию...')
        navigateToCabinetAfterClerkDbSync()
        setIsLoading(false)
        return
      }
      
      const clerkRole = (userRole === 'seller' || userRole === 'owner') ? 'seller' : 'buyer'
      sessionStorage.setItem('clerk_oauth_redirect_started', 'true')
      sessionStorage.setItem('clerk_oauth_user_role', clerkRole)
      sessionStorage.setItem('clerk_oauth_flow_mode', isLogin ? 'login' : 'register')

      console.log('LoginModal: Facebook OAuth via signIn', { signInLoaded, isLogin, userRole: clerkRole })

      if (signInLoaded && signIn) {
        const { getClerkOAuthReturnUrl } = await import('../utils/clerkOAuth')
        const returnUrl = getClerkOAuthReturnUrl()
        await signIn.authenticateWithRedirect({
          strategy: 'oauth_facebook',
          redirectUrl: returnUrl,
        })
      } else {
        setError('Система авторизации не готова. Попробуйте обновить страницу.')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('LoginModal: Ошибка авторизации через Facebook:', error)
      setError(`Не удалось войти через Facebook: ${error.message || 'Проверьте настройки'}`)
      setIsLoading(false)
    }
  }

  const handleWhatsAppLogin = () => {
    setError('')
    // Открываем модальное окно для ввода номера телефона и кода
    setShowWhatsAppModal(true)
  }

  const handleTelegramClick = () => {
    if (telegramBotUsername) return // виджет сам обрабатывает клик
    showNotification('Добавьте VITE_TELEGRAM_BOT_USERNAME в .env и перезапустите приложение, чтобы включить вход через Telegram.')
  }

  const handleWhatsAppSuccess = (user) => {
    // Успешная авторизация через WhatsApp
    const userRole = user.role || localStorage.getItem('userRole') || 'buyer'
    const isRegister = !isLogin
    
    // Если это регистрация покупателя, показываем модальное окно для загрузки документов
    if (isRegister && userRole === 'buyer' && user.id) {
      setNewUserId(user.id)
      setShowVerificationDocumentsModal(true)
    } else {
      // Для входа или продавца - обычный флоу
      onClose()
      showNotification(`Добро пожаловать, ${user.name || 'Пользователь'}!`)
      
      if (userRole === 'seller') {
        localStorage.setItem('isOwnerLoggedIn', 'true')
        localStorage.setItem('userRole', 'seller')
        navigate(getCabinetHomePath('seller'))
      } else {
        navigate('/profile')
      }
    }
  }

  const handleBuyerSellerLinkConfirmed = async () => {
    setShowBuyerSellerLinkConfirm(false)
    setIsLoading(true)
    setError('')
    setRegisterBottomError('')
    try {
      const chk = await checkSellerRegistrationEmail(formData.email, formData.password)
      if (!chk.success) {
        if (chk.status === 'password_same_as_buyer') {
          setError('')
          setRegisterBottomError(
            chk.error ||
              'Пароль кабинета продавца должен отличаться от пароля кабинета покупателя. Укажите другой пароль.'
          )
        } else {
          setRegisterBottomError('')
          setError(chk.error || 'Не удалось продолжить регистрацию')
        }
        setPendingSellerLinkBuyerId(null)
        return
      }
      if (chk.status !== 'needs_confirmation') {
        setError('Не удалось подтвердить данные. Попробуйте снова.')
        setPendingSellerLinkBuyerId(null)
        return
      }
      const buyerId = chk.buyerId != null ? chk.buyerId : pendingSellerLinkBuyerId
      setSellerRegistrationBuyerId(buyerId)
      const result = await registerWithEmail(formData.email, formData.password, formData.name)
      if (result.success) {
        setShowEmailVerificationModal(true)
      } else {
        setError(result.error || 'Не удалось отправить код')
        setSellerRegistrationBuyerId(null)
      }
    } catch (e) {
      console.error(e)
      setError('Произошла ошибка. Попробуйте позже.')
      setSellerRegistrationBuyerId(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailVerificationSuccess = (user) => {
    // Успешная регистрация через email
    const userRole = user.role || localStorage.getItem('userRole') || 'buyer'

    // Для email-регистрации после подтверждения кода сразу активируем сессию
    // и отправляем пользователя в кабинет (как в сценарии продавца).
    onClose()
    showNotification(`Добро пожаловать, ${user.name || 'Пользователь'}! Регистрация завершена.`)

    if (userRole === 'seller' || userRole === 'owner') {
      localStorage.setItem('isOwnerLoggedIn', 'true')
      localStorage.setItem('userRole', 'seller')
      navigate(getCabinetHomePath('seller'))
    } else {
      navigate('/profile')
    }
    setSellerRegistrationBuyerId(null)
  }
  
  const handleVerificationDocumentsComplete = () => {
    // Документы загружены, закрываем модальное окно и обновляем страницу
    setShowVerificationDocumentsModal(false)
    onClose()
    showNotification('Документы отправлены на верификацию. Вы получите уведомление после проверки.')
    // Полное обновление страницы, чтобы интерфейс отобразил авторизованного покупателя
    window.location.href = '/profile'
  }

  /** Переключение «войти» / «зарегистрироваться» с очисткой формы */
  const setAuthMode = (nextIsLogin) => {
    if (nextIsLogin === isLogin) return
    setIsLogin(nextIsLogin)
    setRegisterBottomError('')
    setFormData({
      email: '',
      password: '',
      name: '',
      confirmPassword: ''
    })
    const lockRole =
      authEntryVariant === 'header_wizard' && wizardPhase !== 'role'
    if (!lockRole) {
      setUserRole('buyer')
    }
  }

  const handleWelcomeAction = (nextIsLogin) => {
    setAuthMode(nextIsLogin)
    setError('')
    setRegisterBottomError('')
    setWizardPhase('form')
  }

  const renderHighlightedBrand = () => (
    <span className="login-modal__brand-name" aria-label="SellYourBrick">
      <span aria-hidden="true">Sell</span>
      <span className="login-modal__brand-accent" aria-hidden="true">Your</span>
      <span aria-hidden="true">Brick</span>
    </span>
  )

  const renderTitleWithHighlightedBrand = (title) => {
    const brand = 'SellYourBrick'
    const brandIndex = title.indexOf(brand)
    if (brandIndex < 0) return title

    return (
      <>
        {title.slice(0, brandIndex)}
        {renderHighlightedBrand()}
        {title.slice(brandIndex + brand.length)}
      </>
    )
  }

  return createPortal(
    <>
      {/* Скрываем LoginModal когда открыт EmailVerificationModal */}
      {!showEmailVerificationModal && !showBuyerSellerLinkConfirm && (
        <div
          className={[
            'login-modal-overlay',
            isRoleStep ? 'login-modal-overlay--role-drawer' : '',
            isWelcomeStep ? 'login-modal-overlay--welcome' : '',
            showAuthForm ? 'login-modal-overlay--form-screen' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={onClose}
        >
          <div
            className={[
              'login-modal',
              loginModalTintClass,
              isRoleStep ? 'login-modal--role-drawer' : '',
              isWelcomeStep ? 'login-modal--welcome' : '',
              showAuthForm ? 'login-modal--form-screen' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            role="dialog"
            aria-modal="true"
            aria-labelledby={
              isRoleStep
                ? 'login-modal-wizard-role-title'
                : isWelcomeStep
                  ? 'login-modal-welcome-title'
                  : 'login-modal-heading'
            }
            onClick={(e) => e.stopPropagation()}
          >

            {/* Side panel with animated characters (hidden on mobile) */}
            <div className="login-modal__side-panel">
              {isHeaderWizard && wizardPhase === 'form' && (
                <button
                  type="button"
                  className="login-modal__change-role login-modal__change-role--side"
                  onClick={handleBackToRoleStep}
                  aria-label={t('authWizardBackToRoleAria')}
                >
                  <FiChevronLeft size={20} aria-hidden />
                  {t('authWizardBackToRole')}
                </button>
              )}
              <div className="login-modal__side-panel-characters">
                <Suspense fallback={null}>
                  <LazyAnimatedCharacters
                    isTypingPassword={isPasswordFocused && formData.password.length > 0}
                    isPasswordVisible={showPassword && formData.password.length > 0}
                    isEmailFocused={isEmailFocused}
                  />
                </Suspense>
              </div>
            </div>

            {/* Main form panel */}
            <div className="login-modal__form-panel">
        <button 
          className="login-modal__close" 
          onClick={onClose}
          aria-label={t('closeModalAria')}
        >
          <FiX size={24} />
        </button>

        {isWelcomeStep && (
          <div className="login-modal__welcome">
            <video
              ref={welcomeVideoRef}
              className="login-modal__welcome-video"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              poster="/media/auth-summer-villa-poster.jpg"
              aria-hidden="true"
              tabIndex={-1}
            >
              <source src="/media/auth-summer-villa.mp4" type="video/mp4" />
            </video>
            <div className="login-modal__welcome-scrim" aria-hidden="true" />
            <button
              type="button"
              className="login-modal__welcome-back"
              onClick={handleBackToRoleStep}
              aria-label={t('authWelcomeBackAria')}
            >
              <FiChevronLeft size={24} aria-hidden />
            </button>
            <div className="login-modal__welcome-brand">
              <h2 id="login-modal-welcome-title">{renderHighlightedBrand()}</h2>
            </div>
            <div className="login-modal__welcome-actions">
              <button
                type="button"
                className="login-modal__welcome-action login-modal__welcome-action--register"
                onClick={() => handleWelcomeAction(false)}
              >
                {t('authWelcomeCreateAccount')}
              </button>
              <button
                type="button"
                className="login-modal__welcome-action login-modal__welcome-action--login"
                onClick={() => handleWelcomeAction(true)}
              >
                {t('authWelcomeLogin')}
              </button>
            </div>
          </div>
        )}

        {isRoleStep && (
          <div className="login-modal__wizard login-modal__wizard--role">
            <div className="login-modal__drawer-handle" aria-hidden="true">
              <span />
            </div>
            <div className="login-modal__wizard-head">
              <p className="login-modal__step-badge" aria-hidden>
                {t('authWizardStep1Badge')}
              </p>
              <h2 className="login-modal__title" id="login-modal-wizard-role-title">
                {t('authWizardStep1Title')}
              </h2>
              <p className="login-modal__subtitle">{t('authWizardStep1Subtitle')}</p>
            </div>
            <div className="login-modal__wizard-tiles" role="group" aria-labelledby="login-modal-wizard-role-title">
              <button
                type="button"
                className="login-modal__wizard-tile login-modal__wizard-tile--buyer"
                onClick={() => {
                  setUserRole('buyer')
                  setWizardPhase('welcome')
                }}
              >
                <span className="login-modal__wizard-tile-icon" aria-hidden>
                  <FiUser />
                </span>
                <span className="login-modal__wizard-tile-copy">
                  <span className="login-modal__wizard-tile-title">{t('roleBuyer')}</span>
                  <span className="login-modal__wizard-tile-desc">{t('authWizardRoleBuyerHint')}</span>
                </span>
              </button>
              <button
                type="button"
                className="login-modal__wizard-tile login-modal__wizard-tile--seller login-modal__wizard-tile--locked"
                disabled
                aria-disabled="true"
                aria-label={`${t('roleSeller')}. ${t('softLaunchUnavailableBadge', { defaultValue: 'Пока недоступно' })}`}
              >
                <span className="login-modal__wizard-tile-blur" aria-hidden>
                  <span className="login-modal__wizard-tile-icon">
                    <FiShoppingBag />
                  </span>
                  <span className="login-modal__wizard-tile-copy">
                    <span className="login-modal__wizard-tile-title">{t('roleSeller')}</span>
                    <span className="login-modal__wizard-tile-desc">{t('authWizardRoleSellerHint')}</span>
                  </span>
                </span>
                <span className="login-modal__wizard-tile-lock">
                  <span className="login-modal__wizard-tile-lock-badge">
                    {t('softLaunchUnavailableBadge', { defaultValue: 'Пока недоступно' })}
                  </span>
                </span>
              </button>
            </div>
          </div>
        )}

        {showAuthForm && (
          <>
        {isHeaderWizard && wizardPhase === 'form' && (
          <button
            type="button"
            className="login-modal__change-role login-modal__change-role--mobile"
            onClick={handleBackToWelcomeStep}
            aria-label={t('authWelcomeBackAria')}
          >
            <FiChevronLeft size={16} aria-hidden />
            {t('authFormBack')}
          </button>
        )}

        <div
          className={`login-modal__header${isHeaderWizard && wizardPhase === 'form' ? ' login-modal__header--wizard-step2' : ''}`}
        >
          {isHeaderWizard && wizardPhase === 'form' ? (
            <>
              <h2 className="login-modal__title" id="login-modal-heading">
                {isLogin
                  ? t('authWelcomeBackTitle')
                  : renderTitleWithHighlightedBrand(t('authCreateAccountTitle'))}
              </h2>
              <p className="login-modal__role-inline">
                {userRole === 'seller' ? t('roleSeller') : t('roleBuyer')}
              </p>
              <p className="login-modal__subtitle">
                {isLogin ? t('loginSubtitle') : t('registerSubtitle')}
              </p>
            </>
          ) : (
            <>
              <h2 className="login-modal__title" id="login-modal-heading">
                {isLogin ? t('loginTitle') : t('registerTitle')}
              </h2>
              <p className="login-modal__subtitle">
                {isLogin ? t('loginSubtitle') : t('registerSubtitle')}
              </p>
            </>
          )}
        </div>

        {!isHeaderWizard && (
          <div
            className="login-modal__mode-switch"
            role="tablist"
            aria-label={t('loginModalModeSwitchAria')}
          >
            <button
              type="button"
              role="tab"
              id="login-modal-tab-register"
              aria-selected={!isLogin}
              aria-controls="login-modal-panel"
              className={`login-modal__mode-tab${!isLogin ? ' login-modal__mode-tab--active' : ''}`}
              onClick={() => setAuthMode(false)}
              disabled={isLoading}
            >
              {t('registerTitle')}
            </button>
            <button
              type="button"
              role="tab"
              id="login-modal-tab-login"
              aria-selected={isLogin}
              aria-controls="login-modal-panel"
              className={`login-modal__mode-tab${isLogin ? ' login-modal__mode-tab--active' : ''}`}
              onClick={() => setAuthMode(true)}
              disabled={isLoading}
            >
              {t('loginTitle')}
            </button>
          </div>
        )}

        <div
          id="login-modal-panel"
          role="tabpanel"
          aria-labelledby={
            isHeaderWizard
              ? 'login-modal-heading'
              : isLogin
                ? 'login-modal-tab-login'
                : 'login-modal-tab-register'
          }
        >
        {!isLogin && !(isHeaderWizard && wizardPhase === 'form') && (
          <div className="login-modal__role-section">
            <span className="login-modal__role-label" id="login-modal-role-label">
              {t('loginAsLabel')}
            </span>
            <div
              className="login-modal__role-grid"
              role="radiogroup"
              aria-labelledby="login-modal-role-label"
            >
              <button
                type="button"
                role="radio"
                aria-checked={userRole === 'buyer'}
                className={`login-modal__role-card${userRole === 'buyer' ? ' login-modal__role-card--active' : ''}`}
                onClick={() => setUserRole('buyer')}
                disabled={isLoading}
              >
                {t('roleBuyer')}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={false}
                className="login-modal__role-card login-modal__role-card--locked"
                disabled
                aria-disabled="true"
                aria-label={`${t('roleSeller')}. ${t('softLaunchUnavailableBadge', { defaultValue: 'Пока недоступно' })}`}
              >
                <span className="login-modal__role-card-blur">{t('roleSeller')}</span>
                <span className="login-modal__role-card-lock">
                  {t('softLaunchUnavailableBadge', { defaultValue: 'Пока недоступно' })}
                </span>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="login-modal__error" style={{
            padding: '12px',
            margin: '16px 32px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c33',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <div className="login-modal__social">
          <button 
            type="button"
            className="login-modal__social-btn login-modal__social-btn--facebook"
            onClick={handleFacebookAuth}
            disabled={isLoading || !signInLoaded}
            aria-label={
              isLoading
                ? t('socialConnecting')
                : (isLogin ? t('loginWithFacebook') : t('registerWithFacebook'))
            }
            style={{ 
              opacity: (isLoading || !signInLoaded) ? 0.6 : 1, 
              cursor: (isLoading || !signInLoaded) ? 'not-allowed' : 'pointer' 
            }}
          >
            <FaFacebook size={20} />
            {isLoading ? (
              <span aria-hidden="true">{t('socialConnecting')}</span>
            ) : (
              <>
                <span className="login-modal__social-btn-label login-modal__social-btn-label--full" aria-hidden="true">
                  {isLogin ? t('loginWithFacebook') : t('registerWithFacebook')}
                </span>
                <span className="login-modal__social-btn-label login-modal__social-btn-label--short" aria-hidden="true">
                  Facebook
                </span>
              </>
            )}
          </button>
          
          <button
            type="button"
            className="login-modal__social-btn login-modal__social-btn--google"
            onClick={handleGoogleAuth}
            disabled={isLoading || !signInLoaded}
            aria-label={isLogin ? t('loginWithGoogle') : t('registerWithGoogle')}
            style={{ 
              opacity: (isLoading || !signInLoaded) ? 0.6 : 1, 
              cursor: (isLoading || !signInLoaded) ? 'not-allowed' : 'pointer' 
            }}
          >
            <FaGoogle size={20} />
            <span className="login-modal__social-btn-label login-modal__social-btn-label--full" aria-hidden="true">
              {isLogin ? t('loginWithGoogle') : t('registerWithGoogle')}
            </span>
            <span className="login-modal__social-btn-label login-modal__social-btn-label--short" aria-hidden="true">
              Google
            </span>
          </button>
          
          <button 
            type="button"
            className="login-modal__social-btn login-modal__social-btn--whatsapp"
            onClick={handleWhatsAppLogin}
            disabled={isLoading}
            aria-label={isLogin ? t('loginWithWhatsApp') : t('registerWithWhatsApp')}
            style={{ 
              opacity: isLoading ? 0.6 : 1, 
              cursor: isLoading ? 'not-allowed' : 'pointer' 
            }}
          >
            <FaWhatsapp size={20} />
            <span className="login-modal__social-btn-label login-modal__social-btn-label--full" aria-hidden="true">
              {isLogin ? t('loginWithWhatsApp') : t('registerWithWhatsApp')}
            </span>
            <span className="login-modal__social-btn-label login-modal__social-btn-label--short" aria-hidden="true">
              WhatsApp
            </span>
          </button>

          {telegramBotUsername ? (
            <div className="login-modal__telegram-row">
              <span className="login-modal__telegram-caption login-modal__telegram-caption--full">
                {isLogin ? t('loginWithTelegram') : t('registerWithTelegram')}
              </span>
              <span className="login-modal__telegram-caption login-modal__telegram-caption--short" aria-hidden="true">
                Telegram
              </span>
              <div
                className="login-modal__telegram-widget"
                ref={telegramWidgetRef}
                aria-label={isLogin ? t('loginWithTelegram') : t('registerWithTelegram')}
              />
            </div>
          ) : !telegramConfigLoaded ? (
            <div className="login-modal__telegram-row login-modal__telegram-loading">
              <span className="login-modal__telegram-caption">{t('telegramLoading')}</span>
            </div>
          ) : (
            <button
              type="button"
              className="login-modal__social-btn login-modal__social-btn--telegram"
              onClick={handleTelegramClick}
              title={t('telegramEnvHint')}
              aria-label={isLogin ? t('loginWithTelegram') : t('registerWithTelegram')}
            >
              <FaTelegram size={20} />
              <span className="login-modal__social-btn-label login-modal__social-btn-label--full" aria-hidden="true">
                {isLogin ? t('loginWithTelegram') : t('registerWithTelegram')}
              </span>
              <span className="login-modal__social-btn-label login-modal__social-btn-label--short" aria-hidden="true">
                Telegram
              </span>
            </button>
          )}
        </div>

        <div className="login-modal__divider">
          <span>{t('loginOr')}</span>
        </div>

        <form className="login-modal__form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="login-modal__field">
              <label htmlFor="name" className="login-modal__label">
                <FiUser size={18} />
                {t('nameLabel')}
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="login-modal__input"
                placeholder={t('namePlaceholder')}
                required={!isLogin}
              />
            </div>
          )}

          <div className="login-modal__field">
            <label htmlFor="email" className="login-modal__label">
              <FiMail size={18} />
                {isLogin ? t('emailOrLoginLabel') : t('emailLabelShort')}
            </label>
            <input
              type="text"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
              className="login-modal__input"
              placeholder={isLogin ? t('emailOrLoginPlaceholder') : t('emailPlaceholderShort')}
              required
            />
          </div>

          <div className="login-modal__field">
            <label htmlFor="password" className="login-modal__label">
              <FiLock size={18} />
                {t('passwordLabel')}
            </label>
            <div
              className={`login-modal__password-wrapper${registerBottomError ? ' login-modal__password-wrapper--error' : ''}`}
            >
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                className={`login-modal__input login-modal__input--password${registerBottomError ? ' login-modal__input--error' : ''}`}
                placeholder={t('passwordPlaceholder')}
                required
                aria-invalid={registerBottomError ? 'true' : undefined}
                aria-describedby={registerBottomError ? 'login-register-bottom-error' : undefined}
              />
              <button
                type="button"
                className="login-modal__password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? t('hidePassword') : t('showPassword')}
                tabIndex={-1}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="login-modal__field">
              <label htmlFor="confirmPassword" className="login-modal__label">
                <FiLock size={18} />
                {t('confirmPasswordLabel')}
              </label>
              <div className="login-modal__password-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="login-modal__input login-modal__input--password"
                  placeholder={t('confirmPasswordPlaceholder')}
                  required={!isLogin}
                />
                <button
                  type="button"
                  className="login-modal__password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? t('hidePassword') : t('showPassword')}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>
          )}

          {isLogin && (
            <div className="login-modal__forgot">
              <button
                type="button"
                className="login-modal__forgot-link"
                onClick={() => setShowForgotPasswordModal(true)}
              >
                {t('forgotPassword')}
              </button>
            </div>
          )}

          <button
            type="submit"
            className={`login-modal__submit${isLogin ? ' login-modal__submit--liquid-glass' : ''}`}
            disabled={isLoading}
          >
            <span>
              {isLoading
                ? (isLogin ? t('loginProcessing') : t('registerProcessing'))
                : (isLogin ? t('loginButton') : t('registerButton'))}
            </span>
            {!isLoading && <FiArrowUpRight size={21} aria-hidden="true" />}
          </button>

          {!isLogin && registerBottomError && (
            <div
              id="login-register-bottom-error"
              className="login-modal__register-bottom-error"
              role="alert"
            >
              {registerBottomError}
            </div>
          )}
        </form>

        <div className="login-modal__footer">
          <span className="login-modal__footer-text">
            {isLogin ? t('noAccount') : t('haveAccount')}
          </span>
          <button 
            type="button"
            className="login-modal__footer-link login-modal__footer-link--emphasis"
            onClick={() => setAuthMode(!isLogin)}
          >
            {isLogin ? t('registerButton') : t('loginButton')}
          </button>
        </div>
        </div>
          </>
        )}

            </div>
          </div>
        </div>
      )}
      
      {showWhatsAppModal ? (
        <Suspense fallback={null}>
          <LazyWhatsAppVerificationModal
            isOpen={showWhatsAppModal}
            onClose={() => setShowWhatsAppModal(false)}
            onSuccess={handleWhatsAppSuccess}
            role={userRole}
            mode={isLogin ? 'login' : 'register'}
          />
        </Suspense>
      ) : null}

      {showBuyerSellerLinkConfirm ? (
        <Suspense fallback={null}>
          <LazyBuyerSellerLinkConfirmModal
            isOpen={showBuyerSellerLinkConfirm}
            onClose={() => {
              setShowBuyerSellerLinkConfirm(false)
              setPendingSellerLinkBuyerId(null)
            }}
            onConfirm={handleBuyerSellerLinkConfirmed}
            email={formData.email}
          />
        </Suspense>
      ) : null}

      {showForgotPasswordModal ? (
        <Suspense fallback={null}>
          <LazyForgotPasswordModal
            isOpen={showForgotPasswordModal}
            onClose={() => setShowForgotPasswordModal(false)}
            initialEmail={formData.email}
            onSuccess={() => {
              showNotification(t('forgotPassword_success'), 'success')
            }}
          />
        </Suspense>
      ) : null}

      {showEmailVerificationModal ? (
        <Suspense fallback={null}>
          <LazyEmailVerificationModal
            isOpen={showEmailVerificationModal}
            onClose={() => {
              console.log('📧 Закрываем EmailVerificationModal')
              setShowEmailVerificationModal(false)
              setSellerRegistrationBuyerId(null)
              onClose()
            }}
            onSuccess={handleEmailVerificationSuccess}
            email={formData.email}
            password={formData.password}
            name={formData.name}
            role={userRole}
            linkBuyerId={sellerRegistrationBuyerId}
          />
        </Suspense>
      ) : null}

      {showVerificationDocumentsModal ? (
        <Suspense fallback={null}>
          <LazyVerificationDocumentsModal
            isOpen={showVerificationDocumentsModal}
            onClose={() => {
              setShowVerificationDocumentsModal(false)
              onClose()
              navigate('/profile')
            }}
            userId={newUserId}
            onComplete={handleVerificationDocumentsComplete}
          />
        </Suspense>
      ) : null}
    </>,
    document.body,
  )
}

export default LoginModal
