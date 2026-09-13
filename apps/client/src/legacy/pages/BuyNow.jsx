import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowDown, Filter, Search, SlidersHorizontal, Zap } from 'lucide-react'
import Header from '../components/Header'
import AuctionPropertyCard from '../components/AuctionPropertyCard'
import DebtsPropertyCard from '../components/DebtsPropertyCard'
import SharesPropertyCard from '../components/SharesPropertyCard'
import ListingPagePagination from '../components/ListingPagePagination'
import BuyerEmptyState from '../components/buyer-mobile/BuyerEmptyState'
import SectionInfoDrawer from '../components/SectionInfoDrawer'
import SharesMobileFiltersDrawer from '../components/SharesMobileFiltersDrawer'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { useIsMobile } from '../hooks/use-mobile'
import { fetchAuctionList, getCachedList, hasCachedList } from '../services/auctionListCache'
import { auctionListingDedupeKey, getPropertyDetailPath } from '../utils/propertyDetailUrl'
import {
  getAuctionContextPropertyPath,
  getCoInvestmentContextPropertyPath,
  getDebtsContextPropertyPath,
} from '../utils/listingContextUrl'
import { formatPropertyPrice } from '../utils/currency'
import { hasBuyNowOption } from '../utils/hasBuyNowOption'
import { isBuyNowPurchaseCompleted } from '../utils/auctionReminderBounds'
import { getPropertyListingKind } from '../utils/propertyListingKind'
import { isShareBuyNowEnabled, isShareListing } from '../utils/shareBuyNow'
import { publicAsset } from '../utils/publicAsset'
import '../components/ui/AuctionMobileLayout.css'
import '../styles/discoverAuctionCards.css'
import '../styles/hrShowcaseDebtsCards.css'
import './BuyNow.css'

const PAGE_SIZE = 16
const HERO_IMAGE = publicAsset('images/sellyourbrick/about/about-category-buynow.jpg')
const MOBILE_HERO_IMAGE = publicAsset(
  'images/home-sale-formats/summer-2026/sale-format-buy-now-summer.webp',
)
const EMPTY_IMAGE = publicAsset('images/auction-empty-illustration.png')

const TYPE_FILTERS = [
  { id: 'all', key: 'propertyTypeAll' },
  { id: 'apartment', key: 'propertyTypeApartment' },
  { id: 'house', key: 'propertyTypeHouse' },
  { id: 'villa', key: 'propertyTypeVilla' },
  { id: 'commercial', key: 'propertyTypeCommercial' },
]

function isConfiguredBuyNowListing(property) {
  if (isBuyNowPurchaseCompleted(property)) return false
  if (isShareListing(property)) return isShareBuyNowEnabled(property)
  return hasBuyNowOption(property)
}

