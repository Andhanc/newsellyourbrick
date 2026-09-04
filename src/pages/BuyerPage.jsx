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
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi'
import BuyerMapScene from '@/components/BuyerMapScene'
import Header from '@/components/Header'
import { useViewerVipAccess } from '@/hooks/useViewerVipAccess'
import { getUserData } from '@/services/authService'
import { publicAsset } from '@/utils/publicAsset'
import { startProSubscriptionCheckout, startVipSubscriptionCheckout } from '@/utils/subscriptionCheckout'
import { showNotification } from '@/utils/toastHelper'
import './BuyerPage.css'
import './SellerPage.css'

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function BuyerPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { numericUserId } = useViewerVipAccess()
  const [checkoutPlan, setCheckoutPlan] = useState('')
  const [modalTitle, setModalTitle] = useState('')

  const openPlanCheckout = async (plan) => {
    if (checkoutPlan) return

    const planKey = plan.name.toLowerCase()
    if (planKey === 'starter') {
      navigate('/subscriptions?plan=starter#subscriptions-pricing-section')
      return
    }

    setCheckoutPlan(plan.name)
    try {
      const userData = getUserData()
      const checkout = planKey === 'vip' ? startVipSubscriptionCheckout : startProSubscriptionCheckout
      const result = await checkout({
        userId: numericUserId ?? userData?.id ?? localStorage.getItem('userId'),
        customerEmail: userData?.email,
        billingCycle: 'monthly',
      })
      if (!result.ok) {
        showNotification(result.error || t('buyerCabinet_checkoutError'), 'error')
      }
    } catch (error) {
      showNotification(error?.message || t('buyerCabinet_checkoutError'), 'error')
    } finally {
      setCheckoutPlan('')
    }
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
          t('buyerLanding_planStarterFeat3'),
        ],
        featuresShort: [
          t('buyerLanding_planStarterFeat0Short'),
          t('buyerLanding_planStarterFeat1Short'),
          t('buyerLanding_planStarterFeat2Short'),
          t('buyerLanding_planStarterFeat3Short'),
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
          t('buyerLanding_planProFeat3'),
          t('buyerLanding_planProFeat4'),
          t('buyerLanding_planProFeat5'),
        ],
        featuresShort: [
          t('buyerLanding_planProFeat0Short'),
          t('buyerLanding_planProFeat1Short'),
          t('buyerLanding_planProFeat2Short'),
          t('buyerLanding_planProFeat3Short'),
          t('buyerLanding_planProFeat4Short'),
          t('buyerLanding_planProFeat5Short'),
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
          t('buyerLanding_planVipFeat4'),
          t('buyerLanding_planVipFeat5'),
          t('buyerLanding_planVipFeat6'),
        ],
        featuresShort: [
          t('buyerLanding_planVipFeat0Short'),
          t('buyerLanding_planVipFeat1Short'),
          t('buyerLanding_planVipFeat2Short'),
          t('buyerLanding_planVipFeat3Short'),
          t('buyerLanding_planVipFeat4Short'),
          t('buyerLanding_planVipFeat5Short'),
          t('buyerLanding_planVipFeat6Short'),
        ],
      },
    ],
    [t, i18n.language],
  )

  const renderPlan = (plan) => (
    <article
      className={`buyer-plan buyer-plan--${plan.height} buyer-plan--tier-${plan.name.toLowerCase()}${checkoutPlan === plan.name ? ' is-checkout' : ''}`}
      key={plan.name}
      role="link"
      tabIndex={0}
      aria-label={t('buyerLanding_subscribeAria', { name: plan.name })}
      aria-busy={checkoutPlan === plan.name}
      onClick={() => void openPlanCheckout(plan)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          void openPlanCheckout(plan)
        }
      }}
    >
      <div className="buyer-plan__hero">
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
          <span className="buyer-plan__price-saving">
            <span>{plan.saving}</span>
          </span>
        </div>
      </div>

      <div className="buyer-plan__body">
        <span className="buyer-plan__features-title">{t('buyerLanding_featuresTitle')}</span>
        <ul aria-label={t('buyerLanding_featuresAria', { name: plan.name })}>
          {plan.features.map((feature, index) => (
            <li key={feature}>
              <span className="buyer-plan__feature-index" aria-hidden>{index + 1}</span>
              <span className="buyer-plan__feature buyer-plan__feature--full">{feature}</span>
              <span className="buyer-plan__feature buyer-plan__feature--short">
                {plan.featuresShort[index] ?? feature}
              </span>
            </li>
          ))}
        </ul>
        <span className="buyer-plan__button" aria-hidden>
          {checkoutPlan === plan.name ? (
            '…'
          ) : (
            <>
              {t('buyerLanding_modalCheckoutTitle', { name: plan.name })}
              <span className="buyer-plan__button-price">· {plan.price}</span>
              <FiArrowRight aria-hidden />
            </>
          )}
        </span>
        <span className="buyer-plan__checkout-note">{t('buyerLanding_checkoutNote')}</span>
      </div>
    </article>
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
            <div className="buyer-plan-carousel">
              {plans.map(renderPlan)}
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
