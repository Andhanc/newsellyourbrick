import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import PropertyListingCard from '../components/PropertyListingCard'
import { PropertyListingSkeletonGrid } from '../components/PropertyListingSkeletonGrid'
import {
  PiArrowRight,
  PiHeartStraight,
  PiQuestion,
  PiScales,
  PiX,
} from 'react-icons/pi'
import './Favorites.css'
import '../components/PropertyList.css'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { useFavoriteAuctionItems } from '../hooks/useFavoriteAuctionItems'
import { auctionListingDedupeKey, buildPropertyDetailNavigation } from '../utils/propertyDetailUrl'
import { hasPropertyListingTimer } from '../utils/auctionReminderBounds'

const FAVORITES_CARD_SKELETON_COUNT = 4
const EMPTY_ILLUSTRATION = '/images/favorites-empty-reference-style.png'
const COMPARE_ILLUSTRATION = '/images/favorites-compare-reference-style.png'

const recommendedProperties = [
  {
    title: 'Резиденция у моря',
    location: 'Коста-Адехе, Тенерифе',
    image: '/images/external/photo-1600607687939-ce8a6c25118c-3f6b6fdeda.jpg',
  },
  {
    title: 'Апартаменты в бизнес-квартале',
    location: 'Барселона, Испания',
    image: '/images/external/photo-1486406146926-c627a92ad1ab-f0c377ec01.jpg',
  },
  {
    title: 'Современная вилла с садом',
    location: 'Марбелья, Испания',
    image: '/images/external/photo-1600566753190-17f0baa2a6c3-1953ced3f5.jpg',
  },
  {
    title: 'Пентхаус с панорамными окнами',
    location: 'Лиссабон, Португалия',
    image: '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg',
  },
]

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
  const [guideOpen, setGuideOpen] = useState(false)
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

  const openProperty = (property, { auctionTab } = {}) => {
    if (!ensureCanOpenProperty()) return
    const { pathname, state } = buildPropertyDetailNavigation(property, {
      auctionTab: auctionTab || undefined,
    })
    navigate(pathname, { state })
  }

  return (
    <div className="favorites-page">
      <Header />
      <div className="favorites-container">
        <div className="favorites-header">
          <h1 className="favorites-title">
            <PiHeartStraight className="favorites-title-icon" aria-hidden />
            Понравилось
          </h1>
          <nav className="favorites-breadcrumbs" aria-label="Хлебные крошки">
            <Link to="/auction">Главная</Link>
            <span aria-hidden>•</span>
            <span>Понравилось</span>
          </nav>
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
          <section className="favorites-empty" aria-labelledby="favorites-empty-title">
            <img
              src={EMPTY_ILLUSTRATION}
              alt=""
              className="favorites-empty__image"
              loading="eager"
            />
            <h2 id="favorites-empty-title" className="favorites-empty-title">
              Пока ничего нет
            </h2>
            <p className="favorites-empty-text">
              Добавляйте понравившиеся объекты в избранное,
              чтобы быстро возвращаться к ним позже
            </p>
            <button className="favorites-empty-button" onClick={() => navigate('/auction')}>
              Перейти в каталог
              <PiArrowRight size={22} aria-hidden />
            </button>
            <button
              className="favorites-empty-help"
              type="button"
              onClick={() => setGuideOpen(true)}
            >
              Как это работает?
              <PiQuestion size={16} aria-hidden />
            </button>
          </section>
        )}

        <section className="favorites-compare" aria-labelledby="favorites-compare-title">
          <div className="favorites-compare__copy">
            <span className="favorites-compare__icon" aria-hidden>
              <PiScales />
            </span>
            <div>
              <h2 id="favorites-compare-title">Сравнивайте и выбирайте лучшее</h2>
              <p>
                Сохраняйте объекты, сравнивайте характеристики,
                цены и расположение, чтобы принять верное решение
              </p>
              <Link to="/compare" className="favorites-compare__button">
                Узнать больше о сравнении
                <PiArrowRight size={22} aria-hidden />
              </Link>
            </div>
          </div>
          <img
            src={COMPARE_ILLUSTRATION}
            alt=""
            className="favorites-compare__image"
            loading="lazy"
          />
        </section>

        <section className="favorites-recommendations" aria-labelledby="favorites-recommendations-title">
          <div className="favorites-recommendations__header">
            <h2 id="favorites-recommendations-title">Вам может понравиться</h2>
            <Link to="/auction" className="favorites-recommendations__all">
              Смотреть все
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

      {guideOpen ? (
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
              aria-label="Закрыть"
            >
              <PiX size={20} aria-hidden />
            </button>
            <h2 id="favorites-guide-title">Как работает избранное</h2>
            <p>
              Нажмите на сердечко в карточке объекта, и он появится здесь.
              Когда накопится несколько вариантов, откройте сравнение и
              посмотрите характеристики рядом.
            </p>
            <button
              className="favorites-guide__action"
              type="button"
              onClick={() => {
                setGuideOpen(false)
                navigate('/auction')
              }}
            >
              Перейти в каталог
              <PiArrowRight size={20} aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default Favorites
