import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth, useUser, useSession } from '@clerk/clerk-react'
import { saveUserData, getReferrerId, clearReferrerId } from '../services/authService'
import AuthAlertModal from './AuthAlertModal'

/**
 * Компонент для обработки успешной авторизации через Clerk OAuth
 * Проверяет URL параметры после редиректа и синхронизирует данные
 */
const ClerkAuthHandler = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const { user, isLoaded: userLoaded } = useUser()
  const { session } = useSession()
  const [hasProcessed, setHasProcessed] = useState(false)
  const [oauthError, setOauthError] = useState(null) // { variant, title, message } при ошибках OAuth
  const timeoutTriggeredRef = useRef(false)

  useEffect(() => {
    // Ждем загрузки данных
    if (!authLoaded || !userLoaded) {
      console.log('ClerkAuthHandler: Waiting for data to load...', { authLoaded, userLoaded })
      return
    }

    // Проверяем, есть ли параметры OAuth в URL (после редиректа)
    const urlParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const hasOAuthParams = urlParams.has('__clerk_redirect_url') || 
                          urlParams.has('__clerk_handshake') ||
                          urlParams.has('__clerk_redirect') ||
                          urlParams.has('__clerk_redirect_complete') ||
                          urlParams.has('__clerk_state') ||
                          hashParams.has('__clerk_redirect_url') ||
                          hashParams.has('__clerk_handshake') ||
                          hashParams.has('__clerk_state') ||
                          window.location.search.includes('__clerk') ||
                          window.location.search.includes('oauth') ||
                          window.location.search.includes('code=') ||
                          window.location.hash.includes('__clerk') ||
                          window.location.hash.includes('oauth') ||
                          window.location.hash.includes('code=')

    // Проверяем, был ли недавний редирект (проверяем sessionStorage)
    const oauthRedirectKey = 'clerk_oauth_redirect_started'
    const oauthRedirectStarted = sessionStorage.getItem(oauthRedirectKey)
    const needsRegisterPrompted = sessionStorage.getItem('clerk_oauth_needs_register_prompted') === 'true'
    const oauthFlowMode = sessionStorage.getItem('clerk_oauth_flow_mode') || 'register'
    
    // Проверяем, были ли мы на Clerk домене (проверяем document.referrer)
    const wasOnClerkDomain = document.referrer.includes('clerk.accounts.dev') || 
                            document.referrer.includes('clerk.com')
    
    console.log('ClerkAuthHandler: Checking auth state', {
      isSignedIn,
      hasUser: !!user,
      hasSession: !!session,
      hasOAuthParams,
      oauthRedirectStarted,
      wasOnClerkDomain,
      searchParams: window.location.search,
      hash: window.location.hash,
      fullUrl: window.location.href,
      userLoaded,
      authLoaded,
      userId: session?.userId,
      userObject: user ? {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName || user.firstName
      } : null,
      referrer: document.referrer,
      previousUrl: sessionStorage.getItem('clerk_previous_url'),
      cookies: document.cookie
    })
    
    // Если пользователь авторизован и есть данные
    if ((isSignedIn || session) && user && !hasProcessed) {
      // Формируем имя пользователя
      let userName = 'Пользователь'
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
      
      // Получаем роль из sessionStorage (сохранена при регистрации через Clerk)
      // Или из publicMetadata Clerk, или по умолчанию 'buyer'
      const savedRole = sessionStorage.getItem('clerk_oauth_user_role')
      const userRoleFromMetadata = user.publicMetadata?.role
      const userRole = savedRole || userRoleFromMetadata || 'buyer'
      
      const clerkUserData = {
        name: userName,
        email: userEmail,
        picture: userImage,
        id: user.id || '',
        phone: userPhone,
        phoneFormatted: userPhone,
        role: userRole === 'seller' ? 'seller' : 'buyer' // Используем правильную роль
      }
      
      console.log('ClerkAuthHandler: User authenticated, syncing with DB', clerkUserData)

      // Создаем или обновляем пользователя в БД
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
      const syncToDatabase = async () => {
        try {
          let dbUserId = null
          let shouldOpenRegister = false
          
          // Сначала пытаемся найти пользователя по email
          let foundUser = null
          if (userEmail) {
            const emailResponse = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(userEmail.toLowerCase())}`)
            if (emailResponse.ok) {
              const emailData = await emailResponse.json()
              if (emailData.success && emailData.data) {
                foundUser = emailData.data
                dbUserId = foundUser.id
                console.log('✅ ClerkAuthHandler: Пользователь найден в БД по email:', dbUserId)
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
                  console.log('✅ ClerkAuthHandler: Пользователь найден в БД по телефону:', dbUserId)
                }
              }
            }
          }
          
          // Если пользователь найден, но у него нет user_id_number, генерируем его
          if (foundUser && !foundUser.user_id_number) {
            console.log('🔄 ClerkAuthHandler: У пользователя нет user_id_number, генерируем...')
            try {
              // Генерируем номер через обновление пользователя
              // Сервер автоматически сгенерирует номер, если его нет
              const updateResponse = await fetch(`${API_BASE_URL}/users/${dbUserId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  // Отправляем пустой объект или минимальные данные для триггера генерации
                  // Сервер должен проверить и сгенерировать номер, если его нет
                })
              })
              
              if (updateResponse.ok) {
                const updateData = await updateResponse.json()
                if (updateData.success && updateData.data?.user_id_number) {
                  console.log('✅ ClerkAuthHandler: user_id_number сгенерирован:', updateData.data.user_id_number)
                  foundUser.user_id_number = updateData.data.user_id_number
                }
              }
            } catch (error) {
              console.warn('⚠️ ClerkAuthHandler: Не удалось сгенерировать user_id_number:', error)
            }
          }
          
          // Если пользователь не найден, создаем его
          if (!dbUserId) {
            if (oauthFlowMode === 'login') {
              // В режиме "вход" новый пользователь в нашей БД не создаём:
              // вместо этого открываем регистрацию.
              shouldOpenRegister = true
              return { dbUserId: null, shouldOpenRegister }
            }

            const nameParts = userName.split(' ')
            const firstName = nameParts[0] || 'Пользователь'
            const lastName = nameParts.slice(1).join(' ') || ''
            
            // Получаем роль из sessionStorage или publicMetadata
            const savedRole = sessionStorage.getItem('clerk_oauth_user_role')
            const userRoleFromMetadata = user.publicMetadata?.role
            const userRole = savedRole || userRoleFromMetadata || 'buyer'
            
            // Очищаем сохраненную роль после использования
            if (savedRole) {
              sessionStorage.removeItem('clerk_oauth_user_role')
            }
            
            console.log('ClerkAuthHandler: Создание пользователя с ролью:', userRole)
            
            const referrerId = getReferrerId()
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
                is_online: 1,
                ...(referrerId && { referrer_id: referrerId })
              })
            })
            
            if (createResponse.ok) {
              const createData = await createResponse.json()
              if (createData.success && createData.data) {
                dbUserId = createData.data.id
                if (referrerId) clearReferrerId()
                console.log('✅ ClerkAuthHandler: Пользователь создан в БД:', dbUserId)
              }
            } else {
              const errorData = await createResponse.json().catch(() => ({}))
              console.error('❌ ClerkAuthHandler: Ошибка создания пользователя:', errorData)
            }
          }
          
          // Используем ID из БД для обновления localStorage
          if (dbUserId) {
            const updatedUserData = {
              ...clerkUserData,
              id: dbUserId.toString()
            }
            saveUserData(updatedUserData, 'clerk')
            localStorage.setItem('userId', String(dbUserId))
            console.log('✅ ClerkAuthHandler: Данные синхронизированы с БД, ID:', dbUserId)
          }

          return { dbUserId, shouldOpenRegister }
        } catch (error) {
          console.error('❌ ClerkAuthHandler: Ошибка синхронизации с БД:', error)
          return { dbUserId: null, shouldOpenRegister: false }
        }
      }

      ;(async () => {
        const { dbUserId, shouldOpenRegister } = await syncToDatabase()

        if (shouldOpenRegister) {
          // Чтобы не показывать одно и то же окно после перезагрузок бесконечно.
          // После первого показа сценария "нужно зарегистрироваться" мы просто открываем форму,
          // но не спамим уведомлением.
          sessionStorage.setItem('clerk_oauth_needs_register_prompted', 'true')

          // Сигнал Хедеру/модалке: открыть регистрацию.
          sessionStorage.setItem('login_modal_force_open', 'true')
          sessionStorage.setItem('login_modal_mode', 'register')
          sessionStorage.setItem('login_modal_user_role', userRole === 'seller' ? 'seller' : 'buyer')
          // Событие поможет открыть модалку даже если URL не менялся (например, мы уже на '/').
          window.dispatchEvent(new Event('forceOpenLoginModal'))

          if (!needsRegisterPrompted) {
            setOauthError({
              variant: 'need_register',
              title: 'Вы не зарегистрированы на сайте',
              message: 'Закройте окно и выберите «Регистрация», чтобы завершить оформление через Google или Facebook.',
            })
          }

          // Не редиректим на профиль: аккаунт в нашей БД ещё не создан.
          if (oauthRedirectStarted) {
            sessionStorage.removeItem(oauthRedirectKey)
          }
          if (hasOAuthParams) {
            const cleanUrl = window.location.pathname
            window.history.replaceState({}, '', cleanUrl)
          }

          setHasProcessed(true)
          navigate('/', { replace: true })
          return
        }

        setHasProcessed(true)

        // Очищаем флаг OAuth редиректа
        if (oauthRedirectStarted) {
          sessionStorage.removeItem(oauthRedirectKey)
        }
        sessionStorage.removeItem('clerk_oauth_flow_mode')

        // Очищаем OAuth параметры из URL
        if (hasOAuthParams) {
          const cleanUrl = window.location.pathname
          window.history.replaceState({}, '', cleanUrl)
          console.log('ClerkAuthHandler: Cleaned OAuth params from URL')
        }

        // Редиректим только если это реальный OAuth редирект, а не обычное обновление страницы
        // Проверяем наличие OAuth параметров или недавний OAuth редирект
        if (hasOAuthParams || oauthRedirectStarted || wasOnClerkDomain) {
          // Определяем куда редиректить в зависимости от роли пользователя
          const savedUserRole = clerkUserData.role || localStorage.getItem('userRole') || 'buyer'
          const redirectPath = (savedUserRole === 'seller' || savedUserRole === 'owner') ? '/owner' : '/profile'

          // Навигация на правильную страницу в зависимости от роли
          if (window.location.pathname !== redirectPath) {
            console.log('ClerkAuthHandler: OAuth redirect detected, navigating to', redirectPath, 'for role:', savedUserRole)
            navigate(redirectPath, { replace: true })
          } else {
            console.log('ClerkAuthHandler: Already on correct page after OAuth, data should update automatically')
          }
        } else {
          console.log('ClerkAuthHandler: Normal page refresh, no redirect needed. Current path:', window.location.pathname)
        }
      })()

      // Прерываем текущий рендер эффекта: дальнейшие действия выполняются в async IIFE.
      return
    } else if ((!isSignedIn && !session) && (hasOAuthParams || oauthRedirectStarted || wasOnClerkDomain) && !hasProcessed) {
      // Если есть OAuth параметры или был запущен OAuth редирект, но пользователь не авторизован, ждем и проверяем повторно
      console.log('ClerkAuthHandler: OAuth redirect detected but user not signed in yet, waiting...')
      console.log('ClerkAuthHandler: Referrer:', document.referrer)
      console.log('ClerkAuthHandler: Was on Clerk domain:', wasOnClerkDomain)
      console.log('ClerkAuthHandler: This might indicate:')
      console.log('1. Clerk callback was processed but session not established')
      console.log('2. Check Clerk Dashboard → Settings → Domains (localhost should be allowed)')
      console.log('3. Check Network tab for requests to clerk.accounts.dev after Google redirect')
      console.log('4. Check if there are CORS errors in console')
      
      // Проверяем каждые 500мс в течение 10 секунд (увеличено время ожидания)
      let attempts = 0
      const maxAttempts = 20
      
      const checkInterval = setInterval(() => {
        attempts++
        console.log(`ClerkAuthHandler: Checking auth state (attempt ${attempts}/${maxAttempts})`, {
          isSignedIn,
          hasUser: !!user,
          hasSession: !!session,
          authLoaded,
          userLoaded
        })
        
        // Если пользователь появился, обрабатываем
        if ((isSignedIn || session) && user) {
          clearInterval(checkInterval)
          console.log('ClerkAuthHandler: User data appeared! Processing...')
          // Данные будут обработаны в следующем рендере
          return
        }
        
        // Если превысили лимит попыток — показываем модалку пользователю
        if (attempts >= maxAttempts) {
          clearInterval(checkInterval)
          if (!timeoutTriggeredRef.current) {
            timeoutTriggeredRef.current = true
            sessionStorage.removeItem(oauthRedirectKey)
            setOauthError({
              title: 'Вход не завершён',
              message: 'Не удалось войти через соцсеть. Вы можете зарегистрироваться на сайте: нажмите «Понятно», выберите «Регистрация» и войдите через Google, email, Telegram или WhatsApp.',
            })
          }
          console.error('ClerkAuthHandler: Timeout waiting for user data after OAuth redirect')
        }
      }, 500)
      
      return () => clearInterval(checkInterval)
    } else if (!isSignedIn && !session && !hasOAuthParams) {
      // Нет OAuth параметров и пользователь не авторизован - это нормально
      console.log('ClerkAuthHandler: No OAuth params, user not signed in - normal state')
    }
  }, [isSignedIn, user, userLoaded, authLoaded, session, searchParams, navigate, hasProcessed])

  const handleOauthErrorClose = () => {
    setOauthError(null)
    timeoutTriggeredRef.current = false
  }

  return (
    <>
      {oauthError && (
        <AuthAlertModal
          isOpen
          onClose={handleOauthErrorClose}
          variant={oauthError.variant || 'error'}
          title={oauthError.title}
          message={oauthError.message}
          buttonText="Понятно"
        />
      )}
    </>
  )
}

export default ClerkAuthHandler

