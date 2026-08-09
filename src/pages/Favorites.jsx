import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from '../components/Header'
import FavoritePropertyCard from '../components/FavoritePropertyCard'
import {
  PiArrowRight,
  PiHeartStraight,
  PiQuestion,
  PiX,
} from 'react-icons/pi'
import './Favorites.css'
import '../components/PropertyList.css'
import '../components/AuctionPropertyCard.css'
import '../components/DebtsPropertyCard.css'
import '../components/SharesPropertyCard.css'
import '../styles/hrShowcaseAuctionCards.css'
import '../styles/hrShowcaseDebtsCards.css'
import '../components/ui/AuctionMobileLayout.css'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { useFavoriteAuctionItems } from '../hooks/useFavoriteAuctionItems'
import { auctionListingDedupeKey, buildPropertyDetailNavigation } from '../utils/propertyDetailUrl'
import { hasPropertyListingTimer } from '../utils/auctionReminderBounds'
import { formatPropertyPrice } from '../utils/currency'
import { getCoInvestmentDetailPath } from '../utils/sectionRoutes'
import ListingPagePagination from '../components/ListingPagePagination'
import BuyerSheetShell from '../components/buyer-mobile/BuyerSheetShell'
import { paginateBuyerCatalogue } from '../utils/buyerCataloguePagination'

const FAVORITES_CARD_SKELETON_COUNT = 4
const EMPTY_ILLUSTRATION = '/images/favorites-empty-reference-style.png'

const RECOMMENDED_PROPERTY_KEYS = [
  {
    titleKey: 'favoritesPage_rec1Title',
    locationKey: 'favoritesPage_rec1Location',
    image: '/images/external/photo-1600607687939-ce8a6c25118c-3f6b6fdeda.jpg',
  },
  {
    titleKey: 'favoritesPage_rec2Title',
    locationKey: 'favoritesPage_rec2Location',
    image: '/images/external/photo-1486406146926-c627a92ad1ab-f0c377ec01.jpg',
  },
  {
    titleKey: 'favoritesPage_rec3Title',
    locationKey: 'favoritesPage_rec3Location',
    image: '/images/external/photo-1600566753190-17f0baa2a6c3-1953ced3f5.jpg',
  },
  {
    titleKey: 'favoritesPage_rec4Title',
    locationKey: 'favoritesPage_rec4Location',
    image: '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg',
  },
]

function FavoritesCardSkeleton() {
  return (
    <div className="auction-card auction-card--skeleton" aria-hidden>
      <div className="auction-card__media auction-card-skeleton__media" />
      <div className="auction-card__body auction-card-skeleton__body">
        <div className="auction-card-skeleton__line auction-card-skeleton__line--short" />
        <div className="auction-card-skeleton__line auction-card-skeleton__line--title" />
        <div className="auction-card-skeleton__line auction-card-skeleton__line--specs" />
        <div className="auction-card-skeleton__price-panel" />
        <div className="auction-card-skeleton__btn" />
      </div>
    </div>
  )
}

function FavoritesGrid({
  items,
  onOpen,
  onOpenShare,
  isFavorite,
  onToggleFavorite,
  formatPrice,
}) {
  return (
    <div className="hr-showcases hr-showcases--auction-listing">
      <div className="properties-grid favorites-page__grid properties-grid--auction-cards auction-mobile-stack--desktop-cards">
        {items.map((item) => (
          <FavoritePropertyCard
            key={item.key || auctionListingDedupeKey(item.property)}
            item={item}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            onOpen={onOpen}
            onOpenShare={onOpenShare}
            formatPrice={formatPrice}
          />
        ))}
      </div>
    </div>
  )
}

