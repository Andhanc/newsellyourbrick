import { useGoogleLogin } from '@react-oauth/google'
import { handleGoogleAuth } from '../services/authService'

/**
 * Компонент-обертка для Google Login
 * Используется только если Google OAuth настроен и GoogleOAuthProvider обернул App
 */
const GoogleLoginButton = ({ onSuccess, onError, onAlreadyRegistered, onNeedRegister, mode = 'register', children, disabled, isLoading, className }) => {
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const result = await handleGoogleAuth(tokenResponse, { mode })
        
        if (result.success) {
          if (onSuccess) {
            onSuccess(result.user)
          }
        } else {
          if (result.code === 'ALREADY_REGISTERED' && onAlreadyRegistered) {
            onAlreadyRegistered(result.error)
          } else if (result.code === 'NEED_REGISTER' && onNeedRegister) {
            onNeedRegister(result.error)
          } else if (onError) {
            onError(result.error || 'Ошибка при авторизации через Google')
          }
        }
      } catch (error) {
        console.error('Ошибка Google авторизации:', error)
        if (onError) {
          onError('Не удалось войти через Google. Попробуйте позже.')
        }
      }
    },
    onError: (error) => {
      console.error('Ошибка Google OAuth:', error)
      if (onError) {
        onError('Не удалось авторизоваться через Google')
      }
    },
    flow: 'implicit',
    scope: 'openid email profile'
  })

  return (
    <button
      type="button"
      className={className}
      onClick={googleLogin}
      disabled={disabled || isLoading}
      style={{ 
        opacity: (disabled || isLoading) ? 0.6 : 1, 
        cursor: (disabled || isLoading) ? 'not-allowed' : 'pointer' 
      }}
    >
      {children}
    </button>
  )
}

export default GoogleLoginButton

