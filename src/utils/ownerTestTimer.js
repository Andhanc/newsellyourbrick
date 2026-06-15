const DAY_MS = 24 * 60 * 60 * 1000

/** Пороги как в PropertyTimer.jsx: зелёный ≥90д, оранжевый ≥60д, красный <60д, мигание <30д */
export const OWNER_TIMER_LONG_DAYS = 90
export const OWNER_TIMER_MEDIUM_DAYS = 60
export const OWNER_TIMER_URGENT_DAYS = 30

export function getOwnerAuctionTimerFlags(remainingMs) {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return { expired: true, warning: false, critical: false, urgent: false }
  }

  const days = Math.floor(remainingMs / DAY_MS)
  const critical = days < OWNER_TIMER_MEDIUM_DAYS
  const warning = !critical && days < OWNER_TIMER_LONG_DAYS
  const urgent = days < OWNER_TIMER_URGENT_DAYS

  return { expired: false, warning, critical, urgent }
}

export function formatOwnerAuctionTimerCountdown(remainingMs, { daySeparator = 'd ' } = {}) {
  const totalSeconds = Math.floor(remainingMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const two = (value) => String(value).padStart(2, '0')

  if (days > 0) {
    return `${days}${daySeparator}${two(hours)}:${two(minutes)}:${two(seconds)}`
  }
  return `${two(hours)}:${two(minutes)}:${two(seconds)}`
}
