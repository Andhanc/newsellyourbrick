let nativeSessionSwitch = null
let nativeProfileSavedVibration = null
let nativeFirstFavoriteNotification = null
let nativeNavigate = null
let nativeSessionAuthenticated

export function setNativeNavigate(handler) {
  nativeNavigate = typeof handler === 'function' ? handler : null
}

export async function navigateNativeDom(path) {
  if (!nativeNavigate) return false
  await nativeNavigate(path)
  return true
}

export function setNativeSessionAuthenticated(value) {
  nativeSessionAuthenticated = Boolean(value)
}

export function getNativeSessionAuthenticated() {
  return nativeSessionAuthenticated
}

export function setNativeSessionSwitch(handler) {
  nativeSessionSwitch = typeof handler === 'function' ? handler : null
}

export function hasNativeSessionSwitch() {
  return typeof nativeSessionSwitch === 'function'
}

export async function switchNativeSession(input) {
  if (!nativeSessionSwitch) return null
  return nativeSessionSwitch(input)
}

export function setNativeProfileSavedVibration(handler) {
  nativeProfileSavedVibration = typeof handler === 'function' ? handler : null
}

export async function triggerNativeProfileSavedVibration() {
  if (!nativeProfileSavedVibration) return false
  await nativeProfileSavedVibration()
  return true
}

export function setNativeFirstFavoriteNotification(handler) {
  nativeFirstFavoriteNotification = typeof handler === 'function' ? handler : null
}

export async function triggerNativeFirstFavoriteNotification(body) {
  if (!nativeFirstFavoriteNotification) return false
  return nativeFirstFavoriteNotification({ body: String(body || '') })
}

export function isBundledNativeDom() {
  if (typeof window === 'undefined') return false
  return (
    window.location?.protocol === 'file:' ||
    window.location?.pathname?.includes('/www.bundle/')
  )
}
