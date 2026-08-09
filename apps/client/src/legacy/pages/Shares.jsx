import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowDown } from 'lucide-react'
import { FiChevronDown, FiSearch } from 'react-icons/fi'
import Header from '../components/Header'
import SharesPropertyCard, { SharesPropertyCardSkeleton } from '../components/SharesPropertyCard'
import SharesMobileFiltersDrawer from '../components/SharesMobileFiltersDrawer'
import ListingPagePagination from '../components/ListingPagePagination'
import BuyerEmptyState from '../components/buyer-mobile/BuyerEmptyState'
import AuctionCategoryCtaCards from '../components/AuctionCategoryCtaCards'
import MobileDiscoverFaq from '../components/MobileDiscoverFaq'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { getCoInvestmentContextPropertyPath } from '../utils/listingContextUrl'
import { readHeroSearchPrefilter } from '../utils/heroSearchFilters'
import { publicAsset } from '../utils/publicAsset'
import { scrollMainElementIntoView } from '../utils/mainScroll'
import {
  SHARES_MARKETPLACE_PAGE_SIZE,
  normalizeMarketplaceShare,
  paginateSharesMarketplace,
} from '../utils/sharesMarketplacePresentation'
import './Shares.css'
import '../components/PropertyList.css'
import './CoInvestment.mobile.css'

const API_BASE = import.meta.env?.VITE_API_BASE_URL || '/api'
const API_PAGE_SIZE = 100
const HERO_IMAGE = publicAsset('images/sellyourbrick/about/about-category-shares.jpg')
const SHARES_EMPTY_IMAGE = publicAsset('images/shares-empty-illustration.png')
/** Stable English IDs — match `statusKey` from normalizeMarketplaceShare */
const STATUS_FILTER_IDS = ['open', 'almost_full', 'completed']

const STATUS_LABEL_KEYS = {
  open: 'sharesPage_statusOpen',
  almost_full: 'sharesPage_statusAlmostFull',
  completed: 'sharesPage_statusCompleted',
}

const LOCALE_BY_LANG = {
  ru: 'ru-RU',
  en: 'en-US',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
  sv: 'sv-SE',
  pl: 'pl-PL',
}

function toIntlLocale(lang) {
  const code = String(lang || 'ru').split('-')[0]
  return LOCALE_BY_LANG[code] || 'en-US'
}

function normalizeText(value, locale = 'en-US') {
  return String(value || '').trim().toLocaleLowerCase(locale)
}

function finiteValues(list, key) {
  return list
    .map((item) => item[key])
    .filter((value) => Number.isFinite(value))
}

function sortMarketplaceShares(list, sort) {
  const sorted = [...list]
  const nullableSort = (selector, direction = 'asc') => (a, b) => {
    const left = selector(a)
    const right = selector(b)
    if (!Number.isFinite(left)) return Number.isFinite(right) ? 1 : 0
    if (!Number.isFinite(right)) return -1
    return direction === 'desc' ? right - left : left - right
  }

  if (sort === 'yield') return sorted.sort(nullableSort((share) => share.annualYield, 'desc'))
  if (sort === 'collected') return sorted.sort(nullableSort((share) => share.collectedPercent, 'desc'))
  if (sort === 'price') return sorted.sort(nullableSort((share) => share.pricePerShare))
  return sorted
}

function getShareFavoriteCategory(share) {
  return share.source_table ? undefined : 'property'
}

