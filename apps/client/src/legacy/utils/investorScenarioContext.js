const STORAGE_KEY = 'buyerInvestorScenario'
const SCENARIO_VERSION = 1
const SCENARIO_TTL_MS = 30 * 60 * 1_000
const MAX_PROPERTY_KEY_LENGTH = 160
const SAFE_PROPERTY_KEY = /^[a-zA-Z0-9_.:-]+$/

function defaultStorage() {
  try {
    return globalThis.sessionStorage ?? null
  } catch {
    return null
  }
}

function normalizePropertyKey(value) {
  if (typeof value !== 'string') return null
  const key = value.trim()
  if (!key || key.length > MAX_PROPERTY_KEY_LENGTH) return null
  if (!SAFE_PROPERTY_KEY.test(key)) return null
  return key
}

function normalizeScenario(value, now) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  if (value.version !== SCENARIO_VERSION || value.source !== 'compare') return null
  if (!Array.isArray(value.propertyKeys) || value.propertyKeys.length !== 2) return null

  const propertyKeys = value.propertyKeys.map(normalizePropertyKey)
  if (propertyKeys.some((key) => !key) || propertyKeys[0] === propertyKeys[1]) return null

  const selectedKey = value.selectedKey == null
    ? propertyKeys[0]
    : normalizePropertyKey(value.selectedKey)
  if (!selectedKey || !propertyKeys.includes(selectedKey)) return null

  const createdAt = Number(value.createdAt)
  if (!Number.isFinite(createdAt) || createdAt <= 0 || createdAt > now) return null
  if (now - createdAt > SCENARIO_TTL_MS) return null

  return {
    version: SCENARIO_VERSION,
    source: 'compare',
    propertyKeys,
    selectedKey,
    createdAt,
  }
}

export function writeInvestorScenario(input, options = {}) {
  const storage = options.storage ?? defaultStorage()
  const now = typeof options.now === 'function' ? options.now() : Date.now()
  const candidate = normalizeScenario({
    version: SCENARIO_VERSION,
    source: input?.source,
    propertyKeys: input?.propertyKeys,
    selectedKey: input?.selectedKey ?? input?.propertyKeys?.[0],
    createdAt: now,
  }, now)

  if (!candidate || !storage) return null
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(candidate))
    return candidate
  } catch {
    return null
  }
}

export function readInvestorScenario(options = {}) {
  const storage = options.storage ?? defaultStorage()
  const now = typeof options.now === 'function' ? options.now() : Date.now()
  if (!storage) return null

  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return null
    const scenario = normalizeScenario(JSON.parse(raw), now)
    if (!scenario) storage.removeItem(STORAGE_KEY)
    return scenario
  } catch {
    try { storage.removeItem(STORAGE_KEY) } catch { /* storage can be blocked */ }
    return null
  }
}

export function clearInvestorScenario(options = {}) {
  const storage = options.storage ?? defaultStorage()
  if (!storage) return false
  try {
    storage.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

export const INVESTOR_SCENARIO_STORAGE_KEY = STORAGE_KEY

