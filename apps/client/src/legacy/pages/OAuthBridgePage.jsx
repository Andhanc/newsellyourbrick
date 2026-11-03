import { useEffect, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useUser, AuthenticateWithRedirectCallback } from '@clerk/clerk-react'
import { getCabinetHomePath } from '../utils/cabinetRoutes'
import { markCabinetEntry, openCabinetAfterAuth } from '../utils/cabinetEntryPreloader'

/**
 * Лёгкая страница возврата после Clerk OAuth.
 * Заставка кабинета закрывает служебный экран Clerk — отдельный спиннер не показываем.
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
  const finishingHandshake = (hasClerkParams || oauthStarted) && (!authLoaded || !isSignedIn)

  useLayoutEffect(() => {
    if (hasClerkParams || oauthStarted || isSignedIn) markCabinetEntry()
  }, [hasClerkParams, isSignedIn, oauthStarted])

  useEffect(() => {
    if (!authLoaded || !userLoaded || !isSignedIn || !user) return
    const tick = () => {
      if (window.location.pathname !== '/oauth-bridge') return
      const uid = localStorage.getItem('userId')
      if (!uid || !/^\d+$/.test(String(uid))) return
      const r = localStorage.getItem('userRole')
      openCabinetAfterAuth(
        navigate,
        getCabinetHomePath(r === 'owner' ? 'owner' : r),
        { replace: true },
      )
    }
    const id = window.setInterval(tick, 150)
    tick()
    return () => window.clearInterval(id)
  }, [authLoaded, userLoaded, isSignedIn, user, navigate])

  if (!finishingHandshake) return null

  return (
    <div className="cabinet-entry-clerk-callback" hidden>
      <AuthenticateWithRedirectCallback />
    </div>
  )
}
