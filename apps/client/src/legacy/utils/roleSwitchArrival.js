export const ROLE_SWITCH_ARRIVAL_KEY = 'role-switch-arrival'
const ARRIVAL_TTL_MS = 2 * 60 * 1000

function normalizeRole(role) {
  if (role === 'owner' || role === 'seller') return 'seller'
  if (role === 'buyer' || role === 'client') return 'buyer'
  return null
}

export function clearRoleSwitchArrival() {
  try {
    sessionStorage.removeItem(ROLE_SWITCH_ARRIVAL_KEY)
  } catch {
    /* Storage can be unavailable in private browser sessions. */
  }
}

/** Write only after the selected account has been successfully authenticated. */
export function storeRoleSwitchArrival({ role, userId }) {
  const normalized = normalizeRole(role)
  if (!normalized || !/^\d+$/.test(String(userId || ''))) return
  try {
    sessionStorage.setItem(ROLE_SWITCH_ARRIVAL_KEY, JSON.stringify({
      role: normalized,
      userId: String(userId),
      createdAt: Date.now(),
    }))
  } catch {
    /* A welcome illustration must never block signing in. */
  }
}

/** Bound to the destination account; never show stale or another user's arrival. */
export function readRoleSwitchArrival({ role, userId }) {
  try {
    const raw = sessionStorage.getItem(ROLE_SWITCH_ARRIVAL_KEY)
    if (!raw) return null
    const arrival = JSON.parse(raw)
    const age = Date.now() - arrival.createdAt
    if (
      !normalizeRole(role) ||
      arrival.role !== normalizeRole(role) ||
      arrival.userId !== String(userId || '') ||
      !Number.isFinite(age) || age < 0 || age > ARRIVAL_TTL_MS
    ) {
      clearRoleSwitchArrival()
      return null
    }
    return arrival
  } catch {
    clearRoleSwitchArrival()
    return null
  }
}
