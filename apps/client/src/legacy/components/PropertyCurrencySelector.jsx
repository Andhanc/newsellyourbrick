import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiChevronDown, FiRefreshCw } from 'react-icons/fi'
import './PropertyCurrencySelector.css'

function CurrencySelectorPills({
  baseCurrency,
  displayCurrency,
  onChange,
  options,
  loading = false,
}) {
  const { t } = useTranslation()

  return (
    <div
      className={`property-currency-selector__pills${loading ? ' property-currency-selector__pills--loading' : ''}`}
    >
      {options.map((opt) => {
        const active = opt.code === displayCurrency
        const isBase = opt.code === baseCurrency
        return (
          <button
            key={opt.code}
            type="button"
            className={`property-currency-selector__pill${active ? ' property-currency-selector__pill--active' : ''}`}
            onClick={() => onChange(opt.code)}
            disabled={loading}
            aria-pressed={active}
            title={isBase ? t('propertyDetailCurrencyListing') : opt.name}
          >
            <span className="property-currency-selector__symbol" aria-hidden>
              {opt.symbol}
            </span>
            <span className="property-currency-selector__code">{opt.code}</span>
          </button>
        )
      })}
      {loading ? (
        <span className="property-currency-selector__loading" aria-live="polite">
          <FiRefreshCw className="property-currency-selector__spinner" aria-hidden />
        </span>
      ) : null}
    </div>
  )
}

export default function PropertyCurrencySelector({
  baseCurrency,
  displayCurrency,
  onChange,
  options,
  loading = false,
  isConverted = false,
}) {
  const { t } = useTranslation()

  return (
    <div className="property-currency-selector" role="group" aria-label={t('propertyDetailCurrencyGroupLabel')}>
      <CurrencySelectorPills
        baseCurrency={baseCurrency}
        displayCurrency={displayCurrency}
        onChange={onChange}
        options={options}
        loading={loading}
      />
      {isConverted && !loading ? (
        <p className="property-currency-selector__hint">{t('propertyDetailCurrencyApprox')}</p>
      ) : null}
    </div>
  )
}

export function PropertyCurrencyInputTrigger({
  baseCurrency,
  displayCurrency,
  onChange,
  options,
  loading = false,
  isConverted = false,
  disabled = false,
  onLockedClick,
  compact = false,
  popoverFooter = null,
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const listboxId = useId()
  const activeOption =
    options.find((opt) => opt.code === displayCurrency) || options[0] || null

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleToggle = () => {
    if (disabled || loading) {
      onLockedClick?.()
      return
    }
    setOpen((value) => !value)
  }

  const handleSelect = (code) => {
    onChange(code)
    setOpen(false)
  }

  return (
    <div className="property-currency-input-trigger" ref={rootRef}>
      <button
        type="button"
        className={`property-currency-input-trigger__btn${
          open ? ' property-currency-input-trigger__btn--open' : ''
        }${compact ? ' property-currency-input-trigger__btn--compact' : ''}`}
        onClick={(event) => {
          event.stopPropagation()
          handleToggle()
        }}
        disabled={loading}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-label={t('propertyDetailCurrencyGroupLabel')}
        title={t('propertyDetailCurrencyGroupLabel')}
      >
        <span className="property-currency-input-trigger__symbol" aria-hidden>
          {activeOption?.symbol || displayCurrency}
        </span>
        {!compact ? (
          <>
            <span className="property-currency-input-trigger__code">{displayCurrency}</span>
            <FiChevronDown className="property-currency-input-trigger__chevron" aria-hidden />
          </>
        ) : null}
      </button>

      {open ? (
        <div
          id={listboxId}
          className="property-currency-selector property-currency-selector--popover"
          role="listbox"
          aria-label={t('propertyDetailCurrencyGroupLabel')}
        >
          <CurrencySelectorPills
            baseCurrency={baseCurrency}
            displayCurrency={displayCurrency}
            onChange={handleSelect}
            options={options}
            loading={loading}
          />
          {popoverFooter}
          {isConverted && !loading ? (
            <p className="property-currency-selector__hint">{t('propertyDetailCurrencyApprox')}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
