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
    textShort: 'Мировые объекты и закрытые лоты в одном кабинете.',
  },
  {
    Icon: FiZap,
    title: 'Быстрые решения',
    text: 'Сравнивайте доходность, риски и ликвидность без ручных таблиц и долгих созвонов.',
    textShort: 'Сравнивайте доходность и риски без созвонов.',
  },
  {
    Icon: FiLock,
    title: 'Прозрачная покупка',
    text: 'Каждый объект проходит проверку документов, продавца, истории цены и спроса.',
    textShort: 'Проверка документов, продавца и цены.',
  },
]

const showcaseCards = [
  {
    Icon: FiLayers,
    title: 'Начните с умных шаблонов подбора',
    titleShort: 'Умные шаблоны',
    text: 'Не нужно собирать объекты вручную — платформа предлагает готовые сценарии покупки под разные цели.',
    textShort: 'Готовые сценарии покупки без ручного поиска.',
  },
  {
    Icon: FiZap,
    title: 'Меняйте критерии — подбор адаптируется сам',
    titleShort: 'Гибкий подбор',
    text: 'Подбор перестраивается под ваш бюджет, срок и допустимый риск — без таблиц и долгих созвонов.',
    textShort: 'Подбор подстраивается под бюджет, срок и риск.',
  },
  {
    Icon: FiEdit3,
    title: 'Оставайтесь в едином стандарте проверки',
    titleShort: 'Единая проверка',
    text: 'Каждый объект проходит один чек-лист: документы, продавец, спрос и прозрачность сделки.',
    textShort: 'Один чек-лист: документы, продавец, спрос.',
  },
  {
    Icon: FiSliders,
    title: 'Редактируйте сценарий простыми контролами',
    titleShort: 'Простые контролы',
    text: 'Пара кликов — и вы меняете фильтры, доходность или срок. Сравнение объектов остаётся наглядным.',
    textShort: 'Фильтры и срок меняются в пару кликов.',
  },
]

