import { useTranslation } from 'react-i18next'
import { FiRefreshCw } from 'react-icons/fi'
import './PropertyCurrencySelector.css'

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
      <div className="property-currency-selector__pills">
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
      {isConverted ? (
        <p className="property-currency-selector__hint">{t('propertyDetailCurrencyApprox')}</p>
      ) : null}
    </div>
  )
}
