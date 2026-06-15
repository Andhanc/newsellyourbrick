import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Wallet,
  Banknote,
  Network,
  Eye,
  Building2,
  Users,
  Layers,
  TrendingUp,
} from 'lucide-react'
import './SharesPageSidebar.css'

const BENEFIT_ITEMS = [
  { icon: Wallet, titleKey: 'sharesSidebarBenefit1Title', descKey: 'sharesSidebarBenefit1Desc' },
  { icon: Banknote, titleKey: 'sharesSidebarBenefit2Title', descKey: 'sharesSidebarBenefit2Desc' },
  { icon: Network, titleKey: 'sharesSidebarBenefit3Title', descKey: 'sharesSidebarBenefit3Desc' },
  { icon: Eye, titleKey: 'sharesSidebarBenefit4Title', descKey: 'sharesSidebarBenefit4Desc' },
]

const STAT_ITEMS = [
  { icon: Building2, labelKey: 'sharesSidebarStatsObjects', valueKey: 'objectsAvailable' },
  { icon: Users, labelKey: 'sharesSidebarStatsInvestors', valueKey: 'investors' },
  { icon: Layers, labelKey: 'sharesSidebarStatsVolume', valueKey: 'totalVolume' },
  { icon: TrendingUp, labelKey: 'sharesSidebarStatsYield', valueKey: 'averageYield' },
]

const DEFAULT_PLATFORM_STATS = {
  investors: 4832,
  totalVolume: 28_450_000,
  averageYield: '12.7%',
}

function formatObjectsCount(count, locale) {
  return new Intl.NumberFormat(locale).format(count)
}

function formatVolume(amount, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

const PROMO_ART_IMAGE = '/images/external/shares-sidebar-promo-art.png'

function SharesPageSidebar({ objectsAvailable = 0 }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language || 'ru'

  const statValues = {
    objectsAvailable: formatObjectsCount(objectsAvailable, locale),
    investors: formatObjectsCount(DEFAULT_PLATFORM_STATS.investors, locale),
    totalVolume: formatVolume(DEFAULT_PLATFORM_STATS.totalVolume, locale),
    averageYield: DEFAULT_PLATFORM_STATS.averageYield,
  }

  return (
    <aside className="shares-page-sidebar" aria-label={t('sharesSidebarAria')}>
      <section className="shares-sidebar-card">
        <h2 className="shares-sidebar-card__title">{t('sharesSidebarWhyTitle')}</h2>
        <ul className="shares-sidebar-benefits">
          {BENEFIT_ITEMS.map(({ icon: Icon, titleKey, descKey }) => (
            <li key={titleKey} className="shares-sidebar-benefits__item">
              <span className="shares-sidebar-benefits__icon" aria-hidden>
                <Icon size={18} strokeWidth={2} />
              </span>
              <div className="shares-sidebar-benefits__text">
                <span className="shares-sidebar-benefits__title">{t(titleKey)}</span>
                <span className="shares-sidebar-benefits__desc">{t(descKey)}</span>
              </div>
            </li>
          ))}
        </ul>
        <Link to="/calculator" className="shares-sidebar-card__btn">
          {t('sharesSidebarLearnMore')}
        </Link>
      </section>

      <section className="shares-sidebar-card">
        <h2 className="shares-sidebar-card__title">{t('sharesSidebarStatsTitle')}</h2>
        <ul className="shares-sidebar-stats">
          {STAT_ITEMS.map(({ icon: Icon, labelKey, valueKey }) => (
            <li key={valueKey} className="shares-sidebar-stats__row">
              <span className="shares-sidebar-stats__icon" aria-hidden>
                <Icon size={16} strokeWidth={2} />
              </span>
              <span className="shares-sidebar-stats__label">{t(labelKey)}</span>
              <span className="shares-sidebar-stats__value">{statValues[valueKey]}</span>
            </li>
          ))}
        </ul>
        <Link to="/calculator" className="shares-sidebar-card__btn">
          {t('sharesSidebarViewAnalytics')}
        </Link>
      </section>

      <section className="shares-sidebar-promo">
        <div className="shares-sidebar-promo__bg" aria-hidden />
        <div className="shares-sidebar-promo__inner">
          <div className="shares-sidebar-promo__copy">
            <h2 className="shares-sidebar-promo__title">{t('sharesSidebarCtaTitle')}</h2>
            <p className="shares-sidebar-promo__desc">{t('sharesSidebarCtaDesc')}</p>
          </div>
          <Link to="/calculator" className="shares-sidebar-promo__btn">
            {t('sharesSidebarCtaBtn')}
          </Link>
          <img
            src={PROMO_ART_IMAGE}
            alt=""
            className="shares-sidebar-promo__image"
            width={206}
            height={206}
            loading="lazy"
            decoding="async"
          />
        </div>
      </section>

      <section className="shares-sidebar-card shares-sidebar-card--help">
        <h2 className="shares-sidebar-card__title">{t('sharesSidebarHelpTitle')}</h2>
        <p className="shares-sidebar-help__desc">{t('sharesSidebarHelpDesc')}</p>
        <button
          type="button"
          className="shares-sidebar-card__btn"
          onClick={() => window.dispatchEvent(new CustomEvent('openManagerChat'))}
        >
          {t('sharesSidebarHelpBtn')}
        </button>
      </section>
    </aside>
  )
}

export default SharesPageSidebar
