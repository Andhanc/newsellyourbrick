import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Clock,
  EyeOff,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from 'lucide-react'
import { getApiBaseUrlSync } from '../utils/apiConfig'
import { getAuctionMinBidStep } from '../utils/auctionBidStep'
import {
  formatBidInputDisplayFromStored,
  formatBidMoneyAmount,
  parseMoneyInputValue,
  sanitizeMoneyInputRaw,
} from '../utils/moneyInputFormat'
import './AuctionBidCeilingModal.css'

const HERO_IMAGE = '/images/auction-bid-ceiling-hero.png'

export default function AuctionBidCeilingModal({
  open,
  onClose,
  property,
  propertyTable,
  userId,
  currentBid,
  startingPrice = 0,
  currencySymbol = '€',
  fmtPrice,
  onSaved,
  onError,
}) {
  const { t } = useTranslation()
  const [maxAmountInput, setMaxAmountInput] = useState('')
  const [existingCeiling, setExistingCeiling] = useState(null)
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(false)

  const effectiveCurrentBid = useMemo(() => {
    const cur = currentBid != null ? Number(currentBid) : null
    const start = Number(startingPrice) || 0
    return cur != null && Number.isFinite(cur) ? cur : start
  }, [currentBid, startingPrice])

  const minCeiling = useMemo(() => {
    const step = getAuctionMinBidStep(effectiveCurrentBid)
    return effectiveCurrentBid + step
  }, [effectiveCurrentBid])

  const step = useMemo(() => getAuctionMinBidStep(effectiveCurrentBid), [effectiveCurrentBid])

  const maxAmountDisplay = useMemo(
    () => formatBidInputDisplayFromStored(maxAmountInput),
    [maxAmountInput],
  )

  const minCeilingPlaceholder = useMemo(
    () => formatBidMoneyAmount(Math.round(minCeiling)),
    [minCeiling],
  )

  const handleAmountChange = (e) => {
    setMaxAmountInput(sanitizeMoneyInputRaw(e.target.value))
  }

  const fetchCeiling = useCallback(async () => {
    if (!userId || !property?.id) return
    setFetching(true)
    try {
      const q = new URLSearchParams({
        user_id: String(userId),
        property_id: String(property.id),
        property_table: propertyTable || 'properties_apartments',
      })
      const res = await fetch(`${getApiBaseUrlSync()}/bids/ceiling?${q.toString()}`)
      const json = await res.json()
      if (json.success && json.data?.max_amount != null) {
        setExistingCeiling(json.data)
        setMaxAmountInput(sanitizeMoneyInputRaw(String(Math.round(json.data.max_amount))))
      } else {
        setExistingCeiling(null)
        setMaxAmountInput('')
      }
    } catch {
      setExistingCeiling(null)
    } finally {
      setFetching(false)
    }
  }, [userId, property?.id, propertyTable])

  useEffect(() => {
    if (!open) return
    void fetchCeiling()
  }, [open, fetchCeiling])

  const handleSave = async () => {
    const amount = parseMoneyInputValue(maxAmountInput)
    if (!Number.isFinite(amount) || amount <= 0) {
      onError?.(t('auctionBidCeilingInvalidAmount'))
      return
    }
    if (amount < minCeiling) {
      onError?.(
        t('auctionBidCeilingBelowMin', {
          min: fmtPrice ? fmtPrice(minCeiling) : `${minCeiling} ${currencySymbol}`,
        }),
      )
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${getApiBaseUrlSync()}/bids/ceiling`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          property_id: property.id,
          property_table: propertyTable || 'properties_apartments',
          property_type: property.property_type,
          max_amount: amount,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        if (json.error === 'MAX_BELOW_MINIMUM' && json.minimum) {
          onError?.(
            t('auctionBidCeilingBelowMin', {
              min: fmtPrice ? fmtPrice(json.minimum) : `${json.minimum} ${currencySymbol}`,
            }),
          )
        } else {
          onError?.(json.error || t('auctionBidCeilingSaveError'))
        }
        return
      }
      onSaved?.(json.data)
      onClose()
    } catch {
      onError?.(t('auctionBidCeilingSaveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${getApiBaseUrlSync()}/bids/ceiling`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          property_id: property.id,
          property_table: propertyTable || 'properties_apartments',
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        onError?.(t('auctionBidCeilingSaveError'))
        return
      }
      setExistingCeiling(null)
      setMaxAmountInput('')
      onSaved?.(null)
      onClose()
    } catch {
      onError?.(t('auctionBidCeilingSaveError'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="auction-bid-ceiling-modal__overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="auction-bid-ceiling-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auction-bid-ceiling-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="auction-bid-ceiling-modal__close"
          onClick={onClose}
          aria-label={t('close') || 'Close'}
        >
          <X size={20} />
        </button>

        <div className="auction-bid-ceiling-modal__layout">
          <div className="auction-bid-ceiling-modal__info">
            <div className="auction-bid-ceiling-modal__hero">
              <img
                src={HERO_IMAGE}
                alt=""
                className="auction-bid-ceiling-modal__hero-img"
              />
              <div className="auction-bid-ceiling-modal__hero-overlay" aria-hidden />
              <div className="auction-bid-ceiling-modal__hero-copy">
                <span className="auction-bid-ceiling-modal__hero-badge">
                  <Sparkles size={14} aria-hidden />
                  {t('auctionBidCeilingBadge')}
                </span>
                <h2 id="auction-bid-ceiling-title" className="auction-bid-ceiling-modal__title">
                  {t('auctionBidCeilingTitle')}
                </h2>
                <p className="auction-bid-ceiling-modal__subtitle">{t('auctionBidCeilingSubtitle')}</p>
              </div>
            </div>

            <div className="auction-bid-ceiling-modal__info-body">
              <div className="auction-bid-ceiling-modal__stats">
                <div className="auction-bid-ceiling-modal__stat">
                  <span className="auction-bid-ceiling-modal__stat-label">
                    {t('propertyDetailCurrentMaxBid')}
                  </span>
                  <span className="auction-bid-ceiling-modal__stat-value">
                    {fmtPrice ? fmtPrice(effectiveCurrentBid) : `${effectiveCurrentBid} ${currencySymbol}`}
                  </span>
                </div>
                <div className="auction-bid-ceiling-modal__stat">
                  <span className="auction-bid-ceiling-modal__stat-label">
                    {t('auctionBidCeilingMinLabel')}
                  </span>
                  <span className="auction-bid-ceiling-modal__stat-value auction-bid-ceiling-modal__stat-value--accent">
                    {fmtPrice ? fmtPrice(minCeiling) : `${minCeiling} ${currencySymbol}`}
                  </span>
                </div>
              </div>

              <ul className="auction-bid-ceiling-modal__features">
                <li>
                  <span className="auction-bid-ceiling-modal__feature-icon" aria-hidden>
                    <EyeOff size={18} />
                  </span>
                  <span>{t('auctionBidCeilingFeatureHidden')}</span>
                </li>
                <li>
                  <span className="auction-bid-ceiling-modal__feature-icon" aria-hidden>
                    <Clock size={18} />
                  </span>
                  <span>{t('auctionBidCeilingFeatureFinalPhase')}</span>
                </li>
                <li>
                  <span className="auction-bid-ceiling-modal__feature-icon" aria-hidden>
                    <Target size={18} />
                  </span>
                  <span>{t('auctionBidCeilingFeatureProximity')}</span>
                </li>
                <li>
                  <span className="auction-bid-ceiling-modal__feature-icon" aria-hidden>
                    <Shield size={18} />
                  </span>
                  <span>{t('auctionBidCeilingFeatureCap')}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="auction-bid-ceiling-modal__form-side">
            <div className="auction-bid-ceiling-modal__form-card">
              <div className="auction-bid-ceiling-modal__form-header">
                <span className="auction-bid-ceiling-modal__form-icon" aria-hidden>
                  <TrendingUp size={20} />
                </span>
                <div>
                  <p className="auction-bid-ceiling-modal__form-eyebrow">
                    {t('auctionBidCeilingFormEyebrow')}
                  </p>
                  <h3 className="auction-bid-ceiling-modal__form-title">
                    {t('auctionBidCeilingInputLabel')}
                  </h3>
                </div>
              </div>

              <div className="auction-bid-ceiling-modal__field">
                <label className="auction-bid-ceiling-modal__label auction-bid-ceiling-modal__label--sr" htmlFor="auction-bid-ceiling-input">
                  {t('auctionBidCeilingInputLabel')}
                </label>
                <div className="auction-bid-ceiling-modal__input-wrap">
                  <span className="auction-bid-ceiling-modal__currency">{currencySymbol}</span>
                  <input
                    id="auction-bid-ceiling-input"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className="auction-bid-ceiling-modal__input"
                    placeholder={minCeilingPlaceholder}
                    value={maxAmountDisplay}
                    onChange={handleAmountChange}
                    disabled={saving || fetching}
                  />
                </div>
                <p className="auction-bid-ceiling-modal__hint">
                  {t('auctionBidCeilingInputHint', {
                    step: fmtPrice ? fmtPrice(step) : `${step} ${currencySymbol}`,
                  })}
                </p>
              </div>

              {existingCeiling?.activated_at ? (
                <p className="auction-bid-ceiling-modal__active-note" role="status">
                  {t('auctionBidCeilingAlreadyActive')}
                </p>
              ) : null}

              <div className="auction-bid-ceiling-modal__actions">
                <button
                  type="button"
                  className="auction-bid-ceiling-modal__submit"
                  onClick={handleSave}
                  disabled={saving || fetching || !maxAmountInput.trim()}
                >
                  {saving ? t('propertyDetailSubmitting') : t('auctionBidCeilingSubmit')}
                </button>
                {existingCeiling ? (
                  <button
                    type="button"
                    className="auction-bid-ceiling-modal__remove"
                    onClick={handleRemove}
                    disabled={saving}
                  >
                    {t('auctionBidCeilingRemove')}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
