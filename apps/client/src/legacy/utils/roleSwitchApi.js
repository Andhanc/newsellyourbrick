import { getApiBaseUrlSync } from './apiConfig'
import { fetchDedupe } from './fetchDedupe'

const API_BASE_URL = getApiBaseUrlSync()
const LINKED_ROLES_TTL_MS = 30000
const linkedRolesCache = new Map()

export async function fetchLinkedRoles({ userId, email } = {}) {
  const params = new URLSearchParams()
  if (userId) params.set('userId', String(userId))
  if (email) params.set('email', email)
  const key = params.toString()
  const cached = linkedRolesCache.get(key)
  const now = Date.now()
  if (cached?.data && now - cached.ts < LINKED_ROLES_TTL_MS) return cached.data
  if (cached?.promise) return cached.promise

  const request = (async () => {
    const response = await fetchDedupe(`${API_BASE_URL}/auth/linked-roles?${key}`)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.error || 'Не удалось загрузить связанные кабинеты')
    }
    linkedRolesCache.set(key, { ts: Date.now(), promise: null, data })
    return data
  })()

  linkedRolesCache.set(key, { ts: now, promise: request, data: cached?.data || null })
  return request
}

export async function createLinkedRole({ userId, targetRole, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/linked-roles/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, targetRole, password }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const err = new Error(data.error || 'Не удалось создать кабинет')
    err.status = data.status || null
    err.passwordValidation = data.passwordValidation || null
    throw err
  }
  return data
}

/** Задать пароль текущему кабинету, если пароля ещё нет (Google → покупатель). */
export async function setLinkedRolePassword({ userId, password }) {
  const response = await fetch(`${API_BASE_URL}/auth/linked-roles/set-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, password }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const err = new Error(data.error || 'Не удалось сохранить пароль')
    err.status = data.status || null
    err.passwordValidation = data.passwordValidation || null
    throw err
  }
  return data
}
