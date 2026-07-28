import i18n from '../i18n/config'

/**
 * Текст для UI из billing_reason (в БД может быть JSON резерва или строка).
 * Сырой JSON на экран не выводим. Язык — текущий i18next.
 */
export function formatBillingReasonForUi(raw) {
  if (raw == null || raw === '') return null
  const s = String(raw).trim()
  if (!s.startsWith('{')) {
    if (s === 'subscription_create') return i18n.t('buyerBilling_reasonSubscription')
    if (s === 'wallet_deposit') return i18n.t('buyerBilling_reasonWallet')
    return s
  }
  try {
    const j = JSON.parse(s)
    if (j.type === 'property_reservation') {
      const pid = j.property_id != null ? String(j.property_id) : '—'
      return i18n.t('buyerBilling_reasonReservation', { id: pid })
    }
    if (j.type === 'test_drive_booking') {
      const pid = j.property_id != null ? String(j.property_id) : '—'
      return `Оплата тест-драйва по объекту #${pid}`
    }
  } catch {
    return null
  }
  return null
}
