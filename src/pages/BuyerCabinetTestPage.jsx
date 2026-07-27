import { useState, useMemo, useId, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser, useClerk } from '@clerk/clerk-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faScaleBalanced } from '@fortawesome/free-solid-svg-icons'
import {
  Gavel,
  ChartPie,
  Receipt,
  LogOut,
  Sparkles,
  Crown,
  Gem,
  ArrowRight,
  LayoutGrid,
  CircleCheck,
  FileText,
  BookOpen,
} from 'lucide-react'
import { FrostedGlassCard } from '../components/ui/interactive-frosted-glass-card'
import WarpShaderBackground from '../components/ui/warp-shader-background'
import { getUserData, getStoredNumericUserId, logout } from '../services/authService'
import { getCabinetDataPath, getCabinetProfilePath, getCabinetSubscriptionsPath } from '../utils/cabinetRoutes'
import { CO_INVESTMENT_PATH } from '../utils/sectionRoutes'
import { fetchUserById } from '../utils/usersApi'
import { formatBillingReasonForUi } from '../utils/formatBillingReason'

import './BuyerCabinetTestPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function IconArrowBack() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M12.5 15L7.5 10L12.5 5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconNavData() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconNavWallet() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M4 10h18" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="14" r="1.3" fill="currentColor" />
    </svg>
  )
}

function IconNavHistory() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconNavBookings() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 9h16M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconNavChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 6h14a2 2 0 012 2v7a2 2 0 01-2 2h-5l-4 3v-3H5a2 2 0 01-2-2V8a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8 10h8M8 13h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/** То же сердце, что на карточках (property-favorite), в заливке как у активного избранного. */
function FeatureIconFavorites() {
  return (
    <svg className="bwt-feature-deco" width="84" height="84" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="currentColor"
      />
    </svg>
  )
}

/** scale-balanced: в Pro это `fal`; в бесплатном npm только `fas` (тот же iconName). */
function FeatureIconCompare() {
  return (
    <FontAwesomeIcon
      icon={faScaleBalanced}
      className="bwt-feature-deco bwt-feature-deco--fa"
      aria-hidden
    />
  )
}

function normalizePlanVisual(sub) {
  if (!sub) return 'starter'
  const k = String(sub.plan_key || 'pro').toLowerCase()
  if (k === 'starter' || k === 'free') return 'starter'
  if (k === 'vip') return 'vip'
  return 'pro'
}

function planTitleKey(visual) {
  if (visual === 'starter') return 'Starter'
  if (visual === 'vip') return 'VIP'
  return 'Pro'
}

/** Ключи i18n фич тарифа (как на странице подписок) */
function planFeatureTranslationKeys(visual) {
  if (visual === 'starter') {
    return ['buyerPricing_featS0', 'buyerPricing_featS1', 'buyerPricing_featS2']
  }
  if (visual === 'vip') {
    return ['buyerPricing_featV0', 'buyerPricing_featV1', 'buyerPricing_featV2', 'buyerPricing_featV3']
  }
  return ['buyerPricing_featP0', 'buyerPricing_featP1', 'buyerPricing_featP2', 'buyerPricing_featP3']
}

function SubscriptionPlanIcon({ planVisual, className }) {
  const common = { className, size: 22, strokeWidth: 2, 'aria-hidden': true }
  if (planVisual === 'vip') return <Crown {...common} />
  if (planVisual === 'pro') return <Gem {...common} />
  return <Sparkles {...common} />
}

