const SELECTION_HAPTIC_DURATION_MS = 30

const AUCTION_BID_HAPTIC_PATTERNS = Object.freeze({
  placed: Object.freeze([35, 45, 60]),
  outbid: Object.freeze([90, 55, 130, 65, 170]),
})

const COIN_FALL_HAPTIC_PATTERN = Object.freeze([
  36, 150, 24, 210, 42, 90, 28, 260, 48, 140, 22, 230, 34, 120, 26, 190,
  44, 160, 30, 250, 38, 180, 26, 220, 34, 170, 28, 240, 40, 150, 24, 200,
  36, 180, 22, 230, 32, 160, 26, 190, 30,
])

const COIN_FALL_WEBKIT_OFFSETS_MS = Object.freeze([
  0, 60, 120, 160, 200, 280, 360, 900, 1600, 2400, 3400, 4500,
])

function triggerWebKitSwitchHaptic(documentObject) {
  if (!documentObject?.body || typeof documentObject.createElement !== 'function') return false

  try {
    const label = documentObject.createElement('label')
    const input = documentObject.createElement('input')
    label.setAttribute('aria-hidden', 'true')
    label.style.cssText = 'position:fixed;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;'
    input.type = 'checkbox'
    input.tabIndex = -1
    input.setAttribute('switch', '')
    label.appendChild(input)
    documentObject.body.appendChild(label)
    label.click()
    documentObject.body.removeChild(label)
    return true
  } catch {
    return false
  }
}

export function triggerSelectionHaptic({
  navigatorObject = globalThis.navigator,
  documentObject = globalThis.document,
} = {}) {
  if (typeof navigatorObject?.vibrate === 'function') {
    try {
      if (navigatorObject.vibrate(SELECTION_HAPTIC_DURATION_MS)) return true
    } catch {
      // Fall through to the WebKit switch control when the API is blocked.
    }
  }

  return triggerWebKitSwitchHaptic(documentObject)
}

export function triggerAuctionBidHaptic(
  kind = 'placed',
  {
    navigatorObject = globalThis.navigator,
    documentObject = globalThis.document,
    schedule = globalThis.setTimeout,
  } = {},
) {
  const resolvedKind = kind === 'outbid' ? 'outbid' : 'placed'
  const pattern = AUCTION_BID_HAPTIC_PATTERNS[resolvedKind]

  if (typeof navigatorObject?.vibrate === 'function') {
    try {
      if (navigatorObject.vibrate([...pattern])) return true
    } catch {
      // Fall through to the WebKit switch control when the API is blocked.
    }
  }

  const firstPulse = triggerWebKitSwitchHaptic(documentObject)
  if (firstPulse && resolvedKind === 'outbid' && typeof schedule === 'function') {
    schedule(() => triggerWebKitSwitchHaptic(documentObject), 140)
  }
  return firstPulse
}

export function triggerCoinFallHaptic({
  navigatorObject = globalThis.navigator,
  documentObject = globalThis.document,
  schedule = globalThis.setTimeout,
  cancelSchedule = globalThis.clearTimeout,
} = {}) {
  const timers = []
  let stopped = false

  const stop = () => {
    if (stopped) return
    stopped = true
    timers.forEach((id) => {
      if (typeof cancelSchedule === 'function') cancelSchedule(id)
    })
    timers.length = 0
    if (typeof navigatorObject?.vibrate === 'function') {
      try {
        navigatorObject.vibrate(0)
      } catch {
        // Ignore a blocked cancel.
      }
    }
  }

  if (typeof navigatorObject?.vibrate === 'function') {
    try {
      if (navigatorObject.vibrate([...COIN_FALL_HAPTIC_PATTERN])) return stop
    } catch {
      // Fall through to the WebKit switch control when the API is blocked.
    }
  }

  COIN_FALL_WEBKIT_OFFSETS_MS.forEach((offset) => {
    if (typeof schedule !== 'function') return
    timers.push(
      schedule(() => {
        if (!stopped) triggerWebKitSwitchHaptic(documentObject)
      }, offset),
    )
  })

  return stop
}

export {
  AUCTION_BID_HAPTIC_PATTERNS,
  COIN_FALL_HAPTIC_PATTERN,
  COIN_FALL_WEBKIT_OFFSETS_MS,
  SELECTION_HAPTIC_DURATION_MS,
}
