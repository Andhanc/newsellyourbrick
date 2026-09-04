const STORAGE_KEY_PREFIX = 'syb.compare.snapshot:'
const SNAPSHOT_VERSION = 2
const SNAPSHOT_TTL_MS = 60 * 60 * 1_000
const MAX_KEY_LENGTH = 160
const SAFE_KEY = /^[a-zA-Z0-9_.:-]+$/
const MAX_TEXT = 4000
const MAX_AI_ROWS = 24

function defaultStorage() {
  try {
    return globalThis.sessionStorage ?? null
  } catch {
    return null
  }
}

function resolveUserId(userId) {
  if (userId != null && String(userId).trim() !== '') return String(userId).trim()
  try {
    const raw = globalThis.localStorage?.getItem('userId')
    if (raw && /^\d+$/.test(String(raw).trim())) return String(raw).trim()
  } catch {
    /* storage can be blocked */
  }
  return 'anon'
}

export function compareSnapshotStorageKey(userId) {
  return `${STORAGE_KEY_PREFIX}${resolveUserId(userId)}`
}

function normalizeKey(value) {
  if (typeof value !== 'string') return null
  const key = value.trim()
  if (!key || key.length > MAX_KEY_LENGTH || !SAFE_KEY.test(key)) return null
  return key
}

function clipText(value, max = MAX_TEXT) {
  if (value == null) return null
  const text = String(value)
  return text.length > max ? text.slice(0, max) : text
}

function normalizeAiResult(value) {
  if (value == null) return null
  if (typeof value !== 'object' || Array.isArray(value)) return null
  const rows = Array.isArray(value.rows)
    ? value.rows.slice(0, MAX_AI_ROWS).map((row) => ({
      aspect: clipText(row?.aspect, 200) || '',
      left: clipText(row?.left, 800) || '',
      right: clipText(row?.right, 800) || '',
      winner: ['left', 'right', 'tie'].includes(row?.winner) ? row.winner : null,
    }))
    : []
  return {
    summary: clipText(value.summary, 4000),
    rows,
  }
}

function normalizeCalcSide(value) {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return null
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return null
  }
}

function normalizeCalcPair(value, fallback = { left: null, right: null }) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback
  return {
    left: normalizeCalcSide(value.left),
    right: normalizeCalcSide(value.right),
  }
}

function normalizeErrorPair(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { left: null, right: null }
  }
  return {
    left: clipText(value.left, 400),
    right: clipText(value.right, 400),
  }
}

function normalizeSnapshot(value, now) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  if (value.version !== SNAPSHOT_VERSION) return null

  const selectedKeys = Array.isArray(value.selectedKeys)
    ? value.selectedKeys.map(normalizeKey)
    : []
  if (selectedKeys.length !== 2 || selectedKeys.some((key) => !key) || selectedKeys[0] === selectedKeys[1]) {
    return null
  }

  const pairKey = typeof value.pairKey === 'string' && value.pairKey.includes('::')
    ? value.pairKey
    : `${selectedKeys[0]}::${selectedKeys[1]}`

  const savedAt = Number(value.savedAt)
  if (!Number.isFinite(savedAt) || savedAt <= 0) return null
  if (savedAt > now + 5_000) return null
  if (now - savedAt > SNAPSHOT_TTL_MS) return null

  return {
    version: SNAPSHOT_VERSION,
    selectedKeys,
    pairKey,
    aiResult: normalizeAiResult(value.aiResult),
    aiError: clipText(value.aiError, 400),
    calcData: normalizeCalcPair(value.calcData),
    calcError: normalizeErrorPair(value.calcError),
    showdownCompleted: value.showdownCompleted === true,
    savedAt,
  }
}

export function writeCompareSnapshot(input, options = {}) {
  const storage = options.storage ?? defaultStorage()
  const now = typeof options.now === 'function' ? options.now() : Date.now()
  const snapshot = normalizeSnapshot({
    version: SNAPSHOT_VERSION,
    selectedKeys: input?.selectedKeys,
    pairKey: input?.pairKey,
    aiResult: input?.aiResult ?? null,
    aiError: input?.aiError ?? null,
    calcData: input?.calcData ?? { left: null, right: null },
    calcError: input?.calcError ?? { left: null, right: null },
    showdownCompleted: input?.showdownCompleted === true,
    savedAt: now,
  }, now)

  if (!snapshot || !storage) return null
  try {
    storage.setItem(compareSnapshotStorageKey(options.userId), JSON.stringify(snapshot))
    return snapshot
  } catch {
    return null
  }
}

export function readCompareSnapshot(options = {}) {
  const storage = options.storage ?? defaultStorage()
  const now = typeof options.now === 'function' ? options.now() : Date.now()
  if (!storage) return null

  const key = compareSnapshotStorageKey(options.userId)
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const snapshot = normalizeSnapshot(JSON.parse(raw), now)
    if (!snapshot) {
      storage.removeItem(key)
      return null
    }
    return snapshot
  } catch {
    try { storage.removeItem(key) } catch { /* storage can be blocked */ }
    return null
  }
}

export function clearCompareSnapshot(options = {}) {
  const storage = options.storage ?? defaultStorage()
  if (!storage) return false
  try {
    storage.removeItem(compareSnapshotStorageKey(options.userId))
    return true
  } catch {
    return false
  }
}

export const COMPARE_SNAPSHOT_TTL_MS = SNAPSHOT_TTL_MS
