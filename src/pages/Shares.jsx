import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FiArrowRight,
  FiBriefcase,
  FiCheckCircle,
  FiChevronDown,
  FiSearch,
  FiShield,
  FiSliders,
  FiTrendingUp,
  FiX,
} from 'react-icons/fi'
import Header from '../components/Header'
import SharesPropertyCard, { SharesPropertyCardSkeleton } from '../components/SharesPropertyCard'
import SharesMobileFiltersDrawer from '../components/SharesMobileFiltersDrawer'
import ListingPagePagination from '../components/ListingPagePagination'
import BuyerEmptyState from '../components/buyer-mobile/BuyerEmptyState'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { getCoInvestmentContextPropertyPath } from '../utils/listingContextUrl'
import { readHeroSearchPrefilter } from '../utils/heroSearchFilters'
import { publicAsset } from '../utils/publicAsset'
import {
  SHARES_MARKETPLACE_PAGE_SIZE,
  formatForecastYield,
  normalizeMarketplaceShare,
  paginateSharesMarketplace,
} from '../utils/sharesMarketplacePresentation'
import './Shares.css'
import './CoInvestment.mobile.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const API_PAGE_SIZE = 100
const HERO_IMAGE = publicAsset('images/external/shares-hero-estate.jpg')
const STATUS_FILTERS = ['Сбор открыт', 'Почти собрано', 'Сбор завершён']

function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('ru-RU')
}

function finiteValues(list, key) {
  return list
    .map((item) => item[key])
    .filter((value) => Number.isFinite(value))
}

