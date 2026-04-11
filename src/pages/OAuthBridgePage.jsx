import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useUser, AuthenticateWithRedirectCallback } from '@clerk/clerk-react'

/**
 * Лёгкая страница возврата после Clerk OAuth (без AuthenticateWithRedirectCallback —
 * он с forceRedirect открывал лишний экран sign-in на accounts.dev после уже успешного входа).
 */
export default function OAuthBridgePage() {
  const navigate = useNavigate()
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const { user, isLoaded: userLoaded } = useUser()
  const hasClerkParams =
    (typeof window !== 'undefined' && window.location.search.includes('__clerk')) ||
    (typeof window !== 'undefined' && window.location.hash.includes('__clerk'))
  const oauthStarted =
    typeof window !== 'undefined' &&
    sessionStorage.getItem('clerk_oauth_redirect_started') === 'true'

  useEffect(() => {
    if (!authLoaded || !userLoaded || !isSignedIn || !user) return
    const tick = () => {
      if (window.location.pathname !== '/oauth-bridge') return
      const uid = localStorage.getItem('userId')
      if (!uid || !/^\d+$/.test(String(uid))) return
      const r = localStorage.getItem('userRole')
      navigate(r === 'seller' || r === 'owner' ? '/owner' : '/profile', { replace: true })
    }
    const id = window.setInterval(tick, 150)
    tick()
    return () => window.clearInterval(id)
  }, [authLoaded, userLoaded, isSignedIn, user, navigate])

  // Надежно завершаем handshake Clerk после возврата от Google/Facebook.
  // Без этого у части пользователей callback не устанавливал сессию, и flow зависал в timeout.
  if ((hasClerkParams || oauthStarted) && (!authLoaded || !isSignedIn)) {
    return <AuthenticateWithRedirectCallback />
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        background: '#f4fbfb',
        color: '#0f172a',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 16
      }}
    >
      <div style={{ width: 32, height: 32, border: '3px solid #0abab5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span>Завершение входа…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
