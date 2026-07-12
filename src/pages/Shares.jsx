import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FiArrowLeft,
  FiArrowRight,
  FiBriefcase,
  FiChevronDown,
  FiHome,
  FiPieChart,
  FiSearch,
  FiSliders,
  FiTrendingUp,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import Header from '../components/Header'
import AuctionCategoryCtaCards from '../components/AuctionCategoryCtaCards'
import SharesPropertyCard from '../components/SharesPropertyCard'
import { publicAsset } from '../utils/publicAsset'
import { getPropertyCardImage } from '../utils/propertyImage'
import { formatPropertyForListingCard } from '../utils/formatPropertyListingCard'
import { getCoInvestmentDetailPath } from '../utils/sectionRoutes'
import { getCoInvestmentContextPropertyPath } from '../utils/listingContextUrl'
import { readHeroSearchPrefilter } from '../utils/heroSearchFilters'
import SharesMobileFiltersDrawer from '../components/SharesMobileFiltersDrawer'
import './Shares.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const PAGE_SIZE = 16

const HERO_IMAGE = publicAsset('images/external/shares-hero-estate.jpg')

const CARD_IMAGES = [
  publicAsset('images/external/photo-1600585154340-be6161a56a0c-753fb8cc27.jpg'),
  publicAsset('images/external/photo-1600607687939-ce8a6c25118c-9791198f05.jpg'),
  publicAsset('images/external/photo-1512917774080-9991f1c4c750-928d26ff49.jpg'),
  publicAsset('images/external/photo-1600566753190-17f0baa2a6c3-fadfb56f04.jpg'),
  publicAsset('images/external/photo-1522708323590-d24dbb6b0267-cf542d6d64.jpg'),
  publicAsset('images/external/photo-1564013799919-ab600027ffc6-cd6cfcc604.jpg'),
]

const DEMO_SHARES = [
  {
    title: 'Апартаменты в Валенсии',
    location: 'Испания, Валенсия',
    city: 'Валенсия',
    type: 'Апартаменты',
    country: 'Испания',
    status: 'Сбор открыт',
    collectedPercent: 65,
    collected: 325000,
    target: 500000,
    annualYield: 12.4,
    sharePrice: 250,
  },
  {
    title: 'Пентхаус в Мадриде',
    location: 'Испания, Мадрид',
    city: 'Мадрид',
    type: 'Пентхаус',
    country: 'Испания',
    status: 'Сбор открыт',
    collectedPercent: 48,
    collected: 240000,
    target: 500000,
    annualYield: 10.8,
    sharePrice: 200,
  },
  {
    title: 'Лофт в Барселоне',
    location: 'Испания, Барселона',
    city: 'Барселона',
    type: 'Апартаменты',
    country: 'Испания',
    status: 'Почти собрано',
    collectedPercent: 91,
    collected: 910000,
    target: 1000000,
    annualYield: 11.2,
    sharePrice: 500,
  },
  {
    title: 'Вилла в Малаге',
    location: 'Испания, Малага',
    city: 'Малага',
    type: 'Вилла',
    country: 'Испания',
    status: 'Сбор открыт',
    collectedPercent: 37,
    collected: 185000,
    target: 500000,
    annualYield: 9.6,
    sharePrice: 150,
  },
  {
    title: 'Апартаменты в Аликанте',
    location: 'Испания, Аликанте',
    city: 'Аликанте',
    type: 'Апартаменты',
    country: 'Испания',
    status: 'Сбор открыт',
    collectedPercent: 58,
    collected: 290000,
    target: 500000,
    annualYield: 11.9,
    sharePrice: 220,
  },
  {
    title: 'Таунхаусы в Марбелье',
    location: 'Испания, Марбелья',
    city: 'Марбелья',
    type: 'Таунхаус',
    country: 'Испания',
    status: 'Почти собрано',
    collectedPercent: 85,
    collected: 425000,
    target: 500000,
    annualYield: 12.1,
    sharePrice: 300,
  },
]

const GENERATED_SHARES = Array.from({ length: 87 }, (_, index) => {
  const base = DEMO_SHARES[index % DEMO_SHARES.length]
  const cycle = Math.floor(index / DEMO_SHARES.length)
  return {
    ...base,
    id: `demo-share-${index + 1}`,
    title: cycle ? `${base.title} ${cycle + 1}` : base.title,
    image: CARD_IMAGES[index % CARD_IMAGES.length],
    collectedPercent: Math.min(94, base.collectedPercent + cycle * 2),
    collected: base.collected + cycle * 26000,
    target: base.target + (cycle % 2) * 100000,
    annualYield: Number((base.annualYield + (cycle % 4) * 0.3).toFixed(1)),
    sharePrice: base.sharePrice + cycle * 20,
  }
})

