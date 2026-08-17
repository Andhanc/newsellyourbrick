import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import { apiFetch } from '../api/client'
import { secureStorage, storage } from '../platform/storage'

const PUSH_TOKEN_KEY = 'expoPushToken'
const PUSH_USER_KEY = 'expoPushUserId'
const PUSH_DEVICE_KEY = 'pushDeviceId'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

async function getDeviceId() {
  const existing = await storage.getItem(PUSH_DEVICE_KEY)
  if (existing) return existing
  const next = `install-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  await storage.setItem(PUSH_DEVICE_KEY, next)
  return next
}

async function ensureAndroidChannels() {
  if (Platform.OS !== 'android') return
  const common = {
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: '#00A6A6',
    sound: 'default' as const,
  }
  await Notifications.setNotificationChannelAsync('transactions', {
    name: 'Покупки и операции',
    description: 'Покупки, пополнения и вывод средств',
    ...common,
  })
  await Notifications.setNotificationChannelAsync('auctions', {
    name: 'Аукционы',
    description: 'Ставки и результаты аукционов',
    ...common,
  })
}

async function ensureNotificationsPermission() {
  const current = await Notifications.getPermissionsAsync()
  const permission =
    current.status === 'granted' ? current : await Notifications.requestPermissionsAsync()
  return permission.status === 'granted'
}

export async function scheduleFirstFavoriteNotification(body: string) {
  if (Platform.OS === 'web') return false
  const localizedBody = String(body || '').trim()
  if (!localizedBody) return false

  await ensureAndroidChannels()
  if (!(await ensureNotificationsPermission())) return false

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'SellYourBrick',
      body: localizedBody,
      sound: 'default',
      data: {
        path: '/auction',
        type: 'first_favorite_recommendation',
      },
    },
    trigger: Platform.OS === 'android' ? { channelId: 'auctions' } : null,
  })
  return true
}

export async function registerPushNotifications(userId: number | string) {
  if (Platform.OS === 'web') return null

  await ensureAndroidChannels()
  if (!(await ensureNotificationsPermission())) return null

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  if (!projectId) throw new Error('Expo EAS projectId is missing')

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data
  const deviceId = await getDeviceId()
  const authToken = await secureStorage.getItem('authToken')
  if (!authToken) throw new Error('Mobile auth token is missing')
  await apiFetch('/push-tokens', {
    method: 'POST',
    token: authToken,
    body: JSON.stringify({ token, platform: Platform.OS, deviceId }),
  })
  await storage.setItem(PUSH_TOKEN_KEY, token)
  await storage.setItem(PUSH_USER_KEY, String(userId))
  return token
}

export async function unregisterStoredPushNotifications(explicitAuthToken?: string | null) {
  if (Platform.OS === 'web') return
  const [token, userId] = await Promise.all([
    storage.getItem(PUSH_TOKEN_KEY),
    storage.getItem(PUSH_USER_KEY),
  ])
  if (token && userId) {
    const authToken = explicitAuthToken ?? (await secureStorage.getItem('authToken'))
    await apiFetch('/push-tokens', {
      method: 'DELETE',
      token: authToken,
      body: JSON.stringify({ token }),
    }).catch(() => undefined)
  }
  await storage.removeItem(PUSH_TOKEN_KEY)
  await storage.removeItem(PUSH_USER_KEY)
}

export function notificationPath(notification: Notifications.Notification) {
  const path = notification.request.content.data?.path
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return null
  if (/^\/(property\/[^/]+|profile|wallet|auction)(\/.*)?$/.test(path)) return path
  return null
}
