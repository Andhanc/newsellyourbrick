/**
 * Registers the SellYourBrick service worker and optional Web Push subscription.
 * Enable in non-production with VITE_ENABLE_PWA=1 (HTTPS required on devices).
 */

const VAPID_PUBLIC_KEY = String(import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim()

function shouldRegisterPwa() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false
  if (import.meta.env.PROD) return true
  return String(import.meta.env.VITE_ENABLE_PWA || '') === '1'
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

export async function registerPwa() {
  if (!shouldRegisterPwa()) return null

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return registration
  } catch (error) {
    console.warn('[PWA] Service worker registration failed:', error)
    return null
  }
}

/** Request notification permission and subscribe to push when VAPID key is configured. */
export async function enablePushNotifications() {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return { ok: false, reason: 'unsupported' }
  }

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission()

  if (permission !== 'granted') {
    return { ok: false, reason: 'denied' }
  }

  const registration = await navigator.serviceWorker.ready

  if (!VAPID_PUBLIC_KEY || !('PushManager' in window)) {
    return { ok: true, reason: 'permission-only', registration }
  }

  try {
    const existing = await registration.pushManager.getSubscription()
    const subscription =
      existing ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }))

    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(subscription),
      })
    } catch {
      // Backend endpoint is optional until VAPID delivery is wired server-side.
    }

    return { ok: true, reason: 'subscribed', subscription, registration }
  } catch (error) {
    console.warn('[PWA] Push subscribe failed:', error)
    return { ok: false, reason: 'subscribe-failed', error }
  }
}

/** Local smoke-test notification (works after permission, including installed iOS PWA). */
export async function showLocalPwaNotification(title, options = {}) {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') {
    return false
  }
  const registration = await navigator.serviceWorker.ready
  await registration.showNotification(title || 'SellYourBrick', {
    body: options.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: options.url || '/' },
    tag: options.tag || 'syb-local',
  })
  return true
}
