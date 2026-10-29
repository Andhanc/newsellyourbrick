export const HERO_SEARCH_STATE_KEY = 'heroSearchFilters'

/**
 * Hero search chip options. Display via t(labelKey) / t(shortLabelKey) or localizeHeroOption().
 * `catalogLabel` is a catalog filter token (matches CATALOG_PROPERTY_TYPE_OPTIONS.value) — not UI copy.
 */
export const HERO_SALE_TYPE_OPTIONS = [
  {
    value: 'auction',
    labelKey: 'heroSearch_saleAuction',
    shortLabelKey: 'heroSearch_saleAuction',
  },
  {
    value: 'buy_now',
    labelKey: 'heroSearch_saleBuyNow',
    shortLabelKey: 'heroSearch_saleBuyNowShort',
  },
  {
    value: 'shares',
    labelKey: 'heroSearch_saleShares',
    shortLabelKey: 'heroSearch_saleShares',
  },
  {
    value: 'debts',
    labelKey: 'heroSearch_saleDebts',
    shortLabelKey: 'heroSearch_saleDebts',
  },
]

export const HERO_PROPERTY_TYPE_OPTIONS = [
  {
    value: 'villa',
    labelKey: 'heroSearch_typeVilla',
    shortLabelKey: 'heroSearch_typeVilla',
    catalogLabel: 'Вилла',
  },
  {
    value: 'apartment',
    labelKey: 'heroSearch_typeApartment',
    shortLabelKey: 'heroSearch_typeApartmentShort',
    catalogLabel: 'Апартаменты',
  },
  {
    value: 'commercial',
    labelKey: 'heroSearch_typeCommercial',
    shortLabelKey: 'heroSearch_typeCommercialShort',
    catalogLabel: 'Коммерческая недвижимость',
  },
]

export const HERO_LOCATION_OPTIONS = [
  {
    value: 'uae',
    labelKey: 'heroSearch_locUae',
    shortLabelKey: 'heroSearch_locUae',
    countryKey: 'uae',
  },
  {
    value: 'spain',
    labelKey: 'heroSearch_locSpain',
    shortLabelKey: 'heroSearch_locSpainShort',
    countryKey: 'spain',
  },
  {
    value: 'usa',
    labelKey: 'heroSearch_locUsa',
    shortLabelKey: 'heroSearch_locUsa',
    countryKey: 'usa',
  },
]

export const HERO_PRICE_OPTIONS = [
  {
    value: 'low',
    labelKey: 'heroSearch_priceLow',
    shortLabelKey: 'heroSearch_priceLowShort',
    minPrice: '',
    maxPrice: '50000',
  },
  {
    value: 'mid',
    labelKey: 'heroSearch_priceMid',
    shortLabelKey: 'heroSearch_priceMidShort',
    minPrice: '50000',
    maxPrice: '250000',
  },
  {
    value: 'high',
    labelKey: 'heroSearch_priceHigh',
    shortLabelKey: 'heroSearch_priceHighShort',
    minPrice: '250000',
    maxPrice: '',
  },
]

/** Resolve hero option labels for UI (keeps catalogLabel untouched for filters). */
export function localizeHeroOption(option, t) {
  if (!option) return option
  return {
    ...option,
    label: option.labelKey ? t(option.labelKey) : option.label,
    shortLabel: option.shortLabelKey ? t(option.shortLabelKey) : option.shortLabel,
  }
}

/**
 * @param {{ saleType: string, propertyType: string, location: string, price: string }} filters
 */
export function buildHeroSearchNavigation(filters) {
  const propertyOption = HERO_PROPERTY_TYPE_OPTIONS.find((item) => item.value === filters.propertyType)
  const locationOption = HERO_LOCATION_OPTIONS.find((item) => item.value === filters.location)
  const priceOption = HERO_PRICE_OPTIONS.find((item) => item.value === filters.price)

  const countryKey = locationOption?.countryKey ?? ''
  const purchaseType = filters.saleType === 'debts' ? 'debt' : filters.saleType
  const prefilter = {
    country: countryKey,
    propertyType: propertyOption?.catalogLabel ?? '',
    purchaseTypes: purchaseType ? [purchaseType] : [],
    minPrice: priceOption?.minPrice ?? '',
    maxPrice: priceOption?.maxPrice ?? '',
  }

  return {
    pathname: '/search-results',
    state: { [HERO_SEARCH_STATE_KEY]: prefilter },
  }
}

/**
 * @param {unknown} state
 */
export function readHeroSearchPrefilter(state) {
  const raw = state?.[HERO_SEARCH_STATE_KEY]
  if (!raw || typeof raw !== 'object') return null
  return raw
}
