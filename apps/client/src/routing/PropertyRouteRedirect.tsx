import { Redirect, useLocalSearchParams } from 'expo-router'

export function PropertyRouteRedirect() {
  const { slugOrId } = useLocalSearchParams<{ slugOrId: string }>()
  const value = Array.isArray(slugOrId) ? slugOrId[0] : slugOrId

  return <Redirect href={`/property/${encodeURIComponent(value || '')}` as never} />
}
