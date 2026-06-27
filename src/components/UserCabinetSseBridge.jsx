import { useEffect, useRef } from 'react'
import { getApiBaseUrl } from '../utils/apiConfig'
import { CLERK_DB_USER_SYNCED } from '../services/authService'
import { showNotification } from '../utils/toastHelper'
import i18n from '../i18n/config'
import {
  PRIVATE_CLUB_KICKED_MODAL_EVENT,
  SUBSCRIPTION_BILLING_UPDATED_EVENT,
} from '../hooks/useCabinetOverviewData'

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
              showNotification(i18n.t('verificationApprovedLiveToast'), 'success', 6000)
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

    connect()

    const onClerkSynced = () => connect()
    window.addEventListener(CLERK_DB_USER_SYNCED, onClerkSynced)

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        connect()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      window.removeEventListener(CLERK_DB_USER_SYNCED, onClerkSynced)
      document.removeEventListener('visibilitychange', onVisibility)
      closeEs()
    }
  }, [])

  return null
}
