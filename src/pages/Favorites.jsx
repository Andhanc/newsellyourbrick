import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import PropertyTimer from '../components/PropertyTimer'
import { FiHeart, FiMapPin, FiArrowRight, FiColumns } from 'react-icons/fi'
import { MdBed, MdOutlineBathtub } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import './Favorites.css'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { useFavoriteAuctionItems } from '../hooks/useFavoriteAuctionItems'
import { getPropertyCardImage } from '../utils/propertyImage'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import ImageWithSkeleton from '../components/ImageWithSkeleton'
import { getPropertyDetailPath } from '../utils/propertyDetailUrl'
import { formatPropertyPrice } from '../utils/currency'

const FAVORITES_CARD_SKELETON_COUNT = 4

/** Плейсхолдер карточки аукциона, пока грузятся каталог и избранное с сервера */
function FavoriteCardSkeleton() {
  return (
    <div className="favorite-card favorite-card--skeleton" aria-hidden="true">
      <div className="favorite-card-link favorite-card-link--skeleton">
        <div className="favorite-card-image">
          <div className="favorite-card-skel-shimmer favorite-card-skel-shimmer--media" />
          <span className="favorite-card-heart-skel" />
        </div>
        <div className="favorite-card-content">
          <div className="favorite-card-timer">
            <span className="favorite-card-skel-pill" />
          </div>
          <div className="favorite-card-skel-line favorite-card-skel-line--title" />
          <div className="favorite-card-skel-line favorite-card-skel-line--title-narrow" />
          <div className="favorite-card-skel-line favorite-card-skel-line--loc" />
          <div className="favorite-card-details favorite-card-details--skeleton">
            <span className="favorite-card-skel-pill-sm" />
            <span className="favorite-card-skel-pill-sm" />
            <span className="favorite-card-skel-pill-sm favorite-card-skel-pill-sm--grow" />
          </div>
          <div className="favorite-card-price favorite-card-price--skeleton">
            <span className="favorite-card-skel-line favorite-card-skel-line--label" />
            <span className="favorite-card-skel-line favorite-card-skel-line--value" />
          </div>
        </div>
      </div>
    </div>
  )
}

const Favorites = () => {
  const navigate = useNavigate()
  const { toggleFavorite, favoritesLoading } = usePropertyFavorites()
  const { favoriteAuctions, catalogLoading } = useFavoriteAuctionItems()

  const listLoading = catalogLoading || favoritesLoading

  const removeFavorite = (item) => {
    toggleFavorite(
      item.property,
      hasDbBackedProperty(item.property) ? undefined : item.mockCategory || 'property'
    )
  }

  const getPropertyRoute = (auction) => getPropertyDetailPath(auction.id, { property: auction })

  return (
    <div className="favorites-page">
      <Header />
      <div className="favorites-container">
        <div className="favorites-header">
          <h1 className="favorites-title">
            <FiHeart className="favorites-title-icon" />
            Понравилось
          </h1>
          <p className="favorites-subtitle">
            Все аукционы, которые вы добавили в избранное
          </p>
          <Link to="/compare" className="favorites-compare-btn">
            <FiColumns className="favorites-compare-btn__icon" aria-hidden />
            <span className="favorites-compare-btn__label">Сравнить два объекта</span>
            <FiArrowRight className="favorites-compare-btn__arrow" aria-hidden />
          </Link>
        </div>

        {listLoading ? (
          <div className="favorites-grid favorites-grid--skeleton" aria-busy="true">
            {Array.from({ length: FAVORITES_CARD_SKELETON_COUNT }, (_, i) => (
              <FavoriteCardSkeleton key={`favorite-skel-${i}`} />
            ))}
          </div>
        ) : favoriteAuctions.length > 0 ? (
          <div className="favorites-grid">
            {favoriteAuctions.map((item) => {
              const auction = item.property
              const imageSrc = getPropertyCardImage(
                auction,
                'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
              )
              const imageProps = buildResponsiveImageProps(imageSrc, {
                widths: [320, 480, 640],
                sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
                fit: 'cover',
                quality: 72,
                format: 'webp',
              })
              return (
                <div key={item.key} className="favorite-card">
                  <Link
                    to={getPropertyRoute(auction)}
                    className="favorite-card-link"
                    onClick={(e) => {
                      if (ensureCanOpenProperty()) return
                      e.preventDefault()
                    }}
                  >
                    <div className="favorite-card-image">
                      <ImageWithSkeleton
                        imgProps={imageProps}
                        alt={auction.name || auction.title}
                        containerClassName="favorite-card-image"
                        onError={(e) => {
                          e.currentTarget.src =
                            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
                        }}
                      />
                      <button
                        className="favorite-card-heart active"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          removeFavorite(item)
                        }}
                        aria-label="Удалить из избранного"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="favorite-card-content">
                      {auction.endTime && (
                        <div className="favorite-card-timer">
                          <PropertyTimer
                            endTime={
                              typeof auction.endTime === 'string'
                                ? auction.endTime
                                : auction.endTime.toISOString()
                            }
                            compact={true}
                          />
                        </div>
                      )}
                      <h3 className="favorite-card-title">{auction.name || auction.title}</h3>
                      <p className="favorite-card-location">
                        <FiMapPin size={14} />
                        {auction.location || '—'}
                      </p>
                      <div className="favorite-card-details">
                        {auction.beds ? (
                          <span className="favorite-card-detail">
                            <MdBed size={16} />
                            {auction.beds}
                          </span>
                        ) : null}
                        {auction.baths ? (
                          <span className="favorite-card-detail">
                            <MdOutlineBathtub size={16} />
                            {auction.baths}
                          </span>
                        ) : null}
                        {(auction.sqft || auction.area) ? (
                          <span className="favorite-card-detail">
                            <BiArea size={16} />
                            {auction.sqft || auction.area} м²
                          </span>
                        ) : null}
                      </div>
                      <div className="favorite-card-price">
                        {auction.isAuction && auction.currentBid ? (
                          <>
                            <span className="favorite-card-price-label">Текущая ставка:</span>
                            <span className="favorite-card-price-value">{formatPropertyPrice(auction.currentBid, auction.currency, { compact: true })}</span>
                          </>
                        ) : (
                          <>
                            <span className="favorite-card-price-label">Цена:</span>
                            <span className="favorite-card-price-value">{formatPropertyPrice(auction.price, auction.currency, { compact: true })}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="favorites-empty">
            <FiHeart size={64} className="favorites-empty-icon" />
            <h2 className="favorites-empty-title">У вас пока нет избранных аукционов</h2>
            <p className="favorites-empty-text">
              Добавляйте понравившиеся аукционы в избранное, чтобы не потерять их
            </p>
            <button className="favorites-empty-button" onClick={() => navigate('/auction')}>
              Перейти к аукционам
              <FiArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Favorites
