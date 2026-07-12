/** Имена PDF в public/documents (копируются в dist при сборке). */
const RESERVE_TERMS_FILES = ['reserve-terms.pdf', 'Document.pdf']

/**
 * Абсолютный URL PDF от корня сайта (учитывает Vite base, не ломается на /deposit и др.).
 * @param {string} [filename]
 */
export function getReserveTermsPdfUrl(filename = RESERVE_TERMS_FILES[0]) {
  const base = import.meta.env.BASE_URL || '/'
  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(`documents/${filename}`, `${window.location.origin}${base}`).href
  }
  const prefix = base.startsWith('/') ? base : `/${base}`
  const withSlash = prefix.endsWith('/') ? prefix : `${prefix}/`
  return `${withSlash}documents/${filename}`.replace(/([^:]\/)\/+/g, '$1')
}

export const RESERVE_TERMS_PDF_URL = getReserveTermsPdfUrl(RESERVE_TERMS_FILES[0])

/** @param {Response} resp */
function isPdfResponse(resp) {
  if (!resp.ok) return false
  const ct = (resp.headers.get('content-type') || '').toLowerCase()
  if (ct.includes('pdf') || ct.includes('octet-stream')) return true
  // SPA fallback иногда отдаёт 200 + text/html — не считаем PDF
  if (ct.includes('text/html')) return false
  return true
}

/**
 * Первый доступный PDF (HEAD). При ошибке сети возвращает основной URL — viewer всё равно откроется.
 * @returns {Promise<string>}
 */
export async function resolveReserveTermsPdfUrl() {
  const candidates = RESERVE_TERMS_FILES.map(getReserveTermsPdfUrl)
  for (const url of candidates) {
    try {
      const resp = await fetch(url, { method: 'HEAD' })
      if (isPdfResponse(resp)) return url
    } catch {
      /* пробуем следующий */
    }
  }
  return candidates[0]
}

/**
 * Открыть PDF в новой вкладке. Синхронно — иначе браузер блокирует popup после await.
 * @returns {{ url: string, openedInNewTab: boolean }}
 */
export function launchReserveTermsPdf() {
  const url = getReserveTermsPdfUrl()
  if (typeof window === 'undefined') {
    return { url, openedInNewTab: false }
  }
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  return { url, openedInNewTab: Boolean(opened) }
}
