import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import FavoritePropertyCard from '../components/FavoritePropertyCard'
import {
  PiArrowRight,
  PiArrowUpRight,
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
const COMPARE_ILLUSTRATION = '/images/favorites-compare-illustration.png'

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
            Понравилось
          </h1>
          <nav className="favorites-breadcrumbs" aria-label="Хлебные крошки">
            <Link to="/auction">Главная</Link>
            <span aria-hidden>•</span>
            <span>Понравилось</span>
          </nav>
          {!listLoading ? (
            <p className="favorites-summary">
              {favoriteAuctions.length > 0
                ? `${favoriteAuctions.length} сохранённых объектов — цены и статусы обновляются из каталога`
                : 'Соберите здесь варианты, к которым хотите вернуться'}
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
              Пока ничего нет
            </h2>
            <p className="favorites-empty-text">
              Добавляйте понравившиеся объекты в избранное,
              чтобы быстро возвращаться к ним позже
            </p>
            <button className="favorites-empty-button" onClick={() => navigate('/auction')}>
              Перейти в каталог
              <PiArrowRight size={18} aria-hidden />
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
          <div className="favorites-compare__visual" aria-hidden>
            <img
              src={COMPARE_ILLUSTRATION}
              alt=""
              className="favorites-compare__image"
              loading="lazy"
            />
          </div>
          <div className="favorites-compare__copy">
            <h2 id="favorites-compare-title">
              Сравнивайте и выбирайте
              <span className="favorites-compare__title-accent"> лучшее</span>
            </h2>
            <p>
              Цены, характеристики и локация — рядом, чтобы выбрать уверенно
            </p>
            <Link to="/compare" className="favorites-compare__button">
              О сравнении
              <PiArrowUpRight size={13} aria-hidden />
            </Link>
          </div>
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
            Перейти в каталог
            <PiArrowRight size={16} aria-hidden />
          </button>
        )}
      >
        <div className="favorites-guide__content">
          <span className="favorites-guide__illustration" aria-hidden><PiHeartStraight /></span>
          <p className="favorites-eyebrow">Ваш личный шорт-лист</p>
          <h2 id="favorites-guide-title">Как работает избранное</h2>
          <p id="favorites-guide-description">
            Нажмите на сердечко в карточке объекта, и он появится здесь. Когда вариантов
            станет два или больше, сравнение поможет увидеть цены и характеристики рядом.
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

      {isMobile && favoriteAuctions.length >= 2 ? (
        <aside className="favorites-compare-tray" aria-label="Сравнение избранных объектов">
          <div>
            <strong>Готовы сравнить?</strong>
            <span>{favoriteAuctions.length} объектов в подборке</span>
          </div>
          <Link to="/compare">Сравнить</Link>
        </aside>
      ) : null}
    </div>
  )
}

export default Favorites
