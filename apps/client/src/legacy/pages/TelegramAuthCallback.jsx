import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { verifyTelegramAuth } from '../services/authService'
import { showNotification } from '../utils/toastHelper'
import AuthAlertModal from '../components/AuthAlertModal'
import { getCabinetHomePath } from '../utils/cabinetRoutes'

/**
 * Страница, на которую Telegram редиректит после успешного нажатия "Log in with Telegram".
 * Читает id, first_name, last_name, username, photo_url, auth_date, hash из query,
 * отправляет на бэкенд, сохраняет сессию и редиректит в профиль или кабинет владельца.
 */
export default function TelegramAuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [errorVariant, setErrorVariant] = useState('error')
  const [errorMessage, setErrorMessage] = useState('')
  const [errorTitle, setErrorTitle] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    const hash = params.get('hash')

    if (!id || !hash) {
      setStatus('error')
      setErrorVariant('error')
      setErrorTitle('Не удалось войти через Telegram')
      setErrorMessage('Данные от Telegram не получены. Попробуйте войти снова или выберите другой способ — email, WhatsApp или Google.')
      return
    }

    const telegramData = {
      id,
      hash
    }
    const telegramParamKeys = ['auth_date', 'first_name', 'last_name', 'username', 'photo_url']
    telegramParamKeys.forEach((key) => {
      if (params.has(key)) {
        telegramData[key] = params.get(key) || ''
      }
    })
    if (!telegramData.auth_date) {
      setStatus('error')
      setErrorVariant('error')
      setErrorTitle('Не удалось войти через Telegram')
      setErrorMessage('Данные от Telegram не получены. Попробуйте войти снова или выберите другой способ входа.')
      return
    }

    const mode = sessionStorage.getItem('telegram_auth_mode') || 'register'
    const role = sessionStorage.getItem('telegram_auth_role') || 'buyer'

    sessionStorage.removeItem('telegram_auth_mode')
    sessionStorage.removeItem('telegram_auth_role')

    verifyTelegramAuth(telegramData, mode, role)
      .then((result) => {
        if (result.success) {
          setStatus('success')
          showNotification(`Добро пожаловать, ${result.user?.name || 'Пользователь'}!`)
          const redirectPath = (result.user?.role === 'seller' || result.user?.role === 'owner')
            ? getCabinetHomePath(result.user.role)
            : '/profile'
          if (result.user?.role === 'seller' || result.user?.role === 'owner') {
            localStorage.setItem('isOwnerLoggedIn', 'true')
            localStorage.setItem('userRole', result.user.role)
          }
          navigate(redirectPath, { replace: true })
          window.location.href = redirectPath
        } else {
          setStatus('error')
          if (result.code === 'ALREADY_REGISTERED') {
            setErrorVariant('already_registered')
            setErrorTitle('Вы уже зарегистрированы')
            setErrorMessage('Этот аккаунт Telegram уже привязан к вашему профилю. На главной выберите «Вход» и войдите через Telegram.')
          } else if (result.code === 'NEED_REGISTER') {
            setErrorVariant('need_register')
            setErrorTitle('Вы не зарегистрированы на сайте')
            setErrorMessage('Сначала зарегистрируйтесь: на главной выберите «Регистрация», затем снова войдите через Telegram.')
          } else {
            setErrorVariant('error')
            setErrorTitle('Не удалось войти через Telegram')
            setErrorMessage(result.error || 'Попробуйте ещё раз или войдите через email, WhatsApp или другой способ.')
          }
        }
      })
      .catch((err) => {
        console.error('TelegramAuthCallback error:', err)
        setStatus('error')
        setErrorVariant('error')
        setErrorTitle('Не удалось войти через Telegram')
        setErrorMessage(err.message || 'Попробуйте ещё раз или войдите через email, WhatsApp или Google.')
      })
  }, [navigate])

  const handleAlertClose = () => {
    navigate('/', { replace: true })
  }

  if (status === 'loading') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: 24,
        textAlign: 'center'
      }}>
        <p style={{ fontSize: 18, color: '#333' }}>Вход через Telegram...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <>
        <AuthAlertModal
          isOpen
          onClose={handleAlertClose}
          variant={errorVariant}
          title={errorTitle}
          message={errorMessage}
          buttonText="На главную"
        />
        <div style={{ minHeight: '40vh' }} />
      </>
    )
  }

  return null
}
