import { useMemo, useState } from 'react'
import {
  FiBell,
  FiCheck,
  FiClock,
  FiCreditCard,
  FiFileText,
  FiGrid,
  FiHeart,
  FiHome,
  FiSearch,
  FiSettings,
  FiShield,
  FiUser,
} from 'react-icons/fi'
import { publicAsset } from '@/utils/publicAsset'
import './BuyerPage.css'

const stats = [
  { value: '€127M', label: 'инвестировано' },
  { value: '4 832', label: 'инвестора' },
  { value: '842', label: 'объекта' },
  { value: '12.7%', label: 'средняя доходность' },
]

const advantages = [
  {
    title: 'Проверенные объекты',
    text: 'Каждый лот проходит юридическую и документальную проверку',
  },
  {
    title: 'Прозрачные аукционы',
    text: 'Полная история ставок и честная рыночная цена',
  },
  {
    title: 'Несколько форматов покупки',
    text: 'Аукционы, купить сейчас, доли, долговые активы и тест-драйв',
  },
  {
    title: 'Международный охват',
    text: 'Кипр, Испания, ОАЭ, Италия, Прибалтика и другие страны',
  },
]

const productCards = [
  {
    title: 'Аукционы',
    text: 'Участвуйте в торгах, конкуренция формирует цену',
    pill: '124 активных',
    image: 'images/sellyourbrick/about/about-category-auction.jpg',
  },
  {
    title: 'Купить сейчас',
    text: 'Фиксированная цена без ожидания торгов',
    pill: '312 объектов',
    image: 'images/sellyourbrick/about/about-category-buynow.jpg',
  },
  {
    title: 'Доли',
    text: 'Дробная собственность от €10 000',
    pill: '206 предложений',
    image: 'images/sellyourbrick/about/about-category-shares.jpg',
  },
  {
    title: 'Долговые активы',
    text: 'Объекты с обременениями по фиксированной цене',
    pill: '156 активных',
    image: 'images/sellyourbrick/about/about-category-debts.jpg',
  },
]

const steps = [
  ['01', 'Регистрация', 'Бесплатный аккаунт за 2 минуты'],
  ['02', 'Верификация', 'Паспорт / KYC для участия в аукционах'],
  ['03', 'Пополнение депозита', 'Депозит для ставок и бронирования'],
  ['04', 'Покупка', 'Выбор формата и заключение сделки с сопровождением'],
]

const navItems = [
  [FiHome, 'Главная'],
  [FiHeart, 'Избранное'],
  [FiGrid, 'Объекты'],
  [FiFileText, 'Аукционы'],
  [FiClock, 'Доли'],
  [FiCreditCard, 'Депозиты'],
  [FiSettings, 'Настройки'],
]

const recommended = [
  {
    price: '€450 000',
    title: 'Лимассол, Кипр',
    yieldText: 'Доходность 12.3%',
    image: 'images/sellyourbrick/about/about-category-auction.jpg',
  },
  {
    price: '€680 000',
    title: 'Марбелья, Испания',
    yieldText: 'Доходность 14.1%',
    image: 'images/sellyourbrick/about/mission-villa.jpg',
  },
  {
    price: '€120 000',
    title: 'Дубай, ОАЭ',
    yieldText: 'Доходность 13.7%',
    image: 'images/sellyourbrick/about/about-category-shares.jpg',
  },
]

const quickTiles = [
  [FiHeart, 'Избранное', 'Сохраняйте и сравнивайте лучшие объекты'],
  [FiFileText, 'История', 'Покупки, ставки и бронирования'],
  [FiCreditCard, 'Депозит и подписки', 'Управляйте балансом и обращайтесь к менеджеру'],
]

