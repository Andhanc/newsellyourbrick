import { useLocalSearchParams } from 'expo-router'

import { PublicPageScreen } from '../../../src/dom/public-page-screen'

export default function PurchasedPropertyRoute() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>()
  return <PublicPageScreen initialPath={`/profile/purchased/${encodeURIComponent(String(propertyId || ''))}`} />
}
