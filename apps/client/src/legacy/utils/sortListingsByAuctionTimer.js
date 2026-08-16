import { getEffectiveAuctionEndTime } from './auctionReminderBounds.js'

function isPrivateClubLot(property) {
  const v = property?.private_club_only
  return v === 1 || v === true || v === '1'
}

/**
 * Sort key for listing timers: soonest active end first, then no timer, then ended.
 * @param {Record<string, unknown> | null | undefined} property
 * @param {number} [now]
 * @returns {{ bucket: number, endMs: number }}
 */
export function getListingAuctionTimerSortMeta(property, now = Date.now()) {
  const end = getEffectiveAuctionEndTime(property)
  if (end == null || end === '') {
    // Buy-now completed / sold-without-timer still counts as "ended" for ordering.
    if (
      property?.buy_now_winner_user_id != null &&
      property?.buy_now_completed_at != null &&
      String(property.buy_now_completed_at).trim() !== ''
    ) {
      return { bucket: 2, endMs: 0 }
    }
    return { bucket: 1, endMs: Number.POSITIVE_INFINITY }
  }

  const endMs = new Date(end).getTime()
  if (!Number.isFinite(endMs)) {
    return { bucket: 1, endMs: Number.POSITIVE_INFINITY }
  }

  if (endMs <= now) {
    return { bucket: 2, endMs }
  }

  return { bucket: 0, endMs }
}

/**
 * Compare listings: optional private-club first, then by remaining auction timer.
 * @param {Record<string, unknown>} a
 * @param {Record<string, unknown>} b
 * @param {{ now?: number, privateClubFirst?: boolean }} [options]
 */
export function compareListingsByAuctionTimer(a, b, options = {}) {
  const { now = Date.now(), privateClubFirst = true } = options

  if (privateClubFirst) {
    const pc = (isPrivateClubLot(b) ? 1 : 0) - (isPrivateClubLot(a) ? 1 : 0)
    if (pc !== 0) return pc
  }

  const ma = getListingAuctionTimerSortMeta(a, now)
  const mb = getListingAuctionTimerSortMeta(b, now)
  if (ma.bucket !== mb.bucket) return ma.bucket - mb.bucket
  if (ma.endMs !== mb.endMs) return ma.endMs - mb.endMs
  return 0
}

/**
 * @template T
 * @param {T[]} list
 * @param {{ now?: number, privateClubFirst?: boolean }} [options]
 * @returns {T[]}
 */
export function sortListingsByAuctionTimer(list, options = {}) {
  if (!Array.isArray(list) || list.length <= 1) return list
  return [...list].sort((a, b) => compareListingsByAuctionTimer(a, b, options))
}
