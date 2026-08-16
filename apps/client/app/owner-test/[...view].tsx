import { useMemo } from 'react'
import { useLocalSearchParams } from 'expo-router'

import { PublicPageScreen } from '../../src/dom/public-page-screen'

export default function OwnerTestViewRoute() {
  const params = useLocalSearchParams<Record<string, string | string[]>>()
  const initialPath = useMemo(() => {
    const rawView = params.view
    const pathSegments = (Array.isArray(rawView) ? rawView : rawView ? [rawView] : [])
      .map((segment) => encodeURIComponent(String(segment)))
    const query = new URLSearchParams()

    for (const [key, rawValue] of Object.entries(params)) {
      if (key === 'view') continue
      const values = Array.isArray(rawValue) ? rawValue : [rawValue]
      for (const value of values) {
        if (value != null) query.append(key, String(value))
      }
    }

    const pathname = `/owner-test${pathSegments.length ? `/${pathSegments.join('/')}` : ''}`
    const suffix = query.toString()
    return suffix ? `${pathname}?${suffix}` : pathname
  }, [params])

  return <PublicPageScreen initialPath={initialPath} />
}
