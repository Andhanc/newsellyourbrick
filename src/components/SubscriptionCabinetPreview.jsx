import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiCheck } from 'react-icons/fi'
import './SubscriptionCabinetPreview.css'

const TIERS = {
  starter: {
    title: 'Starter',
    descKey: 'buyerPricing_starterDesc',
    showStrikePrice: true,
    priceWas: '$29',
    priceMain: '$0',
    featureKeys: ['buyerPricing_featS0', 'buyerPricing_featS1', 'buyerPricing_featS2'],
  },
  pro: {
    title: 'Pro',
    descKey: 'buyerPricing_proDesc',
    showStrikePrice: false,
    priceMain: '$99',
    featureKeys: ['buyerPricing_featP0', 'buyerPricing_featP1', 'buyerPricing_featP2'],
  },
  vip: {
    title: 'VIP',
    descKey: 'buyerPricing_vipDesc',
    showStrikePrice: false,
    priceMain: '$199',
    featureKeys: ['buyerPricing_featV0', 'buyerPricing_featV1', 'buyerPricing_featV2'],
  },
}

function nextTier(visual) {
  if (visual === 'starter') return 'pro'
  if (visual === 'pro') return 'vip'
  return null
}

function formatPeriodEnd(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return null
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function SubscriptionCabinetPreview({
  loading,
  currentVisual,
  subscription,
  onUpgradeNext,
  upgradeLoading,
  onSeeAll,
}) {
  const { t } = useTranslation()
  const perMonth = t('buyerPricing_perMonth')
  const current = TIERS[currentVisual] || TIERS.starter
  const upgrade = nextTier(currentVisual)
  const nextDef = upgrade ? TIERS[upgrade] : null
  const periodLine = formatPeriodEnd(subscription?.current_period_end)

  return (
    <div className="sub-cab-preview">
      {loading ? (
        <div className="sub-cab-preview__skeleton" aria-hidden>
          <div className="sub-cab-preview__sk sub-cab-preview__sk--lg" />
          <div className="sub-cab-preview__sk sub-cab-preview__sk--sm" />
        </div>
      ) : (
        <div className="sub-cab-preview__row">
          <article className="sub-cab-preview__card sub-cab-preview__card--current">
            <div className="sub-cab-preview__card-head">
              <div className="sub-cab-preview__titles">
                <h4 className="sub-cab-preview__name">{current.title}</h4>
                <p className="sub-cab-preview__desc">{t(current.descKey)}</p>
              </div>
              <span className="sub-cab-preview__pill sub-cab-preview__pill--active">
                {t('subCab_preview_active')}
              </span>
            </div>
            <div className="sub-cab-preview__price-block">
              {current.showStrikePrice ? (
                <>
                  <span className="sub-cab-preview__strike" aria-hidden>
                    {current.priceWas}
                  </span>
                  <span className="sub-cab-preview__price sub-cab-preview__price--hero">
                    {current.priceMain}
                  </span>
                </>
              ) : (
                <span className="sub-cab-preview__price sub-cab-preview__price--hero">
                  {current.priceMain}
                </span>
              )}
              <span className="sub-cab-preview__per">{perMonth}</span>
            </div>
            {periodLine ? (
              <p className="sub-cab-preview__period">
                <span className="sub-cab-preview__period-label">{t('buyerCabinet_periodEnd')}</span>
                {periodLine}
              </p>
            ) : null}
            <ul className="sub-cab-preview__features">
              {current.featureKeys.map((key) => (
                <li key={key} className="sub-cab-preview__feature">
                  <span className="sub-cab-preview__check" aria-hidden>
                    <FiCheck size={14} strokeWidth={2.5} />
                  </span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
            <button type="button" className="sub-cab-preview__cta sub-cab-preview__cta--muted" disabled>
              {t('subCab_preview_currentPlan')}
            </button>
          </article>

          {nextDef ? (
            <article className="sub-cab-preview__card sub-cab-preview__card--next">
              <p className="sub-cab-preview__upgrade-hint">{t('subCab_preview_upgradeHint')}</p>
              <div className="sub-cab-preview__card-head sub-cab-preview__card-head--compact">
                <h4 className="sub-cab-preview__name">{nextDef.title}</h4>
                <p className="sub-cab-preview__desc">{t(nextDef.descKey)}</p>
              </div>
              <div className="sub-cab-preview__price-block sub-cab-preview__price-block--compact">
                <span className="sub-cab-preview__price">{nextDef.priceMain}</span>
                <span className="sub-cab-preview__per">{perMonth}</span>
              </div>
              <ul className="sub-cab-preview__features sub-cab-preview__features--short">
                {nextDef.featureKeys.slice(0, 2).map((key) => (
                  <li key={key} className="sub-cab-preview__feature">
                    <span className="sub-cab-preview__check" aria-hidden>
                      <FiCheck size={14} strokeWidth={2.5} />
                    </span>
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="sub-cab-preview__cta"
                onClick={onUpgradeNext}
                disabled={upgradeLoading}
              >
                {upgrade === 'pro'
                  ? t('subCab_preview_upgradeToPro')
                  : t('subCab_preview_upgradeToVip')}
              </button>
            </article>
          ) : (
            <aside className="sub-cab-preview__max-tier">
              <p className="sub-cab-preview__max-tier-text">{t('subCab_preview_maxTier')}</p>
            </aside>
          )}
        </div>
      )}

      <Link to="/subscriptions" className="sub-cab-preview__see-all" onClick={onSeeAll}>
        {t('subCab_preview_seeAll')}
      </Link>
    </div>
  )
}
