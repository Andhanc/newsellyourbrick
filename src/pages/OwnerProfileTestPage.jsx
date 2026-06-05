import { useState, useEffect, useCallback } from 'react'
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
  Bell,
  Menu,
  X,
  Pencil,
  Wallet,
  ChevronRight,
  CheckCircle2,
  Eye,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import { OPR_IMAGES } from './ownerProfileTestImages'
import { OWNER_PROFILE_TABS, isOwnerProfileTabId } from './ownerProfileTestTabs'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import { useOwnerTestProfile } from '../context/OwnerTestProfileContext'
import { OWNER_VIEWS } from '../context/OwnerTestNavigationContext'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import { showNotification } from '../utils/toastHelper'
import './OwnerProfileTestPage.css'
import './OwnerProfileTestPage.mobile.css'

/**
 * Поля профиля продавца (из OwnerDashboard + макет):
 * — firstName, lastName, country, phone, email, address, passportNumber, identificationNumber
 * — subscription, depositStatus (отображение)
 * — avatar, role, memberSince
 * — notifications, statistics (вкладки настроек)
 */
const NAV_ITEMS = [
  { id: 'home', label: 'Главная', icon: LayoutDashboard, href: '/main-owner-test' },
  { id: 'properties', label: 'Мои объекты', icon: Building2, href: '/owner-properties-test' },
  { id: 'bookings', label: 'Брони', icon: CalendarCheck },
  { id: 'sales', label: 'Продажи', icon: ShoppingBag, href: '/owner-sales-test' },
  { id: 'testdrive', label: 'Тест-драйв', icon: Car, href: '/owner-test-drive' },
  { id: 'subscriptions', label: 'Подписки', icon: CreditCard, href: '/owner-subscriptions-test' },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'messages', label: 'Сообщения', icon: MessageSquare, badge: 3 },
  { id: 'settings', label: 'Настройки', icon: Settings, active: true },
]

const STATS_METRICS = [
  { label: 'Просмотры', value: '12 450', delta: '+12.5%', icon: Eye, tone: 'tiffany' },
  { label: 'Брони', value: '834', delta: '+8.2%', icon: CalendarCheck, tone: 'orange' },
  { label: 'Продажи', value: '128', delta: '+9.7%', icon: ShoppingBag, tone: 'teal' },
  { label: 'Доход', value: '$48 750', delta: '+24.3%', icon: DollarSign, tone: 'green' },
]

const STATS_TOP_PROPERTIES = [
  { name: 'Вилла у моря', views: '3 240', bookings: 42, revenue: '$12 400' },
  { name: 'Пентхаус Manhattan', views: '2 890', bookings: 31, revenue: '$9 850' },
  { name: 'Лофт в центре', views: '1 760', bookings: 18, revenue: '$5 200' },
]

const NOTIFICATION_SETTINGS = [
  { id: 'email', label: 'Email-уведомления', defaultOn: true },
  { id: 'push', label: 'Push-уведомления', defaultOn: true },
  { id: 'bookings', label: 'Новые брони', defaultOn: true },
  { id: 'sales', label: 'Продажи и ставки', defaultOn: true },
  { id: 'messages', label: 'Сообщения', defaultOn: false },
]

const APP_SETTINGS_TOGGLES = [
  { id: 'showPhone', label: 'Показывать телефон в объявлениях', defaultOn: true },
  { id: 'showEmail', label: 'Показывать email в объявлениях', defaultOn: false },
  { id: 'twoFactor', label: 'Двухфакторная аутентификация', defaultOn: false },
]

