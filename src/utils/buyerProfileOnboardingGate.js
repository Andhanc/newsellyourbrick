/** Согласовано с TestPage: пока меньше — обязательный онбординг профиля. */
export const PROFILE_ONBOARDING_MIN_COMPLETE_PCT = 78

const GATE_FLAG_PREFIX = 'syb.buyer.onboardingGate:'

export function buyerOnboardingGateStorageKey(userId) {
  return `${GATE_FLAG_PREFIX}${String(userId)}`
}

export function writeBuyerOnboardingGateFlag(userId, active, { silent = false } = {}) {
  if (userId == null || userId === '') return
  const key = buyerOnboardingGateStorageKey(userId)
  try {
    if (active) sessionStorage.setItem(key, '1')
    else sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
  if (silent) return
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(
      new CustomEvent('buyer-profile-onboarding-gate', {
        detail: { userId: Number(userId), active: Boolean(active) },
      }),
    )
  } catch {
    /* ignore */
  }
}

export function readBuyerOnboardingGateFlag(userId) {
  if (userId == null || userId === '') return false
  try {
    return sessionStorage.getItem(buyerOnboardingGateStorageKey(userId)) === '1'
  } catch {
    return false
  }
}

function readNumericUserIdFromStorage() {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem('userId')
    if (raw && /^\d+$/.test(String(raw).trim())) {
      return parseInt(String(raw).trim(), 10)
    }
    const saved = localStorage.getItem('userData')
    if (!saved) return null
    const parsed = JSON.parse(saved)
    const pid = parsed?.id
    if (pid == null) return null
    const s = String(pid).trim()
    if (!/^\d+$/.test(s)) return null
    return parseInt(s, 10)
  } catch {
    return null
  }
}

function readRoleFromStorage() {
  if (typeof localStorage === 'undefined') return 'client'
  try {
    const saved = localStorage.getItem('userData')
    const fromData = saved ? JSON.parse(saved)?.role : null
    const stored = String(fromData || localStorage.getItem('userRole') || 'client').toLowerCase()
    if (stored === 'admin' && localStorage.getItem('isAdminLoggedIn') === 'true') return 'admin'
    if (
      stored === 'seller' ||
      stored === 'owner' ||
      localStorage.getItem('isOwnerLoggedIn') === 'true'
    ) {
      return stored === 'owner' ? 'owner' : 'seller'
    }
    return stored === 'buyer' ? 'buyer' : 'client'
  } catch {
    return 'client'
  }
}

function isLocalSessionLoggedIn() {
  if (typeof localStorage === 'undefined') return false
  try {
    if (localStorage.getItem('isLoggedIn') === 'true') return true
    const saved = localStorage.getItem('userData')
    if (!saved) return false
    return Boolean(JSON.parse(saved)?.isLoggedIn)
  } catch {
    return false
  }
}

/** Покупатель с локальной сессией (не seller/admin). */
export function isBuyerSessionForOnboardingGate() {
  const role = readRoleFromStorage()
  if (role === 'admin' || role === 'seller' || role === 'owner') return false
  if (readNumericUserIdFromStorage() == null) return false
  return isLocalSessionLoggedIn()
}

export function getBuyerOnboardingGateUserId() {
  if (!isBuyerSessionForOnboardingGate()) return null
  return readNumericUserIdFromStorage()
}

/**
 * Маршруты, где можно оставаться при активном гейте.
 * Только кабинет покупателя (и legacy /data → redirect).
 */
export function isBuyerOnboardingAllowedPath(pathname = '') {
  const p = String(pathname || '').split('?')[0].split('#')[0]
  if (p === '/profile' || p.startsWith('/profile/')) return true
  if (p === '/data') return true
  if (p.startsWith('/sso-callback')) return true
  return false
}

export function needsBuyerProfileOnboardingFromProgress(progress) {
  if (typeof progress !== 'number' || !Number.isFinite(progress)) return false
  return progress < PROFILE_ONBOARDING_MIN_COMPLETE_PCT
}
