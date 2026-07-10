import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FiArrowLeft,
  FiArrowRight,
  FiChevronDown,
  FiHeart,
  FiHome,
  FiMapPin,
  FiSearch,
  FiShield,
  FiSliders,
  FiSun,
  FiUmbrella,
  FiX,
} from 'react-icons/fi'
import { FaChartPie, FaFileInvoiceDollar, FaGavel, FaStar } from 'react-icons/fa'
import Header from '../components/Header'
import SharesMobileFiltersDrawer from '../components/SharesMobileFiltersDrawer'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { getPropertyCardImage } from '../utils/propertyImage'
import { formatPropertyForListingCard } from '../utils/formatPropertyListingCard'
import { auctionListingDedupeKey, getPropertyTestDrivePath } from '../utils/propertyDetailUrl'
import { publicAsset } from '../utils/publicAsset'
import './TestDriveLandingPage.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const PAGE_SIZE = 6

const HERO_IMAGE = publicAsset('images/test-drive/hero-resort.png')

const CARD_IMAGES = [
  publicAsset('images/test-drive/property-marbella.png'),
  publicAsset('images/test-drive/property-nice.png'),
  publicAsset('images/test-drive/property-paphos.png'),
  publicAsset('images/test-drive/property-sorrento.png'),
  publicAsset('images/test-drive/property-barcelona.png'),
  publicAsset('images/test-drive/property-santorini.png'),
]

const CTA_IMAGES = {
  auction: publicAsset('images/test-drive/cta-auction.png'),
  shares: publicAsset('images/test-drive/cta-shares.png'),
  debts: publicAsset('images/test-drive/cta-debts.png'),
}

const BASE_LISTINGS = [
  {
    title: 'Вилла в Марбелье',
    location: 'Испания, Коста-дель-Соль',
    city: 'Марбелья',
    type: 'Вилла',
    bedrooms: 3,
    bathrooms: 3,
    area: 180,
    price: 450,
    rating: 4.9,
    reviews: 23,
    stayDays: 3,
  },
  {
    title: 'Апартаменты в Мадриде',
    location: 'Испания, Мадрид',
    city: 'Мадрид',
    type: 'Апартаменты',
    bedrooms: 2,
    bathrooms: 2,
    area: 120,
    price: 280,
    rating: 4.8,
    reviews: 18,
    stayDays: 3,
  },
  {
    title: 'Вилла в Малаге',
    location: 'Испания, Малага',
    city: 'Малага',
    type: 'Вилла',
    bedrooms: 3,
    bathrooms: 2,
    area: 160,
    price: 320,
    rating: 4.7,
    reviews: 16,
    stayDays: 3,
  },
  {
    title: 'Дом в Валенсии',
    location: 'Испания, Валенсия',
    city: 'Валенсия',
    type: 'Дом',
    bedrooms: 2,
    bathrooms: 2,
    area: 110,
    price: 350,
    rating: 4.9,
    reviews: 21,
    stayDays: 3,
  },
  {
    title: 'Апартаменты в Барселоне',
    location: 'Испания, Барселона',
    city: 'Барселона',
    type: 'Апартаменты',
    bedrooms: 1,
    bathrooms: 1,
    area: 80,
    price: 220,
    rating: 4.6,
    reviews: 14,
    stayDays: 3,
  },
  {
    title: 'Вилла в Аликанте',
    location: 'Испания, Аликанте',
    city: 'Аликанте',
    type: 'Вилла',
    bedrooms: 2,
    bathrooms: 2,
    area: 100,
    price: 400,
    rating: 4.9,
    reviews: 27,
    stayDays: 4,
  },
]

const GENERATED_LISTINGS = Array.from({ length: 42 }, (_, index) => {
  const base = BASE_LISTINGS[index % BASE_LISTINGS.length]
  const lap = Math.floor(index / BASE_LISTINGS.length)
  return {
    ...base,
    id: `demo-${index + 1}`,
    image: CARD_IMAGES[index % CARD_IMAGES.length],
    price: Math.min(500, base.price + lap * 25),
    reviews: base.reviews + lap,
    area: base.area + lap * 4,
    title: lap ? `${base.title} ${lap + 1}` : base.title,
  }
})

