import { useLocalSearchParams } from 'expo-router'

import { PublicPageScreen } from '../../../../src/dom/public-page-screen'

export default function SearchCityRoute() {
  const { country, city } = useLocalSearchParams<{ country: string; city: string }>()
  return (
    <PublicPageScreen
      initialPath={`/search-results/${encodeURIComponent(String(country || ''))}/${encodeURIComponent(String(city || ''))}`}
    />
  )
}
