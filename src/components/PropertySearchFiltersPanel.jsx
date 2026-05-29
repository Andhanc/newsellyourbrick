import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiChevronDown, FiSearch } from 'react-icons/fi'
import { getApiBaseUrl } from '../utils/apiConfig'
import { fetchDedupe } from '../utils/fetchDedupe'
import {
  CATALOG_FILTER_CURRENCY_CODES,
  getCatalogFilterCurrencies,
  getCurrencySymbol,
  normalizeCurrencyCode,
} from '../utils/currency'
import {
  hasCatalogPriceFilter,
  validateCatalogPriceRange,
} from '../utils/catalogPriceFilter'
import './PropertySearchFiltersPanel.css'

const PROPERTY_TYPE_KEYS = [
  'propertyTypeFlat',
  'propertyTypeApartment',
  'propertyTypeVilla',
  'propertyTypeHouse',
  'propertyTypeTownhouse',
]
const PROPERTY_TYPE_VALUES = ['Квартира', 'Апартаменты', 'Вилла', 'Дом', 'Таунхаус']
const PURCHASE_TYPE_OPTIONS = [
  { value: 'auction', labelKey: 'modalPurchaseTypeAuction' },
  { value: 'buy_now', labelKey: 'modalPurchaseTypeBuyNow' },
  { value: 'shares', labelKey: 'modalPurchaseTypeShares' },
  { value: 'debt', labelKey: 'modalPurchaseTypeDebt' },
  { value: 'direct', labelKey: 'modalPurchaseTypeDirect' },
]

export const EMPTY_CATALOG_FILTERS = {
  country: '',
  region: '',
  propertyType: '',
  purchaseTypes: [],
  purchaseType: '',
  currency: '',
  minPrice: '',
  maxPrice: '',
}

function mergeFiltersFromSource(source, prev) {
  if (!source || typeof source !== 'object') return prev
  return {
    ...prev,
    country: source.country || '',
    region: source.region || '',
    propertyType: source.propertyType || '',
    purchaseTypes: Array.isArray(source.purchaseTypes)
      ? source.purchaseTypes.slice(0, 3)
      : source.purchaseType
        ? [source.purchaseType]
        : [],
    currency: (() => {
      const code = source.currency ? normalizeCurrencyCode(source.currency) : ''
      return CATALOG_FILTER_CURRENCY_CODES.includes(code) ? code : ''
    })(),
    minPrice: source.minPrice != null ? String(source.minPrice) : '',
    maxPrice: source.maxPrice != null ? String(source.maxPrice) : '',
  }
}

function sanitizePriceInput(raw) {
  return String(raw || '').replace(/\D/g, '')
}

function CatalogPriceField({
  label,
  value,
  onChange,
  activeCurrency,
  currencyList,
  dropdownOpen,
  onToggleCurrencyDropdown,
  onSelectCurrency,
  fieldClassName = '',
}) {
  const symbol = getCurrencySymbol(activeCurrency)

  return (
    <label
      className={`property-search-filters-panel__field property-search-filters-panel__field--price ${fieldClassName}`.trim()}
    >
      <span>{label}</span>
      <div
        className={`psf-currency-input-wrap${dropdownOpen ? ' is-open' : ''}`}
      >
        <button
          type="button"
          className="psf-currency-button"
          aria-expanded={dropdownOpen}
          aria-haspopup="listbox"
          onClick={onToggleCurrencyDropdown}
        >
          <span>{symbol}</span>
          <FiChevronDown className="psf-currency-chevron" size={14} aria-hidden />
        </button>
        {dropdownOpen ? (
          <div className="psf-currency-dropdown" role="listbox">
            {currencyList.map((curr) => (
              <button
                key={curr.code}
                type="button"
                role="option"
                aria-selected={activeCurrency === curr.code}
                className={`psf-currency-option${activeCurrency === curr.code ? ' is-active' : ''}`}
                onClick={() => onSelectCurrency(curr.code)}
              >
                <span>{curr.symbol}</span>
                <span>{curr.code}</span>
              </button>
            ))}
          </div>
        ) : null}
        <input
          type="text"
          className="property-search-filters-panel__input psf-currency-input"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
        />
      </div>
    </label>
  )
}

