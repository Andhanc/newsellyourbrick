import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import { usePurchaseSuccess } from '../context/PurchaseSuccessContext'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { showNotification } from '../utils/toastHelper'
import {
  confirmPurchaseCheckoutAndBuildSnapshot,
  parsePropertyIdFromPath,
  resolveCheckoutUserId,
  wasPurchaseCheckoutSessionHandled,
} from '../utils/purchaseSuccessFlow'

export default function PurchaseCheckoutSuccessBridge() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, isLoaded: userLoaded } = useUser()
  const { openPurchaseSuccess } = usePurchaseSuccess()
  const { t, i18n } = useTranslation()
  const inFlightRef = useRef(null)

  useEffect(() => {
    const reservationCheckout = searchParams.get('reservation_checkout')
    const shareCheckout = searchParams.get('share_checkout')
    const sessionId = searchParams.get('session_id')

    const isReservationSuccess = reservationCheckout === 'success'
    const isShareSuccess = shareCheckout === 'success'
    if ((!isReservationSuccess && !isShareSuccess) || !sessionId || !sessionId.startsWith('cs_')) {
      return undefined
    }

    if (wasPurchaseCheckoutSessionHandled(sessionId)) {
      const next = new URLSearchParams(searchParams)
      next.delete('reservation_checkout')
      next.delete('share_checkout')
      next.delete('session_id')
      setSearchParams(next, { replace: true })
      return undefined
    }

    if (inFlightRef.current === sessionId) return undefined

    let cancelled = false

    const run = async () => {
      if (!userLoaded) return

      inFlightRef.current = sessionId

      const uid = await resolveCheckoutUserId({ clerkUser: user })
      if (!uid) {
        requestOpenLoginModal({ wizard: true })
        const next = new URLSearchParams(searchParams)
        next.delete('reservation_checkout')
        next.delete('share_checkout')
        next.delete('session_id')
        setSearchParams(next, { replace: true })
        if (inFlightRef.current === sessionId) inFlightRef.current = null
        return
      }

      const fallbackPropertyId = parsePropertyIdFromPath(window.location.pathname)
      const kind = isShareSuccess ? 'share' : 'reservation'

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

        if (!result.ok) {
          showNotification(result.error || t('purchaseSuccess_confirmError', 'Не удалось подтвердить покупку'), 'error')
          return
        }

        if (result.already) {
          showNotification(
            kind === 'share'
              ? t('shareDetailPurchaseSuccess', 'Покупка долей подтверждена')
              : t('purchaseSuccess_alreadyRecorded', 'Резерв уже был учтён ранее'),
          )
        }

        openPurchaseSuccess(result.snapshot)
      } catch (e) {
        if (!cancelled) {
          showNotification(e?.message || t('purchaseSuccess_confirmError', 'Не удалось подтвердить покупку'), 'error')
          const next = new URLSearchParams(searchParams)
          next.delete('reservation_checkout')
          next.delete('share_checkout')
          next.delete('session_id')
          setSearchParams(next, { replace: true })
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

  return null
}
