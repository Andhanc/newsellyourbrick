const PROPERTY_ENTRY_FROM_KEY = 'syb_property_entry_from'
const LAST_INTERNAL_PATH_KEY = 'syb_last_internal_path'
const PREV_INTERNAL_PATH_KEY = 'syb_prev_internal_path'

function normalizeInternalPath(path) {
  if (typeof path !== 'string') return null
  const v = path.trim()
  if (!v || !v.startsWith('/') || v.startsWith('//')) return null
  return v
}

function pathnameFromPath(path) {
  const normalized = normalizeInternalPath(path)
  if (!normalized) return ''
  const noHash = normalized.split('#')[0]
  return noHash.split('?')[0] || ''
}

function isPropertyPath(path) {
  const pathname = pathnameFromPath(path)
  return pathname === '/property' || pathname.startsWith('/property/')
}

export function isSafePropertyEntryPath(path) {
  const normalized = normalizeInternalPath(path)
  return Boolean(normalized) && !isPropertyPath(normalized)
}

export function setPropertyEntryFrom(path) {
  if (!isSafePropertyEntryPath(path)) return
  try {
    sessionStorage.setItem(PROPERTY_ENTRY_FROM_KEY, path)
  } catch {
    /* ignore */
  }
}

export function getPropertyEntryFrom() {
  try {
    const v = sessionStorage.getItem(PROPERTY_ENTRY_FROM_KEY)
    return isSafePropertyEntryPath(v) ? v : null
  } catch {
    return null
  }
}

export function rememberInternalRoutePath(path) {
  const normalized = normalizeInternalPath(path)
  if (!normalized) return
  try {
    const last = sessionStorage.getItem(LAST_INTERNAL_PATH_KEY)
    if (last !== normalized) {
      if (normalizeInternalPath(last)) {
        sessionStorage.setItem(PREV_INTERNAL_PATH_KEY, last)
      }
      sessionStorage.setItem(LAST_INTERNAL_PATH_KEY, normalized)
    }
  } catch {
    /* ignore */
  }
}

export function getPreviousInternalRoutePath(currentPath) {
  const current = normalizeInternalPath(currentPath)
  try {
    const last = sessionStorage.getItem(LAST_INTERNAL_PATH_KEY)
    const prev = sessionStorage.getItem(PREV_INTERNAL_PATH_KEY)
    if (normalizeInternalPath(last) && last !== current) return last
    if (normalizeInternalPath(prev) && prev !== current) return prev
    return null
  } catch {
    return null
  }
}
