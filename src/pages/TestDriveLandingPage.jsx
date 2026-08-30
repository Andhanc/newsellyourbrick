import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FiChevronDown,
  FiCheckCircle,
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
import SectionInfoDrawer from '../components/SectionInfoDrawer'
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
  matchesSelectedTestDriveCity,
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

const TYPE_FILTERS = [
  { value: 'villa', labelKey: 'testDriveLanding_type_villa' },
  { value: 'apartment', labelKey: 'testDriveLanding_type_apartment' },
  { value: 'townhouse', labelKey: 'testDriveLanding_type_townhouse' },
  { value: 'house', labelKey: 'testDriveLanding_type_house' },
  { value: 'penthouse', labelKey: 'testDriveLanding_type_penthouse' },
]
const CITY_FILTERS = [
  { value: 'los_cristianos', labelKey: 'testDriveLanding_city_los_cristianos' },
  { value: 'adeje', labelKey: 'testDriveLanding_city_adeje' },
  { value: 'marbella', labelKey: 'testDriveLanding_city_marbella' },
  { value: 'barcelona', labelKey: 'testDriveLanding_city_barcelona' },
  { value: 'madrid', labelKey: 'testDriveLanding_city_madrid' },
  { value: 'valencia', labelKey: 'testDriveLanding_city_valencia' },
  { value: 'malaga', labelKey: 'testDriveLanding_city_malaga' },
  { value: 'alicante', labelKey: 'testDriveLanding_city_alicante' },
  { value: 'sevilla', labelKey: 'testDriveLanding_city_sevilla' },
  { value: 'palma', labelKey: 'testDriveLanding_city_palma' },
]
const DURATION_FILTERS = [
  { value: '3-7_days', labelKey: 'testDriveLanding_duration_3_7_days' },
  { value: '1-2_weeks', labelKey: 'testDriveLanding_duration_1_2_weeks' },
  { value: '2-4_weeks', labelKey: 'testDriveLanding_duration_2_4_weeks' },
  { value: '1-3_months', labelKey: 'testDriveLanding_duration_1_3_months' },
  { value: 'over_3_months', labelKey: 'testDriveLanding_duration_over_3_months' },
]
const AMENITY_FILTERS = [
  { value: 'pool', labelKey: 'testDriveLanding_amenity_pool' },
  { value: 'sea_view', labelKey: 'testDriveLanding_amenity_sea_view' },
  { value: 'terrace', labelKey: 'testDriveLanding_amenity_terrace' },
  { value: 'wifi', labelKey: 'testDriveLanding_amenity_wifi' },
  { value: 'parking', labelKey: 'testDriveLanding_amenity_parking' },
]

