import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiArrowRight,
  FiChevronDown,
  FiDollarSign,
  FiFileText,
  FiHome,
  FiMapPin,
  FiPieChart,
  FiSearch,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi'
import { FaBuilding, FaCoins, FaGavel, FaHome } from 'react-icons/fa'
import Header from '../components/Header'
import InvestorHomeShowcases from '../components/InvestorHomeShowcases'
import InvestorCommunitySection from '../components/InvestorCommunitySection'
import InvestorFooter from '../components/InvestorFooter'
import InvestorQuestionsSection from '../components/InvestorQuestionsSection'
import { InvestHeroStatGlassCard } from '../components/InvestHeroStatGlassCard'
import './InvestorHomePage.css'

const images = {
  hero: '/images/sellyourbrick/about/about-hero-villa.jpg',
  auction: '/images/external/photo-1512917774080-9991f1c4c750-82ecd9c8d5.jpg',
  buyNow: '/images/sellyourbrick/about/about-category-buynow.jpg',
  shares: '/images/sellyourbrick/about/about-category-shares.jpg',
  debts: '/images/external/photo-1600585154340-be6161a56a0c-753fb8cc27.jpg',
  plant: '/images/new-home/new-home-newsletter.png',
}

const heroCtaCards = [
  {
    variant: 'investor',
    icon: FiTrendingUp,
    title: 'Стать инвестором',
    text: 'Пройдите верификацию и получите доступ к активам с доходностью от 12% до 25% и аналитике рынка.',
    buttonLabel: 'Начать',
    to: '/auction',
  },
  {
    variant: 'seller',
    icon: FiHome,
    title: 'Стать продавцом',
    text: 'Узнайте, сколько верифицированных инвесторов готовы бороться за ваш объект прямо сейчас.',
    buttonLabel: 'Разместить объект',
    to: '/add-property',
  },
]

const strategies = [
  {
    id: 'auction',
    title: 'Аукцион',
    text: 'Находите скрытые возможности и приобретайте объекты по лучшей цене.',
    image: images.auction,
    to: '/auction?filter=auction',
  },
  {
    id: 'buy_now',
    title: 'Купить сейчас',
    text: 'Готовые объекты по фиксированной цене без торгов.',
    image: images.buyNow,
    to: '/auction?filter=buy_now',
  },
  {
    id: 'shares',
    title: 'Доли',
    text: 'Инвестируйте в доли крупных объектов от минимальных сумм.',
    image: images.shares,
    to: '/shares',
  },
  {
    id: 'debts',
    title: 'Долги',
    text: 'Инвестируйте в долговые инструменты под залог недвижимости.',
    image: images.debts,
    to: '/debts',
  },
]

const strategyTabs = [
  { id: 'all', label: 'Все' },
  { id: 'auction', label: 'Аукцион' },
  { id: 'buy_now', label: 'Купить сейчас' },
  { id: 'shares', label: 'Доли' },
  { id: 'debts', label: 'Долги' },
]

const trustStats = [
  { value: '10,000+', label: 'Активных инвесторов', icon: FiUsers },
  { value: '$250M+', label: 'Общий объем инвестиций', icon: FaCoins },
  { value: '12.4%', label: 'Средняя годовая доходность', icon: FiFileText },
  { value: '500+', label: 'Доступных объектов', icon: FaBuilding },
]

const filters = {
  countries: ['Выберите страну', 'США', 'ОАЭ', 'Германия', 'Испания'],
  types: ['Любой тип', 'Вилла', 'Апартаменты', 'Коммерция'],
  strategies: ['Любая стратегия', 'Аукцион', 'Купить сейчас', 'Доли', 'Долги'],
  prices: ['Любая цена', 'до $50 000', 'до $100 000', 'до $250 000', 'до $500 000', 'до $1M', 'до $5M+'],
  yields: ['Любая доходность', 'от 5%', 'от 8%', 'от 10%', 'от 12%', 'от 15%+'],
}

function FilterChip({ label, value, options, onChange, icon: Icon }) {
  const isActive = value !== options[0]

  return (
    <label className={`invest-filter__chip${isActive ? ' invest-filter__chip--active' : ''}`}>
      <span className="invest-filter__chip-icon" aria-hidden>
        <Icon size={14} />
      </span>
      <span className="invest-filter__chip-text">
        <span className="invest-filter__chip-sub">{label}</span>
        <span className="invest-filter__chip-value">{value}</span>
      </span>
      <select
        className="invest-filter__chip-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <FiChevronDown className="invest-filter__chip-chevron" aria-hidden />
    </label>
  )
}

