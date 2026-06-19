import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, Sparkles } from 'lucide-react'
import OwnerPlanFeatureIcon, { OwnerPlanTierEmblem } from '../components/OwnerPlanFeatureIcon'
import { OST_IMAGES, OST_PLAN_ART } from './ownerSubscriptionsTestImages'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import { OwnerAdStack } from '../components/OwnerAds'
import OwnerNotificationsButton from '../components/OwnerNotificationsButton'
import OwnerSupportButton from '../components/OwnerSupportButton'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import { useOwnerTestNavItems } from '../hooks/useOwnerTestNavItems'
import Confetti from '../components/Confetti'
import { useOwnerTestProfile } from '../context/OwnerTestProfileContext'
import {
  getOwnerTestIntlLocale,
  resolveProfileSubscriptionPlanId,
} from '../utils/ownerTestI18n'
import { OWNER_TEST_STANDALONE_HREF_MAP } from '../utils/ownerTestNav'
import {
  confirmCheckoutSession,
  startOwnerSubscriptionCheckout,
} from '../utils/subscriptionCheckout'
import SiteBrandLogo from '../components/SiteBrandLogo'
import './OwnerSubscriptionsTestPage.css'
import './OwnerSubscriptionsTestPage.mobile.css'

const PLAN_IDS = ['basic', 'standard', 'pro', 'institutional']
const SELLER_PLAN_IDS = ['standard', 'pro', 'institutional']

const PLAN_TIER_LEVEL = {
  standard: 1,
  pro: 2,
  institutional: 3,
}

function normalizeReturnedPlanId(planKey) {
  const key = String(planKey || '').toLowerCase()
  if (key === 'premium') return 'pro'
  if (key === 'corporate') return 'institutional'
  return PLAN_IDS.includes(key) ? key : ''
}


function formatPrice(amount, locale) {
  if (amount === 0) return '0 €'
  return `${amount.toLocaleString(locale)} €`
}

function getPeriodPrice(plan, period) {
  if (plan.price === 0) return 0
  return period === 'yearly' ? Math.round(plan.price * 0.8) : plan.price
}

function getListPrice(plan, period) {
  if (!plan.listPrice || plan.price === 0) return null
  return period === 'yearly' ? Math.round(plan.listPrice * 0.8) : plan.listPrice
}

