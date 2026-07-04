import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, ChevronLeft } from 'lucide-react'
import {
  DEBTS_PROPERTY_TYPE_OPTIONS,
  EMPTY_DEBTS_FILTERS,
} from '../utils/debtsPageFilters'
import './DebtsToolbar.css'

const LOCATION_PREVIEW_COUNT = 6

function sortLocations(locations = []) {
  return [...locations].sort((a, b) => (b.propertyCount || 0) - (a.propertyCount || 0))
}

function DebtsToolbar({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  filterOptions = { locations: [] },
  onOpenAdvancedFilters,
  advancedFiltersActive = false,
}) {
  const { t } = useTranslation()
  const [locationPanelOpen, setLocationPanelOpen] = useState(false)
  const [draftCountry, setDraftCountry] = useState(filters.country)
  const [draftCity, setDraftCity] = useState(filters.city)
  const panelRef = useRef(null)
  const moreButtonRef = useRef(null)

  const sortedLocations = useMemo(
    () => sortLocations(filterOptions.locations),
    [filterOptions.locations],
  )

  const previewLocations = useMemo(
    () => sortedLocations.slice(0, LOCATION_PREVIEW_COUNT),
    [sortedLocations],
  )

  const draftCountryOption = useMemo(
    () => sortedLocations.find((item) => item.key === draftCountry) || null,
    [sortedLocations, draftCountry],
  )

  useEffect(() => {
    if (!locationPanelOpen) return undefined
    setDraftCountry(filters.country)
    setDraftCity(filters.city)
  }, [locationPanelOpen, filters.country, filters.city])

  useEffect(() => {
    if (!locationPanelOpen) return undefined
    const handlePointerDown = (event) => {
      if (
        panelRef.current?.contains(event.target) ||
        moreButtonRef.current?.contains(event.target)
      ) {
        return
      }
      setLocationPanelOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [locationPanelOpen])

  const setPropertyType = (propertyType) => {
    onFiltersChange({ ...filters, propertyType })
  }

  const isLocationActive = (countryKey) =>
    filters.country === countryKey && (filters.city === 'all' || !filters.city)

  const applyPreviewLocation = (countryKey) => {
    if (isLocationActive(countryKey)) {
      onFiltersChange({ ...filters, country: 'all', city: 'all' })
      return
    }
    onFiltersChange({ ...filters, country: countryKey, city: 'all' })
  }

  const handleSaveLocations = () => {
    onFiltersChange({ ...filters, country: draftCountry, city: draftCity })
    setLocationPanelOpen(false)
  }

  const handleResetLocations = () => {
    setDraftCountry('all')
    setDraftCity('all')
    onFiltersChange({ ...filters, country: 'all', city: 'all' })
    setLocationPanelOpen(false)
  }

  const openLocationPanel = () => {
    setLocationPanelOpen((open) => !open)
  }

  return (
    <div className="debts-toolbar" aria-label={t('filters')}>
      <div className="debts-toolbar__main-row">
        <label className="debts-toolbar__search">
          <Search size={18} className="debts-toolbar__search-icon" aria-hidden />
          <input
            type="search"
            className="debts-toolbar__search-input"
            placeholder={t('debtsSearchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={t('debtsSearchPlaceholder')}
          />
        </label>

        <div className="debts-toolbar__types" role="group" aria-label={t('debtsFilterObjectType')}>
          {DEBTS_PROPERTY_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`debts-toolbar__chip${
                filters.propertyType === option.value ? ' is-active' : ''
              }`}
              onClick={() => setPropertyType(option.value)}
            >
              {option.value === 'все' ? t('debtsFilterAllTypes') : t(option.labelKey)}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`debts-toolbar__filters-btn${
            advancedFiltersActive ? ' is-active' : ''
          }`}
          onClick={onOpenAdvancedFilters}
          aria-label={t('filters')}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span>{t('filters')}</span>
        </button>
      </div>

      <div className="debts-toolbar__locations-row">
        <span className="debts-toolbar__locations-label">{t('catalogFilterLocation')}</span>
        <div className="debts-toolbar__locations" role="group" aria-label={t('catalogFilterLocation')}>
          <button
            type="button"
            className={`debts-toolbar__chip${
              filters.country === 'all' ? ' is-active' : ''
            }`}
            onClick={() => onFiltersChange({ ...filters, country: 'all', city: 'all' })}
          >
            {t('catalogFilterAll')}
          </button>
          {previewLocations.map((location) => (
            <button
              key={location.key}
              type="button"
              className={`debts-toolbar__chip${isLocationActive(location.key) ? ' is-active' : ''}`}
              onClick={() => applyPreviewLocation(location.key)}
            >
              {location.label}
            </button>
          ))}
          <div className="debts-toolbar__more-wrap">
            <button
              ref={moreButtonRef}
              type="button"
              className={`debts-toolbar__chip debts-toolbar__chip--more${
                locationPanelOpen ? ' is-active' : ''
              }`}
              onClick={openLocationPanel}
              aria-expanded={locationPanelOpen}
            >
              {t('debtsMoreLocations')}
            </button>
            {locationPanelOpen ? (
              <div ref={panelRef} className="debts-toolbar__location-panel" role="dialog" aria-label={t('catalogFilterLocation')}>
                {!draftCountry || draftCountry === 'all' ? (
                  <div className="debts-toolbar__location-panel-body">
                    <p className="debts-toolbar__location-panel-hint">{t('debtsFilterAllRegions')}</p>
                    <div className="debts-toolbar__location-grid">
                      <button
                        type="button"
                        className={`debts-toolbar__location-item${
                          draftCountry === 'all' ? ' is-active' : ''
                        }`}
                        onClick={() => {
                          setDraftCountry('all')
                          setDraftCity('all')
                        }}
                      >
                        {t('catalogFilterAll')}
                      </button>
                      {sortedLocations.map((location) => (
                        <button
                          key={location.key}
                          type="button"
                          className={`debts-toolbar__location-item${
                            draftCountry === location.key ? ' is-active' : ''
                          }`}
                          onClick={() => {
                            setDraftCountry(location.key)
                            setDraftCity('all')
                          }}
                        >
                          {location.label}
                          {location.propertyCount > 0 ? ` (${location.propertyCount})` : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="debts-toolbar__location-panel-body">
                    <button
                      type="button"
                      className="debts-toolbar__location-back"
                      onClick={() => {
                        setDraftCountry('all')
                        setDraftCity('all')
                      }}
                    >
                      <ChevronLeft size={16} aria-hidden />
                      {draftCountryOption?.label || t('back')}
                    </button>
                    <p className="debts-toolbar__location-panel-hint">{t('catalogFilterRegion')}</p>
                    <div className="debts-toolbar__location-grid">
                      <button
                        type="button"
                        className={`debts-toolbar__location-item${
                          draftCity === 'all' ? ' is-active' : ''
                        }`}
                        onClick={() => setDraftCity('all')}
                      >
                        {t('catalogFilterAll')}
                      </button>
                      {(draftCountryOption?.regions || []).map((region) => (
                        <button
                          key={region.key}
                          type="button"
                          className={`debts-toolbar__location-item${
                            draftCity === region.key ? ' is-active' : ''
                          }`}
                          onClick={() => setDraftCity(region.key)}
                        >
                          {region.label}
                          {region.propertyCount > 0 ? ` (${region.propertyCount})` : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="debts-toolbar__location-panel-footer">
                  <button
                    type="button"
                    className="debts-toolbar__panel-btn debts-toolbar__panel-btn--primary"
                    onClick={handleSaveLocations}
                  >
                    {t('auctionApplyFilters')}
                  </button>
                  <button
                    type="button"
                    className="debts-toolbar__panel-btn debts-toolbar__panel-btn--ghost"
                    onClick={handleResetLocations}
                  >
                    {t('catalogResetFilters')}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export function isDebtsAdvancedFiltersActive(filters) {
  const base = EMPTY_DEBTS_FILTERS
  return (
    (filters.risks?.length ?? 0) > 0 ||
    (filters.risk && filters.risk !== 'all') ||
    filters.minPrice !== '' ||
    filters.maxPrice !== '' ||
    filters.minDebt !== '' ||
    filters.maxDebt !== '' ||
    !filters.showAuction ||
    !filters.showBuyNow
  )
}

export default DebtsToolbar
