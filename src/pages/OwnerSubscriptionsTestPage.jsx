import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  ShoppingBag,
  Car,
  CreditCard,
  BarChart3,
  MessageSquare,
  Settings,
  Check,
  Menu,
  X,
  Sparkles,
} from 'lucide-react'
import { OST_IMAGES } from './ownerSubscriptionsTestImages'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import { OwnerAdStack } from '../components/OwnerAds'
import OwnerNotificationsButton from '../components/OwnerNotificationsButton'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import Confetti from '../components/Confetti'
import { useOwnerTestProfile } from '../context/OwnerTestProfileContext'
import {
  confirmCheckoutSession,
  startOwnerSubscriptionCheckout,
} from '../utils/subscriptionCheckout'
import './OwnerSubscriptionsTestPage.css'
import './OwnerSubscriptionsTestPage.mobile.css'

const NAV_ITEMS = [
  { id: 'home', label: 'Главная', icon: LayoutDashboard, href: '/main-owner-test' },
  { id: 'properties', label: 'Мои объекты', icon: Building2, href: '/owner-properties-test' },
  { id: 'bookings', label: 'Брони', icon: CalendarCheck },
  { id: 'sales', label: 'Продажи', icon: ShoppingBag, href: '/owner-sales-test' },
  { id: 'testdrive', label: 'Тест-драйв', icon: Car, href: '/owner-test-drive' },
  { id: 'subscriptions', label: 'Подписки', icon: CreditCard, active: true },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'messages', label: 'Сообщения', icon: MessageSquare, badge: 3 },
  { id: 'settings', label: 'Настройки', icon: Settings, href: '/owner-profile-test' },
]

const PERIOD_TABS = [
  { id: 'monthly', label: 'Ежемесячно' },
  { id: 'yearly', label: 'Ежегодно' },
]

