/**
 * Единый модификатор карточки уведомления по полю type (Хедер, MainPage, кабинет владельца).
 */
export function getNotificationItemClass(notification) {
  if (!notification?.type) return 'notification-item--property'
  const { type } = notification
  if (type === 'verification_success') return 'notification-item--success'
  if (type === 'verification_rejected') return 'notification-item--error'
  if (type === 'bid_outbid') return 'notification-item--warning'
  if (type === 'buy_now_approved') return 'notification-item--success'
  if (type === 'buy_now_rejected') return 'notification-item--error'
  if (type === 'auction_won') return 'notification-item--success'
  if (type === 'auction_lost') return 'notification-item--warning'
  if (type === 'payment_deadline') return 'notification-item--warning'
  if (type === 'test_drive_request') return 'notification-item--warning'
  if (type === 'test_drive_result') return 'notification-item--success'
  return 'notification-item--property'
}
