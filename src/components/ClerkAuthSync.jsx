import { useEffect, useRef } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import { saveUserData, getReferrerId, clearReferrerId } from '../services/authService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/**
 * Компонент для синхронизации данных пользователя Clerk с localStorage и БД
 * Это обеспечивает совместимость со старой системой авторизации
 * Работает аналогично WhatsApp авторизации - сохраняет данные сразу после успешного входа
 */
const ClerkAuthSync = () => {
  const { user, isLoaded: userLoaded } = useUser()
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const hasSyncedRef = useRef(false)

  useEffect(() => {
    // Ждем полной загрузки данных
    if (!userLoaded || !authLoaded) {
      return
    }
    const isLogoutInProgress = sessionStorage.getItem('clerk_logout_in_progress') === 'true'

    // Во время logout не синхронизируем с localStorage,
    // иначе может происходить повторная авторизация из-за гонки состояний Clerk.
    if (isLogoutInProgress) {
      if (!isSignedIn) {
        sessionStorage.removeItem('clerk_logout_in_progress')
      }
      return
    }

    console.log('ClerkAuthSync: Checking sync', { isSignedIn, hasUser: !!user, hasSynced: hasSyncedRef.current })

    // Если пользователь авторизован и данные загружены
    if (isSignedIn && user && !hasSyncedRef.current) {
      // Возврат с OAuth: ClerkAuthHandler один раз создаёт запись в БД, сохраняет роль и редиректит.
      // Параллельный запуск здесь снимал clerk_oauth_user_role и давал гонку (роль «покупатель» у продавца).
      if (sessionStorage.getItem('clerk_oauth_redirect_started') === 'true') {
        console.log('ClerkAuthSync: OAuth return in progress — пропускаем, синхронизацию ведёт ClerkAuthHandler')
        return
      }

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
      
      // Синхронизируем данные Clerk с localStorage (как в WhatsApp)
      const clerkUserData = {
        name: userName,
        email: userEmail,
        picture: userImage,
        id: user.id || '',
        phone: userPhone,
        phoneFormatted: userPhone,
        role: userRole === 'seller' ? 'seller' : 'buyer' // Используем правильную роль
      }
      
      console.log('ClerkAuthSync: User authenticated, syncing data to localStorage', clerkUserData)

      const oauthFlowMode = sessionStorage.getItem('clerk_oauth_flow_mode') || 'register'
      // В режиме "вход" новый пользователь в БД НЕ создаём и localStorage не засвечиваем.
      // Это делается в ClerkAuthHandler / LoginModal через отдельный сценарий регистрации.
      const shouldCreateInDB = oauthFlowMode !== 'login'
      
      // Создаем или обновляем пользователя в БД
      const syncToDatabase = async () => {
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
                console.log('✅ ClerkAuthSync: Пользователь найден в БД по email:', dbUserId)
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
                  console.log('✅ ClerkAuthSync: Пользователь найден в БД по телефону:', dbUserId)
                }
              }
            }
          }
          
          // Если пользователь найден, но у него нет user_id_number, генерируем его
          if (foundUser && !foundUser.user_id_number) {
            console.log('🔄 ClerkAuthSync: У пользователя нет user_id_number, генерируем...')
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
                  console.log('✅ ClerkAuthSync: user_id_number сгенерирован:', updateData.data.user_id_number)
                  foundUser.user_id_number = updateData.data.user_id_number
                }
              }
            } catch (error) {
              console.warn('⚠️ ClerkAuthSync: Не удалось сгенерировать user_id_number:', error)
            }
          }
          
          // Если пользователь не найден, создаем его
          if (!dbUserId) {
            if (!shouldCreateInDB) {
              return { dbUserId: null }
            }

            const nameParts = userName.split(' ')
            const firstName = nameParts[0] || 'Пользователь'
            const lastName = nameParts.slice(1).join(' ') || ''
            
            // Получаем роль из sessionStorage (сохранена при регистрации через Clerk)
            // Или из publicMetadata Clerk, или по умолчанию 'buyer'
            const savedRole = sessionStorage.getItem('clerk_oauth_user_role')
            const userRoleFromMetadata = user.publicMetadata?.role
            const userRole = savedRole || userRoleFromMetadata || 'buyer'
            
            console.log('ClerkAuthSync: Создание пользователя с ролью:', userRole)
            
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
                console.log('✅ ClerkAuthSync: Пользователь создан в БД:', dbUserId)
              }
            } else {
              const errorData = await createResponse.json().catch(() => ({}))
              console.error('❌ ClerkAuthSync: Ошибка создания пользователя:', errorData)
            }
          }
          
          // Используем ID из БД для обновления localStorage
          if (dbUserId) {
            // Обновляем localStorage с правильным ID из БД
            const updatedUserData = {
              ...clerkUserData,
              id: dbUserId.toString()
            }
            saveUserData(updatedUserData, 'clerk')
            localStorage.setItem('userId', String(dbUserId))
            console.log('✅ ClerkAuthSync: Данные синхронизированы с БД, ID:', dbUserId)
          }

          return { dbUserId }
        } catch (error) {
          console.error('❌ ClerkAuthSync: Ошибка синхронизации с БД:', error)
          // Продолжаем работу, даже если БД недоступна
          return { dbUserId: null }
        }
      }
      
      syncToDatabase()
      hasSyncedRef.current = true
    } else if (!isSignedIn) {
      // Если пользователь не авторизован, очищаем данные Clerk из localStorage
      console.log('ClerkAuthSync: User not signed in, clearing Clerk data')
      hasSyncedRef.current = false
    }
  }, [user, userLoaded, isSignedIn, authLoaded])

  return null // Этот компонент не рендерит ничего
}

export default ClerkAuthSync

