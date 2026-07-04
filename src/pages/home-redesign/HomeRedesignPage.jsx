import { useNavigate } from 'react-router-dom'
import { useCallback, useState } from 'react'
import {
  FiDollarSign,
  FiHome,
  FiMapPin,
  FiPieChart,
  FiSearch,
  FiShoppingBag,
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
    to: '/auction?filter=auction',
  },
  {
    id: 'buy_now',
    headline: 'Купить сейчас',
    text: 'Готовые лоты без ожидания финала аукциона и лишних переговоров.',
    icon: FiShoppingBag,
    to: '/auction?filter=buy_now',
  },
  {
    id: 'shares',
    headline: 'Доли',
    text: 'Входите в крупные объекты от $5 000 и получайте доход пропорционально доле.',
    icon: FiPieChart,
    to: '/shares',
  },
  {
    id: 'debts',
    headline: 'Долги',
    text: 'Долговые инструменты под залог недвижимости с понятной структурой риска.',
    icon: FiDollarSign,
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
    buttonText: 'Разместить объект',
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
      <p className="hr-hero-visual-copy__subheadline">
        Аукционы, доли, долги и готовые лоты
      </p>
      <p className="hr-hero-visual-copy__desc">
        Верифицированные объекты и прозрачные сделки онлайн — от открытых торгов до долевых вложений.
      </p>
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

  const saleLabel = HERO_SALE_TYPE_OPTIONS.find((o) => o.value === saleType)?.label ?? ''
  const propertyLabel = HERO_PROPERTY_TYPE_OPTIONS.find((o) => o.value === propertyType)?.label ?? ''
  const locationLabel = HERO_LOCATION_OPTIONS.find((o) => o.value === location)?.label ?? ''
  const priceLabel = HERO_PRICE_OPTIONS.find((o) => o.value === price)?.label ?? ''

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

  const fields = [
    {
      id: 'sale',
      label: 'Тип продажи',
      icon: FiTag,
      value: saleType,
      display: saleLabel,
      onChange: setSaleType,
      options: HERO_SALE_TYPE_OPTIONS,
    },
    {
      id: 'property',
      label: 'Тип объекта',
      icon: FiHome,
      value: propertyType,
      display: propertyLabel,
      onChange: setPropertyType,
      options: HERO_PROPERTY_TYPE_OPTIONS,
    },
    {
      id: 'location',
      label: 'Локация',
      icon: FiMapPin,
      value: location,
      display: locationLabel,
      onChange: setLocation,
      options: HERO_LOCATION_OPTIONS,
    },
    {
      id: 'price',
      label: 'Цена',
      icon: FiDollarSign,
      value: price,
      display: priceLabel,
      onChange: setPrice,
      options: HERO_PRICE_OPTIONS,
    },
  ]

  return (
    <div className="hr-search-bar-bridge">
      <form className="hr-search-bar" onSubmit={handleSubmit} aria-label="Поиск объектов">
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
                <span className="hr-search-bar__value">{field.display}</span>
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
    </div>
  )
}

function StrategiesSection({ onNavigate }) {
  return (
    <section className="hr-section hr-section--black hr-strategies" aria-labelledby="hr-strategies-title">
      <div className="hr-container hr-strategies__inner">
        <div className="hr-strategies__copy">
          <h2 id="hr-strategies-title" className="hr-strategies__title">
            Стратегии инвестирования
          </h2>
          <p className="hr-strategies__lead">
            Четыре формата вложений в недвижимость — от открытых торгов до долговых инструментов.
          </p>
        </div>

        <div className="hr-strategies__cards" role="list">
          {STRATEGIES.map((item) => {
            const Icon = item.icon
            return (
              <article
                key={item.id}
                className="hr-strategy-stat-card"
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
                <span className="hr-strategy-stat-card__icon" aria-hidden>
                  <Icon />
                </span>
                <div className="hr-strategy-stat-card__content">
                  <h3 className="hr-strategy-stat-card__headline">{item.headline}</h3>
                  <p className="hr-strategy-stat-card__text">{item.text}</p>
                </div>
              </article>
            )
          })}
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
              <div className="hr-hero-overlays">
                <HeroVisualCopy onNavigate={navigate} />
                <HeroRoleCards onNavigate={navigate} />
              </div>
            </div>
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
