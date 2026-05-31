import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, X } from 'lucide-react'
import './AuctionDesktopFilters.css'

const PROPERTY_TYPE_ITEMS = [
  { value: 'все', labelKey: 'propertyTypeAll' },
  { value: 'квартира', labelKey: 'propertyTypeFlat' },
  { value: 'апартаменты', labelKey: 'propertyTypeApartment' },
  { value: 'вилла', labelKey: 'propertyTypeVilla' },
  { value: 'дом', labelKey: 'propertyTypeHouse' },
]

const SALE_TYPE_ITEMS = [
  { value: 'auction', labelKey: 'modalPurchaseTypeAuction' },
  { value: 'buy_now', labelKey: 'buyNowSectionTitle' },
  { value: 'ended', labelKey: 'auctionFilterEnded' },
]

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function AuctionDesktopFilters({
  propertyType,
  setPropertyType,
  saleFilter,
  setSaleFilter,
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
}) {
  const { t } = useTranslation()
  const [openSections, setOpenSections] = useState({
    type: true,
    sale: true,
    area: true,
    price: true,
  })

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
    if (saleFilter !== 'all') {
      const item = SALE_TYPE_ITEMS.find((i) => i.value === saleFilter)
      if (item) {
        chips.push({
          id: `sale-${saleFilter}`,
          label: t(item.labelKey),
          onRemove: () => setSaleFilter('all'),
        })
      }
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
    propertyType,
    saleFilter,
    minArea,
    maxArea,
    minPrice,
    maxPrice,
    areaBounds.min,
    areaBounds.max,
    priceBounds.min,
    priceBounds.max,
    setPropertyType,
    setSaleFilter,
    setMinArea,
    setMaxArea,
    setMinPrice,
    setMaxPrice,
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

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleReset = () => {
    setPropertyType('все')
    setSaleFilter('all')
    setMinArea('')
    setMaxArea('')
    setMinPrice('')
    setMaxPrice('')
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
                    checked={propertyType === item.value}
                    onChange={() => {
                      setPropertyType(item.value)
                      if (item.value !== 'все') setSaleFilter('all')
                    }}
                  />
                  <span className="auction-desktop-filters__check-box" aria-hidden />
                  <span>{t(item.labelKey)}</span>
                </label>
              </li>
            ))}
          </ul>
        </FilterSection>

        <FilterSection
          title={t('auctionFilterSaleType')}
          open={openSections.sale}
          onToggle={() => toggleSection('sale')}
        >
          <ul className="auction-desktop-filters__checklist">
            {SALE_TYPE_ITEMS.map((item) => (
              <li key={item.value}>
                <label className="auction-desktop-filters__check">
                  <input
                    type="checkbox"
                    checked={saleFilter === item.value}
                    onChange={() => {
                      setSaleFilter(saleFilter === item.value ? 'all' : item.value)
                      setPropertyType('все')
                    }}
                  />
                  <span className="auction-desktop-filters__check-box" aria-hidden />
                  <span>{t(item.labelKey)}</span>
                </label>
              </li>
            ))}
          </ul>
        </FilterSection>

        <FilterSection
          title={t('auctionFilterArea')}
          open={openSections.area}
          onToggle={() => toggleSection('area')}
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
            <input
              type="range"
              className="auction-desktop-filters__range auction-desktop-filters__range--min"
              min={areaBounds.min}
              max={areaBounds.max}
              value={sliderAreaMin}
              onChange={(e) => applyAreaRange(Number(e.target.value), sliderAreaMax)}
            />
            <input
              type="range"
              className="auction-desktop-filters__range auction-desktop-filters__range--max"
              min={areaBounds.min}
              max={areaBounds.max}
              value={sliderAreaMax}
              onChange={(e) => applyAreaRange(sliderAreaMin, Number(e.target.value))}
            />
          </div>
          <p className="auction-desktop-filters__range-hint">
            {t('auctionFilterFromTo', {
              from: minArea || areaBounds.min,
              to: maxArea || areaBounds.max,
              unit: t('squareMeters'),
            })}
          </p>
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
            <input
              type="range"
              className="auction-desktop-filters__range auction-desktop-filters__range--min"
              min={priceBounds.min}
              max={priceBounds.max}
              value={sliderPriceMin}
              onChange={(e) => applyPriceRange(Number(e.target.value), sliderPriceMax)}
            />
            <input
              type="range"
              className="auction-desktop-filters__range auction-desktop-filters__range--max"
              min={priceBounds.min}
              max={priceBounds.max}
              value={sliderPriceMax}
              onChange={(e) => applyPriceRange(sliderPriceMin, Number(e.target.value))}
            />
          </div>
          <p className="auction-desktop-filters__range-hint">
            {t('auctionFilterFromTo', {
              from: minPrice || priceBounds.min,
              to: maxPrice || priceBounds.max,
              unit: '',
            })}
          </p>
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

export default AuctionDesktopFilters
