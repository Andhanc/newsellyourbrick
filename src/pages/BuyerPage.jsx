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
  FiStar,
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi'
import { Link } from 'react-router-dom'
import BuyerMapScene from '@/components/BuyerMapScene'
import { SiteBrandIcon } from '@/components/SiteBrandLogo'
import { publicAsset } from '@/utils/publicAsset'
import './BuyerPage.css'

const navItems = [
  ['Карта', 'buyer-map'],
  ['Преимущества', 'buyer-benefits'],
  ['Подписка', 'buyer-plans'],
]

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
    name: 'Start',
    price: '4 990 ₽',
    subtitle: 'Для первого отбора объектов',
    height: 'short',
    features: ['Каталог и карта объектов', 'Базовые фильтры', 'Расчет доходности', 'Еженедельный обзор'],
  },
  {
    name: 'Pro',
    price: '9 990 ₽',
    subtitle: 'Лучший выбор для активного покупателя',
    height: 'medium',
    badge: 'Выбор покупателей',
    features: ['Все возможности Start', 'Ранний доступ к объектам', 'Сравнение сценариев', 'Расширенная аналитика', 'Уведомления о новых лотах'],
  },
  {
    name: 'Private',
    price: '19 990 ₽',
    subtitle: 'Для персонального подбора',
    height: 'tall',
    features: ['Все возможности Pro', 'Персональный менеджер', 'Закрытые предложения', 'Юридический чек-лист', 'Индивидуальные подборки'],
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
    <main className="buyer-page" aria-label="Информационная страница покупателя SellYourBrick">
      <header className="buyer-nav">
        <div className="buyer-nav__inner">
          <Link className="buyer-brand" to="/" aria-label="SellYourBrick">
            <SiteBrandIcon />
            <span>SellYourBrick</span>
          </Link>
          <nav className="buyer-nav__links" aria-label="Навигация по странице">
            {navItems.map(([label, id]) => (
              <button type="button" key={label} onClick={() => scrollTo(id)}>
                {label}
              </button>
            ))}
          </nav>
          <button type="button" className="buyer-pill-button buyer-nav__cta" onClick={() => setModalTitle('Стать покупателем')}>
            Стать покупателем
          </button>
        </div>
      </header>

      <section className="buyer-hero-viewport" id="buyer-map">
        <div className="buyer-container buyer-hero__head">
          <h1>
            Покупайте недвижимость
            <span>и растите свое будущее</span>
          </h1>
        </div>

        <BuyerMapScene
          onPinClick={(label) => setModalTitle(`Объекты: ${label}`)}
          onCardClick={(title) => setModalTitle(title)}
        />

        <div className="buyer-stats" aria-label="Цифры платформы">
          {platformStats.map((stat) => (
            <article className="buyer-stat" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="buyer-service-section" aria-labelledby="buyer-service-title">
        <div className="buyer-container buyer-service">
          <div className="buyer-service__copy">
            <span>Reason to choose us</span>
            <h2 id="buyer-service-title">Ценность умной покупки недвижимости</h2>
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
        <div className="buyer-container buyer-benefits">
          <span className="buyer-eyebrow buyer-eyebrow--dark">
            <FiStar aria-hidden />
            Features
          </span>
          <h2 id="buyer-benefits-title">Что получает покупатель на платформе</h2>
          <div className="buyer-benefits__grid">
            {benefits.map(({ Icon, title, text }) => (
              <article className="buyer-benefit-card" key={title}>
                <span>
                  <Icon aria-hidden />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
                <button type="button" onClick={() => setModalTitle(title)}>
                  Узнать больше
                  <FiArrowRight aria-hidden />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="buyer-showcase-section" aria-labelledby="buyer-showcase-title">
        <div className="buyer-container buyer-showcase">
          <div className="buyer-showcase__copy">
            <h2 id="buyer-showcase-title">
              Как покупать
              <span>недвижимость</span>
              <span>в SellYourBrick</span>
            </h2>
            <p>
              Забудьте о хаотичном поиске и десятках созвонов без цифр. Умные подборки дают покупателю понятный маршрут от интереса до сделки.
            </p>
            <button type="button" className="buyer-dark-button" onClick={() => scrollTo('buyer-plans')}>
              Узнать больше
            </button>
          </div>

          <div className="buyer-showcase__panel">
            <svg className="buyer-showcase__blob" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id="buyer-showcase-blob-fill" x1="4%" y1="18%" x2="96%" y2="82%">
                  <stop offset="0%" stopColor="#00b8cc" />
                  <stop offset="52%" stopColor="#0099aa" />
                  <stop offset="100%" stopColor="#007f8f" />
                </linearGradient>
              </defs>
              <g className="buyer-showcase__blob-shadow" transform="translate(10 14)">
                <path d="M-30 168C70 108 170 228 270 148C370 68 470 208 570 138C670 68 770 198 870 128C940 78 1010 168 1040 148L1040 292C940 352 840 262 740 312C640 362 540 272 440 322C340 372 240 282 140 332C70 372 0 302 -30 272Z" />
              </g>
              <path
                className="buyer-showcase__blob-main"
                d="M-40 152C55 92 165 212 260 132C355 52 455 192 555 122C655 52 755 182 855 112C935 62 1005 152 1035 132L1035 276C935 336 835 246 735 296C635 346 535 256 435 306C335 356 235 266 135 316C65 356 -5 286 -40 256Z"
              />
            </svg>
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
  )
}
