import { Suspense, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { lazyWithRetry } from '../utils/lazyWithRetry'
import { PRIVATE_CLUB_KICKED_MODAL_EVENT } from '../constants/cabinetEvents'
import { pathnameToAdPage } from '../utils/siteAdPages'

const PrivateClubKickModalLazy = lazyWithRetry(() => import('./PrivateClubKickModal'))
const GlobalVerificationSuccessGateLazy = lazyWithRetry(() =>
  import('./GlobalVerificationSuccessGate'),
)
const VerificationRejectedGateLazy = lazyWithRetry(() => import('./VerificationRejectedGate'))
const ClerkAuthHandlerLazy = lazyWithRetry(() => import('./ClerkAuthHandler'))
export const SiteAdsHostLazy = lazyWithRetry(() => import('./siteAds/SiteAdsHost'))

function hasNumericDbUserId() {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null
  return raw != null && /^\d+$/.test(String(raw).trim())
}

function readNumericDbUserId() {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null
  if (raw == null) return null
  const value = String(raw).trim()
  return /^\d+$/.test(value) ? value : null
}

function scheduleIdle(callback, timeoutMs) {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout: timeoutMs })
    return () => window.cancelIdleCallback(id)
  }
  const t = window.setTimeout(callback, Math.min(timeoutMs, 1500))
  return () => window.clearTimeout(t)
}

function shouldMountClerkAuthHandler(pathname) {
  if (pathname === '/oauth-bridge') return true
  try {
    if (sessionStorage.getItem('clerk_oauth_redirect_started') === 'true') return true
    if (sessionStorage.getItem('pending_duplicate_register_alert')) return true
  } catch {
    /* ignore */
  }
  return false
}

const verificationSuccessShownKey = (userId, notificationId) =>
  `verification_success_shown_${userId}_${notificationId}`

async function probeVerificationGates({ cancelledRef }) {
  const uid = readNumericDbUserId()
  if (!uid) return { success: false, rejected: false }

  let success = false
  let rejected = false

  try {
    const { fetchUserNotifications } = await import('../utils/notificationsApi')
    const notifications = await fetchUserNotifications(uid, { ttlMs: 15000 })
    const verificationNotif = notifications.find(
      (n) => n.type === 'verification_success' && n.view_count === 0,
    )
    if (
      verificationNotif
      && localStorage.getItem(verificationSuccessShownKey(uid, verificationNotif.id)) !== '1'
    ) {
      success = true
    }
  } catch {
    /* ignore */
  }

  if (cancelledRef.current) return { success: false, rejected: false }

  try {
    const { getApiBaseUrl } = await import('../utils/apiConfig')
    const base = String(await getApiBaseUrl()).replace(/\/$/, '')
    const r = await fetch(`${base}/users/${uid}/verification-status`)
    if (r.ok) {
      const j = await r.json()
      if (j.success && j.data?.needsReverificationAfterRejection) {
        rejected = true
      }
    }
  } catch {
    /* ignore */
  }

  return { success, rejected }
}

/** Модалка private club — чанк только после события исключения из клуба. */
export function PrivateClubKickModalHost() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onKick = () => setShow(true)
    window.addEventListener(PRIVATE_CLUB_KICKED_MODAL_EVENT, onKick)
    return () => window.removeEventListener(PRIVATE_CLUB_KICKED_MODAL_EVENT, onKick)
  }, [])

  if (!show) return null

  return (
    <Suspense fallback={null}>
      <PrivateClubKickModalLazy />
    </Suspense>
  )
}

/** Верификация — чанки только если API подтвердил success/rejected (не грузим confetti/face-api зря). */
export function LoggedInVerificationGatesHost({ isBlocked }) {
  const { pathname } = useLocation()
  const [successGate, setSuccessGate] = useState(false)
  const [rejectedGate, setRejectedGate] = useState(false)

  useEffect(() => {
    if (pathname === '/' || isBlocked || !hasNumericDbUserId()) return undefined

    const cancelledRef = { current: false }

    const runProbe = () => {
      void probeVerificationGates({ cancelledRef }).then(({ success, rejected }) => {
        if (cancelledRef.current) return
        if (success) setSuccessGate(true)
        if (rejected) setRejectedGate(true)
      })
    }

    const cancelSchedule = scheduleIdle(runProbe, 9000)
    const onRefresh = () => runProbe()
    window.addEventListener('verification-status-update', onRefresh)
    window.addEventListener('owner-notifications-refresh', onRefresh)
    window.addEventListener('focus', onRefresh)

    return () => {
      cancelledRef.current = true
      cancelSchedule()
      window.removeEventListener('verification-status-update', onRefresh)
      window.removeEventListener('owner-notifications-refresh', onRefresh)
      window.removeEventListener('focus', onRefresh)
    }
  }, [isBlocked, pathname])

  if (!successGate && !rejectedGate) return null

  return (
    <Suspense fallback={null}>
      {successGate ? <GlobalVerificationSuccessGateLazy /> : null}
      {rejectedGate ? <VerificationRejectedGateLazy blockedUser={isBlocked} /> : null}
    </Suspense>
  )
}

/** OAuth-bridge Clerk — не на каждой главной, только при OAuth-return или /oauth-bridge. */
export function ClerkAuthHandlerGate() {
  const { pathname } = useLocation()
  const [ready, setReady] = useState(() => shouldMountClerkAuthHandler(pathname))

  useEffect(() => {
    if (ready) return undefined
    if (shouldMountClerkAuthHandler(pathname)) {
      setReady(true)
      return undefined
    }
    const onStorage = (e) => {
      if (e.key === 'clerk_oauth_redirect_started' || e.key === 'pending_duplicate_register_alert') {
        setReady(true)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [pathname, ready])

  if (!ready) return null

  return (
    <Suspense fallback={null}>
      <ClerkAuthHandlerLazy />
    </Suspense>
  )
}

/** Реклама — только если для текущей страницы есть активные объявления. */
export function DeferredSiteAdsHost() {
  const { pathname } = useLocation()
  const [ready, setReady] = useState(false)
  const [initialAds, setInitialAds] = useState(null)

  useEffect(() => {
    if (pathname === '/' || pathname.startsWith('/admin') || pathname.startsWith('/marketer')) {
      return undefined
    }

    const pageKey = pathnameToAdPage(pathname)
    if (!pageKey) return undefined

    let cancelled = false

    const probe = async () => {
      try {
        const { fetchActiveSiteAds } = await import('../services/siteAdsPublicApi')
        const ads = await fetchActiveSiteAds()
        if (cancelled) return
        const pageAds = ads.filter((ad) => Array.isArray(ad.pages) && ad.pages.includes(pageKey))
        if (pageAds.length) {
          setInitialAds(ads)
          setReady(true)
        }
      } catch {
        /* no ads */
      }
    }

    const cancelSchedule = scheduleIdle(() => {
      void probe()
    }, 7000)

    return () => {
      cancelled = true
      cancelSchedule()
    }
  }, [pathname])

  if (!ready) return null

  return (
    <Suspense fallback={null}>
      <SiteAdsHostLazy initialAds={initialAds} />
    </Suspense>
  )
}
