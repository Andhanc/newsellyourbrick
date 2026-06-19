import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Coins, Wallet } from 'lucide-react'
import {
  formatMinimumShareInvestment,
  formatSharesPlatformStatValues,
} from '../utils/sharesListing'
import './SharesPageIntro.css'

const HERO_IMAGE = '/images/external/shares-hero-estate.jpg'

const CATEGORY_TABS = [
  { id: 'all', labelKey: 'sharesPageTabAll' },
  { id: 'residential', labelKey: 'sharesPageTabResidential' },
  { id: 'commercial', labelKey: 'sharesPageTabCommercial' },
  { id: 'land', labelKey: 'sharesPageTabLand' },
]

const STATS_CONFIG = [
  {
    id: 'objects',
    valueKey: 'objectsAvailable',
    labelKey: 'sharesPageStatObjectsAvailable',
    Icon: Building2,
  },
  {
    id: 'volume',
    valueKey: 'marketVolume',
    labelKey: 'sharesPageStatMarketVolume',
    Icon: Coins,
  },
  {
    id: 'entry',
    valueKey: 'minEntry',
    labelKey: 'sharesPageFloatMinLabel',
    Icon: Wallet,
  },
]

export function SharesPageIntroHead({
  activeCategory: controlledCategory,
  onCategoryChange,
  categoryCounts = null,
}) {
  const { t } = useTranslation()
  const [internalCategory, setInternalCategory] = useState('all')
  const activeCategory = controlledCategory ?? internalCategory

  const setActiveCategory = (id) => {
    if (controlledCategory === undefined) {
      setInternalCategory(id)
    }
    onCategoryChange?.(id)
  }

  return (
    <header className="shares-page-intro__head" aria-label={t('sharesPageTabsAria')}>
      <div className="shares-page-intro__tabs-wrap">
        <div className="shares-page-intro__tabs" role="tablist" aria-label={t('sharesPageTabsAria')}>
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeCategory === tab.id
            const count = tab.id === 'all' ? null : categoryCounts?.[tab.id]
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`shares-page-intro__tab${isActive ? ' is-active' : ''}`}
                onClick={() => setActiveCategory(tab.id)}
              >
                <span>{t(tab.labelKey)}</span>
                {count != null ? (
                  <span className="shares-page-intro__tab-count">{count}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}

export function SharesPageBanner({ minInvestment = null, platformStats = null }) {
  const { t, i18n } = useTranslation()
  const formattedMin =
    formatMinimumShareInvestment(minInvestment, i18n.language) ||
    t('sharesPageFloatMinValueFallback')
  const statValues = useMemo(
    () =>
      formatSharesPlatformStatValues(platformStats || {
        availableObjects: 0,
        totalSharesSold: 0,
        marketVolumeByCurrency: {},
        minimumInvestment: null,
      }, i18n.language),
    [platformStats, i18n.language],
  )

  return (
    <div className="shares-page-intro__banner">
      <div className="shares-page-intro__banner-visual" aria-hidden>
        <img
          src={HERO_IMAGE}
          alt=""
          className="shares-page-intro__banner-image"
          loading="eager"
          decoding="async"
        />
        <div className="shares-page-intro__banner-fade" />
        <div className="shares-page-intro__banner-tint" />
      </div>

      <div className="shares-page-intro__banner-copy">
        <div className="shares-page-intro__heading">
          <h2 className="shares-page-intro__banner-title">{t('sharesPageBannerTitle')}</h2>
          <p className="shares-page-intro__banner-price">
            {t('sharesPageBannerPriceFrom', { amount: formattedMin })}
          </p>
        </div>
        <p className="shares-page-intro__banner-desc">{t('sharesPageBannerDescription')}</p>

        <div className="shares-page-intro__stats">
          {STATS_CONFIG.map(({ id, valueKey, labelKey, Icon }) => (
            <div key={id} className="shares-page-intro__stat">
              <span className="shares-page-intro__stat-icon" aria-hidden>
                <Icon size={18} strokeWidth={2.1} />
              </span>
              <div className="shares-page-intro__stat-body">
                <span className="shares-page-intro__stat-value">{statValues[valueKey]}</span>
                <span className="shares-page-intro__stat-label">{t(labelKey)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** @deprecated Use SharesPageIntroHead + SharesPageBanner in page layout */
function SharesPageIntro(props) {
  return (
    <section className="shares-page-intro">
      <SharesPageIntroHead {...props} />
      <SharesPageBanner />
    </section>
  )
}

export default SharesPageIntro
