import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiHeart } from 'react-icons/fi'
import {
  EMPTY_MAP_FILTERS,
  MAP_PROPERTY_TYPE_OPTIONS,
  MAP_PURCHASE_TYPE_OPTIONS,
  countActiveMapFilters,
} from '../utils/mapPageFilters'
import './MapPageFilters.css'

function sanitizePriceInput(raw) {
  return String(raw || '').replace(/\D/g, '')
}

function FilterDropdown({ id, title, active, open, onToggle, children }) {
  const panelId = `map-filter-panel-${id}`

  return (
    <div className={`map-page-filters__dropdown${open ? ' is-open' : ''}${active ? ' is-active' : ''}`}>
      <button
        type="button"
        className="map-page-filters__dropdown-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="map-page-filters__dropdown-label">{title}</span>
        <span className="map-page-filters__caret" aria-hidden />
      </button>
      <div id={panelId} className="map-page-filters__dropdown-panel">
        <div className="map-page-filters__dropdown-panel-inner">{children}</div>
      </div>
    </div>
  )
}

function FilterOption({ selected, onClick, children, radio = false }) {
  return (
    <li>
      <button
        type="button"
        className={`map-page-filters__option${selected ? ' is-selected' : ''}`}
        aria-pressed={selected}
        onClick={onClick}
      >
        <span>{children}</span>
        <span
          className={`map-page-filters__option-box${radio ? ' map-page-filters__option-box--radio' : ''}`}
          aria-hidden
        />
      </button>
    </li>
  )
}

export default function MapPageFilters({
  id = 'map-page-filters-panel',
  open = false,
  filters = EMPTY_MAP_FILTERS,
  onChange,
  priceBounds = { min: 0, max: 1_000_000 },
}) {
  const { t } = useTranslation()
  const activeCount = countActiveMapFilters(filters)
  const [openSection, setOpenSection] = useState(null)

  useEffect(() => {
    if (!open) setOpenSection(null)
  }, [open])

  const setFilters = (patch) => {
    onChange((prev) => ({ ...prev, ...patch }))
  }

  const toggleSection = (key) => {
    setOpenSection((prev) => (prev === key ? null : key))
  }

  const togglePurchaseType = (value) => {
    onChange((prev) => {
      const current = Array.isArray(prev.purchaseTypes) ? prev.purchaseTypes : []
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
      return { ...prev, purchaseTypes: next }
    })
  }

  const handleReset = () => {
    onChange({ ...EMPTY_MAP_FILTERS })
    setOpenSection(null)
  }

  return (
    <section
      id={id}
      className={`map-page-filters${open ? ' is-open' : ''}`}
      aria-label={t('filters')}
      aria-hidden={!open}
    >
      <div className="map-page-filters__panel">
        <div className="map-page-filters__panel-inner">
          <div className="map-page-filters__menu">
            <FilterDropdown
          id="sale"
          title={t('auctionFilterSaleType')}
          active={filters.purchaseTypes?.length > 0}
          open={openSection === 'sale'}
          onToggle={() => toggleSection('sale')}
        >
          <ul className="map-page-filters__options" role="group" aria-label={t('auctionFilterSaleType')}>
            {MAP_PURCHASE_TYPE_OPTIONS.map((option) => (
              <FilterOption
                key={option.value}
                selected={filters.purchaseTypes.includes(option.value)}
                onClick={() => togglePurchaseType(option.value)}
              >
                {t(option.labelKey)}
              </FilterOption>
            ))}
          </ul>
        </FilterDropdown>

        <FilterDropdown
          id="type"
          title={t('auctionFilterPropertyType')}
          active={Boolean(filters.propertyType)}
          open={openSection === 'type'}
          onToggle={() => toggleSection('type')}
        >
          <ul className="map-page-filters__options" role="group" aria-label={t('auctionFilterPropertyType')}>
            {MAP_PROPERTY_TYPE_OPTIONS.map((option) => (
              <FilterOption
                key={option.value || 'all'}
                selected={filters.propertyType === option.value}
                radio
                onClick={() => setFilters({ propertyType: option.value })}
              >
                {t(option.labelKey)}
              </FilterOption>
            ))}
          </ul>
        </FilterDropdown>

        <FilterDropdown
          id="price"
          title={t('auctionFilterPrice')}
          active={Boolean(filters.minPrice || filters.maxPrice)}
          open={openSection === 'price'}
          onToggle={() => toggleSection('price')}
        >
          <div className="map-page-filters__price-row">
            <label className="map-page-filters__price-field">
              <span>{t('mapFiltersPriceFrom', { defaultValue: 'От' })}</span>
              <input
                type="text"
                inputMode="numeric"
                className="map-page-filters__price-input"
                value={filters.minPrice}
                placeholder={String(priceBounds.min || 0)}
                onChange={(e) => setFilters({ minPrice: sanitizePriceInput(e.target.value) })}
              />
            </label>
            <span className="map-page-filters__price-sep" aria-hidden>
              —
            </span>
            <label className="map-page-filters__price-field">
              <span>{t('mapFiltersPriceTo', { defaultValue: 'До' })}</span>
              <input
                type="text"
                inputMode="numeric"
                className="map-page-filters__price-input"
                value={filters.maxPrice}
                placeholder={String(priceBounds.max || 0)}
                onChange={(e) => setFilters({ maxPrice: sanitizePriceInput(e.target.value) })}
              />
            </label>
          </div>
        </FilterDropdown>

        <label className={`map-page-filters__toggle-row${filters.likedOnly ? ' is-checked' : ''}`}>
          <span className="map-page-filters__toggle-main">
            <FiHeart size={18} strokeWidth={1.75} aria-hidden />
            <span>{t('favorites')}</span>
          </span>
          <input
            type="checkbox"
            className="map-page-filters__toggle-input"
            checked={filters.likedOnly}
            onChange={(e) => setFilters({ likedOnly: e.target.checked })}
          />
          <span className="map-page-filters__toggle-box" aria-hidden />
        </label>

            {activeCount > 0 ? (
              <button type="button" className="map-page-filters__reset-row" onClick={handleReset}>
                {t('mapFiltersReset', { defaultValue: 'Сбросить' })}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
