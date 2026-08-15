import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FiArrowRight,
  FiCheck,
  FiCreditCard,
  FiCrosshair,
  FiEdit3,
  FiGlobe,
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
import { useViewerVipAccess } from '@/hooks/useViewerVipAccess'
import { publicAsset } from '@/utils/publicAsset'
import './BuyerPage.css'
import './SellerPage.css'

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function BuyerPage() {
  const { t, i18n } = useTranslation()
  const { numericUserId, ownedPlanName } = useViewerVipAccess()
  // Marketing default for guests; logged-in users sync to their real tier below.
  const [selectedPlan, setSelectedPlan] = useState('Pro')
  const [userPickedPlan, setUserPickedPlan] = useState(false)
  const [modalTitle, setModalTitle] = useState('')

  useEffect(() => {
    if (!numericUserId || userPickedPlan) return
    setSelectedPlan(ownedPlanName)
  }, [numericUserId, ownedPlanName, userPickedPlan])

  const pickPlan = (name) => {
    setUserPickedPlan(true)
    setSelectedPlan(name)
  }

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

  const plans = useMemo(
    () => [
      {
        name: 'Starter',
        eyebrow: t('buyerLanding_planStarterEyebrow'),
        price: '€0',
        oldPrice: '€29',
        discount: '−100%',
        saving: t('buyerLanding_planStarterSaving'),
        subtitle: t('buyerLanding_planStarterSubtitle'),
        subtitleShort: t('buyerLanding_planStarterSubtitle'),
        height: 'short',
        features: [
          t('buyerLanding_planStarterFeat0'),
          t('buyerLanding_planStarterFeat1'),
          t('buyerLanding_planStarterFeat2'),
        ],
        featuresShort: [
          t('buyerLanding_planStarterFeat0Short'),
          t('buyerLanding_planStarterFeat1Short'),
          t('buyerLanding_planStarterFeat2Short'),
        ],
      },
      {
        name: 'Pro',
        eyebrow: t('buyerLanding_planProEyebrow'),
        price: '€149',
        oldPrice: '€199',
        discount: '−25%',
        saving: t('buyerLanding_planProSaving'),
        subtitle: t('buyerLanding_planProSubtitle'),
        subtitleShort: t('buyerLanding_planProSubtitleShort'),
        height: 'medium',
        badge: t('buyerLanding_planProBadge'),
        features: [
          t('buyerLanding_planProFeat0'),
          t('buyerLanding_planProFeat1'),
          t('buyerLanding_planProFeat2'),
        ],
        featuresShort: [
          t('buyerLanding_planProFeat0Short'),
          t('buyerLanding_planProFeat1Short'),
          t('buyerLanding_planProFeat2Short'),
        ],
      },
      {
        name: 'VIP',
        eyebrow: t('buyerLanding_planVipEyebrow'),
        price: '€499',
        oldPrice: '€699',
        discount: '−29%',
        saving: t('buyerLanding_planVipSaving'),
        subtitle: t('buyerLanding_planVipSubtitle'),
        subtitleShort: t('buyerLanding_planVipSubtitleShort'),
        height: 'tall',
        features: [
          t('buyerLanding_planVipFeat0'),
          t('buyerLanding_planVipFeat1'),
          t('buyerLanding_planVipFeat2'),
          t('buyerLanding_planVipFeat3'),
        ],
        featuresShort: [
          t('buyerLanding_planVipFeat0Short'),
          t('buyerLanding_planVipFeat1Short'),
          t('buyerLanding_planVipFeat2Short'),
          t('buyerLanding_planVipFeat3Short'),
        ],
      },
    ],
    [t, i18n.language],
  )

  const selectedPlanData = useMemo(
    () => plans.find((plan) => plan.name === selectedPlan) ?? plans[1],
    [plans, selectedPlan],
  )

  return (
    <>
      <Header />
      <main className="buyer-page" aria-label={t('buyerLanding_pageAria')}>
      <section className="buyer-hero-viewport" id="buyer-map">
        <div className="buyer-hero__stage-wrap">
          <div className="buyer-hero__stage">
            <BuyerMapScene
              onCardClick={(title) => setModalTitle(title)}
            />
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
          <h1>{t('buyerLanding_heroTitle')}</h1>
          <p className="buyer-hero__lead">{t('buyerLanding_heroLead')}</p>
        </div>
      </section>

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
                  <button type="button" className="seller-feature-card__link" onClick={() => setModalTitle(title)}>
                    {t('buyerLanding_benefitLink')}
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
        <img className="buyer-plans__bg" src={publicAsset('images/test-drive/hero-resort.png')} alt="" aria-hidden />
        <div className="buyer-container buyer-plans__content">
          <h2 id="buyer-plans-title">{t('buyerLanding_plansTitle')}</h2>
          <p>{t('buyerLanding_plansLead')}</p>
          <div className="buyer-plans__offer-note">
            <FiTrendingUp aria-hidden />
            <span>{t('buyerLanding_plansOfferNote')}</span>
          </div>

          <div className="buyer-plan-grid" aria-label={t('buyerLanding_plansAria')}>
            {plans.map((plan) => (
              <article
                className={`buyer-plan buyer-plan--${plan.height}${selectedPlan === plan.name ? ' is-selected' : ''}`}
                key={plan.name}
                role="button"
                tabIndex={0}
                aria-pressed={selectedPlan === plan.name}
                onClick={() => pickPlan(plan.name)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    pickPlan(plan.name)
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
                      <span>{t('buyerLanding_perMonth')}</span>
                    </div>
                  </div>
                  <span className="buyer-plan__price-saving">{plan.saving}</span>
                </div>

                <span className="buyer-plan__features-title">{t('buyerLanding_featuresTitle')}</span>
                <ul aria-label={t('buyerLanding_featuresAria', { name: plan.name })}>
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
                  onClick={() => pickPlan(plan.name)}
                  aria-pressed={selectedPlan === plan.name}
                >
                  {selectedPlan === plan.name ? (
                    <>
                      <FiCheck aria-hidden />
                      {t('buyerLanding_planSelected')}
                    </>
                  ) : (
                    <>
                      {t('buyerLanding_selectPlan')}
                      <FiArrowRight aria-hidden />
                    </>
                  )}
                </button>
              </article>
            ))}

            <div className="buyer-subscribe-panel">
              <div className="buyer-subscribe-panel__copy">
                <span>{t('buyerLanding_selectedLabel')}</span>
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
                onClick={() => setModalTitle(t('buyerLanding_modalCheckoutTitle', { name: selectedPlanData.name }))}
                aria-label={t('buyerLanding_subscribeAria', { name: selectedPlanData.name })}
              >
                <FiCreditCard aria-hidden />
                <span className="buyer-subscribe-panel__cta buyer-subscribe-panel__cta--full">
                  {t('buyerLanding_subscribeCta')}
                </span>
                <span className="buyer-subscribe-panel__cta buyer-subscribe-panel__cta--short">
                  {t('buyerLanding_subscribeCtaShort')}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {modalTitle && (
        <div className="buyer-modal" role="dialog" aria-modal="true" aria-labelledby="buyer-modal-title">
          <button
            className="buyer-modal__scrim"
            type="button"
            aria-label={t('buyerLanding_modalClose')}
            onClick={() => setModalTitle('')}
          />
          <div className="buyer-modal__panel">
            <p>SellYourBrick</p>
            <h2 id="buyer-modal-title">{modalTitle}</h2>
            <span>{t('buyerLanding_modalHint')}</span>
            <button type="button" className="buyer-pill-button" onClick={() => setModalTitle('')}>
              {t('buyerLanding_modalOk')}
            </button>
          </div>
        </div>
      )}
    </main>
    </>
  )
}
