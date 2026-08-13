import { useEffect, type ReactNode } from 'react'
import * as Notifications from 'expo-notifications'
import { useRouter } from 'expo-router'

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
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const path = notificationPath(response.notification)
      if (path) router.push(path as never)
    })
    return () => subscription.remove()
  }, [router])

  useEffect(() => {
    if (loading) return
    if (!user?.id) {
      void unregisterStoredPushNotifications()
      return
    }
    void registerPushNotifications(user.id).catch((error) => {
      console.warn('[push] registration failed:', error instanceof Error ? error.message : error)
    })
  }, [loading, user?.id])

  return children
}