const TYPE_FILTERS = ['Вилла', 'Апартаменты', 'Таунхаус', 'Дом', 'Пентхаус']
const CITY_FILTERS = ['Марбелья', 'Барселона', 'Мадрид', 'Валенсия', 'Малага', 'Аликанте', 'Севилья', 'Пальма']
const DURATION_FILTERS = ['3-7 дней', '1-2 недели', '2-4 недели', '1-3 месяца', 'Более 3 месяцев']
const AMENITY_FILTERS = ['Бассейн', 'Вид на море', 'Терраса', 'Wi-Fi', 'Парковка']

const STORY_CARDS = [
  {
    icon: FiHome,
    title: 'Поживите в реальности',
    text: 'Оцените локацию, окружение и сам объект изнутри',
  },
  {
    icon: FiUmbrella,
    title: 'Отпуск с пользой',
    text: 'Наслаждайтесь отдыхом и проверяйте объект',
  },
  {
    icon: FiShield,
    title: 'Уверенное решение',
    text: 'Принимайте решение на основе личного опыта',
  },
]

const NEXT_LINKS = [
  {
    title: 'Аукцион',
    text: 'Недвижимость по выгодным ценам на открытых торгах',
    to: '/auction',
    icon: FaGavel,
    image: CTA_IMAGES.auction,
    accent: 'teal',
    cta: 'Перейти к аукциону',
  },
  {
    title: 'Доли',
    text: 'Инвестируйте в недвижимость совместно с другими',
    to: '/shares',
    icon: FaChartPie,
    image: CTA_IMAGES.shares,
    accent: 'coral',
    cta: 'Перейти к долям',
  },
  {
    title: 'Долги',
    text: 'Приобретайте объекты с дисконтом до 70%',
    to: '/debts',
    icon: FaFileInvoiceDollar,
    image: CTA_IMAGES.debts,
    accent: 'mint',
    cta: 'Перейти к долгам',
  },
]

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function mapApiPropertyToListing(property, index) {
  const image = getPropertyCardImage(property) || CARD_IMAGES[index % CARD_IMAGES.length]
  const base = BASE_LISTINGS[index % BASE_LISTINGS.length]
  const formatted = formatPropertyForListingCard({
    ...property,
    image,
    images: image ? [image] : [],
    title: property.title || property.name || '',
  })

  return {
    ...formatted,
    id: auctionListingDedupeKey(formatted),
    image: CARD_IMAGES[index % CARD_IMAGES.length],
    title: base.title,
    location: base.location,
    city: base.city,
    type: base.type,
    bedrooms: base.bedrooms,
    bathrooms: base.bathrooms,
    area: base.area,
    price: base.price,
    rating: 4.6 + (index % 4) / 10,
    reviews: 14 + index,
    stayDays: index % 6 === 5 ? 4 : 3,
    originalProperty: formatted,
  }
}

const TestDriveLandingPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [apiListings, setApiListings] = useState([])
  const [query, setQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState([])
  const [selectedDirections, setSelectedDirections] = useState([])
  const [selectedDurations, setSelectedDurations] = useState([])
  const [selectedAmenities, setSelectedAmenities] = useState([])
  const [price, setPrice] = useState(500)
  const [sort, setSort] = useState('new')
  const [page, setPage] = useState(1)
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false)
  const [favorites, setFavorites] = useState(() => new Set(['demo-1', 'demo-2']))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/properties/test-drive`)
        const json = await (res.ok ? res.json() : { success: false, data: [] })
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setApiListings(json.data.map(mapApiPropertyToListing))
        } else if (!cancelled) {
          setApiListings([])
        }
      } catch {
        if (!cancelled) setApiListings([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const listings = useMemo(() => {
    if (!apiListings.length) return GENERATED_LISTINGS
    const merged = [...apiListings]
    let demoIndex = 0
    while (merged.length < 42) {
      merged.push({
        ...GENERATED_LISTINGS[demoIndex % GENERATED_LISTINGS.length],
        id: `visual-${demoIndex + 1}`,
      })
      demoIndex += 1
    }
    return merged.slice(0, 42)
  }, [apiListings])

  const activeFilterCount =
    selectedTypes.length +
    selectedDirections.length +
    selectedDurations.length +
    selectedAmenities.length +
    (price < 500 ? 1 : 0)

  const hasActiveFilters = activeFilterCount > 0

  const filteredListings = useMemo(() => {
    const q = normalizeText(query)
    const filtered = listings.filter((item) => {
      const haystack = normalizeText(`${item.title} ${item.location} ${item.type}`)
      const typeOk = selectedTypes.length === 0 || selectedTypes.includes(item.type)
      const directionOk = selectedDirections.length === 0 || selectedDirections.includes(item.city)
      const durationOk =
        selectedDurations.length === 0 ||
        selectedDurations.includes(item.stayDays <= 7 ? '3-7 дней' : '1-2 недели')
      const priceOk = Number(item.price) <= price
      return (!q || haystack.includes(q)) && typeOk && directionOk && durationOk && priceOk
    })

    if (sort === 'price') return [...filtered].sort((a, b) => a.price - b.price)
    if (sort === 'rating') return [...filtered].sort((a, b) => b.rating - a.rating)
    return filtered
  }, [listings, price, query, selectedDirections, selectedDurations, selectedTypes, sort])

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageListings = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredListings.slice(start, start + PAGE_SIZE)
  }, [filteredListings, safePage])

  useEffect(() => {
    setPage(1)
  }, [query, selectedTypes, selectedDirections, selectedDurations, selectedAmenities, price, sort])

  const toggleValue = (value, setter) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]))
  }

  const resetFilters = () => {
    setQuery('')
    setSelectedTypes([])
    setSelectedDirections([])
    setSelectedDurations([])
    setSelectedAmenities([])
    setPrice(500)
    setSort('new')
  }

  const openListing = (listing) => {
    if (!ensureCanOpenProperty()) return
    const property = listing.originalProperty || listing
    navigate(getPropertyTestDrivePath(property), { state: { property } })
  }

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const pagination = useMemo(() => {
    const start = Math.max(1, safePage - 2)
    const end = Math.min(totalPages, start + 4)
    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [safePage, totalPages])

  return (
    <div className="test-drive-landing">
      <Header />
      <main className="test-drive-landing__main">
        <section className="test-drive-hero">
          <img src={HERO_IMAGE} alt="" className="test-drive-hero__image" />
          <div className="test-drive-hero__shade" aria-hidden />
          <div className="test-drive-hero__content">
            <h1>Тест-драйв недвижимости</h1>
            <p className="test-drive-hero__subtitle">Маленький отпуск перед покупкой</p>
            <p className="test-drive-hero__lead">
              Поживите в объекте до сделки и примите взвешенное решение
            </p>
            <Link to="/profile/bookings" className="test-drive-hero__button">
              Мои брони
            </Link>
          </div>
        </section>

        <div className="test-drive-landing__container">
          <section className="test-drive-story" aria-label="Что такое тест-драйв недвижимости">
            {STORY_CARDS.map(({ icon: Icon, title, text }) => (
              <article className="test-drive-story__item" key={title}>
                <span className="test-drive-story__icon" aria-hidden>
                  <Icon size={25} />
                </span>
                <div>
                  <h2>{title}</h2>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </section>

          <section className="test-drive-catalog" id="test-drive-catalog">
            <TestDriveFiltersPanel
              className="test-drive-filter-panel test-drive-filter-panel--sidebar"
              filteredCount={filteredListings.length || listings.length}
              selectedTypes={selectedTypes}
              selectedDirections={selectedDirections}
              selectedDurations={selectedDurations}
              selectedAmenities={selectedAmenities}
              price={price}
              onReset={resetFilters}
              onToggleType={(value) => toggleValue(value, setSelectedTypes)}
              onToggleDirection={(value) => toggleValue(value, setSelectedDirections)}
              onToggleDuration={(value) => toggleValue(value, setSelectedDurations)}
              onToggleAmenity={(value) => toggleValue(value, setSelectedAmenities)}
              onPriceChange={setPrice}
            />

            <div className="test-drive-results">
              <div className="test-drive-results__head">
                <div>
                  <h2>
                    Объекты с тест-драйвом <span>{loading ? '...' : filteredListings.length}</span>
                  </h2>
                  <p>
                    {activeFilterCount
                      ? `Активных фильтров: ${activeFilterCount}`
                      : 'Выберите виллу, апартаменты или дом для проживания до сделки'}
                  </p>
                </div>
              </div>

              <div className="test-drive-toolbar">
                <label className="test-drive-search" aria-label="Поиск по объекту или локации">
                  <FiSearch size={19} aria-hidden />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Поиск по объекту или локации"
                  />
                  {query ? (
                    <button type="button" onClick={() => setQuery('')} aria-label="Очистить поиск">
                      <FiX size={17} aria-hidden />
                    </button>
                  ) : null}
                </label>

                <button
                  type="button"
                  className={`test-drive-filters-btn${hasActiveFilters ? ' is-active' : ''}`}
                  onClick={() => setFiltersDrawerOpen(true)}
                  aria-label="Фильтры"
                  aria-expanded={filtersDrawerOpen}
                >
                  <FiSliders size={18} aria-hidden />
                  <span className="test-drive-filters-btn__label">Фильтры</span>
                  {hasActiveFilters ? <span className="test-drive-filters-btn__dot" aria-hidden /> : null}
                </button>

                <label className="test-drive-sort test-drive-sort--desktop">
                  <FiSliders size={18} aria-hidden />
                  <select value={sort} onChange={(event) => setSort(event.target.value)}>
                    <option value="new">Сначала новые</option>
                    <option value="price">Сначала дешевле</option>
                    <option value="rating">По рейтингу</option>
                  </select>
                </label>
              </div>

              <SharesMobileFiltersDrawer
                isOpen={filtersDrawerOpen}
                onClose={() => setFiltersDrawerOpen(false)}
                title="Фильтры"
                applyLabel={`Показать ${filteredListings.length || listings.length} объектов`}
                onApply={() => setFiltersDrawerOpen(false)}
              >
                <TestDriveFiltersPanel
                  className="test-drive-filter-panel test-drive-filter-panel--drawer"
                  filteredCount={filteredListings.length || listings.length}
                  selectedTypes={selectedTypes}
                  selectedDirections={selectedDirections}
                  selectedDurations={selectedDurations}
                  selectedAmenities={selectedAmenities}
                  price={price}
                  sort={sort}
                  onSortChange={setSort}
                  onReset={resetFilters}
                  onToggleType={(value) => toggleValue(value, setSelectedTypes)}
                  onToggleDirection={(value) => toggleValue(value, setSelectedDirections)}
                  onToggleDuration={(value) => toggleValue(value, setSelectedDurations)}
                  onToggleAmenity={(value) => toggleValue(value, setSelectedAmenities)}
                  onPriceChange={setPrice}
                  showSort
                />
              </SharesMobileFiltersDrawer>

              {filteredListings.length === 0 ? (
                <div className="test-drive-empty">
                  <FiSun size={34} aria-hidden />
                  <h3>По этим условиям пока нет объектов</h3>
                  <p>Сбросьте часть фильтров или измените поиск, чтобы увидеть тест-драйвы.</p>
                  <button type="button" onClick={resetFilters}>
                    Показать все
                  </button>
                </div>
              ) : (
                <>
                  <div className="test-drive-card-grid">
                    {pageListings.map((listing) => (
                      <article className="test-drive-card" key={listing.id}>
                        <button
                          type="button"
                          className={`test-drive-card__favorite${favorites.has(listing.id) ? ' is-active' : ''}`}
                          onClick={() => toggleFavorite(listing.id)}
                          aria-label="Добавить в избранное"
                        >
                          <FiHeart size={22} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="test-drive-card__image-button"
                          onClick={() => openListing(listing)}
                        >
                          <img src={listing.image} alt={listing.title} />
                        </button>
                        <div className="test-drive-card__body">
                          <button type="button" onClick={() => openListing(listing)}>
                            {listing.title}
                          </button>
                          <p>{listing.location}</p>
                          <div className="test-drive-card__specs">
                            <span>{listing.bedrooms} спальни</span>
                            <span>{listing.bathrooms} ванные</span>
                            <span>{listing.area} м²</span>
                          </div>
                          <div className="test-drive-card__price">
                            <strong>€{listing.price}</strong>
                            <span>/ ночь</span>
                          </div>
                          <div className="test-drive-card__meta">
                            <span className="test-drive-card__rating">
                              <FaStar size={13} aria-hidden />
                              {listing.rating.toFixed(1)} ({listing.reviews})
                            </span>
                            <span className="test-drive-card__badge">
                              Тест-драйв от {listing.stayDays} дней
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  <nav className="test-drive-pagination" aria-label="Пагинация объектов">
                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={safePage === 1}
                      aria-label="Предыдущая страница"
                    >
                      <FiArrowLeft size={17} aria-hidden />
                    </button>
                    {pagination.map((pageNumber) => (
                      <button
                        type="button"
                        key={pageNumber}
                        className={pageNumber === safePage ? 'is-active' : ''}
                        onClick={() => setPage(pageNumber)}
                        aria-current={pageNumber === safePage ? 'page' : undefined}
                      >
                        {pageNumber}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={safePage === totalPages}
                      aria-label="Следующая страница"
                    >
                      <FiArrowRight size={17} aria-hidden />
                    </button>
                  </nav>
                </>
              )}
            </div>
          </section>

          <section className="test-drive-next" aria-label="Другие сценарии покупки">
            {NEXT_LINKS.map(({ title, text, to, icon: Icon, image, accent, cta }) => (
              <Link className="test-drive-next-card" to={to} key={title}>
                <img src={image} alt="" />
                <span className="test-drive-next-card__overlay" aria-hidden />
                <span className={`test-drive-next-card__icon test-drive-next-card__icon--${accent}`}>
                  <Icon size={27} aria-hidden />
                </span>
                <span className="test-drive-next-card__content">
                  <strong>{title}</strong>
                  <span>{text}</span>
                </span>
                <span className="test-drive-next-card__button">
                  {cta}
                  <FiArrowRight size={16} aria-hidden />
                </span>
              </Link>
            ))}
          </section>
        </div>
      </main>
    </div>
  )
}

function TestDriveFiltersPanel({
  className = '',
  filteredCount,
  selectedTypes,
  selectedDirections,
  selectedDurations,
  selectedAmenities,
  price,
  sort,
  onSortChange,
  onReset,
  onToggleType,
  onToggleDirection,
  onToggleDuration,
  onToggleAmenity,
  onPriceChange,
  showSort = false,
}) {
  return (
    <aside className={className} aria-label="Фильтры">
      <div className="test-drive-filter-panel__head">
        <h2>Фильтры</h2>
        <button type="button" onClick={onReset}>
          Сбросить
        </button>
      </div>

      <FilterGroup
        title="Тип объекта"
        options={TYPE_FILTERS}
        values={selectedTypes}
        onToggle={onToggleType}
      />
      <FilterGroup
        title="Город"
        options={CITY_FILTERS}
        values={selectedDirections}
        onToggle={onToggleDirection}
        moreLabel="Показать ещё"
      />
      <FilterGroup
        title="Длительность"
        options={DURATION_FILTERS}
        values={selectedDurations}
        onToggle={onToggleDuration}
      />

      <div className="test-drive-filter-block">
        <button type="button" className="test-drive-filter-block__title">
          <span>Цена за ночь</span>
          <FiChevronDown size={16} aria-hidden />
        </button>
        <div className="test-drive-price-filter">
          <input
            type="range"
            min="100"
            max="500"
            step="10"
            value={price}
            onChange={(event) => onPriceChange(Number(event.target.value))}
            aria-label="Цена за ночь"
          />
          <div>
            <span>€100</span>
            <strong>€{price}+</strong>
          </div>
        </div>
      </div>

      <FilterGroup
        title="Удобства"
        options={AMENITY_FILTERS}
        values={selectedAmenities}
        onToggle={onToggleAmenity}
        moreLabel="Показать ещё"
      />

      {showSort ? (
        <div className="test-drive-filter-block test-drive-filter-block--sort">
          <span className="test-drive-filter-block__title test-drive-filter-block__title--static">
            Сортировка
          </span>
          <label className="test-drive-sort test-drive-sort--drawer">
            <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
              <option value="new">Сначала новые</option>
              <option value="price">Сначала дешевле</option>
              <option value="rating">По рейтингу</option>
            </select>
          </label>
        </div>
      ) : null}

      <button type="button" className="test-drive-filter-panel__apply test-drive-filter-panel__apply--sidebar">
        Показать {filteredCount} объектов
      </button>
    </aside>
  )
}

function FilterGroup({ title, options, values, onToggle, moreLabel }) {
  return (
    <div className="test-drive-filter-block">
      <button type="button" className="test-drive-filter-block__title">
        <span>{title}</span>
        <FiChevronDown size={16} aria-hidden />
      </button>
      <div className="test-drive-filter-options">
        {options.map((option) => (
          <label className="test-drive-check" key={option}>
            <input
              type="checkbox"
              checked={values.includes(option)}
              onChange={() => onToggle(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      {moreLabel ? (
        <button type="button" className="test-drive-filter-block__more">
          {moreLabel}
        </button>
      ) : null}
    </div>
  )
}

export default TestDriveLandingPage
