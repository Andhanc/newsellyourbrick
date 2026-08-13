import { useLocalSearchParams } from 'expo-router'

import { PublicPageScreen } from '../../../src/dom/public-page-screen'

export default function AuctionCountryRoute() {
  const { country } = useLocalSearchParams<{ country: string }>()
  return <PublicPageScreen initialPath={`/auction/${encodeURIComponent(String(country || ''))}`} />
}
