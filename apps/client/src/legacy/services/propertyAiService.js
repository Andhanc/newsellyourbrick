import { getApiBaseUrlSync } from '../utils/apiConfig'

const API_BASE_URL = getApiBaseUrlSync()

async function propertyAiRequest(path, { userId, body, signal } = {}) {
  const response = await fetch(`${API_BASE_URL}/property-ai${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'X-User-Id': String(userId || ''),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.detail || `Ошибка сервера (${response.status})`)
  }
  return response
}

export async function startPropertyAiReport({ userId, propertyId, propertyTable, category, question }) {
  const response = await propertyAiRequest('/reports', {
    userId,
    body: {
      property_id: propertyId,
      property_table: propertyTable,
      category,
      question,
    },
  })
  return response.json()
}

export async function getPropertyAiReport({ userId, reportId, signal }) {
  const response = await propertyAiRequest(`/reports/${reportId}`, { userId, signal })
  const result = await response.json()
  return result.data
}

export async function getPropertyAiHistory({ userId, propertyId, propertyTable, signal }) {
  const params = new URLSearchParams({ property_id: String(propertyId) })
  if (propertyTable) params.set('property_table', propertyTable)
  const response = await propertyAiRequest(`/history?${params}`, { userId, signal })
  const result = await response.json()
  return result.data || []
}

export async function getPropertyAiPdfBlob({ userId, reportId, download = false }) {
  const suffix = download ? '?download=1' : ''
  const response = await propertyAiRequest(`/reports/${reportId}/pdf${suffix}`, { userId })
  return response.blob()
}