const TYPE_FILTERS = ['Вилла', 'Апартаменты', 'Пентхаус', 'Таунхаус', 'Коммерческая']
const LOCATION_FILTERS = ['Мадрид', 'Барселона', 'Валенсия', 'Малага', 'Марбелья']
const STATUS_FILTERS = ['Сбор открыт', 'Почти собрано', 'Сбор завершён']

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function extractCityFromLocation(location) {
  const parts = String(location || '').split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 2) return parts[parts.length - 1]
  return parts[0] || ''
}

function toHomeShareCardModel(share) {
  const totalPrice = Number(share.target || share.totalPrice) || 0
  const pricePerShare = Number(share.sharePrice || share.pricePerShare) || 0
  const totalShares = Math.max(
    1,
    Number(share.totalShares) || Math.round(totalPrice / Math.max(1, pricePerShare)),
  )
  const sharesSold = Math.min(
    totalShares,
    Number(share.sharesSold) || Math.round((totalShares * Number(share.collectedPercent || 0)) / 100),
  )

  return {
    ...share,
    shareId: share.shareId || share.id,
    routeId: share.routeId || share.id,
    totalPrice,
    pricePerShare,
    totalShares,
    sharesSold,
    currency: share.currency || 'EUR',
    sale_type: 'share',
    is_shared_ownership: true,
  }
}

function mapApiShare(share, index) {
  const formatted = formatPropertyForListingCard(share)
  const base = DEMO_SHARES[index % DEMO_SHARES.length]
  const image = CARD_IMAGES[index % CARD_IMAGES.length] || getPropertyCardImage(share)
  const total = Number(share.totalPrice || share.price) || base.target
  const sold = Number(share.sharesSold || share.shares_sold) || Math.round(base.collectedPercent / 5)
  const all = Number(share.totalShares || share.total_shares) || 20
  const percent = all > 0 ? Math.min(96, Math.round((sold / all) * 100)) : base.collectedPercent

  return {
    ...formatted,
    id: share.shareId || `${share.property_type || 'share'}-${share.id || index}`,
    title: formatted.title || base.title,
    location: formatted.location || base.location,
    city: share.city || extractCityFromLocation(formatted.location) || base.city,
    type: base.type,
    country: base.country,
    status: percent >= 82 ? 'Почти собрано' : 'Сбор открыт',
    image,
    collectedPercent: percent || base.collectedPercent,
    collected: Math.round((total * (percent || base.collectedPercent)) / 100),
    target: total,
    annualYield: Number(share.annualYield || share.annual_yield || base.annualYield),
    sharePrice: all > 0 ? Math.round(total / all) : base.sharePrice,
    originalShare: share,
  }
}

