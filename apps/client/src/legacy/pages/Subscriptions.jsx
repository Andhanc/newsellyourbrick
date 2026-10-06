import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useRef } from 'react'
import { getUserData } from '../services/authService'
import Header from '../components/Header'
import VerificationToast from '../components/VerificationToast'
import BuyerSubscriptionOffers from '../components/BuyerSubscriptionOffers'
import { confirmCheckoutSession } from '../utils/subscriptionCheckout'
import { showNotification } from '../utils/toastHelper'
import './Subscriptions.css'
import { useChainedAppLayoutScroll } from '../hooks/useChainedAppLayoutScroll'
import { effectiveDisplayTier } from '../hooks/useCabinetOverviewData'

const API_BASE = import.meta.env?.VITE_API_BASE_URL || '/api'

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

  return (
    <div className="subscriptions-page subscriptions-page--focus" ref={buyerCabinetPageRef}>
      <Header />
      {userId && <VerificationToast userId={userId} />}

      <div className="subscriptions-focus" ref={buyerCabinetMainScrollRef}>
        <div id="subscriptions-pricing-section">
          <BuyerSubscriptionOffers
            userId={userId}
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
