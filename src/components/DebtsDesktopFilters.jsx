import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, X } from 'lucide-react'
import { AUCTION_DESKTOP_PROPERTY_TYPE_ITEMS } from '../utils/auctionDesktopFilterMatch'
import { DEBTS_RISK_OPTIONS } from '../utils/debtsPageFilters'
import './AuctionDesktopFilters.css'
import './DebtsDesktopFilters.css'

const PROPERTY_TYPE_ITEMS = AUCTION_DESKTOP_PROPERTY_TYPE_ITEMS.filter(
  (item) => item.value !== 'земля' && item.value !== 'коммерческая',
)

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function toggleListValue(list, value) {
  if (list.includes(value)) return list.filter((item) => item !== value)
  return [...list, value]
}

function normalizeCountry(country) {
  return country === 'all' ? '' : country || ''
}

function normalizeCity(city) {
  return city === 'all' ? '' : city || ''
}

function DebtsDesktopFilters({
  propertyTypes,
  setPropertyTypes,
  risks,
  setRisks,
  locationOptions = [],
  country = '',
  city = '',
  setCountry,
  setCity,
  minDebt,
  maxDebt,
  setMinDebt,
  setMaxDebt,
  minPrice,
  maxPrice,
  setMinPrice,
  setMaxPrice,
  debtBounds,
  priceBounds,
  riskStats = [],
  onApply,
}) {
  const { t } = useTranslation()
  const [openSections, setOpenSections] = useState({
    location: true,
    type: true,
    risk: true,
    debt: true,
    price: true,
  })

  const countryValue = normalizeCountry(country)
  const cityValue = normalizeCity(city)

  const selectedCountry = useMemo(
    () => locationOptions.find((item) => item.key === countryValue) || null,
    [locationOptions, countryValue],
  )

  const statsByRisk = useMemo(
    () => Object.fromEntries(riskStats.map((item) => [item.id, item.count])),
    [riskStats],
  )

  const activeChips = useMemo(() => {
    const chips = []
    propertyTypes.forEach((typeValue) => {
      const item = PROPERTY_TYPE_ITEMS.find((i) => i.value === typeValue)
      if (item) {
        chips.push({
          id: `type-${typeValue}`,
          label: t(item.labelKey),
          onRemove: () => setPropertyTypes((prev) => prev.filter((v) => v !== typeValue)),
        })
      }
    })
    risks.forEach((riskValue) => {
      const item = DEBTS_RISK_OPTIONS.find((i) => i.value === riskValue)
      if (item) {
        chips.push({
          id: `risk-${riskValue}`,
          label: t(item.labelKey),
          onRemove: () => setRisks((prev) => prev.filter((v) => v !== riskValue)),
        })
      }
    })
    if (countryValue) {
      const countryLabel =
        locationOptions.find((item) => item.key === countryValue)?.label || countryValue
      chips.push({
        id: `country-${countryValue}`,
        label: countryLabel,
        onRemove: () => {
          setCountry?.('all')
          setCity?.('all')
        },
      })
    }
    if (cityValue) {
      const cityLabel =
        selectedCountry?.regions?.find((item) => item.key === cityValue)?.label || cityValue
      chips.push({
        id: `city-${cityValue}`,
        label: cityLabel,
        onRemove: () => setCity?.('all'),
      })
    }
    if (minDebt !== '' || maxDebt !== '') {
      chips.push({
        id: 'debt',
        label: `${t('debtsFilterDebtAmount')}: ${minDebt || debtBounds.min}–${maxDebt || debtBounds.max}`,
        onRemove: () => {
          setMinDebt('')
          setMaxDebt('')
        },
      })
    }
    if (minPrice !== '' || maxPrice !== '') {
      chips.push({
        id: 'price',
        label: `${t('auctionFilterPrice')}: ${minPrice || priceBounds.min}–${maxPrice || priceBounds.max}`,
        onRemove: () => {
          setMinPrice('')
          setMaxPrice('')
        },
      })
    }
    return chips
  }, [
    propertyTypes,
    risks,
    minDebt,
    maxDebt,
    minPrice,
    maxPrice,
    debtBounds.min,
    debtBounds.max,
    priceBounds.min,
    priceBounds.max,
    setPropertyTypes,
    setRisks,
    setMinDebt,
    setMaxDebt,
    setMinPrice,
    setMaxPrice,
    countryValue,
    cityValue,
    locationOptions,
    selectedCountry,
    setCountry,
    setCity,
    t,
  ])

  const sliderDebtMin = minDebt !== '' ? Number(minDebt) : debtBounds.min
  const sliderDebtMax = maxDebt !== '' ? Number(maxDebt) : debtBounds.max
  const sliderPriceMin = minPrice !== '' ? Number(minPrice) : priceBounds.min
  const sliderPriceMax = maxPrice !== '' ? Number(maxPrice) : priceBounds.max

  const debtSpan = Math.max(1, debtBounds.max - debtBounds.min)
  const priceSpan = Math.max(1, priceBounds.max - priceBounds.min)
  const debtFillLeft = ((sliderDebtMin - debtBounds.min) / debtSpan) * 100
  const debtFillWidth = ((sliderDebtMax - sliderDebtMin) / debtSpan) * 100
  const priceFillLeft = ((sliderPriceMin - priceBounds.min) / priceSpan) * 100
  const priceFillWidth = ((sliderPriceMax - sliderPriceMin) / priceSpan) * 100

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleReset = () => {
    setPropertyTypes([])
    setRisks([])
    setCountry?.('all')
    setCity?.('all')
    setMinDebt('')
    setMaxDebt('')
    setMinPrice('')
    setMaxPrice('')
  }

  const togglePropertyType = (value) => {
    if (value === 'все') {
      setPropertyTypes([])
      return
    }
    setPropertyTypes((prev) => toggleListValue(prev, value))
  }

  const toggleRisk = (value) => {
    setRisks((prev) => toggleListValue(prev, value))
  }

  const applyDebtRange = (nextMin, nextMax) => {
    const lo = clamp(Math.round(Math.min(nextMin, nextMax)), debtBounds.min, debtBounds.max)
    const hi = clamp(Math.round(Math.max(nextMin, nextMax)), lo, debtBounds.max)
    setMinDebt(lo <= debtBounds.min ? '' : String(lo))
    setMaxDebt(hi >= debtBounds.max ? '' : String(hi))
  }

  const applyPriceRange = (nextMin, nextMax) => {
    const lo = clamp(Math.round(Math.min(nextMin, nextMax)), priceBounds.min, priceBounds.max)
    const hi = clamp(Math.round(Math.max(nextMin, nextMax)), lo, priceBounds.max)
    setMinPrice(lo <= priceBounds.min ? '' : String(lo))
    setMaxPrice(hi >= priceBounds.max ? '' : String(hi))
  }

  return (
    <aside className="auction-desktop-filters debts-desktop-filters" aria-label={t('filters')}>
      <div className="auction-desktop-filters__head">
        <h2 className="auction-desktop-filters__title">{t('filters')}</h2>
      </div>

      {activeChips.length > 0 && (
        <div className="auction-desktop-filters__chips">
          {activeChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="auction-desktop-filters__chip"
              onClick={chip.onRemove}
            >
              <span>{chip.label}</span>
              <X size={14} aria-hidden />
            </button>
          ))}
        </div>
      )}

      <div className="auction-desktop-filters__sections">
        <FilterSection
          title={t('catalogFilterLocation')}
          open={openSections.location}
          onToggle={() => toggleSection('location')}
        >
          <div className="catalog-desktop-filters__location-fields">
            <label className="catalog-desktop-filters__select-label">
              <span>{t('catalogFilterCountry')}</span>
              <select
                className="auction-desktop-filters__input catalog-desktop-filters__select"
                value={countryValue}
                onChange={(e) => {
                  setCountry?.(e.target.value || 'all')
                  setCity?.('all')
                }}
              >
                <option value="">{t('catalogFilterAll')}</option>
                {locationOptions.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="catalog-desktop-filters__select-label">
              <span>{t('catalogFilterRegion')}</span>
              <select
                className="auction-desktop-filters__input catalog-desktop-filters__select"
                value={cityValue}
                onChange={(e) => setCity?.(e.target.value || 'all')}
                disabled={!countryValue}
              >
                <option value="">{t('catalogFilterAll')}</option>
                {(selectedCountry?.regions || []).map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </FilterSection>

        <FilterSection
          title={t('auctionFilterPropertyType')}
          open={openSections.type}
          onToggle={() => toggleSection('type')}
        >
          <ul className="auction-desktop-filters__checklist">
            {PROPERTY_TYPE_ITEMS.map((item) => (
              <li key={item.value}>
                <label className="auction-desktop-filters__check">
                  <input
                    type="checkbox"
                    checked={
                      item.value === 'все'
                        ? propertyTypes.length === 0
                        : propertyTypes.includes(item.value)
                    }
                    onChange={() => togglePropertyType(item.value)}
                  />
                  <span className="auction-desktop-filters__check-box" aria-hidden />
                  <span>{t(item.labelKey)}</span>
                </label>
              </li>
            ))}
          </ul>
        </FilterSection>

        <FilterSection
          title={t('debtsFilterObjectRisk')}
          open={openSections.risk}
          onToggle={() => toggleSection('risk')}
        >
          <ul className="auction-desktop-filters__checklist debts-desktop-filters__risk-list">
            {DEBTS_RISK_OPTIONS.map((item) => (
              <li key={item.value}>
                <label className="auction-desktop-filters__check debts-desktop-filters__risk-check">
                  <input
                    type="checkbox"
                    checked={risks.includes(item.value)}
                    onChange={() => toggleRisk(item.value)}
                  />
                  <span className="auction-desktop-filters__check-box" aria-hidden />
                  <span
                    className={`debts-desktop-filters__risk-dot debts-desktop-filters__risk-dot--${item.tone}`}
                    aria-hidden
                  />
                  <span>{t(item.labelKey)}</span>
                  <span className="debts-desktop-filters__risk-count">{statsByRisk[item.value] ?? 0}</span>
                </label>
              </li>
            ))}
          </ul>
        </FilterSection>

        <FilterSection
          title={t('debtsFilterDebtAmount')}
          open={openSections.debt}
          onToggle={() => toggleSection('debt')}
        >
          <div className="auction-desktop-filters__range-inputs">
            <input
              type="number"
              className="auction-desktop-filters__input"
              placeholder={String(debtBounds.min)}
              value={minDebt}
              onChange={(e) => setMinDebt(e.target.value.replace(/[^\d]/g, ''))}
              min={debtBounds.min}
              max={debtBounds.max}
            />
            <span className="auction-desktop-filters__range-sep">—</span>
            <input
              type="number"
              className="auction-desktop-filters__input"
              placeholder={String(debtBounds.max)}
              value={maxDebt}
              onChange={(e) => setMaxDebt(e.target.value.replace(/[^\d]/g, ''))}
              min={debtBounds.min}
              max={debtBounds.max}
            />
          </div>
          <div
            className="auction-desktop-filters__slider-track"
            style={{ '--range-left': `${debtFillLeft}%`, '--range-width': `${debtFillWidth}%` }}
          >
            <div className="auction-desktop-filters__slider-rail" aria-hidden />
            <div className="auction-desktop-filters__slider-fill" aria-hidden />
            <input
              type="range"
              className="auction-desktop-filters__range auction-desktop-filters__range--min"
              min={debtBounds.min}
              max={debtBounds.max}
              value={sliderDebtMin}
              onChange={(e) => applyDebtRange(Number(e.target.value), sliderDebtMax)}
              aria-label={t('debtsFilterDebtMin')}
            />
            <input
              type="range"
              className="auction-desktop-filters__range auction-desktop-filters__range--max"
              min={debtBounds.min}
              max={debtBounds.max}
              value={sliderDebtMax}
              onChange={(e) => applyDebtRange(sliderDebtMin, Number(e.target.value))}
              aria-label={t('debtsFilterDebtMax')}
            />
          </div>
          <div className="auction-desktop-filters__slider-scale" aria-hidden>
            <span>{debtBounds.min.toLocaleString()}</span>
            <span>{debtBounds.max.toLocaleString()}</span>
          </div>
        </FilterSection>

        <FilterSection
          title={t('auctionFilterPrice')}
          open={openSections.price}
          onToggle={() => toggleSection('price')}
        >
          <div className="auction-desktop-filters__range-inputs">
            <input
              type="number"
              className="auction-desktop-filters__input"
              placeholder={String(priceBounds.min)}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value.replace(/[^\d]/g, ''))}
              min={priceBounds.min}
              max={priceBounds.max}
            />
            <span className="auction-desktop-filters__range-sep">—</span>
            <input
              type="number"
              className="auction-desktop-filters__input"
              placeholder={String(priceBounds.max)}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d]/g, ''))}
              min={priceBounds.min}
              max={priceBounds.max}
            />
          </div>
          <div
            className="auction-desktop-filters__slider-track"
            style={{ '--range-left': `${priceFillLeft}%`, '--range-width': `${priceFillWidth}%` }}
          >
            <div className="auction-desktop-filters__slider-rail" aria-hidden />
            <div className="auction-desktop-filters__slider-fill" aria-hidden />
            <input
              type="range"
              className="auction-desktop-filters__range auction-desktop-filters__range--min"
              min={priceBounds.min}
              max={priceBounds.max}
              value={sliderPriceMin}
              onChange={(e) => applyPriceRange(Number(e.target.value), sliderPriceMax)}
              aria-label={t('auctionFilterPriceMin')}
            />
            <input
              type="range"
              className="auction-desktop-filters__range auction-desktop-filters__range--max"
              min={priceBounds.min}
              max={priceBounds.max}
              value={sliderPriceMax}
              onChange={(e) => applyPriceRange(sliderPriceMin, Number(e.target.value))}
              aria-label={t('auctionFilterPriceMax')}
            />
          </div>
          <div className="auction-desktop-filters__slider-scale" aria-hidden>
            <span>{priceBounds.min.toLocaleString()}</span>
            <span>{priceBounds.max.toLocaleString()}</span>
          </div>
        </FilterSection>
      </div>

      <div className="auction-desktop-filters__footer">
        <button type="button" className="auction-desktop-filters__apply" onClick={onApply}>
          {t('auctionApplyFilters')}
        </button>
        <button type="button" className="auction-desktop-filters__clear" onClick={handleReset}>
          {t('auctionClearAllFilters')}
        </button>
      </div>
    </aside>
  )
}

function FilterSection({ title, open, onToggle, children }) {
  return (
    <section className={`auction-desktop-filters__section${open ? ' is-open' : ''}`}>
      <button type="button" className="auction-desktop-filters__section-toggle" onClick={onToggle}>
        <span>{title}</span>
        <ChevronDown size={18} className="auction-desktop-filters__chevron" aria-hidden />
      </button>
      {open ? <div className="auction-desktop-filters__section-body">{children}</div> : null}
    </section>
  )
}

export default DebtsDesktopFilters
