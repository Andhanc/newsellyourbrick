import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import FilterCollapsibleSection from './FilterCollapsibleSection'
import useFilterSectionState from '../hooks/useFilterSectionState'
import { AUCTION_DESKTOP_PROPERTY_TYPE_ITEMS } from '../utils/auctionDesktopFilterMatch'
import './AuctionDesktopFilters.css'

const PROPERTY_TYPE_ITEMS = AUCTION_DESKTOP_PROPERTY_TYPE_ITEMS

const AVAILABILITY_ITEMS = [
  { value: 'available', labelKey: 'sharesFilterAvailable' },
  { value: 'sold_out', labelKey: 'sharesFilterSoldOutOnly' },
]

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function SharesDesktopFilters({
  propertyType,
  setPropertyType,
  availabilityFilter,
  setAvailabilityFilter,
  minPrice,
  maxPrice,
  setMinPrice,
  setMaxPrice,
  priceBounds,
  onApply,
}) {
  const { t } = useTranslation()

  const activeSectionKeys = useMemo(() => {
    const keys = []
    if (propertyType !== 'все') keys.push('type')
    if (availabilityFilter !== 'all') keys.push('availability')
    if (minPrice !== '' || maxPrice !== '') keys.push('price')
    return keys
  }, [propertyType, availabilityFilter, minPrice, maxPrice])

  const [openSections, toggleSection] = useFilterSectionState(
    {
      type: true,
      availability: true,
      price: true,
    },
    activeSectionKeys,
  )

  const activeChips = useMemo(() => {
    const chips = []
    if (propertyType !== 'все') {
      const item = PROPERTY_TYPE_ITEMS.find((i) => i.value === propertyType)
      if (item) {
        chips.push({
          id: `type-${propertyType}`,
          label: t(item.labelKey),
          onRemove: () => setPropertyType('все'),
        })
      }
    }
    if (availabilityFilter !== 'all') {
      const item = AVAILABILITY_ITEMS.find((i) => i.value === availabilityFilter)
      if (item) {
        chips.push({
          id: `availability-${availabilityFilter}`,
          label: t(item.labelKey),
          onRemove: () => setAvailabilityFilter('all'),
        })
      }
    }
    if (minPrice !== '' || maxPrice !== '') {
      chips.push({
        id: 'price',
        label: `${t('sharesFilterPricePerShare')}: ${minPrice || priceBounds.min}–${maxPrice || priceBounds.max}`,
        onRemove: () => {
          setMinPrice('')
          setMaxPrice('')
        },
      })
    }
    return chips
  }, [
    propertyType,
    availabilityFilter,
    minPrice,
    maxPrice,
    priceBounds.min,
    priceBounds.max,
    setPropertyType,
    setAvailabilityFilter,
    setMinPrice,
    setMaxPrice,
    t,
  ])

  const sliderPriceMin = minPrice !== '' ? Number(minPrice) : priceBounds.min
  const sliderPriceMax = maxPrice !== '' ? Number(maxPrice) : priceBounds.max

  const priceSpan = Math.max(1, priceBounds.max - priceBounds.min)
  const priceFillLeft = ((sliderPriceMin - priceBounds.min) / priceSpan) * 100
  const priceFillWidth = ((sliderPriceMax - sliderPriceMin) / priceSpan) * 100

  const handleReset = () => {
    setPropertyType('все')
    setAvailabilityFilter('all')
    setMinPrice('')
    setMaxPrice('')
  }

  const applyPriceRange = (nextMin, nextMax) => {
    const lo = clamp(Math.round(Math.min(nextMin, nextMax)), priceBounds.min, priceBounds.max)
    const hi = clamp(Math.round(Math.max(nextMin, nextMax)), lo, priceBounds.max)
    setMinPrice(lo <= priceBounds.min ? '' : String(lo))
    setMaxPrice(hi >= priceBounds.max ? '' : String(hi))
  }

  return (
    <aside className="auction-desktop-filters" aria-label={t('filters')}>
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
        <FilterCollapsibleSection
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
                    checked={propertyType === item.value}
                    onChange={() => setPropertyType(item.value)}
                  />
                  <span className="auction-desktop-filters__check-box" aria-hidden />
                  <span>{t(item.labelKey)}</span>
                </label>
              </li>
            ))}
          </ul>
        </FilterCollapsibleSection>

        <FilterCollapsibleSection
          title={t('sharesFilterAvailability')}
          open={openSections.availability}
          onToggle={() => toggleSection('availability')}
        >
          <ul className="auction-desktop-filters__checklist">
            {AVAILABILITY_ITEMS.map((item) => (
              <li key={item.value}>
                <label className="auction-desktop-filters__check">
                  <input
                    type="checkbox"
                    checked={availabilityFilter === item.value}
                    onChange={() =>
                      setAvailabilityFilter(availabilityFilter === item.value ? 'all' : item.value)
                    }
                  />
                  <span className="auction-desktop-filters__check-box" aria-hidden />
                  <span>{t(item.labelKey)}</span>
                </label>
              </li>
            ))}
          </ul>
        </FilterCollapsibleSection>

        <FilterCollapsibleSection
          title={t('sharesFilterPricePerShare')}
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
            <span>{priceBounds.min}</span>
            <span>{priceBounds.max}</span>
          </div>
          <p className="auction-desktop-filters__range-hint">
            {t('auctionFilterFromTo', {
              from: minPrice || priceBounds.min,
              to: maxPrice || priceBounds.max,
              unit: '',
            })}
          </p>
        </FilterCollapsibleSection>
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

export default SharesDesktopFilters
