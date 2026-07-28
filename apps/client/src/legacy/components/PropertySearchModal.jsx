import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiX, FiSearch, FiDollarSign, FiMapPin, FiHome, FiTag, FiChevronLeft } from 'react-icons/fi'
import { getApiBaseUrl } from '../utils/apiConfig'
import { fetchDedupe } from '../utils/fetchDedupe'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import { CATALOG_PROPERTY_TYPE_OPTIONS } from '../utils/catalogFilters'
import { getSearchResultsGeoPath } from '../utils/searchResultsGeoUrl'
import './PropertySearchModal.css'

const CATALOG_PROPERTY_TYPE_SELECT_OPTIONS = CATALOG_PROPERTY_TYPE_OPTIONS.filter((opt) => opt.value)
const PURCHASE_TYPE_OPTIONS = [
  { value: '', labelKey: 'modalAnyPurchaseType' },
  { value: 'auction', labelKey: 'modalPurchaseTypeAuction' },
  { value: 'buy_now', labelKey: 'modalPurchaseTypeBuyNow' },
  { value: 'shares', labelKey: 'modalPurchaseTypeShares' },
  { value: 'debt', labelKey: 'modalPurchaseTypeDebt' },
  { value: 'direct', labelKey: 'modalPurchaseTypeDirect' },
]

const DEFAULT_PRICE_RANGE = { min: 1, max: 1_000_000 }

const ROOM_PILL_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5+' },
]

const EMPTY_FILTERS = {
  country: '',
  region: '',
  minPrice: '',
  maxPrice: '',
  rooms: '',
  propertyType: '',
  purchaseType: '',
  minArea: '',
  maxArea: '',
}

const STORABLE_FILTER_KEYS = [
  'country',
  'region',
  'minPrice',
  'maxPrice',
  'rooms',
  'propertyType',
  'purchaseType',
  'minArea',
  'maxArea',
]
const DRAFT_FILTERS_KEY = 'propertySearchFiltersDraft'