export default function Shares() {
  const navigate = useNavigate()
  const location = useLocation()
  const [apiShares, setApiShares] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState([])
  const [selectedLocations, setSelectedLocations] = useState([])
  const [selectedStatuses, setSelectedStatuses] = useState([])
  const [yieldMax, setYieldMax] = useState(20)
  const [sharePriceMax, setSharePriceMax] = useState(5000)
  const [sort, setSort] = useState('new')
  const [page, setPage] = useState(1)
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false)
  const [favorites, setFavorites] = useState(() => new Set(['demo-share-1', 'demo-share-3']))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/properties/shares`)
        const json = await (res.ok ? res.json() : { success: false, data: [] })
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setApiShares(json.data.map(mapApiShare))
        }
      } catch {
        if (!cancelled) setApiShares([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const prefilter = readHeroSearchPrefilter(location.state)
    if (!prefilter?.shareCountry) return

    setSelectedLocations([prefilter.shareCountry])
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    })
  }, [location.pathname, location.search, location.state, navigate])

  const shares = useMemo(() => {
    if (!apiShares.length) return GENERATED_SHARES
    const merged = [...apiShares]
    let demoIndex = 0
    while (merged.length < 87) {
      merged.push({ ...GENERATED_SHARES[demoIndex % GENERATED_SHARES.length], id: `visual-share-${demoIndex + 1}` })
      demoIndex += 1
    }
    return merged.slice(0, 87)
  }, [apiShares])

  const filtered = useMemo(() => {
    const text = normalizeText(query)
    const list = shares.filter((share) => {
      const haystack = normalizeText(`${share.title} ${share.location} ${share.type} ${share.status}`)
      const typeOk = selectedTypes.length === 0 || selectedTypes.includes(share.type)
      const locationOk = selectedLocations.length === 0 || selectedLocations.includes(share.city)
      const statusOk = selectedStatuses.length === 0 || selectedStatuses.includes(share.status)
      return (
        (!text || haystack.includes(text)) &&
        typeOk &&
        locationOk &&
        statusOk &&
        Number(share.annualYield) <= yieldMax &&
        Number(share.sharePrice) <= sharePriceMax
      )
    })
    if (sort === 'yield') return [...list].sort((a, b) => b.annualYield - a.annualYield)
    if (sort === 'collected') return [...list].sort((a, b) => b.collectedPercent - a.collectedPercent)
    if (sort === 'price') return [...list].sort((a, b) => a.sharePrice - b.sharePrice)
    return list
  }, [query, selectedLocations, selectedStatuses, selectedTypes, sharePriceMax, shares, sort, yieldMax])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [currentPage, filtered])

  useEffect(() => {
    setPage(1)
  }, [query, selectedLocations, selectedStatuses, selectedTypes, sharePriceMax, sort, yieldMax])

  const toggleFilter = (value, setter) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]))
  }

  const resetFilters = () => {
    setQuery('')
    setSelectedTypes([])
    setSelectedLocations([])
    setSelectedStatuses([])
    setYieldMax(20)
    setSharePriceMax(5000)
    setSort('new')
  }

  const hasActiveFilters = useMemo(
    () =>
      selectedTypes.length > 0 ||
      selectedLocations.length > 0 ||
      selectedStatuses.length > 0 ||
      yieldMax < 20 ||
      sharePriceMax < 5000,
    [selectedLocations, selectedStatuses, selectedTypes, sharePriceMax, yieldMax],
  )

  const openShare = (share) => {
    const payload = share.originalShare || share
    const path = share.originalShare
      ? getCoInvestmentContextPropertyPath(payload)
      : getCoInvestmentDetailPath(payload)
    navigate(path, { state: { shareObject: payload } })
  }

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(currentPage - 1, totalPages - 2))
    const end = Math.min(totalPages, start + 2)
    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [currentPage, totalPages])
  const showLastPage = !pageNumbers.includes(totalPages)
  const showTrailingEllipsis =
    showLastPage && pageNumbers[pageNumbers.length - 1] < totalPages - 1

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const scrollToCatalog = () => {
    document.getElementById('shares-invest-catalog')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="shares-page shares-invest-page">
      <Header />
      <main className="shares-invest-main">
        <section className="shares-invest-hero">
          <div className="shares-invest-hero__media">
            <img src={HERO_IMAGE} alt="" />
            <span className="shares-invest-hero__wash" aria-hidden />
          </div>
          <div className="shares-invest-hero__inner">
            <div className="shares-invest-hero__copy">
              <h1>Доли в недвижимости</h1>
              <p className="shares-invest-hero__subtitle">Соберите портфель по частям</p>
              <p className="shares-invest-hero__lead">
                Покупайте доли в проверенных объектах и получайте доход от аренды и роста стоимости.
              </p>
              <button type="button" className="shares-invest-hero__cta" onClick={() => navigate('/profile')}>
                <FiBriefcase size={18} aria-hidden />
                Мои доли
              </button>
            </div>

            <aside className="shares-portfolio-card" aria-label="Мой портфель">
              <div className="shares-portfolio-card__top">
                <span>Мой портфель</span>
                <strong>+12,4%</strong>
              </div>
              <div className="shares-portfolio-card__overview">
                <div className="shares-portfolio-card__value">
                  <p>Общая стоимость</p>
                  <h2>€52 480</h2>
                </div>
                <div className="shares-portfolio-card__chart" aria-hidden>
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="shares-portfolio-card__grid">
                <div>
                  <span>Прогноз доходности</span>
                  <strong>11,8%</strong>
                </div>
                <div>
                  <span>Получено выплат</span>
                  <strong>€2 860</strong>
                </div>
              </div>
              <div className="shares-portfolio-card__split">
                <span className="shares-portfolio-card__donut" aria-hidden />
                <div>
                  <p>Диверсификация</p>
                  <div className="shares-portfolio-card__cities">
                    <span>Мадрид 32%</span>
                    <span>Барселона 24%</span>
                    <span>Марбелья 18%</span>
                  </div>
                </div>
              </div>
              <button type="button">
                Перейти в портфель
                <FiArrowRight size={16} aria-hidden />
              </button>
            </aside>
          </div>
        </section>

        <div className="shares-invest-container">
          <section className="shares-invest-stats" aria-label="Почему инвестируют в доли">
            <div className="shares-invest-stats__intro">
              <span className="shares-invest-stats__badge">Доступно от €100</span>
              <h2>
                <span className="shares-invest-stats__title-line">Соберите портфель</span>
                <span className="shares-invest-stats__title-pill">недвижимости</span>
                <span className="shares-invest-stats__title-line">по частям</span>
              </h2>
              <p>
                Выбирайте проверенные объекты, распределяйте вложения и получайте потенциальный
                доход без покупки всей недвижимости.
              </p>
              <div className="shares-invest-stats__benefits" aria-label="Преимущества долей">
                <span><FiHome aria-hidden /> Доход от аренды</span>
                <span><FiTrendingUp aria-hidden /> Рост стоимости</span>
                <span><FiPieChart aria-hidden /> Диверсификация</span>
              </div>
              <button type="button" className="shares-invest-stats__cta" onClick={scrollToCatalog}>
                Подобрать долю
                <FiArrowRight aria-hidden />
              </button>
            </div>
            <div className="shares-invest-stats__metrics">
              <Metric icon={FiUsers} label="Инвесторов" value="12 842" note="+320 за месяц" />
              <Metric icon={FiHome} label="Активных объектов" value={loading ? '...' : filtered.length || 87} note="+6 за месяц" />
              <Metric icon={FiPieChart} label="Объём инвестиций" value="€128,6 млн" note="+8,7% за месяц" />
              <Metric icon={FiTrendingUp} label="Средняя доходность" value="11,6%" note="за 12 месяцев" />
            </div>
          </section>

          <section className="shares-invest-catalog" id="shares-invest-catalog">
            <SharesFiltersPanel
              className="shares-invest-filters shares-invest-filters--sidebar"
              filteredCount={filtered.length}
              selectedTypes={selectedTypes}
              selectedLocations={selectedLocations}
              selectedStatuses={selectedStatuses}
              yieldMax={yieldMax}
              sharePriceMax={sharePriceMax}
              onReset={resetFilters}
              onToggleType={(value) => toggleFilter(value, setSelectedTypes)}
              onToggleLocation={(value) => toggleFilter(value, setSelectedLocations)}
              onToggleStatus={(value) => toggleFilter(value, setSelectedStatuses)}
              onYieldMaxChange={setYieldMax}
              onSharePriceMaxChange={setSharePriceMax}
            />

            <div className="shares-invest-results">
              <div className="shares-invest-results__title">
                <div>
                  <h2>Объекты с долями <span>{filtered.length}</span></h2>
                  <p>Выберите объект, проверьте сбор и инвестируйте по частям.</p>
                </div>
              </div>

              <div className="shares-invest-toolbar">
                <label className="shares-invest-search">
                  <FiSearch size={18} aria-hidden />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по объекту или локации" />
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
                  <FiSliders size={17} aria-hidden />
                  <select value={sort} onChange={(event) => setSort(event.target.value)}>
                    <option value="new">Сначала новые</option>
                    <option value="yield">По доходности</option>
                    <option value="collected">По сбору</option>
                    <option value="price">По цене доли</option>
                  </select>
                </label>
              </div>

              <SharesMobileFiltersDrawer
                isOpen={filtersDrawerOpen}
                onClose={() => setFiltersDrawerOpen(false)}
                title="Фильтры"
                applyLabel={`Показать ${filtered.length} объектов`}
                onApply={() => setFiltersDrawerOpen(false)}
                onReset={resetFilters}
              >
                <SharesFiltersPanel
                  className="shares-invest-filters shares-invest-filters--drawer"
                  filteredCount={filtered.length}
                  selectedTypes={selectedTypes}
                  selectedLocations={selectedLocations}
                  selectedStatuses={selectedStatuses}
                  yieldMax={yieldMax}
                  sharePriceMax={sharePriceMax}
                  sort={sort}
                  onSortChange={setSort}
                  onReset={resetFilters}
                  onToggleType={(value) => toggleFilter(value, setSelectedTypes)}
                  onToggleLocation={(value) => toggleFilter(value, setSelectedLocations)}
                  onToggleStatus={(value) => toggleFilter(value, setSelectedStatuses)}
                  onYieldMaxChange={setYieldMax}
                  onSharePriceMaxChange={setSharePriceMax}
                  showSort
                />
              </SharesMobileFiltersDrawer>

              <div className="shares-invest-grid">
                {pageItems.map((share) => {
                  const cardShare = toHomeShareCardModel(share)
                  return (
                    <SharesPropertyCard
                      key={share.id}
                      share={cardShare}
                      isFavorite={favorites.has(share.id)}
                      onFavoriteToggle={() => toggleFavorite(share.id)}
                      onInvest={() => openShare(share)}
                      imageFallback={CARD_IMAGES[0]}
                    />
                  )
                })}
              </div>

              <nav className="shares-invest-pagination" aria-label="Пагинация долей">
                <button type="button" disabled={currentPage === 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                  <FiArrowLeft size={16} aria-hidden />
                </button>
                {pageNumbers.map((item) => (
                  <button key={item} type="button" className={item === currentPage ? 'is-active' : ''} onClick={() => setPage(item)}>
                    {item}
                  </button>
                ))}
                {showTrailingEllipsis ? <span>...</span> : null}
                {showLastPage ? <button type="button" onClick={() => setPage(totalPages)}>{totalPages}</button> : null}
                <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                  <FiArrowRight size={16} aria-hidden />
                </button>
              </nav>
            </div>
          </section>

        </div>
        <AuctionCategoryCtaCards variant="sharesPage" />
      </main>
    </div>
  )
}

function Metric({ icon: Icon, label, value, note }) {
  return (
    <article className="shares-invest-metric">
      <span className="shares-invest-metric__icon"><Icon size={22} aria-hidden /></span>
      <div className="shares-invest-metric__body">
        <p>{label}</p>
        <strong>{value}</strong>
        <span className="shares-invest-metric__note">{note}</span>
      </div>
    </article>
  )
}

function SharesFiltersPanel({
  className = '',
  filteredCount,
  selectedTypes,
  selectedLocations,
  selectedStatuses,
  yieldMax,
  sharePriceMax,
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
        <h2>Фильтры</h2>
        <button type="button" onClick={onReset}>Сбросить</button>
      </header>
      <FilterGroup title="Тип объекта" options={TYPE_FILTERS} values={selectedTypes} onToggle={onToggleType} />
      <FilterGroup title="Локация" options={LOCATION_FILTERS} values={selectedLocations} onToggle={onToggleLocation} more />
      <FilterGroup title="Статус сбора" options={STATUS_FILTERS} values={selectedStatuses} onToggle={onToggleStatus} />
      <RangeFilter title="Доходность (годовых)" minLabel="от 6%" maxLabel={`до ${yieldMax}%`} value={yieldMax} min={6} max={20} onChange={onYieldMaxChange} />
      <RangeFilter title="Цена доли" minLabel="от €100" maxLabel={`до €${sharePriceMax}+`} value={sharePriceMax} min={100} max={5000} step={100} onChange={onSharePriceMaxChange} />
      {showSort ? (
        <div className="shares-invest-filter-block shares-invest-filter-block--sort">
          <span className="shares-invest-filter-block__title shares-invest-filter-block__title--static">
            Сортировка
          </span>
          <label className="shares-invest-sort shares-invest-sort--drawer">
            <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
              <option value="new">Сначала новые</option>
              <option value="yield">По доходности</option>
              <option value="collected">По сбору</option>
              <option value="price">По цене доли</option>
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

function FilterGroup({ title, options, values, onToggle, more = false }) {
  return (
    <div className="shares-invest-filter-block">
      <button type="button" className="shares-invest-filter-block__title">
        <span>{title}</span>
        <FiChevronDown size={15} aria-hidden />
      </button>
      <div className="shares-invest-checks">
        {options.map((option) => (
          <label key={option}>
            <input type="checkbox" checked={values.includes(option)} onChange={() => onToggle(option)} />
            <span>{option}</span>
          </label>
        ))}
      </div>
      {more ? <button type="button" className="shares-invest-more">Показать ещё</button> : null}
    </div>
  )
}

function RangeFilter({ title, minLabel, maxLabel, value, min, max, step = 1, onChange }) {
  return (
    <div className="shares-invest-filter-block">
      <button type="button" className="shares-invest-filter-block__title">
        <span>{title}</span>
        <FiChevronDown size={15} aria-hidden />
      </button>
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
