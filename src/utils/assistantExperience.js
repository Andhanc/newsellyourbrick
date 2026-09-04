export const ASSISTANT_CACHE_VERSION = 2
export const ASSISTANT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const ASSISTANT_CACHE_MAX_MESSAGES = 30
export const ASSISTANT_MAX_FILES = 2
export const ASSISTANT_MAX_FILE_BYTES = 5 * 1024 * 1024
export const ASSISTANT_MAX_TOTAL_BYTES = 8 * 1024 * 1024

export const SUPPORTED_ASSISTANT_LANGUAGES = Object.freeze([
  'ru',
  'en',
  'de',
  'es',
  'fr',
  'pl',
  'sv',
])

const ALLOWED_FILE_EXTENSIONS = new Set([
  'txt',
  'md',
  'csv',
  'json',
  'xml',
  'html',
  'yaml',
  'yml',
  'pdf',
  'docx',
  'xlsx',
  'xls',
])

export function normalizeAssistantLanguage(value, fallback = 'ru') {
  const code = String(value || '').toLowerCase().split('-')[0]
  return SUPPORTED_ASSISTANT_LANGUAGES.includes(code) ? code : fallback
}

export function detectAssistantInputLanguage(text = '') {
  const value = String(text || '')
  if (/[а-яё]/i.test(value)) return 'ru'
  if (/\b(hola|gracias|quiero|necesito|propiedad|subasta|hipoteca|cómo)\b/i.test(value) || /[ñ¿¡]/i.test(value)) return 'es'
  if (/\b(bonjour|merci|immobilier|logement|enchère)\b/i.test(value) || /[àâçèêëîïôùûÿœ]/i.test(value)) return 'fr'
  if (/\b(cześć|proszę|nieruchomość|mieszkanie|aukcja)\b/i.test(value) || /[ąćęłńśźż]/i.test(value)) return 'pl'
  if (/\b(hej|tack|fastighet|bostad|auktion)\b/i.test(value) || /[å]/i.test(value)) return 'sv'
  if (/\b(hallo|danke|immobilie|wohnung|auktion)\b/i.test(value) || /[üß]/i.test(value)) return 'de'
  return /[a-z]/i.test(value) ? 'en' : null
}

export function createAssistantCacheEnvelope(messages, now = Date.now()) {
  return {
    version: ASSISTANT_CACHE_VERSION,
    savedAt: now,
    messages: (Array.isArray(messages) ? messages : [])
      .slice(-ASSISTANT_CACHE_MAX_MESSAGES)
      .map((message) => ({
        ...message,
        attachments: Array.isArray(message.attachments)
          ? message.attachments.map(({ name, mimeType, size }) => ({ name, mimeType, size }))
          : undefined,
      })),
  }
}

export function readAssistantCache(raw, now = Date.now()) {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (Array.isArray(parsed)) return parsed.slice(-ASSISTANT_CACHE_MAX_MESSAGES)
    if (!parsed || parsed.version !== ASSISTANT_CACHE_VERSION || !Array.isArray(parsed.messages)) return []
    if (!Number.isFinite(parsed.savedAt) || now - parsed.savedAt > ASSISTANT_CACHE_TTL_MS) return []
    return parsed.messages.slice(-ASSISTANT_CACHE_MAX_MESSAGES)
  } catch {
    return []
  }
}

function fileExtension(name) {
  return String(name || '').split('.').pop()?.toLowerCase() || ''
}

export function isSupportedAssistantFile(file) {
  const type = String(file?.type || '').toLowerCase()
  return type.startsWith('image/') || type.startsWith('text/') || ALLOWED_FILE_EXTENSIONS.has(fileExtension(file?.name))
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('FILE_READ_FAILED'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(file)
  })
}

export async function prepareAssistantFiles(fileList, existing = []) {
  const current = Array.isArray(existing) ? existing : []
  const candidates = Array.from(fileList || []).slice(0, Math.max(0, ASSISTANT_MAX_FILES - current.length))
  const accepted = []
  let totalBytes = current.reduce((sum, item) => sum + (Number(item?.size) || 0), 0)

  for (const file of candidates) {
    if (!isSupportedAssistantFile(file)) throw new Error('UNSUPPORTED_FILE')
    if (file.size > ASSISTANT_MAX_FILE_BYTES) throw new Error('FILE_TOO_LARGE')
    if (totalBytes + file.size > ASSISTANT_MAX_TOTAL_BYTES) throw new Error('FILES_TOO_LARGE')
    totalBytes += file.size
    accepted.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: String(file.name || 'file').slice(0, 120),
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      dataUrl: await readAsDataUrl(file),
    })
  }

  return [...current, ...accepted]
}
