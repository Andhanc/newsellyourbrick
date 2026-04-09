import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useRef } from 'react'
import { getUserData, logout } from '../services/authService'
import VerificationToast from '../components/VerificationToast'
import PricingCards from '../components/ui/PricingCards'
import { startProSubscriptionCheckout, confirmCheckoutSession } from '../utils/subscriptionCheckout'
import { showNotification } from '../utils/toastHelper'
import BuyerCabinetSidebar from '../components/BuyerCabinetSidebar'
import './Subscriptions.css'
import './Profile.css'
import { useChainedAppLayoutScroll } from '../hooks/useChainedAppLayoutScroll'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const Subscriptions = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [userId, setUserId] = useState(null)
  const [verificationStatus, setVerificationStatus] = useState(null)
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

  // Загружаем статус верификации
  useEffect(() => {
    if (userId) {
      loadVerificationStatus()
    }
  }, [userId])

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

  const loadVerificationStatus = async () => {
    if (!userId) return
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/verification-status`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setVerificationStatus(result.data)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки статуса верификации:', error)
    }
  }

  useEffect(() => {
    const onPush = () => {
      if (userId) loadVerificationStatus()
    }
    window.addEventListener('verification-status-update', onPush)
    return () => window.removeEventListener('verification-status-update', onPush)
  }, [userId])

  // Функции для проверки заполненности
  const isDocumentsComplete = () => {
    return verificationStatus?.hasDocuments || false
  }

  const isBasicInfoComplete = () => {
    if (!verificationStatus?.missingFields) return false
    const { missingFields } = verificationStatus
    return !missingFields.firstName && 
           !missingFields.lastName && 
           !missingFields.emailOrPhone && 
           !missingFields.country && 
           !missingFields.address
  }

  const isPassportDataComplete = () => {
    if (!verificationStatus?.missingFields) return false
    const { missingFields } = verificationStatus
    return !missingFields.passportSeries && 
           !missingFields.passportNumber && 
           !missingFields.identificationNumber
  }

  const shouldShowProfileIndicator = () => {
    if (!verificationStatus) return false
    return !isDocumentsComplete()
  }

  const shouldShowDataIndicator = () => {
    if (!verificationStatus) return false
    return !isBasicInfoComplete() || !isPassportDataComplete()
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

  const handleLogout = async () => {
    if (!window.confirm(t('buyerCabinet_logoutConfirm'))) {
      return
    }

    try {
      await logout()
    } catch (error) {
      console.warn('⚠️ Ошибка при выходе из аккаунта (Subscriptions):', error)
    }

    navigate('/')
    setTimeout(() => {
      window.location.reload()
    }, 100)
  }

  return (
    <div className="subscriptions-page" ref={buyerCabinetPageRef}>
      {/* Всплывающее уведомление о прогрессе верификации */}
      {userId && <VerificationToast userId={userId} />}
      
      <div className="subscriptions-container buyer-cabinet-layout-container">
        <BuyerCabinetSidebar
          asideClassName="subscriptions-sidebar"
          headerSpaceBetween
          onLogout={handleLogout}
          showProfileIndicator={shouldShowProfileIndicator()}
          showDataIndicator={shouldShowDataIndicator()}
        />

        <main className="subscriptions-main buyer-cabinet-layout-main">
          <div className="buyer-cabinet-main-scroll" ref={buyerCabinetMainScrollRef}>
          <h1 className="subscriptions-title" id="subscriptions-pricing-section">
            {t('buyerCabinet_sectionSubscriptions')}
          </h1>
          <div className="subscriptions-cards subscriptions-cards--pricing">
            <PricingCards onBookCall={handleBookCall} mobileTwoColumn />
          </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Subscriptions

