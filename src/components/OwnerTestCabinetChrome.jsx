import { useState, useCallback, useEffect } from 'react'
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
  Menu,
  X,
  Home,
  Briefcase,
  Plus,
  ClipboardList,
  SlidersHorizontal,
} from 'lucide-react'
import { MOT_PROMO_IMAGES } from '../pages/mainOwnerTestPromoImages'
import { useOwnerTestNav } from '../context/OwnerTestNavigationContext'
import {
  isNavItemActive,
  isTabItemActive,
  isTabbarView,
  NAV_ID_TO_VIEW,
  OWNER_VIEWS,
} from '../utils/ownerTestNav'
import './OwnerTestCabinetChrome.css'

const NAV_ITEMS = [
  { id: 'home', label: 'Главная', icon: LayoutDashboard },
  { id: 'properties', label: 'Мои объекты', icon: Building2 },
  { id: 'bookings', label: 'Брони', icon: CalendarCheck },
  { id: 'sales', label: 'Продажи', icon: ShoppingBag },
  { id: 'testdrive', label: 'Тест-драйв', icon: Car },
  { id: 'subscriptions', label: 'Подписки', icon: CreditCard },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'messages', label: 'Сообщения', icon: MessageSquare, badge: 3 },
  { id: 'settings', label: 'Настройки', icon: Settings },
]

const TAB_ITEMS = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'properties', label: 'Объекты', icon: Briefcase },
  { id: 'fab', fab: true },
  { id: 'bookings', label: 'Брони', icon: ClipboardList },
  { id: 'more', label: 'Ещё', icon: SlidersHorizontal },
]

function LogoMark({ className = '' }) {
  return (
    <svg className={`otc-logo__mark ${className}`.trim()} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="otc-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#53d8d3" />
          <stop offset="100%" stopColor="#089a95" />
        </linearGradient>
      </defs>
      <path d="M20 2L35 11v18L20 38 5 29V11L20 2z" fill="url(#otc-logo-grad)" />
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

export default function OwnerTestCabinetChrome({ children }) {
  const { view, goTo } = useOwnerTestNav()
  const [menuOpen, setMenuOpen] = useState(false)
  const showTabbar = isTabbarView(view)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    if (!menuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  const handleNavClick = useCallback(
    (navId) => {
      const target = NAV_ID_TO_VIEW[navId]
      if (target) goTo(target)
      closeMenu()
    },
    [goTo, closeMenu]
  )

  const renderNavItem = useCallback(
    ({ id, label, icon: Icon, badge }) => {
      const active = isNavItemActive(id, view)
      const className = `otc-nav__item${active ? ' otc-nav__item--active' : ''}`
      const target = NAV_ID_TO_VIEW[id]
      const inner = (
        <>
          <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden />
          <span>{label}</span>
          {badge != null && <span className="otc-nav__badge">{badge}</span>}
        </>
      )

      if (target) {
        return (
          <button key={id} type="button" className={className} onClick={() => handleNavClick(id)}>
            {inner}
          </button>
        )
      }

      return (
        <button key={id} type="button" className={className} onClick={closeMenu}>
          {inner}
        </button>
      )
    },
    [view, handleNavClick, closeMenu]
  )

  return (
    <div className={`otc${menuOpen ? ' otc--menu-open' : ''}${showTabbar ? ' otc--tabbar' : ''}`}>
      <header className="otc-mob-topbar otc-mobile-only" aria-label="Мобильная шапка">
        <div className="otc-mob-topbar__slot otc-mob-topbar__slot--left">
          <button
            type="button"
            className="otc-mob-topbar__menu"
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="otc-mob-topbar__brand">
          <LogoMark />
          <span className="otc-logo__text">SellYourBrick</span>
        </div>
        <div className="otc-mob-topbar__slot otc-mob-topbar__slot--right">
          <button type="button" className="otc-mob-topbar__bell" aria-label="Уведомления">
            <Bell size={22} strokeWidth={2} />
            <span className="otc-icon-btn__badge">3</span>
          </button>
        </div>
      </header>

      <div
        className="otc-drawer-backdrop otc-mobile-only"
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <aside
        className={`otc-drawer otc-mobile-only${menuOpen ? ' otc-drawer--open' : ''}`}
        aria-label="Меню кабинета"
        aria-hidden={!menuOpen}
      >
        <div className="otc-drawer__head">
          <div className="otc-mob-topbar__brand">
            <LogoMark />
            <span className="otc-logo__text">SellYourBrick</span>
          </div>
          <button type="button" className="otc-drawer__close" aria-label="Закрыть меню" onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="otc-sidebar__divider otc-sidebar__divider--drawer" aria-hidden />
        <nav className="otc-nav otc-nav--drawer">{NAV_ITEMS.map(renderNavItem)}</nav>
      </aside>

      <aside className="otc-sidebar otc-desktop-only">
        <div className="otc-sidebar__brand">
          <LogoMark />
          <span className="otc-logo__text">SellYourBrick</span>
        </div>
        <div className="otc-sidebar__divider" aria-hidden />
        <nav className="otc-nav" aria-label="Кабинет продавца">
          {NAV_ITEMS.map(renderNavItem)}
        </nav>
        <div className="otc-sidebar-promo">
          <div className="otc-sidebar-promo__body">
            <p className="otc-sidebar-promo__title">Станьте покупателем</p>
            <p className="otc-sidebar-promo__text">
              Ищите и бронируйте недвижимость на платформе
            </p>
            <button type="button" className="otc-btn otc-btn--primary otc-btn--sm">
              Стать покупателем
            </button>
          </div>
          <div className="otc-sidebar-promo__visual">
            <img src={MOT_PROMO_IMAGES.sidebarBuyer} alt="" loading="lazy" decoding="async" />
          </div>
        </div>
      </aside>

      <div className="otc-stage">{children}</div>

      {showTabbar && (
        <nav className="otc-tabbar otc-mobile-only" aria-label="Нижняя навигация">
          {TAB_ITEMS.map((item) => {
            if (item.fab) {
              return (
                <div key="fab" className="otc-tabbar__fab-slot">
                  <button
                    type="button"
                    className="otc-tabbar__fab"
                    aria-label="Добавить объект"
                    onClick={() => goTo(OWNER_VIEWS.ADD_PROPERTY)}
                  >
                    <Plus size={28} strokeWidth={2.5} />
                  </button>
                </div>
              )
            }
            const Icon = item.icon
            const active = isTabItemActive(item.id, view)
            const target = NAV_ID_TO_VIEW[item.id]
            return (
              <button
                key={item.id}
                type="button"
                className={`otc-tabbar__item${active ? ' otc-tabbar__item--active' : ''}`}
                onClick={() => target && goTo(target)}
              >
                <Icon size={22} strokeWidth={active ? 2.25 : 2} aria-hidden />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}