const Favorites = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [guideOpen, setGuideOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768,
  )
  const { favoritesLoading, isFavorite, toggleFavorite } = usePropertyFavorites()
  const { favoriteAuctions, catalogLoading } = useFavoriteAuctionItems()

  const listLoading = catalogLoading || favoritesLoading
  const formatPrice = useMemo(
    () => (price, currency = 'USD') =>
      formatPropertyPrice(price ?? 0, currency, { compact: true }),
    [],
  )

  const recommendedProperties = useMemo(
    () =>
      RECOMMENDED_PROPERTY_KEYS.map((property) => ({
        title: t(property.titleKey),
        location: t(property.locationKey),
        image: property.image,
      })),
    [t],
  )

  useEffect(() => {
    const syncViewport = () => setIsMobile(window.innerWidth <= 768)
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  const mobilePagination = paginateBuyerCatalogue(favoriteAuctions, currentPage)
  const visibleFavorites = isMobile ? mobilePagination.items : favoriteAuctions

  useEffect(() => {
    if (currentPage !== mobilePagination.currentPage) {
      setCurrentPage(mobilePagination.currentPage)
    }
  }, [currentPage, mobilePagination.currentPage])

  const { withTimer, withoutTimer, splitByTimer } = useMemo(() => {
    const timerList = []
    const noTimerList = []
    for (const item of visibleFavorites) {
      if (hasPropertyListingTimer(item.property)) {
        timerList.push(item)
      } else {
        noTimerList.push(item)
      }
    }
    return {
      withTimer: timerList,
      withoutTimer: noTimerList,
      splitByTimer: timerList.length > 0 && noTimerList.length > 0,
    }
  }, [visibleFavorites])

  const openProperty = (property, { auctionTab, auctionSoldOutNotice } = {}) => {
    if (!ensureCanOpenProperty()) return
    const { pathname, state } = buildPropertyDetailNavigation(property, {
      auctionTab: auctionTab || undefined,
      auctionSoldOutNotice: auctionSoldOutNotice || undefined,
    })
    navigate(pathname, { state })
  }

  const openShare = (share) => {
    if (!ensureCanOpenProperty()) return
    navigate(getCoInvestmentDetailPath(share), { state: { shareObject: share } })
  }

  const handleToggleFavorite = (property, mockCategory) => {
    const category = hasDbBackedProperty(property) ? undefined : (mockCategory || 'property')
    return toggleFavorite(property, category)
  }

  return (
    <div className="favorites-page">
      <Header />
      <div className="favorites-container">
        <div className="favorites-header">
          <h1 className="favorites-title">
            <PiHeartStraight className="favorites-title-icon" aria-hidden />
            {t('footerLiked')}
          </h1>
          <nav className="favorites-breadcrumbs" aria-label={t('favoritesPage_breadcrumbsAria')}>
            <Link to="/auction">{t('home')}</Link>
            <span aria-hidden>•</span>
            <span>{t('footerLiked')}</span>
          </nav>
          {!listLoading ? (
            <p className="favorites-summary">
              {favoriteAuctions.length > 0
                ? t('favoritesPage_summaryCount', { count: favoriteAuctions.length })
                : t('favoritesPage_summaryEmpty')}
            </p>
          ) : null}
        </div>

        {listLoading ? (
          <div className="hr-showcases hr-showcases--auction-listing">
            <div
              className="properties-grid favorites-page__grid favorites-page__grid--skeleton properties-grid--auction-cards auction-mobile-stack--desktop-cards"
              aria-busy="true"
            >
              {Array.from({ length: FAVORITES_CARD_SKELETON_COUNT }, (_, index) => (
                <FavoritesCardSkeleton key={`favorites-skeleton-${index}`} />
              ))}
            </div>
          </div>
        ) : favoriteAuctions.length > 0 ? (
          splitByTimer ? (
            <div className="favorites-page__sections">
              <FavoritesGrid
                items={withTimer}
                onOpen={openProperty}
                onOpenShare={openShare}
                isFavorite={isFavorite}
                onToggleFavorite={handleToggleFavorite}
                formatPrice={formatPrice}
              />
              <div className="favorites-page__divider" role="separator" aria-hidden="true" />
              <FavoritesGrid
                items={withoutTimer}
                onOpen={openProperty}
                onOpenShare={openShare}
                isFavorite={isFavorite}
                onToggleFavorite={handleToggleFavorite}
                formatPrice={formatPrice}
              />
            </div>
          ) : (
            <FavoritesGrid
              items={visibleFavorites}
              onOpen={openProperty}
              onOpenShare={openShare}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              formatPrice={formatPrice}
            />
          )
        ) : (
          <section className="favorites-empty" aria-labelledby="favorites-empty-title">
            <img
              src={EMPTY_ILLUSTRATION}
              alt=""
              className="favorites-empty__image"
              loading="eager"
            />
            <h2 id="favorites-empty-title" className="favorites-empty-title">
              {t('favoritesPage_emptyTitle')}
            </h2>
            <p className="favorites-empty-text">
              {t('favoritesPage_emptyText')}
            </p>
            <button className="favorites-empty-button" onClick={() => navigate('/auction')}>
              {t('favoritesPage_goToCatalog')}
              <PiArrowRight size={18} aria-hidden />
            </button>
            <button
              className="favorites-empty-help"
              type="button"
              onClick={() => setGuideOpen(true)}
            >
              {t('favoritesPage_howItWorks')}
              <PiQuestion size={16} aria-hidden />
            </button>
          </section>
        )}

        {isMobile && favoriteAuctions.length > 0 ? (
          <ListingPagePagination
            currentPage={mobilePagination.currentPage}
            totalPages={mobilePagination.totalPages}
            onPageChange={(nextPage) => {
              setCurrentPage(nextPage)
              requestAnimationFrame(() => {
                document.querySelector('.favorites-page__sections, .favorites-page__grid')?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                })
              })
            }}
          />
        ) : null}

        <section className="favorites-compare" aria-labelledby="favorites-compare-title">
          <div className="favorites-compare__copy">
            <h2 id="favorites-compare-title">{t('favoritesPage_compareTitle')}</h2>
            <p>
              {t('favoritesPage_compareText')}
            </p>
          </div>
          <Link to="/compare" className="favorites-compare__button">
            {t('favoritesPage_goToCompare')}
            <PiArrowRight size={17} aria-hidden />
          </Link>
        </section>

        <section className="favorites-recommendations" aria-labelledby="favorites-recommendations-title">
          <div className="favorites-recommendations__header">
            <h2 id="favorites-recommendations-title">{t('favoritesPage_recommendationsTitle')}</h2>
            <Link to="/auction" className="favorites-recommendations__all">
              {t('favoritesPage_seeAll')}
              <PiArrowRight size={22} aria-hidden />
            </Link>
          </div>
          <div className="favorites-recommendations__grid">
            {recommendedProperties.map((property) => (
              <Link
                key={property.title}
                to="/auction"
                className="favorites-recommendation-card"
                aria-label={`${property.title}, ${property.location}`}
              >
                <img src={property.image} alt="" loading="lazy" />
                <span className="favorites-recommendation-card__shade" aria-hidden />
                <span className="favorites-recommendation-card__content">
                  <strong>{property.title}</strong>
                  <span>{property.location}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

      </div>

      {isMobile ? <BuyerSheetShell
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        titleId="favorites-guide-title"
        describedBy="favorites-guide-description"
        tone="choice"
        className="favorites-guide-sheet"
        footer={(
          <button
            className="favorites-guide__action"
            type="button"
            onClick={() => {
              setGuideOpen(false)
              navigate('/auction')
            }}
          >
            {t('favoritesPage_goToCatalog')}
            <PiArrowRight size={16} aria-hidden />
          </button>
        )}
      >
        <div className="favorites-guide__content">
          <span className="favorites-guide__illustration" aria-hidden><PiHeartStraight /></span>
          <p className="favorites-eyebrow">{t('favoritesPage_guideEyebrow')}</p>
          <h2 id="favorites-guide-title">{t('favoritesPage_guideTitle')}</h2>
          <p id="favorites-guide-description">
            {t('favoritesPage_guideTextMobile')}
          </p>
        </div>
      </BuyerSheetShell> : guideOpen ? (
        <div
          className="favorites-guide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="favorites-guide-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setGuideOpen(false)
          }}
        >
          <div className="favorites-guide__panel">
            <button
              className="favorites-guide__close"
              type="button"
              onClick={() => setGuideOpen(false)}
              aria-label={t('close')}
            >
              <PiX size={20} aria-hidden />
            </button>
            <h2 id="favorites-guide-title">{t('favoritesPage_guideTitle')}</h2>
            <p>
              {t('favoritesPage_guideTextDesktop')}
            </p>
            <button
              className="favorites-guide__action"
              type="button"
              onClick={() => {
                setGuideOpen(false)
                navigate('/auction')
              }}
            >
              {t('favoritesPage_goToCatalog')}
              <PiArrowRight size={20} aria-hidden />
            </button>
          </div>
        </div>
      ) : null}

      {isMobile && favoriteAuctions.length >= 2 ? (
        <aside className="favorites-compare-tray" aria-label={t('favoritesPage_compareTrayAria')}>
          <div>
            <strong>{t('favoritesPage_compareTrayTitle')}</strong>
            <span>{t('favoritesPage_compareTrayCount', { count: favoriteAuctions.length })}</span>
          </div>
          <Link to="/compare">{t('favoritesPage_compareAction')}</Link>
        </aside>
      ) : null}
    </div>
  )
}

export default Favorites
