import { useMemo } from 'react'
import { useLocalSearchParams } from 'expo-router'

/** Keeps Expo Router query parameters when the screen is rendered by the legacy web UI. */
export function useLegacyRoutePath(pathname: string, excludedKeys: readonly string[] = []) {
  const params = useLocalSearchParams<Record<string, string | string[]>>()
  const excluded = excludedKeys.join('\u0000')

  return useMemo(() => {
    const ignored = new Set(excluded ? excluded.split('\u0000') : [])
    const query = new URLSearchParams()

    for (const [key, rawValue] of Object.entries(params)) {
      if (ignored.has(key)) continue
      const values = Array.isArray(rawValue) ? rawValue : [rawValue]
      for (const value of values) {
        if (value != null) query.append(key, String(value))
      }
    }

    const suffix = query.toString()
    return suffix ? `${pathname}?${suffix}` : pathname
  }, [excluded, params, pathname])
}
