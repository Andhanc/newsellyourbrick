import { getApiBaseUrl } from './apiConfig'
import { getUserData } from '../services/authService'
import { confirmPropertyReservationSession } from './subscriptionCheckout'
import {
  buildPurchasedPropertySnapshot,
  fetchPropertySnapshot,
} from './purchasedPropertyListingPrefill'
import { appendViewerUserIdToPropertyApiUrl } from './propertyDetailUrl'

const API_BASE = import.meta.env?.VITE_API_BASE_URL || '/api'
const HANDLED_SESSIONS_KEY = 'purchaseCheckoutHandledSessions'
const PENDING_CHECKOUT_SESSION_KEY = 'pendingPurchaseCheckoutSession'

export const PURCHASE_SUCCESS_CONFIRMED_EVENT = 'purchase-success-confirmed'

function readHandledSessions() {
  try {
    const raw = sessionStorage.getItem(HANDLED_SESSIONS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function markSessionHandled(sessionId) {
  if (!sessionId) return
  const set = readHandledSessions()
  set.add(sessionId)
  try {
    const list = Array.from(set).slice(-40)
    sessionStorage.setItem(HANDLED_SESSIONS_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

export function wasPurchaseCheckoutSessionHandled(sessionId) {
  return sessionId ? readHandledSessions().has(sessionId) : false
}

export function storePendingPurchaseCheckoutSession({ sessionId, kind = 'reservation' }) {
  if (!sessionId) return
  try {
    sessionStorage.setItem(
      PENDING_CHECKOUT_SESSION_KEY,
      JSON.stringify({ sessionId, kind, savedAt: Date.now() }),
    )
  } catch {
    // ignore
  }
}

export function readPendingPurchaseCheckoutSession() {
  try {
    const raw = sessionStorage.getItem(PENDING_CHECKOUT_SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearPendingPurchaseCheckoutSession() {
  try {
    sessionStorage.removeItem(PENDING_CHECKOUT_SESSION_KEY)
  } catch {
    // ignore
  }
}

export function parsePropertyIdFromPath(pathname = '') {
  const propertyMatch = pathname.match(/\/property\/(\d+)/)
  if (propertyMatch) return parseInt(propertyMatch[1], 10)
  const shareMatch = pathname.match(
    /\/(?:co-investment|shares)\/(?:apartment|commercial|house|villa)-(\d+)/i,
  )
  if (shareMatch) return parseInt(shareMatch[1], 10)
  const shareNumericMatch = pathname.match(/\/(?:co-investment|shares)\/(\d+)/)
  if (shareNumericMatch) return parseInt(shareNumericMatch[1], 10)
  return null
}

export async function resolveCheckoutUserId({ clerkUser } = {}) {
  let uid = localStorage.getItem('userId')
  if (uid && /^\d+$/.test(uid)) return uid

  const legacy = getUserData()
  if (legacy?.id != null && /^\d+$/.test(String(legacy.id))) {
    uid = String(legacy.id)
    localStorage.setItem('userId', uid)
    return uid
  }

  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ||
    clerkUser?.emailAddresses?.[0]?.emailAddress ||
    legacy?.email ||
    localStorage.getItem('userEmail') ||
    ''
  if (!email) return null

  try {
    let base = API_BASE
    if (!base || base.includes('localhost')) {
      base = await getApiBaseUrl()
    }
    const role =
      String(localStorage.getItem('userRole') || legacy?.role || 'buyer').toLowerCase() === 'seller'
        ? 'seller'
        : 'buyer'
    const res = await fetch(
      `${base}/users/email/${encodeURIComponent(email)}?role=${role}`,
    )
    if (!res.ok) return null
    const json = await res.json()
    if (json.success && json.data?.id) {
      uid = String(json.data.id)
      localStorage.setItem('userId', uid)
      if (json.data.role) {
        localStorage.setItem('userRole', json.data.role)
      }
      return uid
    }
  } catch (e) {
    console.warn('resolveCheckoutUserId:', e)
  }
  return null
}

export async function confirmSharePurchaseSession(sessionId, userId) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 45000)
  try {
    const res = await fetch(`${API_BASE}/billing/confirm-share-purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ session_id: sessionId, userId: String(userId) }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, error: data.error || 'confirm_failed' }
    }
    return { ok: true, data: data.data }
  } catch (error) {
    return { ok: false, error: error?.message || 'confirm_failed' }
  } finally {
    window.clearTimeout(timer)
  }
}

export async function loadPurchaseSuccessSnapshot(propertyId, { lang = 'ru', fallback = null } = {}) {
  const pid = propertyId != null ? Number(propertyId) : null
  if (!pid || Number.isNaN(pid)) return null

  try {
    const property = await fetchPropertySnapshot(pid, lang)
    return buildPurchasedPropertySnapshot(property)
  } catch (e) {
    console.warn('loadPurchaseSuccessSnapshot:', e)
    if (fallback && (fallback.title || fallback.image || fallback.location)) {
      return {
        id: pid,
        title: fallback.title || '',
        name: fallback.title || '',
        image: fallback.image || '',
        location: fallback.location || '',
      }
    }
    return { id: pid, title: '', name: '', image: '', location: '' }
  }
}

export function dispatchPurchaseSuccessConfirmed(detail = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PURCHASE_SUCCESS_CONFIRMED_EVENT, { detail }))
}

/**
 * @param {object} options
 * @param {'reservation'|'share'} options.kind
 * @param {string} options.sessionId
 * @param {string|number} options.userId
 * @param {number|null} [options.fallbackPropertyId]
 * @param {string} [options.lang]
 */
export async function confirmPurchaseCheckoutAndBuildSnapshot({
  kind,
  sessionId,
  userId,
  fallbackPropertyId = null,
  lang = 'ru',
}) {
  let propertyId = fallbackPropertyId
  let result

  if (kind === 'share') {
    result = await confirmSharePurchaseSession(sessionId, userId)
  } else {
    result = await confirmPropertyReservationSession(sessionId, userId)
  }

  if (!result.ok) {
    return { ok: false, error: result.error || 'confirm_failed' }
  }

  const confirmedPropertyId = result.data?.propertyId ?? result.data?.property_id
  if (confirmedPropertyId != null) {
    propertyId = Number(confirmedPropertyId)
  }

  if (!propertyId || Number.isNaN(propertyId)) {
    return { ok: false, error: 'property_id_missing' }
  }

  const snapshot = await loadPurchaseSuccessSnapshot(propertyId, { lang })
  if (!snapshot?.id) {
    return { ok: false, error: 'snapshot_failed' }
  }

  markSessionHandled(sessionId)
  clearPendingPurchaseCheckoutSession()
  dispatchPurchaseSuccessConfirmed({
    kind,
    propertyId: snapshot.id,
    already: !!result.data?.already,
    userId: result.data?.userId ?? result.data?.user_id ?? userId,
  })

  return { ok: true, snapshot, already: !!result.data?.already }
}

export async function refetchPropertyAfterCheckout(propertyId, lang = 'ru') {
  const base = await getApiBaseUrl()
  const url = appendViewerUserIdToPropertyApiUrl(`${base}/properties/${propertyId}?lang=${lang}`)
  const res = await fetch(url)
  if (!res.ok) return null
  const json = await res.json()
  return json?.success ? json.data : null
}
