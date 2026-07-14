const STORAGE_KEY = 'syb_wallet_entry_from'
const MAX_PATH_LENGTH = 2048
const EXACT_ROUTES = new Set(['/auction', '/compare', '/favorites', '/calculator', '/deposit'])

function fallbackValue(options = {}) {
  return Object.prototype.hasOwnProperty.call(options, 'fallback') ? options.fallback : '/auction'
}

function safeStorage(options = {}) {
  if (options.storage) return options.storage
  try { return globalThis.sessionStorage ?? null } catch { return null }
}

export function validateBuyerReturnPath(value, options = {}) {
  const fallback = fallbackValue(options)
  if (typeof value !== 'string') return fallback
  const path = value.trim()
  if (!path || path.length > MAX_PATH_LENGTH) return fallback
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || /[\u0000-\u001f]/.test(path)) {
    return fallback
  }

  const base = path.split(/[?#]/, 1)[0]
  if (EXACT_ROUTES.has(base)) return path
  const propertyMatch = base.match(/^\/property\/([^/]+)$/)
  if (!propertyMatch) return fallback

  try {
    const decodedId = decodeURIComponent(propertyMatch[1])
    if (!decodedId || decodedId.includes('/') || decodedId.includes('\\')) return fallback
  } catch {
    return fallback
  }
  return path
}

export function writeBuyerReturnContext(path, options = {}) {
  const storage = safeStorage(options)
  const validated = validateBuyerReturnPath(path, { fallback: null })
  if (!storage || !validated) return false
  try {
    storage.setItem(STORAGE_KEY, validated)
    return true
  } catch {
    return false
  }
}

export function readBuyerReturnContext(options = {}) {
  const storage = safeStorage(options)
  const fallback = fallbackValue(options)
  if (!storage) return fallback
  try {
    return validateBuyerReturnPath(storage.getItem(STORAGE_KEY), { fallback })
  } catch {
    return fallback
  }
}

export function consumeBuyerReturnContext(options = {}) {
  const storage = safeStorage(options)
  const value = readBuyerReturnContext(options)
  try { storage?.removeItem(STORAGE_KEY) } catch { /* storage can be blocked */ }
  return value
}

export const BUYER_RETURN_CONTEXT_KEY = STORAGE_KEY
