import { CLERK_DB_USER_SYNCED, getStoredNumericUserId } from '../services/authService'
import { getCurrencySymbol } from './currency'
import { fetchDedupe } from './fetchDedupe'
import { formatMoneyFromMinorUnits } from './formatStripeMoney'
import { getPropertyCardImage } from './propertyImage'
import { getUiIntlLocale } from './uiIntlLocale'

export const OWNER_TEST_DRIVE_BOOKINGS_CHANGED = 'owner-test-drive-bookings-changed'

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api'

const FALLBACK_IMAGE =
  '/images/external/photo-1568605114967-8130f3a36994-bc29e86e2f.jpg'

const STATUS_MAP = {
  pending: { statusLabelKey: 'ownerTdStatusPending', statusKey: 'pending', tab: 'pending' },
  paid: { statusLabelKey: 'ownerTdStatusPending', statusKey: 'pending', tab: 'pending' },
  approved: { statusLabelKey: 'ownerTdStatusConfirmed', statusKey: 'confirmed', tab: 'confirmed' },
  cancelled: { statusLabelKey: 'ownerTdStatusCancelled', statusKey: 'cancelled', tab: 'cancelled' },
  rejected: { statusLabelKey: 'ownerTdStatusCancelled', statusKey: 'cancelled', tab: 'cancelled' },
}

