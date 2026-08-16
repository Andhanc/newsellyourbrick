import { useCallback } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import PublicPage from './public-page.dom'
import { useAuth } from '../auth/session'

type PublicPageScreenProps = {
  initialPath: string
}

function normalizeLegacyPath(target: string) {
  const match = target.match(/^([^?#]*)(.*)$/)
  const pathname = match?.[1] || '/'
  const suffix = match?.[2] || ''
  const segments = pathname.split('/').filter(Boolean)
  const propertyIndex = segments.lastIndexOf('property')

  if (propertyIndex >= 0 && segments[propertyIndex + 1]) {
    return `/property/${encodeURIComponent(decodeURIComponent(segments[propertyIndex + 1]))}${suffix}`
  }

  if ((segments[0] === 'shares' || segments[0] === 'co-investment') && segments[1]) {
    return `/property/${encodeURIComponent(decodeURIComponent(segments[1]))}${suffix}`
  }

  const aliases: Record<string, string> = {
    '/data': '/profile',
    '/deposit': '/wallet',
    '/main': '/auction',
    '/mobile-discover': '/',
    '/shares': '/co-investment',
  }

  return `${aliases[pathname] || pathname}${suffix}`
}

export function PublicPageScreen({ initialPath }: PublicPageScreenProps) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const handleNavigate = useCallback(
    async (target: string) => {
      router.push(normalizeLegacyPath(target) as never)
    },
    [router],
  )
  const handleLogout = useCallback(async () => {
    await logout()
    router.replace('/login')
  }, [logout, router])

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      <PublicPage
        initialPath={initialPath}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        nativeUser={
          user
            ? {
                id: String(user.id),
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
              }
            : null
        }
        dom={{
          contentInsetAdjustmentBehavior: 'never',
          style: styles.dom,
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  dom: {
    flex: 1,
    backgroundColor: '#fff',
  },
})
