import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiChevronDown,
  FiCheckCircle,
  FiHeart,
  FiHome,
  FiSearch,
  FiShield,
  FiSliders,
  FiUmbrella,
} from 'react-icons/fi'
import { FaStar } from 'react-icons/fa'
import Header from '../components/Header'
import SharesMobileFiltersDrawer from '../components/SharesMobileFiltersDrawer'
import AuctionCategoryCtaCards from '../components/AuctionCategoryCtaCards'
import ListingPagePagination from '../components/ListingPagePagination'
import BuyerEmptyState from '../components/buyer-mobile/BuyerEmptyState'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import { getPropertyCardImage } from '../utils/propertyImage'
import { formatPropertyForListingCard } from '../utils/formatPropertyListingCard'
import { auctionListingDedupeKey, getPropertyTestDrivePath } from '../utils/propertyDetailUrl'
import { publicAsset } from '../utils/publicAsset'
import {
  isWithinSelectedTestDrivePrice,
  mapRealTestDriveListing,
  matchesSelectedTestDriveAmenities,
  matchesSelectedTestDriveDurations,
  matchesSelectedTestDriveType,
  paginateTestDriveListings,
  realTestDriveListings,
  sortTestDriveListings,
} from './testDriveListingData'
import './TestDriveLandingPage.css'
import '../components/PropertyList.css'

const API_BASE = import.meta.env?.VITE_API_BASE_URL || '/api'
const PAGE_SIZE = 16

const HERO_IMAGE = publicAsset('images/test-drive/hero-resort.png')
const HERO_MOBILE_IMAGE = publicAsset('images/test-drive/hero-resort-mobile.png')
const TEST_DRIVE_EMPTY_IMAGE = publicAsset('images/test-drive-empty-illustration.png')
const TEST_DRIVE_CARD_IMAGE_FALLBACK = publicAsset(
  'images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg',
)

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

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function mapApiPropertyToListing(property, index) {
  const image = getPropertyCardImage(property, TEST_DRIVE_CARD_IMAGE_FALLBACK)
  const formatted = formatPropertyForListingCard({
    ...property,
    image,
    images: image ? [image] : [],
    title: property.title || property.name || '',
  })

  return mapRealTestDriveListing(formatted, index, {
    id: auctionListingDedupeKey(formatted),
    image,
  })
}

function handleTestDriveImageError(event) {
  const image = event.currentTarget
  if (image.getAttribute('src') === TEST_DRIVE_CARD_IMAGE_FALLBACK) return
  image.onerror = null
  image.src = TEST_DRIVE_CARD_IMAGE_FALLBACK
}