function InvestorHomePage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [country, setCountry] = useState(filters.countries[0])
  const [type, setType] = useState(filters.types[0])
  const [strategy, setStrategy] = useState(filters.strategies[0])
  const [price, setPrice] = useState(filters.prices[0])
  const [yieldValue, setYieldValue] = useState(filters.yields[0])
  const [activeStrategyTab, setActiveStrategyTab] = useState('all')

  const selectedSummary = useMemo(() => {
    return [country, type, strategy].filter((item) => !item.startsWith('Выберите') && !item.startsWith('Люб')).join(', ')
  }, [country, type, strategy])

  const handleSearch = () => {
    navigate('/auction')
  }

  return (
    <div className="invest-home-page">
      <Header />
      <main className="invest-home">
      <section className="invest-hero" aria-label="Sell Your Brick investment platform">
        <img className="invest-hero__image" src={images.hero} alt="Современная вилла с бассейном" />
        <div className="invest-hero__veil" aria-hidden />

        <div className="invest-shell invest-hero__content">
          <div className="invest-hero__copy">
            <h1>SellYourBrick</h1>
            <p>
              Инвестиционная платформа для покупки недвижимости ниже рынка. Конвертируйте активы
              в капитал за короткий срок или инвестируйте в верифицированную доходность
            </p>
            <div className="invest-hero__actions">
              <button className="invest-button invest-button--primary" type="button" onClick={() => navigate('/auction')}>
                <span>Смотреть объекты</span>
                <span className="invest-button__icon" aria-hidden>
                  <FiArrowRight size={18} />
                </span>
              </button>
              <button className="invest-button invest-button--ghost" type="button" onClick={() => navigate('/sections')}>
                Все разделы
              </button>
            </div>
          </div>

          <div className="invest-hero__stats" aria-label="Быстрые действия">
            {heroCtaCards.map((card) => (
              <InvestHeroStatGlassCard
                key={card.variant}
                variant={card.variant}
                icon={card.icon}
                title={card.title}
                text={card.text}
                buttonLabel={card.buttonLabel}
                onClick={() => navigate(card.to)}
              />
            ))}
          </div>

          <form
            className="invest-filter"
            onSubmit={(event) => {
              event.preventDefault()
              handleSearch()
            }}
          >
            <div className="invest-filter__top">
              <label className="invest-filter__field">
                <FiSearch className="invest-filter__field-icon" size={18} aria-hidden />
                <input
                  type="search"
                  className="invest-filter__input"
                  placeholder="Поиск по названию или адресу..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>
              <button className="invest-search-button" type="submit">
                Найти
              </button>
            </div>

            <div className="invest-filter__filters-row" role="group" aria-label="Фильтры поиска">
              <FilterChip
                label="Страна"
                value={country}
                options={filters.countries}
                onChange={setCountry}
                icon={FiMapPin}
              />
              <FilterChip
                label="Тип"
                value={type}
                options={filters.types}
                onChange={setType}
                icon={FaHome}
              />
              <FilterChip
                label="Стратегия"
                value={strategy}
                options={filters.strategies}
                onChange={setStrategy}
                icon={FaGavel}
              />
              <FilterChip
                label="Цена"
                value={price}
                options={filters.prices}
                onChange={setPrice}
                icon={FiDollarSign}
              />
              <FilterChip
                label="Доходность"
                value={yieldValue}
                options={filters.yields}
                onChange={setYieldValue}
                icon={FiPieChart}
              />
            </div>
          </form>

        </div>
      </section>

      <section className="invest-trust" aria-label="Ключевые показатели платформы">
        <img src={images.hero} alt="" aria-hidden />
        <div className="invest-trust__overlay" aria-hidden />
        {trustStats.map(({ value, label, icon: Icon }) => (
          <div className="invest-trust__item" key={label}>
            <Icon aria-hidden />
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="invest-section invest-section--strategies" id="strategy">
        <div className="invest-shell">
          <header className="invest-section__center">
            <h2>Стратегии инвестирования</h2>
            <p>Выберите подходящий способ вложений и достигайте своих финансовых целей</p>
          </header>

          <div className="invest-strategy-grid">
            {strategies.map((item) => (
              <article className="invest-strategy-card" key={item.id} onClick={() => navigate(item.to)}>
                <img src={item.image} alt="" />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <button type="button">
                    Подробнее <FiArrowRight aria-hidden />
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="invest-strategy-tabs" role="tablist" aria-label="Фильтр стратегий">
            {strategyTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                className={`invest-strategy-tabs__item${activeStrategyTab === tab.id ? ' is-active' : ''}`}
                aria-selected={activeStrategyTab === tab.id}
                onClick={() => setActiveStrategyTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <InvestorHomeShowcases activeStrategyTab={activeStrategyTab} />

      <InvestorCommunitySection />

      <InvestorQuestionsSection />

      <div className="invest-floating-summary" aria-live="polite">
        <FiMapPin aria-hidden />
        {selectedSummary || 'Любая страна, любой тип, любая стратегия'}
        {!price.startsWith('Любая') ? <span><FiDollarSign aria-hidden /> {price}</span> : null}
        {!yieldValue.startsWith('Любая') ? <span><FiPieChart aria-hidden /> {yieldValue}</span> : null}
      </div>
      </main>
      <InvestorFooter />
    </div>
  )
}

export default InvestorHomePage
