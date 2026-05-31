import { getApiBaseUrlSync } from '../utils/apiConfig'

const BASE = () => `${getApiBaseUrlSync()}/news`
const MARKETER_TOKEN_KEY = 'marketer_panel_token'

export function getMarketerToken() {
  try {
    return sessionStorage.getItem(MARKETER_TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setMarketerToken(token) {
  try {
    if (token) sessionStorage.setItem(MARKETER_TOKEN_KEY, token)
    else sessionStorage.removeItem(MARKETER_TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

function marketerHeaders() {
  const token = getMarketerToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function marketerLogin(login, password) {
  const res = await fetch(`${BASE()}/marketer/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Ошибка входа')
  setMarketerToken(data.token)
  return data.token
}

export async function marketerLogout() {
  const token = getMarketerToken()
  if (token) {
    await fetch(`${BASE()}/marketer/logout`, {
      method: 'POST',
      headers: marketerHeaders(),
    }).catch(() => {})
  }
  setMarketerToken('')
}

export async function fetchPublishedArticles() {
  const res = await fetch(`${BASE()}/articles`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Не удалось загрузить новости')
  return data.articles || []
}

export async function fetchArticleBySlug(slug) {
  const res = await fetch(`${BASE()}/articles/${encodeURIComponent(slug)}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Статья не найдена')
  return data.article
}

export async function fetchMarketerArticles() {
  const res = await fetch(`${BASE()}/marketer/articles`, { headers: marketerHeaders() })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    setMarketerToken('')
    throw new Error('SESSION_EXPIRED')
  }
  if (!res.ok) throw new Error(data.error || 'Ошибка загрузки')
  return data.articles || []
}

function formatGenerateError(err) {
  const msg = String(err?.message || err || '')
  if (/aborted|timeout|timed out/i.test(msg)) {
    return 'Генерация заняла слишком много времени. Укоротите промпт или повторите через 15–20 секунд.'
  }
  return msg || 'Ошибка генерации'
}

export async function generateNewsDraft(prompt) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 300000)

  try {
    const res = await fetch(`${BASE()}/marketer/generate`, {
      method: 'POST',
      headers: marketerHeaders(),
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 401) {
      setMarketerToken('')
      throw new Error('SESSION_EXPIRED')
    }
    if (!res.ok) throw new Error(data.error || 'Ошибка генерации')
    return data.draft
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(formatGenerateError({ message: 'timeout' }))
    }
    throw new Error(formatGenerateError(err))
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function publishNewsDraft(draft) {
  const res = await fetch(`${BASE()}/marketer/publish`, {
    method: 'POST',
    headers: marketerHeaders(),
    body: JSON.stringify({ draft }),
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    setMarketerToken('')
    throw new Error('SESSION_EXPIRED')
  }
  if (!res.ok) throw new Error(data.error || 'Ошибка публикации')
  return data.article
}

export async function deleteMarketerArticle(id) {
  const res = await fetch(`${BASE()}/marketer/articles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: marketerHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    setMarketerToken('')
    throw new Error('SESSION_EXPIRED')
  }
  if (!res.ok) throw new Error(data.error || 'Ошибка удаления')
  return true
}

async function parseNewsApiError(res, data, fallback) {
  if (res.status === 401) {
    setMarketerToken('')
    throw new Error('SESSION_EXPIRED')
  }
  if (!res.ok) throw new Error(data.error || fallback)
}

export async function searchNewsCoverImages(query, limit = 6) {
  const res = await fetch(`${BASE()}/marketer/images/search`, {
    method: 'POST',
    headers: marketerHeaders(),
    body: JSON.stringify({ query, limit }),
  })
  const data = await res.json().catch(() => ({}))
  await parseNewsApiError(res, data, 'Ошибка поиска фото')
  return data.images || []
}

export async function suggestNewsImageQuery(draft) {
  const res = await fetch(`${BASE()}/marketer/images/suggest`, {
    method: 'POST',
    headers: marketerHeaders(),
    body: JSON.stringify({ draft }),
  })
  const data = await res.json().catch(() => ({}))
  await parseNewsApiError(res, data, 'Ошибка подбора запроса')
  return data
}

export async function generateNewsAiCover(draft) {
  const res = await fetch(`${BASE()}/marketer/images/generate`, {
    method: 'POST',
    headers: marketerHeaders(),
    body: JSON.stringify({ draft }),
  })
  const data = await res.json().catch(() => ({}))
  await parseNewsApiError(res, data, 'Ошибка генерации фото')
  return data
}
