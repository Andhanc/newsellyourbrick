import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useRef } from 'react'
import { getUserData } from '../services/authService'
import { FiArrowLeft } from 'react-icons/fi'
import VerificationToast from '../components/VerificationToast'
import PricingCards from '../components/ui/PricingCards'
import { startProSubscriptionCheckout, confirmCheckoutSession } from '../utils/subscriptionCheckout'
import { showNotification } from '../utils/toastHelper'
import './Subscriptions.css'
import { useChainedAppLayoutScroll } from '../hooks/useChainedAppLayoutScroll'

const Subscriptions = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [userId, setUserId] = useState(null)
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
    const checkout = searchParams.get('checkout')
    const sessionId = searchParams.get('session_id')
    if (checkout !== 'success' || !sessionId || !sessionId.startsWith('cs_')) return
    let cancelled = false
    ;(async () => {
      const r = await confirmCheckoutSession(sessionId)
      if (cancelled) return
      if (r.ok) {
        showNotification(t('buyerSubs_checkoutSuccess'), 'success')
      } else {
        showNotification(
          r.error === 'no_app_user_id'
            ? t('buyerSubs_checkoutErrorSupport')
            : t('buyerSubs_checkoutErrorPending'),
          'error'
        )
      }
      const next = new URLSearchParams(searchParams)
      next.delete('checkout')
      next.delete('session_id')
      setSearchParams(next, { replace: true })
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, setSearchParams, t])

  const handleBack = () => {
    navigate(-1)
  }

  const handleBookCall = async (plan) => {
    if (plan === 'pro') {
      const userData = getUserData()
      const uid = userData?.id ?? localStorage.getItem('userId')
      const result = await startProSubscriptionCheckout({
        userId: uid,
        customerEmail: userData?.email,
      })
      if (!result.ok) {
        showNotification(result.error || t('buyerCabinet_checkoutError'), 'error')
      }
      return
    }
    if (plan === 'starter') {
      showNotification(t('buyerCabinet_toastStarter'), 'info')
      return
    }
    if (plan === 'vip') {
      showNotification(t('buyerCabinet_toastVipSoon'), 'info')
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
          <PricingCards onBookCall={handleBookCall} mobileTwoColumn />
        </div>
      </div>
    </div>
  )
}

export default Subscriptions

