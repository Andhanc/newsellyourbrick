import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import FilterCollapsibleSection from './FilterCollapsibleSection'
import useFilterSectionState from '../hooks/useFilterSectionState'
import {
  AUCTION_DESKTOP_PROPERTY_TYPE_ITEMS,
  AUCTION_DESKTOP_SALE_TYPE_ITEMS,
} from '../utils/auctionDesktopFilterMatch'
import './AuctionDesktopFilters.css'

const PROPERTY_TYPE_ITEMS = AUCTION_DESKTOP_PROPERTY_TYPE_ITEMS
const SALE_TYPE_ITEMS = AUCTION_DESKTOP_SALE_TYPE_ITEMS

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function toggleListValue(list, value) {
  if (list.includes(value)) return list.filter((item) => item !== value)
  return [...list, value]
}

function AuctionDesktopFilters({
  propertyTypes,
  setPropertyTypes,
  saleFilters,
  setSaleFilters,
  locationOptions = [],
  country = '',
  city = '',
  setCountry,
  setCity,
  minArea,
  maxArea,
  setMinArea,
  setMaxArea,
  minPrice,
  maxPrice,
  setMinPrice,
  setMaxPrice,
  areaBounds,
  priceBounds,
  onApply,
  variant = 'sidebar',
}) {
  const { t } = useTranslation()

  const activeSectionKeys = useMemo(() => {
    const keys = []
    if (country || city) keys.push('location')
    if (propertyTypes.length > 0) keys.push('type')
    if (saleFilters.length > 0) keys.push('sale')
    if (minArea !== '' || maxArea !== '') keys.push('area')
    if (minPrice !== '' || maxPrice !== '') keys.push('price')
    return keys
  }, [country, city, propertyTypes, saleFilters, minArea, maxArea, minPrice, maxPrice])

  const [openSections, toggleSection] = useFilterSectionState(
    {
      location: true,
      type: true,
      sale: true,
      area: true,
      price: true,
    },
    activeSectionKeys,
  )
  const selectedCountry = useMemo(
    () => locationOptions.find((item) => item.key === country) || null,
    [locationOptions, country],
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
    saleFilters.forEach((saleValue) => {
      const item = SALE_TYPE_ITEMS.find((i) => i.value === saleValue)
      if (item) {
        chips.push({
          id: `sale-${saleValue}`,
          label: t(item.labelKey),
          onRemove: () => setSaleFilters((prev) => prev.filter((v) => v !== saleValue)),
        })
      }
    })
    if (country) {
      const countryLabel =
        locationOptions.find((item) => item.key === country)?.label || country
      chips.push({
        id: `country-${country}`,
        label: countryLabel,
        onRemove: () => {
          setCountry?.('')
          setCity?.('')
        },
      })
    }
    if (city) {
      const cityLabel =
        selectedCountry?.regions?.find((item) => item.key === city)?.label || city
      chips.push({
        id: `city-${city}`,
        label: cityLabel,
        onRemove: () => setCity?.(''),
      })
    }
    if (minArea !== '' || maxArea !== '') {
      chips.push({
        id: 'area',
        label: `${t('auctionFilterArea')}: ${minArea || areaBounds.min}–${maxArea || areaBounds.max} ${t('squareMeters')}`,
        onRemove: () => {
          setMinArea('')
          setMaxArea('')
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
    saleFilters,
    minArea,
    maxArea,
    minPrice,
    maxPrice,
    areaBounds.min,
    areaBounds.max,
    priceBounds.min,
    priceBounds.max,
    setPropertyTypes,
    setSaleFilters,
    setMinArea,
    setMaxArea,
    setMinPrice,
    setMaxPrice,
    country,
    city,
    locationOptions,
    selectedCountry,
    setCountry,
    setCity,
    t,
  ])

  const sliderAreaMin = minArea !== '' ? Number(minArea) : areaBounds.min
  const sliderAreaMax = maxArea !== '' ? Number(maxArea) : areaBounds.max
  const sliderPriceMin = minPrice !== '' ? Number(minPrice) : priceBounds.min
  const sliderPriceMax = maxPrice !== '' ? Number(maxPrice) : priceBounds.max

  const areaSpan = Math.max(1, areaBounds.max - areaBounds.min)
  const priceSpan = Math.max(1, priceBounds.max - priceBounds.min)
  const areaFillLeft = ((sliderAreaMin - areaBounds.min) / areaSpan) * 100
  const areaFillWidth = ((sliderAreaMax - sliderAreaMin) / areaSpan) * 100
  const priceFillLeft = ((sliderPriceMin - priceBounds.min) / priceSpan) * 100
  const priceFillWidth = ((sliderPriceMax - sliderPriceMin) / priceSpan) * 100

  const toggleSectionKey = toggleSection

  const handleReset = () => {
    setPropertyTypes([])
    setSaleFilters([])
    setCountry?.('')
    setCity?.('')
    setMinArea('')
    setMaxArea('')
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

  const toggleSaleType = (value) => {
    setSaleFilters((prev) => toggleListValue(prev, value))
  }

  const applyAreaRange = (nextMin, nextMax) => {
    const lo = clamp(Math.round(Math.min(nextMin, nextMax)), areaBounds.min, areaBounds.max)
    const hi = clamp(Math.round(Math.max(nextMin, nextMax)), lo, areaBounds.max)
    setMinArea(lo <= areaBounds.min ? '' : String(lo))
    setMaxArea(hi >= areaBounds.max ? '' : String(hi))
  }

  const applyPriceRange = (nextMin, nextMax) => {
    const lo = clamp(Math.round(Math.min(nextMin, nextMax)), priceBounds.min, priceBounds.max)
    const hi = clamp(Math.round(Math.max(nextMin, nextMax)), lo, priceBounds.max)
    setMinPrice(lo <= priceBounds.min ? '' : String(lo))
    setMaxPrice(hi >= priceBounds.max ? '' : String(hi))
  }

  return (
    <aside
      className={`auction-desktop-filters${
        variant === 'drawer' ? ' auction-desktop-filters--drawer' : ''
      }`}
      aria-label={t('filters')}
    >
      {variant !== 'drawer' ? (
        <div className="auction-desktop-filters__head">
          <h2 className="auction-desktop-filters__title">{t('filters')}</h2>
        </div>
      ) : null}

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
          title={t('catalogFilterLocation')}
          open={openSections.location}
          onToggle={() => toggleSectionKey('location')}
        >
          <div className="catalog-desktop-filters__location-fields">
            <label className="catalog-desktop-filters__select-label">
              <span>{t('catalogFilterCountry')}</span>
              <select
                className="auction-desktop-filters__input catalog-desktop-filters__select"
                value={country}
                onChange={(e) => {
                  setCountry?.(e.target.value)
                  setCity?.('')
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
                value={city}
                onChange={(e) => setCity?.(e.target.value)}
                disabled={!country}
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
        </FilterCollapsibleSection>

        <FilterCollapsibleSection
          title={t('auctionFilterPropertyType')}
          open={openSections.type}
          onToggle={() => toggleSectionKey('type')}
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
        </FilterCollapsibleSection>

        <FilterCollapsibleSection
          title={t('auctionFilterSaleType')}
          open={openSections.sale}
          onToggle={() => toggleSectionKey('sale')}
        >
          <ul className="auction-desktop-filters__checklist">
            {SALE_TYPE_ITEMS.map((item) => (
              <li key={item.value}>
                <label className="auction-desktop-filters__check">
                  <input
                    type="checkbox"
                    checked={saleFilters.includes(item.value)}
                    onChange={() => toggleSaleType(item.value)}
                  />
                  <span className="auction-desktop-filters__check-box" aria-hidden />
                  <span>{t(item.labelKey)}</span>
                </label>
              </li>
            ))}
          </ul>
        </FilterCollapsibleSection>

        <FilterCollapsibleSection
          title={t('auctionFilterArea')}
          open={openSections.area}
          onToggle={() => toggleSectionKey('area')}
        >
          <div className="auction-desktop-filters__range-inputs">
            <input
              type="number"
              className="auction-desktop-filters__input"
              placeholder={String(areaBounds.min)}
              value={minArea}
              onChange={(e) => setMinArea(e.target.value.replace(/[^\d]/g, ''))}
              min={areaBounds.min}
              max={areaBounds.max}
            />
            <span className="auction-desktop-filters__range-sep">—</span>
            <input
              type="number"
              className="auction-desktop-filters__input"
              placeholder={String(areaBounds.max)}
              value={maxArea}
              onChange={(e) => setMaxArea(e.target.value.replace(/[^\d]/g, ''))}
              min={areaBounds.min}
              max={areaBounds.max}
            />
          </div>
          <div
            className="auction-desktop-filters__slider-track"
            style={{ '--range-left': `${areaFillLeft}%`, '--range-width': `${areaFillWidth}%` }}
          >
            <div className="auction-desktop-filters__slider-rail" aria-hidden />
            <div className="auction-desktop-filters__slider-fill" aria-hidden />
            <input
              type="range"
              className="auction-desktop-filters__range auction-desktop-filters__range--min"
              min={areaBounds.min}
              max={areaBounds.max}
              value={sliderAreaMin}
              onChange={(e) => applyAreaRange(Number(e.target.value), sliderAreaMax)}
              aria-label={t('auctionFilterAreaMin')}
            />
            <input
              type="range"
              className="auction-desktop-filters__range auction-desktop-filters__range--max"
              min={areaBounds.min}
              max={areaBounds.max}
              value={sliderAreaMax}
              onChange={(e) => applyAreaRange(sliderAreaMin, Number(e.target.value))}
              aria-label={t('auctionFilterAreaMax')}
            />
          </div>
          <div className="auction-desktop-filters__slider-scale" aria-hidden>
            <span>{areaBounds.min}</span>
            <span>{areaBounds.max}</span>
          </div>
          <p className="auction-desktop-filters__range-hint">
            {t('auctionFilterFromTo', {
              from: minArea || areaBounds.min,
              to: maxArea || areaBounds.max,
              unit: t('squareMeters'),
            })}
          </p>
        </FilterCollapsibleSection>

        <FilterCollapsibleSection
          title={t('auctionFilterPrice')}
          open={openSections.price}
          onToggle={() => toggleSectionKey('price')}
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
          <p className="auction-desktop-filters__range-hint">
            {t('auctionFilterFromTo', {
              from: minPrice || priceBounds.min,
              to: maxPrice || priceBounds.max,
              unit: '',
            })}
          </p>
        </FilterCollapsibleSection>
      </div>

      {variant !== 'drawer' ? (
        <div className="auction-desktop-filters__footer">
          <button type="button" className="auction-desktop-filters__apply" onClick={onApply}>
            {t('auctionApplyFilters')}
          </button>
          <button type="button" className="auction-desktop-filters__clear" onClick={handleReset}>
            {t('auctionClearAllFilters')}
          </button>
        </div>
      ) : null}
    </aside>
  )
}

export default AuctionDesktopFilters
