import { buildAuctionFilterPath } from './auctionFilterUrl'

export const HERO_SEARCH_STATE_KEY = 'heroSearchFilters'

export const HERO_SALE_TYPE_OPTIONS = [
  { value: 'auction', label: 'Аукцион' },
  { value: 'buy_now', label: 'Купить сейчас' },
  { value: 'shares', label: 'Доли' },
  { value: 'debts', label: 'Долги' },
]

export const HERO_PROPERTY_TYPE_OPTIONS = [
  { value: 'villa', label: 'Вилла', categorySlug: 'villas' },
  { value: 'apartment', label: 'Апартаменты', categorySlug: 'apartments' },
  { value: 'commercial', label: 'Коммерция', categorySlug: 'commercial' },
]

export const HERO_LOCATION_OPTIONS = [
  { value: 'uae', label: 'ОАЭ', countryKey: 'uae' },
  { value: 'spain', label: 'Испания', countryKey: 'spain' },
  { value: 'usa', label: 'США', countryKey: 'usa' },
]

export const HERO_PRICE_OPTIONS = [
  { value: 'low', label: 'до $50 000', minPrice: '', maxPrice: '50000' },
  { value: 'mid', label: '$50 000 – $250 000', minPrice: '50000', maxPrice: '250000' },
  { value: 'high', label: 'от $250 000', minPrice: '250000', maxPrice: '' },
]

const SHARES_COUNTRY_LABELS = {
  uae: 'ОАЭ',
  spain: 'Испания',
  usa: 'США',
}

/**
 * @param {{ saleType: string, propertyType: string, location: string, price: string }} filters
 */
export function buildHeroSearchNavigation(filters) {
  const propertyOption = HERO_PROPERTY_TYPE_OPTIONS.find((item) => item.value === filters.propertyType)
  const locationOption = HERO_LOCATION_OPTIONS.find((item) => item.value === filters.location)
  const priceOption = HERO_PRICE_OPTIONS.find((item) => item.value === filters.price) ?? HERO_PRICE_OPTIONS[1]

  const categorySlug = propertyOption?.categorySlug ?? null
  const countryKey = locationOption?.countryKey ?? ''
  const prefilter = {
    country: countryKey,
    minPrice: priceOption.minPrice,
    maxPrice: priceOption.maxPrice,
  }

  if (filters.saleType === 'shares') {
    const shareCountry = SHARES_COUNTRY_LABELS[countryKey]
    return {
      pathname: '/shares',
      state: shareCountry
        ? { [HERO_SEARCH_STATE_KEY]: { shareCountry } }
        : undefined,
    }
  }

  if (filters.saleType === 'debts') {
    return {
      pathname: '/debts',
      state: { [HERO_SEARCH_STATE_KEY]: prefilter },
    }
  }

  const saleFilter = filters.saleType === 'buy_now' ? 'buy_now' : 'auction'
  const pathname = buildAuctionFilterPath({ saleFilter, categorySlug })

  return {
    pathname,
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