const TestDriveLandingPage = () => {
  const navigate = useNavigate()
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/properties/test-drive`)
        const json = await (res.ok ? res.json() : { success: false, data: [] })
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setApiListings(json.data)
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

  const listings = useMemo(
    () => realTestDriveListings(apiListings, mapApiPropertyToListing),
    [apiListings],
  )

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
      const typeOk = matchesSelectedTestDriveType(item.type, selectedTypes)
      const directionOk = selectedDirections.length === 0 || selectedDirections.includes(item.city)
      const durationOk = matchesSelectedTestDriveDurations(item, selectedDurations)
      const amenityOk = matchesSelectedTestDriveAmenities(item, selectedAmenities)
      const priceOk = isWithinSelectedTestDrivePrice(item.price, price)
      return (!q || haystack.includes(q)) && typeOk && directionOk && durationOk && amenityOk && priceOk
    })

    return sortTestDriveListings(filtered, sort)
  }, [listings, price, query, selectedAmenities, selectedDirections, selectedDurations, selectedTypes, sort])

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageListings = useMemo(
    () => paginateTestDriveListings(filteredListings, safePage, PAGE_SIZE),
    [filteredListings, safePage],
  )

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [query, selectedTypes, selectedDirections, selectedDurations, selectedAmenities, price, sort])

  const scrollToCatalog = () => {
    document.getElementById('test-drive-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const goToPage = (nextPage) => {
    const safeNext = Math.max(1, Math.min(nextPage, totalPages))
    setPage(safeNext)
    requestAnimationFrame(scrollToCatalog)
  }

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

  const isListingFavorite = (listing) => {
    const favoriteProperty = listing.originalProperty || listing
    const mockCategory = hasDbBackedProperty(favoriteProperty) ? undefined : 'property'
    return isFavorite(favoriteProperty, mockCategory)
  }

  const toggleListingFavorite = (listing) => {
    const favoriteProperty = listing.originalProperty || listing
    const mockCategory = hasDbBackedProperty(favoriteProperty) ? undefined : 'property'
    void toggleFavorite(favoriteProperty, mockCategory)
  }

  return (
    <div className="test-drive-landing">
      <Header />
      <main className="test-drive-landing__main">
        <section className="test-drive-hero">
          <picture>
            <source media="(max-width: 640px)" srcSet={HERO_MOBILE_IMAGE} />
            <img src={HERO_IMAGE} alt="" className="test-drive-hero__image" />
          </picture>
          <div className="test-drive-hero__shade" aria-hidden />
          <div className="test-drive-hero__content">
            <div className="test-drive-hero__copy test-drive-hero__copy--desktop">
              <h1>Тест-драйв недвижимости</h1>
              <p className="test-drive-hero__subtitle">Маленький отпуск перед покупкой</p>
              <p className="test-drive-hero__lead">
                Поживите в объекте до сделки и примите взвешенное решение
              </p>
            </div>

            <div className="test-drive-hero__copy test-drive-hero__copy--mobile">
              <h1>Поживите здесь до покупки</h1>
              <p className="test-drive-hero__eyebrow">Тест-драйв недвижимости · Коста-дель-Соль</p>
            </div>

            <div
              className="test-drive-hero-card test-drive-hero-ticket"
              aria-label="Тест-драйв"
            >
              <div className="test-drive-hero-ticket__stub">
                <strong className="test-drive-hero-ticket__title">Ваш тест-драйв</strong>
                <p className="test-drive-hero-ticket__lead">
                  Поживите в объекте до сделки — без обязательств купить.
                </p>

                <ol className="test-drive-hero-ticket__steps" aria-label="Как это работает">
                  <li>Выберите</li>
                  <li>Поживите</li>
                  <li>Решите</li>
                </ol>

                <div className="test-drive-hero-ticket__trust" aria-label="Преимущества">
                  <span>
                    <FiCheckCircle size={14} aria-hidden /> Без обязательств
                  </span>
                  <span>
                    <FiShield size={14} aria-hidden /> Проверенные объекты
                  </span>
                </div>
              </div>
              <div className="test-drive-hero-ticket__perforation" aria-hidden>
                <span />
              </div>
              <div className="test-drive-hero-ticket__tear">
                <button
                  type="button"
                  className="test-drive-hero-card__action"
                  onClick={scrollToCatalog}
                >
                  Найти свободные объекты
                </button>
                <Link to="/profile/bookings" className="test-drive-hero-ticket__secondary">
                  Мои брони
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="test-drive-landing__container">
          <section className="test-drive-story" aria-label="Что такое тест-драйв недвижимости">
            <div className="test-drive-story__items">
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
            </div>
            <Link to="/profile/bookings" className="test-drive-story__button">
              Мои брони
            </Link>
          </section>

          <section className="test-drive-catalog" id="test-drive-catalog">
            <TestDriveFiltersPanel
              className="test-drive-filter-panel test-drive-filter-panel--sidebar"
              filteredCount={filteredListings.length}
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
                    Дома, в которых можно пожить <span>{loading ? '...' : filteredListings.length}</span>
                  </h2>
                  <p>
                    {activeFilterCount
                      ? `Активных фильтров: ${activeFilterCount}`
                      : 'До 16 вариантов на странице — сравните ощущения до покупки'}
                  </p>
                </div>
              </div>

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
                      placeholder="Поиск по объекту или локации"
                      aria-label="Поиск по объекту или локации"
                    />
                    {query ? (
                      <button
                        type="button"
                        className="debts-listing-search__clear"
                        onClick={() => setQuery('')}
                        aria-label="Очистить поиск"
                      >
                        ×
                      </button>
                    ) : null}
                    <button type="submit" className="debts-listing-search__go" aria-label="Найти">
                      <FiSearch aria-hidden />
                    </button>
                  </form>

                  <div className="filters-and-types-grid">
                    <button
                      type="button"
                      className={`filters-button${hasActiveFilters ? ' is-active' : ''}`}
                      aria-expanded={filtersDrawerOpen}
                      aria-label="Фильтры"
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
                      <span className="filters-button__label">Фильтры</span>
                      {activeFilterCount > 0 ? (
                        <span className="filters-badge" aria-hidden="true">
                          {activeFilterCount}
                        </span>
                      ) : null}
                    </button>
                  </div>
                </div>

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
                applyLabel={`Показать ${filteredListings.length} объектов`}
                onApply={() => setFiltersDrawerOpen(false)}
                onReset={resetFilters}
              >
                <TestDriveFiltersPanel
                  className="test-drive-filter-panel test-drive-filter-panel--drawer"
                  filteredCount={filteredListings.length}
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

              {loading ? null : filteredListings.length === 0 ? (
                <BuyerEmptyState
                  className="test-drive-empty-guided"
                  image={TEST_DRIVE_EMPTY_IMAGE}
                  eyebrow={null}
                  title={
                    listings.length
                      ? 'Подходящих тест-драйвов пока нет'
                      : 'Сейчас нет доступных тест-драйвов'
                  }
                  description={
                    listings.length
                      ? 'Снимем ограничения и покажем все объекты, где можно пожить до сделки.'
                      : 'Каталог обновится, когда появятся новые предложения. А пока можно посмотреть другие объекты.'
                  }
                  primaryLabel={listings.length ? 'Показать все тест-драйвы' : 'Смотреть другие объекты'}
                  onPrimary={listings.length ? resetFilters : () => navigate('/auction')}
                />
              ) : (
                <>
                  <div className="test-drive-card-grid">
                    {pageListings.map((listing) => {
                      const favoriteActive = isListingFavorite(listing)
                      return (
                      <article className="test-drive-card" key={listing.id}>
                        <button
                          type="button"
                          className={`test-drive-card__favorite${favoriteActive ? ' is-active' : ''}`}
                          onClick={() => toggleListingFavorite(listing)}
                          aria-label={favoriteActive ? 'Убрать из избранного' : 'Добавить в избранное'}
                          aria-pressed={favoriteActive}
                        >
                          <FiHeart size={22} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="test-drive-card__image-button"
                          onClick={() => openListing(listing)}
                        >
                          <img
                            src={listing.image || TEST_DRIVE_CARD_IMAGE_FALLBACK}
                            alt={listing.title}
                            onError={handleTestDriveImageError}
                          />
                        </button>
                        <div className="test-drive-card__body">
                          <button type="button" onClick={() => openListing(listing)}>
                            {listing.title}
                          </button>
                          <p>{listing.location}</p>
                          <div className="test-drive-card__specs">
                            {listing.bedrooms != null ? <span>{listing.bedrooms} спальни</span> : null}
                            {listing.bathrooms != null ? <span>{listing.bathrooms} ванные</span> : null}
                            {listing.area != null ? <span>{listing.area} м²</span> : null}
                          </div>
                          <div className="test-drive-card__footer">
                            <div className="test-drive-card__price">
                              {listing.price != null ? (
                                <>
                                  <strong>€{listing.price}</strong>
                                  <span>/ ночь</span>
                                </>
                              ) : (
                                <strong>По запросу</strong>
                              )}
                            </div>
                            {listing.rating != null ? (
                              <span className="test-drive-card__rating">
                                <FaStar size={13} aria-hidden />
                                {listing.rating.toFixed(1)}
                                {listing.reviews != null ? ` (${listing.reviews})` : null}
                              </span>
                            ) : (
                              <span className="test-drive-card__rating test-drive-card__rating--new">Новый</span>
                            )}
                          </div>
                        </div>
                      </article>
                      )
                    })}
                  </div>

                  <ListingPagePagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                  />
                </>
              )}
            </div>
          </section>
        </div>
      </main>
      <AuctionCategoryCtaCards variant="testDrivePage" />
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
