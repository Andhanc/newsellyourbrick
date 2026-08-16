let nativeSessionSwitch = null
let nativeProfileSavedVibration = null

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

export function isBundledNativeDom() {
  if (typeof window === 'undefined') return false
  return (
    window.location?.protocol === 'file:' ||
    window.location?.pathname?.includes('/www.bundle/')
  )
}