export default function BuyerCabinetTestPage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const avatarPlaceholderGradId = useId()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [userId, setUserId] = useState(null)
  const [subscriptionBilling, setSubscriptionBilling] = useState(null)
  const [subscriptionBillingLoading, setSubscriptionBillingLoading] = useState(false)
  /** Поля из БД: публичный номер и роль (как на странице профиля) */
  const [dbUserFields, setDbUserFields] = useState(null)
  const [servicesMenuOpen, setServicesMenuOpen] = useState(false)
  const servicesDockRef = useRef(null)

  const billingLocale = useMemo(() => {
    const code = (i18n.language || 'ru').split('-')[0]
    const map = { ru: 'ru-RU', en: 'en-US', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', sv: 'sv-SE' }
    return map[code] || 'en-US'
  }, [i18n.language])

  useEffect(() => {
    const id = localStorage.getItem('userId')
    if (id && /^\d+$/.test(id)) setUserId(id)
  }, [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      const user = await fetchUserById(API_BASE_URL, userId)
      if (cancelled) return
      if (!user) {
        setDbUserFields(null)
        return
      }
      let u = user
      if (!u.user_id_number) {
        try {
          const updateResponse = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
          if (updateResponse.ok) {
            const updateData = await updateResponse.json()
            if (updateData.success && updateData.data?.user_id_number) {
              u = { ...u, user_id_number: updateData.data.user_id_number }
            }
          }
        } catch {
          /* оставляем внутренний id */
        }
      }
      if (!cancelled) {
        setDbUserFields({
          user_id_number: u.user_id_number ?? null,
          role: typeof u.role === 'string' ? u.role : null,
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setSubscriptionBillingLoading(true)
    fetch(`${API_BASE_URL}/users/${userId}/subscription-billing`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (json.success && json.data) setSubscriptionBilling(json.data)
        else setSubscriptionBilling(null)
      })
      .catch(() => {
        if (!cancelled) setSubscriptionBilling(null)
      })
      .finally(() => {
        if (!cancelled) setSubscriptionBillingLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const { displayName, avatarUrl } = useMemo(() => {
    const gd = getUserData()
    const fromClerk =
      [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
      user?.fullName ||
      ''
    const name =
      fromClerk ||
      (typeof gd?.name === 'string' ? gd.name.trim() : '') ||
      t('buyerCabinet_userPlaceholder')
    const url = user?.imageUrl || user?.profileImageUrl || gd?.picture || ''
    return { displayName: name, avatarUrl: url }
  }, [user, t])

  const { idDisplay, roleLabel } = useMemo(() => {
    const gd = getUserData()
    const fallbackId =
      userId ?? getStoredNumericUserId() ?? (gd?.id != null ? String(gd.id).trim() : '')
    const publicId =
      dbUserFields?.user_id_number != null && String(dbUserFields.user_id_number).trim() !== ''
        ? String(dbUserFields.user_id_number).trim()
        : ''
    const idDisplay =
      publicId ||
      (fallbackId !== '' ? String(fallbackId) : '—')
    const r = String(dbUserFields?.role ?? gd?.role ?? 'buyer').toLowerCase()
    let roleLabel = t('buyerCabinet_roleBuyer')
    if (r === 'seller' || r === 'owner') roleLabel = t('buyerCabinet_roleSeller')
    else if (r === 'admin') roleLabel = t('buyerCabinet_roleAdmin')
    return { idDisplay, roleLabel }
  }, [userId, t, dbUserFields])

  const cabinetDataPath = getCabinetDataPath()
  const cabinetProfilePath = getCabinetProfilePath()

  const goBack = () => {
    const idx = window.history.state?.idx
    if (typeof idx === 'number' && idx > 0) navigate(-1)
    else navigate(cabinetProfilePath)
  }

  const handleLogout = async () => {
    if (!window.confirm(t('buyerCabinet_logoutConfirm'))) {
      return
    }
    sessionStorage.setItem('clerk_logout_in_progress', 'true')
    try {
      if (user && signOut) {
        await signOut({ redirectUrl: `${window.location.origin}/` })
      }
    } catch (e) {
      console.warn('Clerk signOut:', e)
    }
    try {
      await logout()
    } catch (e) {
      console.warn('logout():', e)
    } finally {
      sessionStorage.removeItem('clerk_logout_in_progress')
    }
    window.location.assign('/')
  }

  useEffect(() => {
    if (!servicesMenuOpen) return
    const onDoc = (e) => {
      if (servicesDockRef.current && !servicesDockRef.current.contains(e.target)) {
        setServicesMenuOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setServicesMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [servicesMenuOpen])

  const subscriptionUi = useMemo(() => {
    const sub = subscriptionBilling?.subscription
    const planVisual = normalizePlanVisual(sub)
    const planTitle = planTitleKey(planVisual)
    const planFeatureKeys = planFeatureTranslationKeys(planVisual)
    let periodEnd = null
    if (sub?.current_period_end) {
      try {
        periodEnd = new Date(sub.current_period_end).toLocaleString(billingLocale, {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      } catch {
        periodEnd = null
      }
    }
    return {
      sub,
      planVisual,
      planTitle,
      planFeatureKeys,
      periodEndFormatted: periodEnd,
    }
  }, [subscriptionBilling, billingLocale])

  const billingPaymentsSorted = useMemo(() => {
    const arr = subscriptionBilling?.payments
    if (!Array.isArray(arr) || arr.length === 0) return []
    return [...arr].sort((a, b) => {
      const ta = new Date(a.paid_at || 0).getTime()
      const tb = new Date(b.paid_at || 0).getTime()
      return tb - ta
    })
  }, [subscriptionBilling])

  const { sub, planVisual, planTitle, planFeatureKeys, periodEndFormatted } = subscriptionUi

  return (
    <div className="buyer-wallet-test-page">
      <div className="buyer-wallet-test-page__shader" aria-hidden>
        <WarpShaderBackground />
      </div>
      <div className="buyer-wallet-test-page__inner">
        <div className="buyer-wallet-test-page__main-panel">
        <div className="bwt-liquid-band__toolbar">
          <div className="bwt-liquid-band__back">
            <button type="button" className="bwt-back-btn" onClick={goBack}>
              <IconArrowBack />
              <span>{t('buyerCabinet_back')}</span>
            </button>
          </div>
          <div className="bwt-liquid-band__brand" role="img" aria-label={t('buyerCabinet_brandLine')}>
            <div className="bwt-toolbar-brand" aria-hidden>
              <div className="bwt-toolbar-brand__icon">
                <span className="bwt-toolbar-brand__house" />
              </div>
              <span className="bwt-toolbar-brand__text">{t('buyerCabinet_brandLine')}</span>
            </div>
          </div>
        <section className="bwt-zone bwt-zone--services bwt-zone--services-top" aria-label={t('buyerWalletTest_zoneServices')}>
          <div
            ref={servicesDockRef}
            className={`bwt-actions-dock ${servicesMenuOpen ? 'bwt-actions-dock--open' : ''}`}
          >
            <div
              id="bwt-services-dock-panel"
              className="bwt-actions-dock__panel"
              aria-hidden={!servicesMenuOpen}
            >
              <div className="bwt-actions bwt-actions--tiles bwt-actions--tiles-dock">
                <Link to={cabinetDataPath} className="bwt-action bwt-action--tile" onClick={() => setServicesMenuOpen(false)}>
                  <span className="bwt-action-tile">
                    <span className="bwt-action-tile__icon" aria-hidden>
                      <IconNavData />
                    </span>
                    <span className="bwt-action-tile__label">{t('data')}</span>
                  </span>
                </Link>
                <Link to="/deposit" className="bwt-action bwt-action--tile" onClick={() => setServicesMenuOpen(false)}>
                  <span className="bwt-action-tile">
                    <span className="bwt-action-tile__icon" aria-hidden>
                      <IconNavWallet />
                    </span>
                    <span className="bwt-action-tile__label">{t('wallet')}</span>
                  </span>
                </Link>
                <Link to="/history" className="bwt-action bwt-action--tile" onClick={() => setServicesMenuOpen(false)}>
                  <span className="bwt-action-tile">
                    <span className="bwt-action-tile__icon" aria-hidden>
                      <IconNavHistory />
                    </span>
                    <span className="bwt-action-tile__label">{t('history')}</span>
                  </span>
                </Link>
                <Link
                  to="/profile/bookings"
                  className="bwt-action bwt-action--tile"
                  onClick={() => setServicesMenuOpen(false)}
                >
                  <span className="bwt-action-tile">
                    <span className="bwt-action-tile__icon" aria-hidden>
                      <IconNavBookings />
                    </span>
                    <span className="bwt-action-tile__label">{t('buyerCabinet_myBookings')}</span>
                  </span>
                </Link>
                <Link to="/chat?manager=1" className="bwt-action bwt-action--tile" onClick={() => setServicesMenuOpen(false)}>
                  <span className="bwt-action-tile">
                    <span className="bwt-action-tile__icon" aria-hidden>
                      <IconNavChat />
                    </span>
                    <span className="bwt-action-tile__label">{t('chat')}</span>
                  </span>
                </Link>
                <button
                  type="button"
                  className="bwt-action bwt-action--tile bwt-action--tile-logout"
                  onClick={handleLogout}
                  aria-label={t('logOutLabel')}
                >
                  <span className="bwt-action-tile">
                    <span className="bwt-action-tile__icon" aria-hidden>
                      <LogOut size={22} strokeWidth={1.7} />
                    </span>
                    <span className="bwt-action-tile__label">{t('logOutLabel')}</span>
                  </span>
                </button>
              </div>
            </div>
            <button
              type="button"
              className="bwt-action bwt-action--tile bwt-actions-dock__toggle"
              onClick={() => setServicesMenuOpen((o) => !o)}
              aria-expanded={servicesMenuOpen}
              aria-controls="bwt-services-dock-panel"
              aria-label={t('buyerWalletTest_servicesMenuToggle')}
            >
              <span className="bwt-action-tile bwt-action-tile--dock-trigger">
                <span className="bwt-action-tile__icon" aria-hidden>
                  <LayoutGrid size={22} strokeWidth={2} />
                </span>
              </span>
            </button>
          </div>
        </section>
        </div>

        <div className="bwt-top-grid">
          <div className="bwt-top-grid__profile">
        <section className="bwt-identity-panel" aria-label={t('buyerCabinet_identityPanelAria')}>
          <div className="bwt-identity-panel__card">
            <div className="bwt-identity-panel__top">
              <div className="bwt-identity-panel__avatar-wrap">
                {avatarUrl ? (
                  <img className="bwt-avatar" src={avatarUrl} alt="" />
                ) : (
                  <div className="bwt-avatar bwt-avatar--placeholder" aria-hidden>
                    <svg width="64" height="64" viewBox="0 0 36 36" fill="none">
                      <circle cx="18" cy="18" r="18" fill={`url(#${avatarPlaceholderGradId})`} />
                      <circle cx="18" cy="14" r="6" fill="white" fillOpacity="0.95" />
                      <path
                        d="M8 30c0-6 4.5-9 10-9s10 3 10 9"
                        stroke="white"
                        strokeOpacity="0.95"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id={avatarPlaceholderGradId} x1="0" y1="0" x2="36" y2="36">
                          <stop stopColor="#7ec8e3" />
                          <stop offset="1" stopColor="#b8a9e0" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                )}
              </div>
              <div className="bwt-identity-panel__intro">
                <h2 className="bwt-user-name bwt-user-name--identity">{displayName}</h2>
                <div className="bwt-identity-chips">
                  <span className="bwt-identity-chip">
                    <span className="bwt-identity-chip__label">{t('buyerCabinet_yourStatus')}</span>
                    <span className="bwt-identity-chip__value">{roleLabel}</span>
                  </span>
                  <span className="bwt-identity-chip">
                    <span className="bwt-identity-chip__label">{t('buyerCabinet_yourId')}</span>
                    <span className="bwt-identity-chip__value">{idDisplay}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="bwt-identity-panel__divider" aria-hidden />
            <div className="bwt-identity-panel__subscription" aria-label={t('buyerCabinet_sectionSubscriptions')}>
              {subscriptionBillingLoading ? (
                <div className="bwt-subscription-card bwt-subscription-card--loading bwt-subscription-card--embedded">
                  <p className="bwt-subscription-loading-msg">{t('buyerCabinet_billingLoading')}</p>
                </div>
              ) : (
                <div className={`bwt-subscription-card bwt-subscription-card--embedded bwt-subscription-card--plan-${planVisual}`}>
                  <div className="bwt-subscription-card__head">
                    <div className="bwt-subscription-card__icon-wrap">
                      <SubscriptionPlanIcon planVisual={planVisual} />
                    </div>
                    <div className="bwt-subscription-card__head-text">
                      <span className="bwt-subscription-eyebrow">{t('buyerCabinet_sectionSubscriptions')}</span>
                      <div className="bwt-subscription-plan">{planTitle}</div>
                    </div>
                  </div>
                  <ul className="bwt-subscription-features" data-count={planFeatureKeys.length}>
                    {planFeatureKeys.map((featKey) => (
                      <li key={featKey} className="bwt-subscription-features__item">
                        <span className="bwt-subscription-features__check" aria-hidden>
                          <CircleCheck size={15} strokeWidth={2} />
                        </span>
                        <span className="bwt-subscription-features__text">{t(featKey)}</span>
                      </li>
                    ))}
                  </ul>
                  {periodEndFormatted ? (
                    <div className="bwt-subscription-meta">
                      <span className="bwt-subscription-period-inline">
                        <span className="bwt-subscription-period-label">{t('buyerCabinet_periodEnd')}</span>
                        <span className="bwt-subscription-period-value">{periodEndFormatted}</span>
                      </span>
                    </div>
                  ) : null}
                  {sub?.cancel_at_period_end === 1 ? (
                    <p className="bwt-subscription-hint">{t('buyerCabinet_cancelPeriodHint')}</p>
                  ) : null}
                  <Link to={getCabinetSubscriptionsPath()} className="bwt-subscription-manage">
                    <span>{t('subscriptions')}</span>
                    <ArrowRight size={16} strokeWidth={2} aria-hidden />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
          </div>

          <div className="bwt-top-grid__side">
        <section className="bwt-zone bwt-zone--lists" aria-label={t('buyerWalletTest_zoneLists')}>
          <div className="bwt-lists-split">
            <Link
              to="/favorites"
              className="bwt-feature-card bwt-feature-card--nav bwt-feature-card--liquid"
            >
              <FeatureIconFavorites />
              <div className="bwt-feature-title">{t('favorites')}</div>
              <div className="bwt-feature-sub">{t('buyerWalletTest_favoritesSub')}</div>
            </Link>
            <Link
              to="/compare"
              className="bwt-feature-card bwt-feature-card--nav bwt-feature-card--liquid"
            >
              <FeatureIconCompare />
              <div className="bwt-feature-title">{t('buyerWalletTest_compareTitle')}</div>
              <div className="bwt-feature-sub">{t('buyerWalletTest_compareSub')}</div>
            </Link>
          </div>
        </section>
          </div>
        </div>

        <section className="bwt-zone bwt-zone--deal-types" aria-label={t('buyerWalletTest_zoneDealTypes')}>
          <div
            className="bwt-hub-glass-row"
            role="navigation"
            aria-label={`${t('auction')}, ${t('coInvestment')}, ${t('debtsTitle')}`}
          >
            <FrostedGlassCard
              variant="investor"
              title={t('auction')}
              buttonText={t('goTo')}
              to="/auction"
              icon={<Gavel size={26} strokeWidth={2} aria-hidden />}
            >
              {t('buyerWalletTest_hubAuctionDesc')}
            </FrostedGlassCard>
            <FrostedGlassCard
              variant="seller"
              title={t('coInvestment')}
              buttonText={t('goTo')}
              to={CO_INVESTMENT_PATH}
              icon={<ChartPie size={26} strokeWidth={2} aria-hidden />}
            >
              {t('buyerWalletTest_hubSharesDesc')}
            </FrostedGlassCard>
            <FrostedGlassCard
              variant="debts"
              title={t('debtsTitle')}
              buttonText={t('goTo')}
              to="/debts"
              icon={<Receipt size={26} strokeWidth={2} aria-hidden />}
            >
              {t('buyerWalletTest_hubDebtsDesc')}
            </FrostedGlassCard>
          </div>
        </section>
        </div>

        <div className="bwt-page-lower">
        <section className="bwt-payments" aria-label={t('buyerWalletTest_myPayments')}>
          <h2 className="bwt-payments__title">{t('buyerWalletTest_myPayments')}</h2>
          {subscriptionBillingLoading ? (
            <p className="bwt-payments__loading">{t('buyerCabinet_billingLoading')}</p>
          ) : billingPaymentsSorted.length > 0 ? (
            <ul className="bwt-payments__list">
              {billingPaymentsSorted.map((p) => {
                const reasonLabel = formatBillingReasonForUi(p.billing_reason)
                const cur = (p.currency || 'eur').toUpperCase()
                const amt = (p.amount_cents ?? 0) / 100
                let amountStr
                try {
                  amountStr = new Intl.NumberFormat(billingLocale, {
                    style: 'currency',
                    currency: cur,
                  }).format(amt)
                } catch {
                  amountStr = `${amt} ${cur}`
                }
                return (
                  <li key={p.id} className="bwt-payments__item">
                    <div className="bwt-payments__left">
                      <div className="bwt-payments__amount">{amountStr}</div>
                      {reasonLabel ? (
                        <div className="bwt-payments__reason">{reasonLabel}</div>
                      ) : null}
                    </div>
                    <div className="bwt-payments__date">
                      {p.paid_at
                        ? new Date(p.paid_at).toLocaleString(billingLocale, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="bwt-payments__empty">{t('buyerWalletTest_myPaymentsEmpty')}</p>
          )}
        </section>

        <nav className="bwt-legal-links" aria-label={t('buyerWalletTest_legalNavAria')}>
          <Link to="/about" className="bwt-legal-links__card">
            <FileText size={22} strokeWidth={2} aria-hidden className="bwt-legal-links__icon" />
            <span className="bwt-legal-links__title">{t('buyerWalletTest_policyAgreement')}</span>
            <ArrowRight size={18} strokeWidth={2} aria-hidden className="bwt-legal-links__arrow" />
          </Link>
          <Link to={cabinetDataPath} className="bwt-legal-links__card">
            <BookOpen size={22} strokeWidth={2} aria-hidden className="bwt-legal-links__icon" />
            <span className="bwt-legal-links__title">{t('buyerWalletTest_buyerDocumentation')}</span>
            <ArrowRight size={18} strokeWidth={2} aria-hidden className="bwt-legal-links__arrow" />
          </Link>
        </nav>
        </div>
      </div>
    </div>
  )
}
