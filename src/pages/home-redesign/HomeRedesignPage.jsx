import { useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FiChevronDown,
  FiDollarSign,
  FiHome,
  FiMapPin,
  FiPieChart,
  FiSearch,
  FiShoppingBag,
  FiSliders,
  FiTag,
  FiTrendingUp,
} from 'react-icons/fi'
import Header from '../../components/Header'
import { FrostedGlassCard } from '../../components/ui/interactive-frosted-glass-card'
import HomeRedesignShowcases from './HomeRedesignShowcases'
import InvestorQuestionsSection from '../../components/InvestorQuestionsSection'
import {
  buildHeroSearchNavigation,
  HERO_LOCATION_OPTIONS,
  HERO_PRICE_OPTIONS,
  HERO_PROPERTY_TYPE_OPTIONS,
  HERO_SALE_TYPE_OPTIONS,
} from '../../utils/heroSearchFilters'
import './HomeRedesignPage.css'

const IMAGES = {
  hero: '/images/sellyourbrick/about/about-hero-villa.jpg',
}

const STRATEGIES = [
  {
    id: 'auction',
    headline: 'Аукцион',
    text: 'Прозрачная история ставок — покупайте объекты по лучшей рыночной цене.',
    icon: FiTrendingUp,
    mobileImage: '/images/home-sale-formats/mobile/sale-format-auction-3d.webp',
    to: '/auction?filter=auction',
  },
  {
    id: 'buy_now',
    headline: 'Купить сейчас',
    text: 'Готовые лоты без ожидания финала аукциона и лишних переговоров.',
    icon: FiShoppingBag,
    mobileImage: '/images/home-sale-formats/mobile/sale-format-buy-now-3d.webp',
    to: '/auction?filter=buy_now',
  },
  {
    id: 'shares',
    headline: 'Доли',
    text: 'Входите в крупные объекты от $5 000 и получайте доход пропорционально доле.',
    icon: FiPieChart,
    mobileImage: '/images/home-sale-formats/mobile/sale-format-shares-3d.webp',
    to: '/shares',
  },
  {
    id: 'debts',
    headline: 'Долги',
    text: 'Долговые инструменты под залог недвижимости с понятной структурой риска.',
    icon: FiDollarSign,
    mobileImage: '/images/home-sale-formats/mobile/sale-format-debts-3d.webp',
    to: '/debts',
  },
]

const HERO_ROLE_CARDS = [
  {
    variant: 'investor',
    title: 'Стать инвестором',
    text: 'Пройдите верификацию и получите доступ к активам с доходностью от 12% до 25% и аналитике рынка.',
    buttonText: 'Начать',
    to: '/auction',
  },
  {
    variant: 'seller',
    title: 'Стать продавцом',
    text: 'Узнайте, сколько верифицированных инвесторов готовы бороться за ваш объект прямо сейчас.',
    buttonText: 'Продать',
    to: '/seller',
  },
]

function HeroVisualCopy({ onNavigate }) {
  return (
    <div className="hr-hero-visual-copy">
      <p className="hr-hero-visual-copy__overline">Инвестиции в недвижимость</p>
      <h1 className="hr-hero-visual-copy__headline">
        <span className="hr-hero-visual-copy__headline-line">Инвестиционная</span>
        <span className="hr-hero-visual-copy__headline-line">платформа недвижимости</span>
      </h1>
      <div className="hr-hero-visual-copy__actions">
        <button
          type="button"
          className="hr-btn hr-btn--primary"
          onClick={() => onNavigate('/auction')}
        >
          Смотреть объекты
        </button>
        <button
          type="button"
          className="hr-btn hr-btn--outline hr-hero-visual-copy__btn-secondary"
          onClick={() => onNavigate('/seller')}
        >
          Разместить объект
        </button>
      </div>
    </div>
  )
}

function HeroRoleCards({ onNavigate }) {
  return (
    <div className="hr-hero-role-cards">
      {HERO_ROLE_CARDS.map((card) => (
        <FrostedGlassCard
          key={card.variant}
          variant={card.variant}
          title={card.title}
          buttonText={card.buttonText}
          onButtonClick={() => onNavigate(card.to)}
        >
          {card.text}
        </FrostedGlassCard>
      ))}
    </div>
  )
}

