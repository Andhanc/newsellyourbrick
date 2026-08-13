import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, Sparkles, Home, BarChart3, Headphones, Megaphone, Infinity, LineChart, Rocket, UserRound, Crown } from 'lucide-react'
import { OST_IMAGES } from './ownerSubscriptionsTestImages'
import OwnerNotificationsButton from '../components/OwnerNotificationsButton'
import OwnerSupportButton from '../components/OwnerSupportButton'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import { useOwnerTestNavItems } from '../hooks/useOwnerTestNavItems'
import Confetti from '../components/Confetti'
import { useOwnerTestProfile } from '../context/OwnerTestProfileContext'
import {
  resolveProfileSubscriptionPlanId,
} from '../utils/ownerTestI18n'
import { OWNER_TEST_STANDALONE_HREF_MAP } from '../utils/ownerTestNav'
import {
  confirmCheckoutSession,
  startOwnerSubscriptionCheckout,
} from '../utils/subscriptionCheckout'
import SiteBrandLogo from '../components/SiteBrandLogo'
import { PricingInteraction } from '@/components/ui/pricing-interaction'
import { SubscriptionScreen } from '@/components/ui/subscription-screen'
import OwnerPricingCards from '../components/OwnerPricingCards'
import './OwnerSubscriptionsTestPage.css'
import './OwnerSubscriptionsTestPage.mobile.css'

const PLAN_IDS = ['basic', 'standard', 'pro', 'institutional']

function normalizeReturnedPlanId(planKey) {
  const key = String(planKey || '').toLowerCase()
  if (key === 'premium') return 'pro'
  if (key === 'corporate' || key === 'vip') return 'institutional'
  return PLAN_IDS.includes(key) ? key : ''
}


function getPeriodPrice(plan, period) {
  if (plan.price === 0) return 0
  return period === 'yearly' ? Math.round(plan.price * 0.8) : plan.price
}

function formatEuroPrice(amount) {
  if (amount === 0) return '0 €'
  return `${amount.toLocaleString()} €`
}