export default function Shares() {
  const { t, i18n } = useTranslation()
  const intlLocale = toIntlLocale(i18n.language)
  const navigate = useNavigate()
  const location = useLocation()
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState([])
  const [selectedLocations, setSelectedLocations] = useState([])
  const [selectedStatuses, setSelectedStatuses] = useState([])
  const [yieldMax, setYieldMax] = useState(null)
  const [sharePriceMax, setSharePriceMax] = useState(null)
  const [sort, setSort] = useState('new')
  const [page, setPage] = useState(1)
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')

    ;(async () => {
      try {
        const records = []
        let offset = 0
        while (true) {
          const response = await fetch(
            `${API_BASE}/properties/shares?limit=${API_PAGE_SIZE}&offset=${offset}`,
          )
          const payload = await response.json().catch(() => null)
          if (!response.ok || payload?.success === false || !Array.isArray(payload?.data)) {
            throw new Error(payload?.error || 'LOAD_FAILED')
          }
          records.push(...payload.data)
          offset += payload.data.length
          if (payload.data.length < API_PAGE_SIZE) break
        }
        if (!cancelled) setShares(records.map(normalizeMarketplaceShare))
      } catch (error) {
        if (!cancelled) {
          setShares([])
          setLoadError(error?.message || 'LOAD_FAILED')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  useEffect(() => {
    const prefilter = readHeroSearchPrefilter(location.state)
    if (!prefilter?.shareCountry) return

    setSelectedLocations([prefilter.shareCountry])
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])

  const typeOptions = useMemo(
    () => [...new Set(shares.map((share) => share.type).filter(Boolean))].sort(),
    [shares],
  )
  const locationOptions = useMemo(
    () => [...new Set(shares.map((share) => share.city).filter(Boolean))].sort(),
    [shares],
  )
  const yieldValues = useMemo(() => finiteValues(shares, 'annualYield'), [shares])
  const priceValues = useMemo(() => finiteValues(shares, 'pricePerShare'), [shares])
  const yieldCeiling = yieldValues.length ? Math.ceil(Math.max(...yieldValues)) : null
  const priceCeiling = priceValues.length ? Math.ceil(Math.max(...priceValues) / 100) * 100 : null

  const filteredShares = useMemo(() => {
    const search = normalizeText(query, intlLocale)
    const filtered = shares.filter((share) => {
      const haystack = normalizeText(
        `${share.title} ${share.location} ${share.type} ${share.statusLabel}`,
        intlLocale,
      )
      const yieldMatches =
        yieldMax == null || (Number.isFinite(share.annualYield) && share.annualYield <= yieldMax)
      const priceMatches =
        sharePriceMax == null ||
        (Number.isFinite(share.pricePerShare) && share.pricePerShare <= sharePriceMax)

      return (
        (!search || haystack.includes(search)) &&
        (selectedTypes.length === 0 || selectedTypes.includes(share.type)) &&
        (selectedLocations.length === 0 || selectedLocations.includes(share.city)) &&
        (selectedStatuses.length === 0 || selectedStatuses.includes(share.statusKey)) &&
        yieldMatches &&
        priceMatches
      )
    })
    return sortMarketplaceShares(filtered, sort)
  }, [
    intlLocale,
    query,
    selectedLocations,
    selectedStatuses,
    selectedTypes,
    sharePriceMax,
    shares,
    sort,
    yieldMax,
  ])

  const pagination = useMemo(
    () => paginateSharesMarketplace(filteredShares, page),
    [filteredShares, page],
  )

  useEffect(() => {
    setPage(1)
  }, [query, selectedLocations, selectedStatuses, selectedTypes, sharePriceMax, sort, yieldMax])

  const toggleFilter = (value, setter) => {
    setter((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    )
  }

  const resetFilters = () => {
    setQuery('')
    setSelectedTypes([])
    setSelectedLocations([])
    setSelectedStatuses([])
    setYieldMax(null)
    setSharePriceMax(null)
    setSort('new')
  }

  const activeFilterCount =
    selectedTypes.length +
    selectedLocations.length +
    selectedStatuses.length +
    (yieldMax != null ? 1 : 0) +
    (sharePriceMax != null ? 1 : 0)

  const scrollToCatalog = () => {
    const target =
      document.getElementById('shares-invest-catalog') ||
      document.getElementById('shares-invest-results')
    if (target) scrollMainElementIntoView(target, { offset: 16, behavior: 'smooth' })
  }

  const openShare = (share) => {
    navigate(getCoInvestmentContextPropertyPath(share), { state: { shareObject: share } })
  }

  const handlePageChange = (nextPage) => {
    setPage(nextPage)
    window.requestAnimationFrame(() => {
      const target = document.getElementById('shares-invest-results')
      if (target) scrollMainElementIntoView(target, { offset: 16, behavior: 'smooth' })
    })
  }

  const statusLabel = (id) => t(STATUS_LABEL_KEYS[id] || STATUS_LABEL_KEYS.open)

  const filterPanelProps = {
    filteredCount: filteredShares.length,
    typeOptions,
    locationOptions,
    selectedTypes,
    selectedLocations,
    selectedStatuses,
    yieldMax,
    yieldCeiling,
    sharePriceMax,
    priceCeiling,
    sort,
    onSortChange: setSort,
    onReset: resetFilters,
    onToggleType: (value) => toggleFilter(value, setSelectedTypes),
    onToggleLocation: (value) => toggleFilter(value, setSelectedLocations),
    onToggleStatus: (value) => toggleFilter(value, setSelectedStatuses),
    onYieldMaxChange: setYieldMax,
    onSharePriceMaxChange: setSharePriceMax,
    statusLabel,
  }

  return (
    <div className="shares-page shares-page--shares-redesign">
      <Header />

      <section className="shares-hero-scene" aria-labelledby="shares-hero-title">
        <img className="shares-hero-scene__bg" src={HERO_IMAGE} alt="" aria-hidden />
        <div className="shares-hero-scene__overlay" aria-hidden />

        <div className="shares-hero-scene__brand" aria-label="SellYourBrick">
          <span className="shares-hero-scene__brand-text">
            <span className="shares-hero-scene__brand-word">Sell</span>
            <span className="shares-hero-scene__brand-word shares-hero-scene__brand-word--accent">
              Your
            </span>
            <span className="shares-hero-scene__brand-word">Brick</span>
          </span>
        </div>

        <div className="shares-hero-scene__inner">
          <div className="shares-hero-scene__copy">
            <span className="shares-hero-scene__eyebrow">{t('coInvestment')}</span>
            <h1 id="shares-hero-title" className="shares-hero-scene__title">
              {t('sharesPage_heroTitle')}
            </h1>
            <p className="shares-hero-scene__lead">{t('sharesPage_heroLead')}</p>
            <button type="button" className="shares-hero-scene__cta" onClick={scrollToCatalog}>
              <span>{t('sharesPage_heroCta')}</span>
              <span className="shares-hero-scene__cta-icon" aria-hidden>
                <ArrowDown size={18} strokeWidth={2.4} />
              </span>
            </button>
          </div>
        </div>

        <button
          type="button"
          className="shares-hero-scene__scroll"
          onClick={scrollToCatalog}
          aria-label={t('sharesPage_scrollToCatalogAria')}
        >
          <span className="shares-hero-scene__scroll-arrow" aria-hidden="true" />
        </button>
      </section>

      <main className="shares-container shares-container--shares-main">
        <section className="shares-invest-catalog" id="shares-invest-catalog">
          <SharesFiltersPanel
            {...filterPanelProps}
            className="shares-invest-filters shares-invest-filters--sidebar"
          />

          <div className="shares-invest-results" id="shares-invest-results">
            <div className="auction-listing-search-stack auction-listing-search-stack--compact">
              <div className="search-filters-bar search-filters-bar--auction-mobile">
                <form
                  className="debts-listing-search"
                  onSubmit={(event) => {
                    event.preventDefault()
                  }}
                >
                  <input
                    className="debts-listing-search__input"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t('sharesPage_searchPlaceholder')}
                    aria-label={t('sharesPage_searchAria')}
                  />
                  {query ? (
                    <button
                      type="button"
                      className="debts-listing-search__clear"
                      onClick={() => setQuery('')}
                      aria-label={t('testDriveLanding_clearSearch')}
                    >
                      ×
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    className="debts-listing-search__go"
                    aria-label={t('testDriveLanding_find')}
                  >
                    <FiSearch aria-hidden />
                  </button>
                </form>

                <div className="filters-and-types-grid">
                  <button
                    type="button"
                    className={`filters-button${activeFilterCount > 0 ? ' is-active' : ''}`}
                    aria-expanded={filtersDrawerOpen}
                    aria-label={t('sharesPage_filters')}
                    onClick={() => setFiltersDrawerOpen(true)}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    <span className="filters-button__label">{t('sharesPage_filters')}</span>
                    {activeFilterCount > 0 ? (
                      <span className="filters-badge" aria-hidden="true">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>

              <label className="shares-invest-sort shares-invest-sort--desktop">
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  <option value="new">{t('sharesPage_sortDefault')}</option>
                  <option value="yield">{t('sharesPage_sortYield')}</option>
                  <option value="collected">{t('sharesPage_sortCollected')}</option>
                  <option value="price">{t('sharesPage_sortPrice')}</option>
                </select>
              </label>
            </div>

            <SharesMobileFiltersDrawer
              isOpen={filtersDrawerOpen}
              onClose={() => setFiltersDrawerOpen(false)}
              title={t('sharesPage_filtersDrawerTitle')}
              applyLabel={t('sharesPage_showObjects', { count: filteredShares.length })}
              onApply={() => setFiltersDrawerOpen(false)}
              onReset={resetFilters}
            >
              <SharesFiltersPanel
                {...filterPanelProps}
                className="shares-invest-filters shares-invest-filters--drawer"
                showSort
              />
            </SharesMobileFiltersDrawer>

            {loading ? (
              <div className="shares-invest-grid" aria-label={t('sharesPage_loadingAria')}>
                {Array.from({ length: Math.min(6, SHARES_MARKETPLACE_PAGE_SIZE) }, (_, index) => (
                  <SharesPropertyCardSkeleton key={index} />
                ))}
              </div>
            ) : loadError ? (
              <BuyerEmptyState
                className="shares-market-state"
                image={SHARES_EMPTY_IMAGE}
                eyebrow={null}
                title={t('sharesPage_loadError')}
                description={t('sharesPage_loadErrorDesc')}
                primaryLabel={t('sharesPage_seeOtherObjects')}
                onPrimary={() => navigate('/auction')}
              />
            ) : pagination.items.length ? (
              <>
                <div className="shares-invest-grid">
                  {pagination.items.map((share) => (
                    <SharesPropertyCard
                      key={`${share.source_table || share.property_type || 'share'}-${share.id}`}
                      share={share}
                      isFavorite={isFavorite(share, getShareFavoriteCategory(share))}
                      onFavoriteToggle={() => toggleFavorite(share, getShareFavoriteCategory(share))}
                      onInvest={() => openShare(share)}
                    />
                  ))}
                </div>
                <ListingPagePagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </>
            ) : (
              <BuyerEmptyState
                className="shares-market-state"
                image={SHARES_EMPTY_IMAGE}
                eyebrow={null}
                title={
                  shares.length
                    ? t('sharesPage_emptyFilteredTitle')
                    : t('sharesPage_emptyCatalogTitle')
                }
                description={
                  shares.length
                    ? t('sharesPage_emptyFilteredDesc')
                    : t('sharesPage_emptyCatalogDesc')
                }
                primaryLabel={
                  shares.length ? t('sharesFilterReset') : t('sharesPage_seeOtherObjects')
                }
                onPrimary={shares.length ? resetFilters : () => navigate('/auction')}
              />
            )}
          </div>
        </section>
      </main>

      <AuctionCategoryCtaCards variant="sharesPage" />
      <MobileDiscoverFaq idPrefix="shares-md-faq" />
    </div>
  )
}

function SharesFiltersPanel({
  className = '',
  filteredCount,
  typeOptions,
  locationOptions,
  selectedTypes,
  selectedLocations,
  selectedStatuses,
  yieldMax,
  yieldCeiling,
  sharePriceMax,
  priceCeiling,
  sort,
  onSortChange,
  onReset,
  onToggleType,
  onToggleLocation,
  onToggleStatus,
  onYieldMaxChange,
  onSharePriceMaxChange,
  statusLabel,
  showSort = false,
}) {
  const { t } = useTranslation()

  return (
    <aside className={className} aria-label={t('sharesPage_filters')}>
      <header>
        <div>
          <span>{t('sharesPage_filtersSetup')}</span>
          <h2>{t('sharesPage_filters')}</h2>
        </div>
        <button type="button" onClick={onReset}>
          {t('sharesPage_reset')}
        </button>
      </header>
      {typeOptions.length ? (
        <FilterGroup
          title={t('sharesFilterObjectType')}
          options={typeOptions}
          values={selectedTypes}
          onToggle={onToggleType}
        />
      ) : null}
      {locationOptions.length ? (
        <FilterGroup
          title={t('sharesFilterCity')}
          options={locationOptions}
          values={selectedLocations}
          onToggle={onToggleLocation}
        />
      ) : null}
      <FilterGroup
        title={t('sharesPage_statusTitle')}
        options={STATUS_FILTER_IDS}
        values={selectedStatuses}
        onToggle={onToggleStatus}
        getLabel={statusLabel}
      />
      {yieldCeiling != null ? (
        <RangeFilter
          title={t('sharesPage_yieldForecast')}
          minLabel={t('sharesPage_yieldFrom0')}
          maxLabel={
            yieldMax == null
              ? t('sharesPage_yieldUpTo', { value: yieldCeiling })
              : t('sharesPage_yieldUpTo', { value: yieldMax })
          }
          value={yieldMax ?? yieldCeiling}
          min={0}
          max={yieldCeiling}
          onChange={(value) => onYieldMaxChange(value === yieldCeiling ? null : value)}
        />
      ) : null}
      {priceCeiling != null ? (
        <RangeFilter
          title={t('sharesPage_pricePerShare')}
          minLabel={t('sharesPage_priceFrom0')}
          maxLabel={
            sharePriceMax == null
              ? t('sharesFilterPriceUpTo', { amount: `€${priceCeiling}` })
              : t('sharesFilterPriceUpTo', { amount: `€${sharePriceMax}` })
          }
          value={sharePriceMax ?? priceCeiling}
          min={0}
          max={priceCeiling}
          step={100}
          onChange={(value) => onSharePriceMaxChange(value === priceCeiling ? null : value)}
        />
      ) : null}
      {showSort ? (
        <div className="shares-invest-filter-block shares-invest-filter-block--sort">
          <span className="shares-invest-filter-block__title shares-invest-filter-block__title--static">
            {t('sharesPage_sortLabel')}
          </span>
          <label className="shares-invest-sort shares-invest-sort--drawer">
            <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
              <option value="new">{t('sharesPage_sortDefault')}</option>
              <option value="yield">{t('sharesPage_sortYield')}</option>
              <option value="collected">{t('sharesPage_sortCollected')}</option>
              <option value="price">{t('sharesPage_sortPrice')}</option>
            </select>
          </label>
        </div>
      ) : null}
      <button type="button" className="shares-invest-filters__apply shares-invest-filters__apply--sidebar">
        {t('sharesPage_showObjects', { count: filteredCount })}
      </button>
    </aside>
  )
}

function FilterGroup({ title, options, values, onToggle, getLabel }) {
  return (
    <div className="shares-invest-filter-block">
      <div className="shares-invest-filter-block__title">
        <span>{title}</span>
        <FiChevronDown size={15} aria-hidden />
      </div>
      <div className="shares-invest-checks">
        {options.map((option) => (
          <label key={option}>
            <input type="checkbox" checked={values.includes(option)} onChange={() => onToggle(option)} />
            <span>{getLabel ? getLabel(option) : option}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function RangeFilter({ title, minLabel, maxLabel, value, min, max, step = 1, onChange }) {
  return (
    <div className="shares-invest-filter-block">
      <div className="shares-invest-filter-block__title">
        <span>{title}</span>
        <FiChevronDown size={15} aria-hidden />
      </div>
      <div className="shares-invest-range-labels">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
      <input
        className="shares-invest-range"
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}
