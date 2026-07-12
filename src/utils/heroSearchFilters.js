export const HERO_SEARCH_STATE_KEY = 'heroSearchFilters'

export const HERO_SALE_TYPE_OPTIONS = [
  { value: 'auction', label: 'Аукцион', shortLabel: 'Аукцион' },
  { value: 'buy_now', label: 'Купить сейчас', shortLabel: 'Сейчас' },
  { value: 'shares', label: 'Доли', shortLabel: 'Доли' },
  { value: 'debts', label: 'Долги', shortLabel: 'Долги' },
]

export const HERO_PROPERTY_TYPE_OPTIONS = [
  { value: 'villa', label: 'Вилла', shortLabel: 'Вилла', catalogLabel: 'Вилла' },
  { value: 'apartment', label: 'Апартаменты', shortLabel: 'Апарт.', catalogLabel: 'Апартаменты' },
  {
    value: 'commercial',
    label: 'Коммерция',
    shortLabel: 'Коммер.',
    catalogLabel: 'Коммерческая недвижимость',
  },
]

export const HERO_LOCATION_OPTIONS = [
  { value: 'uae', label: 'ОАЭ', shortLabel: 'ОАЭ', countryKey: 'uae' },
  { value: 'spain', label: 'Испания', shortLabel: 'Исп.', countryKey: 'spain' },
  { value: 'usa', label: 'США', shortLabel: 'США', countryKey: 'usa' },
]

export const HERO_PRICE_OPTIONS = [
  { value: 'low', label: 'до $50 000', shortLabel: 'до 50K', minPrice: '', maxPrice: '50000' },
  { value: 'mid', label: '$50 000 – $250 000', shortLabel: '50–250K', minPrice: '50000', maxPrice: '250000' },
  { value: 'high', label: 'от $250 000', shortLabel: 'от 250K', minPrice: '250000', maxPrice: '' },
]

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
