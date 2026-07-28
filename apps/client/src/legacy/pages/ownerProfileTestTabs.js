import { ownerTestT } from '../utils/ownerTestI18n'

export function getOwnerProfileTabs(t) {
  return [
    { id: 'personal', label: t('ownerTest_profileTabPersonal') },
    { id: 'statistics', label: t('ownerTest_profileTabStatistics') },
    { id: 'settings', label: t('ownerTest_profileTabSettings') },
  ]
}

const TAB_IDS = new Set(['personal', 'statistics', 'settings'])

/** @deprecated Prefer getOwnerProfileTabs(t) in React components */
export const OWNER_PROFILE_TABS = getOwnerProfileTabs(ownerTestT)

export function isOwnerProfileTabId(value) {
  return typeof value === 'string' && TAB_IDS.has(value)
}

export function getOwnerProfileTabPath(tabId) {
  if (tabId === 'personal') return '/owner-test/profile'
  return `/owner-test/profile?tab=${tabId}`
}