const PLANS = [
  {
    id: 'basic',
    name: 'Базовый',
    price: 0,
    features: [
      'До 3 активных объектов',
      'Базовая аналитика',
      'Поддержка по email',
    ],
  },
  {
    id: 'standard',
    name: 'Стандарт',
    price: 19,
    features: [
      'До 10 активных объектов',
      'Расширенная статистика',
      'Приоритетная поддержка',
      'Продвижение объектов',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    features: [
      'Неограниченные объекты',
      'Расширенная аналитика',
      'VIP поддержка 24/7',
      'Продвижение объектов',
      'Персональный менеджер',
    ],
  },
  {
    id: 'corporate',
    name: 'Корпоративный',
    price: 99,
    features: [
      'Все функции Pro',
      'API доступ',
      'Индивидуальное решение',
      'Персональный менеджер',
    ],
  },
]

const PROFILE_SUBSCRIPTION_TO_PLAN_ID = {
  Базовый: 'basic',
  Стандарт: 'standard',
  Pro: 'pro',
  Корпоративный: 'corporate',
}

const CHECKOUT_ERROR_TEXT = {
  already_subscribed_owner_plan: 'Этот тариф уже активен в вашем профиле.',
  already_subscribed_pro: 'У вас уже есть активная платная подписка.',
  already_subscribed_vip: 'У вас уже активна VIP-подписка.',
  no_app_user_id: 'Не удалось привязать оплату к аккаунту: отсутствует ID пользователя. Напишите в поддержку и передайте session_id.',
  user_mismatch: 'Эта оплата относится к другому аккаунту.',
}

function normalizeReturnedPlanId(planKey) {
  const key = String(planKey || '').toLowerCase()
  if (key === 'premium') return 'pro'
  return PLANS.some((plan) => plan.id === key) ? key : ''
}

function LogoMark({ className = '' }) {
  return (
    <svg className={`ost-logo__mark ${className}`.trim()} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="ost-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#53d8d3" />
          <stop offset="100%" stopColor="#089a95" />
        </linearGradient>
      </defs>
      <path d="M20 2L35 11v18L20 38 5 29V11L20 2z" fill="url(#ost-logo-grad)" />
      <text
        x="20"
        y="24"
        textAnchor="middle"
        fill="#fff"
        fontSize="14"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
      >
        $
      </text>
    </svg>
  )
}

function formatPrice(amount) {
  return amount === 0 ? '$0' : `$${amount}`
}

function getPeriodPrice(plan, period) {
  if (plan.price === 0) return 0
  return period === 'yearly' ? Math.round(plan.price * 0.8) : plan.price
}

export default function OwnerSubscriptionsTestPage() {
  const { isEmbedded } = useOwnerTestEmbeddedNav()
  const { profile, reloadProfile } = useOwnerTestProfile()
  const [searchParams, setSearchParams] = useSearchParams()
  const [period, setPeriod] = useState('monthly')
  const [menuOpen, setMenuOpen] = useState(false)
  const [startingPlanId, setStartingPlanId] = useState(null)
  const [checkoutError, setCheckoutError] = useState('')
  const [successPlanId, setSuccessPlanId] = useState(null)
  const handledSessionRef = useRef(null)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const activePlanId = useMemo(() => {
    if (successPlanId) return successPlanId
    return PROFILE_SUBSCRIPTION_TO_PLAN_ID[profile?.subscription] || 'basic'
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
      if (!plan || plan.id === 'basic' || plan.id === activePlanId || startingPlanId) return

      const userId = localStorage.getItem('userId')
      if (!userId || !/^\d+$/.test(userId)) {
        setCheckoutError('Войдите в аккаунт продавца, чтобы купить подписку.')
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
        setCheckoutError(CHECKOUT_ERROR_TEXT[result.error] || result.error || 'Не удалось открыть оплату Stripe.')
        setStartingPlanId(null)
      }
    },
    [activePlanId, period, profile?.email, startingPlanId]
  )

  useEffect(() => {
    const checkout = searchParams.get('subscription_checkout')
    const sessionId = searchParams.get('session_id')
    const ownerPlan = searchParams.get('owner_plan')

    if (checkout === 'canceled') {
      setCheckoutError('Оплата отменена. Вы можете выбрать тариф ещё раз.')
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
          CHECKOUT_ERROR_TEXT[confirmed.error] ||
          'Оплата прошла, но подписка не синхронизировалась. Попробуйте обновить страницу или передайте session_id в поддержку.'
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
  }, [clearCheckoutParams, reloadProfile, searchParams])

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
  const successPlan = PLANS.find((plan) => plan.id === successPlanId)
  const successModal = successPlan ? (
    <div className="ost-success-modal" role="dialog" aria-modal="true" aria-labelledby="ost-success-title">
      <Confetti />
      <button
        type="button"
        className="ost-success-modal__backdrop"
        aria-label="Закрыть поздравление"
        onClick={() => setSuccessPlanId(null)}
      />
      <div className="ost-success-modal__panel">
        <button
          type="button"
          className="ost-success-modal__close"
          aria-label="Закрыть"
          onClick={() => setSuccessPlanId(null)}
        >
          <X size={20} strokeWidth={2.25} />
        </button>
        <div className="ost-success-modal__icon" aria-hidden>
          <Sparkles size={30} strokeWidth={2.2} />
        </div>
        <h2 id="ost-success-title" className="ost-success-modal__title">Поздравляем!</h2>
        <p className="ost-success-modal__text">
          Подписка «{successPlan.name}» успешно активирована. Новый тариф уже отображается в профиле.
        </p>
        <button
          type="button"
          className="ost-success-modal__btn"
          onClick={() => setSuccessPlanId(null)}
        >
          Отлично
        </button>
      </div>
    </div>
  ) : null

  const mainColumn = (
      <div className="ost-body">
        <header className="ost-header ost-desktop-only">
          <h1 className="ost-header__title">Подписки</h1>
          <div className="ost-header__actions">
            <OwnerNotificationsButton className="ost-icon-btn" badgeClassName="ost-icon-btn__badge" />
            <OwnerTestProfileMenu />
          </div>
        </header>

        <div className="ost-workspace">
          <div className="ost-mob-pagehead ost-mobile-only">
            <h1 className="ost-mob-pagehead__title">Подписки</h1>
          </div>

          <div className="ost-content">
            <div className="ost-billing">
              <div
                className="ost-period-tabs"
                role="tablist"
                aria-label="Период оплаты"
              >
                {PERIOD_TABS.map((tab) => (
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
              {PLANS.map((plan) => {
                const displayPrice = getPeriodPrice(plan, period)
                const isCurrent = plan.id === activePlanId
                const isPaidPlan = plan.id !== 'basic'
                const isStarting = startingPlanId === plan.id
                return (
                  <article
                    key={plan.id}
                    className={[
                      'ost-plan-card',
                      isCurrent && 'ost-plan-card--current',
                      plan.id === 'pro' && 'ost-plan-card--featured',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="ost-plan-card__head">
                      <h2 className="ost-plan-card__name">{plan.name}</h2>
                    </div>
                    <p className="ost-plan-card__price">
                      <span key={`${plan.id}-${period}`} className="ost-plan-card__amount">
                        {formatPrice(displayPrice)}
                      </span>
                      <span className="ost-plan-card__period">/ мес</span>
                    </p>
                    {isYearly && plan.price > 0 ? (
                      <div className="ost-plan-card__saving" aria-label="Годовой план выгоднее на 20%">
                        <span className="ost-plan-card__old-price">{formatPrice(plan.price)} / мес</span>
                        <span className="ost-plan-card__saving-badge">Выгоднее на 20%</span>
                      </div>
                    ) : (
                      <div className="ost-plan-card__saving ost-plan-card__saving--empty" aria-hidden />
                    )}
                    <ul className="ost-plan-card__features">
                      {plan.features.map((feature) => (
                        <li key={feature} className="ost-plan-card__feature">
                          <Check size={15} strokeWidth={2.5} aria-hidden />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <button type="button" className="ost-plan-card__btn ost-plan-card__btn--current" disabled>
                        Текущий тариф
                      </button>
                    ) : !isPaidPlan ? (
                      <button type="button" className="ost-plan-card__btn ost-plan-card__btn--current" disabled>
                        Бесплатный тариф
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="ost-plan-card__btn ost-plan-card__btn--select"
                        disabled={Boolean(startingPlanId)}
                        onClick={() => handlePlanCheckout(plan)}
                      >
                        {isStarting ? 'Открываем Stripe…' : 'Купить'}
                      </button>
                    )}
                  </article>
                )
              })}
            </div>

            <section className="ost-save-banner" aria-label="Скидка на годовой план">
              <div className="ost-save-banner__copy">
                <h2 className="ost-save-banner__title">Экономьте до 20% при оплате за год</h2>
                <p className="ost-save-banner__text">
                  Переключитесь на годовой план, и цены красиво пересчитаются со скидкой
                </p>
              </div>
              <button
                type="button"
                className="ost-save-banner__btn"
                onClick={() => setPeriod('yearly')}
              >
                Перейти на годовой план
              </button>
              <div className="ost-save-banner__icon-wrap" aria-hidden>
                <img src={OST_IMAGES.discountPercent} alt="" loading="lazy" decoding="async" />
              </div>
            </section>

            <OwnerAdStack cards={['premium', 'help']} className="ost-owner-ads" />
          </div>
        </div>
      </div>
  )

  if (isEmbedded) {
    return (
      <>
        {mainColumn}
        {successModal}
      </>
    )
  }

  return (
    <div className={`ost${menuOpen ? ' ost--menu-open' : ''}`}>
      <header className="ost-mob-topbar ost-mobile-only" aria-label="Мобильная шапка">
        <div className="ost-mob-topbar__slot ost-mob-topbar__slot--left">
          <button
            type="button"
            className="ost-mob-topbar__menu"
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="ost-mob-topbar__brand">
          <LogoMark />
          <span className="ost-logo__text">SellYourBrick</span>
        </div>
        <div className="ost-mob-topbar__slot ost-mob-topbar__slot--right">
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
        aria-label="Меню кабинета"
        aria-hidden={!menuOpen}
      >
        <div className="ost-drawer__head">
          <div className="ost-mob-topbar__brand">
            <LogoMark />
            <span className="ost-logo__text">SellYourBrick</span>
          </div>
          <button type="button" className="ost-drawer__close" aria-label="Закрыть меню" onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="ost-sidebar__divider ost-sidebar__divider--drawer" aria-hidden />
        <nav className="ost-nav ost-nav--drawer">{NAV_ITEMS.map(renderNavItem)}</nav>
      </aside>

      <aside className="ost-sidebar ost-desktop-only">
        <div className="ost-sidebar__brand">
          <span className="ost-logo__mark-slot" aria-hidden />
          <span className="ost-logo__text">SellYourBrick</span>
        </div>
        <div className="ost-sidebar__divider" aria-hidden />

        <nav className="ost-nav" aria-label="Кабинет продавца">
          {NAV_ITEMS.map(renderNavItem)}
        </nav>

        <div className="ost-sidebar-promo">
          <p className="ost-sidebar-promo__title">Станьте покупателем</p>
          <p className="ost-sidebar-promo__text">Ищите и бронируйте недвижимость на платформе</p>
          <button type="button" className="ost-btn ost-btn--primary ost-btn--sm">
            Стать покупателем
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
