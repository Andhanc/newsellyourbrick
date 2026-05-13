import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiX } from 'react-icons/fi'
import { getUserData } from '../services/authService'
import { startVipSubscriptionCheckout } from '../utils/subscriptionCheckout'
import { showNotification } from '../utils/toastHelper'
import { SUBSCRIPTION_BILLING_UPDATED_EVENT } from '../hooks/useCabinetOverviewData'
import './PrivateClubVipGate.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const MOBILE_MAX = 767

export default function PrivateClubVipGate({ open, onClose, userId, onPrivateClubActivated }) {
  const { t } = useTranslation()
  const [promo, setPromo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches
  )

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`)
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!open) {
      setPromo('')
      setSubmitting(false)
      return
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const onVipCheckout = useCallback(async () => {
    const uid = userId ?? getUserData()?.id ?? localStorage.getItem('userId')
    if (!uid) {
      showNotification(t('privateClubVipGateNeedLogin'), 'error')
      return
    }
    const userData = getUserData()
    const result = await startVipSubscriptionCheckout({
      userId: uid,
      customerEmail: userData?.email,
      billingCycle: 'monthly',
    })
    if (!result.ok) {
      const msg =
        result.error === 'already_subscribed_vip'
          ? t('privateClubVipAlready')
          : result.error === 'already_subscribed_pro'
            ? t('buyerCabinet_toastDuplicateSubscription')
            : result.error || t('buyerCabinet_checkoutError')
      showNotification(msg, result.error === 'already_subscribed_vip' ? 'info' : 'error')
    }
  }, [userId, t])

  const onPromoSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.()
      const uid = userId ?? getUserData()?.id ?? localStorage.getItem('userId')
      if (!uid) {
        showNotification(t('privateClubVipGateNeedLogin'), 'error')
        return
      }
      const code = promo.trim()
      if (!code) {
        showNotification(t('privateClubVipPromoEmpty'), 'error')
        return
      }
      setSubmitting(true)
      try {
        const res = await fetch(`${API_BASE}/users/${uid}/private-club/redeem-promo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.success) {
          const err = json.error === 'invalid_promo' ? t('privateClubVipPromoInvalid') : json.error || t('privateClubVipPromoError')
          showNotification(err, 'error')
          return
        }
        try {
          window.dispatchEvent(new CustomEvent(SUBSCRIPTION_BILLING_UPDATED_EVENT))
        } catch {
          /* ignore */
        }
        if (typeof onPrivateClubActivated === 'function') {
          onPrivateClubActivated()
        } else {
          showNotification(t('privateClubVipPromoSuccess'), 'success')
          onClose?.()
        }
      } catch {
        showNotification(t('privateClubVipPromoError'), 'error')
      } finally {
        setSubmitting(false)
      }
    },
    [userId, promo, t, onClose, onPrivateClubActivated]
  )

  if (!open || typeof document === 'undefined') return null

  const shellClass = isMobile ? 'private-club-vip private-club-vip--drawer' : 'private-club-vip private-club-vip--modal'

  return createPortal(
    <div className="private-club-vip-root" role="presentation">
      <button type="button" className="private-club-vip__backdrop" aria-label={t('close')} onClick={onClose} />
      <div className={shellClass} role="dialog" aria-modal="true" aria-labelledby="private-club-vip-title">
        <div className="private-club-vip__handle" aria-hidden={!isMobile} />
        <button type="button" className="private-club-vip__close" onClick={onClose} aria-label={t('close')}>
          <FiX size={22} />
        </button>
        <h2 id="private-club-vip-title" className="private-club-vip__title">
          {t('privateClubVipGateTitle')}
        </h2>
        <p className="private-club-vip__lead">{t('privateClubVipGateLead')}</p>

        <div className="private-club-vip__block">
          <p className="private-club-vip__label">{t('privateClubVipGateSubscribe')}</p>
          <button type="button" className="private-club-vip__btn private-club-vip__btn--primary" onClick={onVipCheckout}>
            {t('privateClubVipGateCtaVip')}
          </button>
          <p className="private-club-vip__hint">{t('privateClubVipGateStripeHint')}</p>
        </div>

        <div className="private-club-vip__divider">
          <span>{t('privateClubVipGateOr')}</span>
        </div>

        <form className="private-club-vip__block" onSubmit={onPromoSubmit}>
          <label className="private-club-vip__label" htmlFor="private-club-promo-input">
            {t('privateClubVipGatePromoLabel')}
          </label>
          <input
            id="private-club-promo-input"
            className="private-club-vip__input"
            value={promo}
            onChange={(e) => setPromo(e.target.value)}
            placeholder={t('privateClubVipGatePromoPlaceholder')}
            autoComplete="off"
            maxLength={64}
          />
          <button
            type="submit"
            className="private-club-vip__btn private-club-vip__btn--secondary"
            disabled={submitting}
          >
            {submitting ? t('privateClubVipGatePromoSubmitting') : t('privateClubVipGatePromoSubmit')}
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}