const STORY_CARDS = [
  { icon: FiHome, titleKey: 'testDriveLanding_story1Title', textKey: 'testDriveLanding_story1Text' },
  { icon: FiUmbrella, titleKey: 'testDriveLanding_story2Title', textKey: 'testDriveLanding_story2Text' },
  { icon: FiShield, titleKey: 'testDriveLanding_story3Title', textKey: 'testDriveLanding_story3Text' },
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
  const { t } = useTranslation()
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
      const directionOk = matchesSelectedTestDriveCity(item.city, selectedDirections)
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
          <div className="test-drive-hero__brand" aria-label="SellYourBrick">
            <span className="test-drive-hero__brand-text">
              <span>Sell</span>
              <span className="test-drive-hero__brand-accent">Your</span>
              <span>Brick</span>
            </span>
          </div>
          <div className="test-drive-hero__content">
            <div className="test-drive-hero__copy test-drive-hero__copy--desktop">
              <div className="section-info-heading-row">
                <h1>{t('testDrive')}</h1>
                <SectionInfoDrawer section="testDrive" placement="heading" />
              </div>
              <p className="test-drive-hero__subtitle">{t('testDriveLanding_heroSubtitle')}</p>
              <p className="test-drive-hero__lead">{t('testDriveLanding_heroLead')}</p>
            </div>

            <div className="test-drive-hero__copy test-drive-hero__copy--mobile">
              <div className="section-info-heading-row">
                <h1>{t('testDrive')}</h1>
                <SectionInfoDrawer section="testDrive" placement="heading" />
              </div>
              <p className="test-drive-hero__eyebrow">{t('testDriveLanding_heroMobileEyebrow')}</p>
            </div>

            <div
              className="test-drive-hero-card test-drive-hero-ticket"
              aria-label={t('testDriveLanding_ticketAria')}
            >
              <div className="test-drive-hero-ticket__stub">
                <strong className="test-drive-hero-ticket__title">{t('testDriveLanding_ticketTitle')}</strong>
                <p className="test-drive-hero-ticket__lead">{t('testDriveLanding_ticketLead')}</p>

                <ol className="test-drive-hero-ticket__steps" aria-label={t('testDriveLanding_howItWorksAria')}>
                  <li>{t('testDriveLanding_step1')}</li>
                  <li>{t('testDriveLanding_step2')}</li>
                  <li>{t('testDriveLanding_step3')}</li>
                </ol>

                <div className="test-drive-hero-ticket__trust" aria-label={t('testDriveLanding_benefitsAria')}>
                  <span>
                    <FiCheckCircle size={14} aria-hidden /> {t('testDriveLanding_noObligation')}
                  </span>
                  <span>
                    <FiShield size={14} aria-hidden /> {t('testDriveLanding_verifiedObjects')}
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
                  {t('testDriveLanding_findAvailable')}
                </button>
                <Link to="/profile?bookings=1" className="test-drive-hero-ticket__secondary">
                  {t('testDriveLanding_myBookings')}
                </Link>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="test-drive-hero__scroll-button"
            aria-label={t('testDriveLanding_scrollToCatalog')}
            onClick={scrollToCatalog}
          >
            <FiChevronDown size={24} strokeWidth={2.7} aria-hidden />
          </button>
        </section>

        <div className="test-drive-landing__container">
          <section className="test-drive-story" aria-label={t('testDriveLanding_storyAria')}>
            <div className="test-drive-story__items">
              {STORY_CARDS.map(({ icon: Icon, titleKey, textKey }) => (
                <article className="test-drive-story__item" key={titleKey}>
                  <span className="test-drive-story__icon" aria-hidden>
                    <Icon size={25} />
                  </span>
                  <div>
                    <h2>{t(titleKey)}</h2>
                    <p>{t(textKey)}</p>
                  </div>
                </article>
              ))}
            </div>
            <Link to="/profile?bookings=1" className="test-drive-story__button">
              {t('testDriveLanding_myBookings')}
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
                    {t('testDriveLanding_resultsDefault')}{' '}
                    <span>{loading ? '...' : filteredListings.length}</span>
                  </h2>
                  <p>
                    {activeFilterCount
                      ? t('testDriveLanding_activeFilters', { count: activeFilterCount })
                      : t('testDriveLanding_resultsHint')}
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
                      placeholder={t('testDriveLanding_searchPlaceholder')}
                      aria-label={t('testDriveLanding_searchPlaceholder')}
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
                    <button type="submit" className="debts-listing-search__go" aria-label={t('testDriveLanding_find')}>
                      <FiSearch aria-hidden />
                    </button>
                  </form>

                  <div className="filters-and-types-grid">
                    <button
                      type="button"
                      className={`filters-button${hasActiveFilters ? ' is-active' : ''}`}
                      aria-expanded={filtersDrawerOpen}
                      aria-label={t('testDriveLanding_filters')}
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
                      <span className="filters-button__label">{t('testDriveLanding_filters')}</span>
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
                    <option value="new">{t('testDriveLanding_sortNewest')}</option>
                    <option value="price">{t('testDriveLanding_sortCheapest')}</option>
                    <option value="rating">{t('testDriveLanding_sortRating')}</option>
                  </select>
                </label>
              </div>

              <SharesMobileFiltersDrawer
                isOpen={filtersDrawerOpen}
                onClose={() => setFiltersDrawerOpen(false)}
                title={t('testDriveLanding_filters')}
                applyLabel={t('testDriveLanding_showObjects', { count: filteredListings.length })}
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
                      ? t('testDriveLanding_emptyFilteredTitle')
                      : t('testDriveLanding_emptyCatalogTitle')
                  }
                  description={
                    listings.length
                      ? t('testDriveLanding_emptyFilteredDesc')
                      : t('testDriveLanding_emptyCatalogDesc')
                  }
                  primaryLabel={
                    listings.length
                      ? t('testDriveLanding_showAllTestDrives')
                      : t('testDriveLanding_seeOtherObjects')
                  }
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
                          className={`property-favorite${favoriteActive ? ' active' : ''}`}
                          onClick={() => toggleListingFavorite(listing)}
                          aria-label={
                            favoriteActive
                              ? t('testDriveLanding_removeFavorite')
                              : t('testDriveLanding_addFavorite')
                          }
                          aria-pressed={favoriteActive}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path
                              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill={favoriteActive ? 'currentColor' : 'none'}
                            />
                          </svg>
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
                            {listing.bedrooms != null ? (
                              <span>{t('testDriveLanding_bedrooms', { count: listing.bedrooms })}</span>
                            ) : null}
                            {listing.bathrooms != null ? (
                              <span>{t('testDriveLanding_bathrooms', { count: listing.bathrooms })}</span>
                            ) : null}
                            {listing.area != null ? (
                              <span>{t('testDriveLanding_areaM2', { area: listing.area })}</span>
                            ) : null}
                          </div>
                          <div className="test-drive-card__footer">
                            <div className="test-drive-card__price">
                              {listing.price != null ? (
                                <>
                                  <strong>€{listing.price}</strong>
                                  <span>{t('testDriveLanding_perNight')}</span>
                                </>
                              ) : (
                                <strong>{t('testDriveLanding_onRequest')}</strong>
                              )}
                            </div>
                            {listing.rating != null ? (
                              <span className="test-drive-card__rating">
                                <FaStar size={13} aria-hidden />
                                {listing.rating.toFixed(1)}
                                {listing.reviews != null ? ` (${listing.reviews})` : null}
                              </span>
                            ) : (
                              <span className="test-drive-card__rating test-drive-card__rating--new">
                                {t('testDriveLanding_new')}
                              </span>
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
  const { t } = useTranslation()

  return (
    <aside className={className} aria-label={t('testDriveLanding_filters')}>
      <div className="test-drive-filter-panel__head">
        <h2>{t('testDriveLanding_filters')}</h2>
        <button type="button" onClick={onReset}>
          {t('testDriveLanding_reset')}
        </button>
      </div>

      <FilterGroup
        title={t('testDriveLanding_typeTitle')}
        options={TYPE_FILTERS}
        values={selectedTypes}
        onToggle={onToggleType}
        t={t}
      />
      <FilterGroup
        title={t('testDriveLanding_cityTitle')}
        options={CITY_FILTERS}
        values={selectedDirections}
        onToggle={onToggleDirection}
        moreLabel={t('testDriveLanding_showMore')}
        t={t}
      />
      <FilterGroup
        title={t('testDriveLanding_durationTitle')}
        options={DURATION_FILTERS}
        values={selectedDurations}
        onToggle={onToggleDuration}
        t={t}
      />

      <div className="test-drive-filter-block">
        <button type="button" className="test-drive-filter-block__title">
          <span>{t('testDriveLanding_pricePerNight')}</span>
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
            aria-label={t('testDriveLanding_pricePerNight')}
          />
          <div>
            <span>€100</span>
            <strong>€{price}+</strong>
          </div>
        </div>
      </div>

      <FilterGroup
        title={t('testDriveLanding_amenitiesTitle')}
        options={AMENITY_FILTERS}
        values={selectedAmenities}
        onToggle={onToggleAmenity}
        t={t}
      />

      {showSort ? (
        <div className="test-drive-filter-block test-drive-filter-block--sort">
          <span className="test-drive-filter-block__title test-drive-filter-block__title--static">
            {t('testDriveLanding_sortLabel')}
          </span>
          <label className="test-drive-sort test-drive-sort--drawer">
            <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
              <option value="new">{t('testDriveLanding_sortNewest')}</option>
              <option value="price">{t('testDriveLanding_sortCheapest')}</option>
              <option value="rating">{t('testDriveLanding_sortRating')}</option>
            </select>
          </label>
        </div>
      ) : null}

      <button type="button" className="test-drive-filter-panel__apply test-drive-filter-panel__apply--sidebar">
        {t('testDriveLanding_showObjects', { count: filteredCount })}
      </button>
    </aside>
  )
}

function FilterGroup({ title, options, values, onToggle, moreLabel, t }) {
  return (
    <div className="test-drive-filter-block">
      <button type="button" className="test-drive-filter-block__title">
        <span>{title}</span>
        <FiChevronDown size={16} aria-hidden />
      </button>
      <div className="test-drive-filter-options">
        {options.map((option) => (
          <label className="test-drive-check" key={option.value}>
            <input
              type="checkbox"
              checked={values.includes(option.value)}
              onChange={() => onToggle(option.value)}
            />
            <span>{t(option.labelKey)}</span>
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
