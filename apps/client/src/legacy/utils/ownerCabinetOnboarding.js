const STORAGE_PREFIX = 'ownerTestCabinetOnboardingDone:'

export function getOwnerCabinetOnboardingStorageKey(userId) {
  const id = String(userId || '').trim()
  if (!/^\d+$/.test(id)) return null
  return `${STORAGE_PREFIX}${id}`
}

export function hasCompletedOwnerCabinetOnboarding(userId) {
  const key = getOwnerCabinetOnboardingStorageKey(userId)
  if (!key) return true
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return true
  }
}

export function markOwnerCabinetOnboardingComplete(userId) {
  const key = getOwnerCabinetOnboardingStorageKey(userId)
  if (!key) return
  try {
    localStorage.setItem(key, '1')
  } catch {
    /* ignore quota errors */
  }
}
