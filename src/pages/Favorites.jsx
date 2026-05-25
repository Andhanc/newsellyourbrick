import { useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import PropertyListingCard from '../components/PropertyListingCard'
import { PropertyListingSkeletonGrid } from '../components/PropertyListingSkeletonGrid'
import { FiHeart, FiArrowRight, FiColumns } from 'react-icons/fi'
import './Favorites.css'
import '../components/PropertyList.css'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { useFavoriteAuctionItems } from '../hooks/useFavoriteAuctionItems'
import { getPropertyDetailPath, auctionListingDedupeKey } from '../utils/propertyDetailUrl'
import { hasPropertyListingTimer } from '../utils/auctionReminderBounds'

const FAVORITES_CARD_SKELETON_COUNT = 4

function FavoritesGrid({ items, onOpen }) {
  return (
    <div className="properties-grid favorites-page__grid">
      {items.map((item) => (
        <PropertyListingCard
          key={item.key || auctionListingDedupeKey(item.property)}
          property={item.property}
          favoriteMockCategory={
            hasDbBackedProperty(item.property) ? undefined : item.mockCategory
          }
          onOpen={onOpen}
          showActions={false}
          pinFooter
        />
      ))}
    </div>
  )
}

const Favorites = () => {
  const navigate = useNavigate()
  const { favoritesLoading } = usePropertyFavorites()
  const { favoriteAuctions, catalogLoading } = useFavoriteAuctionItems()

  const listLoading = catalogLoading || favoritesLoading

  const { withTimer, withoutTimer, splitByTimer } = useMemo(() => {
    const timerList = []
    const noTimerList = []
    for (const item of favoriteAuctions) {
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
  }, [favoriteAuctions])

  const openProperty = (property) => {
    if (!ensureCanOpenProperty()) return
    navigate(getPropertyDetailPath(property.id, { property }), {
      state: { property },
    })
  }

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
          <div
            className="properties-grid favorites-page__grid favorites-page__grid--skeleton"
            aria-busy="true"
          >
            <PropertyListingSkeletonGrid count={FAVORITES_CARD_SKELETON_COUNT} />
          </div>
        ) : favoriteAuctions.length > 0 ? (
          splitByTimer ? (
            <div className="favorites-page__sections">
              <FavoritesGrid items={withTimer} onOpen={openProperty} />
              <div className="favorites-page__divider" role="separator" aria-hidden="true" />
              <FavoritesGrid items={withoutTimer} onOpen={openProperty} />
            </div>
          ) : (
            <FavoritesGrid items={favoriteAuctions} onOpen={openProperty} />
          )
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
