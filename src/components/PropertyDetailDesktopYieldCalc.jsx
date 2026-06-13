import { useState } from 'react'
import { FiChevronDown } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import {
  formatBidInputDisplayFromStored,
  parseMoneyInputValue,
  sanitizeMoneyInputRaw,
} from '../utils/moneyInputFormat'

const PERIOD_OPTIONS = [3, 5, 7, 10]

function formatMoneyDisplay(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return ''
  return formatBidInputDisplayFromStored(String(Math.round(n)))
}

export default function PropertyDetailDesktopYieldCalc({
  defaultInvestment = 100000,
  defaultRentAnnual = null,
  currencySymbol = '€',
  className = '',
  onCalculateClick,
}) {
  const { t } = useTranslation()

  const initialInvestment = defaultInvestment > 0 ? defaultInvestment : 100000
  const initialRent =
    defaultRentAnnual != null && defaultRentAnnual > 0
      ? defaultRentAnnual
      : Math.round(initialInvestment * 0.124)

  const [investmentRaw, setInvestmentRaw] = useState(formatMoneyDisplay(initialInvestment))
  const [rentRaw, setRentRaw] = useState(formatMoneyDisplay(initialRent))
  const [periodYears, setPeriodYears] = useState(5)
  const [yieldResult, setYieldResult] = useState(() => {
    const inv = initialInvestment
    const rent = initialRent
    return inv > 0 ? ((rent / inv) * 100).toFixed(1) : '0.0'
  })

  const handleCalculate = () => {
    const investment = parseMoneyInputValue(investmentRaw)
    const rent = parseMoneyInputValue(rentRaw)
    if (!Number.isFinite(investment) || investment <= 0) {
      setYieldResult('0.0')
      return
    }
    const annualYield = ((rent / investment) * 100).toFixed(1)
    setYieldResult(annualYield)
    onCalculateClick?.({
      investment,
      rentAnnual: Number.isFinite(rent) ? rent : 0,
      periodYears,
    })
  }

  const handleInvestmentChange = (event) => {
    setInvestmentRaw(sanitizeMoneyInputRaw(event.target.value))
  }

  const handleRentChange = (event) => {
    setRentRaw(sanitizeMoneyInputRaw(event.target.value))
  }

  const formatFieldOnBlur = (raw, setter) => {
    const parsed = parseMoneyInputValue(raw)
    setter(Number.isFinite(parsed) && parsed > 0 ? formatMoneyDisplay(parsed) : raw)
  }

  return (
    <section
      className={`pd-v3-yield-calc property-detail-auction-desktop-only${className ? ` ${className}` : ''}`}
      aria-label={t('propertyDetailYieldCalcTitle')}
    >
      <h2 className="pd-v3-yield-calc__title">{t('propertyDetailYieldCalcTitle')}</h2>

      <div className="pd-v3-yield-calc__body">
        <div className="pd-v3-yield-calc__fields">
          <label className="pd-v3-yield-calc__field">
            <span className="pd-v3-yield-calc__label">
              {t('propertyDetailYieldCalcInvestment', { symbol: currencySymbol })}
            </span>
            <input
              type="text"
              inputMode="decimal"
              className="pd-v3-yield-calc__input"
              value={investmentRaw}
              onChange={handleInvestmentChange}
              onBlur={() => formatFieldOnBlur(investmentRaw, setInvestmentRaw)}
            />
          </label>

          <label className="pd-v3-yield-calc__field">
            <span className="pd-v3-yield-calc__label">{t('propertyDetailYieldCalcPeriod')}</span>
            <span className="pd-v3-yield-calc__select-wrap">
              <select
                className="pd-v3-yield-calc__select"
                value={periodYears}
                onChange={(event) => setPeriodYears(Number(event.target.value))}
              >
                {PERIOD_OPTIONS.map((years) => (
                  <option key={years} value={years}>
                    {t('propertyDetailYieldCalcYears', { count: years })}
                  </option>
                ))}
              </select>
              <FiChevronDown className="pd-v3-yield-calc__select-icon" size={16} aria-hidden />
            </span>
          </label>

          <label className="pd-v3-yield-calc__field">
            <span className="pd-v3-yield-calc__label">{t('propertyDetailYieldCalcRent')}</span>
            <input
              type="text"
              inputMode="decimal"
              className="pd-v3-yield-calc__input"
              value={rentRaw}
              onChange={handleRentChange}
              onBlur={() => formatFieldOnBlur(rentRaw, setRentRaw)}
            />
          </label>
        </div>

        <div className="pd-v3-yield-calc__aside">
          <div className="pd-v3-yield-calc__result">
            <span className="pd-v3-yield-calc__result-label">{t('propertyDetailYieldCalcResultLabel')}</span>
            <span className="pd-v3-yield-calc__result-value">
              {t('propertyDetailYieldCalcResultValue', { value: yieldResult })}
            </span>
          </div>
          <button type="button" className="pd-v3-yield-calc__btn" onClick={handleCalculate}>
            {t('propertyDetailYieldCalcCalculate')}
          </button>
        </div>
      </div>
    </section>
  )
}
