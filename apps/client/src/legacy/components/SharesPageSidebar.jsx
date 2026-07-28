import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Wallet,
  Banknote,
  Network,
  Eye,
  Building2,
  Coins,
  Share2,
  Layers,
} from 'lucide-react'
import { formatSharesPlatformStatValues } from '../utils/sharesListing'
import { publicAsset } from '../utils/publicAsset'
import './SharesPageSidebar.css'

const BENEFIT_ITEMS = [
  { icon: Wallet, titleKey: 'sharesSidebarBenefit1Title', descKey: 'sharesSidebarBenefit1Desc' },
  { icon: Banknote, titleKey: 'sharesSidebarBenefit2Title', descKey: 'sharesSidebarBenefit2Desc' },
  { icon: Network, titleKey: 'sharesSidebarBenefit3Title', descKey: 'sharesSidebarBenefit3Desc' },
  { icon: Eye, titleKey: 'sharesSidebarBenefit4Title', descKey: 'sharesSidebarBenefit4Desc' },
]

const STAT_ITEMS = [
  { icon: Building2, labelKey: 'sharesSidebarStatsObjects', valueKey: 'objectsAvailable' },
  { icon: Share2, labelKey: 'sharesSidebarStatsSharesSold', valueKey: 'sharesSold' },
  { icon: Layers, labelKey: 'sharesSidebarStatsMarketVolume', valueKey: 'marketVolume' },
  { icon: Wallet, labelKey: 'sharesSidebarStatsMinEntry', valueKey: 'minEntry' },
]

const PROMO_ART_IMAGE = publicAsset('images/external/shares-sidebar-promo-art.png')

function SharesPageSidebar({ platformStats = null }) {
  const { t, i18n } = useTranslation()
  const statValues = formatSharesPlatformStatValues(platformStats || {
    availableObjects: 0,
    totalSharesSold: 0,
    marketVolumeByCurrency: {},
    minimumInvestment: null,
  }, i18n.language)

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