const PropertySearchFiltersPanel = ({ onApplyFilters, initialFilters = null }) => {
  const { t } = useTranslation()
  const panelRef = useRef(null)
  const [filters, setFilters] = useState(EMPTY_CATALOG_FILTERS)
  const [locationOptions, setLocationOptions] = useState([])
  const [defaultCurrency, setDefaultCurrency] = useState('EUR')
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [priceErrorKey, setPriceErrorKey] = useState('')
  const [currencyDropdownAnchor, setCurrencyDropdownAnchor] = useState(null)

  const activeCurrency = filters.currency || defaultCurrency

  const currencyList = useMemo(() => getCatalogFilterCurrencies(), [])

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
        const apiDefault = json?.data?.defaultCurrency
        if (apiDefault && getCatalogFilterCurrencies().some((c) => c.code === apiDefault)) {
          setDefaultCurrency(apiDefault)
        }
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

  useEffect(() => {
    if (initialFilters && typeof initialFilters === 'object') {
      setFilters((prev) => mergeFiltersFromSource(initialFilters, prev))
      return
    }

    try {
      const raw = sessionStorage.getItem('propertySearchFilters')
      if (!raw) return
      const parsed = JSON.parse(raw)
      setFilters((prev) => mergeFiltersFromSource(parsed, prev))
    } catch {
      // ignore broken persisted filters
    }
  }, [initialFilters])

  useEffect(() => {
    if (filters.currency || !defaultCurrency) return
    if (hasCatalogPriceFilter(filters)) {
      setFilters((prev) => ({ ...prev, currency: defaultCurrency }))
    }
  }, [defaultCurrency, filters.currency, filters.minPrice, filters.maxPrice])

  useEffect(() => {
    if (!currencyDropdownAnchor) return
    const onPointerDown = (event) => {
      if (!panelRef.current?.contains(event.target)) {
        setCurrencyDropdownAnchor(null)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [currencyDropdownAnchor])

  const selectedCountry = useMemo(
    () => locationOptions.find((country) => country.key === filters.country),
    [filters.country, locationOptions]
  )

  const handleCountryChange = (value) => {
    setFilters((prev) => ({
      ...prev,
      country: value,
      region: '',
    }))
  }

  const togglePurchaseType = (value) => {
    setFilters((prev) => {
      const exists = prev.purchaseTypes.includes(value)
      if (exists) {
        return {
          ...prev,
          purchaseTypes: prev.purchaseTypes.filter((item) => item !== value),
        }
      }
      if (prev.purchaseTypes.length >= 3) return prev
      return {
        ...prev,
        purchaseTypes: [...prev.purchaseTypes, value],
      }
    })
  }

  const handlePriceChange = (field, raw) => {
    const nextValue = sanitizePriceInput(raw)
    setPriceErrorKey('')
    setFilters((prev) => {
      const next = { ...prev, [field]: nextValue }
      if ((field === 'minPrice' || field === 'maxPrice') && nextValue && !prev.currency) {
        next.currency = defaultCurrency
      }
      return next
    })
  }

  const handleSelectCurrency = (code) => {
    setPriceErrorKey('')
    setFilters((prev) => ({ ...prev, currency: normalizeCurrencyCode(code) }))
    setCurrencyDropdownAnchor(null)
  }

  const handleSearch = () => {
    setPriceErrorKey('')

    const rangeCheck = validateCatalogPriceRange(filters.minPrice, filters.maxPrice)
    if (!rangeCheck.valid) {
      setPriceErrorKey(rangeCheck.errorKey || 'catalogPriceRangeInvalid')
      return
    }

    const resolvedCurrency = hasCatalogPriceFilter(filters)
      ? normalizeCurrencyCode(filters.currency || defaultCurrency)
      : filters.currency
        ? normalizeCurrencyCode(filters.currency)
        : ''

    const payload = {
      ...filters,
      currency: resolvedCurrency,
      purchaseType:
        filters.purchaseTypes.length === 1 ? filters.purchaseTypes[0] : '',
    }
    sessionStorage.setItem('propertySearchFilters', JSON.stringify(payload))
    if (typeof onApplyFilters === 'function') {
      onApplyFilters(payload)
    }
  }

  const makeCurrencyDropdownProps = (anchor) => ({
    activeCurrency,
    currencyList,
    dropdownOpen: currencyDropdownAnchor === anchor,
    onToggleCurrencyDropdown: () =>
      setCurrencyDropdownAnchor((current) => (current === anchor ? null : anchor)),
    onSelectCurrency: handleSelectCurrency,
  })

  return (
    <section className="property-search-filters-panel" ref={panelRef}>
      <div className="property-search-filters-panel__container">
        <div className="property-search-filters-panel__content">
          <div
            className="property-search-filters-panel__sale-types"
            role="group"
            aria-label={t('modalPurchaseType')}
          >
            {PURCHASE_TYPE_OPTIONS.map((option) => {
              const active = filters.purchaseTypes.includes(option.value)
              const disabled = !active && filters.purchaseTypes.length >= 3
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`property-search-filters-panel__chip${active ? ' is-active' : ''}`}
                  onClick={() => togglePurchaseType(option.value)}
                  disabled={disabled}
                  aria-pressed={active}
                >
                  {t(option.labelKey)}
                </button>
              )
            })}
          </div>

          <div className="property-search-filters-panel__form">
            <label className="property-search-filters-panel__field">
              <span>{t('catalogFilterCountry')}</span>
              <select
                className="property-search-filters-panel__input"
                value={filters.country}
                onChange={(e) => handleCountryChange(e.target.value)}
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

            <label className="property-search-filters-panel__field">
              <span>{t('catalogFilterRegion')}</span>
              <select
                className="property-search-filters-panel__input"
                value={filters.region}
                onChange={(e) => setFilters((prev) => ({ ...prev, region: e.target.value }))}
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

            <label className="property-search-filters-panel__field">
              <span>{t('modalPropertyType')}</span>
              <select
                className="property-search-filters-panel__input"
                value={filters.propertyType}
                onChange={(e) => setFilters((prev) => ({ ...prev, propertyType: e.target.value }))}
              >
                <option value="">{t('catalogFilterAllTypes')}</option>
                {PROPERTY_TYPE_VALUES.map((type, index) => (
                  <option key={type} value={type}>
                    {t(PROPERTY_TYPE_KEYS[index])}
                  </option>
                ))}
              </select>
            </label>

            <CatalogPriceField
              label={t('modalFrom')}
              value={filters.minPrice}
              onChange={(raw) => handlePriceChange('minPrice', raw)}
              fieldClassName="property-search-filters-panel__field--price-from"
              {...makeCurrencyDropdownProps('from')}
            />

            <CatalogPriceField
              label={t('modalTo')}
              value={filters.maxPrice}
              onChange={(raw) => handlePriceChange('maxPrice', raw)}
              fieldClassName="property-search-filters-panel__field--price-to"
              {...makeCurrencyDropdownProps('to')}
            />

            <button
              className="property-search-filters-panel__button"
              type="button"
              onClick={handleSearch}
            >
              <FiSearch size={18} />
              <span>{t('modalFind')}</span>
            </button>
          </div>

          {priceErrorKey ? (
            <p className="property-search-filters-panel__price-error" role="alert">
              {t(priceErrorKey)}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default PropertySearchFiltersPanel
