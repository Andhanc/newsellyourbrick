import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import { usePurchaseSuccess } from '../context/PurchaseSuccessContext'
import { CLERK_DB_USER_SYNCED, getStoredNumericUserId } from '../services/authService'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { showNotification } from '../utils/toastHelper'
import {
  clearPendingPurchaseCheckoutSession,
  confirmPurchaseCheckoutAndBuildSnapshot,
  parsePropertyIdFromPath,
  readPendingPurchaseCheckoutSession,
  resolveCheckoutUserId,
  storePendingPurchaseCheckoutSession,
  wasPurchaseCheckoutSessionHandled,
} from '../utils/purchaseSuccessFlow'

function readCheckoutParams(searchParams) {
  const reservationCheckout = searchParams.get('reservation_checkout')
  const shareCheckout = searchParams.get('share_checkout')
  const sessionId = searchParams.get('session_id')
  const isReservationSuccess = reservationCheckout === 'success'
  const isShareSuccess = shareCheckout === 'success'
  if ((!isReservationSuccess && !isShareSuccess) || !sessionId || !sessionId.startsWith('cs_')) {
    return null
  }
  return {
    sessionId,
    kind: isShareSuccess ? 'share' : 'reservation',
  }
}

export default function PurchaseCheckoutSuccessBridge() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, isLoaded: userLoaded } = useUser()
  const { openPurchaseSuccess } = usePurchaseSuccess()
  const { t, i18n } = useTranslation()
  const inFlightRef = useRef(null)

  useEffect(() => {
    const params = readCheckoutParams(searchParams)
    const pending = params ? null : readPendingPurchaseCheckoutSession()
    const checkout = params || (pending?.sessionId ? pending : null)
    if (!checkout?.sessionId) return undefined

    const { sessionId, kind } = checkout

    if (wasPurchaseCheckoutSessionHandled(sessionId)) {
      const next = new URLSearchParams(searchParams)
      next.delete('reservation_checkout')
      next.delete('share_checkout')
      next.delete('session_id')
      setSearchParams(next, { replace: true })
      clearPendingPurchaseCheckoutSession()
      return undefined
    }

    if (inFlightRef.current === sessionId) return undefined

    let cancelled = false

    const run = async () => {
      const hasLocalUserId = Boolean(getStoredNumericUserId())
      if (!userLoaded && !hasLocalUserId) return

      inFlightRef.current = sessionId

      const uid = await resolveCheckoutUserId({ clerkUser: user })
      if (!uid) {
        storePendingPurchaseCheckoutSession({ sessionId, kind })
        requestOpenLoginModal({ wizard: true })
        showNotification(
          t(
            'purchaseSuccess_loginRequired',
            'Войдите в аккаунт, чтобы завершить оформление покупки',
          ),
          'error',
        )
        if (inFlightRef.current === sessionId) inFlightRef.current = null
        return
      }

      const fallbackPropertyId = parsePropertyIdFromPath(window.location.pathname)

      try {
        const result = await confirmPurchaseCheckoutAndBuildSnapshot({
          kind,
          sessionId,
          userId: uid,
          fallbackPropertyId,
          lang: i18n.language || 'ru',
        })

        if (cancelled) return

        const next = new URLSearchParams(searchParams)
        next.delete('reservation_checkout')
        next.delete('share_checkout')
        next.delete('session_id')
        setSearchParams(next, { replace: true })
        clearPendingPurchaseCheckoutSession()

        if (!result.ok) {
          showNotification(
            result.error || t('purchaseSuccess_confirmError', 'Не удалось подтвердить покупку'),
            'error',
          )
          return
        }

        if (result.already) {
          showNotification(
            kind === 'share'
              ? t('shareDetailPurchaseSuccess', 'Покупка долей подтверждена')
              : t('purchaseSuccess_alreadyRecorded', 'Резерв уже был учтён ранее'),
          )
        }

        openPurchaseSuccess({ ...result.snapshot, purchaseKind: kind })
      } catch (e) {
        if (!cancelled) {
          showNotification(
            e?.message || t('purchaseSuccess_confirmError', 'Не удалось подтвердить покупку'),
            'error',
          )
        }
      } finally {
        if (inFlightRef.current === sessionId) {
          inFlightRef.current = null
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [
    i18n.language,
    openPurchaseSuccess,
    searchParams,
    setSearchParams,
    t,
    user,
    userLoaded,
  ])

  useEffect(() => {
    const onUserSynced = () => {
      const pending = readPendingPurchaseCheckoutSession()
      if (!pending?.sessionId) return
      if (wasPurchaseCheckoutSessionHandled(pending.sessionId)) {
        clearPendingPurchaseCheckoutSession()
        return
      }
      const next = new URLSearchParams(searchParams)
      if (pending.kind === 'share') {
        next.set('share_checkout', 'success')
      } else {
        next.set('reservation_checkout', 'success')
      }
      next.set('session_id', pending.sessionId)
      setSearchParams(next, { replace: true })
    }

    window.addEventListener(CLERK_DB_USER_SYNCED, onUserSynced)
    return () => window.removeEventListener(CLERK_DB_USER_SYNCED, onUserSynced)
  }, [searchParams, setSearchParams])

  return null
}