function LogoMark({ className = '' }) {
  return (
    <svg className={`opr-logo__mark ${className}`.trim()} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="opr-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#53d8d3" />
          <stop offset="100%" stopColor="#089a95" />
        </linearGradient>
      </defs>
      <path d="M20 2L35 11v18L20 38 5 29V11L20 2z" fill="url(#opr-logo-grad)" />
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

function ProfileAvatar({ large = false }) {
  return (
    <span className={`opr-avatar${large ? ' opr-avatar--lg' : ''}`} aria-hidden>
      <svg viewBox="0 0 80 80">
        <defs>
          <linearGradient id="opr-avatar-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#53d8d3" />
            <stop offset="100%" stopColor="#089a95" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r="40" fill="url(#opr-avatar-grad)" />
        <circle cx="40" cy="32" r="14" fill="#F8FAFC" />
        <ellipse cx="40" cy="68" rx="22" ry="16" fill="#F8FAFC" />
      </svg>
    </span>
  )
}

const SUB_PROMO_PERKS = [
  'Неограниченные объекты',
  'Продвижение в каталоге',
  'Приоритетная поддержка',
]

function SubscriptionPromo({ isEmbedded, goTo }) {
  return (
    <section className="opr-sub-promo" aria-label="Подписки и тарифы">
      <div className="opr-sub-promo__glow" aria-hidden />
      <div className="opr-sub-promo__body">
        <span className="opr-sub-promo__badge">−20% на годовой план</span>
        <h3 className="opr-sub-promo__title">Перейдите на Премиум</h3>
        <p className="opr-sub-promo__text">
          Больше просмотров, заявок и инструментов для роста продаж
        </p>
        <ul className="opr-sub-promo__list">
          {SUB_PROMO_PERKS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {isEmbedded ? (
          <button
            type="button"
            className="opr-btn opr-btn--primary opr-sub-promo__btn"
            onClick={() => goTo(OWNER_VIEWS.SUBSCRIPTIONS)}
          >
            Смотреть тарифы
          </button>
        ) : (
          <Link to="/owner-subscriptions-test" className="opr-btn opr-btn--primary opr-sub-promo__btn">
            Смотреть тарифы
          </Link>
        )}
      </div>
      <div className="opr-sub-promo__visual" aria-hidden>
        <img src={OPR_IMAGES.promoPremium} alt="" loading="lazy" decoding="async" />
      </div>
    </section>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="opr-toggle">
      <span className="opr-toggle__label">{label}</span>
      <input
        type="checkbox"
        className="opr-toggle__input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="opr-toggle__track" aria-hidden />
    </label>
  )
}

export default function OwnerProfileTestPage() {
  const { profile, loading, saving, fullName, roleLabel, updateProfile, saveProfile } =
    useOwnerTestProfile()
  const { isEmbedded, goTo, tab: embeddedTab } = useOwnerTestEmbeddedNav()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => {
    if (isEmbedded) {
      return isOwnerProfileTabId(embeddedTab) ? embeddedTab : 'personal'
    }
    const tab = searchParams.get('tab')
    return isOwnerProfileTabId(tab) ? tab : 'personal'
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState(() =>
    Object.fromEntries(NOTIFICATION_SETTINGS.map((n) => [n.id, n.defaultOn]))
  )
  const [appSettings, setAppSettings] = useState(() =>
    Object.fromEntries(APP_SETTINGS_TOGGLES.map((item) => [item.id, item.defaultOn]))
  )
  const [appPreferences, setAppPreferences] = useState({
    language: 'ru',
    currency: 'usd',
    timezone: 'minsk',
  })
  const [statsPeriod, setStatsPeriod] = useState('30d')

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const renderNavItem = useCallback(
    ({ id, label, icon: Icon, active, badge, href }) => {
      const className = `opr-nav__item${active ? ' opr-nav__item--active' : ''}`
      const inner = (
        <>
          <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden />
          <span>{label}</span>
          {badge != null && <span className="opr-nav__badge">{badge}</span>}
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

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    const result = await saveProfile()
    if (result.success) {
      showNotification('Изменения сохранены')
    } else {
      showNotification(result.error || 'Не удалось сохранить изменения')
    }
  }

  const selectProfileTab = useCallback(
    (tabId) => {
      setActiveTab(tabId)
      if (isEmbedded && goTo) {
        goTo(OWNER_VIEWS.PROFILE, tabId === 'personal' ? {} : { tab: tabId })
      } else if (tabId === 'personal') {
        setSearchParams({})
      } else {
        setSearchParams({ tab: tabId })
      }
    },
    [isEmbedded, goTo, setSearchParams]
  )

  useEffect(() => {
    if (isEmbedded) {
      if (isOwnerProfileTabId(embeddedTab)) {
        setActiveTab(embeddedTab)
      }
      return
    }
    const tab = searchParams.get('tab')
    if (isOwnerProfileTabId(tab)) {
      setActiveTab(tab)
      return
    }
    if (!tab) setActiveTab('personal')
  }, [isEmbedded, embeddedTab, searchParams])

  useEffect(() => {
    if (isEmbedded) return undefined
    document.documentElement.classList.add('opr-page-active')
    return () => document.documentElement.classList.remove('opr-page-active')
  }, [isEmbedded])

  useEffect(() => {
    if (!menuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  if (loading || !profile) {
    return (
      <div className="opr opr--loading">
        <p className="opr-loading-text">Загрузка профиля…</p>
      </div>
    )
  }

  const mainColumn = (
      <div className="opr-body">
        <header className="opr-header opr-desktop-only">
          <h1 className="opr-header__title">Профиль</h1>
          <div className="opr-header__actions">
            <button type="button" className="opr-icon-btn" aria-label="Уведомления">
              <Bell size={20} strokeWidth={2} />
              <span className="opr-icon-btn__badge">3</span>
            </button>
            <OwnerTestProfileMenu
              current
              activeTab={activeTab}
              onTabSelect={selectProfileTab}
            />
          </div>
        </header>

        <div className="opr-workspace">
          <div className="opr-content">
            <div className="opr-profile-tabs" role="tablist" aria-label="Разделы профиля">
              {OWNER_PROFILE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`opr-profile-tabs__item${activeTab === tab.id ? ' opr-profile-tabs__item--active' : ''}`}
                  onClick={() => selectProfileTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div
              className={[
                'opr-profile-layout',
                activeTab !== 'personal' && 'opr-profile-layout--desktop-hidden',
              ]
                .filter(Boolean)
                .join(' ')}
            >
                <div className="opr-profile-side">
                  <aside className="opr-profile-card">
                    <div className="opr-profile-card__avatar-wrap">
                      <ProfileAvatar large />
                      <button type="button" className="opr-profile-card__avatar-edit opr-mobile-only" aria-label="Изменить фото">
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                    </div>
                    <h2 className="opr-profile-card__name">{fullName}</h2>
                    <p className="opr-profile-card__role">{roleLabel}</p>
                    <p className="opr-profile-card__since">
                      {profile.memberSince || 'Участник платформы'}
                    </p>
                    <button type="button" className="opr-profile-card__photo-btn opr-desktop-only">
                      Изменить фото
                    </button>
                  </aside>

                  <SubscriptionPromo isEmbedded={isEmbedded} goTo={goTo} />
                </div>

                <form className="opr-profile-form" onSubmit={handleSaveProfile}>
                  <div className="opr-form-row">
                    <label className="opr-field">
                      <span className="opr-field__label">Имя</span>
                      <input
                        type="text"
                        className="opr-field__input"
                        value={profile.firstName}
                        onChange={(e) => updateProfile('firstName', e.target.value)}
                      />
                    </label>
                    <label className="opr-field">
                      <span className="opr-field__label">Фамилия</span>
                      <input
                        type="text"
                        className="opr-field__input"
                        value={profile.lastName}
                        onChange={(e) => updateProfile('lastName', e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="opr-form-row">
                    <label className="opr-field">
                      <span className="opr-field__label">Страна</span>
                      <input
                        type="text"
                        className="opr-field__input"
                        value={profile.country}
                        onChange={(e) => updateProfile('country', e.target.value)}
                      />
                    </label>
                    <label className="opr-field">
                      <span className="opr-field__label">Телефон</span>
                      <input
                        type="tel"
                        className="opr-field__input"
                        value={profile.phone}
                        onChange={(e) => updateProfile('phone', e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="opr-form-row">
                    <label className="opr-field">
                      <span className="opr-field__label">Почта</span>
                      <input
                        type="email"
                        className="opr-field__input"
                        value={profile.email}
                        onChange={(e) => updateProfile('email', e.target.value)}
                      />
                    </label>
                    <label className="opr-field">
                      <span className="opr-field__label">Адрес проживания</span>
                      <input
                        type="text"
                        className="opr-field__input"
                        value={profile.address}
                        onChange={(e) => updateProfile('address', e.target.value)}
                        autoComplete="street-address"
                      />
                    </label>
                  </div>

                  <div className="opr-form-row">
                    <label className="opr-field">
                      <span className="opr-field__label">Номер паспорта</span>
                      <input
                        type="text"
                        className="opr-field__input"
                        value={profile.passportNumber}
                        onChange={(e) => updateProfile('passportNumber', e.target.value)}
                        autoComplete="off"
                      />
                    </label>
                    <label className="opr-field">
                      <span className="opr-field__label">Идентификационный номер</span>
                      <input
                        type="text"
                        className="opr-field__input"
                        value={profile.identificationNumber}
                        onChange={(e) => updateProfile('identificationNumber', e.target.value)}
                        autoComplete="off"
                      />
                    </label>
                  </div>

                  <div className="opr-status-grid">
                    <article className="opr-status-card opr-status-card--subscription">
                      <div className="opr-status-card__bg" aria-hidden>
                        <img
                          className="opr-status-card__bg-img"
                          src={OPR_IMAGES.statusSubscriptionBg}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="opr-status-card__bg-shade" />
                      </div>
                      <div className="opr-status-card__content">
                        <div className="opr-status-card__head">
                          <div className="opr-status-card__icon" aria-hidden>
                            <CreditCard size={20} strokeWidth={2} />
                          </div>
                          <span className="opr-status-card__chip">Тариф</span>
                        </div>
                        <span className="opr-status-card__label">Подписка</span>
                        <p className="opr-status-card__value">{profile.subscription}</p>
                        <p className="opr-status-card__hint">Больше объектов и продвижение в каталоге</p>
                        {isEmbedded ? (
                          <button
                            type="button"
                            className="opr-status-card__action"
                            onClick={() => goTo(OWNER_VIEWS.SUBSCRIPTIONS)}
                          >
                            Повысить тариф
                            <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
                          </button>
                        ) : (
                          <Link to="/owner-subscriptions-test" className="opr-status-card__action">
                            Повысить тариф
                            <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
                          </Link>
                        )}
                      </div>
                    </article>

                    <article className={`opr-status-card opr-status-card--deposit opr-status-card--${profile.depositStatusKey}`}>
                      <div className="opr-status-card__bg" aria-hidden>
                        <img
                          className="opr-status-card__bg-img"
                          src={
                            profile.depositStatusKey === 'paid'
                              ? OPR_IMAGES.statusDepositBg
                              : OPR_IMAGES.statusDepositUnpaidBg
                          }
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="opr-status-card__bg-shade" />
                      </div>
                      <div className="opr-status-card__content">
                        <div className="opr-status-card__head">
                          <div className="opr-status-card__icon" aria-hidden>
                            {profile.depositStatusKey === 'paid' ? (
                              <CheckCircle2 size={20} strokeWidth={2} />
                            ) : (
                              <Wallet size={20} strokeWidth={2} />
                            )}
                          </div>
                          <span className={`opr-status-card__chip opr-status-card__chip--${profile.depositStatusKey}`}>
                            {profile.depositStatusKey === 'paid' ? 'Активен' : 'Ожидает'}
                          </span>
                        </div>
                        <span className="opr-status-card__label">Статус депозита</span>
                        <p className="opr-status-card__value">{profile.depositStatus}</p>
                        <p className="opr-status-card__hint">
                          {profile.depositStatusKey === 'paid'
                            ? 'Депозит активен, участие в аукционах доступно'
                            : 'Пополните депозит для участия в сделках'}
                        </p>
                      </div>
                    </article>
                  </div>

                  <button
                    type="submit"
                    className="opr-btn opr-btn--primary opr-profile-form__save"
                    disabled={saving}
                  >
                    {saving ? 'Сохранение…' : 'Сохранить изменения'}
                  </button>
                </form>
            </div>

            <div
              className={[
                'opr-panel',
                activeTab !== 'notifications' && 'opr-panel--hidden',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="opr-settings-list">
                {NOTIFICATION_SETTINGS.map((item) => (
                  <Toggle
                    key={item.id}
                    label={item.label}
                    checked={notifications[item.id]}
                    onChange={(value) =>
                      setNotifications((prev) => ({ ...prev, [item.id]: value }))
                    }
                  />
                ))}
              </div>
              <button type="button" className="opr-btn opr-btn--primary opr-profile-form__save">
                Сохранить изменения
              </button>
            </div>

            <div
              className={[
                'opr-panel',
                activeTab !== 'statistics' && 'opr-panel--hidden',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <section className="opr-stats" aria-label="Статистика">
                <div className="opr-stats__head">
                  <div>
                    <h2 className="opr-stats__title">Обзор показателей</h2>
                    <p className="opr-stats__subtitle">Динамика за выбранный период</p>
                  </div>
                  <div className="opr-stats-period" role="group" aria-label="Период">
                    {[
                      { id: '7d', label: '7 дней' },
                      { id: '30d', label: '30 дней' },
                      { id: 'year', label: 'Год' },
                    ].map((period) => (
                      <button
                        key={period.id}
                        type="button"
                        className={`opr-stats-period__btn${statsPeriod === period.id ? ' opr-stats-period__btn--active' : ''}`}
                        onClick={() => setStatsPeriod(period.id)}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="opr-stats-grid">
                  {STATS_METRICS.map((metric) => {
                    const Icon = metric.icon
                    return (
                      <article key={metric.label} className="opr-stat-card">
                        <span className={`opr-stat-card__icon opr-stat-card__icon--${metric.tone}`}>
                          <Icon size={18} strokeWidth={2} aria-hidden />
                        </span>
                        <span className="opr-stat-card__label">{metric.label}</span>
                        <span className="opr-stat-card__value">{metric.value}</span>
                        <span className="opr-stat-card__delta">
                          <TrendingUp size={14} strokeWidth={2.2} aria-hidden />
                          {metric.delta}
                        </span>
                      </article>
                    )
                  })}
                </div>

                <div className="opr-stats-table-wrap">
                  <h3 className="opr-stats-table__title">Топ объектов</h3>
                  <table className="opr-stats-table">
                    <thead>
                      <tr>
                        <th>Объект</th>
                        <th>Просмотры</th>
                        <th>Брони</th>
                        <th>Доход</th>
                      </tr>
                    </thead>
                    <tbody>
                      {STATS_TOP_PROPERTIES.map((row) => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td>{row.views}</td>
                          <td>{row.bookings}</td>
                          <td>{row.revenue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div
              className={[
                'opr-panel',
                activeTab !== 'settings' && 'opr-panel--hidden',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <section className="opr-app-settings" aria-label="Настройки приложения">
                <div className="opr-app-settings__card">
                  <h2 className="opr-app-settings__title">Общие</h2>
                  <div className="opr-app-settings__selects">
                    <label className="opr-field">
                      <span className="opr-field__label">Язык интерфейса</span>
                      <select
                        className="opr-field__input opr-field__select"
                        value={appPreferences.language}
                        onChange={(e) =>
                          setAppPreferences((prev) => ({ ...prev, language: e.target.value }))
                        }
                      >
                        <option value="ru">Русский</option>
                        <option value="en">English</option>
                      </select>
                    </label>
                    <label className="opr-field">
                      <span className="opr-field__label">Валюта</span>
                      <select
                        className="opr-field__input opr-field__select"
                        value={appPreferences.currency}
                        onChange={(e) =>
                          setAppPreferences((prev) => ({ ...prev, currency: e.target.value }))
                        }
                      >
                        <option value="usd">USD ($)</option>
                        <option value="eur">EUR (€)</option>
                      </select>
                    </label>
                    <label className="opr-field">
                      <span className="opr-field__label">Часовой пояс</span>
                      <select
                        className="opr-field__input opr-field__select"
                        value={appPreferences.timezone}
                        onChange={(e) =>
                          setAppPreferences((prev) => ({ ...prev, timezone: e.target.value }))
                        }
                      >
                        <option value="minsk">Europe/Minsk (UTC+3)</option>
                        <option value="moscow">Europe/Moscow (UTC+3)</option>
                        <option value="dubai">Asia/Dubai (UTC+4)</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="opr-settings-list">
                  <h2 className="opr-app-settings__title opr-app-settings__title--in-list">Приватность и безопасность</h2>
                  {APP_SETTINGS_TOGGLES.map((item) => (
                    <Toggle
                      key={item.id}
                      label={item.label}
                      checked={appSettings[item.id]}
                      onChange={(value) =>
                        setAppSettings((prev) => ({ ...prev, [item.id]: value }))
                      }
                    />
                  ))}
                </div>
              </section>
              <button type="button" className="opr-btn opr-btn--primary opr-profile-form__save">
                Сохранить изменения
              </button>
            </div>
          </div>
        </div>
      </div>
  )

  if (isEmbedded) return mainColumn

  return (
    <div className={`opr${menuOpen ? ' opr--menu-open' : ''}`}>
      <header className="opr-mob-topbar opr-mobile-only opr-mobile-only--profile-hidden" aria-label="Мобильная шапка">
        <div className="opr-mob-topbar__slot opr-mob-topbar__slot--left">
          <button
            type="button"
            className="opr-mob-topbar__menu"
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="opr-mob-topbar__brand">
          <LogoMark />
          <span className="opr-logo__text">SellYourBrick</span>
        </div>
        <div className="opr-mob-topbar__slot opr-mob-topbar__slot--right">
          <button type="button" className="opr-mob-topbar__bell" aria-label="Уведомления">
            <Bell size={22} strokeWidth={2} />
            <span className="opr-icon-btn__badge">3</span>
          </button>
        </div>
      </header>

      <header className="opr-mob-profile-head opr-mobile-only" aria-label="Профиль">
        {isEmbedded ? (
          <button
            type="button"
            className="opr-mob-profile-head__close"
            aria-label="Закрыть"
            onClick={() => goTo(OWNER_VIEWS.HOME)}
          >
            <X size={22} strokeWidth={2} />
          </button>
        ) : (
          <Link to="/main-owner-test" className="opr-mob-profile-head__close" aria-label="Закрыть">
            <X size={22} strokeWidth={2} />
          </Link>
        )}
        <h1 className="opr-mob-profile-head__title">Профиль</h1>
        <span className="opr-mob-profile-head__spacer" aria-hidden />
      </header>

      <div
        className="opr-drawer-backdrop opr-mobile-only"
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <aside
        className={`opr-drawer opr-mobile-only${menuOpen ? ' opr-drawer--open' : ''}`}
        aria-label="Меню кабинета"
        aria-hidden={!menuOpen}
      >
        <div className="opr-drawer__head">
          <div className="opr-mob-topbar__brand">
            <LogoMark />
            <span className="opr-logo__text">SellYourBrick</span>
          </div>
          <button type="button" className="opr-drawer__close" aria-label="Закрыть меню" onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="opr-sidebar__divider opr-sidebar__divider--drawer" aria-hidden />
        <nav className="opr-nav opr-nav--drawer">{NAV_ITEMS.map(renderNavItem)}</nav>
      </aside>

      <aside className="opr-sidebar opr-desktop-only">
        <div className="opr-sidebar__brand">
          <span className="opr-logo__mark-slot" aria-hidden />
          <span className="opr-logo__text">SellYourBrick</span>
        </div>
        <div className="opr-sidebar__divider" aria-hidden />
        <nav className="opr-nav" aria-label="Кабинет продавца">
          {NAV_ITEMS.map(renderNavItem)}
        </nav>
        <div className="opr-sidebar-promo">
          <p className="opr-sidebar-promo__title">Станьте покупателем</p>
          <p className="opr-sidebar-promo__text">Ищите и бронируйте недвижимость на платформе</p>
          <button type="button" className="opr-btn opr-btn--primary opr-btn--sm">
            Стать покупателем
          </button>
          <img
            className="opr-sidebar-promo__img"
            src={OPR_IMAGES.promoSidebarBuyer}
            alt=""
            loading="lazy"
          />
        </div>
      </aside>

      {mainColumn}
    </div>
  )
}
