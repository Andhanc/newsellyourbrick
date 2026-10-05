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

const ART = {
  hero: '/images/auction-bid-ceiling/hero.jpg',
  auto: '/images/auction-bid-ceiling/auto.jpg',
  hidden: '/images/auction-bid-ceiling/hidden.jpg',
  final: '/images/auction-bid-ceiling/final.jpg',
  cap: '/images/auction-bid-ceiling/cap.jpg',
  locked: '/images/auction-bid-ceiling/locked.jpg',
}

function CeilingLockScene({ isComplete, onDone, loadingLabel, successLabel }) {
  const [showCheck, setShowCheck] = useState(false)

  useEffect(() => {
    if (!isComplete) return undefined
    const checkTimer = window.setTimeout(() => setShowCheck(true), 450)
    const doneTimer = window.setTimeout(onDone, 1250)
    return () => {
      window.clearTimeout(checkTimer)
      window.clearTimeout(doneTimer)
    }
  }, [isComplete, onDone])

  return (
    <div className="abc-lock-wrap" role="status" aria-live="polite">
      <div className={`abc-lock__status${showCheck ? ' abc-lock__status--done' : ''}`} aria-hidden="true">
        {showCheck ? (
          <svg viewBox="0 0 48 48" className="abc-lock__check">
            <path d="M11 24.5 20 33l17-18" />
          </svg>
        ) : (
          <span className="abc-spinner" />
        )}
      </div>
      <p className="abc-lock__caption">{showCheck ? successLabel : loadingLabel}</p>
    </div>
  )
}

function CeilingWait({ label }) {
  return (
    <div className="abc-wait" role="status" aria-label={label}>
      <span className="abc-spinner" />
    </div>
  )
}

