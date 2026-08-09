import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FiArrowRight,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
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
  { id: 'villa', labelKey: 'testDriveLanding_type_villa' },
  { id: 'apartment', labelKey: 'testDriveLanding_type_apartment' },
  { id: 'townhouse', labelKey: 'testDriveLanding_type_townhouse' },
  { id: 'house', labelKey: 'testDriveLanding_type_house' },
  { id: 'penthouse', labelKey: 'testDriveLanding_type_penthouse' },
]
const CITY_FILTERS = [
  { id: 'Marbella', labelKey: 'testDriveLanding_city_marbella' },
  { id: 'Barcelona', labelKey: 'testDriveLanding_city_barcelona' },
  { id: 'Madrid', labelKey: 'testDriveLanding_city_madrid' },
  { id: 'Valencia', labelKey: 'testDriveLanding_city_valencia' },
  { id: 'Malaga', labelKey: 'testDriveLanding_city_malaga' },
  { id: 'Alicante', labelKey: 'testDriveLanding_city_alicante' },
  { id: 'Sevilla', labelKey: 'testDriveLanding_city_sevilla' },
  { id: 'Palma', labelKey: 'testDriveLanding_city_palma' },
]
const DURATION_FILTERS = [
  { id: '3-7_days', labelKey: 'testDriveLanding_duration_3_7_days' },
  { id: '1-2_weeks', labelKey: 'testDriveLanding_duration_1_2_weeks' },
  { id: '2-4_weeks', labelKey: 'testDriveLanding_duration_2_4_weeks' },
  { id: '1-3_months', labelKey: 'testDriveLanding_duration_1_3_months' },
  { id: 'over_3_months', labelKey: 'testDriveLanding_duration_over_3_months' },
]
const AMENITY_FILTERS = [
  { id: 'pool', labelKey: 'testDriveLanding_amenity_pool' },
  { id: 'sea_view', labelKey: 'testDriveLanding_amenity_sea_view' },
  { id: 'terrace', labelKey: 'testDriveLanding_amenity_terrace' },
  { id: 'wifi', labelKey: 'testDriveLanding_amenity_wifi' },
  { id: 'parking', labelKey: 'testDriveLanding_amenity_parking' },
]
const TEST_DRIVE_WEEKDAY_KEYS = [
  'testDriveLanding_weekday_mon',
  'testDriveLanding_weekday_tue',
  'testDriveLanding_weekday_wed',
  'testDriveLanding_weekday_thu',
  'testDriveLanding_weekday_fri',
  'testDriveLanding_weekday_sat',
  'testDriveLanding_weekday_sun',
]
const TEST_DRIVE_MIN_DAYS = 5
const TEST_DRIVE_MAX_DAYS = 21

const STORY_CARDS = [
  {
    icon: FiHome,
    titleKey: 'testDriveLanding_story1Title',
    textKey: 'testDriveLanding_story1Text',
  },
  {
    icon: FiUmbrella,
    titleKey: 'testDriveLanding_story2Title',
    textKey: 'testDriveLanding_story2Text',
  },
  {
    icon: FiShield,
    titleKey: 'testDriveLanding_story3Title',
    textKey: 'testDriveLanding_story3Text',
  },
]

const LOCALE_BY_LANG = {
  ru: 'ru-RU',
  en: 'en-US',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
  sv: 'sv-SE',
}

function toIntlLocale(lang) {
  const code = String(lang || 'ru').split('-')[0]
  return LOCALE_BY_LANG[code] || 'en-US'
}

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

function startOfLocalDay(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function toLocalDateKey(value) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function testDriveDaysInclusive(start, end) {
  const duration = startOfLocalDay(end).getTime() - startOfLocalDay(start).getTime()
  return Math.round(duration / 86_400_000) + 1
}

function createTestDriveMonthCells(monthDate) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const mondayOffset = (monthStart.getDay() + 6) % 7
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return {
      date,
      key: toLocalDateKey(date),
      inCurrentMonth: date.getMonth() === monthDate.getMonth(),
    }
  })
}

