import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
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
  Bell,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react'
import { OST_IMAGES } from './ownerSubscriptionsTestImages'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
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
  { id: 'yearly', label: 'Ежегодно', badge: '-20%' },
  { id: 'lifetime', label: 'Пожизненный' },
]

const PLANS = [
  {
    id: 'basic',
    name: 'Базовый',
    prices: { monthly: 0, yearly: 0, lifetime: 0 },
    features: [
      { text: 'До 3 активных объектов' },
      { text: 'Базовая аналитика' },
      { text: 'Поддержка по email' },
    ],
    current: true,
  },
  {
    id: 'standard',
    name: 'Стандарт',
    prices: { monthly: 19, yearly: 15, lifetime: 199 },
    features: [
      { text: 'До 10 активных объектов' },
      { text: 'Расширенная аналитика' },
      { text: 'Приоритетная поддержка' },
      { text: 'Продвижение объектов' },
    ],
    highlighted: true,
  },
  {
    id: 'premium',
    name: 'Премиум',
    prices: { monthly: 49, yearly: 39, lifetime: 499 },
    features: [
      { text: 'Неограниченные объекты', accent: 'tiffany' },
      { text: 'Расширенная аналитика', accent: 'green' },
      { text: 'Приоритетная поддержка', accent: 'mint' },
      { text: 'VIP поддержка 24/7', accent: 'gold' },
      { text: 'Продвижение объектов' },
      { text: 'Персональный менеджер' },
    ],
    popular: true,
    featured: true,
  },
  {
    id: 'corporate',
    name: 'Корпоративный',
    prices: { monthly: 99, yearly: 79, lifetime: 999 },
    features: [
      { text: 'Все функции Премиум' },
      { text: 'API доступ' },
      { text: 'Индивидуальное решение' },
      { text: 'Персональный менеджер' },
    ],
  },
]

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

function formatPrice(amount, period) {
  if (period === 'lifetime') {
    return amount === 0 ? '$0' : `$${amount}`
  }
  return `$${amount}`
}

function PromoPercentIcon() {
  return (
    <svg className="ost-save-banner__icon" viewBox="0 0 56 56" aria-hidden>
      <defs>
        <linearGradient id="ost-save-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#53d8d3" />
          <stop offset="100%" stopColor="#089a95" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="40" height="40" rx="10" fill="url(#ost-save-grad)" />
      <text
        x="28"
        y="34"
        textAnchor="middle"
        fill="#fff"
        fontSize="18"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
      >
        %
      </text>
    </svg>
  )
}

export default function OwnerSubscriptionsTestPage() {
  const { isEmbedded } = useOwnerTestEmbeddedNav()
  const [period, setPeriod] = useState('monthly')
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

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

  const periodSuffix = useMemo(() => {
    if (period === 'lifetime') return ''
    return period === 'yearly' ? '/ мес' : '/ мес'
  }, [period])

  const mainColumn = (
      <div className="ost-body">
        <header className="ost-header ost-desktop-only">
          <h1 className="ost-header__title">Подписки</h1>
          <div className="ost-header__actions">
            <button type="button" className="ost-icon-btn" aria-label="Уведомления">
              <Bell size={20} strokeWidth={2} />
              <span className="ost-icon-btn__badge">3</span>
            </button>
            <OwnerTestProfileMenu />
          </div>
        </header>

        <div className="ost-workspace">
          <div className="ost-mob-pagehead ost-mobile-only">
            <h1 className="ost-mob-pagehead__title">Подписки</h1>
          </div>

          <div className="ost-content">
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
                    tab.id === 'lifetime' && 'ost-period-tabs__item--desktop-only',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setPeriod(tab.id)}
                >
                  {tab.label}
                  {tab.badge && (
                    <span className="ost-period-tabs__badge">{tab.badge}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="ost-plans-grid">
              {PLANS.map((plan) => (
                <article
                  key={plan.id}
                  className={[
                    'ost-plan-card',
                    plan.current && 'ost-plan-card--current',
                    plan.highlighted && 'ost-plan-card--highlighted',
                    plan.featured && 'ost-plan-card--featured',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="ost-plan-card__head">
                    <h2 className="ost-plan-card__name">{plan.name}</h2>
                    {plan.popular && (
                      <span className="ost-plan-card__badge">Популярный</span>
                    )}
                  </div>
                  <p className="ost-plan-card__price">
                    <span className="ost-plan-card__amount">
                      {formatPrice(plan.prices[period], period)}
                    </span>
                    {period !== 'lifetime' && (
                      <span className="ost-plan-card__period">{periodSuffix}</span>
                    )}
                    {period === 'lifetime' && plan.prices[period] > 0 && (
                      <span className="ost-plan-card__period"> разово</span>
                    )}
                  </p>
                  <ul className="ost-plan-card__features">
                    {plan.features.map((feature) => (
                      <li
                        key={feature.text}
                        className={
                          feature.accent
                            ? `ost-plan-card__feature ost-plan-card__feature--${feature.accent}`
                            : 'ost-plan-card__feature'
                        }
                      >
                        {feature.text}
                      </li>
                    ))}
                  </ul>
                  {plan.current ? (
                    <button type="button" className="ost-plan-card__btn ost-plan-card__btn--current" disabled>
                      Текущий тариф
                    </button>
                  ) : (
                    <button type="button" className="ost-plan-card__btn ost-plan-card__btn--select">
                      Выбрать
                    </button>
                  )}
                </article>
              ))}
            </div>

            <section className="ost-save-banner" aria-label="Скидка на годовой план">
              <div className="ost-save-banner__copy">
                <h2 className="ost-save-banner__title">Экономьте до 20% при оплате за год</h2>
                <p className="ost-save-banner__text">Выберите годовой план и получите скидку</p>
              </div>
              <div className="ost-save-banner__actions">
                <button
                  type="button"
                  className="ost-save-banner__btn"
                  onClick={() => setPeriod('yearly')}
                >
                  Перейти на годовой план
                </button>
                <PromoPercentIcon />
              </div>
            </section>
          </div>
        </div>
      </div>
  )

  if (isEmbedded) return mainColumn

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
          <button type="button" className="ost-mob-topbar__bell" aria-label="Уведомления">
            <Bell size={22} strokeWidth={2} />
            <span className="ost-icon-btn__badge">3</span>
          </button>
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
    </div>
  )
}
