export const ROLE_SWITCH_TRANSITION_KEY = 'role-switch-transition'
export const ROLE_SWITCH_TRANSITION_EVENT = 'role-switch-transition-change'
export const ROLE_SWITCH_TIMEOUT_MS = 20000
const TRANSITION_TTL_MS = 45000

const SESSION_KEYS = [
  'userData', 'userId', 'userRole', 'isLoggedIn', 'loginMethod', 'isOwnerLoggedIn',
  'userEmail', 'userName', 'userPicture', 'userPhone', 'userPhoneFormatted',
  'userCountry', 'userCountryCode', 'userCountryFlag', 'isBlocked', 'blockedUserId',
]

function notify() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ROLE_SWITCH_TRANSITION_EVENT))
}

export function readRoleSwitchTransition() {
  try {
    const value = JSON.parse(sessionStorage.getItem(ROLE_SWITCH_TRANSITION_KEY) || 'null')
    if (!value) return null
    const age = Date.now() - value.startedAt
    if (!value.id || !['buyer', 'seller'].includes(value.role) ||
      !['authenticating', 'committed'].includes(value.phase) ||
      value.path !== (value.role === 'seller' ? '/owner-test/profile' : '/profile') ||
      !Number.isFinite(age) || age < 0 || age > TRANSITION_TTL_MS) {
      sessionStorage.removeItem(ROLE_SWITCH_TRANSITION_KEY)
      return null
    }
    return value
  } catch {
    return null
  }
}

export function beginRoleSwitchTransition({ role, sourceUserId, label }) {
  if (readRoleSwitchTransition()) throw new Error('roleSwitch_operationInProgress')
  if (!['buyer', 'seller'].includes(role)) throw new Error('roleSwitch_wrongPasswordForCabinet')
  const value = {
    id: crypto.randomUUID(), role, sourceUserId: String(sourceUserId),
    path: role === 'seller' ? '/owner-test/profile' : '/profile',
    phase: 'authenticating', startedAt: Date.now(), label,
  }
  sessionStorage.setItem(ROLE_SWITCH_TRANSITION_KEY, JSON.stringify(value))
  if (readRoleSwitchTransition()?.id !== value.id) throw new Error('roleSwitch_sessionSaveFailed')
  notify()
  return value
}

export function commitRoleSwitchTransition(id, userId) {
  const value = readRoleSwitchTransition()
  if (value?.id !== id) throw new Error('roleSwitch_sessionChanged')
  const committed = { ...value, phase: 'committed', userId: String(userId), startedAt: Date.now() }
  sessionStorage.setItem(ROLE_SWITCH_TRANSITION_KEY, JSON.stringify(committed))
  if (readRoleSwitchTransition()?.userId !== String(userId)) throw new Error('roleSwitch_sessionSaveFailed')
  notify()
  return committed
}

export function clearRoleSwitchTransition(id) {
  if (id && readRoleSwitchTransition()?.id !== id) return
  sessionStorage.removeItem(ROLE_SWITCH_TRANSITION_KEY)
  sessionStorage.removeItem('role_switch_in_progress')
  sessionStorage.removeItem('clerk_logout_in_progress')
  notify()
}

export function captureCabinetSession() {
  return {
    local: Object.fromEntries([...SESSION_KEYS, 'purchasedPropertySellerArrival'].map(key => [key, localStorage.getItem(key)])),
    token: sessionStorage.getItem('syb.mobileAuthToken'),
  }
}

export function clearCabinetSessionFields() {
  for (const key of SESSION_KEYS) localStorage.removeItem(key)
}

export function restoreCabinetSession(snapshot) {
  for (const [key, value] of Object.entries(snapshot.local)) {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  }
  if (snapshot.token === null) sessionStorage.removeItem('syb.mobileAuthToken')
  else sessionStorage.setItem('syb.mobileAuthToken', snapshot.token)
}

export function roleSwitchSessionMatches(user, role, email) {
  const actualRole = user?.role === 'owner' ? 'seller' : user?.role === 'client' ? 'buyer' : user?.role
  return /^[1-9]\d*$/.test(String(user?.id || '')) && actualRole === role &&
    String(user?.email || '').trim().toLowerCase() === String(email || '').trim().toLowerCase() &&
    !user?.is_blocked
}
