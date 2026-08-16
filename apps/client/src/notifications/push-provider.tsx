import { useEffect, type ReactNode } from 'react'
import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'
import { AppState, Platform } from 'react-native'

import { useAuth } from '../auth/session'
import {
  notificationPath,
  registerPushNotifications,
  unregisterStoredPushNotifications,
} from './push'

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (Platform.OS === 'web') return undefined

    const openNotificationPath = (response: Notifications.NotificationResponse | null) => {
      if (!response) return
      const path = notificationPath(response.notification)
      if (path) router.push(path as never)
    }

    const clearLastResponseSafely = () => {
      try {
        Notifications.clearLastNotificationResponse()
      } catch (error) {
        console.warn(
          '[push] could not clear last notification response:',
          error instanceof Error ? error.message : String(error || ''),
        )
      }
    }

    try {
      openNotificationPath(Notifications.getLastNotificationResponse())
      clearLastResponseSafely()
    } catch (error) {
      console.warn(
        '[push] could not read launch notification:',
        error instanceof Error ? error.message : String(error || ''),
      )
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotificationPath(response)
      clearLastResponseSafely()
    })
    return () => subscription.remove()
  }, [router])

  useEffect(() => {
    if (loading) return undefined
    if (!user?.id) {
      void unregisterStoredPushNotifications()
      return undefined
    }

    let active = true
    const register = async () => {
      try {
        await registerPushNotifications(user.id)
      } catch (error) {
        if (!active) return
        const message = error instanceof Error ? error.message : String(error || '')
        if (message !== 'Mobile auth token is missing') {
          console.warn('[push] registration failed:', message)
        }
      }
    }

    void register()
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      // Expo token acquisition is network-dependent. Re-registering when the app
      // returns to the foreground recovers from an offline/temporary failure and
      // refreshes a changed installation token without requiring a new login.
      if (state === 'active') void register()
    })

    return () => {
      active = false
      appStateSubscription.remove()
    }
  }, [loading, user?.id])

  return children
}
