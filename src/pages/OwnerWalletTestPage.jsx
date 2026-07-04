import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Menu,
  X,
  Calendar,
  ChevronDown,
  ArrowDownLeft,
  Flag,
  Percent,
  ArrowUpRight,
  MoreVertical,
  Info,
} from 'lucide-react'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import OwnerNotificationsButton from '../components/OwnerNotificationsButton'
import OwnerSupportButton from '../components/OwnerSupportButton'
import OwnerFloatingMobileNav from '../components/OwnerFloatingMobileNav'
import { OWNER_VIEWS } from '../context/OwnerTestNavigationContext'
import OwnerWalletMetricChart from '../components/OwnerWalletMetricChart'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import { useOwnerTestNavItems } from '../hooks/useOwnerTestNavItems'
import { useOwnerTestProfileOptional } from '../context/OwnerTestProfileContext'
import { getOwnerTestIntlLocale } from '../utils/ownerTestI18n'
import { OWNER_TEST_STANDALONE_HREF_MAP } from '../utils/ownerTestNav'
import { OWL_IMAGES } from './ownerWalletImages'
import {
  DEMO_WALLET_BALANCES,
  DEMO_WALLET_TRANSACTIONS,
  formatWalletAmount,
  formatWalletDate,
  formatWalletDateMobile,
  getWalletTxTypeMeta,
  getWalletTxStatusLabel,
  getWalletTxStatusTone,
  shouldShowWalletTxStatus,
} from '../utils/ownerWalletDemo'
import './OwnerWalletTestPage.css'
import './OwnerWalletTestPage.mobile.css'

const TX_TYPE_ICONS = {
  income: ArrowDownLeft,
  deal: Flag,
  commission: Percent,
  withdrawal: ArrowUpRight,
}

const INITIAL_VISIBLE = 5

