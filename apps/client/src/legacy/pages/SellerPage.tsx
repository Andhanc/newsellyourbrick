import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
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
import { useAnimatedCounter } from '@/components/about/hooks/useAnimatedCounter'
import { useInView } from '@/components/about/hooks/useInView'
import Header from '@/components/Header'
import { publicAsset } from '@/utils/publicAsset'
import { scrollMainTo } from '@/utils/mainScroll'
import './SellerPage.css'

const sellerAboutChartBadgeSrc = publicAsset('images/seller-page/seller-about-chart-badge.png')
const sellerAboutPortraitSrc = publicAsset('images/seller-page/seller-about-portrait.png')

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
  const { t } = useTranslation()
  const sellerLaunchStats = useMemo(
    () => [
      {
        target: 200,
        prefix: '',
        suffix: 'K',
        decimals: 0,
        label: t('sellerLanding_stat1Label'),
      },
      {
        target: 200,
        prefix: '$',
        suffix: 'M',
        decimals: 0,
        label: t('sellerLanding_stat2Label'),
      },
      {
        target: 4.8,
        prefix: '',
        suffix: '/5',
        decimals: 1,
        label: t('sellerLanding_stat3Label'),
      },
    ],
    [t],
  )
  const sellerLaunchPlans = useMemo(
    () => [
      {
        title: t('sellerLanding_plan1Title'),
        copy: t('sellerLanding_plan1Copy'),
        action: t('sellerLanding_plan1Action'),
      },
      {
        title: t('sellerLanding_plan2Title'),
        copy: t('sellerLanding_plan2Copy'),
        action: t('sellerLanding_plan2Action'),
      },
      {
        title: t('sellerLanding_plan3Title'),
        copy: t('sellerLanding_plan3Copy'),
        action: t('sellerLanding_plan3Action'),
      },
    ],
    [t],
  )
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
              <span className="seller-savings__title-line">{t('sellerLanding_savingsTitle1')}</span>
              <span className="seller-savings__title-line">{t('sellerLanding_savingsTitle2')}</span>
            </h2>
            <p>{t('sellerLanding_savingsLead')}</p>
            <Link
              to="/owner/property/new"
              className="seller-savings__button"
              onClick={() => scrollMainTo(0, 0, 'instant')}
            >
              {t('sellerLanding_savingsCta')}
              <FiArrowRight />
            </Link>
          </div>

          <div className="seller-savings__card" aria-label={t('sellerLanding_savingsCardAria')}>
            <img
              src={publicAsset('images/seller-page/seller-savings-family-card.png')}
              alt={t('sellerLanding_savingsCardImgAlt')}
              loading="lazy"
              decoding="async"
            />
            <div className="seller-savings__profit">
              <span>{t('sellerLanding_savingsProfitLabel')}</span>
              <strong>$ 22,850</strong>
              <em>+8.07%</em>
            </div>
            <div className="seller-savings__badge">
              <FiCheckCircle />
              {t('sellerLanding_savingsBadge')}
            </div>
          </div>
        </div>
      </div>

      <div className="seller-savings__stats" ref={statsRef} aria-label={t('sellerLanding_launchStatsAria')}>
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
          {t('sellerLanding_lifestyleBadge')}
        </div>
        <div className="seller-savings__lifestyle-head">
          <h2 id="seller-savings-lifestyle-title">{t('sellerLanding_lifestyleTitle')}</h2>
          <p>{t('sellerLanding_lifestyleLead')}</p>
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
  const { t } = useTranslation()
  const sellerToolkitCards = useMemo(
    () => [
      {
        icon: FiHome,
        title: t('sellerLanding_toolkit1Title'),
        copy: t('sellerLanding_toolkit1Copy'),
      },
      {
        icon: FiTrendingUp,
        title: t('sellerLanding_toolkit2Title'),
        copy: t('sellerLanding_toolkit2Copy'),
        accent: true,
      },
      {
        icon: FiUsers,
        title: t('sellerLanding_toolkit3Title'),
        copy: t('sellerLanding_toolkit3Copy'),
      },
      {
        icon: FiShield,
        title: t('sellerLanding_toolkit4Title'),
        copy: t('sellerLanding_toolkit4Copy'),
      },
    ],
    [t],
  )

  return (
    <section className="seller-toolkit" aria-labelledby="seller-toolkit-title">
      <h2 id="seller-toolkit-title" className="seller-visually-hidden">
        {t('sellerLanding_toolkitTitle')}
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
  const { t } = useTranslation()
  const sellerVisionPoints = useMemo(
    () => [t('sellerLanding_vision1'), t('sellerLanding_vision2'), t('sellerLanding_vision3')],
    [t],
  )
  const sellerMissionPoints = useMemo(
    () => [t('sellerLanding_mission1'), t('sellerLanding_mission2'), t('sellerLanding_mission3')],
    [t],
  )

  return (
    <section className="seller-about" aria-labelledby="seller-about-title">
      <div className="seller-about__media">
        <img
          className="seller-about__portrait"
          src={sellerAboutPortraitSrc}
          alt={t('sellerLanding_aboutPortraitAlt')}
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
            {' '}
            {t('sellerLanding_aboutBadgeSellers')}
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
        <span className="seller-about__label">{t('sellerLanding_aboutLabel')}</span>
        <h2 id="seller-about-title">
          {t('sellerLanding_aboutTitleBefore')}{' '}
          <span className="seller-about__title-accent">{t('sellerLanding_aboutTitleAccent')}</span>{' '}
          {t('sellerLanding_aboutTitleAfter')}
        </h2>
        <p className="seller-about__lead">{t('sellerLanding_aboutLead')}</p>

        <div className="seller-about__columns">
          <div>
            <h3>{t('sellerLanding_visionTitle')}</h3>
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
            <h3>{t('sellerLanding_missionTitle')}</h3>
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
          {t('sellerLanding_aboutCta')}
        </Link>
      </div>
    </section>
  )
}

function SellerServicesSection() {
  const { t } = useTranslation()
  const sellerServiceCards = useMemo(
    () => [
      {
        icon: FiBarChart2,
        title: t('sellerLanding_service1Title'),
        copy: t('sellerLanding_service1Copy'),
        action: t('sellerLanding_service1Action'),
      },
      {
        icon: FiLayers,
        title: t('sellerLanding_service2Title'),
        copy: t('sellerLanding_service2Copy'),
        accent: true,
        action: t('sellerLanding_service2Action'),
      },
      {
        icon: FiTarget,
        title: t('sellerLanding_service3Title'),
        copy: t('sellerLanding_service3Copy'),
        action: t('sellerLanding_service3Action'),
      },
    ],
    [t],
  )

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
        <span className="seller-services__label">{t('sellerLanding_servicesLabel')}</span>
        <h2 id="seller-services-title">{t('sellerLanding_servicesTitle')}</h2>
        <p>{t('sellerLanding_servicesLead')}</p>
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
