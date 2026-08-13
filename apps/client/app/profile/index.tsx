import { useMemo } from 'react'
import { useLocalSearchParams } from 'expo-router'

import { PublicPageScreen } from '../../src/dom/public-page-screen'

export default function ProfileScreen() {
  const params = useLocalSearchParams<Record<string, string | string[]>>()
  const initialPath = useMemo(() => {
    const query = new URLSearchParams()
    for (const [key, rawValue] of Object.entries(params)) {
      const values = Array.isArray(rawValue) ? rawValue : [rawValue]
      for (const value of values) {
        if (value != null) query.append(key, String(value))
      }
    }
    const suffix = query.toString()
    return suffix ? `/profile?${suffix}` : '/profile'
  }, [params])

  return <PublicPageScreen initialPath={initialPath} />
}