function LogoMark({ className = '' }) {
  return (
    <svg className={`owl-logo__mark ${className}`.trim()} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="owl-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#33adbb" />
          <stop offset="100%" stopColor="#007d8a" />
        </linearGradient>
      </defs>
      <path d="M20 2L35 11v18L20 38 5 29V11L20 2z" fill="url(#owl-logo-grad)" />
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

function MetricInfo({ text }) {
  return (
    <span className="owl-metric__info-wrap">
      <button type="button" className="owl-metric__info" aria-label={text}>
        <Info size={14} strokeWidth={2} aria-hidden />
      </button>
      <span className="owl-metric__info-tip" role="tooltip">
        {text}
      </span>
    </span>
  )
}

function MobTxThumb({ row }) {
  if (row.type === 'platform_commission') {
    return (
      <span className="owl-mob-list__thumb owl-mob-list__thumb--commission" aria-hidden>
        <Percent size={20} strokeWidth={2.2} />
      </span>
    )
  }
  if (row.type === 'withdrawal') {
    return (
      <span className="owl-mob-list__thumb owl-mob-list__thumb--withdrawal" aria-hidden>
        <ArrowUpRight size={20} strokeWidth={2.2} />
      </span>
    )
  }
  if (row.propertyImage) {
    return <img src={row.propertyImage} alt="" className="owl-mob-list__thumb" loading="lazy" />
  }
  return <span className="owl-mob-list__thumb owl-mob-list__thumb--empty" aria-hidden />
}

function TxTypeCell({ typeId, t }) {
  const meta = getWalletTxTypeMeta(typeId, t)
  const Icon = TX_TYPE_ICONS[meta.icon] || ArrowDownLeft
  const toneClass =
    meta.icon === 'withdrawal'
      ? 'owl-tx-type__icon--withdrawal'
      : meta.icon === 'commission'
        ? 'owl-tx-type__icon--commission'
        : meta.icon === 'deal'
          ? 'owl-tx-type__icon--deal'
          : 'owl-tx-type__icon--income'

  return (
    <span className="owl-tx-type">
      <span className={`owl-tx-type__icon ${toneClass}`} aria-hidden>
        <Icon size={14} strokeWidth={2.2} />
      </span>
      {meta.label}
    </span>
  )
}

export default function OwnerWalletTestPage() {
  const { t, i18n } = useTranslation()
  const intlLocale = useMemo(() => getOwnerTestIntlLocale(i18n.language), [i18n.language])
  const { isEmbedded } = useOwnerTestEmbeddedNav()
  const profileCtx = useOwnerTestProfileOptional()
  const navItems = useOwnerTestNavItems({
    activeId: 'wallet',
    hrefMap: isEmbedded ? undefined : OWNER_TEST_STANDALONE_HREF_MAP,
  })
  const metricDefs = useMemo(
    () => [
      {
        id: 'available',
        label: t('ownerTest_walletAvailable'),
        hint: t('ownerTest_walletAvailableHint'),
        accent: 'green',
        decor: OWL_IMAGES.metricWallet,
      },
      {
        id: 'processing',
        label: t('ownerTest_walletProcessing'),
        hint: t('ownerTest_withdrawInfo'),
        accent: 'amber',
        decor: OWL_IMAGES.metricHourglass,
      },
      {
        id: 'withdrawnTotal',
        label: t('ownerTest_walletWithdrawnTotal'),
        hint: t('ownerTest_walletWithdrawnHint'),
        accent: 'teal',
        decor: 'chart',
      },
    ],
    [t]
  )
  const dateRangeLabel = useMemo(() => {
    const from = new Date(2024, 4, 1)
    const to = new Date(2024, 4, 31)
    const fromStr = from.toLocaleDateString(intlLocale, { day: 'numeric', month: 'long' })
    const toStr = to.toLocaleDateString(intlLocale, { day: 'numeric', month: 'long', year: 'numeric' })
    return `${fromStr} – ${toStr}`
  }, [intlLocale])
  const [menuOpen, setMenuOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)
  const [balances] = useState(DEMO_WALLET_BALANCES)
  const [transactions] = useState(DEMO_WALLET_TRANSACTIONS)

  const fullName = profileCtx?.fullName?.trim() || 'John Smith'
  const roleLabel = profileCtx?.roleLabel?.trim() || t('ownerTest_roleSeller')

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const visibleTransactions = useMemo(
    () => transactions.slice(0, visibleCount),
    [transactions, visibleCount]
  )

  const hasMore = visibleCount < transactions.length

  const metricValues = useMemo(
    () => ({
      available: balances.available,
      processing: balances.processing,
      withdrawnTotal: balances.withdrawnTotal,
    }),
    [balances]
  )

  const renderNavItem = useCallback(
    ({ id, label, icon: Icon, active, badge, href }) => {
      const className = `owl-nav__item${active ? ' owl-nav__item--active' : ''}`
      const inner = (
        <>
          <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden />
          <span>{label}</span>
          {badge != null && <span className="owl-nav__badge">{badge}</span>}
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
    document.documentElement.classList.add('owl-page-active')
    return () => document.documentElement.classList.remove('owl-page-active')
  }, [isEmbedded])

  useEffect(() => {
    if (!menuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  const mainColumn = (
    <div className="owl-body">
      <header className="owl-header owl-desktop-only">
        <div className="owl-header__copy">
          <h1 className="owl-header__title">{t('ownerTest_navWallet')}</h1>
          <p className="owl-header__subtitle">{t('buyerCabinet_cardHistorySubtitle')}</p>
        </div>
        <div className="owl-header__actions">
          <button type="button" className="owl-date-btn">
            <Calendar size={16} strokeWidth={2} aria-hidden />
            <span>{dateRangeLabel}</span>
            <ChevronDown size={16} strokeWidth={2} aria-hidden />
          </button>
          <OwnerSupportButton className="owl-icon-btn" />
          <OwnerNotificationsButton className="owl-icon-btn" badgeClassName="owl-icon-btn__badge" />
          <OwnerTestProfileMenu />
        </div>
      </header>

      <div className="owl-workspace">
        <div className="owl-mob-pagehead owl-mobile-only">
          <h1 className="owl-mob-pagehead__title">{t('ownerTest_navWallet')}</h1>
        </div>

        <div className="owl-content">
          <section className="owl-metrics" aria-label={t('ownerTest_ariaWalletBalance')}>
            {metricDefs.map(({ id, label, hint, accent, decor }) => (
              <article key={id} className={`owl-metric owl-metric--${accent}`}>
                <div className="owl-metric__body">
                  <span className="owl-metric__label">
                    {label}
                    {id !== 'withdrawnTotal' ? <MetricInfo text={hint} /> : null}
                  </span>
                  <strong className="owl-metric__value">
                    {formatWalletAmount(metricValues[id], { locale: intlLocale })}
                  </strong>
                  <p className="owl-metric__hint owl-desktop-only">{hint}</p>
                </div>
                {decor === 'chart' ? (
                  <OwnerWalletMetricChart className="owl-metric__decor owl-metric__decor--chart" />
                ) : (
                  <img src={decor} alt="" className="owl-metric__decor" loading="lazy" />
                )}
              </article>
            ))}
          </section>

          <section className="owl-history" aria-label={t('ownerTest_ariaTransactionHistory')}>
            <div className="owl-history__mob-head owl-mobile-only">
              <h2 className="owl-history__title">{t('ownerTest_ariaTransactionHistory')}</h2>
            </div>

            <div className="owl-history__head owl-desktop-only">
              <h2 className="owl-history__title">{t('ownerTest_ariaTransactionHistory')}</h2>
              <div className="owl-history__toolbar">
                <button type="button" className="owl-date-btn owl-date-btn--compact owl-desktop-only">
                  <Calendar size={16} strokeWidth={2} aria-hidden />
                  <span>{dateRangeLabel}</span>
                </button>
              </div>
            </div>

            {visibleTransactions.length === 0 ? (
              <div className="owl-empty">
                <h3 className="owl-empty__title">{t('walletPage_noTransactions')}</h3>
                <p className="owl-empty__text">{t('ownerTest_withdrawInfo')}</p>
              </div>
            ) : (
              <>
                <div className="owl-table-card owl-desktop-only">
                  <div className="owl-table-wrap">
                    <table className="owl-table">
                      <thead>
                        <tr>
                          <th>{t('buyerHistory_date')}</th>
                          <th>{t('bidHistoryPropertyDefault')}</th>
                          <th>{t('ownerTest_walletTxOperation')}</th>
                          <th>{t('propertyDetailSaleAmount')}</th>
                          <th>{t('buyerCabinet_billingStatus')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleTransactions.map((row) => {
                          const amountTone = row.amount >= 0 ? 'positive' : 'negative'
                          const statusTone = getWalletTxStatusTone(row.status)
                          return (
                            <tr key={row.id}>
                              <td>
                                <span className="owl-tx-date">{formatWalletDate(row.date, intlLocale)}</span>
                              </td>
                              <td>
                                <div className="owl-tx-object">
                                  {row.propertyImage ? (
                                    <img
                                      src={row.propertyImage}
                                      alt=""
                                      className="owl-tx-object__thumb"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <span className="owl-tx-object__placeholder" aria-hidden />
                                  )}
                                  <span className="owl-tx-object__text">
                                    <span className="owl-tx-object__title">{row.propertyTitle}</span>
                                    {row.propertyId ? (
                                      <span className="owl-tx-object__id">ID: {row.propertyId}</span>
                                    ) : null}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <TxTypeCell typeId={row.type} t={t} />
                              </td>
                              <td>
                                <span className={`owl-tx-amount owl-tx-amount--${amountTone}`}>
                                  {formatWalletAmount(row.amount, { signed: true, locale: intlLocale })}
                                </span>
                              </td>
                              <td>
                                {shouldShowWalletTxStatus(row.status) ? (
                                  <span className={`owl-tx-status owl-tx-status--${statusTone}`}>
                                    {getWalletTxStatusLabel(row.status, t)}
                                  </span>
                                ) : null}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <ul className="owl-mob-list owl-mobile-only">
                  {visibleTransactions.map((row) => {
                    const amountTone = row.amount >= 0 ? 'positive' : 'negative'
                    const statusTone = getWalletTxStatusTone(row.status)
                    const typeMeta = getWalletTxTypeMeta(row.type, t)
                    const displayTitle =
                      row.propertyTitle === '—'
                        ? typeMeta?.label || t('ownerTest_walletTxOperation')
                        : row.propertyTitle
                    return (
                      <li key={row.id} className="owl-mob-list__item">
                        <MobTxThumb row={row} />
                        <div className="owl-mob-list__main">
                          <p className="owl-mob-list__date">{formatWalletDateMobile(row.date, intlLocale)}</p>
                          <p className="owl-mob-list__title">{displayTitle}</p>
                        </div>
                        <div className="owl-mob-list__side">
                          <span className={`owl-tx-amount owl-tx-amount--${amountTone}`}>
                            {formatWalletAmount(row.amount, { signed: true, locale: intlLocale })}
                          </span>
                          {shouldShowWalletTxStatus(row.status) ? (
                            <span className={`owl-tx-status owl-tx-status--${statusTone}`}>
                              {getWalletTxStatusLabel(row.status, t)}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ul>

                {hasMore ? (
                  <div className="owl-history__more">
                    <button
                      type="button"
                      className="owl-history__more-btn"
                      onClick={() => setVisibleCount((prev) => prev + INITIAL_VISIBLE)}
                    >
                      {t('showMore', {
                        count: Math.min(INITIAL_VISIBLE, transactions.length - visibleCount),
                      })}
                      <ChevronDown size={16} strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )

  if (isEmbedded) {
    return <div className="owl owl--embedded">{mainColumn}</div>
  }

  return (
    <div className={`owl${menuOpen ? ' owl--menu-open' : ''}`}>
      <header className="owl-mob-topbar owl-mobile-only" aria-label={t('ownerTest_ariaMobileHeader')}>
        <div className="owl-mob-topbar__slot owl-mob-topbar__slot--left">
          <button
            type="button"
            className="owl-mob-topbar__menu"
            aria-label={t('ownerTest_ariaOpenMenu')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="owl-mob-topbar__brand">
          <LogoMark />
          <span className="owl-logo__text">{t('ownerTest_brandName')}</span>
        </div>
        <div className="owl-mob-topbar__slot owl-mob-topbar__slot--right">
          <OwnerSupportButton className="owl-mob-topbar__bell" iconSize={22} />
          <OwnerNotificationsButton
            className="owl-mob-topbar__bell"
            badgeClassName="owl-icon-btn__badge"
            iconSize={22}
          />
        </div>
      </header>

      <div className="owl-drawer-backdrop owl-mobile-only" aria-hidden={!menuOpen} onClick={closeMenu} />
      <aside
        className={`owl-drawer owl-mobile-only${menuOpen ? ' owl-drawer--open' : ''}`}
        aria-label={t('ownerTest_ariaCabinetMenu')}
        aria-hidden={!menuOpen}
      >
        <div className="owl-drawer__head">
          <div className="owl-mob-topbar__brand">
            <LogoMark />
            <span className="owl-logo__text">{t('ownerTest_brandName')}</span>
          </div>
          <button type="button" className="owl-drawer__close" aria-label={t('ownerTest_ariaCloseMenu')} onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="owl-sidebar__divider owl-sidebar__divider--drawer" aria-hidden />
        <nav className="owl-nav owl-nav--drawer">{navItems.map(renderNavItem)}</nav>
      </aside>

      <aside className="owl-sidebar owl-desktop-only">
        <div className="owl-sidebar__brand">
          <LogoMark />
          <span className="owl-logo__text">{t('ownerTest_brandName')}</span>
        </div>
        <div className="owl-sidebar__divider" aria-hidden />
        <nav className="owl-nav" aria-label={t('ownerTest_ariaSellerCabinet')}>
          {navItems.map(renderNavItem)}
        </nav>

        <div className="owl-sidebar-promo">
          <p className="owl-sidebar-promo__title">{t('ownerTest_adPremiumTitle')}</p>
          <p className="owl-sidebar-promo__text">{t('ownerTest_adPremiumText')}</p>
          <img
            src={OWL_IMAGES.promoExpand}
            alt=""
            className="owl-sidebar-promo__img"
            loading="lazy"
          />
        </div>

        <div className="owl-sidebar-user">
          <span className="owl-sidebar-user__avatar" aria-hidden>
            <svg viewBox="0 0 40 40">
              <defs>
                <linearGradient id="owl-user-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#33adbb" />
                  <stop offset="100%" stopColor="#007d8a" />
                </linearGradient>
              </defs>
              <circle cx="20" cy="20" r="20" fill="url(#owl-user-grad)" />
              <circle cx="20" cy="16" r="7" fill="#f8fafc" />
              <ellipse cx="20" cy="34" rx="11" ry="8" fill="#f8fafc" />
            </svg>
          </span>
          <span className="owl-sidebar-user__info">
            <span className="owl-sidebar-user__name">{fullName}</span>
            <span className="owl-sidebar-user__role">{roleLabel}</span>
          </span>
          <button type="button" className="owl-sidebar-user__menu" aria-label={t('ownerTest_ariaProfileMenu')}>
            <MoreVertical size={18} />
          </button>
        </div>
      </aside>

      {mainColumn}

      <OwnerFloatingMobileNav
        view={OWNER_VIEWS.WALLET}
        onOpenMenu={() => setMenuOpen(true)}
        menuOpen={menuOpen}
      />
    </div>
  )
}
