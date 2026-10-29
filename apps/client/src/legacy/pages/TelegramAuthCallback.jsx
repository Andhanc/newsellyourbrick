import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      setErrorTitle(t('telegramAuth_errorTitle'))
      setErrorMessage(t('telegramAuth_errorNoData'))
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
      setErrorTitle(t('telegramAuth_errorTitle'))
      setErrorMessage(t('telegramAuth_errorNoAuthDate'))
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
          const name = result.user?.name || t('authToast_userFallback')
          showNotification(
            mode === 'register'
              ? t('authToast_registrationComplete', { name })
              : t('authToast_welcome', { name }),
          )
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
            setErrorTitle(t('telegramAuth_alreadyRegisteredTitle'))
            setErrorMessage(t('telegramAuth_alreadyRegisteredText'))
          } else if (result.code === 'NEED_REGISTER') {
            setErrorVariant('need_register')
            setErrorTitle(t('telegramAuth_needRegisterTitle'))
            setErrorMessage(t('telegramAuth_needRegisterText'))
          } else {
            setErrorVariant('error')
            setErrorTitle(t('telegramAuth_errorTitle'))
            setErrorMessage(result.error || t('telegramAuth_errorFallback'))
          }
        }
      })
      .catch((err) => {
        console.error('TelegramAuthCallback error:', err)
        setStatus('error')
        setErrorVariant('error')
        setErrorTitle(t('telegramAuth_errorTitle'))
        setErrorMessage(err.message || t('telegramAuth_errorFallbackGoogle'))
      })
  }, [navigate, t])

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
        <p style={{ fontSize: 18, color: '#333' }}>{t('telegramAuth_signingIn')}</p>
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
          buttonText={t('featureUnavailableBackHome')}
        />
        <div style={{ minHeight: '40vh' }} />
      </>
    )
  }

  return null
}
