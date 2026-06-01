import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, X } from 'lucide-react'
import { getApiBaseUrl } from '../utils/apiConfig'
import { fetchDedupe } from '../utils/fetchDedupe'
import {
  CATALOG_PROPERTY_TYPE_OPTIONS,
  CATALOG_PURCHASE_TYPE_OPTIONS,
  CATALOG_ROOM_OPTIONS,
  getCatalogFilterProfile,
} from '../utils/catalogFilters'
import './AuctionDesktopFilters.css'

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
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

function CatalogDesktopFilters({
  filters,
  onChange,
  priceBounds,
  onApply,
}) {
  const { t } = useTranslation()
  const [locationOptions, setLocationOptions] = useState([])
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [openSections, setOpenSections] = useState({
    location: true,
    purchase: true,
    type: true,
    rooms: true,
    price: true,
  })

  const profile = getCatalogFilterProfile(filters.propertyType)

  const selectedCountry = useMemo(
    () => locationOptions.find((country) => country.key === filters.country),
    [filters.country, locationOptions],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setOptionsLoading(true)
        const base = await getApiBaseUrl()
        const res = await fetchDedupe(`${base}/properties/search-options?_=${Date.now()}`)
        if (!res.ok || cancelled) return
        const json = await res.json()
        if (!json?.success || cancelled) return
        setLocationOptions(Array.isArray(json?.data?.locations) ? json.data.locations : [])
      } catch {
        if (!cancelled) setLocationOptions([])
      } finally {
        if (!cancelled) setOptionsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const patch = (partial) => onChange((prev) => ({ ...prev, ...partial }))

  const togglePurchaseType = (value) => {
    onChange((prev) => {
      const exists = prev.purchaseTypes.includes(value)
      if (exists) {
        return { ...prev, purchaseTypes: prev.purchaseTypes.filter((item) => item !== value) }
      }
      return { ...prev, purchaseTypes: [...prev.purchaseTypes, value] }
    })
  }

  const activeChips = useMemo(() => {
    const chips = []
    if (filters.country) {
      const country = locationOptions.find((c) => c.key === filters.country)
      chips.push({
        id: 'country',
        label: country?.label || filters.country,
        onRemove: () => patch({ country: '', region: '' }),
      })
    }
    if (filters.region) {
      const region = selectedCountry?.regions?.find((r) => r.key === filters.region)
      chips.push({
        id: 'region',
        label: region?.label || filters.region,
        onRemove: () => patch({ region: '' }),
      })
    }
    if (filters.propertyType) {
      const item = CATALOG_PROPERTY_TYPE_OPTIONS.find((i) => i.value === filters.propertyType)
      if (item) {
        chips.push({
          id: `type-${filters.propertyType}`,
          label: t(item.labelKey),
          onRemove: () => patch({ propertyType: '', rooms: '' }),
        })
      }
    }
    for (const purchaseType of filters.purchaseTypes) {
      const item = CATALOG_PURCHASE_TYPE_OPTIONS.find((i) => i.value === purchaseType)
      if (item) {
        chips.push({
          id: `purchase-${purchaseType}`,
          label: t(item.labelKey),
          onRemove: () =>
            onChange((prev) => ({
              ...prev,
              purchaseTypes: prev.purchaseTypes.filter((v) => v !== purchaseType),
            })),
        })
      }
    }
    if (filters.rooms) {
      const room = CATALOG_ROOM_OPTIONS.find((r) => r.value === filters.rooms)
      chips.push({
        id: 'rooms',
        label: `${t('modalRooms')}: ${room?.label || filters.rooms}`,
        onRemove: () => patch({ rooms: '' }),
      })
    }
    if (filters.minPrice !== '' || filters.maxPrice !== '') {
      chips.push({
        id: 'price',
        label: `${t('auctionFilterPrice')}: ${filters.minPrice || priceBounds.min}–${filters.maxPrice || priceBounds.max}`,
        onRemove: () => patch({ minPrice: '', maxPrice: '' }),
      })
    }
    return chips
  }, [
    filters,
    locationOptions,
    selectedCountry,
    priceBounds.min,
    priceBounds.max,
    onChange,
    t,
  ])

  const sliderPriceMin = filters.minPrice !== '' ? Number(filters.minPrice) : priceBounds.min
  const sliderPriceMax = filters.maxPrice !== '' ? Number(filters.maxPrice) : priceBounds.max

  const priceSpan = Math.max(1, priceBounds.max - priceBounds.min)
  const priceFillLeft = ((sliderPriceMin - priceBounds.min) / priceSpan) * 100
  const priceFillWidth = ((sliderPriceMax - sliderPriceMin) / priceSpan) * 100

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleReset = () => {
    onChange(() => ({
      country: '',
      region: '',
      propertyType: '',
      purchaseTypes: [],
      purchaseType: '',
      currency: '',
      minPrice: '',
      maxPrice: '',
      rooms: '',
      minArea: '',
      maxArea: '',
    }))
  }

  const applyPriceRange = (nextMin, nextMax) => {
    const lo = clamp(Math.round(Math.min(nextMin, nextMax)), priceBounds.min, priceBounds.max)
    const hi = clamp(Math.round(Math.max(nextMin, nextMax)), lo, priceBounds.max)
    patch({
      minPrice: lo <= priceBounds.min ? '' : String(lo),
      maxPrice: hi >= priceBounds.max ? '' : String(hi),
    })
  }

  return (
    <aside className="auction-desktop-filters catalog-desktop-filters" aria-label={t('filters')}>
      <div className="auction-desktop-filters__head">
        <h2 className="auction-desktop-filters__title">{t('filters')}</h2>
      </div>

      {activeChips.length > 0 ? (
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
      ) : null}

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
                value={filters.country}
                onChange={(e) => patch({ country: e.target.value, region: '' })}
                disabled={optionsLoading}
              >
                <option value="">{t('catalogFilterAll')}</option>
                {locationOptions.map((country) => (
                  <option key={country.key} value={country.key}>
                    {country.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="catalog-desktop-filters__select-label">
              <span>{t('catalogFilterRegion')}</span>
              <select
                className="auction-desktop-filters__input catalog-desktop-filters__select"
                value={filters.region}
                onChange={(e) => patch({ region: e.target.value })}
                disabled={!filters.country}
              >
                <option value="">{t('catalogFilterAll')}</option>
                {(selectedCountry?.regions || []).map((region) => (
                  <option key={region.key} value={region.key}>
                    {region.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </FilterSection>

        <FilterSection
          title={t('modalPurchaseType')}
          open={openSections.purchase}
          onToggle={() => toggleSection('purchase')}
        >
          <ul className="auction-desktop-filters__checklist">
            {CATALOG_PURCHASE_TYPE_OPTIONS.map((item) => (
              <li key={item.value}>
                <label className="auction-desktop-filters__check">
                  <input
                    type="checkbox"
                    checked={filters.purchaseTypes.includes(item.value)}
                    onChange={() => togglePurchaseType(item.value)}
                  />
                  <span className="auction-desktop-filters__check-box" aria-hidden />
                  <span>{t(item.labelKey)}</span>
                </label>
              </li>
            ))}
          </ul>
        </FilterSection>

        <FilterSection
          title={t('auctionFilterPropertyType')}
          open={openSections.type}
          onToggle={() => toggleSection('type')}
        >
          <ul className="auction-desktop-filters__checklist">
            {CATALOG_PROPERTY_TYPE_OPTIONS.map((item) => (
              <li key={item.value || 'all'}>
                <label className="auction-desktop-filters__check">
                  <input
                    type="checkbox"
                    checked={filters.propertyType === item.value}
                    onChange={() =>
                      patch({
                        propertyType: item.value,
                        rooms: item.value && !getCatalogFilterProfile(item.value).rooms ? '' : filters.rooms,
                      })
                    }
                  />
                  <span className="auction-desktop-filters__check-box" aria-hidden />
                  <span>{t(item.labelKey)}</span>
                </label>
              </li>
            ))}
          </ul>
        </FilterSection>

        {profile.rooms ? (
          <FilterSection
            title={t('modalRooms')}
            open={openSections.rooms}
            onToggle={() => toggleSection('rooms')}
          >
            <div className="catalog-desktop-filters__room-pills" role="group" aria-label={t('modalRooms')}>
              {CATALOG_ROOM_OPTIONS.map((opt) => {
                const isActive = filters.rooms === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`catalog-desktop-filters__room-pill${isActive ? ' is-active' : ''}`}
                    aria-pressed={isActive}
                    onClick={() => patch({ rooms: isActive ? '' : opt.value })}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </FilterSection>
        ) : null}

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
              value={filters.minPrice}
              onChange={(e) => patch({ minPrice: e.target.value.replace(/[^\d]/g, '') })}
              min={priceBounds.min}
              max={priceBounds.max}
            />
            <span className="auction-desktop-filters__range-sep">—</span>
            <input
              type="number"
              className="auction-desktop-filters__input"
              placeholder={String(priceBounds.max)}
              value={filters.maxPrice}
              onChange={(e) => patch({ maxPrice: e.target.value.replace(/[^\d]/g, '') })}
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

export default CatalogDesktopFilters