export default function OwnerSubscriptionsTestPage() {
  const { t, i18n } = useTranslation()
  const intlLocale = useMemo(() => getOwnerTestIntlLocale(i18n.language), [i18n.language])
  const { isEmbedded } = useOwnerTestEmbeddedNav()
  const navItems = useOwnerTestNavItems({
    activeId: 'subscriptions',
    hrefMap: isEmbedded ? undefined : OWNER_TEST_STANDALONE_HREF_MAP,
  })
  const { profile, reloadProfile } = useOwnerTestProfile()
  const [searchParams, setSearchParams] = useSearchParams()
  const [period, setPeriod] = useState('monthly')
  const [menuOpen, setMenuOpen] = useState(false)
  const [startingPlanId, setStartingPlanId] = useState(null)
  const [checkoutError, setCheckoutError] = useState('')
  const [successPlanId, setSuccessPlanId] = useState(null)
  const handledSessionRef = useRef(null)

  const periodTabs = useMemo(
    () => [
      { id: 'monthly', label: t('ownerTest_subscriptionsBillingMonthly') },
      { id: 'yearly', label: t('ownerTest_subscriptionsBillingYearly') },
    ],
    [t]
  )

  const plans = useMemo(
    () => [
      {
        id: 'standard',
        name: t('ownerTest_planStandard'),
        tagline: t('ownerTest_planTaglineStandard'),
        price: 99,
        listPrice: 149,
        features: [
          { icon: 'listings', label: t('ownerTest_planFeatureStandard1') },
          { icon: 'stats', label: t('ownerTest_planFeatureStandard2') },
          { icon: 'support', label: t('ownerTest_planFeatureStandard3') },
          { icon: 'promote', label: t('ownerTest_planFeatureStandard4') },
        ],
      },
      {
        id: 'pro',
        name: t('ownerTest_planPro'),
        tagline: t('ownerTest_planTaglinePro'),
        price: 490,
        listPrice: 690,
        features: [
          { icon: 'unlimited', label: t('ownerTest_planFeaturePro1') },
          { icon: 'analytics', label: t('ownerTest_planFeaturePro2') },
          { icon: 'boost', label: t('ownerTest_planFeaturePro3') },
          { icon: 'manager', label: t('ownerTest_planFeaturePro4') },
        ],
      },
      {
        id: 'institutional',
        name: t('ownerTest_planInstitutional'),
        tagline: t('ownerTest_planTaglineInstitutional'),
        price: 1500,
        listPrice: 1990,
        features: [
          { icon: 'allPro', label: t('ownerTest_planFeatureInstitutional1') },
          { icon: 'custom', label: t('ownerTest_planFeatureInstitutional2') },
          { icon: 'concierge', label: t('ownerTest_planFeatureInstitutional3') },
        ],
      },
    ],
    [t]
  )

  const displayPlans = useMemo(
    () => plans.filter((plan) => SELLER_PLAN_IDS.includes(plan.id)),
    [plans]
  )

  const checkoutErrorText = useMemo(
    () => ({
      already_subscribed_owner_plan: t('ownerTest_checkoutErrAlreadyOwnerPlan'),
      already_subscribed_pro: t('ownerTest_checkoutErrAlreadyPro'),
      already_subscribed_vip: t('ownerTest_checkoutErrAlreadyVip'),
      no_app_user_id: t('ownerTest_checkoutErrNoUserId'),
      user_mismatch: t('ownerTest_checkoutErrUserMismatch'),
    }),
    [t]
  )

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const activePlanId = useMemo(() => {
    if (successPlanId) return successPlanId
    const resolved = resolveProfileSubscriptionPlanId(profile?.subscription)
    if (!resolved || resolved === 'basic') return null
    return resolved
  }, [profile?.subscription, successPlanId])

  const clearCheckoutParams = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('subscription_checkout')
      next.delete('session_id')
      next.delete('owner_plan')
      return next
    }, { replace: true })
  }, [setSearchParams])

  const handlePlanCheckout = useCallback(
    async (plan) => {
      if (!plan || plan.id === activePlanId || startingPlanId) return

      const userId = localStorage.getItem('userId')
      if (!userId || !/^\d+$/.test(userId)) {
        setCheckoutError(t('ownerTest_checkoutLoginRequired'))
        return
      }

      setCheckoutError('')
      setStartingPlanId(plan.id)
      const returnPath = `${window.location.pathname}${window.location.search}`
      const result = await startOwnerSubscriptionCheckout({
        plan: plan.id,
        userId,
        customerEmail: profile?.email,
        billingCycle: period,
        returnPath,
      })
      if (!result.ok) {
        setCheckoutError(
          checkoutErrorText[result.error] || result.error || t('ownerTest_checkoutStripeError')
        )
        setStartingPlanId(null)
      }
    },
    [activePlanId, checkoutErrorText, period, profile?.email, startingPlanId, t]
  )

  useEffect(() => {
    const checkout = searchParams.get('subscription_checkout')
    const sessionId = searchParams.get('session_id')
    const ownerPlan = searchParams.get('owner_plan')

    if (checkout === 'canceled') {
      setCheckoutError(t('ownerTest_checkoutCancelled'))
      clearCheckoutParams()
      return
    }

    if (checkout !== 'success' || !sessionId || handledSessionRef.current === sessionId) return
    handledSessionRef.current = sessionId

    let alive = true
    ;(async () => {
      setCheckoutError('')
      const userId = localStorage.getItem('userId')
      const confirmed = await confirmCheckoutSession(sessionId, userId)
      if (!alive) return
      if (!confirmed.ok) {
        const readableError =
          checkoutErrorText[confirmed.error] || t('ownerTest_checkoutSyncError')
        setCheckoutError(`${readableError} session_id: ${sessionId}`)
        return
      }
      const confirmedPlanId =
        normalizeReturnedPlanId(confirmed.data?.plan_key) || normalizeReturnedPlanId(ownerPlan)
      if (confirmedPlanId) {
        setSuccessPlanId(confirmedPlanId)
      }
      await reloadProfile()
      if (!alive) return
      clearCheckoutParams()
    })()

    return () => {
      alive = false
    }
  }, [checkoutErrorText, clearCheckoutParams, reloadProfile, searchParams, t])

  const renderNavItem = useCallback(
    ({ id, label, icon: Icon, active, badge, href }) => {
      const className = `ost-nav__item${active ? ' ost-nav__item--active' : ''}`
      const inner = (
        <>
          <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden />
          <span>{label}</span>
          {badge != null && <span className="ost-nav__badge">{badge}</span>}
        </>
      )

      if (href) {
        return (
          <Link key={id} to={href} className={className} onClick={closeMenu}>
            {inner}
          </Link>
        )
      }

      return (
        <button key={id} type="button" className={className} onClick={closeMenu}>
          {inner}
        </button>
      )
    },
    [closeMenu]
  )

  useEffect(() => {
    if (isEmbedded) return undefined
    document.documentElement.classList.add('ost-page-active')
    return () => document.documentElement.classList.remove('ost-page-active')
  }, [isEmbedded])

  useEffect(() => {
    if (!menuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  const isYearly = period === 'yearly'
  const successPlan = plans.find((plan) => plan.id === successPlanId)
  const successModal = successPlan ? (
    <div className="ost-success-modal" role="dialog" aria-modal="true" aria-labelledby="ost-success-title">
      <Confetti />
      <button
        type="button"
        className="ost-success-modal__backdrop"
        aria-label={t('ownerTest_ariaCloseCelebration')}
        onClick={() => setSuccessPlanId(null)}
      />
      <div className="ost-success-modal__panel">
        <button
          type="button"
          className="ost-success-modal__close"
          aria-label={t('ownerTest_ariaClose')}
          onClick={() => setSuccessPlanId(null)}
        >
          <X size={20} strokeWidth={2.25} />
        </button>
        <div className="ost-success-modal__icon" aria-hidden>
          <Sparkles size={30} strokeWidth={2.2} />
        </div>
        <h2 id="ost-success-title" className="ost-success-modal__title">
          {t('ownerSaleCelebrationHeadline')}
        </h2>
        <p className="ost-success-modal__text">
          {t('ownerTest_planActiveSubscription')}: {successPlan.name}
        </p>
        <button
          type="button"
          className="ost-success-modal__btn"
          onClick={() => setSuccessPlanId(null)}
        >
          {t('ownerSaleCelebrationCtaVip')}
        </button>
      </div>
    </div>
  ) : null

  const mainColumn = (
      <div className="ost-body">
        <header className="ost-header ost-desktop-only">
          <h1 className="ost-header__title">{t('ownerTest_subscriptionsTitle')}</h1>
          <div className="ost-header__actions">
            <OwnerSupportButton className="ost-icon-btn" />
            <OwnerNotificationsButton className="ost-icon-btn" badgeClassName="ost-icon-btn__badge" />
            <OwnerTestProfileMenu />
          </div>
        </header>

        <div className="ost-workspace">
          <div className="ost-mob-pagehead ost-mobile-only">
            <h1 className="ost-mob-pagehead__title">{t('ownerTest_subscriptionsTitle')}</h1>
          </div>

          <div className="ost-content">
            <section className="ost-save-banner" aria-label={t('ownerTest_ariaYearlyDiscount')}>
              <div className="ost-save-banner__visual" aria-hidden>
                <img
                  className="ost-save-banner__art"
                  src={OST_IMAGES.yearlySaveHero}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <span className="ost-save-banner__badge">−20%</span>
              </div>
              <div className="ost-save-banner__body">
                <div className="ost-save-banner__copy">
                  <h2 className="ost-save-banner__title">{t('ownerTest_planYearlyBannerTitle')}</h2>
                  <p className="ost-save-banner__text">{t('ownerTest_planYearlyBannerText')}</p>
                </div>
                <button
                  type="button"
                  className="ost-save-banner__btn"
                  onClick={() => setPeriod('yearly')}
                >
                  {t('ownerTest_subscriptionsBillingYearly')}
                </button>
              </div>
            </section>

            <div className="ost-billing">
              <div
                className="ost-period-tabs"
                role="tablist"
                aria-label={t('ownerTest_ariaPaymentPeriod')}
              >
                {periodTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={period === tab.id}
                    className={[
                      'ost-period-tabs__item',
                      period === tab.id && 'ost-period-tabs__item--active',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setPeriod(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {checkoutError ? <p className="ost-checkout-message ost-checkout-message--error">{checkoutError}</p> : null}
            </div>

            <div className="ost-plans-grid">
              {displayPlans.map((plan) => {
                const displayPrice = getPeriodPrice(plan, period)
                const listPrice = getListPrice(plan, period)
                const showListPrice = listPrice != null && listPrice > displayPrice
                const isCurrent = plan.id === activePlanId
                const isStarting = startingPlanId === plan.id
                return (
                  <article
                    key={plan.id}
                    className={[
                      'ost-plan-card',
                      `ost-plan-card--tier-${plan.id}`,
                      isCurrent && 'ost-plan-card--current',
                      isCurrent && 'ost-plan-card--current-paid',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="ost-plan-card__ambient" aria-hidden />
                    <div className="ost-plan-card__art" aria-hidden>
                      <img
                        className="ost-plan-card__art-img"
                        src={OST_PLAN_ART[plan.id]}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="ost-plan-card__art-fade" />
                    </div>
                    {plan.id === 'pro' ? (
                      <span className="ost-plan-card__chip">{t('ownerTest_planChipPopular')}</span>
                    ) : null}
                    <div className="ost-plan-card__head">
                      <OwnerPlanTierEmblem tier={plan.id} />
                      <div className="ost-plan-card__head-copy">
                        <div className="ost-plan-card__title-row">
                          <h2 className="ost-plan-card__name">{plan.name}</h2>
                          <span className="ost-plan-card__tier-label">
                            {t('ownerTest_planTierLevel', { level: PLAN_TIER_LEVEL[plan.id] })}
                          </span>
                        </div>
                        {plan.tagline ? <p className="ost-plan-card__tagline">{plan.tagline}</p> : null}
                        <div className="ost-plan-card__priority" aria-hidden>
                          {[1, 2, 3].map((level) => (
                            <span
                              key={level}
                              className={[
                                'ost-plan-card__priority-bar',
                                level <= PLAN_TIER_LEVEL[plan.id] && 'ost-plan-card__priority-bar--on',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="ost-plan-card__price">
                      <span className="ost-plan-card__price-row">
                        {showListPrice ? (
                          <span className="ost-plan-card__was-price" aria-hidden>
                            {formatPrice(listPrice, intlLocale)}
                          </span>
                        ) : null}
                        <span key={`${plan.id}-${period}`} className="ost-plan-card__amount">
                          {formatPrice(displayPrice, intlLocale)}
                        </span>
                        <span className="ost-plan-card__period">
                          {t('ownerTest_planPerMonth', { price: '' }).replace(/^\s*\/?\s*/, '/ ')}
                        </span>
                      </span>
                    </p>
                    {isYearly && plan.price > 0 ? (
                      <div className="ost-plan-card__saving" aria-label={t('ownerTest_ariaYearlySaving')}>
                        <span className="ost-plan-card__old-price">
                          {formatPrice(plan.price, intlLocale)} {t('ownerTest_planPerMonth', { price: '' }).replace(/^\s*\/?\s*/, '/ ')}
                        </span>
                        <span className="ost-plan-card__saving-badge">{t('ownerTest_planYearlySaving')}</span>
                      </div>
                    ) : (
                      <div className="ost-plan-card__saving ost-plan-card__saving--empty" aria-hidden />
                    )}
                    <ul className="ost-plan-card__features">
                      {plan.features.map((feature) => (
                        <li key={feature.label} className="ost-plan-card__feature">
                          <OwnerPlanFeatureIcon name={feature.icon} tier={plan.id} inverted={isCurrent} />
                          <span className="ost-plan-card__feature-text">{feature.label}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="ost-plan-card__footer">
                    {isCurrent ? (
                      <button type="button" className="ost-plan-card__btn ost-plan-card__btn--current" disabled>
                        {t('ownerTest_planActiveSubscription')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="ost-plan-card__btn ost-plan-card__btn--select"
                        disabled={Boolean(startingPlanId)}
                        onClick={() => handlePlanCheckout(plan)}
                      >
                        {isStarting ? t('ownerTest_planOpeningStripe') : t('ownerTest_planBuy')}
                      </button>
                    )}
                    </div>
                  </article>
                )
              })}
            </div>

            <OwnerAdStack cards={['premium', 'help']} className="ost-owner-ads" />
          </div>
        </div>
      </div>
  )

  if (isEmbedded) {
    return (
      <div className="ost ost--embedded">
        {mainColumn}
        {successModal}
      </div>
    )
  }

  return (
    <div className={`ost${menuOpen ? ' ost--menu-open' : ''}`}>
      <header className="ost-mob-topbar ost-mobile-only" aria-label={t('ownerTest_ariaMobileHeader')}>
        <div className="ost-mob-topbar__slot ost-mob-topbar__slot--left">
          <button
            type="button"
            className="ost-mob-topbar__menu"
            aria-label={t('ownerTest_ariaOpenMenu')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
        </div>
        <h1 className="ost-mob-topbar__title">{t('ownerTest_subscriptionsTitle')}</h1>
        <div className="ost-mob-topbar__slot ost-mob-topbar__slot--right">
          <OwnerSupportButton className="ost-mob-topbar__bell" iconSize={22} />
          <OwnerNotificationsButton
            className="ost-mob-topbar__bell"
            badgeClassName="ost-icon-btn__badge"
            iconSize={22}
          />
        </div>
      </header>

      <div
        className="ost-drawer-backdrop ost-mobile-only"
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <aside
        className={`ost-drawer ost-mobile-only${menuOpen ? ' ost-drawer--open' : ''}`}
        aria-label={t('ownerTest_ariaCabinetMenu')}
        aria-hidden={!menuOpen}
      >
        <div className="ost-drawer__head">
          <div className="ost-mob-topbar__brand">
            <SiteBrandLogo textClassName="ost-logo__text" />
          </div>
          <button type="button" className="ost-drawer__close" aria-label={t('ownerTest_ariaCloseMenu')} onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="ost-sidebar__divider ost-sidebar__divider--drawer" aria-hidden />
        <nav className="ost-nav ost-nav--drawer">{navItems.map(renderNavItem)}</nav>
      </aside>

      <aside className="ost-sidebar ost-desktop-only">
        <div className="ost-sidebar__brand">
          <SiteBrandLogo textClassName="ost-logo__text" />
        </div>
        <div className="ost-sidebar__divider" aria-hidden />

        <nav className="ost-nav" aria-label={t('ownerTest_ariaSellerCabinet')}>
          {navItems.map(renderNavItem)}
        </nav>

        <div className="ost-sidebar-promo">
          <p className="ost-sidebar-promo__title">{t('heroPitchBecomeBuyerCta')}</p>
          <p className="ost-sidebar-promo__text">{t('heroPitchBecomeBuyerBody')}</p>
          <button type="button" className="ost-btn ost-btn--primary ost-btn--sm">
            {t('heroPitchBecomeBuyerCta')}
          </button>
          <img
            className="ost-sidebar-promo__img"
            src={OST_IMAGES.promoSidebarBuyer}
            alt=""
            loading="lazy"
          />
        </div>
      </aside>

      {mainColumn}
      {successModal}
    </div>
  )
}
