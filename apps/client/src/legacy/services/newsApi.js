import { getApiBaseUrlSync } from '../utils/apiConfig'
import { fetchDedupe } from '../utils/fetchDedupe'

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
  if (!res.ok) throw new Error(data.error || 'Sign-in failed')
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
  const res = await fetchDedupe(`${BASE()}/articles`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not load news')
  return data.articles || []
}

export async function fetchArticleBySlug(slug) {
  const res = await fetch(`${BASE()}/articles/${encodeURIComponent(slug)}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Article not found')
  return data.article
}

export async function fetchMarketerArticles() {
  const res = await fetch(`${BASE()}/marketer/articles`, { headers: marketerHeaders() })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    setMarketerToken('')
    throw new Error('SESSION_EXPIRED')
  }
  if (!res.ok) throw new Error(data.error || 'Load failed')
  return data.articles || []
}

function formatGenerateError(err) {
  const msg = String(err?.message || err || '')
  if (/aborted|timeout|timed out/i.test(msg)) {
    return 'Generation took too long. Shorten the prompt or wait ~15–20 seconds and try again.'
  }
  return msg || 'Generation failed'
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
    if (!res.ok) throw new Error(data.error || 'Generation failed')
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
  if (!res.ok) throw new Error(data.error || 'Publish failed')
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
  if (!res.ok) throw new Error(data.error || 'Delete failed')
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
  await parseNewsApiError(res, data, 'Photo search failed')
  return data.images || []
}

export async function suggestNewsImageQuery(draft) {
  const res = await fetch(`${BASE()}/marketer/images/suggest`, {
    method: 'POST',
    headers: marketerHeaders(),
    body: JSON.stringify({ draft }),
  })
  const data = await res.json().catch(() => ({}))
  await parseNewsApiError(res, data, 'Query suggestion failed')
  return data
}

export async function generateNewsAiCover(draft) {
  const res = await fetch(`${BASE()}/marketer/images/generate`, {
    method: 'POST',
    headers: marketerHeaders(),
    body: JSON.stringify({ draft }),
  })
  const data = await res.json().catch(() => ({}))
  await parseNewsApiError(res, data, 'Photo generation failed')
  return data
}
