import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { verifyTelegramAuth } from '../services/authService'
import { showNotification } from '../utils/toastHelper'

/**
 * Страница, на которую Telegram редиректит после успешного нажатия "Log in with Telegram".
 * Читает id, first_name, last_name, username, photo_url, auth_date, hash из query,
 * отправляет на бэкенд, сохраняет сессию и редиректит в профиль или кабинет владельца.
 */
export default function TelegramAuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    const hash = params.get('hash')

    if (!id || !hash) {
      setStatus('error')
      setErrorMessage('Не получены данные от Telegram. Попробуйте войти снова.')
      return
    }

    const telegramData = {
      id,
      first_name: params.get('first_name') || '',
      last_name: params.get('last_name') || '',
      username: params.get('username') || '',
      photo_url: params.get('photo_url') || '',
      auth_date: params.get('auth_date') || '',
      hash
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
            ? '/owner'
            : '/profile'
          if (result.user?.role === 'seller' || result.user?.role === 'owner') {
            localStorage.setItem('isOwnerLoggedIn', 'true')
            localStorage.setItem('userRole', result.user.role)
          }
          navigate(redirectPath, { replace: true })
          window.location.href = redirectPath
        } else {
          setStatus('error')
          setErrorMessage(result.error || 'Ошибка входа через Telegram')
        }
      })
      .catch((err) => {
        console.error('TelegramAuthCallback error:', err)
        setStatus('error')
        setErrorMessage(err.message || 'Не удалось войти через Telegram')
      })
  }, [navigate])

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
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: 24,
        textAlign: 'center'
      }}>
        <p style={{ fontSize: 18, color: '#c33', marginBottom: 16 }}>{errorMessage}</p>
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          style={{
            padding: '10px 20px',
            fontSize: 16,
            cursor: 'pointer',
            backgroundColor: '#0ABAB5',
            color: '#fff',
            border: 'none',
            borderRadius: 8
          }}
        >
          На главную
        </button>
      </div>
    )
  }

  return null
}
