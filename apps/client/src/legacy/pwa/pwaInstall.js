/**
 * Capture the browser install prompt and help place the PWA on the home screen.
 * Android/Chrome: beforeinstallprompt. iOS Safari: manual Share → Add to Home Screen.
 */

let deferredInstallPrompt = null
const listeners = new Set()

function notify() {
  for (const listener of listeners) {
    try {
      listener()
    } catch {
      /* ignore listener errors */
    }
  }
}

export function isPwaStandalone() {
  if (typeof window === 'undefined') return false
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches
  const iosStandalone = Boolean(window.navigator.standalone)
  return Boolean(mediaStandalone || iosStandalone)
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const iOS = /iPad|iPhone|iPod/.test(ua)
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return iOS || iPadOs
}

export function canPromptNativeInstall() {
  return Boolean(deferredInstallPrompt)
}

export function subscribePwaInstallAvailability(listener) {
  if (typeof listener !== 'function') return () => {}
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Call once at app boot so the install event is not missed. */
export function setupPwaInstallCapture() {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredInstallPrompt = event
    notify()
  })

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null
    notify()
  })
}

/**
 * @returns {Promise<{ outcome: 'accepted' | 'dismissed' | 'unavailable' | 'standalone' | 'ios-manual' }>}
 */
export async function requestPwaInstall() {
  if (isPwaStandalone()) {
    return { outcome: 'standalone' }
  }

  if (deferredInstallPrompt) {
    const promptEvent = deferredInstallPrompt
    deferredInstallPrompt = null
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    notify()
    return { outcome: choice?.outcome === 'accepted' ? 'accepted' : 'dismissed' }
  }

  if (isIosDevice()) {
    return { outcome: 'ios-manual' }
  }

  return { outcome: 'unavailable' }
}