function formatTestDriveMonth(value, locale) {
  const label = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(value)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatTestDriveShortDate(value, locale) {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
    .format(value)
    .replace('.', '')
}

const TestDriveLandingPage = () => {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
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
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  )
  const [arrivalDate, setArrivalDate] = useState(null)
  const [departureDate, setDepartureDate] = useState(null)
  const [calendarError, setCalendarError] = useState('')

  const today = useMemo(() => startOfLocalDay(new Date()), [])
  const calendarCells = useMemo(() => createTestDriveMonthCells(calendarMonth), [calendarMonth])
  const selectedRange = useMemo(
    () =>
      arrivalDate && departureDate
        ? { start: toLocalDateKey(arrivalDate), end: toLocalDateKey(departureDate) }
        : null,
    [arrivalDate, departureDate],
  )
  const selectedNights =
    arrivalDate && departureDate ? testDriveDaysInclusive(arrivalDate, departureDate) - 1 : 0

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
    navigate(getPropertyTestDrivePath(property), {
      state: { property, testDriveRange: selectedRange },
    })
  }

  const selectCalendarDate = (date) => {
    const selected = startOfLocalDay(date)
    if (selected < today || selected.getMonth() !== calendarMonth.getMonth()) return

    setCalendarError('')
    if (!arrivalDate || departureDate || selected < arrivalDate) {
      setArrivalDate(selected)
      setDepartureDate(null)
      return
    }

    const days = testDriveDaysInclusive(arrivalDate, selected)
    if (days < TEST_DRIVE_MIN_DAYS || days > TEST_DRIVE_MAX_DAYS) {
      setCalendarError(
        t('testDriveLanding_calendarRangeError', {
          min: TEST_DRIVE_MIN_DAYS,
          max: TEST_DRIVE_MAX_DAYS,
        }),
      )
      return
    }

    setDepartureDate(selected)
  }

  const shiftCalendarMonth = (direction) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1))
    setCalendarError('')
  }

  const isCalendarDateInRange = (date) => {
    if (!arrivalDate || !departureDate) return false
    const value = startOfLocalDay(date).getTime()
    return value > arrivalDate.getTime() && value < departureDate.getTime()
  }

  const isCurrentCalendarMonth =
    calendarMonth.getFullYear() === today.getFullYear() &&
    calendarMonth.getMonth() === today.getMonth()

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
        <section className="test-drive-calendar-hero" aria-labelledby="test-drive-calendar-title">
          <div className="test-drive-calendar-hero__intro">
            <span>{t('testDriveLanding_calendarEyebrow')}</span>
            <h1 id="test-drive-calendar-title">{t('testDriveLanding_calendarTitle')}</h1>
            <p>{t('testDriveLanding_calendarLead')}</p>
          </div>

          <div className="test-drive-calendar-card">
            <div className="test-drive-calendar-card__month">
              <button
                type="button"
                onClick={() => shiftCalendarMonth(-1)}
                disabled={isCurrentCalendarMonth}
                aria-label={t('testDriveLanding_prevMonth')}
              >
                <FiChevronLeft size={21} aria-hidden />
              </button>
              <strong>{formatTestDriveMonth(calendarMonth, locale)}</strong>
              <button
                type="button"
                onClick={() => shiftCalendarMonth(1)}
                aria-label={t('testDriveLanding_nextMonth')}
              >
                <FiChevronRight size={21} aria-hidden />
              </button>
            </div>

            <div className="test-drive-calendar-card__weekdays" aria-hidden>
              {TEST_DRIVE_WEEKDAY_KEYS.map((weekdayKey) => (
                <span key={weekdayKey}>{t(weekdayKey)}</span>
              ))}
            </div>

            <div
              className="test-drive-calendar-card__grid"
              role="grid"
              aria-label={formatTestDriveMonth(calendarMonth, locale)}
            >
              {calendarCells.map(({ date, key, inCurrentMonth }) => {
                const isPast = date < today
                const isDisabled = isPast || !inCurrentMonth
                const isArrival = arrivalDate && key === toLocalDateKey(arrivalDate)
                const isDeparture = departureDate && key === toLocalDateKey(departureDate)
                const isInRange = isCalendarDateInRange(date)
                const isToday = key === toLocalDateKey(today)
                const stateClass = [
                  'test-drive-calendar-card__day',
                  isDisabled ? 'is-disabled' : '',
                  isToday ? 'is-today' : '',
                  isInRange ? 'is-in-range' : '',
                  isArrival ? 'is-arrival' : '',
                  isDeparture ? 'is-departure' : '',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <button
                    type="button"
                    className={stateClass}
                    key={key}
                    disabled={isDisabled}
                    onClick={() => selectCalendarDate(date)}
                    aria-label={new Intl.DateTimeFormat(locale, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }).format(date)}
                    aria-pressed={Boolean(isArrival || isDeparture || isInRange)}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>

            <div className="test-drive-calendar-card__legend" aria-label={t('testDriveLanding_legendAria')}>
              <span>
                <i className="is-available" />
                {t('testDriveLanding_legendAvailable')}
              </span>
              <span>
                <i className="is-selected" />
                {t('testDriveLanding_legendSelected')}
              </span>
              <span>
                <i className="is-unavailable" />
                {t('testDriveLanding_legendUnavailable')}
              </span>
            </div>
          </div>

          <div className="test-drive-calendar-selection" aria-live="polite">
            <div className="test-drive-calendar-selection__dates">
              <span className="test-drive-calendar-selection__icon" aria-hidden>
                <FiCalendar size={18} />
              </span>
              <div>
                <small>
                  {departureDate
                    ? t('testDriveLanding_periodSelected')
                    : arrivalDate
                      ? t('testDriveLanding_pickCheckout')
                      : t('testDriveLanding_pickDates')}
                </small>
                <strong>
                  {arrivalDate ? formatTestDriveShortDate(arrivalDate, locale) : t('testDriveLanding_checkIn')}
                  <FiArrowRight size={14} aria-hidden />
                  {departureDate
                    ? formatTestDriveShortDate(departureDate, locale)
                    : t('testDriveLanding_checkOut')}
                </strong>
              </div>
              {selectedNights > 0 ? <em>{t('testDriveLanding_nights', { count: selectedNights })}</em> : null}
            </div>
            {calendarError ? <p className="test-drive-calendar-selection__error">{calendarError}</p> : null}
            <button
              type="button"
              className="test-drive-calendar-selection__action"
              disabled={!selectedRange}
              onClick={scrollToCatalog}
            >
              {selectedRange
                ? t('testDriveLanding_showObjects', { count: filteredListings.length })
                : t('testDriveLanding_pickDatesFirst')}
              <FiArrowRight size={19} aria-hidden />
            </button>
          </div>
        </section>

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
              <h1>{t('testDriveLanding_heroTitle')}</h1>
              <p className="test-drive-hero__subtitle">{t('testDriveLanding_heroSubtitle')}</p>
              <p className="test-drive-hero__lead">{t('testDriveLanding_heroLead')}</p>
            </div>

            <div className="test-drive-hero__copy test-drive-hero__copy--mobile">
              <h1>{t('testDriveLanding_heroMobileTitle')}</h1>
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
                <Link to="/profile/bookings" className="test-drive-hero-ticket__secondary">
                  {t('testDriveLanding_myBookings')}
                </Link>
              </div>
            </div>
          </div>
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
            <Link to="/profile/bookings" className="test-drive-story__button">
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
                    {selectedRange
                      ? t('testDriveLanding_resultsDated')
                      : t('testDriveLanding_resultsDefault')}{' '}
                    <span>{loading ? '...' : filteredListings.length}</span>
                  </h2>
                  <p>
                    {selectedRange
                      ? t('testDriveLanding_resultsDatedHint', {
                          from: formatTestDriveShortDate(arrivalDate, locale),
                          to: formatTestDriveShortDate(departureDate, locale),
                        })
                      : activeFilterCount
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
                        aria-label={t('clearSearch')}
                      >
                        ×
                      </button>
                    ) : null}
                    <button type="submit" className="debts-listing-search__go" aria-label={t('search')}>
                      <FiSearch aria-hidden />
                    </button>
                  </form>

                  <div className="filters-and-types-grid">
                    <button
                      type="button"
                      className={`filters-button${hasActiveFilters ? ' is-active' : ''}`}
                      aria-expanded={filtersDrawerOpen}
                      aria-label={t('filters')}
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
                      <span className="filters-button__label">{t('filters')}</span>
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
                title={t('filters')}
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
                            className={`test-drive-card__favorite${favoriteActive ? ' is-active' : ''}`}
                            onClick={() => toggleListingFavorite(listing)}
                            aria-label={
                              favoriteActive
                                ? t('testDriveLanding_removeFavorite')
                                : t('testDriveLanding_addFavorite')
                            }
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
    <aside className={className} aria-label={t('filters')}>
      <div className="test-drive-filter-panel__head">
        <h2>{t('filters')}</h2>
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
        moreLabel={t('testDriveLanding_showMore')}
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
          <label className="test-drive-check" key={option.id}>
            <input
              type="checkbox"
              checked={values.includes(option.id)}
              onChange={() => onToggle(option.id)}
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
