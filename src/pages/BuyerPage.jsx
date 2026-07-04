import { useMemo, useState } from 'react'
import {
  FiArrowRight,
  FiBarChart2,
  FiBell,
  FiCheck,
  FiCreditCard,
  FiCrosshair,
  FiEdit3,
  FiGlobe,
  FiGrid,
  FiLayers,
  FiLock,
  FiSearch,
  FiShield,
  FiSliders,
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi'
import BuyerMapScene from '@/components/BuyerMapScene'
import Header from '@/components/Header'
import { publicAsset } from '@/utils/publicAsset'
import './BuyerPage.css'
import './SellerPage.css'

const platformStats = [
  { value: '$1B+', label: 'сделок на платформе' },
  { value: '20K+', label: 'покупателей' },
  { value: '150K+', label: 'объектов в базе' },
  { value: '8-12%', label: 'средняя доходность' },
]

const serviceCards = [
  {
    Icon: FiSearch,
    title: 'Smart Suggestions',
    text: 'AI подбирает объекты под ваш бюджет, срок и допустимый риск.',
  },
  {
    Icon: FiShield,
    title: '99% Trusted Investor',
    text: 'Проверяем документы, продавца, спрос и прозрачность сделки.',
  },
  {
    Icon: FiCrosshair,
    title: 'Invest Where it Matters',
    text: 'Показываем зоны с высоким спросом и ростом цены.',
    wide: true,
  },
]

const benefits = [
  {
    Icon: FiGlobe,
    title: 'Глобальный доступ',
    text: 'Смотрите международные объекты, закрытые предложения и локации роста в одном кабинете.',
  },
  {
    Icon: FiZap,
    title: 'Быстрые решения',
    text: 'Сравнивайте доходность, риски и ликвидность без ручных таблиц и долгих созвонов.',
  },
  {
    Icon: FiLock,
    title: 'Прозрачная покупка',
    text: 'Каждый объект проходит проверку документов, продавца, истории цены и спроса.',
  },
]

const showcaseCards = [
  {
    Icon: FiLayers,
    title: 'Начните с умных шаблонов подбора',
    text: 'Больше не нужно собирать объекты вручную. Мы наполнили платформу готовыми сценариями покупки под разные цели.',
  },
  {
    Icon: FiZap,
    title: 'Меняйте критерии — подбор адаптируется сам',
    text: 'Идеальный инструмент покупателя должен думать за вас. Наш подбор перестраивается под бюджет, срок и риск.',
  },
  {
    Icon: FiEdit3,
    title: 'Оставайтесь в едином стандарте проверки',
    text: 'Каждый объект проходит одинаковый чек-лист: документы, продавец, спрос и прозрачность сделки.',
  },
  {
    Icon: FiSliders,
    title: 'Редактируйте сценарий простыми контролами',
    text: 'Пара кликов — и вы меняете фильтры, доходность или срок. Сравнение объектов остаётся наглядным и быстрым.',
  },
]

const plans = [
  {
    name: 'Starter',
    price: '€0',
    subtitle: 'Быстрый старт',
    height: 'short',
    features: ['Аукцион', 'Покупка недвижимости', 'AI-помощник'],
  },
  {
    name: 'Pro',
    price: '€149',
    subtitle: 'Больше функций, аналитика и персональный менеджер',
    height: 'medium',
    badge: 'Выбор покупателей',
    features: ['Все возможности Starter', 'Аналитика', 'Калькулятор', 'Персональный менеджер'],
  },
  {
    name: 'VIP',
    price: '€499',
    subtitle: 'Максимум функций и приоритет на каждом этапе',
    height: 'tall',
    features: ['Все возможности Pro', 'Приоритет в аукционах', 'VIP-менеджер', 'Закрытые лоты'],
  },
]

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function BuyerPage() {
  const [selectedPlan, setSelectedPlan] = useState('Pro')
  const [modalTitle, setModalTitle] = useState('')

  const selectedPlanData = useMemo(
    () => plans.find((plan) => plan.name === selectedPlan) ?? plans[1],
    [selectedPlan],
  )

  return (
    <>
      <Header />
      <main className="buyer-page" aria-label="Информационная страница покупателя SellYourBrick">
      <section className="buyer-hero-viewport" id="buyer-map">
        <div className="buyer-hero__stage-wrap">
          <div className="buyer-hero__stage">
            <BuyerMapScene
              onCardClick={(title) => setModalTitle(title)}
            />
          </div>

          <div className="buyer-stats" aria-label="Цифры платформы">
            {platformStats.map((stat) => (
              <article className="buyer-stat" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="buyer-hero__head">
          <h1>Покупайте объект легко!</h1>
          <p className="buyer-hero__lead">
            Подбор под бюджет и цель, доходность и проверка на карте — без хаоса в поиске.
          </p>
        </div>
      </section>

      <section className="buyer-service-section" aria-labelledby="buyer-service-title">
        <div className="buyer-container buyer-service">
          <div className="buyer-service__copy">
            <span>Reason to choose us</span>
            <h2 id="buyer-service-title">
              Ценность умной покупки
            </h2>
            <p>
              Мы берем на себя тяжелую работу: проверяем объект, считаем доходность, сравниваем сценарии и показываем покупателю только сильные варианты.
            </p>
            <button type="button" className="buyer-dark-button" onClick={() => scrollTo('buyer-benefits')}>
              Найти лучший объект
              <FiArrowRight aria-hidden />
            </button>
          </div>

          <div className="buyer-service__cards">
            {serviceCards.map(({ Icon, title, text, wide }) => (
              <article className={wide ? 'buyer-mini-card buyer-mini-card--wide' : 'buyer-mini-card'} key={title}>
                <span className="buyer-mini-card__icon">
                  <Icon aria-hidden />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="buyer-benefits-wrap" id="buyer-benefits" aria-labelledby="buyer-benefits-title">
        <section className="seller-features">
          <img
            className="seller-features__bg"
            src={publicAsset('images/seller-page/seller-feature-bg.png')}
            alt=""
            loading="lazy"
            decoding="async"
          />
          <div className="seller-features__content">
            <h2 id="buyer-benefits-title">
              Что получает покупатель
              <span>на платформе</span>
            </h2>
            <div className="seller-features__grid">
              {benefits.map(({ Icon, title, text }) => (
                <article className="seller-feature-card" key={title}>
                  <span className="seller-feature-card__icon">
                    <Icon aria-hidden />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <button type="button" className="seller-feature-card__link" onClick={() => setModalTitle(title)}>
                    Узнать больше
                    <FiArrowRight aria-hidden />
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>

      <section className="buyer-showcase-section" aria-labelledby="buyer-showcase-title">
        <div className="buyer-container buyer-showcase">
          <div className="buyer-showcase__copy">
            <h2 id="buyer-showcase-title">
              Как покупать
              <span>недвижимость</span>
              <span className="buyer-showcase__title-line">в SellYourBrick</span>
            </h2>
            <p>
              Забудьте о хаотичном поиске и десятках созвонов без цифр. Умные подборки дают покупателю понятный маршрут от интереса до сделки.
            </p>
            <button type="button" className="buyer-dark-button" onClick={() => scrollTo('buyer-plans')}>
              Узнать больше
            </button>
          </div>

          <div className="buyer-showcase__panel">
            <div className="buyer-showcase__grid">
              {showcaseCards.map(({ Icon, title, text }) => (
                <article className="buyer-showcase-card" key={title}>
                  <span className="buyer-showcase-card__icon">
                    <Icon aria-hidden />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="buyer-plans" id="buyer-plans" aria-labelledby="buyer-plans-title">
        <img className="buyer-plans__bg" src={publicAsset('images/test-drive/hero-resort.png')} alt="" aria-hidden />
        <div className="buyer-container buyer-plans__content">
          <h2 id="buyer-plans-title">Оформите подписку и покупайте раньше рынка</h2>
          <p>
            Выберите тариф, чтобы видеть больше данных, получать персональные подборки и быстрее забирать лучшие объекты.
          </p>

          <div className="buyer-plan-grid" aria-label="Тарифы подписки">
            {plans.map((plan) => (
              <article
                className={`buyer-plan buyer-plan--${plan.height}${selectedPlan === plan.name ? ' is-selected' : ''}`}
                key={plan.name}
              >
                {plan.badge && <span className="buyer-plan__badge">{plan.badge}</span>}
                <h3>{plan.name}</h3>
                <p>{plan.subtitle}</p>
                <strong>{plan.price}</strong>
                <span className="buyer-plan__period">в месяц</span>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <FiCheck aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={selectedPlan === plan.name ? 'buyer-plan__button is-selected' : 'buyer-plan__button'}
                  onClick={() => setSelectedPlan(plan.name)}
                >
                  Выбрать
                  <FiArrowRight aria-hidden />
                </button>
              </article>
            ))}
          </div>

          <div className="buyer-subscribe-panel">
            <div>
              <span>Выбран тариф</span>
              <strong>{selectedPlanData.name}</strong>
              <p>{selectedPlanData.subtitle}</p>
            </div>
            <button type="button" onClick={() => setModalTitle(`Оформить ${selectedPlanData.name}`)}>
              <FiCreditCard aria-hidden />
              Оформить подписку
            </button>
          </div>
        </div>
      </section>

      {modalTitle && (
        <div className="buyer-modal" role="dialog" aria-modal="true" aria-labelledby="buyer-modal-title">
          <button className="buyer-modal__scrim" type="button" aria-label="Закрыть" onClick={() => setModalTitle('')} />
          <div className="buyer-modal__panel">
            <p>SellYourBrick</p>
            <h2 id="buyer-modal-title">{modalTitle}</h2>
            <span>Здесь подключим реальный сценарий: каталог, консультацию, просмотр объекта или оплату подписки.</span>
            <button type="button" className="buyer-pill-button" onClick={() => setModalTitle('')}>
              Понятно
            </button>
          </div>
        </div>
      )}
    </main>
    </>
  )
}
