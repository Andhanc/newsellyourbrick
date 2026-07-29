import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiSearch } from 'react-icons/fi'
import { FaGavel, FaShoppingBag, FaChartPie, FaHome, FaBuilding } from 'react-icons/fa'
import { scrollMainTo } from '@/utils/mainScroll'

const CATALOG_FILTERS_STORAGE_KEY = 'propertySearchFilters'

const EMPTY_SEARCH_FILTERS = {
  country: '',
  region: '',
  propertyType: '',
  purchaseTypes: [],
  purchaseType: '',
  currency: '',
  minPrice: '',
  maxPrice: '',
  minArea: '',
  maxArea: '',
}

function persistSearchFilters(filters) {
  const payload = {
    ...filters,
    purchaseType: filters.purchaseTypes?.length === 1 ? filters.purchaseTypes[0] : '',
  }
  sessionStorage.setItem(CATALOG_FILTERS_STORAGE_KEY, JSON.stringify(payload))
}

const FILTER_CHIPS = [
  {
    id: 'auction',
    kind: 'purchase',
    value: 'auction',
    labelKey: 'auction',
    sublabelKey: 'sybLandingFilterSubAuction',
    Icon: FaGavel,
  },
  {
    id: 'buy_now',
    kind: 'purchase',
    value: 'buy_now',
    labelKey: 'buyNowSectionTitle',
    sublabelKey: 'sybLandingFilterSubBuyNow',
    Icon: FaShoppingBag,
  },
  {
    id: 'shares',
    kind: 'purchase',
    value: 'shares',
    labelKey: 'shares',
    sublabelKey: 'sybLandingFilterSubShares',
    Icon: FaChartPie,
  },
  {
    id: 'villa',
    kind: 'property',
    value: 'Вилла',
    labelKey: 'propertyTypeVilla',
    sublabelKey: 'sybLandingFilterSubVilla',
    Icon: FaHome,
  },
  {
    id: 'commercial',
    kind: 'property',
    value: 'Коммерческая недвижимость',
    labelKey: 'propertyTypeCommercial',
    sublabelKey: 'sybLandingFilterSubCommercial',
    Icon: FaBuilding,
  },
]

export default function SybLandingSearchBar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeChipId, setActiveChipId] = useState(null)

  const handleChipToggle = (chipId) => {
    setActiveChipId((current) => (current === chipId ? null : chipId))
  }

  const handleSearch = () => {
    const chip = FILTER_CHIPS.find((item) => item.id === activeChipId)
    const nextFilters = { ...EMPTY_SEARCH_FILTERS }

    if (chip?.kind === 'purchase') {
      nextFilters.purchaseTypes = [chip.value]
    } else if (chip?.kind === 'property') {
      nextFilters.propertyType = chip.value
    }

    persistSearchFilters(nextFilters)
    scrollMainTo(0, 0, 'instant')
    navigate('/search-results', {
      state: {
        fromPropertySearchBlock: true,
        searchQuery: query.trim(),
      },
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    handleSearch()
  }

  return (
    <div className="syb-search" aria-label={t('sybLandingSearchAria')}>
      <form className="syb-search__card" onSubmit={handleSubmit}>
        <div className="syb-search__top">
          <label className="syb-search__field">
            <FiSearch className="syb-search__field-icon" size={18} aria-hidden />
            <input
              type="search"
              className="syb-search__input"
              placeholder={t('searchPlaceholderLong')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button type="submit" className="syb-search__submit">
            {t('sybLandingSearchCta')}
          </button>
        </div>

        <div className="syb-search__filters" role="group" aria-label={t('sybLandingSearchFiltersAria')}>
          {FILTER_CHIPS.map(({ id, labelKey, sublabelKey, Icon }) => {
            const isActive = activeChipId === id
            return (
              <button
                key={id}
                type="button"
                className={`syb-search__chip${isActive ? ' syb-search__chip--active' : ''}`}
                aria-pressed={isActive}
                onClick={() => handleChipToggle(id)}
              >
                <span className="syb-search__chip-icon" aria-hidden>
                  <Icon size={14} />
                </span>
                <span className="syb-search__chip-text">
                  <span className="syb-search__chip-sub">{t(sublabelKey)}</span>
                  <span className="syb-search__chip-label">{t(labelKey)}</span>
                </span>
              </button>
            )
          })}
        </div>
      </form>
    </div>
  )
}
