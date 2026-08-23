import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiX } from 'react-icons/fi'
import { RiVipDiamondLine } from 'react-icons/ri'
import { getUserData } from '../services/authService'
import { startVipSubscriptionCheckout } from '../utils/subscriptionCheckout'
import { showNotification } from '../utils/toastHelper'
import { SUBSCRIPTION_BILLING_UPDATED_EVENT } from '../constants/cabinetEvents'
import { userHasVipAccess } from '../hooks/useCabinetOverviewData'
import { sheetHandleDragProps, useBottomSheetDrag } from '../hooks/useBottomSheetDrag'
import { useDrawerDismiss } from '../hooks/useDrawerDismiss'
import './PrivateClubVipGate.css'

const API_BASE = import.meta.env?.VITE_API_BASE_URL || '/api'
const MOBILE_MAX = 767
const PROMO_LENGTH = 4
const EMPTY_PROMO = () => Array.from({ length: PROMO_LENGTH }, () => '')

function normalizePromoChunk(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function formatVipUntilDate(iso, language) {
  if (!iso) return ''
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return ''
  try {
    return date.toLocaleDateString(language || 'ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  }
}

export default function PrivateClubVipGate({ open, onClose, userId, onPrivateClubActivated }) {
  const { t, i18n } = useTranslation()
  const { visible, isClosing, requestClose } = useDrawerDismiss(open, onClose)
  const sheetDrag = useBottomSheetDrag({
    isOpen: open,
    visible,
    isClosing,
    requestClose,
    dismissOnly: true,
  })
  const [promoDigits, setPromoDigits] = useState(EMPTY_PROMO)
  const [submitting, setSubmitting] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [vipActive, setVipActive] = useState(false)
  const [vipUntil, setVipUntil] = useState(null)
  const inputRefs = useRef([])
  const bodyScrollRef = useRef(null)
  const lastAutoSubmitRef = useRef('')
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

  const loadVipState = useCallback(async () => {
    const uid = userId ?? getUserData()?.id ?? localStorage.getItem('userId')
    if (!uid) {
      setVipActive(false)
      setVipUntil(null)
      return
    }
    try {
      const res = await fetch(`${API_BASE}/users/${uid}/subscription-billing`)
      const json = res.ok ? await res.json().catch(() => null) : null
      const data = json?.success && json?.data ? json.data : null
      setVipActive(
        userHasVipAccess({
          subscription: data?.subscription ?? null,
          vipClub: data?.vipClub,
        }),
      )
      setVipUntil(data?.vipClub?.until || data?.subscription?.current_period_end || null)
    } catch {
      setVipActive(false)
      setVipUntil(null)
    }
  }, [userId])

  useEffect(() => {
    if (!open) return undefined
    void loadVipState()
    window.addEventListener(SUBSCRIPTION_BILLING_UPDATED_EVENT, loadVipState)
    return () => window.removeEventListener(SUBSCRIPTION_BILLING_UPDATED_EVENT, loadVipState)
  }, [open, loadVipState])

  useEffect(() => {
    if (!open) {
      setPromoDigits(EMPTY_PROMO())
      setSubmitting(false)
      setCheckoutLoading(false)
      lastAutoSubmitRef.current = ''
      return
    }
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const resetBodyScroll = () => {
      if (bodyScrollRef.current) bodyScrollRef.current.scrollTop = 0
    }
    resetBodyScroll()
    const scrollResetRaf = window.requestAnimationFrame(resetBodyScroll)
    const scrollResetTimer = window.setTimeout(resetBodyScroll, 340)

    // На мобиле и при уже активном VIP не фокусируем промокод.
    const focusTimer = isMobile || vipActive
      ? null
      : window.setTimeout(() => {
          inputRefs.current[0]?.focus?.()
        }, 280)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      window.cancelAnimationFrame(scrollResetRaf)
      window.clearTimeout(scrollResetTimer)
      if (focusTimer != null) window.clearTimeout(focusTimer)
    }
  }, [open, requestClose, isMobile, vipActive])

  const clearPromo = useCallback(() => {
    setPromoDigits(EMPTY_PROMO())
    lastAutoSubmitRef.current = ''
    window.setTimeout(() => inputRefs.current[0]?.focus?.(), 40)
  }, [])

  const redeemPromo = useCallback(
    async (code) => {
      const normalized = normalizePromoChunk(code).slice(0, PROMO_LENGTH)
      const uid = userId ?? getUserData()?.id ?? localStorage.getItem('userId')
      if (!uid) {
        showNotification(t('privateClubVipGateNeedLogin'), 'error')
        return
      }
      if (normalized.length < PROMO_LENGTH) {
        showNotification(t('privateClubVipPromoEmpty'), 'error')
        return
      }
      if (submitting) return
      setSubmitting(true)
      try {
        const res = await fetch(`${API_BASE}/users/${uid}/private-club/redeem-promo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: normalized }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.success) {
          const err =
            json.error === 'invalid_promo'
              ? t('privateClubVipPromoInvalid')
              : json.error || t('privateClubVipPromoError')
          showNotification(err, 'error')
          clearPromo()
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
          requestClose()
        }
      } catch {
        showNotification(t('privateClubVipPromoError'), 'error')
        clearPromo()
      } finally {
        setSubmitting(false)
      }
    },
    [userId, t, requestClose, onPrivateClubActivated, submitting, clearPromo]
  )

  const applyPromoChunk = useCallback((chunk, startIndex = 0) => {
    const cleaned = normalizePromoChunk(chunk)
    if (!cleaned) return ''
    let assembled = ''
    setPromoDigits((prev) => {
      const next = [...prev]
      for (let i = 0; i < cleaned.length && startIndex + i < PROMO_LENGTH; i += 1) {
        next[startIndex + i] = cleaned[i]
      }
      assembled = next.join('')
      return next
    })
    const focusAt = Math.min(startIndex + cleaned.length, PROMO_LENGTH) - 1
    window.setTimeout(() => inputRefs.current[Math.max(0, focusAt)]?.focus?.(), 0)
    return cleaned
  }, [])

  const onVipCheckout = useCallback(async () => {
    const uid = userId ?? getUserData()?.id ?? localStorage.getItem('userId')
    if (!uid) {
      showNotification(t('privateClubVipGateNeedLogin'), 'error')
      return
    }
    setCheckoutLoading(true)
    try {
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
    } finally {
      setCheckoutLoading(false)
    }
  }, [userId, t])

  const handleCodeChange = useCallback(
    (index, value) => {
      const cleaned = normalizePromoChunk(value)
      if (!cleaned) {
        setPromoDigits((prev) => {
          const next = [...prev]
          next[index] = ''
          return next
        })
        return
      }
      if (cleaned.length > 1) {
        applyPromoChunk(cleaned, index)
        return
      }
      setPromoDigits((prev) => {
        const next = [...prev]
        next[index] = cleaned
        return next
      })
      if (index < PROMO_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus?.()
      }
    },
    [applyPromoChunk]
  )

  const handleCodeKeyDown = useCallback(
    (index, event) => {
      if (event.key === 'Backspace' && !promoDigits[index] && index > 0) {
        event.preventDefault()
        setPromoDigits((prev) => {
          const next = [...prev]
          next[index - 1] = ''
          return next
        })
        inputRefs.current[index - 1]?.focus?.()
        return
      }
      if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault()
        inputRefs.current[index - 1]?.focus?.()
      }
      if (event.key === 'ArrowRight' && index < PROMO_LENGTH - 1) {
        event.preventDefault()
        inputRefs.current[index + 1]?.focus?.()
      }
    },
    [promoDigits]
  )

  const handleCodePaste = useCallback(
    (event) => {
      event.preventDefault()
      applyPromoChunk(event.clipboardData?.getData('text') || '', 0)
    },
    [applyPromoChunk]
  )

  const onPromoSubmit = useCallback(
    (event) => {
      event?.preventDefault?.()
      void redeemPromo(promoDigits.join(''))
    },
    [promoDigits, redeemPromo]
  )

  useEffect(() => {
    if (!open || submitting || vipActive) return
    const code = promoDigits.join('')
    if (code.length !== PROMO_LENGTH || promoDigits.some((digit) => !digit)) return
    if (lastAutoSubmitRef.current === code) return
    lastAutoSubmitRef.current = code
    const timer = window.setTimeout(() => {
      void redeemPromo(code)
    }, 160)
    return () => window.clearTimeout(timer)
  }, [promoDigits, open, submitting, redeemPromo, vipActive])

  if (!visible || typeof document === 'undefined') return null

  const shellClass = isMobile ? 'private-club-vip private-club-vip--drawer' : 'private-club-vip private-club-vip--modal'
  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''
  const closingShell = isClosing
    ? isMobile
      ? ' drawer-dismiss-from-bottom--closing'
      : ' drawer-dismiss-modal--closing'
    : ''
  const promoComplete = promoDigits.every(Boolean)
  const vipUntilLabel = formatVipUntilDate(vipUntil, i18n.resolvedLanguage || i18n.language)
  const vipUntilHint = vipUntilLabel
    ? t('privateClubVipGateActiveUntil', { date: vipUntilLabel })
    : t('privateClubVipGateActiveHint')

  return createPortal(
    <div className="private-club-vip-root" role="presentation">
      <button
        type="button"
        className={`private-club-vip__backdrop${closingBackdrop}`}
        aria-label={t('close')}
        onClick={() => requestClose()}
      />
      <div
        ref={sheetDrag.panelRef}
        className={`${shellClass}${closingShell}`}
        style={sheetDrag.panelDragStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="private-club-vip-title"
      >
        <div
          className="private-club-vip__handle"
          aria-hidden={!isMobile}
          {...sheetHandleDragProps(sheetDrag)}
        />
        <button type="button" className="private-club-vip__close" onClick={() => requestClose()} aria-label={t('close')}>
          <FiX size={20} />
        </button>

        <div className="private-club-vip__body" ref={bodyScrollRef}>
        <div className="private-club-vip__header">
          <span className="private-club-vip__eyebrow" aria-hidden>
            <RiVipDiamondLine size={15} />
            VIP
          </span>
          <h2 id="private-club-vip-title" className="private-club-vip__title">
            {vipActive ? t('privateClubVipGateActiveTitle') : t('privateClubVipGateTitle')}
          </h2>
          <p className="private-club-vip__lead">
            {vipActive ? t('privateClubVipGateActiveLead') : t('privateClubVipGateLead')}
          </p>
        </div>

        <div className={`private-club-vip__paths${vipActive ? ' private-club-vip__paths--single' : ''}`}>
          <section
            className={`private-club-vip__ticket private-club-vip__ticket--subscribe${
              vipActive ? ' private-club-vip__ticket--active' : ''
            }`}
            aria-labelledby="private-club-vip-sub-label"
          >
            <div className="private-club-vip__ticket-body">
              <div className="private-club-vip__panel-head">
                <p className="private-club-vip__kicker">
                  {vipActive ? t('privateClubVipGateActiveKicker') : t('privateClubVipGateSubscribeKicker')}
                </p>
                <p id="private-club-vip-sub-label" className="private-club-vip__label">
                  {vipActive ? t('privateClubVipGateSubscribeActive') : t('privateClubVipGateSubscribe')}
                </p>
                <p className="private-club-vip__panel-note">
                  {vipActive ? t('privateClubVipGateSubscribeActiveNote') : t('privateClubVipGateSubscribeNote')}
                </p>
              </div>
              <div className="private-club-vip__ticket-perf" aria-hidden />
              {vipActive ? (
                <>
                  <p className="private-club-vip__status" role="status">
                    {t('privateClubVipGateActiveBadge')}
                  </p>
                  <p className="private-club-vip__hint">{vipUntilHint}</p>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="private-club-vip__btn private-club-vip__btn--primary btn-tiffany-shine"
                    onClick={onVipCheckout}
                    disabled={checkoutLoading || submitting}
                  >
                    {checkoutLoading ? t('privateClubVipGatePromoSubmitting') : t('privateClubVipGateCtaVip')}
                  </button>
                  <p className="private-club-vip__hint">{t('privateClubVipGateStripeHint')}</p>
                </>
              )}
            </div>
          </section>

          {!vipActive && (
            <>
              <div className="private-club-vip__divider" role="separator" aria-label={t('privateClubVipGateOr')}>
                <span>{t('privateClubVipGateOr')}</span>
              </div>

              <form
                className="private-club-vip__ticket private-club-vip__ticket--promo"
                onSubmit={onPromoSubmit}
              >
                <div className="private-club-vip__ticket-body">
                  <div className="private-club-vip__panel-head">
                    <p className="private-club-vip__kicker">{t('privateClubVipGatePromoKicker')}</p>
                    <label className="private-club-vip__label" id="private-club-promo-label" htmlFor="private-club-promo-first">
                      {t('privateClubVipGatePromoLabel')}
                    </label>
                    <p className="private-club-vip__panel-note">{t('privateClubVipGatePromoPlaceholder')}</p>
                  </div>
                  <div
                    className="private-club-vip__code-row"
                    role="group"
                    aria-labelledby="private-club-promo-label"
                    onPaste={handleCodePaste}
                  >
                    {promoDigits.map((digit, index) => (
                      <input
                        key={index}
                        id={index === 0 ? 'private-club-promo-first' : undefined}
                        ref={(el) => {
                          inputRefs.current[index] = el
                        }}
                        type="text"
                        inputMode="text"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        maxLength={1}
                        className={`private-club-vip__code-cell${digit ? ' is-filled' : ''}`}
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleCodeKeyDown(index, e)}
                        aria-label={t('privateClubVipGatePromoDigit', { n: index + 1 })}
                        disabled={submitting}
                      />
                    ))}
                  </div>
                  <div className="private-club-vip__promo-foot">
                    <p className="private-club-vip__promo-hint">{t('privateClubVipGatePromoHint')}</p>
                    <button
                      type="submit"
                      className={`private-club-vip__btn private-club-vip__btn--secondary${promoComplete ? ' btn-tiffany-shine' : ''}`}
                      disabled={submitting || !promoComplete}
                    >
                      {submitting ? t('privateClubVipGatePromoSubmitting') : t('privateClubVipGatePromoSubmit')}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
