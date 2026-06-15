import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Coins, TrendingUp } from 'lucide-react'
import './SharesPageIntro.css'

const HERO_VILLA_IMAGE = '/images/external/shares-hero-villa.jpg'

const CATEGORY_TABS = [
  { id: 'all', labelKey: 'sharesPageTabAll', count: null },
  { id: 'residential', labelKey: 'sharesPageTabResidential', count: 168 },
  { id: 'commercial', labelKey: 'sharesPageTabCommercial', count: 96 },
  { id: 'land', labelKey: 'sharesPageTabLand', count: 34 },
]

const STATS = [
  {
    id: 'objects',
    value: '568',
    labelKey: 'sharesPageStatObjectsAvailable',
    Icon: Building2,
  },
  {
    id: 'volume',
    value: '€28.45M',
    labelKey: 'sharesPageStatTotalVolume',
    Icon: Coins,
  },
  {
    id: 'yield',
    value: '12.7%',
    labelKey: 'sharesPageStatAvgYield',
    Icon: TrendingUp,
  },
]

function YieldSparkline() {
  return (
    <svg
      className="shares-page-intro__sparkline"
      viewBox="0 0 88 36"
      fill="none"
      aria-hidden
    >
      <path
        d="M2 28 L20 24 L34 18 L50 20 L66 12 L84 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="84" cy="6" r="3.5" fill="currentColor" />
    </svg>
  )
}

export function SharesPageIntroHead({
  activeCategory: controlledCategory,
  onCategoryChange,
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
    <header className="shares-page-intro__head" aria-labelledby="shares-page-intro-title">
      <h1 id="shares-page-intro-title" className="shares-page-intro__title">
        {t('sharesPageTitle')}
      </h1>
      <p className="shares-page-intro__subtitle">{t('sharesPageSubtitle')}</p>

      <div className="shares-page-intro__tabs-wrap">
        <div className="shares-page-intro__tabs" role="tablist" aria-label={t('sharesPageTabsAria')}>
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeCategory === tab.id
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
                {tab.count != null ? (
                  <span className="shares-page-intro__tab-count">{tab.count}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}

export function SharesPageBanner() {
  const { t } = useTranslation()

  return (
    <div className="shares-page-intro__banner">
      <div className="shares-page-intro__banner-copy">
        <h2 className="shares-page-intro__banner-title">{t('sharesPageBannerTitle')}</h2>
        <p className="shares-page-intro__banner-price">{t('sharesPageBannerPriceFrom')}</p>
        <p className="shares-page-intro__banner-desc">{t('sharesPageBannerDescription')}</p>

        <div className="shares-page-intro__highlight-cards">
          <div className="shares-page-intro__highlight-card shares-page-intro__highlight-card--yield">
            <span className="shares-page-intro__highlight-label">{t('sharesPageFloatYieldLabel')}</span>
            <div className="shares-page-intro__highlight-row">
              <div className="shares-page-intro__highlight-metric">
                <span className="shares-page-intro__highlight-value">{t('sharesPageFloatYieldValue')}</span>
                <span className="shares-page-intro__highlight-unit">{t('sharesPageFloatYieldPeriod')}</span>
              </div>
              <YieldSparkline />
            </div>
          </div>

          <div className="shares-page-intro__highlight-card shares-page-intro__highlight-card--min">
            <span className="shares-page-intro__highlight-label">{t('sharesPageFloatMinLabel')}</span>
            <span className="shares-page-intro__highlight-value">{t('sharesPageFloatMinValue')}</span>
            <span className="shares-page-intro__highlight-unit">{t('sharesPageFloatMinUnit')}</span>
          </div>
        </div>

        <div className="shares-page-intro__stats">
          {STATS.map(({ id, value, labelKey, Icon }) => (
            <div key={id} className="shares-page-intro__stat">
              <span className="shares-page-intro__stat-icon" aria-hidden>
                <Icon size={17} strokeWidth={2} />
              </span>
              <div className="shares-page-intro__stat-body">
                <span className="shares-page-intro__stat-value">{value}</span>
                <span className="shares-page-intro__stat-label">{t(labelKey)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="shares-page-intro__banner-visual">
        <div className="shares-page-intro__banner-image-wrap">
          <img
            src={HERO_VILLA_IMAGE}
            alt=""
            className="shares-page-intro__banner-image"
            loading="eager"
            decoding="async"
          />
          <div className="shares-page-intro__banner-image-fade" aria-hidden />
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
