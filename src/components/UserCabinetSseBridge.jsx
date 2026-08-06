import { useEffect, useRef } from 'react'
import { getApiBaseUrl } from '../utils/apiConfig'
import { CLERK_DB_USER_SYNCED } from '../services/authService'
import {
  PRIVATE_CLUB_KICKED_MODAL_EVENT,
  SUBSCRIPTION_BILLING_UPDATED_EVENT,
} from '../constants/cabinetEvents'

/**
 * Одно SSE-подключение на вкладку для push из админки (без polling):
 * — верификация пользователя → verification-status-update
 * — модерация объявления → owner-properties-update
 * — лайки/ставки по объявлению владельца → owner-property-engagement (без polling)
 * — новое in-app уведомление (напр. тест-драйв) → owner-notifications-refresh
 */
export default function UserCabinetSseBridge() {
  const esRef = useRef(null)
  const reconnectTimerRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const closeEs = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }

    const connect = async () => {
      closeEs()
      if (cancelled) return

      const raw = localStorage.getItem('userId')
      const uid = raw && /^\d+$/.test(String(raw)) ? parseInt(String(raw), 10) : null
      // Достаточно числового id из Clerk→БД; isLoggedIn иногда выставляется позже — иначе SSE не поднимался без F5
      if (!uid || uid <= 0) return

      const base = await getApiBaseUrl()
      if (cancelled) return // проверяем снова после await — cleanup мог сработать пока ждали
      const normalized = base.replace(/\/$/, '')
      const path = `${normalized}/events/user-updates?user_id=${uid}`
      const url = base.startsWith('http') ? path : `${window.location.origin}${path}`

      const es = new EventSource(url)
      esRef.current = es

      es.onopen = () => {
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current)
          reconnectTimerRef.current = null
        }
      }

      es.onmessage = (event) => {
        try {
          if (typeof event.data === 'string' && event.data.startsWith(':')) return
          const data = JSON.parse(event.data)
          if (data.type === 'user_verification') {
            window.dispatchEvent(new Event('verification-status-update'))
            if (data.action === 'approved') {
              window.dispatchEvent(new Event('verification-approved-celebration'))
            }
          }
          if (data.type === 'property_moderation') {
            window.dispatchEvent(new CustomEvent('owner-properties-update', { detail: data }))
          }
          if (data.type === 'property_engagement') {
            window.dispatchEvent(new CustomEvent('owner-property-engagement', { detail: data }))
          }
          if (data.type === 'notifications_refresh') {
            window.dispatchEvent(new CustomEvent('owner-notifications-refresh'))
          }
          if (data.type === 'private_club_removed') {
            window.dispatchEvent(new CustomEvent(SUBSCRIPTION_BILLING_UPDATED_EVENT))
            window.dispatchEvent(new CustomEvent(PRIVATE_CLUB_KICKED_MODAL_EVENT))
          }
        } catch (_) {}
      }

      es.onerror = () => {
        if (cancelled) return
        es.close()
        esRef.current = null
        if (reconnectTimerRef.current) return
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null
          connect()
        }, 4000)
      }
    }

    const startConnect = () => {
      if (!cancelled) void connect()
    }

    const raw = localStorage.getItem('userId')
    const hasDbUser = raw && /^\d+$/.test(String(raw))
    if (!hasDbUser) {
      const onClerkSyncedOnly = () => startConnect()
      window.addEventListener(CLERK_DB_USER_SYNCED, onClerkSyncedOnly)
      return () => {
        cancelled = true
        window.removeEventListener(CLERK_DB_USER_SYNCED, onClerkSyncedOnly)
        closeEs()
      }
    }

    const isHome = window.location.pathname === '/'
    let idleCancel = null
    const interactEvents = ['scroll', 'click', 'keydown', 'touchstart']
    const onInteract = () => startConnect()

    if (isHome) {
      interactEvents.forEach((eventName) => {
        window.addEventListener(eventName, onInteract, { once: true, passive: true })
      })
      if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(startConnect, { timeout: 15000 })
        idleCancel = () => window.cancelIdleCallback(id)
      } else {
        const t = window.setTimeout(startConnect, 8000)
        idleCancel = () => window.clearTimeout(t)
      }
    } else {
      startConnect()
    }

    const onClerkSynced = () => startConnect()
    window.addEventListener(CLERK_DB_USER_SYNCED, onClerkSynced)

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        startConnect()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      idleCancel?.()
      if (isHome) {
        interactEvents.forEach((eventName) => {
          window.removeEventListener(eventName, onInteract)
        })
      }
      window.removeEventListener(CLERK_DB_USER_SYNCED, onClerkSynced)
      document.removeEventListener('visibilitychange', onVisibility)
      closeEs()
    }
  }, [])

  return null
}
