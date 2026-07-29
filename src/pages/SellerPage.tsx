import { useEffect, useState, type SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  FiArrowRight,
  FiArrowUpRight,
  FiBarChart2,
  FiCheckCircle,
  FiHome,
  FiLayers,
  FiShield,
  FiTarget,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi'
import type { IconType } from 'react-icons'
import { useAnimatedCounter } from '@/components/about/hooks/useAnimatedCounter'
import { useInView } from '@/components/about/hooks/useInView'
import Header from '@/components/Header'
import { publicAsset } from '@/utils/publicAsset'
import { scrollMainTo } from '@/utils/mainScroll'
import './SellerPage.css'

const sellerAboutChartBadgeSrc = publicAsset('images/seller-page/seller-about-chart-badge.png')
const sellerAboutPortraitSrc = publicAsset('images/seller-page/seller-about-portrait.png')

type SellerCard = {
  icon: IconType
  title: string
  copy: string
  accent?: boolean
  action?: string
}

const sellerToolkitCards: SellerCard[] = [
  {
    icon: FiHome,
    title: 'Сильная упаковка',
    copy: 'Подготовим фото, документы и презентацию, которая раскрывает ценность вашего объекта.',
  },
  {
    icon: FiTrendingUp,
    title: 'Стратегия цены',
    copy: 'Сравним рынок и спрос, чтобы вы уверенно выбрали цену и не уступили лишнего.',
    accent: true,
  },
  {
    icon: FiUsers,
    title: 'Доступ к покупателям',
    copy: 'Покажем объект частным покупателям, инвесторам и участникам закрытых клубов.',
  },
  {
    icon: FiShield,
    title: 'Контроль до сделки',
    copy: 'Соберём предложения, переговоры и статусы в одном понятном процессе до финала.',
  },
]

const sellerVisionPoints = [
  'Понимаете реальную позицию объекта на рынке',
  'Видите спрос и предложения в одном месте',
  'Сами выбираете цену и условия сделки',
]

const sellerMissionPoints = [
  'Готовим объект к сильному выходу на рынок',
  'Показываем его подходящим покупателям',
  'Помогаем пройти переговоры до закрытия сделки',
]

const sellerServiceCards: SellerCard[] = [
  {
    icon: FiBarChart2,
    title: 'Стратегия цены',
    copy: 'Покажем потенциал объекта, реальный спрос и сценарии продажи до публикации.',
    action: 'Оценить объект',
  },
  {
    icon: FiLayers,
    title: 'Маркетинг объекта',
    copy: 'Создадим подачу, которая выделяет объект и помогает покупателю увидеть его ценность.',
    accent: true,
    action: 'Запустить продажу',
  },
  {
    icon: FiTarget,
    title: 'Сделка под контролем',
    copy: 'Поможем с предложениями, переговорами и ключевыми этапами до получения результата.',
    action: 'Стать продавцом',
  },
]

const sellerLaunchStats = [
  {
    target: 200,
    prefix: '',
    suffix: 'K',
    decimals: 0,
    label: 'покупателей видят проверенные запуски продавцов',
  },
  {
    target: 200,
    prefix: '$',
    suffix: 'M',
    decimals: 0,
    label: 'стоимость объектов, подготовленных с SellYourBrick',
  },
  {
    target: 4.8,
    prefix: '',
    suffix: '/5',
    decimals: 1,
    label: 'оценка продавцами процесса запуска',
  },
]

const sellerLaunchPlans = [
  {
    title: 'Проверить спрос',
    copy: 'Узнайте, как рынок реагирует на объект, прежде чем принимать решение о цене.',
    action: 'Проверить',
  },
  {
    title: 'Продать выгоднее',
    copy: 'Получите аналитику цены, сильную презентацию и доступ к подходящим покупателям.',
    action: 'Рассчитать',
  },
  {
    title: 'Закрытая продажа',
    copy: 'Приватный запуск для дорогих объектов и ограниченного круга покупателей.',
    action: 'Подробнее',
  },
]

function SellerLaunchStatValue({
  target,
  prefix = '',
  suffix = '',
  decimals = 0,
  inView,
  reduceMotion,
}: {
  target: number
  prefix?: string
  suffix?: string
  decimals?: number
  inView: boolean
  reduceMotion: boolean
}) {
  const animate = inView && !reduceMotion
  const value = useAnimatedCounter(target, animate, { duration: 1800, decimals })
  const display = !inView ? 0 : reduceMotion ? target : value
  const formatted =
    decimals > 0
      ? `${prefix}${display.toFixed(decimals)}${suffix}`
      : `${prefix}${Math.round(display)}${suffix}`

  return <strong>{formatted}</strong>
}

function SellerSavingsSection() {
  const { ref: statsRef, inView: statsInView } = useInView<HTMLDivElement>({ threshold: 0.35 })
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  return (
    <section className="seller-savings" aria-labelledby="seller-savings-title">
      <div className="seller-savings__fold">
      <div className="seller-savings__hero">
        <img
          className="seller-savings__hero-bg"
          src={publicAsset('images/seller-page/seller-savings-teal-bg.png')}
          alt=""
          loading="lazy"
          decoding="async"
        />
        <div className="seller-savings__hero-content">
          <div className="seller-savings__copy">
            <h2 id="seller-savings-title">
              <span className="seller-savings__title-line">Продайте выгоднее</span>
              <span className="seller-savings__title-line">Всё под контролем</span>
            </h2>
            <p>
              Поможем определить сильную цену, подготовить объект и выйти к покупателям,
              готовым обсуждать сделку.
            </p>
            <Link
              to="/owner/property/new"
              className="seller-savings__button"
              onClick={() => scrollMainTo(0, 0, 'instant')}
            >
              Рассчитать продажу
              <FiArrowRight />
            </Link>
          </div>

          <div className="seller-savings__card" aria-label="Предварительный сценарий продажи">
            <img
              src={publicAsset('images/seller-page/seller-savings-family-card.png')}
              alt="Продавец с семьёй рядом с современным домом"
              loading="lazy"
              decoding="async"
            />
            <div className="seller-savings__profit">
              <span>Ваша выгода</span>
              <strong>$ 22,850</strong>
              <em>+8.07%</em>
            </div>
            <div className="seller-savings__badge">
              <FiCheckCircle />
              Объект готов к сильному запуску за 12 дней
            </div>
          </div>
        </div>
      </div>

      <div className="seller-savings__stats" ref={statsRef} aria-label="Результаты запусков продавцов">
        {sellerLaunchStats.map((stat) => (
          <article key={stat.label}>
            <SellerLaunchStatValue
              target={stat.target}
              prefix={stat.prefix}
              suffix={stat.suffix}
              decimals={stat.decimals}
              inView={statsInView}
              reduceMotion={reduceMotion}
            />
            <span>{stat.label}</span>
          </article>
        ))}
      </div>
      </div>

      <section className="seller-savings__lifestyle" aria-labelledby="seller-savings-lifestyle-title">
        <img
          className="seller-savings__lifestyle-bg"
          src={publicAsset('images/seller-page/seller-savings-lifestyle-bg.png')}
          alt=""
          loading="lazy"
          decoding="async"
        />
        <div className="seller-savings__lifestyle-shade" />
        <div className="seller-savings__lifestyle-badge">
          <FiCheckCircle />
          Продавцы выбирают SellYourBrick в 2026
        </div>
        <div className="seller-savings__lifestyle-head">
          <h2 id="seller-savings-lifestyle-title">Продажа на ваших условиях начинается здесь</h2>
          <p>
            Выберите подходящий сценарий, проверьте потенциал объекта и запустите продажу уверенно.
          </p>
        </div>
        <div className="seller-savings__plans">
          {sellerLaunchPlans.map((plan) => (
            <article className="seller-savings-plan" key={plan.title}>
              <h3>{plan.title}</h3>
              <p>{plan.copy}</p>
              <Link to="/owner/property/new" onClick={() => scrollMainTo(0, 0, 'instant')}>
                {plan.action}
                <FiArrowRight />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

function SellerToolkitSection() {
  return (
    <section className="seller-toolkit" aria-labelledby="seller-toolkit-title">
      <h2 id="seller-toolkit-title" className="seller-visually-hidden">
        Почему продавцы выбирают SellYourBrick
      </h2>
      <div className="seller-toolkit__grid">
        {sellerToolkitCards.map((card) => {
          const Icon = card.icon
          return (
            <article
              className={`seller-toolkit-card${card.accent ? ' seller-toolkit-card--accent' : ''}`}
              key={card.title}
            >
              <span className="seller-toolkit-card__icon" aria-hidden="true">
                <Icon />
              </span>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

const sellerAboutPortraitFallbackSrc = publicAsset(
  'images/external/photo-1472099645785-5658abf4ff4e-066a8445b1.jpg',
)

function handleSellerAboutPortraitError(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget
  if (image.dataset.fallbackApplied === 'true') return
  image.dataset.fallbackApplied = 'true'
  image.src = sellerAboutPortraitFallbackSrc
}

function SellerAboutSection() {
  return (
    <section className="seller-about" aria-labelledby="seller-about-title">
      <div className="seller-about__media">
        <img
          className="seller-about__portrait"
          src={sellerAboutPortraitSrc}
          alt="Продавец проверяет аналитику объекта на смартфоне"
          width={420}
          height={512}
          loading="eager"
          decoding="async"
          onError={handleSellerAboutPortraitError}
        />
        <div className="seller-about__badge seller-about__badge--brands">
          <span className="seller-about__badge-icon" aria-hidden="true">
            <FiUsers />
          </span>
          <span>
            <strong>185+</strong>
            продавцов уже в SellYourBrick
          </span>
        </div>
        <img
          className="seller-about__badge seller-about__badge--chart"
          src={sellerAboutChartBadgeSrc}
          alt=""
          width={118}
          height={118}
          loading="eager"
          decoding="async"
          aria-hidden="true"
        />
      </div>

      <div className="seller-about__content">
        <span className="seller-about__label">Почему SellYourBrick</span>
        <h2 id="seller-about-title">
          Вы не просто размещаете{' '}
          <span className="seller-about__title-accent">объект</span> — вы запускаете продажу
        </h2>
        <p className="seller-about__lead">
          Мы соединяем аналитику, профессиональную презентацию и доступ к покупателям в одном
          сервисе. Вы принимаете решения на основе цифр и сохраняете контроль над сделкой.
        </p>

        <div className="seller-about__columns">
          <div>
            <h3>Ваша выгода</h3>
            <ul>
              {sellerVisionPoints.map((point) => (
                <li key={point}>
                  <FiCheckCircle aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Что берём на себя</h3>
            <ul>
              {sellerMissionPoints.map((point) => (
                <li key={point}>
                  <FiCheckCircle aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Link
          to="/owner/property/new"
          className="seller-about__button btn-tiffany-shine"
          onClick={() => scrollMainTo(0, 0, 'instant')}
        >
          Стать продавцом
        </Link>
      </div>
    </section>
  )
}

function SellerServicesSection() {
  return (
    <section className="seller-services" aria-labelledby="seller-services-title">
      <img
        className="seller-services__bg"
        src={publicAsset('images/seller-page/seller-services-team.png')}
        alt=""
        loading="lazy"
        decoding="async"
        aria-hidden="true"
      />
      <div className="seller-services__shade" aria-hidden="true" />

      <div className="seller-services__head">
        <span className="seller-services__label">Полный цикл</span>
        <h2 id="seller-services-title">Всё, чтобы продать уверенно и на своих условиях</h2>
        <p>
          От первой оценки до закрытия сделки — понятный процесс без хаоса и неизвестности.
        </p>
      </div>

      <div className="seller-services__grid">
        {sellerServiceCards.map((card) => {
          const Icon = card.icon
          return (
            <article
              className={`seller-services-card${card.accent ? ' seller-services-card--accent' : ''}`}
              key={card.title}
            >
              <span className="seller-services-card__icon" aria-hidden="true">
                <Icon />
              </span>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
              <Link to="/owner/property/new" onClick={() => scrollMainTo(0, 0, 'instant')}>
                {card.action}
                <FiArrowUpRight />
              </Link>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default function SellerPage() {
  useEffect(() => {
    const layout = document.querySelector('.app-layout')
    layout?.classList.add('app-layout--seller-page')
    scrollMainTo(0, 0, 'instant')

    return () => {
      layout?.classList.remove('app-layout--seller-page')
    }
  }, [])

  return (
    <>
      <Header />
      <main className="seller-page">
        <SellerSavingsSection />
        <SellerToolkitSection />
        <SellerAboutSection />
        <SellerServicesSection />
      </main>
    </>
  )
}
