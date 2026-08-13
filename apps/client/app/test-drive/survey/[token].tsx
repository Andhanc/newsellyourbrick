import { useLocalSearchParams } from 'expo-router'

import { PublicPageScreen } from '../../../src/dom/public-page-screen'

export default function TestDriveSurveyRoute() {
  const { token } = useLocalSearchParams<{ token: string }>()
  return <PublicPageScreen initialPath={`/test-drive/survey/${encodeURIComponent(String(token || ''))}`} />
}
