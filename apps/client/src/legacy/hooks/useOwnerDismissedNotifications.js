import { useCallback, useState } from 'react'

const STORAGE_KEY = 'ownerTest_dismissedNotifications'

function loadDismissedIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function saveDismissedIds(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore quota / private mode errors
  }
}

export default function useOwnerDismissedNotifications() {
  const [dismissedIds, setDismissedIds] = useState(loadDismissedIds)

  const dismiss = useCallback((id) => {
    if (!id) return
    setDismissedIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      saveDismissedIds(next)
      return next
    })
  }, [])

  const filterItems = useCallback(
    (items) => (Array.isArray(items) ? items.filter((item) => !dismissedIds.has(item.id)) : []),
    [dismissedIds]
  )

  return { dismissedIds, dismiss, filterItems }
}