const plans = [
  {
    name: 'Starter',
    eyebrow: 'Базовый',
    price: '€0',
    oldPrice: '€29',
    discount: '−100%',
    saving: 'Бесплатно вместо €29',
    subtitle: 'Быстрый старт',
    subtitleShort: 'Быстрый старт',
    height: 'short',
    features: ['Аукцион', 'Покупка недвижимости', 'AI-помощник'],
    featuresShort: ['Аукцион', 'Покупка', 'AI-помощник'],
  },
  {
    name: 'Pro',
    eyebrow: 'Рекомендуем',
    price: '€149',
    oldPrice: '€199',
    discount: '−25%',
    saving: 'Экономия €50 в месяц',
    subtitle: 'Больше функций, аналитика и персональный менеджер',
    subtitleShort: 'Аналитика и менеджер',
    height: 'medium',
    badge: 'Выбор покупателей',
    features: ['Все возможности Starter', 'Аналитика', 'Калькулятор', 'Персональный менеджер'],
    featuresShort: ['Всё из Starter', 'Аналитика', 'Калькулятор', 'Менеджер'],
  },
  {
    name: 'VIP',
    eyebrow: 'Премиум',
    price: '€499',
    oldPrice: '€699',
    discount: '−29%',
    saving: 'Экономия €200 в месяц',
    subtitle: 'Максимум функций и приоритет на каждом этапе',
    subtitleShort: 'Приоритет и закрытые лоты',
    height: 'tall',
    features: ['Все возможности Pro', 'Приоритет в аукционах', 'VIP-менеджер', 'Закрытые лоты'],
    featuresShort: ['Всё из Pro', 'Приоритет', 'VIP-менеджер', 'Закрытые лоты'],
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
              {benefits.map(({ Icon, title, text, textShort }) => (
                <article className="seller-feature-card" key={title}>
                  <span className="seller-feature-card__icon">
                    <Icon aria-hidden />
                  </span>
                  <h3>{title}</h3>
                  <p>
                    <span className="seller-feature-card__text seller-feature-card__text--full">{text}</span>
                    <span className="seller-feature-card__text seller-feature-card__text--short">{textShort}</span>
                  </p>
                  <button type="button" className="seller-feature-card__link" onClick={() => setModalTitle(title)}>
                    Перейти
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
              {showcaseCards.map(({ Icon, title, titleShort, text, textShort }) => (
                <article className="buyer-showcase-card" key={title}>
                  <span className="buyer-showcase-card__icon">
                    <Icon aria-hidden />
                  </span>
                  <h3>
                    <span className="buyer-showcase-card__title buyer-showcase-card__title--full">{title}</span>
                    <span className="buyer-showcase-card__title buyer-showcase-card__title--short">{titleShort}</span>
                  </h3>
                  <p>
                    <span className="buyer-showcase-card__text buyer-showcase-card__text--full">{text}</span>
                    <span className="buyer-showcase-card__text buyer-showcase-card__text--short">{textShort}</span>
                  </p>
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
          <div className="buyer-plans__offer-note">
            <FiTrendingUp aria-hidden />
            <span>Сейчас все тарифы доступны по специальной цене</span>
          </div>

          <div className="buyer-plan-grid" aria-label="Тарифы подписки">
            {plans.map((plan) => (
              <article
                className={`buyer-plan buyer-plan--${plan.height}${selectedPlan === plan.name ? ' is-selected' : ''}`}
                key={plan.name}
                role="button"
                tabIndex={0}
                aria-pressed={selectedPlan === plan.name}
                onClick={() => setSelectedPlan(plan.name)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedPlan(plan.name)
                  }
                }}
              >
                <div className="buyer-plan__topline">
                  <span className={plan.badge ? 'buyer-plan__badge' : 'buyer-plan__eyebrow'}>
                    {plan.badge ?? plan.eyebrow}
                  </span>
                  <span className="buyer-plan__discount">{plan.discount}</span>
                </div>

                <div className="buyer-plan__heading">
                  <h3>{plan.name}</h3>
                  <p>
                    <span className="buyer-plan__subtitle buyer-plan__subtitle--full">{plan.subtitle}</span>
                    <span className="buyer-plan__subtitle buyer-plan__subtitle--short">{plan.subtitleShort}</span>
                  </p>
                </div>

                <div className="buyer-plan__price">
                  <div className="buyer-plan__price-values">
                    <del className="buyer-plan__price-was">{plan.oldPrice}</del>
                    <div className="buyer-plan__price-current">
                      <strong>{plan.price}</strong>
                      <span>/ месяц</span>
                    </div>
                  </div>
                  <span className="buyer-plan__price-saving">{plan.saving}</span>
                </div>

                <span className="buyer-plan__features-title">В тариф входит</span>
                <ul aria-label={`Возможности тарифа ${plan.name}`}>
                  {plan.features.map((feature, index) => (
                    <li key={feature}>
                      <FiCheck aria-hidden />
                      <span className="buyer-plan__feature buyer-plan__feature--full">{feature}</span>
                      <span className="buyer-plan__feature buyer-plan__feature--short">
                        {plan.featuresShort[index] ?? feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={selectedPlan === plan.name ? 'buyer-plan__button is-selected' : 'buyer-plan__button'}
                  onClick={() => setSelectedPlan(plan.name)}
                  aria-pressed={selectedPlan === plan.name}
                >
                  {selectedPlan === plan.name ? (
                    <>
                      <FiCheck aria-hidden />
                      Тариф выбран
                    </>
                  ) : (
                    <>
                      Выбрать тариф
                      <FiArrowRight aria-hidden />
                    </>
                  )}
                </button>
              </article>
            ))}

            <div className="buyer-subscribe-panel">
              <div className="buyer-subscribe-panel__copy">
                <span>Выбран тариф</span>
                <strong>{selectedPlanData.name}</strong>
                <p>
                  <span className="buyer-subscribe-panel__desc buyer-subscribe-panel__desc--full">
                    {selectedPlanData.subtitle}
                  </span>
                  <span className="buyer-subscribe-panel__desc buyer-subscribe-panel__desc--short">
                    {selectedPlanData.subtitleShort}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalTitle(`Оформить ${selectedPlanData.name}`)}
                aria-label={`Оформить подписку ${selectedPlanData.name}`}
              >
                <FiCreditCard aria-hidden />
                <span className="buyer-subscribe-panel__cta buyer-subscribe-panel__cta--full">
                  Оформить подписку
                </span>
                <span className="buyer-subscribe-panel__cta buyer-subscribe-panel__cta--short">Оформить</span>
              </button>
            </div>
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