export default function AuctionBidCeilingModal({
  open,
  onClose,
  embedded = false,
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
  const [view, setView] = useState('boot')
  const [lockedAmount, setLockedAmount] = useState(null)

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

  const formatMoney = useCallback(
    (amount) => (fmtPrice ? fmtPrice(amount) : `${amount} ${currencySymbol}`),
    [fmtPrice, currencySymbol],
  )

  const formattedCurrent = formatMoney(effectiveCurrentBid)
  const formattedMin = formatMoney(minCeiling)
  const formattedStep = formatMoney(step)
  const formattedLocked = formatMoney(lockedAmount ?? existingCeiling?.max_amount ?? 0)

  const cards = useMemo(
    () => [
      {
        key: 'auto',
        title: t('auctionBidCeilingCardAutoTitle'),
        text: t('auctionBidCeilingCardAutoText'),
        art: ART.auto,
      },
      {
        key: 'hidden',
        title: t('auctionBidCeilingCardHiddenTitle'),
        text: t('auctionBidCeilingCardHiddenText'),
        art: ART.hidden,
      },
      {
        key: 'final',
        title: t('auctionBidCeilingCardFinalTitle'),
        text: t('auctionBidCeilingCardFinalText'),
        art: ART.final,
      },
      {
        key: 'cap',
        title: t('auctionBidCeilingCardCapTitle'),
        text: t('auctionBidCeilingCardCapText'),
        art: ART.cap,
      },
    ],
    [t],
  )

  const handleAmountChange = (e) => {
    setMaxAmountInput(sanitizeMoneyInputRaw(e.target.value))
  }

  const fetchCeiling = useCallback(async () => {
    if (!userId || !property?.id) {
      setExistingCeiling(null)
      setMaxAmountInput('')
      return null
    }
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
        return json.data
      }
      setExistingCeiling(null)
      setMaxAmountInput('')
      return null
    } catch {
      setExistingCeiling(null)
      return null
    }
  }, [userId, property?.id, propertyTable])

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    setView('boot')
    ;(async () => {
      const data = await fetchCeiling()
      if (cancelled) return
      if (data?.max_amount != null) {
        setLockedAmount(Number(data.max_amount))
        setView('confirmed')
      } else {
        setLockedAmount(null)
        setView('setup')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, fetchCeiling])

  useEffect(() => {
    const body = document.querySelector('.auction-bid-ceiling-modal__body')
    if (body) body.scrollTop = 0
  }, [view])

  const { visible, isClosing, requestClose } = useDrawerDismiss(embedded ? false : open, onClose, {
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
    isOpen: embedded ? false : open,
    visible: embedded ? false : visible,
    isClosing: embedded ? false : isClosing,
    requestClose,
    panelClosingClass: 'auction-bid-ceiling-modal__panel--closing',
    maxViewportHeightRatio: 0.92,
  })

  useEffect(() => {
    if (embedded || !visible) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [embedded, visible])

  const persistCeiling = useCallback(
    async (amount) => {
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
              min: formatMoney(json.minimum),
            }),
          )
        } else {
          onError?.(json.error || t('auctionBidCeilingSaveError'))
        }
        return false
      }
      setExistingCeiling(json.data)
      setLockedAmount(amount)
      onSaved?.(json.data)
      return true
    },
    [userId, property?.id, property?.property_type, propertyTable, onError, onSaved, t, formatMoney],
  )

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
    setLockedAmount(amount)
    setView('locking')
    try {
      const ok = await persistCeiling(amount)
      if (!ok) setView('setup')
    } catch {
      onError?.(t('auctionBidCeilingSaveError'))
      setView('setup')
    } finally {
      setSaving(false)
    }
  }

  const handleLockDone = useCallback(() => {
    setView((current) => (current === 'locking' ? 'confirmed' : current))
  }, [])

  const handleChange = () => setView('setup')

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
      setLockedAmount(null)
      setMaxAmountInput('')
      onSaved?.(null)
      setView('setup')
    } catch {
      onError?.(t('auctionBidCeilingSaveError'))
    } finally {
      setSaving(false)
    }
  }

  const show = embedded ? Boolean(open) : visible
  if (!show || typeof document === 'undefined') return null

  const views = (
    <>
      {view === 'boot' ? <CeilingWait label={t('auctionBidCeilingLocking')} /> : null}

      {view === 'locking' ? (
        <CeilingLockScene
          isComplete={!saving}
          onDone={handleLockDone}
          loadingLabel={t('auctionBidCeilingLocking')}
          successLabel={t('auctionBidCeilingSaved')}
        />
      ) : null}

      {view === 'confirmed' ? (
        <div className="abc-confirmed">
          <article className="abc-result">
            <div className="abc-result__copy">
              <p className="abc-result__kicker">{t('auctionBidCeilingLockedKicker')}</p>
              <p className="abc-result__amount">{formattedLocked}</p>
              <p className="abc-result__lead">{t('auctionBidCeilingLockedLead')}</p>
            </div>
            <img src={ART.locked} alt="" className="abc-result__art" />
          </article>
          <button type="button" className="abc-change" onClick={handleChange}>
            <span className="abc-change__shine" aria-hidden="true" />
            <span className="abc-change__label">{t('auctionBidCeilingChange')}</span>
          </button>
        </div>
      ) : null}

      {view === 'setup' ? (
        <div className="abc-setup">
          <article className="abc-hero">
            <div className="abc-hero__copy">
              <h3 className="abc-hero__title">{t('auctionBidCeilingHeroTitle')}</h3>
              <p className="abc-hero__text">{t('auctionBidCeilingHeroText')}</p>
              <p className="abc-hero__now">
                <span>{t('propertyDetailCurrentMaxBid')}</span>
                <strong>{formattedCurrent}</strong>
              </p>
            </div>
            <img src={ART.hero} alt="" className="abc-hero__art" />
          </article>

          <div className="abc-grid">
            {cards.map((card) => (
              <article key={card.key} className="abc-tile">
                <div className="abc-tile__copy">
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </div>
                <img src={card.art} alt="" />
              </article>
            ))}
          </div>

          <div className="abc-compose">
            <label className="abc-compose__label" htmlFor="auction-bid-ceiling-input">
              {t('auctionBidCeilingInputLabel')}
            </label>
            <div className="abc-compose__field">
              <span className="abc-compose__currency">{currencySymbol}</span>
              <input
                id="auction-bid-ceiling-input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className="abc-compose__input"
                placeholder={minCeilingPlaceholder}
                value={maxAmountDisplay}
                onChange={handleAmountChange}
                disabled={saving}
              />
            </div>
            <p className="abc-compose__hint">
              {t('auctionBidCeilingInputHint', { step: formattedStep })}
            </p>
            {existingCeiling ? (
              <button
                type="button"
                className="abc-remove"
                onClick={handleRemove}
                disabled={saving}
              >
                {t('auctionBidCeilingRemove')}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )

  const fixBar = view === 'setup' ? (
    <div className="abc-fix-bar">
      <button
        type="button"
        className="abc-fix"
        onClick={handleSave}
        disabled={saving}
      >
        <span className="abc-fix__shine" aria-hidden="true" />
        <span className="abc-fix__label">{t('auctionBidCeilingFix')}</span>
      </button>
    </div>
  ) : null

  if (embedded) {
    return (
      <div className="auction-bid-ceiling-embed">
        <div className="auction-bid-ceiling-modal__body">{views}</div>
        {fixBar}
      </div>
    )
  }

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
              {t('auctionBidCeilingSheetTitle')}
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

          <div className="auction-bid-ceiling-modal__body">{views}</div>
          {fixBar}
        </div>
      </div>
    </>,
    document.body,
  )
}