function formatMoney(value, currency = 'EUR') {
  if (!Number.isFinite(value) || value <= 0) return '—'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
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
            throw new Error(payload?.error || 'Не удалось загрузить объекты')
          }
          records.push(...payload.data)
          offset += payload.data.length
          if (payload.data.length < API_PAGE_SIZE) break
        }
        if (!cancelled) setShares(records.map(normalizeMarketplaceShare))
      } catch (error) {
        if (!cancelled) {
          setShares([])
          setLoadError(error?.message || 'Не удалось загрузить объекты')
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
    const search = normalizeText(query)
    const filtered = shares.filter((share) => {
      const haystack = normalizeText(
        `${share.title} ${share.location} ${share.type} ${share.statusLabel}`,
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
        (selectedStatuses.length === 0 || selectedStatuses.includes(share.statusLabel)) &&
        yieldMatches &&
        priceMatches
      )
    })
    return sortMarketplaceShares(filtered, sort)
  }, [query, selectedLocations, selectedStatuses, selectedTypes, sharePriceMax, shares, sort, yieldMax])

  const pagination = useMemo(
    () => paginateSharesMarketplace(filteredShares, page),
    [filteredShares, page],
  )

  useEffect(() => {
    setPage(1)
  }, [query, selectedLocations, selectedStatuses, selectedTypes, sharePriceMax, sort, yieldMax])

  const portfolioFacts = useMemo(() => {
    const availableObjects = shares.filter((share) => share.availableShares == null || share.availableShares > 0).length
    const minimum = priceValues.length ? Math.min(...priceValues) : null
    const averageYield = yieldValues.length
      ? yieldValues.reduce((sum, value) => sum + value, 0) / yieldValues.length
      : null
    return {
      availableObjects,
      minimum,
      forecast: formatForecastYield(averageYield),
      currency: shares.find((share) => share.pricePerShare === minimum)?.currency || 'EUR',
    }
  }, [priceValues, shares, yieldValues])

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

  const hasActiveFilters = Boolean(
    selectedTypes.length ||
      selectedLocations.length ||
      selectedStatuses.length ||
      yieldMax != null ||
      sharePriceMax != null,
  )

  const scrollToCatalog = () => {
    document.getElementById('shares-invest-catalog')?.scrollIntoView({ behavior: 'smooth' })
  }

  const openShare = (share) => {
    navigate(getCoInvestmentContextPropertyPath(share), { state: { shareObject: share } })
  }

  const handlePageChange = (nextPage) => {
    setPage(nextPage)
    window.requestAnimationFrame(() => {
      document.getElementById('shares-invest-results')?.scrollIntoView({ behavior: 'smooth' })
    })
  }

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
  }

  return (
    <div className="shares-page shares-invest-page shares-invest-page--marketplace">
      <Header />
      <main className="shares-invest-main">
        <section className="shares-market-hero">
          <div className="shares-market-hero__media" aria-hidden>
            <img src={HERO_IMAGE} alt="" />
          </div>
          <div className="shares-market-hero__copy">
            <span className="shares-market-hero__eyebrow">
              <FiShield aria-hidden /> Проверенная долевая недвижимость
            </span>
            <h1>Соберите портфель из реальных объектов</h1>
            <p>
              Изучайте условия каждой доли, доступность и прогнозные показатели до решения.
              Доходность не гарантируется.
            </p>
            <div className="shares-market-hero__actions">
              <button type="button" className="shares-market-hero__primary" onClick={scrollToCatalog}>
                Смотреть объекты <FiArrowRight aria-hidden />
              </button>
              <button type="button" className="shares-market-hero__secondary" onClick={() => navigate('/profile')}>
                <FiBriefcase aria-hidden /> Мой портфель
              </button>
            </div>
          </div>

          <aside className="shares-market-portfolio" aria-label="Сводка маркетплейса">
            <div className="shares-market-portfolio__head">
              <div>
                <span>Личный портфель</span>
                <strong>Все доли — в одном месте</strong>
              </div>
              <FiTrendingUp aria-hidden />
            </div>
            <p>Данные портфеля появятся после входа и покупки доли.</p>
            <div className="shares-market-portfolio__facts">
              <div>
                <span>Объектов сейчас</span>
                <strong>{loading || loadError ? '—' : portfolioFacts.availableObjects}</strong>
              </div>
              <div>
                <span>Минимальный вход</span>
                <strong>{formatMoney(portfolioFacts.minimum, portfolioFacts.currency)}</strong>
              </div>
              <div>
                <span>{portfolioFacts.forecast.label}</span>
                <strong>{portfolioFacts.forecast.value}</strong>
                <small>{portfolioFacts.forecast.note}</small>
              </div>
            </div>
            <button type="button" onClick={() => navigate('/profile')}>
              Открыть личный кабинет <FiArrowRight aria-hidden />
            </button>
          </aside>
        </section>

        <section className="shares-market-proof" aria-label="Как работает покупка доли">
          <span><FiCheckCircle aria-hidden /> Условия видны до покупки</span>
          <span><FiShield aria-hidden /> Финальный статус блокирует покупку</span>
          <span><FiTrendingUp aria-hidden /> Прогноз отделён от факта</span>
        </section>

        <section className="shares-invest-catalog" id="shares-invest-catalog">
          <SharesFiltersPanel
            {...filterPanelProps}
            className="shares-invest-filters shares-invest-filters--sidebar"
          />

          <div className="shares-invest-results" id="shares-invest-results">
            <div className="shares-invest-results__title">
              <div>
                <span className="shares-invest-results__eyebrow">Маркетплейс долей</span>
                <h2>Объекты для соинвестирования <span>{filteredShares.length}</span></h2>
                <p>На странице — не больше {SHARES_MARKETPLACE_PAGE_SIZE} объектов из актуального каталога.</p>
              </div>
            </div>

            <div className="shares-invest-toolbar">
              <label className="shares-invest-search">
                <FiSearch size={18} aria-hidden />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Город или объект"
                />
                {query ? (
                  <button type="button" aria-label="Очистить поиск" onClick={() => setQuery('')}>
                    <FiX size={16} aria-hidden />
                  </button>
                ) : null}
              </label>
              <button
                type="button"
                className={`shares-invest-filters-btn${hasActiveFilters ? ' is-active' : ''}`}
                onClick={() => setFiltersDrawerOpen(true)}
                aria-label="Фильтры"
                aria-expanded={filtersDrawerOpen}
              >
                <FiSliders size={18} aria-hidden />
                <span className="shares-invest-filters-btn__label">Фильтры</span>
                {hasActiveFilters ? <span className="shares-invest-filters-btn__dot" aria-hidden /> : null}
              </button>
              <label className="shares-invest-sort shares-invest-sort--desktop">
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  <option value="new">По умолчанию</option>
                  <option value="yield">По прогнозу доходности</option>
                  <option value="collected">По заполнению сбора</option>
                  <option value="price">Сначала доступные доли</option>
                </select>
              </label>
            </div>

            <SharesMobileFiltersDrawer
              isOpen={filtersDrawerOpen}
              onClose={() => setFiltersDrawerOpen(false)}
              title="Фильтры объектов"
              applyLabel={`Показать ${filteredShares.length} объектов`}
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
              <div className="shares-invest-grid" aria-label="Загрузка объектов">
                {Array.from({ length: 6 }, (_, index) => <SharesPropertyCardSkeleton key={index} />)}
              </div>
            ) : loadError ? (
              <BuyerEmptyState
                className="shares-market-state"
                eyebrow="Каталог временно недоступен"
                title="Не удалось загрузить объекты"
                description="Проверьте соединение и попробуйте ещё раз. Мы не подменяем данные демонстрационными карточками."
                primaryLabel="Повторить загрузку"
                onPrimary={() => setReloadKey((value) => value + 1)}
                secondaryLabel="Перейти в профиль"
                onSecondary={() => navigate('/profile')}
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
                eyebrow={shares.length ? 'Измените параметры' : 'Новые сборы готовятся'}
                title={shares.length ? 'По этим условиям объектов нет' : 'Сейчас нет открытых объектов'}
                description={
                  shares.length
                    ? 'Сбросьте фильтры или расширьте поиск — покажем только реальные доступные предложения.'
                    : 'Каталог обновится, когда продавцы опубликуют проверенные предложения с долями.'
                }
                primaryLabel={shares.length ? 'Сбросить фильтры' : 'Вернуться на главную'}
                onPrimary={shares.length ? resetFilters : () => navigate('/')}
                secondaryLabel="Мой портфель"
                onSecondary={() => navigate('/profile')}
              />
            )}
          </div>
        </section>
      </main>
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
  showSort = false,
}) {
  return (
    <aside className={className} aria-label="Фильтры">
      <header>
        <div>
          <span>Настройте выбор</span>
          <h2>Фильтры</h2>
        </div>
        <button type="button" onClick={onReset}>Сбросить</button>
      </header>
      {typeOptions.length ? (
        <FilterGroup title="Тип объекта" options={typeOptions} values={selectedTypes} onToggle={onToggleType} />
      ) : null}
      {locationOptions.length ? (
        <FilterGroup title="Город" options={locationOptions} values={selectedLocations} onToggle={onToggleLocation} />
      ) : null}
      <FilterGroup title="Статус сбора" options={STATUS_FILTERS} values={selectedStatuses} onToggle={onToggleStatus} />
      {yieldCeiling != null ? (
        <RangeFilter
          title="Прогноз доходности"
          minLabel="от 0%"
          maxLabel={yieldMax == null ? `до ${yieldCeiling}%` : `до ${yieldMax}%`}
          value={yieldMax ?? yieldCeiling}
          min={0}
          max={yieldCeiling}
          onChange={(value) => onYieldMaxChange(value === yieldCeiling ? null : value)}
        />
      ) : null}
      {priceCeiling != null ? (
        <RangeFilter
          title="Цена одной доли"
          minLabel="от €0"
          maxLabel={sharePriceMax == null ? `до €${priceCeiling}` : `до €${sharePriceMax}`}
          value={sharePriceMax ?? priceCeiling}
          min={0}
          max={priceCeiling}
          step={100}
          onChange={(value) => onSharePriceMaxChange(value === priceCeiling ? null : value)}
        />
      ) : null}
      {showSort ? (
        <div className="shares-invest-filter-block shares-invest-filter-block--sort">
          <span className="shares-invest-filter-block__title shares-invest-filter-block__title--static">Сортировка</span>
          <label className="shares-invest-sort shares-invest-sort--drawer">
            <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
              <option value="new">По умолчанию</option>
              <option value="yield">По прогнозу доходности</option>
              <option value="collected">По заполнению сбора</option>
              <option value="price">Сначала доступные доли</option>
            </select>
          </label>
        </div>
      ) : null}
      <button type="button" className="shares-invest-filters__apply shares-invest-filters__apply--sidebar">
        Показать {filteredCount} объектов
      </button>
    </aside>
  )
}

function FilterGroup({ title, options, values, onToggle }) {
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
            <span>{option}</span>
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
