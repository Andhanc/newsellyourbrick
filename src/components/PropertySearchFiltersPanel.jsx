import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiChevronDown, FiSearch } from 'react-icons/fi'
import { getApiBaseUrl } from '../utils/apiConfig'
import { fetchDedupe } from '../utils/fetchDedupe'
import {
  getCatalogFilterCurrencies,
  getCurrencySymbol,
  normalizeCurrencyCode,
} from '../utils/currency'
import {
  hasCatalogPriceFilter,
  validateCatalogPriceRange,
} from '../utils/catalogPriceFilter'
import {
  CATALOG_PROPERTY_TYPE_OPTIONS,
  CATALOG_PURCHASE_TYPE_OPTIONS,
  CATALOG_ROOM_OPTIONS,
  EMPTY_CATALOG_FILTERS,
  getCatalogFilterProfile,
  loadCatalogFiltersFromSession,
  mergeCatalogFilters,
  persistCatalogFilters,
} from '../utils/catalogFilters'
import './PropertySearchFiltersPanel.css'

export { EMPTY_CATALOG_FILTERS }

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
      <div className={`psf-currency-input-wrap${dropdownOpen ? ' is-open' : ''}`}>
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

const PropertySearchFiltersPanel = ({
  filters: controlledFilters,
  onFiltersChange,
  onApplyFilters,
  findButtonLabelKey = 'modalFind',
}) => {
  const { t } = useTranslation()
  const panelRef = useRef(null)
  const isControlled = controlledFilters != null && typeof onFiltersChange === 'function'
  const [internalFilters, setInternalFilters] = useState(EMPTY_CATALOG_FILTERS)
  const filters = isControlled ? controlledFilters : internalFilters
  const setFilters = isControlled ? onFiltersChange : setInternalFilters

  const [locationOptions, setLocationOptions] = useState([])
  const [defaultCurrency, setDefaultCurrency] = useState('EUR')
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [priceErrorKey, setPriceErrorKey] = useState('')
  const [currencyDropdownAnchor, setCurrencyDropdownAnchor] = useState(null)

  const profile = getCatalogFilterProfile(filters.propertyType)
  const activeCurrency = filters.currency || defaultCurrency
  const currencyList = useMemo(() => getCatalogFilterCurrencies(), [])

  const propertyTypeOptions = CATALOG_PROPERTY_TYPE_OPTIONS.filter((opt) => opt.value !== '')

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
    if (isControlled) return
    setInternalFilters(loadCatalogFiltersFromSession())
  }, [isControlled])

  useEffect(() => {
    if (filters.currency || !defaultCurrency) return
    if (hasCatalogPriceFilter(filters)) {
      setFilters((prev) => ({ ...prev, currency: defaultCurrency }))
    }
  }, [defaultCurrency, filters.currency, filters.minPrice, filters.maxPrice, setFilters])

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
    [filters.country, locationOptions],
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

    const payload = persistCatalogFilters({
      ...filters,
      currency: resolvedCurrency,
    })

    if (typeof onApplyFilters === 'function') {
      onApplyFilters(payload)
    } else if (isControlled) {
      onFiltersChange(mergeCatalogFilters(payload, EMPTY_CATALOG_FILTERS))
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
            {CATALOG_PURCHASE_TYPE_OPTIONS.map((option) => {
              const active = filters.purchaseTypes.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`property-search-filters-panel__chip${active ? ' is-active' : ''}`}
                  onClick={() => togglePurchaseType(option.value)}
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
                onChange={(e) => {
                  const propertyType = e.target.value
                  const nextProfile = getCatalogFilterProfile(propertyType)
                  setFilters((prev) => ({
                    ...prev,
                    propertyType,
                    rooms: nextProfile.rooms ? prev.rooms : '',
                  }))
                }}
              >
                <option value="">{t('catalogFilterAllTypes')}</option>
                {propertyTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </label>

            {profile.rooms ? (
              <div className="property-search-filters-panel__field property-search-filters-panel__field--rooms">
                <span>{t('modalRooms')}</span>
                <div className="property-search-filters-panel__room-pills" role="group">
                  {CATALOG_ROOM_OPTIONS.map((opt) => {
                    const isActive = filters.rooms === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`property-search-filters-panel__room-pill${isActive ? ' is-active' : ''}`}
                        aria-pressed={isActive}
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            rooms: isActive ? '' : opt.value,
                          }))
                        }
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

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
              <span>{t(findButtonLabelKey)}</span>
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
