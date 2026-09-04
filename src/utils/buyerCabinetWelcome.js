const STORAGE_PREFIX = 'buyerCabinetWelcomeDone:'

export const BUYER_CABINET_WELCOME_PREVIEW_EVENT = 'buyer-cabinet-welcome-preview'

export function getBuyerCabinetWelcomeStorageKey(userId) {
  const id = String(userId || '').trim()
  if (!/^\d+$/.test(id)) return null
  return `${STORAGE_PREFIX}${id}`
}

export function hasCompletedBuyerCabinetWelcome(userId) {
  const key = getBuyerCabinetWelcomeStorageKey(userId)
  if (!key) return true
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return true
  }
}

export function markBuyerCabinetWelcomeComplete(userId) {
  const key = getBuyerCabinetWelcomeStorageKey(userId)
  if (!key) return
  try {
    localStorage.setItem(key, '1')
  } catch {
    /* ignore quota errors */
  }
}

export function clearBuyerCabinetWelcomeComplete(userId) {
  const key = getBuyerCabinetWelcomeStorageKey(userId)
  if (!key) return
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
