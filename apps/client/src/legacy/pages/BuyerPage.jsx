import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FiArrowRight,
  FiCrosshair,
  FiEdit3,
  FiGlobe,
  FiLayers,
  FiLock,
  FiSearch,
  FiShield,
  FiSliders,
  FiZap,
} from 'react-icons/fi'
import BuyerMapScene from '@/components/BuyerMapScene'
import DepositStrategyModal from '@/components/DepositStrategyModal'
import Header from '@/components/Header'
import BuyerSubscriptionOffers from '@/components/BuyerSubscriptionOffers'
import { useViewerVipAccess } from '@/hooks/useViewerVipAccess'
import { publicAsset } from '@/utils/publicAsset'
import { COMPASS_PATH, markCompassIntroPending } from '@/utils/investmentCompass'
import './BuyerPage.css'
import './SellerPage.css'

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function BuyerPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { displayTier, numericUserId } = useViewerVipAccess()
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false)

  const platformStats = useMemo(
    () => [
      { value: '$1B+', label: t('buyerLanding_stat1Label') },
      { value: '20K+', label: t('buyerLanding_stat2Label') },
      { value: '8-12%', label: t('buyerLanding_stat3Label') },
    ],
    [t, i18n.language],
  )

  const serviceCards = useMemo(
    () => [
      {
        Icon: FiSearch,
        title: t('buyerLanding_svc1Title'),
        text: t('buyerLanding_svc1Text'),
      },
      {
        Icon: FiShield,
        title: t('buyerLanding_svc2Title'),
        text: t('buyerLanding_svc2Text'),
      },
      {
        Icon: FiCrosshair,
        title: t('buyerLanding_svc3Title'),
        text: t('buyerLanding_svc3Text'),
        wide: true,
      },
    ],
    [t, i18n.language],
  )

  const benefits = useMemo(
    () => [
      {
        Icon: FiGlobe,
        title: t('buyerLanding_benefit1Title'),
        text: t('buyerLanding_benefit1Text'),
        textShort: t('buyerLanding_benefit1TextShort'),
      },
      {
        Icon: FiZap,
        title: t('buyerLanding_benefit2Title'),
        text: t('buyerLanding_benefit2Text'),
        textShort: t('buyerLanding_benefit2TextShort'),
      },
      {
        Icon: FiLock,
        title: t('buyerLanding_benefit3Title'),
        text: t('buyerLanding_benefit3Text'),
        textShort: t('buyerLanding_benefit3TextShort'),
      },
    ],
    [t, i18n.language],
  )

  const showcaseCards = useMemo(
    () => [
      {
        Icon: FiLayers,
        title: t('buyerLanding_showcase1Title'),
        titleShort: t('buyerLanding_showcase1TitleShort'),
        text: t('buyerLanding_showcase1Text'),
        textShort: t('buyerLanding_showcase1TextShort'),
      },
      {
        Icon: FiZap,
        title: t('buyerLanding_showcase2Title'),
        titleShort: t('buyerLanding_showcase2TitleShort'),
        text: t('buyerLanding_showcase2Text'),
        textShort: t('buyerLanding_showcase2TextShort'),
      },
      {
        Icon: FiEdit3,
        title: t('buyerLanding_showcase3Title'),
        titleShort: t('buyerLanding_showcase3TitleShort'),
        text: t('buyerLanding_showcase3Text'),
        textShort: t('buyerLanding_showcase3TextShort'),
      },
      {
        Icon: FiSliders,
        title: t('buyerLanding_showcase4Title'),
        titleShort: t('buyerLanding_showcase4TitleShort'),
        text: t('buyerLanding_showcase4Text'),
        textShort: t('buyerLanding_showcase4TextShort'),
      },
    ],
    [t, i18n.language],
  )

  return (
    <>
      <Header />
      <main className="buyer-page" aria-label={t('buyerLanding_pageAria')}>
      <section className="buyer-hero-viewport" id="buyer-map">
        <div className="buyer-hero__stage-wrap">
          <div className="buyer-hero__stage">
            <BuyerMapScene onOpenStrategies={() => setIsStrategyModalOpen(true)} />
          </div>

          <div className="buyer-stats" aria-label={t('buyerLanding_statsAria')}>
            {platformStats.map((stat) => (
              <article className="buyer-stat" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="buyer-hero__head">
          <span className="buyer-hero__eyebrow">{t('buyerLanding_heroEyebrow')}</span>
          <h1>{t('buyerLanding_heroTitle')}</h1>
          <p className="buyer-hero__lead">{t('buyerLanding_heroLead')}</p>
          <button type="button" className="buyer-hero__cta" onClick={() => navigate('/search-results')}>
            {t('buyerLanding_serviceCta')}
            <FiArrowRight aria-hidden />
          </button>
        </div>
      </section>

      <DepositStrategyModal
        isOpen={isStrategyModalOpen}
        onClose={() => setIsStrategyModalOpen(false)}
        onOpenCompass={() => {
          markCompassIntroPending()
          navigate(COMPASS_PATH)
        }}
        titleKey="buyerLanding_strategyModalTitle"
      />

      <section className="buyer-service-section" aria-labelledby="buyer-service-title">
        <div className="buyer-container buyer-service">
          <div className="buyer-service__copy">
            <span>{t('buyerLanding_serviceEyebrow')}</span>
            <h2 id="buyer-service-title">{t('buyerLanding_serviceTitle')}</h2>
            <p>{t('buyerLanding_serviceLead')}</p>
            <button type="button" className="buyer-dark-button" onClick={() => scrollTo('buyer-benefits')}>
              {t('buyerLanding_serviceCta')}
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
              {t('buyerLanding_benefitsTitle')}
              <span>{t('buyerLanding_benefitsTitleSpan')}</span>
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
              {t('buyerLanding_showcaseTitle')}
              <span>{t('buyerLanding_showcaseTitleSpan')}</span>
              <span className="buyer-showcase__title-line">{t('buyerLanding_showcaseTitleBrand')}</span>
            </h2>
            <p>{t('buyerLanding_showcaseLead')}</p>
            <button type="button" className="buyer-dark-button" onClick={() => scrollTo('buyer-plans')}>
              {t('buyerLanding_showcaseCta')}
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
        <div className="buyer-container buyer-plans__content">
          <BuyerSubscriptionOffers currentPlanVisual={displayTier} userId={numericUserId} titleId="buyer-plans-title" />
        </div>
      </section>

    </main>
    </>
  )
}
