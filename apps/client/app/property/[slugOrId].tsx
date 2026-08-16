import { useLocalSearchParams } from 'expo-router'

import { PublicPageScreen } from '../../src/dom/public-page-screen'
import { useLegacyRoutePath } from '../../src/routing/use-legacy-route-path'

const ROUTE_KEYS = ['slugOrId'] as const

export default function PropertyDetailRoute() {
  const { slugOrId } = useLocalSearchParams<{ slugOrId: string }>()
  const pathname = `/property/${encodeURIComponent(String(slugOrId || ''))}`
  return <PublicPageScreen initialPath={useLegacyRoutePath(pathname, ROUTE_KEYS)} />
}
