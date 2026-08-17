import { useLocalSearchParams } from 'expo-router'

import { PublicPageScreen } from '../../../src/dom/public-page-screen'

export default function SearchCountryRoute() {
  const { country } = useLocalSearchParams<{ country: string }>()
  return <PublicPageScreen initialPath={`/search-results/${encodeURIComponent(String(country || ''))}`} />
}
