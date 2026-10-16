import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaFire } from 'react-icons/fa6'
import { FiArrowUpRight, FiHeart } from 'react-icons/fi'
import { usePropertyFavorites, PROPERTY_FAVORITES_NEEDED } from '../context/PropertyFavoritesContext'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import { useInvestorHomeShowcases } from '../hooks/useInvestorHomeShowcases'
import { selectDiscoverTopListings } from '../utils/discoverTopListings'
import { buildPropertyDetailNavigation } from '../utils/propertyDetailUrl'
import { getCoInvestmentDetailPath } from '../utils/sectionRoutes'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { applyPropertyImageFallback } from '../utils/propertyImage'
import { formatPropertyPrice } from '../utils/currency'
import { getSharePricePerShare, isShareSoldOut } from '../utils/shareCardMetrics'
import { showNotification } from '../utils/toastHelper'

const FORMAT_KEYS = { auction: 'auction', buy_now: 'buyNowSectionTitle', debts: 'debtsTitle', shares: 'coInvestment' }

export default function MobileDiscoverTopListings({ isSignedIn = false }) {
  const { t, i18n } = useTranslation()
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  useEffect(() => {
    window.dispatchEvent(new Event(PROPERTY_FAVORITES_NEEDED))
  }, [])
  const { loading, auctionSection, buyNowSection, debtsSection, sharesSection } = useInvestorHomeShowcases()
  const listings = selectDiscoverTopListings([
    { kind: 'buy_now', items: buyNowSection },
    { kind: 'auction', items: auctionSection },
    { kind: 'debts', items: debtsSection },
    { kind: 'shares', items: sharesSection.filter((property) => !isShareSoldOut(property)) },
  ])

  const guardOpen = (event) => {
    if (ensureCanOpenProperty(isSignedIn)) return
    event.preventDefault()
    showNotification(t('discoverPage_authToOpenProperty'), 'info')
  }

  return (
    <section className="md-top-listings" aria-labelledby="md-top-listings-title" aria-busy={loading}>
      <h2 className="md-top-listings__title" id="md-top-listings-title">
        <FaFire className="md-top-listings__fire" aria-hidden="true" />
        {t('discoverPage_topListings')}
      </h2>
      <div className="md-top-listings__rail" role="list" aria-label={t('discoverPage_topListings')}>
        {loading ? Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="md-top-listings__skeleton" role="listitem" aria-label={t('loading')} />
        )) : listings.map(({ kind, property, key }) => {
          const favoriteCategory = hasDbBackedProperty(property) ? undefined : 'property'
          const liked = isFavorite(property, favoriteCategory)
          const destination = kind === 'shares'
            ? { pathname: getCoInvestmentDetailPath(property), state: { shareObject: property } }
            : buildPropertyDetailNavigation(property)
          const price = kind === 'shares' ? getSharePricePerShare(property)
            : kind === 'auction' ? property.currentBid || property.auction_starting_price || property.price
              : property.price
          return (
            <div className="md-top-listings__slot" role="listitem" key={key}>
              <Link className="md-top-listings__card" to={destination.pathname} state={destination.state} onClick={guardOpen}>
                <div className="md-top-listings__media">
                  <img src={property.image} alt="" loading="lazy" decoding="async" onError={applyPropertyImageFallback} />
                  <span className="md-top-listings__type">{t(FORMAT_KEYS[kind])}</span>
                </div>
                <div className="md-top-listings__body">
                  <strong className="md-top-listings__name">{property.title || property.name}</strong>
                  <span className="md-top-listings__location">{property.location || [property.city, property.country].filter(Boolean).join(', ')}</span>
                  <span className="md-top-listings__price">
                    {Number(price) > 0 ? formatPropertyPrice(price, property.currency || 'EUR', { locale: i18n.language }) : t('comparePage_priceOnRequest')}
                    {kind === 'shares' && <small>{t('discoverPage_perShare')}</small>}
                  </span>
                </div>
              </Link>
              <button
                type="button"
                className={`md-top-listings__favorite${liked ? ' is-active' : ''}`}
                aria-pressed={liked}
                aria-label={liked ? t('auctionRemoveFavorite') : t('propertyDetailAddToFavorites')}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  void toggleFavorite(property, favoriteCategory)
                }}
              >
                <FiHeart aria-hidden="true" />
              </button>
            </div>
          )
        })}
        {!loading && (
          <div className="md-top-listings__slot" role="listitem">
            <Link className="md-top-listings__catalog" to="/search-results">
              <span className="md-top-listings__catalog-icon"><FiArrowUpRight aria-hidden="true" /></span>
              <strong>{t('discoverPage_openCatalog')}</strong>
              <span>{t('discoverPage_catalogMore')}</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
