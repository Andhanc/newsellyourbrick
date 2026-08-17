import { useLocalSearchParams } from 'expo-router'

import { PublicPageScreen } from '../../../src/dom/public-page-screen'

export default function TestDriveFeedbackRoute() {
  const { token } = useLocalSearchParams<{ token: string }>()
  return <PublicPageScreen initialPath={`/test-drive/feedback/${encodeURIComponent(String(token || ''))}`} />
}
