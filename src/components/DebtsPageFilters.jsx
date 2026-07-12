import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import FilterCollapsibleSection from './FilterCollapsibleSection'
import useFilterSectionState from '../hooks/useFilterSectionState'
import {
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
  filterOptions = { locations: [] },
}) {
  const { t } = useTranslation()

  const activeSectionKeys = useMemo(() => {
    const keys = []
    if (filters.risks.length > 0) keys.push('risk')
    if (filters.minPrice !== '' || filters.maxPrice !== '') keys.push('price')
    if (filters.minDebt !== '' || filters.maxDebt !== '') keys.push('debt')
    if (filters.showAuction || filters.showBuyNow) keys.push('purchase')
    return keys
  }, [filters])

  const [openSections, toggleSection] = useFilterSectionState(
    {
      risk: true,
      price: true,
      debt: true,
      purchase: true,
    },
    activeSectionKeys,
  )

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

  return (
    <aside className="debts-page-filters" aria-label={t('filters')}>
      <div className="debts-page-filters__head">
        <h2 className="debts-page-filters__title">{t('filters')}</h2>
        <button type="button" className="debts-page-filters__reset" onClick={handleReset}>
          {t('debtsResetAll')}
        </button>
      </div>

      <div className="debts-page-filters__sections">
        <FilterCollapsibleSection
          classPrefix="debts-page-filters"
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
        </FilterCollapsibleSection>

        <FilterCollapsibleSection
          classPrefix="debts-page-filters"
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
        </FilterCollapsibleSection>

        <FilterCollapsibleSection
          classPrefix="debts-page-filters"
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
        </FilterCollapsibleSection>

        <FilterCollapsibleSection
          classPrefix="debts-page-filters"
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
        </FilterCollapsibleSection>
      </div>
    </aside>
  )
}

export default DebtsPageFilters
