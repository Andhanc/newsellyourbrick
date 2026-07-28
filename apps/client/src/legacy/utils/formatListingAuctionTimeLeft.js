export function formatListingAuctionTimeLeft(endTime, t) {
  if (!endTime) return null
  const diffMs = new Date(endTime).getTime() - Date.now()
  if (diffMs <= 0) return null
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)
  const pad = (value) => String(value).padStart(2, '0')
  if (days > 0) {
    return t('debtsCardAuctionEndsDays', {
      days,
      hours: pad(hours),
      minutes: pad(minutes),
      seconds: pad(seconds),
    })
  }
  if (hours > 0) {
    return t('debtsCardAuctionEndsHours', {
      hours: pad(hours),
      minutes: pad(minutes),
      seconds: pad(seconds),
    })
  }
  if (minutes > 0) {
    return t('debtsCardAuctionEndsMinutes', {
      minutes: pad(minutes),
      seconds: pad(seconds),
    })
  }
  return t('debtsCardAuctionEndsSeconds', { seconds: pad(seconds) })
}

export function getListingAuctionTimerStatus(days) {
  if (days >= 90) return 'timer-long'
  if (days >= 60) return 'timer-medium'
  return 'timer-short'
}