const plans = [
  {
    name: 'Starter',
    price: '€0',
    features: ['Доступ к объектам', 'Участие в аукционах', 'Базовая поддержка'],
    cta: 'Начать бесплатно',
  },
  {
    name: 'Pro',
    price: '€29',
    badge: 'Лучший выбор',
    featured: true,
    features: ['Все из Starter', 'Расширенная аналитика', 'AI-рекомендации', 'Персональный менеджер'],
    cta: 'Выбрать Pro',
  },
  {
    name: 'VIP',
    price: '€99',
    features: ['Все из Pro', 'Приоритетная поддержка', 'Индивидуальная подборка', 'Закрытые предложения'],
    cta: 'Выбрать VIP',
  },
]

export default function BuyerPage() {
  const [modalTitle, setModalTitle] = useState('')

  const heroStyle = useMemo(
    () => ({
      backgroundImage: `linear-gradient(90deg, rgba(14, 27, 34, 0.82) 0%, rgba(14, 27, 34, 0.54) 37%, rgba(14, 27, 34, 0.08) 70%), url(${publicAsset(
        'images/sellyourbrick/about/mission-villa.jpg',
      )})`,
    }),
    [],
  )

  const openModal = (title) => setModalTitle(title)

  return (
    <main className="buyer-page" aria-label="Страница покупателя SellYourBrick">
      <section className="buyer-hero buyer-screen" style={heroStyle}>
        <div className="buyer-hero__content">
          <p className="buyer-kicker">для покупателей</p>
          <h1>Покупайте недвижимость ниже рынка — прозрачно и с сопровождением</h1>
          <p className="buyer-hero__lead">
            Аукционы, доли, долговые активы и прямые сделки на одной международной платформе.
          </p>
          <div className="buyer-actions">
            <button type="button" className="buyer-btn buyer-btn--primary" onClick={() => openModal('Регистрация покупателя')}>
              Начать бесплатно
            </button>
            <button
              type="button"
              className="buyer-btn buyer-btn--ghost"
              onClick={() => document.getElementById('buyer-process')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Как это работает?
            </button>
          </div>
        </div>
      </section>

      <section className="buyer-stats" aria-label="Ключевые показатели">
        {stats.map((item) => (
          <div className="buyer-stats__item" key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <section className="buyer-benefits buyer-screen">
        <div className="buyer-benefits__grid">
          <div className="buyer-benefits__copy">
            <p className="buyer-kicker">почему sellyourbrick</p>
            <h2>Преимущества, которые важны инвестору</h2>
            <div className="buyer-advantage-list">
              {advantages.map((item) => (
                <article className="buyer-advantage" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
          <img
            className="buyer-benefits__image"
            src={publicAsset('images/sellyourbrick/about/about-hero-villa.jpg')}
            alt="Современная вилла на побережье"
          />
        </div>

        <div className="buyer-product-grid">
          {productCards.map((card) => (
            <button type="button" className="buyer-product-card" key={card.title} onClick={() => openModal(card.title)}>
              <img src={publicAsset(card.image)} alt="" />
              <span className="buyer-product-card__body">
                <strong>{card.title}</strong>
                <span>{card.text}</span>
                <em>{card.pill}</em>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="buyer-process buyer-screen" id="buyer-process">
        <div className="buyer-process__steps">
          <p className="buyer-kicker">как это работает</p>
          <h2>Простой путь к вашей инвестиции</h2>
          <div className="buyer-step-list">
            {steps.map(([number, title, text]) => (
              <article className="buyer-step" key={number}>
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="buyer-dashboard" aria-label="Макет кабинета покупателя">
          <aside className="buyer-dashboard__sidebar">
            <div className="buyer-dashboard__brand">
              <FiShield aria-hidden />
              <strong>SellYourBrick</strong>
            </div>
            {navItems.map(([Icon, label], index) => (
              <button className={index === 0 ? 'is-active' : ''} type="button" key={label}>
                <Icon aria-hidden />
                {label}
              </button>
            ))}
          </aside>

          <div className="buyer-dashboard__main">
            <header className="buyer-dashboard__topbar">
              <div>
                <strong>Добро пожаловать, Иван</strong>
                <span>Покупатель</span>
              </div>
              <div className="buyer-dashboard__icons">
                <FiSearch aria-hidden />
                <FiBell aria-hidden />
                <FiUser aria-hidden />
              </div>
            </header>

            <div className="buyer-dashboard__summary">
              <div className="buyer-profile-card">
                <img src={publicAsset('images/external/photo-1507003211169-0a1dd7228f2d-94d7ce3808.jpg')} alt="" />
                <div>
                  <strong>Иван Петров</strong>
                  <span>ivan.petrov@example.com</span>
                  <em>Верифицирован</em>
                </div>
              </div>
              <div className="buyer-balance-card">
                <span>Баланс депозита</span>
                <strong>€25 000</strong>
                <button type="button" onClick={() => openModal('Пополнить депозит')}>
                  Пополнить депозит
                </button>
              </div>
            </div>

            <h3 className="buyer-dashboard__section-title">Рекомендуемые объекты</h3>
            <div className="buyer-recommendations">
              {recommended.map((item) => (
                <article className="buyer-rec-card" key={item.title}>
                  <img src={publicAsset(item.image)} alt="" />
                  <strong>{item.price}</strong>
                  <span>{item.title}</span>
                  <em>{item.yieldText}</em>
                </article>
              ))}
            </div>

            <div className="buyer-quick-grid">
              {quickTiles.map(([Icon, title, text]) => (
                <article className="buyer-quick-tile" key={title}>
                  <Icon aria-hidden />
                  <div>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="buyer-pricing buyer-screen">
        <div className="buyer-plan-grid">
          {plans.map((plan) => (
            <article className={`buyer-plan${plan.featured ? ' buyer-plan--featured' : ''}`} key={plan.name}>
              {plan.badge && <span className="buyer-plan__badge">{plan.badge}</span>}
              <h3>{plan.name}</h3>
              <div className="buyer-plan__price">
                <strong>{plan.price}</strong>
                <span>/ мес</span>
              </div>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <FiCheck aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              <button type="button" className={plan.featured ? 'buyer-btn buyer-btn--primary' : 'buyer-btn buyer-btn--outline'} onClick={() => openModal(`Тариф ${plan.name}`)}>
                {plan.cta}
              </button>
            </article>
          ))}
        </div>

        <div className="buyer-final-cta">
          <div className="buyer-final-cta__copy">
            <p className="buyer-kicker">готовы к новым возможностям?</p>
            <h2>Начните инвестировать уже сегодня</h2>
            <p>Создайте бесплатный аккаунт, получите доступ к лучшим объектам и персональной поддержке.</p>
            <div className="buyer-actions">
              <button type="button" className="buyer-btn buyer-btn--primary" onClick={() => openModal('Регистрация покупателя')}>
                Зарегистрироваться
              </button>
              <button type="button" className="buyer-btn buyer-btn--outline" onClick={() => openModal('Смотреть объекты')}>
                Смотреть объекты
              </button>
            </div>
          </div>
          <img src={publicAsset('images/sellyourbrick/about/about-hero-villa.jpg')} alt="Терраса виллы с видом на море" />
        </div>
      </section>

      {modalTitle && (
        <div className="buyer-modal" role="dialog" aria-modal="true" aria-labelledby="buyer-modal-title">
          <button className="buyer-modal__scrim" type="button" aria-label="Закрыть" onClick={() => setModalTitle('')} />
          <div className="buyer-modal__panel">
            <p className="buyer-modal__eyebrow">SellYourBrick</p>
            <h2 id="buyer-modal-title">{modalTitle}</h2>
            <p>Прототип готов к подключению реального сценария: регистрация, каталог, депозит или тариф.</p>
            <button type="button" className="buyer-modal__button" onClick={() => setModalTitle('')}>
              Понятно
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
