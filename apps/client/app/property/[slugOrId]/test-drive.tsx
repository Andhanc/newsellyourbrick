import { useLocalSearchParams } from 'expo-router'

import { PublicPageScreen } from '../../../src/dom/public-page-screen'

export default function TestDriveBookingRoute() {
  const { slugOrId } = useLocalSearchParams<{ slugOrId: string }>()
  return <PublicPageScreen initialPath={`/property/${encodeURIComponent(String(slugOrId || ''))}/test-drive`} />
}
