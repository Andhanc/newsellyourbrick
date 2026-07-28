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
}

const sellerToolkitCards: SellerCard[] = [
  {
    icon: FiHome,
    title: 'Подготовка объекта',
    copy: 'Соберите фото, документы и описание лота в одном понятном чек-листе без хаоса в файлах.',
  },
  {
    icon: FiTrendingUp,
    title: 'Ценообразование',
    copy: 'Сравните рынок, спрос и сценарии сделки — и выберите цену, которая не тормозит продажу.',
    accent: true,
  },
  {
    icon: FiUsers,
    title: 'Показ покупателям',
    copy: 'Покажите объект нужной аудитории: инвесторам, частным покупателям и закрытым клубам.',
  },
  {
    icon: FiShield,
    title: 'Сопровождение сделки',
    copy: 'Держите переговоры, статусы и ключевые цифры в одном прозрачном сценарии до закрытия.',
  },
]

const sellerVisionPoints = [
  'Продавец видит весь путь сделки в одном месте',
  'Цена и спрос проверяются до выхода на рынок',
  'Покупатели приходят подготовленными, без лишней переписки',
]

const sellerMissionPoints = [
  'Убрать хаос из подготовки и продажи объекта',
  'Дать продавцу инструменты уровня инвест-платформы',
  'Сделать запуск лота быстрым, прозрачным и управляемым',
]

const sellerServiceCards: SellerCard[] = [
  {
    icon: FiBarChart2,
    title: 'Оценка лота',
    copy: 'Цена, спрос и потенциал — до публикации.',
  },
  {
    icon: FiLayers,
    title: 'Маркетинг объекта',
    copy: 'Презентация, медиа и сценарий показа.',
    accent: true,
  },
  {
    icon: FiTarget,
    title: 'Закрытие сделки',
    copy: 'Переговоры и статусы до финала.',
  },
]

const sellerLaunchStats = [
  {
    target: 200,
    prefix: '',
    suffix: 'K',
    decimals: 0,
    label: 'buyers watch verified seller launches',
  },
  {
    target: 200,
    prefix: '$',
    suffix: 'M',
    decimals: 0,
    label: 'property value prepared through SellYourBrick',
  },
  {
    target: 4.8,
    prefix: '',
    suffix: '/5',
    decimals: 1,
    label: 'seller launch experience rating',
  },
]

const sellerLaunchPlans = [
  {
    title: 'Plan B',
    copy: 'Быстрый листинг для продавца, который хочет проверить спрос без лишнего риска.',
    action: 'Открыть',
  },
  {
    title: 'Ambitious',
    copy: 'Расширенный запуск с аналитикой цены, спроса и сценариями переговоров.',
    action: 'Сравнить',
  },
  {
    title: 'Intrepid',
    copy: 'Private-режим для дорогих объектов, закрытых покупателей и сопровождения сделки.',
    action: 'Изучить',
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
              <span className="seller-savings__title-line">Войдите в новый мир</span>
              <span className="seller-savings__title-line">продажи недвижимости</span>
            </h2>
            <p>
              SellYourBrick помогает продавцу подготовить объект, выбрать цену и показать лот
              нужным покупателям без хаоса в переписках и таблицах.
            </p>
            <Link
              to="/owner/property/new"
              className="seller-savings__button"
              onClick={() => scrollMainTo(0, 0, 'instant')}
            >
              Симулятор
              <FiArrowRight />
            </Link>
          </div>

          <div className="seller-savings__card" aria-label="Seller launch preview">
            <img
              src={publicAsset('images/seller-page/seller-savings-family-card.png')}
              alt="Home seller with family near a modern house"
              loading="lazy"
              decoding="async"
            />
            <div className="seller-savings__profit">
              <span>Потенциал</span>
              <strong>$ 22,850</strong>
              <em>+8.07%</em>
            </div>
            <div className="seller-savings__badge">
              <FiCheckCircle />
              Продавец готов к запуску за 12 дней
            </div>
          </div>
        </div>
      </div>

      <div className="seller-savings__stats" ref={statsRef} aria-label="Seller launch performance">
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
          Sellers joined SellYourBrick in 2026
        </div>
        <div className="seller-savings__lifestyle-head">
          <h2 id="seller-savings-lifestyle-title">Лучше продавать — начинается здесь</h2>
          <p>
            Выберите сценарий запуска, сравните ожидания по цене и держите сделку под контролем.
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
        Инструменты продавца
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
        <span className="seller-about__label">О SellYourBrick</span>
        <h2 id="seller-about-title">
          Мы делаем всё, чтобы ваш{' '}
          <span className="seller-about__title-accent">объект</span> продавался быстрее
        </h2>
        <p className="seller-about__lead">
          SellYourBrick помогает продавцу пройти путь от подготовки лота до переговоров без таблиц,
          потерянных файлов и бесконечных чатов с покупателями.
        </p>

        <div className="seller-about__columns">
          <div>
            <h3>Наше видение</h3>
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
            <h3>Наша миссия</h3>
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
          className="seller-about__button"
          onClick={() => scrollMainTo(0, 0, 'instant')}
        >
          Наша история
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
        <span className="seller-services__label">Наши сервисы</span>
        <h2 id="seller-services-title">Что мы предлагаем продавцу недвижимости</h2>
        <p>
          От оценки до закрытия — один сценарий и прозрачные цифры.
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
                Подробнее
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
