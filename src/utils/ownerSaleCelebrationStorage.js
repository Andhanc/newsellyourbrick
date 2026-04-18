const STORAGE_KEY = 'ownerSaleCelebrationDismissed_v1'
const MAX_IDS = 400

export function getDismissedCelebrationIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

export function dismissCelebration(eventId) {
  if (!eventId || typeof eventId !== 'string') return
  const set = getDismissedCelebrationIds()
  set.add(eventId)
  const arr = [...set].slice(-MAX_IDS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
}
