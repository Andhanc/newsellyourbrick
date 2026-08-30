const SELECTION_HAPTIC_DURATION_MS = 30

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

export { SELECTION_HAPTIC_DURATION_MS }
