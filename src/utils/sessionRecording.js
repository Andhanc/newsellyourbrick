export const CLARITY_PROJECT_ID = 'z4p1y5y9fl'
export const RECORDING_CONSENT_KEY = 'syb_session_recording_consent_v1'
export const OPEN_RECORDING_SETTINGS = 'syb:open-recording-settings'
export const RECORDING_CONSENT_MAX_AGE = 180 * 24 * 60 * 60 * 1000
const SCRIPT_ID = 'syb-clarity'

export function readRecordingConsent(browser = globalThis.window, now = Date.now()) {
  try {
    const saved = JSON.parse(browser.localStorage.getItem(RECORDING_CONSENT_KEY))
    if (!saved || !['accept', 'decline'].includes(saved.choice)) return null
    if (!Number.isFinite(saved.at) || saved.at > now || now - saved.at >= RECORDING_CONSENT_MAX_AGE) return null
    return saved.choice
  } catch {
    return null
  }
}

export function saveRecordingConsent(choice, browser = globalThis.window) {
  if (!['accept', 'decline'].includes(choice)) return
  try {
    browser.localStorage.setItem(RECORDING_CONSENT_KEY, JSON.stringify({ choice, at: Date.now() }))
  } catch {
    // The choice still applies to this page when browser storage is unavailable.
  }
}

export function startSessionRecording(browser = globalThis.window) {
  // Keep local previews, native clients and third-party deployments out of the production project.
  if (!['sellyourbrick.com', 'www.sellyourbrick.com'].includes(browser?.location?.hostname)) return false
  const doc = browser.document
  if (doc.getElementById(SCRIPT_ID)) return true

  browser.clarity = browser.clarity || function () {
    ;(browser.clarity.q = browser.clarity.q || []).push(arguments)
  }
  browser.clarity('consentv2', { analytics_Storage: 'granted', ad_Storage: 'denied' })
  const script = doc.createElement('script')
  script.id = SCRIPT_ID
  script.async = true
  script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`
  script.onerror = () => script.remove()
  doc.head.appendChild(script)
  return true
}

export function revokeSessionRecording(browser = globalThis.window) {
  if (!browser?.document.getElementById(SCRIPT_ID)) return
  // ConsentV2 alone switches to cookieless recording. Reload to stop recording entirely.
  browser.clarity?.('consentv2', { analytics_Storage: 'denied', ad_Storage: 'denied' })
  browser.location.reload()
}

export function openRecordingSettings() {
  globalThis.window?.dispatchEvent?.(new Event(OPEN_RECORDING_SETTINGS))
}
