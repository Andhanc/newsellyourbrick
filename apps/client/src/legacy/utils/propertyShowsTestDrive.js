import { getEffectiveAuctionEndTime, isBuyNowPurchaseCompleted } from './auctionReminderBounds'
import { hasAuctionBuyNowListingForm } from './hasBuyNowOption'

function isDebtProperty(property) {
  return (
    property.sale_type === 'debt' ||
    property.is_debt === 1 ||
    property.is_debt === true ||
    property.has_debt === 1 ||
    property.has_debt === true
  )
}

/** Объект в активной резервации (buy now) — ставки и тест-драйв приостановлены. */
export function isPropertyReservationActive(property) {
  if (!property) return false
  const reserved =
    property.is_reserved === true || property.is_reserved === 1 || property.is_reserved === '1'
  if (!reserved || !property.reserved_until) return false
  const until = new Date(property.reserved_until).getTime()
  return Number.isFinite(until) && until > Date.now()
}

/** Аукцион завершён, объект продан или забронирован — промо drawer не показываем. */
export function propertyBlocksTestDrivePromo(property, { timerExpired = false } = {}) {
  if (!property) return true
  if (isBuyNowPurchaseCompleted(property)) return true
  if (property.status === 'sold') return true
  if (isPropertyReservationActive(property)) return true
  if (timerExpired) return true
  const endTime = getEffectiveAuctionEndTime(property)
  if (endTime && new Date(endTime).getTime() <= Date.now()) return true
  return false
}

/** Объект показывает блок тест-драйва на карточке и в деталях. */
export function propertyShowsTestDrive(property) {
  if (!property) return false
  if (isDebtProperty(property)) return false
  if (!hasAuctionBuyNowListingForm(property)) return false
  return (
    property.test_drive === 1 ||
    property.test_drive === true ||
    property.test_drive === '1' ||
    property.testDrive === true ||
    property.testDrive === 1
  )
}
