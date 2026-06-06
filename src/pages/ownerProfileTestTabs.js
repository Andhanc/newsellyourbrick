export const OWNER_PROFILE_TABS = [
  { id: 'personal', label: 'Личные данные' },
  { id: 'statistics', label: 'Статистика' },
  { id: 'settings', label: 'Настройки' },
]

const TAB_IDS = new Set(OWNER_PROFILE_TABS.map((tab) => tab.id))

export function isOwnerProfileTabId(value) {
  return typeof value === 'string' && TAB_IDS.has(value)
}

export function getOwnerProfileTabPath(tabId) {
  if (tabId === 'personal') return '/owner-test?view=profile'
  return `/owner-test?view=profile&tab=${tabId}`
}
