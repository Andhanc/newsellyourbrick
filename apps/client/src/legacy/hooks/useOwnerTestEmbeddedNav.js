import { useOwnerTestNavOptional } from '../context/OwnerTestNavigationContext'

export function useOwnerTestEmbeddedNav() {
  const nav = useOwnerTestNavOptional()
  return {
    isEmbedded: Boolean(nav?.embedded),
    goTo: nav?.goTo,
    propertyId: nav?.propertyId ?? '',
    tab: nav?.tab ?? 'personal',
    highlight: nav?.highlight ?? '',
  }
}
