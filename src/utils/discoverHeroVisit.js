export const DISCOVER_HERO_SEEN_KEY = 'syb.discoverHeroSeen'

function readStorage(storage) {
  if (storage) return storage
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/** True only while this tab is still on its first showing of the intro. */
let introActive = false
let leaveTimer = 0

function clearLeaveTimer() {
  if (!leaveTimer || typeof window === 'undefined') return
  window.clearTimeout(leaveTimer)
  leaveTimer = 0
}

/** True after this tab has left the homepage intro. A new tab starts over. */
export function hasSeenDiscoverHero(storage) {
  try {
    return readStorage(storage)?.getItem(DISCOVER_HERO_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markDiscoverHeroSeen(storage) {
  if (!storage) introActive = false
  try {
    readStorage(storage)?.setItem(DISCOVER_HERO_SEEN_KEY, '1')
  } catch {
    // Private mode and blocked storage keep showing the intro.
  }
}

/**
 * A new tab opens the intro. Returning to the homepage in that tab opens the strategies.
 * An explicit storage skips the in-memory decision so tests stay isolated.
 */
export function initialDiscoverScreen(storage) {
  if (!storage) clearLeaveTimer()
  if (!storage && introActive) return 'hero'
  if (hasSeenDiscoverHero(storage)) return 'stage'
  if (!storage) introActive = true
  return 'hero'
}

/** After the intro unmounts for real, the next homepage open in this tab skips it. */
export function scheduleDiscoverHeroReturn() {
  if (typeof window === 'undefined') {
    markDiscoverHeroSeen()
    return
  }
  clearLeaveTimer()
  leaveTimer = window.setTimeout(() => {
    leaveTimer = 0
    markDiscoverHeroSeen()
  }, 0)
}

export function cancelDiscoverHeroReturn() {
  clearLeaveTimer()
}

export function resetDiscoverHeroVisitForTests() {
  introActive = false
  if (leaveTimer && typeof window !== 'undefined') window.clearTimeout(leaveTimer)
  leaveTimer = 0
}
