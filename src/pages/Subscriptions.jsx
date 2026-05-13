import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useRef } from 'react'
import { getUserData } from '../services/authService'
import { FiArrowLeft } from 'react-icons/fi'
import VerificationToast from '../components/VerificationToast'
import PricingCards from '../components/ui/PricingCards'
import { startProSubscriptionCheckout, confirmCheckoutSession, startVipSubscriptionCheckout } from '../utils/subscriptionCheckout'
import { showNotification } from '../utils/toastHelper'
import './Subscriptions.css'
import { useChainedAppLayoutScroll } from '../hooks/useChainedAppLayoutScroll'
import { effectiveDisplayTier, effectivePurchasedTier, userHasVipAccess } from '../hooks/useCabinetOverviewData'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const Subscriptions = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [userId, setUserId] = useState(null)
  const [subscriptionBilling, setSubscriptionBilling] = useState(null)
  const buyerCabinetPageRef = useRef(null)
  const buyerCabinetMainScrollRef = useRef(null)

  useChainedAppLayoutScroll(buyerCabinetPageRef, buyerCabinetMainScrollRef, { active: true })

  useEffect(() => {
    if (location.hash !== '#subscriptions-pricing-section') return
    const timer = setTimeout(() => {
      document.getElementById('subscriptions-pricing-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 450)
    return () => clearTimeout(timer)
  }, [location.pathname, location.hash])

  useEffect(() => {
    const userData = getUserData()
    if (userData?.id) {
      setUserId(userData.id)
    } else {
      // Пытаемся получить из localStorage
      const storedUserId = localStorage.getItem('userId')
      if (storedUserId) {
        setUserId(storedUserId)
      }
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetch(`${API_BASE}/users/${userId}/subscription-billing`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (json.success && json.data) setSubscriptionBilling(json.data)
        else setSubscriptionBilling(null)
      })
      .catch(() => {
        if (!cancelled) setSubscriptionBilling(null)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  /** Старые ссылки Stripe на /subscriptions?checkout=success — подтверждаем и уводим на профиль с поздравлением. */
  useEffect(() => {
    const checkout = searchParams.get('checkout')
    const sessionId = searchParams.get('session_id')
    if (checkout !== 'success' || !sessionId || !sessionId.startsWith('cs_')) return
    let cancelled = false
    ;(async () => {
      const r = await confirmCheckoutSession(sessionId)
      if (cancelled) return
      if (r.ok) {
        navigate('/profile?subscription_celebration=1', { replace: true })
      } else {
        showNotification(
          r.error === 'no_app_user_id'
            ? t('buyerSubs_checkoutErrorSupport')
            : t('buyerSubs_checkoutErrorPending'),
          'error'
        )
        const next = new URLSearchParams(searchParams)
        next.delete('checkout')
        next.delete('session_id')
        setSearchParams(next, { replace: true })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, setSearchParams, t, navigate])

  const handleBack = () => {
    navigate(-1)
  }

  const handleBookCall = async (plan, billingCycle = 'monthly') => {
    if (plan === 'pro') {
      const tier = effectivePurchasedTier(subscriptionBilling?.subscription)
      if (tier === 'pro' || tier === 'vip') {
        showNotification(t('buyerCabinet_toastDuplicateSubscription'), 'info')
        return
      }
      const userData = getUserData()
      const uid = userData?.id ?? localStorage.getItem('userId')
      const result = await startProSubscriptionCheckout({
        userId: uid,
        customerEmail: userData?.email,
        billingCycle,
      })
      if (!result.ok) {
        const msg =
          result.error === 'already_subscribed_pro'
            ? t('buyerCabinet_toastDuplicateSubscription')
            : result.error || t('buyerCabinet_checkoutError')
        showNotification(msg, result.error === 'already_subscribed_pro' ? 'info' : 'error')
      }
      return
    }
    if (plan === 'starter') {
      showNotification(t('buyerCabinet_toastStarter'), 'info')
      return
    }
    if (plan === 'vip') {
      if (userHasVipAccess({ subscription: subscriptionBilling?.subscription, vipClub: subscriptionBilling?.vipClub })) {
        showNotification(t('privateClubVipAlready'), 'info')
        return
      }
      const userData = getUserData()
      const uid = userData?.id ?? localStorage.getItem('userId')
      const result = await startVipSubscriptionCheckout({
        userId: uid,
        customerEmail: userData?.email,
        billingCycle,
      })
      if (!result.ok) {
        const msg =
          result.error === 'already_subscribed_vip'
            ? t('privateClubVipAlready')
            : result.error === 'already_subscribed_pro'
              ? t('buyerCabinet_toastDuplicateSubscription')
              : result.error || t('buyerCabinet_checkoutError')
        showNotification(msg, result.error === 'already_subscribed_vip' ? 'info' : 'error')
      }
      return
    }
  }

  return (
    <div className="subscriptions-page subscriptions-page--focus" ref={buyerCabinetPageRef}>
      {userId && <VerificationToast userId={userId} />}

      <div className="subscriptions-focus" ref={buyerCabinetMainScrollRef}>
        <div className="subscriptions-focus__top">
          <button
            type="button"
            className="subscriptions-focus__back"
            onClick={handleBack}
            aria-label={t('subscriptions_focus_back')}
          >
            <FiArrowLeft size={18} aria-hidden />
            {t('subscriptions_focus_back')}
          </button>
        </div>

        <header className="subscriptions-focus__header">
          <h1 className="subscriptions-focus__title" id="subscriptions-pricing-section">
            {t('buyerCabinet_sectionSubscriptions')}
          </h1>
          <p className="subscriptions-focus__lead">{t('buyerCabinet_sectionSubscriptionsSubtitle')}</p>
        </header>

        <div className="subscriptions-focus__cards">
          <PricingCards
            creative
            onBookCall={handleBookCall}
            mobileTwoColumn
            currentPlanVisual={effectiveDisplayTier(
              subscriptionBilling?.subscription,
              subscriptionBilling?.vipClub
            )}
          />
        </div>
      </div>
    </div>
  )
}

export default Subscriptions

