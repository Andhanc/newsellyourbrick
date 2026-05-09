import { Link } from 'react-router-dom'
import {
  FiArrowRight,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi'
import { MdBed, MdOutlineBathtub } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import PropertyTimer from '../components/PropertyTimer'
import { AuctionShowcaseSkeletonCards } from '../components/AuctionShowcaseSkeletonStrip'
import { PropertyListingSkeletonGrid } from '../components/PropertyListingSkeletonGrid'
import LandingFaqAccordion from '../components/LandingFaqAccordion'
import '../components/PropertyList.css'
/* После PropertyList: стили витрины из MainPage (лента карточек) гарантированно в каскаде */
import './MainPage.css'
import LeadGenCta from '../components/LeadGenCta'
import { useMainPageDeferred } from './mainPageDeferredContext'

export default function MainPageBelowFold() {
  const {
    t,
    i18n,
    navigate,
    auctionSection,
    buyNowSection,
    debtsSection,
    sharesSection,
    auctionShowcaseScrollerRef,
    buyNowShowcaseScrollerRef,
    debtsShowcaseScrollerRef,
    sharesShowcaseScrollerRef,
    scrollAuctionShowcase,
    scrollBuyNowShowcase,
    scrollDebtsShowcase,
    scrollSharesShowcase,
    isAuctionListingEnded,
    handlePropertyClick,
    isFavorite,
    toggleFavorite,
    ensureCanOpenProperty,
    showPropertyAuthRequiredToast,
    landingStatsRef,
    statsScrollProgress,
    getPropertyTypes,
    activeCategory,
    handleCategoryClick,
    isLoading,
    homePropertiesLoading,
    filteredProperties,
    filteredRecommended,
    filteredNearby,
    propertyMode,
  } = useMainPageDeferred()

  return (
    <>
      {/* Блок "Аукцион" — только идущие лоты (завершённые не показываем) */}
      {(auctionSection.length > 0 || homePropertiesLoading) ? (
      <section
        className="apartments-section apartments-section--auction apartments-section--auction-showcase"
      >
        <div className="apartments-section__container">
          <header className="auction-showcase__header">
            <div className="auction-showcase__intro">
              <div className="auction-showcase__title-row">
                <h2 className="auction-showcase__title">{t('auctionSectionTitle')}</h2>
                <button
                  type="button"
                  className="auction-showcase__cta"
                  onClick={() => navigate('/auction?filter=auction')}
                >
                  <span className="auction-showcase__cta-text">{t('auctionSectionCta')}</span>
                  <span className="auction-showcase__cta-icon" aria-hidden>
                    <FiArrowRight size={18} strokeWidth={2.25} />
                  </span>
                </button>
              </div>
              <p className="auction-showcase__subtitle">{t('auctionSectionSubtitle')}</p>
            </div>
          </header>

          <div className="auction-showcase__carousel">
            <div
              ref={auctionShowcaseScrollerRef}
              className={`auction-showcase__scroller${homePropertiesLoading ? ' auction-showcase-skeleton-root' : ''}`}
              aria-busy={homePropertiesLoading}
            >
            {homePropertiesLoading ? (
              <AuctionShowcaseSkeletonCards />
            ) : (
            auctionSection.map((apartment) => {
              const formatPrice = (price) => {
                if (!price) return '$0'
                if (price >= 1000000) {
                  return `$${(price / 1000000).toFixed(1)}M`
                }
                return `$${price.toLocaleString('en-US')}`
              }

              const hasTimer =
                apartment.isAuction === true &&
                apartment.endTime != null &&
                apartment.endTime !== ''
              const isAuctionEndedCard = isAuctionListingEnded(apartment)

              const currentBidValue =
                apartment.currentBid != null
                  ? apartment.currentBid
                  : (apartment.auction_starting_price || apartment.price || 0)

              return (
                <div
                  key={apartment.id}
                  className={`auction-showcase-card${
                    isAuctionEndedCard ? ' auction-showcase-card--ended' : ''
                  }`}
                >
                  {isAuctionEndedCard ? (
                    <div className="property-auction-ended-overlay property-auction-ended-overlay--full-card">
                      <span className="property-auction-ended-overlay__title">
                        {t('auctionSoldOutLabel')}
                      </span>
                      <button
                        type="button"
                        className="property-auction-ended-overlay__result-link"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handlePropertyClick('apartment', apartment.id, false, hasTimer, apartment)
                        }}
                      >
                        <span>{t('auctionResultSummary')}</span>
                        <span aria-hidden>→</span>
                      </button>
                    </div>
                  ) : null}
                  <div
                    className="auction-showcase-card__link"
                    onClick={() => {
                      handlePropertyClick('apartment', apartment.id, false, hasTimer, apartment)
                    }}
                  >
                    <div className="auction-showcase-card__surface">
                      <div className="auction-showcase-card__media">
                        <img
                          loading="lazy"
                          src={apartment.image}
                          alt={apartment.name}
                          className="auction-showcase-card__image"
                        />
                        <button
                          type="button"
                          className={`property-favorite ${
                            isFavorite(apartment, 'apartment') ? 'active' : ''
                          }`}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleFavorite(apartment, 'apartment')
                          }}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill={isFavorite(apartment, 'apartment') ? 'currentColor' : 'none'}
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="auction-showcase-card__caption">
                        {hasTimer ? (
                          <PropertyTimer endTime={apartment.endTime} compact={true} />
                        ) : null}
                        <h3 className="auction-showcase-card__name">{apartment.name}</h3>
                        <p className="auction-showcase-card__bid">
                          <span className="auction-showcase-card__bid-label">{t('currentBid')}</span>
                          <span className="auction-showcase-card__bid-value">
                            {formatPrice(currentBidValue)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
            )}
            </div>
            <div className="auction-showcase__nav" role="group" aria-label={t('showcaseCarouselNav')}>
              <button
                type="button"
                className="auction-showcase__nav-btn auction-showcase__nav-btn--prev"
                aria-label={t('showcaseCarouselPrev')}
                onClick={() => scrollAuctionShowcase(-1)}
                disabled={homePropertiesLoading}
              >
                <FiChevronLeft size={22} strokeWidth={2.25} />
              </button>
              <button
                type="button"
                className="auction-showcase__nav-btn auction-showcase__nav-btn--next"
                aria-label={t('showcaseCarouselNext')}
                onClick={() => scrollAuctionShowcase(1)}
                disabled={homePropertiesLoading}
              >
                <FiChevronRight size={22} strokeWidth={2.25} />
              </button>
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {/* Блок «Купить сейчас» — та же витрина-лента, фон Tiffany; только активные лоты */}
      {(buyNowSection.length > 0 || homePropertiesLoading) ? (
      <section className="apartments-section apartments-section--buy-now-showcase">
        <div className="apartments-section__container">
          <header className="auction-showcase__header">
            <div className="auction-showcase__intro">
              <div className="auction-showcase__title-row">
                <h2 className="auction-showcase__title">{t('buyNowSectionTitle')}</h2>
                <button
                  type="button"
                  className="auction-showcase__cta"
                  onClick={() => navigate('/auction?filter=buy_now')}
                >
                  <span className="auction-showcase__cta-text">{t('buyNowSectionCta')}</span>
                  <span className="auction-showcase__cta-icon" aria-hidden>
                    <FiArrowRight size={18} strokeWidth={2.25} />
                  </span>
                </button>
              </div>
              <p className="auction-showcase__subtitle">{t('buyNowSectionSubtitle')}</p>
            </div>
          </header>

          <div className="auction-showcase__carousel">
            <div
              ref={buyNowShowcaseScrollerRef}
              className={`auction-showcase__scroller${homePropertiesLoading ? ' auction-showcase-skeleton-root' : ''}`}
              aria-busy={homePropertiesLoading}
            >
            {homePropertiesLoading ? (
              <AuctionShowcaseSkeletonCards />
            ) : (
            buyNowSection.map((villa) => {
              const formatPrice = (price) => {
                if (!price) return '$0'
                if (price >= 1000000) {
                  return `$${(price / 1000000).toFixed(1)}M`
                }
                return `$${price.toLocaleString('en-US')}`
              }

              const isAuctionEndedCard = isAuctionListingEnded(villa)

              return (
                <div
                  key={villa.id}
                  className={`auction-showcase-card${
                    isAuctionEndedCard ? ' auction-showcase-card--ended' : ''
                  }`}
                >
                  {isAuctionEndedCard ? (
                    <div className="property-auction-ended-overlay property-auction-ended-overlay--full-card">
                      <span className="property-auction-ended-overlay__title">
                        {t('auctionSoldOutLabel')}
                      </span>
                      <button
                        type="button"
                        className="property-auction-ended-overlay__result-link"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handlePropertyClick('villa', villa.id, false, false, villa)
                        }}
                      >
                        <span>{t('auctionResultSummary')}</span>
                        <span aria-hidden>→</span>
                      </button>
                    </div>
                  ) : null}
                  <div
                    className="auction-showcase-card__link"
                    onClick={() => {
                      handlePropertyClick('villa', villa.id, false, false, villa)
                    }}
                  >
                    <div className="auction-showcase-card__surface">
                      <div className="auction-showcase-card__media">
                        <img
                          loading="lazy"
                          src={villa.image}
                          alt={villa.name}
                          className="auction-showcase-card__image"
                        />
                        <button
                          type="button"
                          className={`property-favorite ${
                            isFavorite(villa, 'villa') ? 'active' : ''
                          }`}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleFavorite(villa, 'villa')
                          }}
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill={isFavorite(villa, 'villa') ? 'currentColor' : 'none'}
                            />
                          </svg>
                        </button>
                      </div>
                      <div className="auction-showcase-card__caption">
                        <h3 className="auction-showcase-card__name">{villa.name}</h3>
                        <p className="auction-showcase-card__bid">
                          <span className="auction-showcase-card__bid-label">
                            {t('buyNowShowcasePriceLabel')}
                          </span>
                          <span className="auction-showcase-card__bid-value">
                            {formatPrice(villa.price)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
            )}
            </div>
            <div className="auction-showcase__nav" role="group" aria-label={t('showcaseCarouselNav')}>
              <button
                type="button"
                className="auction-showcase__nav-btn auction-showcase__nav-btn--prev"
                aria-label={t('showcaseCarouselPrev')}
                onClick={() => scrollBuyNowShowcase(-1)}
                disabled={homePropertiesLoading}
              >
                <FiChevronLeft size={22} strokeWidth={2.25} />
              </button>
              <button
                type="button"
                className="auction-showcase__nav-btn auction-showcase__nav-btn--next"
                aria-label={t('showcaseCarouselNext')}
                onClick={() => scrollBuyNowShowcase(1)}
                disabled={homePropertiesLoading}
              >
                <FiChevronRight size={22} strokeWidth={2.25} />
              </button>
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {/* Блок «Долги» — витрина как у аукциона, серый фон */}
      <section className="apartments-section apartments-section--debts-showcase">
        <div className="apartments-section__container">
          <header className="auction-showcase__header">
            <div className="auction-showcase__intro">
              <div className="auction-showcase__title-row">
                <h2 className="auction-showcase__title">{t('debtsTitle')}</h2>
                <button
                  type="button"
                  className="auction-showcase__cta"
                  onClick={() => navigate('/debts')}
                >
                  <span className="auction-showcase__cta-text">{t('debtsSectionCta')}</span>
                  <span className="auction-showcase__cta-icon" aria-hidden>
                    <FiArrowRight size={18} strokeWidth={2.25} />
                  </span>
                </button>
              </div>
              <p className="auction-showcase__subtitle">{t('debtsSectionSubtitle')}</p>
            </div>
          </header>

          <div className="auction-showcase__carousel">
            <div
              ref={debtsShowcaseScrollerRef}
              className={`auction-showcase__scroller${homePropertiesLoading ? ' auction-showcase-skeleton-root' : ''}`}
              aria-busy={homePropertiesLoading}
            >
              {homePropertiesLoading ? (
                <AuctionShowcaseSkeletonCards />
              ) : (
              debtsSection.map((flat) => {
                const formatPrice = (price) => {
                  if (price >= 1000000) {
                    return `$${(price / 1000000).toFixed(1)}M`
                  }
                  return `$${price.toLocaleString('en-US')}`
                }
                const hasTimer =
                  flat.isAuction === true && flat.endTime != null && flat.endTime !== ''
                const bidVal = flat.currentBid != null
                  ? Number(flat.currentBid)
                  : Number(flat.auction_starting_price || flat.price || 0)
                const debtVal =
                  flat.debt_amount != null &&
                  flat.debt_amount !== '' &&
                  !Number.isNaN(Number(flat.debt_amount))
                    ? Number(flat.debt_amount)
                    : null

                return (
                  <div key={flat.id} className="auction-showcase-card">
                    <div
                      className="auction-showcase-card__link"
                      onClick={() => {
                        handlePropertyClick('debt', flat.id, false, hasTimer, flat)
                      }}
                    >
                      <div className="auction-showcase-card__surface">
                        <div className="auction-showcase-card__media">
                          <img
                            loading="lazy"
                            src={
                              flat.image ||
                              'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
                            }
                            alt={flat.name}
                            className="auction-showcase-card__image"
                          />
                          <button
                            type="button"
                            className={`property-favorite ${
                              isFavorite(flat, 'flat') ? 'active' : ''
                            }`}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              toggleFavorite(flat, 'flat')
                            }}
                          >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <path
                                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill={isFavorite(flat, 'flat') ? 'currentColor' : 'none'}
                              />
                            </svg>
                          </button>
                        </div>
                        <div className="auction-showcase-card__caption">
                          {hasTimer ? (
                            <PropertyTimer endTime={flat.endTime} compact={true} />
                          ) : null}
                          <h3 className="auction-showcase-card__name">{flat.name}</h3>
                          {debtVal != null ? (
                            <p className="auction-showcase-card__bid">
                              <span className="auction-showcase-card__bid-label">
                                {t('debtsDebtAmount')}
                              </span>
                              <span className="auction-showcase-card__bid-value">
                                {formatPrice(debtVal)}
                              </span>
                            </p>
                          ) : null}
                          <p className="auction-showcase-card__bid">
                            <span className="auction-showcase-card__bid-label">
                              {t('currentBid')}
                            </span>
                            <span className="auction-showcase-card__bid-value">
                              {formatPrice(bidVal)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
              )}
            </div>
            <div className="auction-showcase__nav" role="group" aria-label={t('showcaseCarouselNav')}>
              <button
                type="button"
                className="auction-showcase__nav-btn auction-showcase__nav-btn--prev"
                aria-label={t('showcaseCarouselPrev')}
                onClick={() => scrollDebtsShowcase(-1)}
                disabled={homePropertiesLoading}
              >
                <FiChevronLeft size={22} strokeWidth={2.25} />
              </button>
              <button
                type="button"
                className="auction-showcase__nav-btn auction-showcase__nav-btn--next"
                aria-label={t('showcaseCarouselNext')}
                onClick={() => scrollDebtsShowcase(1)}
                disabled={homePropertiesLoading}
              >
                <FiChevronRight size={22} strokeWidth={2.25} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Блок «Долевая продажа» — витрина, Tiffany → градиент как у блока «Цифры» */}
      <section className="apartments-section apartments-section--shares-showcase">
        <div className="apartments-section__container">
          <header className="auction-showcase__header">
            <div className="auction-showcase__intro">
              <div className="auction-showcase__title-row">
                <h2 className="auction-showcase__title">{t('fractionalSaleTitle')}</h2>
                <button
                  type="button"
                  className="auction-showcase__cta"
                  onClick={() => {
                    if (!ensureCanOpenProperty()) {
                      showPropertyAuthRequiredToast()
                      return
                    }
                    navigate('/shares')
                  }}
                >
                  <span className="auction-showcase__cta-text">{t('fractionalSectionCta')}</span>
                  <span className="auction-showcase__cta-icon" aria-hidden>
                    <FiArrowRight size={18} strokeWidth={2.25} />
                  </span>
                </button>
              </div>
              <p className="auction-showcase__subtitle">{t('fractionalSectionSubtitle')}</p>
            </div>
          </header>

          <div className="auction-showcase__carousel">
            <div
              ref={sharesShowcaseScrollerRef}
              className={`auction-showcase__scroller${homePropertiesLoading ? ' auction-showcase-skeleton-root' : ''}`}
              aria-busy={homePropertiesLoading}
            >
              {homePropertiesLoading ? (
                <AuctionShowcaseSkeletonCards />
              ) : (
              sharesSection.map((townhouse) => {
                const formatPrice = (price) => {
                  if (price >= 1000000) {
                    return `$${(price / 1000000).toFixed(1)}M`
                  }
                  return `$${price.toLocaleString('en-US')}`
                }
                const totalShares = Math.max(
                  1,
                  Number(
                    townhouse.totalShares ??
                      townhouse.total_shares ??
                      townhouse.shares_total ??
                      20
                  ) || 1
                )
                const soldShares = Math.min(
                  Number(
                    townhouse.sharesSold ??
                      townhouse.shares_sold ??
                      townhouse.sold_shares ??
                      townhouse.purchased_shares ??
                      0
                  ) || 0,
                  totalShares
                )
                const soldPercent = Math.max(
                  0,
                  Math.min(Math.round((soldShares / totalShares) * 100), 100)
                )
                const isSoldOut = soldShares >= totalShares
                const totalPrice = Number(
                  townhouse.totalPrice ?? townhouse.total_price ?? townhouse.price ?? 0
                )
                const pricePerShare = Number(
                  townhouse.pricePerShare ??
                    townhouse.price_per_share ??
                    (totalShares > 0 ? totalPrice / totalShares : 0)
                )

                return (
                  <div
                    key={townhouse.id}
                    className={`auction-showcase-card${isSoldOut ? ' auction-showcase-card--share-sold-out' : ''}`}
                  >
                    <div
                      className="auction-showcase-card__link"
                      onClick={() => {
                        if (!ensureCanOpenProperty()) {
                          showPropertyAuthRequiredToast()
                          return
                        }
                        const propertyType =
                          townhouse.property_type || townhouse.propertyType || 'apartment'
                        const shareId = `${propertyType}-${townhouse.id}`
                        navigate(`/shares/${shareId}`)
                      }}
                    >
                      <div className="auction-showcase-card__surface">
                        <div className="auction-showcase-card__media">
                          <img
                            loading="lazy"
                            src={townhouse.image}
                            alt={townhouse.name}
                            className="auction-showcase-card__image"
                          />
                          <button
                            type="button"
                            className={`property-favorite ${
                              isFavorite(townhouse, 'townhouse') ? 'active' : ''
                            }`}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              toggleFavorite(townhouse, 'townhouse')
                            }}
                          >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <path
                                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill={isFavorite(townhouse, 'townhouse') ? 'currentColor' : 'none'}
                              />
                            </svg>
                          </button>
                        </div>
                        <div className="auction-showcase-card__caption">
                          <div
                            className="auction-showcase-card__share-meter"
                            aria-hidden
                          >
                            <div
                              className="auction-showcase-card__share-meter-fill"
                              style={{ width: `${soldPercent}%` }}
                            />
                          </div>
                          <p className="auction-showcase-card__share-meta">
                            {isSoldOut
                              ? t('sharesAllSold')
                              : t('sharesSoldCount', {
                                  sold: soldShares,
                                  total: totalShares,
                                })}
                          </p>
                          <h3 className="auction-showcase-card__name">{townhouse.name}</h3>
                          <p className="auction-showcase-card__bid">
                            <span className="auction-showcase-card__bid-label">
                              {t('sharesPerShare')}
                            </span>
                            <span className="auction-showcase-card__bid-value">
                              {formatPrice(pricePerShare)}
                            </span>
                          </p>
                          <p className="auction-showcase-card__bid auction-showcase-card__bid--secondary">
                            <span className="auction-showcase-card__bid-label">
                              {t('sharesTotalCost')}
                            </span>
                            <span className="auction-showcase-card__bid-value auction-showcase-card__bid-value--muted">
                              {formatPrice(totalPrice)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
              )}
            </div>
            <div className="auction-showcase__nav" role="group" aria-label={t('showcaseCarouselNav')}>
              <button
                type="button"
                className="auction-showcase__nav-btn auction-showcase__nav-btn--prev"
                aria-label={t('showcaseCarouselPrev')}
                onClick={() => scrollSharesShowcase(-1)}
                disabled={homePropertiesLoading}
              >
                <FiChevronLeft size={22} strokeWidth={2.25} />
              </button>
              <button
                type="button"
                className="auction-showcase__nav-btn auction-showcase__nav-btn--next"
                aria-label={t('showcaseCarouselNext')}
                onClick={() => scrollSharesShowcase(1)}
                disabled={homePropertiesLoading}
              >
                <FiChevronRight size={22} strokeWidth={2.25} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Блок: Цифры SellYouBrick — 70vh, анимация берюза → белый треугольник при скролле */}
      <section
        ref={landingStatsRef}
        className="landing-stats"
        style={{ '--stats-scroll-progress': statsScrollProgress }}
      >
        <div className="landing-stats__bg-teal" aria-hidden="true" />
        <div className="landing-stats__bg-white-triangle" aria-hidden="true" />
        <div className="landing-stats__container">
          <h2 className="landing-stats__title">{t('statsTitle')}</h2>
          <div className="landing-stats__grid">
            <div className="landing-stat">
              <span className="landing-stat__value">€1.4B+</span>
              <span className="landing-stat__label">{t('statLabel1')}</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat__value">12–25%</span>
              <span className="landing-stat__label">{t('statLabel2')}</span>
            </div>
          </div>
          <div className="landing-stats__about-wrap">
            <Link to="/about" className="landing-stats__about-link">
              <span className="landing-stats__about-link-text">{t('statsAboutMore')}</span>
              <FiArrowRight className="landing-stats__about-link-icon" size={20} strokeWidth={2.25} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <LeadGenCta />

      <LandingFaqAccordion />

      <div className="app__content">
      <nav className="categories">
        {getPropertyTypes.map((type) => {
          const IconComponent = type.icon
          const isActive = activeCategory === type.label
          return (
            <button
              type="button"
              className={`categories__item ${isActive ? 'categories__item--active' : ''}`}
              key={`${type.label}-${i18n.language}`}
              onClick={() => handleCategoryClick(type.label)}
            >
              <span className="categories__icon">
                {type.image ? (
                  <img loading="lazy" 
                    src={type.image} 
                    alt={type.displayLabel}
                    className="categories__icon-image"
                  />
                ) : (
                  <IconComponent size={28} />
                )}
              </span>
              <span className="categories__label">{type.displayLabel}</span>
            </button>
          )
        })}
      </nav>

      <section className="section section--recommended">
        <div className="section__header">
          <h2 className="section__title">{t('recommended')} {t('propertyWord')}</h2>
        </div>

        <div className="properties-grid" aria-busy={isLoading}>
          {isLoading ? (
            <PropertyListingSkeletonGrid count={6} />
          ) : (
          (filteredProperties?.recommended || filteredRecommended).map((property, index) => {
            const formatPrice = (price) => {
              if (price >= 1000000) {
                return `$${(price / 1000000).toFixed(1)}M`
              }
              return `$${price.toLocaleString('en-US')}`
            }
            
            return (
              <div key={property.id} className="property-card">
                <div 
                  className="property-link"
                  onClick={() => {
                    // hasTimer определяется только по данным объекта, не зависит от индекса
                    const hasTimer = property.isAuction === true && property.endTime != null && property.endTime !== ''
                    // showTimer используется только для визуального отображения таймера
                    const showTimer = index % 2 === 1 && hasTimer
                    handlePropertyClick('recommended', property.id, !showTimer, hasTimer, property)
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="property-image-container">
                    <img loading="lazy" 
                      src={property.image} 
                      alt={property.name}
                      className="property-image"
                    />
                    <button
                      type="button"
                      className={`property-favorite ${
                        isFavorite(property, 'recommended') ? 'active' : ''
                      }`}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleFavorite(property, 'recommended')
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path 
                          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          fill={isFavorite(property, 'recommended') ? "currentColor" : "none"}
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="property-content">
                    {index % 2 === 1 && property.isAuction && property.endTime && (
                      <PropertyTimer endTime={property.endTime} compact={true} />
                    )}
                    <h3 className="property-title">{property.name}</h3>
                    <p className="property-location">{property.location}</p>
                    {index % 2 === 1 && property.isAuction && property.endTime ? (
                      property.currentBid && (
                        <div className="property-bid-info">
                          <span className="bid-label">{t('currentBid')}</span>
                          <span className="bid-value">{formatPrice(property.currentBid)}</span>
                        </div>
                      )
                    ) : (
                      <>
                        <div className="property-price">{formatPrice(propertyMode === 'rent' ? property.price : property.price * 240)}</div>
                        <div className="property-specs">
                          {property.beds && (
                            <div className="spec-item">
                              <MdBed size={18} />
                              <span>{property.beds}</span>
                            </div>
                          )}
                          {property.baths && (
                            <div className="spec-item">
                              <MdOutlineBathtub size={18} />
                              <span>{property.baths}</span>
                            </div>
                          )}
                          {property.sqft && (
                            <div className="spec-item">
                              <BiArea size={18} />
                              <span>{property.sqft} {t('squareMeters')}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
          )}
        </div>
      </section>

      <section className="section section--spaced">
        <div className="section__header">
          <h2 className="section__title">{t('nearby')} {t('propertyWord')}</h2>
        </div>

        <div className="properties-grid" aria-busy={isLoading}>
          {isLoading ? (
            <PropertyListingSkeletonGrid count={6} />
          ) : (
          (filteredProperties?.nearby || filteredNearby).map((property, index) => {
            const formatPrice = (price) => {
              if (price >= 1000000) {
                return `$${(price / 1000000).toFixed(1)}M`
              }
              return `$${price.toLocaleString('en-US')}`
            }
            
            return (
              <div key={property.id} className="property-card">
                <div 
                  className="property-link"
                  onClick={() => {
                    // hasTimer определяется только по данным объекта, не зависит от индекса
                    const hasTimer = property.isAuction === true && property.endTime != null && property.endTime !== ''
                    // showTimer используется только для визуального отображения таймера
                    const showTimer = index % 2 === 1 && hasTimer
                    handlePropertyClick('nearby', property.id, !showTimer, hasTimer, property)
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="property-image-container">
                    <img loading="lazy" 
                      src={property.image} 
                      alt={property.name}
                      className="property-image"
                    />
                    <button
                      type="button"
                      className={`property-favorite ${
                        isFavorite(property, 'nearby') ? 'active' : ''
                      }`}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleFavorite(property, 'nearby')
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path 
                          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          fill={isFavorite(property, 'nearby') ? "currentColor" : "none"}
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="property-content">
                    {index % 2 === 1 && property.isAuction && property.endTime && (
                      <PropertyTimer endTime={property.endTime} compact={true} />
                    )}
                    <h3 className="property-title">{property.name}</h3>
                    {!(index % 2 === 1 && property.isAuction && property.endTime) && property.description && (
                      <p className="property-description">{property.description}</p>
                    )}
                    <p className="property-location">{property.location}</p>
                    {index % 2 === 1 && property.isAuction && property.endTime ? (
                      property.currentBid && (
                        <div className="property-bid-info">
                          <span className="bid-label">{t('currentBid')}</span>
                          <span className="bid-value">{formatPrice(property.currentBid)}</span>
                        </div>
                      )
                    ) : (
                      <>
                        <div className="property-price">{formatPrice(propertyMode === 'rent' ? property.price : property.price * 240)}</div>
                        <div className="property-specs">
                          {property.beds && (
                            <div className="spec-item">
                              <MdBed size={18} />
                              <span>{property.beds}</span>
                            </div>
                          )}
                          {property.baths && (
                            <div className="spec-item">
                              <MdOutlineBathtub size={18} />
                              <span>{property.baths}</span>
                            </div>
                          )}
                          {property.sqft && (
                            <div className="spec-item">
                              <BiArea size={18} />
                              <span>{property.sqft} {t('squareMeters')}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
          )}
        </div>
      </section>
      </div>
    </>
  )
}
