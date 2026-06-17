import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import {
  DEBTS_PROPERTY_TYPE_OPTIONS,
  DEBTS_RISK_OPTIONS,
  EMPTY_DEBTS_FILTERS,
} from '../utils/debtsPageFilters'
import './DebtsPageFilters.css'

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function DebtsPageFilters({
  filters,
  onFiltersChange,
  priceBounds,
  debtBounds,
  riskStats = [],
  purchaseCounts = { auction: 0, buyNow: 0 },
  filterOptions = { countries: [] },
}) {
  const { t } = useTranslation()
  const [openSections, setOpenSections] = useState({
    risk: true,
    type: true,
    region: true,
    price: true,
    debt: true,
    purchase: true,
  })

  const statsByRisk = useMemo(
    () => Object.fromEntries(riskStats.map((item) => [item.id, item.count])),
    [riskStats],
  )

  const sliderPriceMin = filters.minPrice !== '' ? Number(filters.minPrice) : priceBounds.min
  const sliderPriceMax = filters.maxPrice !== '' ? Number(filters.maxPrice) : priceBounds.max
  const priceSpan = Math.max(1, priceBounds.max - priceBounds.min)
  const priceFillLeft = ((sliderPriceMin - priceBounds.min) / priceSpan) * 100
  const priceFillWidth = ((sliderPriceMax - sliderPriceMin) / priceSpan) * 100

  const sliderDebtMin = filters.minDebt !== '' ? Number(filters.minDebt) : debtBounds.min
  const sliderDebtMax = filters.maxDebt !== '' ? Number(filters.maxDebt) : debtBounds.max
  const debtSpan = Math.max(1, debtBounds.max - debtBounds.min)
  const debtFillLeft = ((sliderDebtMin - debtBounds.min) / debtSpan) * 100
  const debtFillWidth = ((sliderDebtMax - sliderDebtMin) / debtSpan) * 100

  const setFilter = (patch) => onFiltersChange({ ...filters, ...patch })

  const toggleRisk = (value) => {
    const next = filters.risks.includes(value)
      ? filters.risks.filter((item) => item !== value)
      : [...filters.risks, value]
    setFilter({ risks: next, risk: 'all' })
  }

  const applyPriceRange = (nextMin, nextMax) => {
    const lo = clamp(Math.round(Math.min(nextMin, nextMax)), priceBounds.min, priceBounds.max)
    const hi = clamp(Math.round(Math.max(nextMin, nextMax)), lo, priceBounds.max)
    setFilter({
      minPrice: lo <= priceBounds.min ? '' : String(lo),
      maxPrice: hi >= priceBounds.max ? '' : String(hi),
    })
  }

  const applyDebtRange = (nextMin, nextMax) => {
    const lo = clamp(Math.round(Math.min(nextMin, nextMax)), debtBounds.min, debtBounds.max)
    const hi = clamp(Math.round(Math.max(nextMin, nextMax)), lo, debtBounds.max)
    setFilter({
      minDebt: lo <= debtBounds.min ? '' : String(lo),
      maxDebt: hi >= debtBounds.max ? '' : String(hi),
    })
  }

  const handleReset = () => onFiltersChange({ ...EMPTY_DEBTS_FILTERS })

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <aside className="debts-page-filters" aria-label={t('filters')}>
      <div className="debts-page-filters__head">
        <h2 className="debts-page-filters__title">{t('filters')}</h2>
        <button type="button" className="debts-page-filters__reset" onClick={handleReset}>
          {t('debtsResetAll')}
        </button>
      </div>

      <div className="debts-page-filters__sections">
        <FilterSection
          title={t('debtsFilterObjectRisk')}
          open={openSections.risk}
          onToggle={() => toggleSection('risk')}
        >
          <ul className="debts-page-filters__checklist">
            {DEBTS_RISK_OPTIONS.map(({ value, labelKey, tone }) => (
              <li key={value}>
                <label className="debts-page-filters__check">
                  <input
                    type="checkbox"
                    checked={filters.risks.includes(value)}
                    onChange={() => toggleRisk(value)}
                  />
                  <span className="debts-page-filters__check-box" aria-hidden />
                  <span className={`debts-page-filters__dot debts-page-filters__dot--${tone}`} aria-hidden />
                  <span className="debts-page-filters__check-label">{t(labelKey)}</span>
                  <span className="debts-page-filters__count">{statsByRisk[value] ?? 0}</span>
                </label>
              </li>
            ))}
          </ul>
        </FilterSection>

        <FilterSection
          title={t('debtsFilterObjectType')}
          open={openSections.type}
          onToggle={() => toggleSection('type')}
        >
          <label className="debts-page-filters__select-wrap">
            <select
              className="debts-page-filters__select"
              value={filters.propertyType}
              onChange={(e) => setFilter({ propertyType: e.target.value })}
            >
              {DEBTS_PROPERTY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value === 'все' ? t('debtsFilterAllTypes') : t(option.labelKey)}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="debts-page-filters__select-icon" aria-hidden />
          </label>
        </FilterSection>

        <FilterSection
          title={t('debtsFilterRegion')}
          open={openSections.region}
          onToggle={() => toggleSection('region')}
        >
          <label className="debts-page-filters__select-wrap">
            <select
              className="debts-page-filters__select"
              value={filters.region}
              onChange={(e) => setFilter({ region: e.target.value })}
            >
              <option value="all">{t('debtsFilterAllRegions')}</option>
              {filterOptions.countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="debts-page-filters__select-icon" aria-hidden />
          </label>
        </FilterSection>

        <FilterSection
          title={t('debtsFilterPrice')}
          open={openSections.price}
          onToggle={() => toggleSection('price')}
        >
          <div className="debts-page-filters__range-inputs">
            <label className="debts-page-filters__range-field">
              <span>{t('debtsFilterPriceFrom')}</span>
              <input
                type="text"
                inputMode="numeric"
                className="debts-page-filters__input"
                placeholder={`€ ${priceBounds.min.toLocaleString()}`}
                value={filters.minPrice}
                onChange={(e) => setFilter({ minPrice: e.target.value.replace(/[^\d]/g, '') })}
              />
            </label>
            <label className="debts-page-filters__range-field">
              <span>{t('debtsFilterPriceTo')}</span>
              <input
                type="text"
                inputMode="numeric"
                className="debts-page-filters__input"
                placeholder={`€ ${priceBounds.max.toLocaleString()}+`}
                value={filters.maxPrice}
                onChange={(e) => setFilter({ maxPrice: e.target.value.replace(/[^\d]/g, '') })}
              />
            </label>
          </div>
          <div
            className="debts-page-filters__slider-track"
            style={{ '--range-left': `${priceFillLeft}%`, '--range-width': `${priceFillWidth}%` }}
          >
            <div className="debts-page-filters__slider-rail" aria-hidden />
            <div className="debts-page-filters__slider-fill" aria-hidden />
            <input
              type="range"
              className="debts-page-filters__range debts-page-filters__range--min"
              min={priceBounds.min}
              max={priceBounds.max}
              value={sliderPriceMin}
              onChange={(e) => applyPriceRange(Number(e.target.value), sliderPriceMax)}
              aria-label={t('auctionFilterPriceMin')}
            />
            <input
              type="range"
              className="debts-page-filters__range debts-page-filters__range--max"
              min={priceBounds.min}
              max={priceBounds.max}
              value={sliderPriceMax}
              onChange={(e) => applyPriceRange(sliderPriceMin, Number(e.target.value))}
              aria-label={t('auctionFilterPriceMax')}
            />
          </div>
        </FilterSection>

        <FilterSection
          title={t('debtsFilterDebtAmount')}
          open={openSections.debt}
          onToggle={() => toggleSection('debt')}
        >
          <div className="debts-page-filters__range-inputs">
            <label className="debts-page-filters__range-field">
              <span>{t('debtsFilterPriceFrom')}</span>
              <input
                type="text"
                inputMode="numeric"
                className="debts-page-filters__input"
                placeholder={`€ ${debtBounds.min.toLocaleString()}`}
                value={filters.minDebt}
                onChange={(e) => setFilter({ minDebt: e.target.value.replace(/[^\d]/g, '') })}
              />
            </label>
            <label className="debts-page-filters__range-field">
              <span>{t('debtsFilterPriceTo')}</span>
              <input
                type="text"
                inputMode="numeric"
                className="debts-page-filters__input"
                placeholder={`€ ${debtBounds.max.toLocaleString()}+`}
                value={filters.maxDebt}
                onChange={(e) => setFilter({ maxDebt: e.target.value.replace(/[^\d]/g, '') })}
              />
            </label>
          </div>
          <div
            className="debts-page-filters__slider-track"
            style={{ '--range-left': `${debtFillLeft}%`, '--range-width': `${debtFillWidth}%` }}
          >
            <div className="debts-page-filters__slider-rail" aria-hidden />
            <div className="debts-page-filters__slider-fill" aria-hidden />
            <input
              type="range"
              className="debts-page-filters__range debts-page-filters__range--min"
              min={debtBounds.min}
              max={debtBounds.max}
              value={sliderDebtMin}
              onChange={(e) => applyDebtRange(Number(e.target.value), sliderDebtMax)}
              aria-label={t('debtsFilterDebtMin')}
            />
            <input
              type="range"
              className="debts-page-filters__range debts-page-filters__range--max"
              min={debtBounds.min}
              max={debtBounds.max}
              value={sliderDebtMax}
              onChange={(e) => applyDebtRange(sliderDebtMin, Number(e.target.value))}
              aria-label={t('debtsFilterDebtMax')}
            />
          </div>
        </FilterSection>

        <FilterSection
          title={t('debtsFilterPurchaseMethod')}
          open={openSections.purchase}
          onToggle={() => toggleSection('purchase')}
        >
          <ul className="debts-page-filters__checklist">
            <li>
              <label className="debts-page-filters__check">
                <input
                  type="checkbox"
                  checked={filters.showAuction}
                  onChange={() => setFilter({ showAuction: !filters.showAuction })}
                />
                <span className="debts-page-filters__check-box" aria-hidden />
                <span className="debts-page-filters__check-label">{t('debtsFilterAuction')}</span>
                <span className="debts-page-filters__count">{purchaseCounts.auction}</span>
              </label>
            </li>
            <li>
              <label className="debts-page-filters__check">
                <input
                  type="checkbox"
                  checked={filters.showBuyNow}
                  onChange={() => setFilter({ showBuyNow: !filters.showBuyNow })}
                />
                <span className="debts-page-filters__check-box" aria-hidden />
                <span className="debts-page-filters__check-label">{t('debtsFilterBuyNow')}</span>
                <span className="debts-page-filters__count">{purchaseCounts.buyNow}</span>
              </label>
            </li>
          </ul>
        </FilterSection>
      </div>
    </aside>
  )
}

function FilterSection({ title, open, onToggle, children }) {
  return (
    <section className={`debts-page-filters__section${open ? ' is-open' : ''}`}>
      <button type="button" className="debts-page-filters__section-toggle" onClick={onToggle}>
        <span>{title}</span>
        <ChevronDown size={18} className="debts-page-filters__chevron" aria-hidden />
      </button>
      {open ? <div className="debts-page-filters__section-body">{children}</div> : null}
    </section>
  )
}

export default DebtsPageFilters