function HeroSearchBar({ onNavigate }) {
  const [saleType, setSaleType] = useState('auction')
  const [propertyType, setPropertyType] = useState('villa')
  const [location, setLocation] = useState('uae')
  const [price, setPrice] = useState('mid')
  const [mobileSaleType, setMobileSaleType] = useState('')
  const [mobilePropertyType, setMobilePropertyType] = useState('')
  const [mobileLocation, setMobileLocation] = useState('')
  const [mobilePrice, setMobilePrice] = useState('')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const saleOption = HERO_SALE_TYPE_OPTIONS.find((o) => o.value === saleType)
  const propertyOption = HERO_PROPERTY_TYPE_OPTIONS.find((o) => o.value === propertyType)
  const locationOption = HERO_LOCATION_OPTIONS.find((o) => o.value === location)
  const priceOption = HERO_PRICE_OPTIONS.find((o) => o.value === price)

  const saleLabel = saleOption?.label ?? ''
  const propertyLabel = propertyOption?.label ?? ''
  const locationLabel = locationOption?.label ?? ''
  const priceLabel = priceOption?.label ?? ''

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault()
      const target = buildHeroSearchNavigation({
        saleType,
        propertyType,
        location,
        price,
      })
      onNavigate(target.pathname, { state: target.state })
    },
    [location, onNavigate, price, propertyType, saleType],
  )

  const handleMobileSubmit = useCallback(
    (event) => {
      event.preventDefault()
      const target = buildHeroSearchNavigation({
        saleType: mobileSaleType,
        propertyType: mobilePropertyType,
        location: mobileLocation,
        price: mobilePrice,
      })
      onNavigate(target.pathname, { state: target.state })
    }, [mobileLocation, mobilePrice, mobilePropertyType, mobileSaleType, onNavigate],
  )

  const fields = [
    {
      id: 'sale',
      label: 'Тип продажи',
      icon: FiTag,
      value: saleType,
      display: saleLabel,
      displayCompact: saleOption?.shortLabel ?? saleLabel,
      onChange: setSaleType,
      options: HERO_SALE_TYPE_OPTIONS,
    },
    {
      id: 'property',
      label: 'Тип объекта',
      icon: FiHome,
      value: propertyType,
      display: propertyLabel,
      displayCompact: propertyOption?.shortLabel ?? propertyLabel,
      onChange: setPropertyType,
      options: HERO_PROPERTY_TYPE_OPTIONS,
    },
    {
      id: 'location',
      label: 'Локация',
      icon: FiMapPin,
      value: location,
      display: locationLabel,
      displayCompact: locationOption?.shortLabel ?? locationLabel,
      onChange: setLocation,
      options: HERO_LOCATION_OPTIONS,
    },
    {
      id: 'price',
      label: 'Цена',
      icon: FiDollarSign,
      value: price,
      display: priceLabel,
      displayCompact: priceOption?.shortLabel ?? priceLabel,
      onChange: setPrice,
      options: HERO_PRICE_OPTIONS,
    },
  ]

  const mobileFields = [
    {
      id: 'mobile-sale',
      label: 'Тип продажи',
      value: mobileSaleType,
      onChange: setMobileSaleType,
      options: HERO_SALE_TYPE_OPTIONS,
    },
    {
      id: 'mobile-property',
      label: 'Тип объекта',
      value: mobilePropertyType,
      onChange: setMobilePropertyType,
      options: HERO_PROPERTY_TYPE_OPTIONS,
    },
    {
      id: 'mobile-location',
      label: 'Локация',
      value: mobileLocation,
      onChange: setMobileLocation,
      options: HERO_LOCATION_OPTIONS,
    },
    {
      id: 'mobile-price',
      label: 'Бюджет',
      value: mobilePrice,
      onChange: setMobilePrice,
      options: HERO_PRICE_OPTIONS,
    },
  ]

  const mobileActiveFilters = [
    mobileSaleType,
    mobilePropertyType,
    mobileLocation,
    mobilePrice,
  ].filter(Boolean).length

  return (
    <div className="hr-search-bar-bridge">
      <form
        className="hr-search-bar hr-search-bar--desktop"
        onSubmit={handleSubmit}
        aria-label="Поиск объектов"
      >
        <div className="hr-search-bar__fields">
          {fields.map((field, index) => {
            const Icon = field.icon
            return (
              <label
                key={field.id}
                className={`hr-search-bar__cell${index < fields.length - 1 ? ' hr-search-bar__cell--divider' : ''}`}
              >
                <span className="hr-search-bar__cell-head">
                  <Icon className="hr-search-bar__cell-icon" aria-hidden />
                  <span className="hr-search-bar__label">{field.label}</span>
                </span>
                <span className="hr-search-bar__value hr-search-bar__value--full">{field.display}</span>
                <span className="hr-search-bar__value hr-search-bar__value--compact">{field.displayCompact}</span>
                <select
                  className="hr-search-bar__select"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  aria-label={field.label}
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )
          })}
        </div>
        <button type="submit" className="hr-search-bar__submit" aria-label="Найти объекты">
          <FiSearch aria-hidden />
        </button>
      </form>

      <form
        className="hr-search-bar hr-search-bar--mobile"
        onSubmit={handleMobileSubmit}
        aria-label="Поиск объектов в каталоге"
      >
        <div className="hr-search-mobile__primary">
          <div className="hr-search-mobile__input-wrap">
            <FiSearch className="hr-search-mobile__input-icon" aria-hidden />
            <input
              className="hr-search-mobile__input"
              type="search"
              value=""
              placeholder="Поиск по каталогу"
              aria-label="Поиск по каталогу"
              readOnly
            />
          </div>
          <button type="submit" className="hr-search-mobile__all-button">
            Найдём всё!
          </button>
        </div>

        <button
          type="button"
          className={`hr-search-mobile__toggle${mobileFiltersOpen ? ' is-open' : ''}`}
          aria-expanded={mobileFiltersOpen}
          aria-controls="hr-search-mobile-drawer"
          onClick={() => setMobileFiltersOpen((isOpen) => !isOpen)}
        >
          <span className="hr-search-mobile__toggle-label">
            <FiSliders aria-hidden />
            Фильтры
          </span>
          <span className="hr-search-mobile__toggle-meta">
            {mobileActiveFilters ? `Выбрано: ${mobileActiveFilters}` : 'Все объекты'}
          </span>
          <FiChevronDown className="hr-search-mobile__toggle-chevron" aria-hidden />
        </button>

        <div
          id="hr-search-mobile-drawer"
          className={`hr-search-mobile__drawer${mobileFiltersOpen ? ' is-open' : ''}`}
          aria-hidden={!mobileFiltersOpen}
          inert={mobileFiltersOpen ? undefined : ''}
        >
          <div className="hr-search-mobile__drawer-clip">
            <div className="hr-search-mobile__drawer-content">
              <div className="hr-search-mobile__fields">
                {mobileFields.map((field) => (
                  <label key={field.id} className="hr-search-mobile__field">
                    <span>{field.label}</span>
                    <span className="hr-search-mobile__select-wrap">
                      <select
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        aria-label={field.label}
                      >
                        <option value="">Не важно</option>
                        {field.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <FiChevronDown aria-hidden />
                    </span>
                  </label>
                ))}
              </div>
              <button type="submit" className="hr-search-mobile__find-button">
                <FiSearch aria-hidden />
                Найти
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

function StrategiesSection({ onNavigate }) {
  const railRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const updateActiveIndex = useCallback(() => {
    const rail = railRef.current
    if (!rail) return

    const cards = rail.querySelectorAll('.hr-strategy-stat-card')
    if (!cards.length) return

    const railRect = rail.getBoundingClientRect()
    const railCenter = railRect.left + railRect.width / 2

    let closestIndex = 0
    let minDistance = Number.POSITIVE_INFINITY

    cards.forEach((card, index) => {
      const cardRect = card.getBoundingClientRect()
      const cardCenter = cardRect.left + cardRect.width / 2
      const distance = Math.abs(cardCenter - railCenter)

      if (distance < minDistance) {
        minDistance = distance
        closestIndex = index
      }
    })

    setActiveIndex(closestIndex)
  }, [])

  useEffect(() => {
    updateActiveIndex()

    const rail = railRef.current
    if (!rail) return undefined

    const onScroll = () => updateActiveIndex()
    rail.addEventListener('scroll', onScroll, { passive: true })

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => updateActiveIndex()) : null
    resizeObserver?.observe(rail)
    window.addEventListener('resize', updateActiveIndex)

    return () => {
      rail.removeEventListener('scroll', onScroll)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateActiveIndex)
    }
  }, [updateActiveIndex])

  const scrollToIndex = useCallback((index) => {
    const rail = railRef.current
    if (!rail) return

    const card = rail.children[index]
    if (!card) return

    const railRect = rail.getBoundingClientRect()
    const cardRect = card.getBoundingClientRect()

    rail.scrollTo({
      left: rail.scrollLeft + cardRect.left - railRect.left,
      behavior: 'smooth',
    })
  }, [])

  return (
    <section className="hr-section hr-section--gray hr-strategies" aria-labelledby="hr-strategies-title">
      <div className="hr-container hr-strategies__inner">
        <div className="hr-strategies__copy">
          <h2 id="hr-strategies-title" className="hr-strategies__title">
            <span className="hr-strategies__title-desktop">Стратегии инвестирования</span>
            <span className="hr-strategies__title-mobile">
              <span className="hr-strategies__title-line">
                <span className="hr-strategies__title-prefix">4</span>{' '}
                <span className="hr-strategies__title-pill">стратегии</span>
              </span>
              <span className="hr-strategies__title-line">инвестирования</span>
            </span>
          </h2>
          <p className="hr-strategies__lead">
            Четыре формата вложений в недвижимость — от открытых торгов до долговых инструментов.
          </p>
        </div>

        <div className="hr-strategies__carousel">
          <div className="hr-strategies__cards" ref={railRef} role="list">
            {STRATEGIES.map((item, index) => {
              const Icon = item.icon
              return (
                <article
                  key={item.id}
                  className={`hr-strategy-stat-card hr-strategy-stat-card--${item.id}`}
                  role="listitem"
                  tabIndex={0}
                  onClick={() => onNavigate(item.to)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onNavigate(item.to)
                    }
                  }}
                >
                  <img
                    className="hr-strategy-stat-card__visual"
                    src={item.mobileImage}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="hr-strategy-stat-card__number" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')} · {item.headline}
                  </span>
                  <span className="hr-strategy-stat-card__icon" aria-hidden>
                    <Icon />
                  </span>
                  <div className="hr-strategy-stat-card__content">
                    <h3 className="hr-strategy-stat-card__headline">{item.headline}</h3>
                    <p className="hr-strategy-stat-card__text">{item.text}</p>
                  </div>
                  <span className="hr-strategy-stat-card__cta" aria-hidden="true">
                    Смотреть <span>→</span>
                  </span>
                </article>
              )
            })}
          </div>

          <div
            className="hr-strategies__pager"
            role="tablist"
            aria-label="Навигация по стратегиям"
          >
            <div className="hr-strategies__pager-dots">
              {STRATEGIES.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  className={`hr-strategies__pager-dot${index === activeIndex ? ' is-active' : ''}`}
                  aria-selected={index === activeIndex}
                  aria-label={`${index + 1} из ${STRATEGIES.length}: ${item.headline}`}
                  onClick={() => scrollToIndex(index)}
                />
              ))}
            </div>
            <p className="hr-strategies__pager-label" aria-live="polite" aria-atomic="true">
              <span className="hr-strategies__pager-current">
                {String(activeIndex + 1).padStart(2, '0')}
              </span>
              <span className="hr-strategies__pager-sep">/</span>
              <span className="hr-strategies__pager-total">
                {String(STRATEGIES.length).padStart(2, '0')}
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function HomeRedesignPage() {
  const navigate = useNavigate()

  return (
    <div className="hr-page">
      <Header />

      <main className="hr-main">
      <section className="hr-section hr-section--white hr-hero">
        <div className="hr-hero-visual-overlap">
          <div className="hr-hero__visual-wrap">
            <div className="hr-hero__visual">
              <img
                className="hr-hero__image"
                src={IMAGES.hero}
                alt="Современная вилла с бассейном"
                loading="eager"
              />
            </div>
            <div className="hr-hero-overlays">
              <HeroVisualCopy onNavigate={navigate} />
            </div>
            <HeroRoleCards onNavigate={navigate} />
          </div>

          <HeroSearchBar onNavigate={(pathname, options) => navigate(pathname, options)} />

          <StrategiesSection onNavigate={navigate} />
        </div>
      </section>

      <HomeRedesignShowcases />

      <InvestorQuestionsSection id="hr-contact" idPrefix="hr" />
      </main>
    </div>
  )
}
