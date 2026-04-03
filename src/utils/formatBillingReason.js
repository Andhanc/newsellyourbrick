/**
 * Текст для UI из billing_reason (в БД может быть JSON резерва или строка).
 * Сырой JSON на экран не выводим.
 */
export function formatBillingReasonForUi(raw) {
  if (raw == null || raw === '') return null
  const s = String(raw).trim()
  if (!s.startsWith('{')) {
    const map = {
      subscription_create: 'Оформление подписки',
      wallet_deposit: 'Пополнение кошелька',
    }
    return map[s] || s
  }
  try {
    const j = JSON.parse(s)
    if (j.type === 'property_reservation') {
      const pid = j.property_id != null ? j.property_id : '—'
      return `Резерв 10% · объект №${pid}`
    }
  } catch {
    return null
  }
  return null
}
