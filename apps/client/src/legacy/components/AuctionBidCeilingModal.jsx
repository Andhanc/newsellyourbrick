import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiX } from 'react-icons/fi'
import { getApiBaseUrlSync } from '../utils/apiConfig'
import { getAuctionMinBidStep } from '../utils/auctionBidStep'
import {
  formatBidInputDisplayFromStored,
  formatBidMoneyAmount,
  parseMoneyInputValue,
  sanitizeMoneyInputRaw,
} from '../utils/moneyInputFormat'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag'
import './AuctionBidCeilingModal.css'

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

  const formattedCurrent = fmtPrice
    ? fmtPrice(effectiveCurrentBid)
    : `${effectiveCurrentBid} ${currencySymbol}`
  const formattedMin = fmtPrice ? fmtPrice(minCeiling) : `${minCeiling} ${currencySymbol}`
  const formattedStep = fmtPrice ? fmtPrice(step) : `${step} ${currencySymbol}`

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

  const { visible, isClosing, requestClose } = useDrawerDismiss(open, onClose, {
    duration: DRAWER_DISMISS_MS.spring,
  })

  const {
    panelRef,
    isDragging,
    panelDragStyle,
    isCollapsed,
    isEntering,
    closingPanel,
    onDragZonePointerDown,
    onDragZonePointerMove,
    onDragZonePointerUp,
    onDragZonePointerCancel,
  } = useBottomSheetDrag({
    isOpen: open,
    visible,
    isClosing,
    requestClose,
    panelClosingClass: 'auction-bid-ceiling-modal__panel--closing',
    maxViewportHeightRatio: 0.62,
  })

  useEffect(() => {
    if (!visible) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [visible])

  const handleSave = async () => {
    const amount = parseMoneyInputValue(maxAmountInput)
    if (!Number.isFinite(amount) || amount <= 0) {
      onError?.(t('auctionBidCeilingInvalidAmount'))
      return
    }
    if (amount < minCeiling) {
      onError?.(t('auctionBidCeilingBelowMin', { min: formattedMin }))
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
      requestClose()
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
      requestClose()
    } catch {
      onError?.(t('auctionBidCeilingSaveError'))
    } finally {
      setSaving(false)
    }
  }

  if (!visible || typeof document === 'undefined') return null

  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''
  const closingPanelClasses = isClosing
    ? `${closingPanel} drawer-dismiss-from-bottom--closing drawer-dismiss-modal--closing`
    : closingPanel

  return createPortal(
    <>
      <div
        role="presentation"
        className={`auction-bid-ceiling-modal__overlay${closingBackdrop}`}
        onClick={() => requestClose()}
      />
      <div
        className={`auction-bid-ceiling-modal${isDragging ? ' auction-bid-ceiling-modal--dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auction-bid-ceiling-title"
      >
        <div
          ref={panelRef}
          className={`auction-bid-ceiling-modal__panel${closingPanelClasses}${
            isEntering ? ' auction-bid-ceiling-modal__panel--entering' : ''
          }${isCollapsed ? ' auction-bid-ceiling-modal__panel--collapsed' : ''}`}
          style={panelDragStyle}
        >
          <div
            className="auction-bid-ceiling-modal__drag-zone"
            onPointerDown={onDragZonePointerDown}
            onPointerMove={onDragZonePointerMove}
            onPointerUp={onDragZonePointerUp}
            onPointerCancel={onDragZonePointerCancel}
          >
            <div className="auction-bid-ceiling-modal__handle" aria-hidden="true">
              <span className="auction-bid-ceiling-modal__handle-pill" />
            </div>
          </div>

          <div className="auction-bid-ceiling-modal__header">
            <h2 id="auction-bid-ceiling-title" className="auction-bid-ceiling-modal__title">
              {t('auctionBidCeilingTitle')}
            </h2>
            <button
              type="button"
              className="auction-bid-ceiling-modal__close"
              onClick={() => requestClose()}
              aria-label={t('closeAria') || t('close') || 'Close'}
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="auction-bid-ceiling-modal__body">
            <div className="auction-bid-ceiling-modal__top">
              <div className="auction-bid-ceiling-modal__top-copy">
                <p className="auction-bid-ceiling-modal__lead">{t('auctionBidCeilingSubtitle')}</p>
                <div className="auction-bid-ceiling-modal__current">
                  <span className="auction-bid-ceiling-modal__current-label">
                    {t('propertyDetailCurrentMaxBid')}
                  </span>
                  <strong className="auction-bid-ceiling-modal__current-value">{formattedCurrent}</strong>
                </div>
              </div>
              <img
                src="/images/auction-empty-illustration.png"
                alt=""
                className="auction-bid-ceiling-modal__art"
                aria-hidden="true"
              />
            </div>

            <label className="auction-bid-ceiling-modal__label" htmlFor="auction-bid-ceiling-input">
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
              {t('auctionBidCeilingInputHint', { step: formattedStep })}
            </p>

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
    </>,
    document.body,
  )
}