export default function BuyNow() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const [properties, setProperties] = useState(() => getCachedList())
  const [loading, setLoading] = useState(() => !hasCachedList())
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState(
    () => new URLSearchParams(location.search).get('q')?.trim() || '',
  )
  const [typeFilter, setTypeFilter] = useState('all')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(!hasCachedList())
    setLoadError('')

    fetchAuctionList()
      .then((list) => {
        if (!cancelled) setProperties(Array.isArray(list) ? list : [])
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error?.message || 'LOAD_FAILED')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const buyNowListings = useMemo(
    () => properties.filter(isConfiguredBuyNowListing),
    [properties],
  )

  const filteredListings = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return buyNowListings.filter((property) => {
      const propertyType = String(property.property_type || '').toLowerCase()
      const typeMatches =
        typeFilter === 'all' ||
        propertyType === typeFilter ||
        (typeFilter === 'apartment' && propertyType === 'apartments')
      const searchMatches =
        !needle ||
        `${property.title || property.name || ''} ${property.location || ''}`
          .toLocaleLowerCase()
          .includes(needle)
      return typeMatches && searchMatches
    })
  }, [buyNowListings, query, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleListings = filteredListings.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  useEffect(() => {
    setPage(1)
  }, [query, typeFilter])

  const openListing = (property) => {
    const listingKind = getPropertyListingKind(property).key
    if (listingKind === 'shares') {
      navigate(getCoInvestmentContextPropertyPath(property), { state: { shareObject: property } })
      return
    }
    if (listingKind === 'debt') {
      navigate(getDebtsContextPropertyPath(property), { state: { property } })
      return
    }
    const pathname =
      property.is_auction === 1 || property.is_auction === true || property.isAuction === true
        ? getAuctionContextPropertyPath(property)
        : getPropertyDetailPath(property)
    navigate(pathname, { state: { property } })
  }

  const formatPrice = (amount, currency) =>
    formatPropertyPrice(amount, currency || 'EUR', { compact: true })

  const handleFavoriteToggle = (property, event) => {
    event?.preventDefault()
    event?.stopPropagation()
    return toggleFavorite(property)
  }

  const scrollToCatalog = () => {
    document.getElementById('buy-now-catalog')?.scrollIntoView({ behavior: 'smooth' })
  }

  const resetFilters = () => {
    setQuery('')
    setTypeFilter('all')
  }

  return (
    <div className="buy-now-page">
      <Header />

      <section className="buy-now-hero" aria-labelledby="buy-now-title">
        <picture>
          <source media="(max-width: 768px)" srcSet={MOBILE_HERO_IMAGE} />
          <img className="buy-now-hero__image" src={HERO_IMAGE} alt="" aria-hidden />
        </picture>
        <div className="buy-now-hero__overlay" aria-hidden />
        <div className="buy-now-hero__brand" aria-label="SellYourBrick">
          <span className="buy-now-hero__brand-text">
            <span>Sell</span>
            <span className="buy-now-hero__brand-accent">Your</span>
            <span>Brick</span>
          </span>
        </div>
        <div className="buy-now-hero__content">
          <span className="buy-now-hero__eyebrow">
            <Zap size={14} fill="currentColor" aria-hidden />
            {t('buyNowPageEyebrow')}
          </span>
          <div className="section-info-heading-row">
            <h1 id="buy-now-title">{t('buyNowPageTitle')}</h1>
            <SectionInfoDrawer section="buyNow" placement="heading" />
          </div>
          <p>{t('buyNowPageSubtitle')}</p>
          <button type="button" className="buy-now-hero__cta" onClick={scrollToCatalog}>
            <span>{t('buyNowPageCta')}</span>
            <span className="buy-now-hero__cta-icon" aria-hidden>
              <ArrowDown size={18} strokeWidth={2.4} />
            </span>
          </button>
        </div>

        <button
          type="button"
          className="buy-now-hero__scroll"
          onClick={scrollToCatalog}
          aria-label={t('buyNowPageCta')}
        >
          <span aria-hidden />
        </button>
      </section>

      <main id="buy-now-catalog" className="buy-now-catalog">
        <header className="buy-now-catalog__head">
          <div className="buy-now-catalog__heading">
            <span>{t('buyNowPageCatalogEyebrow')}</span>
            <h2 id="buy-now-catalog-title">{t('buyNowPageCatalogTitle')}</h2>
            <p>{t('buyNowPageCount', { count: filteredListings.length })}</p>
          </div>
          <div className="buy-now-catalog__tools">
              <label className="buy-now-catalog__search">
                <Search size={18} aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('buyNowPageSearchPlaceholder')}
                  aria-label={t('buyNowPageSearchPlaceholder')}
                />
              </label>
            <button
              type="button"
              className={`buy-now-catalog__mobile-filter${typeFilter !== 'all' ? ' is-active' : ''}`}
              onClick={() => setMobileFiltersOpen(true)}
              aria-label={t('buyNowPageFiltersAria')}
              aria-expanded={mobileFiltersOpen}
            >
              <Filter size={21} aria-hidden />
              {typeFilter !== 'all' ? <span className="buy-now-catalog__filter-badge">1</span> : null}
            </button>
          </div>
        </header>

        <div
          id="buy-now-type-filters"
          className="buy-now-catalog__filters"
        >
          <SlidersHorizontal size={18} aria-hidden />
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={typeFilter === filter.id ? 'is-active' : ''}
              onClick={() => {
                setTypeFilter(filter.id)
                setMobileFiltersOpen(false)
              }}
              aria-pressed={typeFilter === filter.id}
            >
              {t(filter.key)}
            </button>
          ))}
        </div>

            {loading ? (
              <div className="buy-now-catalog__loading" role="status" aria-live="polite">
                <span />
                {t('buyNowPageLoading')}
              </div>
            ) : loadError ? (
              <BuyerEmptyState
                image={EMPTY_IMAGE}
                imageAlt=""
                title={t('buyNowPageErrorTitle')}
                description={t('buyNowPageErrorDescription')}
                primaryLabel={t('buyNowPageRetry')}
                onPrimary={() => setReloadKey((value) => value + 1)}
              />
            ) : visibleListings.length === 0 ? (
              <BuyerEmptyState
                image={EMPTY_IMAGE}
                imageAlt=""
                title={t('buyNowPageEmptyTitle')}
                description={t('buyNowPageEmptyDescription')}
                primaryLabel={t('buyNowPageReset')}
                onPrimary={resetFilters}
              />
            ) : (
              <>
                <div
                  className={
                    isMobile
                      ? 'buy-now-catalog__grid properties-grid properties-grid--auction-cards auction-mobile-stack--desktop-cards discover-auction-cards discover-auction-cards--buy-now hr-showcases hr-showcases--debts-listing'
                      : 'buy-now-catalog__grid'
                  }
                >
                  {visibleListings.map((property) => {
                    const listingKind = getPropertyListingKind(property).key

                    if (listingKind === 'shares') {
                      return (
                        <SharesPropertyCard
                          key={auctionListingDedupeKey(property)}
                          share={property}
                          isFavorite={isFavorite(property)}
                          onFavoriteToggle={handleFavoriteToggle}
                          onInvest={openListing}
                          href={getCoInvestmentContextPropertyPath(property)}
                        />
                      )
                    }

                    if (listingKind === 'debt') {
                      return (
                        <DebtsPropertyCard
                          key={auctionListingDedupeKey(property)}
                          property={property}
                          isFavorite={isFavorite(property)}
                          onFavoriteToggle={handleFavoriteToggle}
                          onOpen={openListing}
                          href={getDebtsContextPropertyPath(property)}
                        />
                      )
                    }

                    return (
                      <AuctionPropertyCard
                        key={auctionListingDedupeKey(property)}
                        property={property}
                        isFavorite={isFavorite(property)}
                        onFavoriteToggle={handleFavoriteToggle}
                        onOpen={openListing}
                        onTooltip={() => {}}
                        viewerHasVip={false}
                        formatPrice={formatPrice}
                      />
                    )
                  })}
                </div>
                <ListingPagePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(nextPage) => {
                    setPage(nextPage)
                    document
                      .getElementById('buy-now-catalog-title')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }}
                />
              </>
            )}
      </main>

      {isMobile ? (
        <SharesMobileFiltersDrawer
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          title={t('filters')}
          applyLabel={t('auctionApplyFilters')}
          onApply={() => setMobileFiltersOpen(false)}
          resetLabel={t('catalogResetFilters')}
          onReset={resetFilters}
        >
          <fieldset className="buy-now-mobile-filters">
            <legend>{t('auctionFilterPropertyType')}</legend>
            <div className="buy-now-mobile-filters__options">
              {TYPE_FILTERS.map((filter) => (
                <label
                  key={filter.id}
                  className={typeFilter === filter.id ? 'is-active' : ''}
                >
                  <input
                    type="radio"
                    name="buy-now-property-type"
                    value={filter.id}
                    checked={typeFilter === filter.id}
                    onChange={() => setTypeFilter(filter.id)}
                  />
                  <span>{t(filter.key)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </SharesMobileFiltersDrawer>
      ) : null}
    </div>
  )
}
