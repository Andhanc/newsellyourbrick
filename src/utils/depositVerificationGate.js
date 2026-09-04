const GATE_FLAG_PREFIX = 'syb.buyer.depositVerificationGate:'

export function depositVerificationGateStorageKey(userId) {
  return `${GATE_FLAG_PREFIX}${String(userId)}`
}

export function writeDepositVerificationGateFlag(userId, active, { silent = false } = {}) {
  if (userId == null || userId === '') return
  const key = depositVerificationGateStorageKey(userId)
  try {
    if (active) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
  if (silent) return
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(
      new CustomEvent('deposit-verification-gate', {
        detail: { userId: Number(userId), active: Boolean(active) },
      }),
    )
  } catch {
    /* ignore */
  }
}

export function readDepositVerificationGateFlag(userId) {
  if (userId == null || userId === '') return false
  try {
    return localStorage.getItem(depositVerificationGateStorageKey(userId)) === '1'
  } catch {
    return false
  }
}

export function readDepositVerificationUserId() {
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

/** Покупатель (не seller/admin/owner) с числовым userId в localStorage. */
export function isBuyerRoleForDepositVerificationGate() {
  const role = readRoleFromStorage()
  if (role === 'admin' || role === 'seller' || role === 'owner') return false
  return readDepositVerificationUserId() != null
}

/** Маршруты, куда можно перейти, пока активен гейт верификации после депозита. */
export function isDepositVerificationAllowedPath(pathname = '') {
  const p = String(pathname || '').split('?')[0].split('#')[0]
  if (p === '/wallet' || p.startsWith('/wallet/')) return true
  if (p === '/deposit') return true
  if (p.startsWith('/sso-callback')) return true
  if (p === '/oauth-bridge') return true
  return false
}

/**
 * @param {object|null|undefined} status — data из GET /users/:id/verification-status
 */
export function needsDepositVerificationFromStatus(status) {
  if (!status || typeof status !== 'object') return false
  if (status.needsReverificationAfterRejection) return false
  if (status.isVerified) return false
  if (status.hasDocuments) return false
  if (typeof status.needsDepositVerification === 'boolean') {
    return status.needsDepositVerification
  }
  const depositAmount = Number(status.depositAmount) || 0
  return depositAmount > 0
}

/**
 * @param {object|null|undefined} status
 * @param {number|null|undefined} userId
 */
export function shouldActivateDepositVerificationGate(status, userId) {
  if (userId == null) return false
  if (status == null) return readDepositVerificationGateFlag(userId)
  return needsDepositVerificationFromStatus(status)
}
