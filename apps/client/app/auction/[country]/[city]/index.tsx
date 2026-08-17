import { useLocalSearchParams } from 'expo-router'

import { PublicPageScreen } from '../../../../src/dom/public-page-screen'

export default function AuctionCityRoute() {
  const { country, city } = useLocalSearchParams<{ country: string; city: string }>()
  return (
    <PublicPageScreen
      initialPath={`/auction/${encodeURIComponent(String(country || ''))}/${encodeURIComponent(String(city || ''))}`}
    />
  )
}