export default function OwnerSubscriptionsTestPage() {
  const { t } = useTranslation()
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
  const [checkoutDrawer, setCheckoutDrawer] = useState(null)
  const handledSessionRef = useRef(null)

  const plans = useMemo(
    () => [
      {
        id: 'standard',
        name: t('ownerTest_planStandard'),
        price: 99,
      },
      {
        id: 'pro',
        name: t('ownerTest_planPro'),
        price: 490,
      },
      {
        id: 'institutional',
        name: t('ownerTest_planVip', { defaultValue: 'VIP' }),
        price: 1500,
      },
    ],
    [t]
  )

  const planDetails = useMemo(
    () => ({
      basic: {
        features: [
          { icon: <Home size={20} strokeWidth={2} />, text: t('ownerTest_planFeatureBasic1') },
          { icon: <BarChart3 size={20} strokeWidth={2} />, text: t('ownerTest_planFeatureBasic2') },
          { icon: <Headphones size={20} strokeWidth={2} />, text: t('ownerTest_planFeatureBasic3') },
        ],
      },
      standard: {
        features: [
          { icon: <Home size={20} strokeWidth={2} />, text: t('ownerTest_planFeatureStandard1') },
          { icon: <BarChart3 size={20} strokeWidth={2} />, text: t('ownerTest_planFeatureStandard2') },
          { icon: <Headphones size={20} strokeWidth={2} />, text: t('ownerTest_planFeatureStandard3') },
          { icon: <Megaphone size={20} strokeWidth={2} />, text: t('ownerTest_planFeatureStandard4') },
        ],
      },
      pro: {
        features: [
          { icon: <Infinity size={20} strokeWidth={2} />, text: t('ownerTest_planFeaturePro1') },
          { icon: <LineChart size={20} strokeWidth={2} />, text: t('ownerTest_planFeaturePro2') },
          { icon: <Rocket size={20} strokeWidth={2} />, text: t('ownerTest_planFeaturePro3') },
          { icon: <UserRound size={20} strokeWidth={2} />, text: t('ownerTest_planFeaturePro4') },
        ],
      },
      institutional: {
        features: [
          { icon: <Crown size={20} strokeWidth={2} />, text: t('ownerTest_planFeatureInstitutional1') },
          { icon: <Sparkles size={20} strokeWidth={2} />, text: t('ownerTest_planFeatureInstitutional2') },
          { icon: <UserRound size={20} strokeWidth={2} />, text: t('ownerTest_planFeatureInstitutional3') },
        ],
      },
    }),
    [t]
  )

  const pricingPlans = useMemo(
    () =>
      ['standard', 'pro', 'institutional'].map((planId) => {
        const plan = plans.find((item) => item.id === planId)
        const isPromoFree = planId === 'standard'
        const catalogPrice = plan?.price ?? 0
        return {
          id: planId,
          name: plan?.name || '',
          monthlyPrice: isPromoFree ? 0 : plan ? getPeriodPrice(plan, 'monthly') : 0,
          yearlyPrice: isPromoFree ? 0 : plan ? getPeriodPrice(plan, 'yearly') : 0,
          compareAtPrice: isPromoFree ? catalogPrice : undefined,
          popular: planId === 'pro',
        }
      }),
    [plans]
  )

  const desktopPricingPlans = useMemo(
    () =>
      ['standard', 'pro', 'institutional'].map((planId) => {
        const plan = plans.find((item) => item.id === planId)
        const catalogPrice = plan?.price ?? 0
        const isPromoFree = planId === 'standard'
        return {
          id: planId,
          name: plan?.name || '',
          monthlyPrice: isPromoFree ? 0 : catalogPrice,
          compareAtPrice: isPromoFree ? catalogPrice : undefined,
        }
      }),
    [plans]
  )

  const planTaglines = useMemo(
    () => ({
      standard: t('ownerTest_planTaglineStandard'),
      pro: t('ownerTest_planTaglinePro'),
      institutional: t('ownerTest_planTaglineInstitutional'),
    }),
    [t]
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
  const openMenu = useCallback(() => {
    if (isEmbedded) {
      window.dispatchEvent(new CustomEvent('owner-test:open-menu'))
      return
    }
    setMenuOpen(true)
  }, [isEmbedded])

  const activePlanId = useMemo(() => {
    if (successPlanId) return successPlanId
    const resolved = resolveProfileSubscriptionPlanId(profile?.subscription)
    if (!resolved || resolved === 'basic') return null
    return resolved
  }, [profile?.subscription, successPlanId])

  const pricingActivePlanId = useMemo(() => {
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
    async (plan, billingCycleOverride) => {
      if (!plan || plan.id === activePlanId || startingPlanId) return

      const userId = localStorage.getItem('userId')
      if (!userId || !/^\d+$/.test(userId)) {
        setCheckoutError(t('ownerTest_checkoutLoginRequired'))
        return
      }

      const billingCycle = billingCycleOverride || period

      setCheckoutError('')
      setStartingPlanId(plan.id)
      const returnPath = `${window.location.pathname}${window.location.search}`
      const result = await startOwnerSubscriptionCheckout({
        plan: plan.id,
        userId,
        customerEmail: profile?.email,
        billingCycle,
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

  const handlePricingStart = useCallback((planId, billingPeriod) => {
    setCheckoutError('')
    setCheckoutDrawer({ planId, period: billingPeriod })
  }, [])

  const handleDrawerSubscribe = useCallback(
    (billingCycle) => {
      if (!checkoutDrawer) return
      const plan = plans.find((item) => item.id === checkoutDrawer.planId)
      if (!plan) return
      setPeriod(billingCycle)
      void handlePlanCheckout(plan, billingCycle)
    },
    [checkoutDrawer, handlePlanCheckout, plans]
  )

  const checkoutDrawerModel = useMemo(() => {
    if (!checkoutDrawer) return null

    const plan = plans.find((item) => item.id === checkoutDrawer.planId)
    const details = planDetails[checkoutDrawer.planId]
    if (!plan || !details) return null

    const monthlyPrice = getPeriodPrice(plan, 'monthly')
    const yearlyPrice = getPeriodPrice(plan, 'yearly')

    return {
      open: true,
      appName: t('ownerTest_subscriptionDrawerAppName'),
      planType: plan.name,
      features: details.features,
      pricingOptions: [
        {
          id: 'monthly',
          price: formatEuroPrice(monthlyPrice),
          period: t('ownerTest_subscriptionsBillingMonthly'),
        },
        {
          id: 'yearly',
          price: formatEuroPrice(yearlyPrice),
          period: t('ownerTest_subscriptionsBillingYearly'),
          badge: t('ownerTest_subscriptionDrawerSaveBadge'),
        },
      ],
      defaultPlanId: checkoutDrawer.period,
      subscribeButtonText: t('ownerTest_subscriptionDrawerSubscribe'),
      footerText: t('ownerTest_subscriptionDrawerFooter'),
    }
  }, [checkoutDrawer, planDetails, plans, t])

  const closeCheckoutDrawer = useCallback(() => {
    if (startingPlanId) return
    setCheckoutDrawer(null)
  }, [startingPlanId])

  const perMonthSuffix = useMemo(
    () => t('ownerTest_planPerMonth', { price: '' }).replace(/^\s*\/?\s*/, '/ '),
    [t]
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
        <div className="ost-workspace ost-workspace--pricing">
          <div className="ost-pricing-scene">
            <header className="ost-pricing-hero">
              <div className="ost-pricing-hero__top">
                <button
                  type="button"
                  className="ost-pricing-hero__icon ost-pricing-hero__menu"
                  aria-label={t('ownerTest_ariaOpenMenu')}
                  onClick={openMenu}
                >
                  <Menu size={22} strokeWidth={2.2} />
                </button>
                <p className="ost-pricing-hero__brand">{t('ownerTest_subscriptionDrawerAppName')}</p>
                <div className="ost-pricing-hero__actions">
                  <OwnerSupportButton className="ost-pricing-hero__icon" iconSize={22} />
                  <OwnerNotificationsButton
                    className="ost-pricing-hero__icon"
                    badgeClassName="ost-icon-btn__badge"
                    iconSize={22}
                  />
                  <OwnerTestProfileMenu className="otpm--pricing-hero ost-pricing-hero__profile" />
                </div>
              </div>
              <h1 className="ost-pricing-hero__title">
                <span className="ost-pricing-hero__line">{t('ownerTest_subscriptionsHeroBefore')}</span>
                <span className="ost-pricing-hero__line">
                  <span className="ost-pricing-hero__pill">{t('ownerTest_subscriptionsHeroHighlight')}</span>{' '}
                  {t('ownerTest_subscriptionsHeroAfter')}
                </span>
              </h1>
            </header>

            <div className="ost-content ost-content--pricing">
              <section
                className="ost-pricing-mob ost-mobile-only"
                aria-label={t('ownerTest_subscriptionsTitle')}
              >
                <PricingInteraction
                  plans={pricingPlans}
                  monthlyLabel={t('ownerTest_subscriptionsBillingMonthly')}
                  yearlyLabel={t('ownerTest_subscriptionsBillingYearly')}
                  perMonthSuffix={perMonthSuffix}
                  ctaLabel={t('ownerTest_planBuy')}
                  activeCtaLabel={t('ownerTest_planActiveSubscription')}
                  popularLabel={t('ownerTest_planChipPopular')}
                  activePlanId={pricingActivePlanId}
                  loading={Boolean(startingPlanId)}
                  onGetStarted={handlePricingStart}
                />
              </section>

              <section
                className="ost-pricing-desk ost-desktop-only"
                aria-label={t('ownerTest_subscriptionsTitle')}
              >
                <OwnerPricingCards
                  plans={desktopPricingPlans}
                  planDetails={planDetails}
                  taglines={planTaglines}
                  activePlanId={pricingActivePlanId}
                  loading={Boolean(startingPlanId)}
                  monthlyLabel={t('ownerTest_subscriptionsBillingMonthly')}
                  yearlyLabel={t('ownerTest_subscriptionsBillingYearly')}
                  perMonthSuffix={perMonthSuffix}
                  ctaLabel={t('ownerTest_planBuy')}
                  activeCtaLabel={t('ownerTest_planActiveSubscription')}
                  popularLabel={t('ownerTest_planChipPopular')}
                  onSelectPlan={handlePricingStart}
                />
              </section>

              {checkoutError ? (
                <p className="ost-checkout-message ost-checkout-message--error">{checkoutError}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
  )

  if (isEmbedded) {
    return (
      <div className="ost ost--embedded">
        {mainColumn}
        {successModal}
        {checkoutDrawerModel ? (
          <SubscriptionScreen
            {...checkoutDrawerModel}
            loading={Boolean(startingPlanId)}
            onClose={closeCheckoutDrawer}
            onSubscribe={handleDrawerSubscribe}
          />
        ) : null}
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
      {checkoutDrawerModel ? (
        <SubscriptionScreen
          {...checkoutDrawerModel}
          loading={Boolean(startingPlanId)}
          onClose={closeCheckoutDrawer}
          onSubscribe={handleDrawerSubscribe}
        />
      ) : null}
    </div>
  )
}
