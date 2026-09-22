import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { loginWithEmail, rememberMobileAuthToken, saveUserData } from '../services/authService'

/**
 * Dev-only Maestro helper: logs in via email API and hydrates localStorage,
 * then redirects to `next` (default /).
 *
 * Example: /__e2e__/session?role=buyer&next=/profile
 */
export default function E2eSessionPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    if (!import.meta.env.DEV) {
      setError('E2E session helper is disabled outside development.')
      return undefined
    }

    let cancelled = false
    const role = String(params.get('role') || 'buyer').toLowerCase()
    const next = params.get('next') || '/'
    const email =
      params.get('email') ||
      (role === 'seller'
        ? 'maestro-seller@sellyourbrick.test'
        : 'maestro-buyer@sellyourbrick.test')
    const password = params.get('password') || 'MaestroDemo2026!'

    ;(async () => {
      try {
        const result = await loginWithEmail(email, password)
        if (cancelled) return
        if (!result?.success || !result.user) {
          setError(result?.error || 'Login failed')
          return
        }
        const user = {
          ...result.user,
          role: result.user.role || role,
          isLoggedIn: true,
        }
        saveUserData(user, 'email')
        if (result.authToken) rememberMobileAuthToken(result.authToken)
        if (user.role === 'seller' || user.role === 'owner') {
          localStorage.setItem('isOwnerLoggedIn', 'true')
          localStorage.setItem('userRole', user.role)
        } else {
          localStorage.removeItem('isOwnerLoggedIn')
          localStorage.setItem('userRole', user.role || 'buyer')
        }
        navigate(next, { replace: true })
      } catch (err) {
        if (!cancelled) setError(String(err?.message || err))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [navigate, params])

  return (
    <main
      data-testid="e2e-session"
      style={{
        minHeight: '40vh',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'system-ui, sans-serif',
        padding: 24,
      }}
    >
      <p role="status">{error || 'Preparing Maestro session…'}</p>
    </main>
  )
}
