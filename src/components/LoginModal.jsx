import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiX, FiMail, FiLock, FiUser, FiEye, FiEyeOff } from 'react-icons/fi'
import { FaGoogle, FaWhatsapp, FaFacebook } from 'react-icons/fa'
import { useSignIn, useSignUp } from '@clerk/clerk-react'
import WhatsAppVerificationModal from './WhatsAppVerificationModal'
import EmailVerificationModal from './EmailVerificationModal'
import VerificationDocumentsModal from './VerificationDocumentsModal'
import { registerWithEmail, loginWithEmail, validatePassword } from '../services/authService'
import { getApiBaseUrl } from '../utils/apiConfig'
import { showNotification } from '../utils/toastHelper'
import './LoginModal.css'

const LoginModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const { signIn, isLoaded: signInLoaded } = useSignIn()
  const { signUp, isLoaded: signUpLoaded } = useSignUp()
  const [isLogin, setIsLogin] = useState(true) // true для входа, false для регистрации
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  })
  const [userRole, setUserRole] = useState('buyer') // 'buyer' или 'seller'
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false)
  const [showVerificationDocumentsModal, setShowVerificationDocumentsModal] = useState(false)
  const [newUserId, setNewUserId] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const telegramWidgetRef = useRef(null)

  const telegramBotUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || ''

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

  // Не скрываем LoginModal полностью, чтобы EmailVerificationModal мог рендериться
  // Вместо этого скрываем только содержимое LoginModal
  if (!isOpen) return null

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
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
        navigate('/owner')
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
            const redirectPath = (userRole === 'seller' || userRole === 'owner') ? '/owner' : '/profile';
            
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
      
      console.log('LoginModal: Starting Google auth', { signInLoaded, signUpLoaded, isLogin, userRole })
      
      if (isLogin) {
        if (signInLoaded && signIn) {
          console.log('LoginModal: Redirecting to Google OAuth via Clerk')
          // Устанавливаем флаг, что начался OAuth редирект
          sessionStorage.setItem('clerk_oauth_redirect_started', 'true')
          // Сохраняем роль для использования после авторизации
          sessionStorage.setItem('clerk_oauth_user_role', userRole)
          // Используем redirectUrl и redirectUrlComplete для правильного редиректа
          await signIn.authenticateWithRedirect({
            strategy: 'oauth_google',
            redirectUrl: `${window.location.origin}/profile`,
            redirectUrlComplete: `${window.location.origin}/profile`,
          })
        } else {
          setError('Система авторизации не готова. Попробуйте обновить страницу.')
          setIsLoading(false)
        }
      } else {
        if (signUpLoaded && signUp) {
          console.log('LoginModal: Redirecting to Google OAuth via Clerk')
          // Устанавливаем флаг, что начался OAuth редирект
          sessionStorage.setItem('clerk_oauth_redirect_started', 'true')
          // Сохраняем роль для использования после регистрации
          sessionStorage.setItem('clerk_oauth_user_role', userRole)
          await signUp.authenticateWithRedirect({
            strategy: 'oauth_google',
            redirectUrl: `${window.location.origin}/profile`,
            redirectUrlComplete: `${window.location.origin}/profile`,
          })
        } else {
          setError('Система регистрации не готова. Попробуйте обновить страницу.')
          setIsLoading(false)
        }
      }
    } catch (error) {
      console.error('LoginModal: Ошибка авторизации через Google:', error)
      setError(`Не удалось войти через Google: ${error.message || 'Проверьте настройки'}`)
      setIsLoading(false)
    }
  }

  const handleFacebookAuth = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      console.log('LoginModal: Starting Facebook auth', { signInLoaded, signUpLoaded, isLogin, userRole })
      
      if (isLogin) {
        if (signInLoaded && signIn) {
          console.log('LoginModal: Redirecting to Facebook OAuth via Clerk')
          // Устанавливаем флаг, что начался OAuth редирект
          sessionStorage.setItem('clerk_oauth_redirect_started', 'true')
          // Сохраняем роль для использования после авторизации
          sessionStorage.setItem('clerk_oauth_user_role', userRole)
          await signIn.authenticateWithRedirect({
            strategy: 'oauth_facebook',
            redirectUrl: `${window.location.origin}/profile`,
            redirectUrlComplete: `${window.location.origin}/profile`,
          })
        } else {
          setError('Система авторизации не готова. Попробуйте обновить страницу.')
          setIsLoading(false)
        }
      } else {
        if (signUpLoaded && signUp) {
          console.log('LoginModal: Redirecting to Facebook OAuth via Clerk')
          // Устанавливаем флаг, что начался OAuth редирект
          sessionStorage.setItem('clerk_oauth_redirect_started', 'true')
          // Сохраняем роль для использования после регистрации
          sessionStorage.setItem('clerk_oauth_user_role', userRole)
          await signUp.authenticateWithRedirect({
            strategy: 'oauth_facebook',
            redirectUrl: `${window.location.origin}/profile`,
            redirectUrlComplete: `${window.location.origin}/profile`,
          })
        } else {
          setError('Система регистрации не готова. Попробуйте обновить страницу.')
          setIsLoading(false)
        }
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
        navigate('/owner')
      } else {
        navigate('/profile')
      }
    }
  }

  const handleEmailVerificationSuccess = (user) => {
    // Успешная регистрация через email
    const userRole = user.role || localStorage.getItem('userRole') || 'buyer'
    
    // Если это покупатель, показываем модальное окно для загрузки документов
    if (userRole === 'buyer' && user.id) {
      setNewUserId(user.id)
      setShowVerificationDocumentsModal(true)
    } else {
      // Для продавца или если нет ID - обычный флоу
      onClose()
      showNotification(`Добро пожаловать, ${user.name || 'Пользователь'}! Регистрация завершена.`)
      
      if (userRole === 'seller') {
        localStorage.setItem('isOwnerLoggedIn', 'true')
        localStorage.setItem('userRole', 'seller')
        navigate('/owner')
      } else {
        navigate('/profile')
      }
    }
  }
  
  const handleVerificationDocumentsComplete = () => {
    // Документы загружены, закрываем модальное окно и перенаправляем
    setShowVerificationDocumentsModal(false)
    onClose()
    showNotification('Документы отправлены на верификацию. Вы получите уведомление после проверки.')
    navigate('/profile')
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setFormData({
      email: '',
      password: '',
      name: '',
      confirmPassword: ''
    })
    // При переключении режима сбрасываем роль на покупателя
    setUserRole('buyer')
  }

  return (
    <>
      {/* Скрываем LoginModal когда открыт EmailVerificationModal */}
      {!showEmailVerificationModal && (
        <div className="login-modal-overlay" onClick={onClose}>
          <div className={`login-modal ${!isLogin ? `login-modal--${userRole}` : ''}`} onClick={(e) => e.stopPropagation()}>
        <button 
          className="login-modal__close" 
          onClick={onClose}
          aria-label="Закрыть"
        >
          <FiX size={24} />
        </button>

        <div className="login-modal__header">
          <h2 className="login-modal__title">
            {isLogin ? 'Вход' : 'Регистрация'}
          </h2>
          <p className="login-modal__subtitle">
            {isLogin 
              ? 'Войдите в свой аккаунт, чтобы продолжить' 
              : 'Создайте новый аккаунт для начала работы'}
          </p>
        </div>

        {!isLogin && (
          <div className="login-modal__role-section">
            <span className="login-modal__role-label">Вы регистрируетесь как</span>
            <div className="login-modal__role-switch">
              <button
                type="button"
                className={`login-modal__role-btn ${userRole === 'buyer' ? 'login-modal__role-btn--active' : ''}`}
                onClick={() => setUserRole('buyer')}
                disabled={isLoading}
              >
                Покупатель
              </button>
              <button
                type="button"
                className={`login-modal__role-btn ${userRole === 'seller' ? 'login-modal__role-btn--active' : ''}`}
                onClick={() => setUserRole('seller')}
                disabled={isLoading}
              >
                Продавец
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
            disabled={isLoading || !signInLoaded || !signUpLoaded}
            style={{ 
              opacity: (isLoading || !signInLoaded || !signUpLoaded) ? 0.6 : 1, 
              cursor: (isLoading || !signInLoaded || !signUpLoaded) ? 'not-allowed' : 'pointer' 
            }}
          >
            <FaFacebook size={20} />
            <span>
              {isLoading 
                ? 'Подключение...' 
                : (isLogin ? 'Войти через Facebook' : 'Зарегистрироваться через Facebook')}
            </span>
          </button>
          
          <button 
            type="button"
            className="login-modal__social-btn login-modal__social-btn--google"
            onClick={handleGoogleAuth}
            disabled={isLoading || !signInLoaded || !signUpLoaded}
            style={{ 
              opacity: (isLoading || !signInLoaded || !signUpLoaded) ? 0.6 : 1, 
              cursor: (isLoading || !signInLoaded || !signUpLoaded) ? 'not-allowed' : 'pointer' 
            }}
          >
            <FaGoogle size={20} />
            <span>
              {isLoading 
                ? 'Подключение...' 
                : (isLogin ? 'Войти через Google' : 'Зарегистрироваться через Google')}
            </span>
          </button>
          
          <button 
            type="button"
            className="login-modal__social-btn login-modal__social-btn--whatsapp"
            onClick={handleWhatsAppLogin}
            disabled={isLoading}
            style={{ 
              opacity: isLoading ? 0.6 : 1, 
              cursor: isLoading ? 'not-allowed' : 'pointer' 
            }}
          >
            <FaWhatsapp size={20} />
            <span>{isLogin ? 'Войти через WhatsApp' : 'Зарегистрироваться через WhatsApp'}</span>
          </button>

          {telegramBotUsername ? (
            <div className="login-modal__telegram-widget" ref={telegramWidgetRef} aria-label={isLogin ? 'Войти через Telegram' : 'Зарегистрироваться через Telegram'} />
          ) : null}
        </div>

        <div className="login-modal__divider">
          <span>или</span>
        </div>

        <form className="login-modal__form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="login-modal__field">
              <label htmlFor="name" className="login-modal__label">
                <FiUser size={18} />
                Имя
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="login-modal__input"
                placeholder="Введите ваше имя"
                required={!isLogin}
              />
            </div>
          )}

          <div className="login-modal__field">
            <label htmlFor="email" className="login-modal__label">
              <FiMail size={18} />
              {isLogin ? 'Email или логин' : 'Email'}
            </label>
            <input
              type="text"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="login-modal__input"
              placeholder={isLogin ? "Введите email или логин (admin/owner/client)" : "Введите ваш email"}
              required
            />
          </div>

          <div className="login-modal__field">
            <label htmlFor="password" className="login-modal__label">
              <FiLock size={18} />
              Пароль
            </label>
            <div className="login-modal__password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="login-modal__input login-modal__input--password"
                placeholder="Введите пароль"
                required
              />
              <button
                type="button"
                className="login-modal__password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Скрыть пароль" : "Показать пароль"}
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
                Подтвердите пароль
              </label>
              <div className="login-modal__password-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="login-modal__input login-modal__input--password"
                  placeholder="Повторите пароль"
                  required={!isLogin}
                />
                <button
                  type="button"
                  className="login-modal__password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? "Скрыть пароль" : "Показать пароль"}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>
          )}

          {isLogin && (
            <div className="login-modal__forgot">
              <button type="button" className="login-modal__forgot-link">
                Забыли пароль?
              </button>
            </div>
          )}

          <button type="submit" className="login-modal__submit" disabled={isLoading}>
            {isLoading ? (isLogin ? 'Вход...' : 'Регистрация...') : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>

        <div className="login-modal__footer">
          <span className="login-modal__footer-text">
            {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
          </span>
          <button 
            type="button"
            className="login-modal__footer-link"
            onClick={toggleMode}
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>
      </div>
      </div>
      )}
      
      <WhatsAppVerificationModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        onSuccess={handleWhatsAppSuccess}
        role={userRole}
        mode={isLogin ? 'login' : 'register'}
      />
      
      <EmailVerificationModal
        isOpen={showEmailVerificationModal}
        onClose={() => {
          console.log('📧 Закрываем EmailVerificationModal')
          setShowEmailVerificationModal(false)
          onClose() // Также закрываем LoginModal
        }}
        onSuccess={handleEmailVerificationSuccess}
        email={formData.email}
        password={formData.password}
        name={formData.name}
        role={userRole}
      />
      
      <VerificationDocumentsModal
        isOpen={showVerificationDocumentsModal}
        onClose={() => {
          setShowVerificationDocumentsModal(false)
          onClose()
          navigate('/profile')
        }}
        userId={newUserId}
        onComplete={handleVerificationDocumentsComplete}
      />
    </>
  )
}

export default LoginModal
