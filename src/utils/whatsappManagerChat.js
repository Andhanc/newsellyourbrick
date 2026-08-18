export async function fetchWhatsAppManagerChatUrl(apiBaseUrl) {
  const base = String(apiBaseUrl || '/api').replace(/\/$/, '')
  const res = await fetch(`${base}/whatsapp/manager-chat`)
  const data = res.ok ? await res.json().catch(() => null) : null
  const url = typeof data?.url === 'string' ? data.url.trim() : ''
  return url.startsWith('https://wa.me/') ? url : ''
}

export function openWhatsAppManagerChat(url) {
  if (!url) return false
  try {
    const opened = window.open(url, '_blank', 'noopener,noreferrer')
    if (opened) return true
  } catch {
    /* ignore */
  }
  try {
    window.location.assign(url)
    return true
  } catch {
    return false
  }
}