function resolveDateLocale(locale) {
  const base = String(locale || 'en').split(/[-_]/)[0].toLowerCase()
  const map = { ru: 'ru-RU', en: 'en-US', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', pl: 'pl-PL', sv: 'sv-SE' }
  return map[base] || 'en-US'
}

function formatDateRange(start, end, locale = 'en') {
  try {
    const s = new Date(`${start}T12:00:00`)
    const e = new Date(`${end}T12:00:00`)
    const opts = { day: 'numeric', month: 'long', year: 'numeric' }
    const loc = resolveDateLocale(locale)
    return `${s.toLocaleDateString(loc, opts)} — ${e.toLocaleDateString(loc, opts)}`
  } catch {
    return `${start || '—'} — ${end || '—'}`
  }
}

function formatDateRangeShort(start, end, locale = 'en') {
  try {
    const s = new Date(`${start}T12:00:00`)
    const e = new Date(`${end}T12:00:00`)
    const opts = { day: 'numeric', month: 'short' }
    const loc = resolveDateLocale(locale)
    const startLabel = s.toLocaleDateString(loc, opts).replace(/\.$/, '')
    const endLabel = e.toLocaleDateString(loc, opts).replace(/\.$/, '')
    return `${startLabel} — ${endLabel}`
  } catch {
    return `${start || '—'} — ${end || '—'}`
  }
}

function formatDeposit(booking) {
  const insurance = Number(booking.insurance_deposit_amount)
  if (Number.isFinite(insurance) && insurance > 0) {
    const currency = String(booking.paid_currency || 'USD').toUpperCase()
    const sym = getCurrencySymbol(currency)
    return `${sym}${insurance.toLocaleString(getUiIntlLocale(), { maximumFractionDigits: 0 })}`
  }

  const cents = Number(booking.paid_amount_cents)
  if (Number.isFinite(cents) && cents > 0) {
    return (
      formatMoneyFromMinorUnits(cents, booking.paid_currency || 'EUR', getUiIntlLocale()) || '—'
    )
  }

  return '—'
}

function propertyCacheKey(booking) {
  const table = booking.property_table || 'properties_apartments'
  return `${table}:${Number(booking.property_id)}`
}

async function enrichBookingsWithLocations(bookings) {
  const locationByKey = new Map()
  const keys = [...new Set(bookings.map(propertyCacheKey))]

  await Promise.all(
    keys.map(async (key) => {
      const [, id] = key.split(':')
      try {
        const response = await fetch(`${API_BASE_URL}/properties/${id}`)
        if (!response.ok) return
        const result = await response.json()
        if (!result.success || !result.data) return
        const location = result.data.location || result.data.address || ''
        locationByKey.set(key, location)
      } catch {
        /* ignore */
      }
    })
  )

  return locationByKey
}

const CHECK_IN_STATUS_LABEL_KEYS = {
  pending_checkin: 'ownerTdCheckInPendingOwner',
  awaiting_buyer_checkin: 'ownerTdCheckInAwaitingBuyer',
  checked_in: 'ownerTdCheckInCheckedIn',
  issues_reported: 'ownerTdCheckInIssues',
}

export function getCheckInStatusLabelKey(status) {
  const key = String(status || '').toLowerCase()
  return CHECK_IN_STATUS_LABEL_KEYS[key] || null
}

/** @deprecated use getCheckInStatusLabelKey + t() */
export function getCheckInStatusLabel(status) {
  return getCheckInStatusLabelKey(status)
}

export function canOwnerConfirmBooking(rawStatus) {
  return ['pending', 'paid'].includes(String(rawStatus || '').toLowerCase())
}

export function canOwnerCancelBooking(rawStatus) {
  return ['pending', 'paid', 'approved'].includes(String(rawStatus || '').toLowerCase())
}

export function mapOwnerTestDriveBooking(booking, locationByKey = new Map()) {
  const statusKey = String(booking.status || 'pending').toLowerCase()
  const statusUi = STATUS_MAP[statusKey] || STATUS_MAP.pending
  const cacheKey = propertyCacheKey(booking)
  const image = getPropertyCardImage(
    {
      photos: booking.property_cover_url ? [booking.property_cover_url] : [],
    },
    FALLBACK_IMAGE
  )

  return {
    id: booking.id,
    bookingId: booking.id,
    displayId: `TD-${booking.id}`,
    title: booking.property_title || null,
    titleFallbackKey: 'ownerTdPropertyFallback',
    titleFallbackId: booking.property_id,
    location: locationByKey.get(cacheKey) || null,
    locationFallbackKey: 'ownerTdLocationUnknown',
    image,
    buyer: booking.buyer_display || null,
    buyerFallbackKey: 'ownerTdBuyerFallback',
    dates: formatDateRange(booking.start_date, booking.end_date),
    datesShort: formatDateRangeShort(booking.start_date, booking.end_date),
    startDate: booking.start_date,
    endDate: booking.end_date,
    amount: formatDeposit(booking),
    statusLabelKey: statusUi.statusLabelKey,
    status: statusUi.statusLabelKey,
    statusKey: statusUi.statusKey,
    rawStatus: statusKey,
    tab: statusUi.tab,
    ownerComment: String(booking.owner_comment || '').trim(),
    checkInStatus: String(booking.check_in_status || '').toLowerCase(),
    checkInStatusLabel: getCheckInStatusLabel(booking.check_in_status),
    propertyId: booking.property_id,
    propertyTable: booking.property_table || 'properties_apartments',
    cancellationReason: String(booking.cancellation_reason || '').trim(),
    cancelledBy: String(booking.cancelled_by || '').toLowerCase(),
    raw: booking,
  }
}

export async function fetchOwnerTestDriveBookings(ownerUserId) {
  if (!ownerUserId) return []

  const response = await fetch(`${API_BASE_URL}/test-drive-bookings/owner/${ownerUserId}`)
  if (!response.ok) {
    throw new Error('ownerTdLoadBookingsFailed')
  }

  const result = await response.json()
  if (!result.success || !Array.isArray(result.data)) {
    return []
  }

  const locationByKey = await enrichBookingsWithLocations(result.data)
  return result.data.map((booking) => mapOwnerTestDriveBooking(booking, locationByKey))
}

export function filterOwnerTestDriveRows(rows, tab = 'all') {
  if (tab === 'all') return rows
  return rows.filter((row) => row.tab === tab)
}

export function countOwnerTestDriveByTab(rows) {
  const counts = {
    all: rows.length,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
  }
  for (const row of rows) {
    if (counts[row.tab] != null) counts[row.tab] += 1
  }
  return counts
}

/** Test-drives that arrived on the owner's listings. */
export function countIncomingOwnerTestDriveBookings(rows = []) {
  return Array.isArray(rows) ? rows.length : 0
}

export function formatOwnerNavBadge(count) {
  const value = Math.max(0, Number(count) || 0)
  if (value <= 0) return undefined
  return value > 99 ? '99+' : value
}

export async function fetchOwnerTestDriveNavBadgeCount(ownerUserId) {
  if (!ownerUserId) return 0

  const response = await fetchDedupe(`${API_BASE_URL}/test-drive-bookings/owner/${ownerUserId}`)
  if (!response.ok) return 0

  const result = await response.json().catch(() => ({}))
  if (!result.success || !Array.isArray(result.data)) return 0

  return countIncomingOwnerTestDriveBookings(result.data)
}

function notifyOwnerTestDriveBookingsChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OWNER_TEST_DRIVE_BOOKINGS_CHANGED))
}

export function getOwnerTestDriveUserId() {
  return getStoredNumericUserId()
}

export async function respondOwnerTestDriveBooking(userId, bookingId, action, ownerComment = '') {
  const response = await fetch(`${API_BASE_URL}/test-drive-bookings/${bookingId}/respond`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      action,
      owner_comment: action === 'approve' ? ownerComment : undefined,
    }),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'ownerTdActionFailed')
  }
  notifyOwnerTestDriveBookingsChanged()
  return json
}

export async function cancelOwnerTestDriveBooking(userId, bookingId, reason) {
  const response = await fetch(`${API_BASE_URL}/test-drive-bookings/${bookingId}/cancel-by-owner`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, reason }),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'ownerTdCancelBookingFailed')
  }
  notifyOwnerTestDriveBookingsChanged()
  return json
}

export { CLERK_DB_USER_SYNCED }
