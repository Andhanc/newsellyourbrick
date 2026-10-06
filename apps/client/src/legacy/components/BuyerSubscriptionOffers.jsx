import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, Crown, FileText, Gavel, Headphones, Sparkles } from 'lucide-react'
import OwnerPricingCards from './OwnerPricingCards'
import { PricingInteraction } from './ui/pricing-interaction'
import { SubscriptionScreen } from './ui/subscription-screen'
import { getUserData } from '../services/authService'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { startProSubscriptionCheckout, startVipSubscriptionCheckout } from '../utils/subscriptionCheckout'
import { showNotification } from '../utils/toastHelper'
import './BuyerSubscriptionOffers.css'

const PLAN_ORDER = ['starter', 'pro', 'vip']
const PLAN_PRICES = { starter: 0, pro: 149, vip: 499 }
const PLAN_RANK = { starter: 0, pro: 1, vip: 2 }

export default function BuyerSubscriptionOffers({ currentPlanVisual = 'starter', titleId, userId: viewerUserId }) {
  const { t } = useTranslation()
  const [checkoutDrawer, setCheckoutDrawer] = useState(null)
  const [startingPlanId, setStartingPlanId] = useState('')
  const activePlanId = PLAN_RANK[currentPlanVisual] == null ? 'starter' : currentPlanVisual

  const plans = useMemo(() => PLAN_ORDER.map((id) => ({
    id,
    name: id === 'vip' ? 'VIP' : id === 'pro' ? 'Pro' : 'Starter',
    monthlyPrice: PLAN_PRICES[id],
    compareAtPrice: id === 'starter' ? 29 : undefined,
    popular: id === 'pro',
  })), [])

  const details = useMemo(() => ({
    starter: {
      features: [
        { icon: <Gavel size={20} />, text: t('buyerLanding_planStarterFeat0') },
        { icon: <Sparkles size={20} />, text: t('buyerLanding_planStarterFeat2') },
        { icon: <FileText size={20} />, text: t('buyerLanding_planStarterFeat3') },
      ],
    },
    pro: {
      features: [
        { icon: <Sparkles size={20} />, text: t('buyerLanding_planProFeat0') },
        { icon: <BarChart3 size={20} />, text: t('buyerLanding_planProFeat1') },
        { icon: <FileText size={20} />, text: t('buyerLanding_planProFeat3') },
        { icon: <Headphones size={20} />, text: t('buyerLanding_planProFeat4') },
      ],
    },
    vip: {
      features: [
        { icon: <Sparkles size={20} />, text: t('buyerLanding_planVipFeat0') },
        { icon: <Crown size={20} />, text: t('buyerLanding_planVipFeat1') },
        { icon: <Headphones size={20} />, text: t('buyerLanding_planVipFeat2') },
        { icon: <FileText size={20} />, text: t('buyerLanding_planVipFeat3') },
      ],
    },
  }), [t])

  const taglines = useMemo(() => ({
    starter: t('buyerLanding_planStarterSubtitle'),
    pro: t('buyerLanding_planProSubtitle'),
    vip: t('buyerLanding_planVipSubtitle'),
  }), [t])

  const pricingPlans = useMemo(() => plans.map((plan) => ({
    ...plan,
    yearlyPrice: Math.round(plan.monthlyPrice * 0.75),
  })), [plans])

  const openCheckoutDrawer = (planId, period = 'monthly') => {
    if (startingPlanId || !PLAN_ORDER.includes(planId)) return
    if (PLAN_RANK[planId] <= PLAN_RANK[activePlanId]) {
      showNotification(
        planId === 'starter' ? t('buyerCabinet_toastStarter') : t('buyerCabinet_toastDuplicateSubscription'),
        'info',
      )
      return
    }
    setCheckoutDrawer({ planId, period })
  }

  const subscribe = async (billingCycle) => {
    const planId = checkoutDrawer?.planId
    if (!planId || startingPlanId) return
    const userData = getUserData()
    const userId = viewerUserId ?? userData?.id ?? localStorage.getItem('userId')
    if (!userId || !/^\d+$/.test(String(userId))) {
      setCheckoutDrawer(null)
      requestOpenLoginModal({ wizard: false })
      return
    }
    setStartingPlanId(planId)
    try {
      const checkout = planId === 'vip' ? startVipSubscriptionCheckout : startProSubscriptionCheckout
      const result = await checkout({ userId, customerEmail: userData?.email, billingCycle })
      if (!result.ok) {
        const message = result.error === 'already_subscribed_vip'
          ? t('privateClubVipAlready')
          : result.error === 'already_subscribed_pro'
            ? t('buyerCabinet_toastDuplicateSubscription')
            : result.error || t('buyerCabinet_checkoutError')
        showNotification(message, 'error')
      }
    } catch (error) {
      showNotification(error?.message || t('buyerCabinet_checkoutError'), 'error')
    } finally {
      setStartingPlanId('')
    }
  }

  const selectedPlan = checkoutDrawer ? plans.find((plan) => plan.id === checkoutDrawer.planId) : null
  const selectedDetails = checkoutDrawer ? details[checkoutDrawer.planId] : null
  const perMonthSuffix = t('buyerPricing_perMonth')

  return (
    <div className="buyer-subscription-offers">
      <header className="buyer-subscription-offers__hero">
        <h2 className="buyer-subscription-offers__title" id={titleId}>
          <span>{t('ownerTest_subscriptionsHeroBefore')}</span>
          <span><span className="buyer-subscription-offers__pill">{t('ownerTest_subscriptionsHeroHighlight')}</span>{' '}{t('ownerTest_subscriptionsHeroAfter')}</span>
        </h2>
        <p className="buyer-subscription-offers__lead">{t('buyerLanding_plansLead')}</p>
      </header>

      <div className="buyer-subscription-offers__mobile">
        <PricingInteraction
          plans={pricingPlans}
          monthlyLabel={t('buyerPricing_tabMonthly')}
          yearlyLabel={t('buyerPricing_tabYearly')}
          perMonthSuffix={perMonthSuffix}
          ctaLabel={t('buyerPricing_buyNow')}
          activeCtaLabel={t('buyerCabinet_subStatus_active')}
          popularLabel={t('buyerPricing_badgeBest')}
          activePlanId={activePlanId}
          loading={Boolean(startingPlanId)}
          onGetStarted={openCheckoutDrawer}
        />
      </div>

      <div className="buyer-subscription-offers__desktop">
        <OwnerPricingCards
          variant="light"
          showSubscribePanel={false}
          plans={plans}
          planDetails={details}
          taglines={taglines}
          planOrder={PLAN_ORDER}
          featuredPlanId="pro"
          yearlyDiscount={0.25}
          activePlanId={activePlanId}
          loading={Boolean(startingPlanId)}
          monthlyLabel={t('buyerPricing_tabMonthly')}
          yearlyLabel={t('buyerPricing_tabYearly')}
          perMonthSuffix={perMonthSuffix}
          activeCtaLabel={t('buyerCabinet_subStatus_active')}
          popularLabel={t('buyerPricing_badgeBest')}
          onSelectPlan={openCheckoutDrawer}
        />
      </div>

      {selectedPlan && selectedDetails ? (
        <SubscriptionScreen
          open
          appName="New Era"
          planType={selectedPlan.name}
          features={selectedDetails.features}
          pricingOptions={[
            { id: 'monthly', price: `${selectedPlan.monthlyPrice} €`, period: t('ownerTest_subscriptionsBillingMonthly') },
            { id: 'yearly', price: `${selectedPlan.monthlyPrice * 9} €`, period: t('ownerTest_subscriptionsBillingYearly'), badge: t('buyerPricing_tabYearly') },
          ]}
          defaultPlanId={checkoutDrawer.period}
          subscribeButtonText={t('ownerTest_subscriptionDrawerSubscribe')}
          footerText={t('ownerTest_subscriptionDrawerFooter')}
          loading={Boolean(startingPlanId)}
          onClose={() => { if (!startingPlanId) setCheckoutDrawer(null) }}
          onSubscribe={subscribe}
        />
      ) : null}
    </div>
  )
}
