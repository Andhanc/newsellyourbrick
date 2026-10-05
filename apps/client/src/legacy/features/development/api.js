import { getMobileAuthToken } from '../../services/authService'
import { getApiBaseUrlSync } from '../../utils/apiConfig'
export async function dealApi(path, options = {}) {
  const token = getMobileAuthToken()
  const response = await fetch(`${getApiBaseUrlSync()}/development${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })
  const data = await response.json()
  if (!response.ok || !data.success) throw new Error(data.error || 'serverError')
  return data.data
}
export function recordDealView(key) {
  let visitor = sessionStorage.getItem('syb.dealVisitor')
  if (!visitor) {
    visitor = crypto.randomUUID()
    sessionStorage.setItem('syb.dealVisitor', visitor)
  }
  return dealApi(`/events/${encodeURIComponent(key)}`, {
    method: 'POST',
    body: { visitor_id: visitor, kind: 'view' },
  })
}
export async function uploadProjectDocument(id, file, kind = 'additional') {
  const body = new FormData()
  body.append('document', file)
  body.append('kind', kind)
  const response = await fetch(`${getApiBaseUrlSync()}/development/projects/${id}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getMobileAuthToken()}` },
    body,
  })
  const data = await response.json()
  if (!response.ok || !data.success) throw new Error(data.error || 'serverError')
  return data.data
}
export async function downloadProjectDocument(id, doc) {
  const response = await fetch(
    `${getApiBaseUrlSync()}/development/projects/${id}/documents/${encodeURIComponent(doc.id)}`,
    { headers: { Authorization: `Bearer ${getMobileAuthToken()}` } },
  )
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'serverError')
  }
  const url = URL.createObjectURL(await response.blob()),
    link = document.createElement('a')
  link.href = url
  link.download = doc.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
