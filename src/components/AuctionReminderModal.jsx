import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import { Bell, X } from 'lucide-react'
import { isAuthenticated } from '../services/authService'
import { getApiBaseUrl } from '../utils/apiConfig'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import { showNotification } from '../utils/toastHelper'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import {
  firstScheduledSlot,
  getAuctionReminderWheelBounds,
} from '../utils/auctionReminderBounds'
import { AuctionReminderWheelPicker } from './ui/auction-reminder-wheel-picker'
import './AuctionReminderModal.css'

function getDbUserId() {
  const id = typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null
  if (id && /^\d+$/.test(String(id))) return String(id)
  return null
}

function maskEmail(email) {
  const e = String(email || '').trim()
  if (!e || !e.includes('@')) return e || '—'
  const [local, domain] = e.split('@')
  if (!domain) return '***'
  if (local.length <= 1) return `*@${domain}`
  return `${local[0]}***@${domain}`
}

function isValidSelection(date, bounds) {
  const ms = date.getTime()
  if (ms < bounds.minMs) return false
  if (bounds.compareMode === 'before_start') return ms < bounds.maxMs
  return ms <= bounds.maxMs
}

/**
 * @param {{ property: object | null, open: boolean, onClose: () => void }} props
 */
export default function AuctionReminderModal({ property, open, onClose }) {
  const { t } = useTranslation()
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
  const [step, setStep] = useState(1)
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifyWa, setNotifyWa] = useState(false)
  const [scheduledAt, setScheduledAt] = useState(() => new Date())
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [delivery, setDelivery] = useState({
    loaded: false,
    hasEmail: false,
    hasPhone: false,
    email: '',
    phone: '',
  })

  const bounds = useMemo(() => {
    if (!property) return null
    return getAuctionReminderWheelBounds(property)
  }, [property])

  const badRangeMessage = useMemo(() => {
    if (!property || bounds?.ok) return null
    const r = bounds?.badReason
    if (r === 'auction_started') return t('auctionReminderBadRangeStarted')
    if (r === 'starts_too_soon') return t('auctionReminderBadRangeTooSoon')
    if (r === 'auction_ended') return t('auctionReminderBadRangeEnded')
    return t('auctionReminderBadRange')
  }, [property, bounds, t])

  useEffect(() => {
    if (!open || !property || !bounds?.ok) return
    setStep(1)
    setNotifyEmail(true)
    setNotifyWa(false)
    setScheduledAt(firstScheduledSlot(bounds))
  }, [open, property, bounds])

  useEffect(() => {
    if (!open || !property) return
    setDelivery({ loaded: false, hasEmail: false, hasPhone: false, email: '', phone: '' })
    const uid = getDbUserId()
    if (!uid) {
      setDelivery({ loaded: true, hasEmail: false, hasPhone: false, email: '', phone: '' })
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const base = await getApiBaseUrl()
        const r = await fetch(`${base}/users/${uid}`)
        const json = await r.json().catch(() => ({}))
        if (cancelled) return
        const em = (json.data?.email && String(json.data.email).trim()) || ''
        const ph = (json.data?.phone_number && String(json.data.phone_number).trim()) || ''
        setDelivery({
          loaded: true,
          hasEmail: Boolean(em),
          hasPhone: Boolean(ph),
          email: em,
          phone: ph,
        })
      } catch {
        if (!cancelled) {
          setDelivery({ loaded: true, hasEmail: false, hasPhone: false, email: '', phone: '' })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, property])

  useEffect(() => {
    if (!delivery.loaded) return
    if (!delivery.hasEmail) setNotifyEmail(false)
    if (!delivery.hasPhone) setNotifyWa(false)
  }, [delivery.loaded, delivery.hasEmail, delivery.hasPhone])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const goNext = useCallback(() => {
    if (!notifyEmail && !notifyWa) {
      showNotification(t('auctionReminderSelectChannel'))
      return
    }
    if (!bounds?.ok) {
      showNotification(badRangeMessage || t('auctionReminderBadRange'))
      return
    }
    const uid = getDbUserId()
    if (!uid) {
      showNotification(t('auctionReminderProfileSync'))
      return
    }
    if (notifyEmail && delivery.loaded && !delivery.hasEmail) {
      showNotification(t('auctionReminderNeedEmailInProfile'))
      return
    }
    if (notifyWa && delivery.loaded && !delivery.hasPhone) {
      showNotification(t('auctionReminderNeedPhoneInProfile'))
      return
    }
    setStep(2)
  }, [notifyEmail, notifyWa, bounds, badRangeMessage, t, delivery])

  const sendTestEmail = useCallback(async () => {
    if (!property || !hasDbBackedProperty(property)) return
    const uid = getDbUserId()
    if (!uid) {
      showNotification(t('auctionReminderProfileSync'))
      return
    }
    if (!delivery.hasEmail) {
      showNotification(t('auctionReminderNeedEmailInProfile'))
      return
    }
    setTesting(true)
    try {
      const base = await getApiBaseUrl()
      const res = await fetch(`${base}/users/${uid}/auction-reminders/send-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: property.id,
          property_table: property.source_table,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.success === false) {
        showNotification(json.error || t('auctionReminderTestError'))
        return
      }
      showNotification(t('auctionReminderTestSent'))
    } catch {
      showNotification(t('auctionReminderTestError'))
    } finally {
      setTesting(false)
    }
  }, [property, delivery.hasEmail, t])

  const save = useCallback(async () => {
    if (!property || !bounds?.ok) return
    const isClerk = clerkUser && clerkLoaded
    const isOld = isAuthenticated()
    if (!isClerk && !isOld) {
      handleClose()
      requestOpenLoginModal({ wizard: true })
      return
    }
    if (!hasDbBackedProperty(property)) {
      showNotification(t('auctionReminderNeedDbObject'))
      return
    }
    const uid = getDbUserId()
    if (!uid) {
      showNotification(t('auctionReminderProfileSync'))
      return
    }
    if (notifyEmail && !delivery.hasEmail) {
      showNotification(t('auctionReminderNeedEmailInProfile'))
      return
    }
    if (notifyWa && !delivery.hasPhone) {
      showNotification(t('auctionReminderNeedPhoneInProfile'))
      return
    }
    if (!isValidSelection(scheduledAt, bounds)) {
      showNotification(t('auctionReminderInvalidTime'))
      return
    }
    setSaving(true)
    try {
      const base = await getApiBaseUrl()
      const res = await fetch(`${base}/users/${uid}/auction-reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: property.id,
          property_table: property.source_table,
          notify_email: notifyEmail,
          notify_whatsapp: notifyWa,
          scheduled_at: scheduledAt.toISOString(),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.success === false) {
        showNotification(json.error || t('auctionReminderSaveError'))
        return
      }
      showNotification(t('auctionReminderSaved'))
      handleClose()
    } catch {
      showNotification(t('auctionReminderSaveError'))
    } finally {
      setSaving(false)
    }
  }, [
    property,
    bounds,
    clerkUser,
    clerkLoaded,
    scheduledAt,
    notifyEmail,
    notifyWa,
    delivery.hasEmail,
    delivery.hasPhone,
    handleClose,
    t,
  ])

  if (!open || !property) return null

  return (
    <div
      className="auction-reminder-modal__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auction-reminder-title"
      onClick={handleClose}
    >
      <div className="auction-reminder-modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="auction-reminder-modal__header">
          <div className="auction-reminder-modal__header-main">
            <div className="auction-reminder-modal__icon-wrap">
              <Bell width={20} height={20} strokeWidth={2} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 id="auction-reminder-title" className="auction-reminder-modal__title">
                {t('auctionReminderTitle')}
              </h2>
              <p className="auction-reminder-modal__subtitle">{property.title || property.name || ''}</p>
            </div>
          </div>
          <button
            type="button"
            className="auction-reminder-modal__close"
            aria-label="Close"
            onClick={handleClose}
          >
            <X width={20} height={20} />
          </button>
        </div>

        <div className="auction-reminder-modal__body">
          {!bounds?.ok ? (
            <p className="auction-reminder-modal__hint" style={{ marginBottom: 0 }}>
              {badRangeMessage ?? t('auctionReminderBadRange')}
            </p>
          ) : step === 1 ? (
            <>
              <p className="auction-reminder-modal__hint">{t('auctionReminderChannelsHint')}</p>
              {delivery.loaded && (
                <div className="auction-reminder-modal__delivery">
                  {delivery.hasEmail ? (
                    <p className="auction-reminder-modal__delivery-line auction-reminder-modal__delivery-line--ok">
                      {t('auctionReminderDeliveryEmail', { email: maskEmail(delivery.email) })}
                    </p>
                  ) : (
                    <p className="auction-reminder-modal__delivery-line auction-reminder-modal__warn">
                      {t('auctionReminderDeliveryNoEmail')}
                    </p>
                  )}
                  {delivery.hasPhone ? (
                    <p className="auction-reminder-modal__delivery-line auction-reminder-modal__delivery-line--ok">
                      {t('auctionReminderDeliveryPhone')}
                    </p>
                  ) : (
                    <p className="auction-reminder-modal__delivery-line auction-reminder-modal__warn--muted">
                      {t('auctionReminderDeliveryNoPhone')}
                    </p>
                  )}
                </div>
              )}
              <label className="auction-reminder-modal__checkbox-row">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  disabled={delivery.loaded && !delivery.hasEmail}
                />
                <span>{t('auctionReminderEmail')}</span>
              </label>
              <label className="auction-reminder-modal__checkbox-row">
                <input
                  type="checkbox"
                  checked={notifyWa}
                  onChange={(e) => setNotifyWa(e.target.checked)}
                  disabled={delivery.loaded && !delivery.hasPhone}
                />
                <span>{t('auctionReminderWhatsApp')}</span>
              </label>
              <button type="button" className="auction-reminder-modal__btn-primary" onClick={goNext}>
                {t('auctionReminderNext')}
              </button>
            </>
          ) : (
            <>
              <p className="auction-reminder-modal__hint">{t('auctionReminderPickSlot')}</p>
              {notifyEmail && delivery.hasEmail && (
                <p className="auction-reminder-modal__delivery-line auction-reminder-modal__delivery-line--ok auction-reminder-modal__delivery-line--compact">
                  {t('auctionReminderDeliveryEmail', { email: maskEmail(delivery.email) })}
                </p>
              )}
              <div className="auction-reminder-modal__wheel-wrap">
                <AuctionReminderWheelPicker
                  key={`${property.id}-${property.source_table}-${bounds.minMs}`}
                  value={scheduledAt}
                  onChange={setScheduledAt}
                  rangeMinMs={bounds.minMs}
                  rangeMaxMs={bounds.maxMs}
                  compareMode={bounds.compareMode}
                  size="sm"
                />
              </div>
              {notifyEmail && delivery.hasEmail && (
                <button
                  type="button"
                  className="auction-reminder-modal__btn-test"
                  disabled={testing || saving}
                  onClick={() => sendTestEmail()}
                >
                  {testing ? '…' : t('auctionReminderSendTestNow')}
                </button>
              )}
              <div className="auction-reminder-modal__row">
                <button
                  type="button"
                  className="auction-reminder-modal__btn-secondary"
                  onClick={() => setStep(1)}
                >
                  {t('auctionReminderBack')}
                </button>
                <button
                  type="button"
                  className="auction-reminder-modal__btn-primary"
                  disabled={saving}
                  onClick={() => save()}
                >
                  {saving ? '…' : t('auctionReminderSave')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
