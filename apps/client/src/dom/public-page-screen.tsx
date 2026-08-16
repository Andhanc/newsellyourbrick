import { useCallback } from 'react'
import { StatusBar } from 'expo-status-bar'
import { useClerk } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { ActivityIndicator, StyleSheet, Vibration, View } from 'react-native'

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
  const { user, loading, logout, adoptSession } = useAuth()
  const { signOut: clerkSignOut } = useClerk()
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
  const handleSwitchSession = useCallback(
    async (input: {
      user: { id: string; name?: string; email?: string; phone?: string; role?: string }
      authToken?: string | null
      path: string
    }) => {
      try {
        await clerkSignOut().catch(() => undefined)
        await adoptSession(input.user, input.authToken)
        router.replace(normalizeLegacyPath(input.path) as never)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Не удалось переключить кабинет',
        }
      }
    },
    [adoptSession, clerkSignOut, router],
  )
  const handleProfileSavedVibration = useCallback(async () => {
    // Nearly two seconds of distinct pulses are easier to notice than one short haptic.
    Vibration.cancel()
    Vibration.vibrate([0, 350, 120, 350, 120, 450, 120, 450], false)
  }, [])

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <StatusBar hidden />
        <ActivityIndicator color="#32b9b2" />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      <PublicPage
        initialPath={initialPath}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onSwitchSession={handleSwitchSession}
        onProfileSavedVibration={handleProfileSavedVibration}
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
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
