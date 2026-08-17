import { useLocalSearchParams } from 'expo-router'

import { PublicPageScreen } from '../src/dom/public-page-screen'

export default function BonusesRoute() {
  const { tab } = useLocalSearchParams<{ tab?: string }>()
  return <PublicPageScreen initialPath={tab ? `/bonuses?tab=${encodeURIComponent(tab)}` : '/bonuses'} />
}