const PropertySearchModal = ({ isOpen, onClose, restoreFromSession = false }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose, {
    duration: DRAWER_DISMISS_MS.backdrop,
  })
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [locationOptions, setLocationOptions] = useState([])
  const [priceBounds, setPriceBounds] = useState(DEFAULT_PRICE_RANGE)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [regionConfirmed, setRegionConfirmed] = useState(false)
  const [isAnyRegionExplicit, setIsAnyRegionExplicit] = useState(false)

  const locationComplete = Boolean(filters.country && regionConfirmed)
  const canUseFilters = locationComplete

  const sliderMin = useMemo(() => {
    const v = filters.minPrice !== '' ? Number(filters.minPrice) : priceBounds.min
    if (!Number.isFinite(v)) return priceBounds.min
    return Math.max(priceBounds.min, Math.min(v, priceBounds.max))
  }, [filters.minPrice, priceBounds.min, priceBounds.max])

  const sliderMax = useMemo(() => {
    const v = filters.maxPrice !== '' ? Number(filters.maxPrice) : priceBounds.max
    if (!Number.isFinite(v)) return priceBounds.max
    return Math.max(priceBounds.min, Math.min(v, priceBounds.max))
  }, [filters.maxPrice, priceBounds.min, priceBounds.max])

  const selectedCountry = useMemo(
    () => locationOptions.find((c) => c.key === filters.country),
    [locationOptions, filters.country]
  )

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    try {
      const raw = sessionStorage.getItem(
        restoreFromSession ? 'propertySearchFilters' : DRAFT_FILTERS_KEY
      )
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return

      const next = { ...EMPTY_FILTERS }
      for (const key of STORABLE_FILTER_KEYS) {
        if (Object.prototype.hasOwnProperty.call(parsed, key)) {
          next[key] = parsed[key] ?? ''
        }
      }
      setFilters(next)
      setRegionConfirmed(Boolean(next.country))
      setIsAnyRegionExplicit(Boolean(parsed._isAnyRegionExplicit))
    } catch {
      // ignore broken session payload
    }
  }, [isOpen, restoreFromSession])

  useEffect(() => {
    if (!isOpen) return
    sessionStorage.setItem(
      DRAFT_FILTERS_KEY,
      JSON.stringify({
        ...filters,
        _isAnyRegionExplicit: isAnyRegionExplicit,
      })
    )
  }, [filters, isAnyRegionExplicit, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, requestClose])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setOptionsLoading(true)
    ;(async () => {
      try {
        const base = await getApiBaseUrl()
        const res = await fetchDedupe(`${base}/properties/search-options?_=${Date.now()}`)
        if (!res.ok || cancelled) return
        const json = await res.json()
        if (!json?.success || cancelled) return
        const locations = Array.isArray(json.data?.locations) ? json.data.locations : []
        const range = json.data?.priceRange || DEFAULT_PRICE_RANGE
        setLocationOptions(locations)
        setPriceBounds(range)
      } catch {
        if (!cancelled) {
          setLocationOptions([])
          setPriceBounds(DEFAULT_PRICE_RANGE)
        }
      } finally {
        if (!cancelled) setOptionsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen])

  const clearFiltersAfterLocation = () => ({
    propertyType: '',
    purchaseType: '',
    rooms: '',
    minArea: '',
    maxArea: '',
    minPrice: '',
    maxPrice: '',
  })

  const resetLocationConfirmation = () => {
    setRegionConfirmed(false)
  }

  const handleFilterChange = (field, value) => {
    if (field !== 'country' && field !== 'region' && !canUseFilters) return
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleCountrySelect = (countryKey) => {
    const country = locationOptions.find((c) => c.key === countryKey)
    const hasRegions = (country?.regions?.length ?? 0) > 0
    setFilters((prev) => ({
      ...prev,
      country: countryKey,
      region: '',
      ...clearFiltersAfterLocation(),
    }))
    setRegionConfirmed(!hasRegions)
    setIsAnyRegionExplicit(false)
  }

  const handleCountryBack = () => {
    setFilters((prev) => ({
      ...prev,
      country: '',
      region: '',
      ...clearFiltersAfterLocation(),
    }))
    resetLocationConfirmation()
    setIsAnyRegionExplicit(false)
  }

  const handleRegionSelect = (regionKey) => {
    setRegionConfirmed(true)
    setIsAnyRegionExplicit(regionKey === '')
    setFilters((prev) => ({
      ...prev,
      region: regionKey,
      ...clearFiltersAfterLocation(),
    }))
  }

  useEffect(() => {
    if (!isOpen) resetLocationConfirmation()
  }, [isOpen])

  const applySliderPrices = useCallback(
    (nextMin, nextMax) => {
      if (!canUseFilters) return
      const lo = Math.round(Math.min(nextMin, nextMax))
      const hi = Math.round(Math.max(nextMin, nextMax))
      const min = Math.max(priceBounds.min, Math.min(lo, priceBounds.max))
      const max = Math.max(min, Math.min(hi, priceBounds.max))
      setFilters((prev) => ({
        ...prev,
        minPrice: String(min),
        maxPrice: String(max),
      }))
    },
    [canUseFilters, priceBounds.min, priceBounds.max]
  )

  const handleSliderMinChange = (e) => {
    const next = Number(e.target.value)
    if (!Number.isFinite(next)) return
    applySliderPrices(next, sliderMax)
  }

  const handleSliderMaxChange = (e) => {
    const next = Number(e.target.value)
    if (!Number.isFinite(next)) return
    applySliderPrices(sliderMin, next)
  }

  const handleMinPriceInputChange = (raw) => {
    if (!canUseFilters) return
    if (raw === '') {
      handleFilterChange('minPrice', '')
      return
    }
    if (!/^\d+$/.test(raw)) return
    handleFilterChange('minPrice', raw)
  }

  const handleMaxPriceInputChange = (raw) => {
    if (!canUseFilters) return
    if (raw === '') {
      handleFilterChange('maxPrice', '')
      return
    }
    if (!/^\d+$/.test(raw)) return
    handleFilterChange('maxPrice', raw)
  }

  const handleSearch = () => {
    const payload = { ...filters }
    const min = payload.minPrice !== '' ? Number(payload.minPrice) : null
    const max = payload.maxPrice !== '' ? Number(payload.maxPrice) : null
    if (
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      min <= priceBounds.min &&
      max >= priceBounds.max
    ) {
      payload.minPrice = ''
      payload.maxPrice = ''
    }
    sessionStorage.setItem(
      'propertySearchFilters',
      JSON.stringify({
        ...payload,
        _priceBoundMin: priceBounds.min,
        _priceBoundMax: priceBounds.max,
      })
    )
    sessionStorage.removeItem(DRAFT_FILTERS_KEY)
    requestClose(() => navigate(getSearchResultsGeoPath(payload)))
  }

  const handleReset = () => {
    setFilters(EMPTY_FILTERS)
    resetLocationConfirmation()
    setIsAnyRegionExplicit(false)
    sessionStorage.removeItem(DRAFT_FILTERS_KEY)
  }

  const priceSpan = Math.max(1, priceBounds.max - priceBounds.min)
  const sliderFillLeft = ((sliderMin - priceBounds.min) / priceSpan) * 100
  const sliderFillWidth = ((sliderMax - sliderMin) / priceSpan) * 100

  if (!visible || typeof document === 'undefined') return null

  const closingModal = isClosing ? ' drawer-dismiss-modal--closing' : ''
  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''

  return createPortal(
    <div className="property-search-modal-root" role="presentation">
      <button
        type="button"
        className={`property-search-modal__backdrop${closingBackdrop}`}
        aria-label={t('closeAria')}
        onClick={() => requestClose()}
      />
      <div
        className={`property-search-modal${closingModal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-search-modal-title"
      >
        <div className="property-search-modal__content">
          <div className="property-search-modal__header">
            <h2 id="property-search-modal-title" className="property-search-modal__title">
              {t('propertySearchTitle')}
            </h2>
            <button
              type="button"
              className="property-search-modal__close"
              onClick={() => {
                sessionStorage.setItem(
                  DRAFT_FILTERS_KEY,
                  JSON.stringify({
                    ...filters,
                    _isAnyRegionExplicit: isAnyRegionExplicit,
                  })
                )
                requestClose()
              }}
              aria-label={t('closeAria')}
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="property-search-modal__body">
            <div className="property-search-modal__section">
              <label className="property-search-modal__label">
                <FiMapPin size={20} />
                {t('modalRegion')}
              </label>

              {!filters.country ? (
                <div className="property-search-modal__location-step">
                  <p className="property-search-modal__location-hint">{t('modalSelectCountry')}</p>
                  {optionsLoading ? (
                    <p className="property-search-modal__location-loading">{t('loading')}</p>
                  ) : locationOptions.length === 0 ? (
                    <p className="property-search-modal__location-empty">{t('modalNoLocations')}</p>
                  ) : (
                    <div className="property-search-modal__location-grid">
                      {locationOptions.map((country) => (
                        <button
                          key={country.key}
                          type="button"
                          className="property-search-modal__location-chip"
                          onClick={() => handleCountrySelect(country.key)}
                        >
                          {country.label}
                          {country.propertyCount > 0 ? ` (${country.propertyCount})` : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="property-search-modal__location-step">
                  <button
                    type="button"
                    className="property-search-modal__location-back"
                    onClick={handleCountryBack}
                  >
                    <FiChevronLeft size={18} aria-hidden />
                    {t('back')}
                  </button>
                  <p className="property-search-modal__location-hint">{t('modalSelectRegion')}</p>
                  <div className="property-search-modal__location-grid">
                    <button
                      type="button"
                      className={`property-search-modal__location-chip ${isAnyRegionExplicit ? 'is-active' : ''}`}
                      onClick={() => handleRegionSelect('')}
                    >
                      {t('modalAnyRegion')}
                    </button>
                    {(selectedCountry?.regions || []).map((region) => (
                      <button
                        key={region.key}
                        type="button"
                        className={`property-search-modal__location-chip ${filters.region === region.key ? 'is-active' : ''}`}
                        onClick={() => handleRegionSelect(region.key)}
                      >
                        {region.label}
                        {region.propertyCount > 0 ? ` (${region.propertyCount})` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className={`property-search-modal__block ${!canUseFilters ? 'property-search-modal__block--locked' : ''}`}
              aria-disabled={!canUseFilters}
            >
              {!canUseFilters ? (
                <p className="property-search-modal__block-hint">{t('modalFillLocationFirst')}</p>
              ) : null}
            <div className="property-search-modal__row">
              <div className="property-search-modal__section property-search-modal__section--half">
                <label className="property-search-modal__label">
                  <FiHome size={18} />
                  {t('modalPropertyType')}
                </label>
                <select
                  className="property-search-modal__select"
                  value={filters.propertyType}
                  disabled={!canUseFilters}
                  onChange={(e) => handleFilterChange('propertyType', e.target.value)}
                >
                  <option value="">{t('modalAnyType')}</option>
                  {CATALOG_PROPERTY_TYPE_SELECT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="property-search-modal__section property-search-modal__section--half">
                <label className="property-search-modal__label">
                  <FiTag size={18} />
                  {t('modalPurchaseType')}
                </label>
                <select
                  className="property-search-modal__select"
                  value={filters.purchaseType}
                  disabled={!canUseFilters}
                  onChange={(e) => handleFilterChange('purchaseType', e.target.value)}
                >
                  {PURCHASE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value || 'any'} value={opt.value}>
                      {t(opt.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="property-search-modal__row">
              <div className="property-search-modal__section property-search-modal__section--half property-search-modal__section--rooms">
                <label className="property-search-modal__label">{t('modalRooms')}</label>
                <div
                  className="property-search-modal__room-pills"
                  role="group"
                  aria-label={t('modalRooms')}
                >
                  {ROOM_PILL_OPTIONS.map((opt) => {
                    const isActive = filters.rooms === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`property-search-modal__room-pill${isActive ? ' is-active' : ''}`}
                        disabled={!canUseFilters}
                        aria-pressed={isActive}
                        onClick={() =>
                          handleFilterChange('rooms', isActive ? '' : opt.value)
                        }
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="property-search-modal__section property-search-modal__section--half">
                <label className="property-search-modal__label">{t('modalArea')}</label>
                <div className="property-search-modal__range property-search-modal__range--compact">
                  <input
                    type="number"
                    className="property-search-modal__input"
                    placeholder={t('modalFrom')}
                    value={filters.minArea}
                    disabled={!canUseFilters}
                    onChange={(e) => handleFilterChange('minArea', e.target.value)}
                  />
                  <span className="property-search-modal__range-separator">—</span>
                  <input
                    type="number"
                    className="property-search-modal__input"
                    placeholder={t('modalTo')}
                    value={filters.maxArea}
                    disabled={!canUseFilters}
                    onChange={(e) => handleFilterChange('maxArea', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="property-search-modal__section">
              <label className="property-search-modal__label">
                <FiDollarSign size={20} />
                {t('modalPriceLabel')}
              </label>

              <div className="property-search-modal__price-slider">
                <div
                  className="property-search-modal__price-slider-track"
                  style={{
                    '--range-left': `${sliderFillLeft}%`,
                    '--range-width': `${sliderFillWidth}%`,
                  }}
                >
                  <input
                    type="range"
                    className="property-search-modal__price-range property-search-modal__price-range--min"
                    min={priceBounds.min}
                    max={priceBounds.max}
                    step={1}
                    value={sliderMin}
                    disabled={!canUseFilters}
                    onChange={handleSliderMinChange}
                    aria-label={t('modalFrom')}
                  />
                  <input
                    type="range"
                    className="property-search-modal__price-range property-search-modal__price-range--max"
                    min={priceBounds.min}
                    max={priceBounds.max}
                    step={1}
                    value={sliderMax}
                    disabled={!canUseFilters}
                    onChange={handleSliderMaxChange}
                    aria-label={t('modalTo')}
                  />
                </div>
              </div>

              <div className="property-search-modal__range property-search-modal__range--price-inputs">
                <input
                  type="number"
                  className="property-search-modal__input"
                  placeholder={t('modalFrom')}
                  min={1}
                  inputMode="numeric"
                  value={filters.minPrice}
                  disabled={!canUseFilters}
                  onChange={(e) => handleMinPriceInputChange(e.target.value)}
                />
                <span className="property-search-modal__range-separator">—</span>
                <input
                  type="number"
                  className="property-search-modal__input"
                  placeholder={t('modalTo')}
                  min={1}
                  inputMode="numeric"
                  value={filters.maxPrice}
                  disabled={!canUseFilters}
                  onChange={(e) => handleMaxPriceInputChange(e.target.value)}
                />
              </div>
            </div>
            </div>
          </div>

          <div className="property-search-modal__footer">
            <button
              type="button"
              className="property-search-modal__button property-search-modal__button--reset"
              onClick={handleReset}
            >
              {t('modalReset')}
            </button>
            <button
              type="button"
              className="property-search-modal__button property-search-modal__button--search"
              disabled={!locationComplete}
              onClick={handleSearch}
            >
              <FiSearch size={18} />
              {t('modalFind')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default PropertySearchModal
