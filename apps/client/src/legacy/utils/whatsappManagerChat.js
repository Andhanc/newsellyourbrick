/** Персональный менеджер VIP-клуба (WhatsApp, Испания). */
export const VIP_PERSONAL_MANAGER_WHATSAPP_DIGITS = '34631252060'
export const VIP_PERSONAL_MANAGER_WHATSAPP_URL = `https://wa.me/${VIP_PERSONAL_MANAGER_WHATSAPP_DIGITS}`

/**
 * Ссылка «Закрытое сообщество в WhatsApp».
 * Сейчас — контакт менеджера; позже заменить на invite-ссылку группы.
 */
export const VIP_CLUB_WHATSAPP_COMMUNITY_URL = VIP_PERSONAL_MANAGER_WHATSAPP_URL

/** @deprecated номер берётся из админки / env; для VIP используйте VIP_PERSONAL_MANAGER_WHATSAPP_URL */
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

/** Открыть WhatsApp персонального менеджера VIP. */
export function openVipPersonalManagerWhatsApp() {
  return openWhatsAppManagerChat(VIP_PERSONAL_MANAGER_WHATSAPP_URL)
}

/** Открыть WhatsApp-сообщество VIP-клуба (пока тот же контакт). */
export function openVipClubWhatsAppCommunity() {
  return openWhatsAppManagerChat(VIP_CLUB_WHATSAPP_COMMUNITY_URL)
}
