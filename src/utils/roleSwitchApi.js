import { getApiBaseUrlSync } from './apiConfig'

const API_BASE_URL = getApiBaseUrlSync()

export async function fetchLinkedRoles({ userId, email } = {}) {
  const params = new URLSearchParams()
  if (userId) params.set('userId', String(userId))
  if (email) params.set('email', email)

  const response = await fetch(`${API_BASE_URL}/auth/linked-roles?${params.toString()}`)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Не удалось загрузить связанные кабинеты')
  }
  return data
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
