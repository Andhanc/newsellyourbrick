import { useTranslation } from 'react-i18next'
import { ChevronDown, LayoutGrid, List } from 'lucide-react'
import {
  EMPTY_SHARES_FILTERS,
  SHARES_MIN_INVESTMENT_OPTIONS,
  SHARES_PROPERTY_TYPE_OPTIONS,
  SHARES_STATUS_OPTIONS,
  SHARES_YIELD_OPTIONS,
} from '../utils/sharesPageFilters'
import { SHARES_SORT_OPTIONS } from '../utils/sharesListing'
import './SharesListingToolbar.css'

function FilterSelect({ id, label, value, onChange, options, t }) {
  return (
    <label className="shares-listing-filter" htmlFor={id}>
      <span className="shares-listing-filter__label">{label}</span>
      <span className="shares-listing-filter__control">
        <select
          id={id}
          className="shares-listing-filter__select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label ?? t(option.labelKey)}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="shares-listing-filter__chevron" aria-hidden />
      </span>
    </label>
  )
}

function SharesListingToolbar({
  filters,
  onFiltersChange,
  onResetFilters,
  sortKey,
  onSortChange,
  viewMode,
  onViewModeChange,
  filterOptions,
}) {
  const { t } = useTranslation()

  const countryOptions = [
    { value: 'all', labelKey: 'sharesFilterAllCountries' },
    ...filterOptions.countries.map((country) => ({ value: country, label: country })),
  ]

  const cityOptions = [
    { value: 'all', labelKey: 'sharesFilterAllCities' },
    ...filterOptions.cities.map((city) => ({ value: city, label: city })),
  ]

  const setFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const activeSort = SHARES_SORT_OPTIONS.find((item) => item.value === sortKey) ?? SHARES_SORT_OPTIONS[0]

  return (
    <div className="shares-listing-toolbar">
      <div className="shares-listing-toolbar__filters">
        <FilterSelect
          id="shares-filter-type"
          label={t('sharesFilterObjectType')}
          value={filters.propertyType}
          onChange={(value) => setFilter('propertyType', value)}
          options={SHARES_PROPERTY_TYPE_OPTIONS}
          t={t}
        />
        <FilterSelect
          id="shares-filter-country"
          label={t('sharesFilterCountry')}
          value={filters.country}
          onChange={(value) => setFilter('country', value)}
          options={countryOptions}
          t={t}
        />
        <FilterSelect
          id="shares-filter-city"
          label={t('sharesFilterCity')}
          value={filters.city}
          onChange={(value) => setFilter('city', value)}
          options={cityOptions}
          t={t}
        />
        <FilterSelect
          id="shares-filter-yield"
          label={t('sharesFilterYield')}
          value={filters.yieldRange}
          onChange={(value) => setFilter('yieldRange', value)}
          options={SHARES_YIELD_OPTIONS}
          t={t}
        />
        <FilterSelect
          id="shares-filter-min-investment"
          label={t('sharesFilterMinInvestment')}
          value={filters.minInvestment}
          onChange={(value) => setFilter('minInvestment', value)}
          options={SHARES_MIN_INVESTMENT_OPTIONS}
          t={t}
        />
        <FilterSelect
          id="shares-filter-status"
          label={t('sharesFilterStatus')}
          value={filters.status}
          onChange={(value) => setFilter('status', value)}
          options={SHARES_STATUS_OPTIONS}
          t={t}
        />

        <button type="button" className="shares-listing-toolbar__reset" onClick={onResetFilters}>
          {t('sharesFilterReset')}
        </button>
      </div>

      <div className="shares-listing-toolbar__meta">
        <div className="shares-listing-toolbar__sort">
          <span className="shares-listing-toolbar__sort-label">{t('sharesSortLabel')}</span>
          <div className="shares-listing-toolbar__sort-control">
            <select
              className="shares-listing-toolbar__sort-select"
              value={sortKey}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label={t('sharesSortLabel')}
            >
              {SHARES_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="shares-listing-toolbar__sort-chevron" aria-hidden />
          </div>
          <span className="shares-listing-toolbar__sort-current">{t(activeSort.labelKey)}</span>
        </div>

        <div className="shares-listing-toolbar__views" role="group" aria-label={t('sharesViewModeAria')}>
          <button
            type="button"
            className={`shares-listing-toolbar__view-btn${
              viewMode === 'grid' ? ' is-active' : ''
            }`}
            onClick={() => onViewModeChange('grid')}
            aria-pressed={viewMode === 'grid'}
            aria-label={t('sharesViewGrid')}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            type="button"
            className={`shares-listing-toolbar__view-btn${
              viewMode === 'list' ? ' is-active' : ''
            }`}
            onClick={() => onViewModeChange('list')}
            aria-pressed={viewMode === 'list'}
            aria-label={t('sharesViewList')}
          >
            <List size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default SharesListingToolbar
