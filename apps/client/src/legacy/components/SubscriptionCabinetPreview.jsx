import { useTranslation } from 'react-i18next'
import { FiCheck } from 'react-icons/fi'
import './SubscriptionCabinetPreview.css'

const TIERS = {
  starter: {
    title: 'Starter',
    descKey: 'buyerPricing_starterDesc',
    showStrikePrice: true,
    priceWas: '€29',
    priceMain: '€0',
    featureKeys: ['buyerPricing_featS0', 'buyerPricing_featS1', 'buyerPricing_featS2'],
  },
  pro: {
    title: 'Pro',
    descKey: 'buyerPricing_proDesc',
    showStrikePrice: false,
    priceMain: '€149',
    featureKeys: ['buyerPricing_featP0', 'buyerPricing_featP1', 'buyerPricing_featP2'],
  },
  vip: {
    title: 'VIP',
    descKey: 'buyerPricing_vipDesc',
    showStrikePrice: false,
    priceMain: '€499',
    featureKeys: ['buyerPricing_featV0', 'buyerPricing_featV1', 'buyerPricing_featV2'],
  },
}

const TIER_ORDER = ['starter', 'pro', 'vip']

function tierIndex(visual) {
  const i = TIER_ORDER.indexOf(visual)
  return i === -1 ? 0 : i
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
  onSubscribePlan,
  upgradeLoading,
}) {
  const { t } = useTranslation()
  const perMonth = t('buyerPricing_perMonth')
  const cv = TIERS[currentVisual] ? currentVisual : 'starter'
  const periodLine = formatPeriodEnd(subscription?.current_period_end)
  const currentRank = tierIndex(cv)

  return (
    <div className="sub-cab-preview">
      {loading ? (
        <div className="sub-cab-preview__skeleton" aria-hidden>
          <div className="sub-cab-preview__sk sub-cab-preview__sk--cell" />
          <div className="sub-cab-preview__sk sub-cab-preview__sk--cell" />
          <div className="sub-cab-preview__sk sub-cab-preview__sk--cell" />
        </div>
      ) : (
        <div className="sub-cab-preview__row sub-cab-preview__row--three">
          {TIER_ORDER.map((tierId) => {
            const def = TIERS[tierId]
            const rank = tierIndex(tierId)
            const isCurrent = tierId === cv
            const isBelow = rank < currentRank
            const isAbove = rank > currentRank

            return (
              <article
                key={tierId}
                aria-current={isCurrent ? 'true' : undefined}
                className={`sub-cab-preview__card${isCurrent ? ' sub-cab-preview__card--current' : ''}${
                  isBelow ? ' sub-cab-preview__card--below' : ''
                }`}
              >
                {isCurrent ? (
                  <div className="sub-cab-preview__owned-ribbon" role="status">
                    {t('subCab_preview_currentPlan')}
                  </div>
                ) : null}
                <div className="sub-cab-preview__card-head">
                  <div className="sub-cab-preview__titles">
                    <h4 className="sub-cab-preview__name">{def.title}</h4>
                    <p className="sub-cab-preview__desc">{t(def.descKey)}</p>
                  </div>
                </div>
                <div className="sub-cab-preview__price-block">
                  {def.showStrikePrice ? (
                    <>
                      <span className="sub-cab-preview__strike" aria-hidden>
                        {def.priceWas}
                      </span>
                      <span className="sub-cab-preview__price sub-cab-preview__price--hero">{def.priceMain}</span>
                    </>
                  ) : (
                    <span className="sub-cab-preview__price sub-cab-preview__price--hero">{def.priceMain}</span>
                  )}
                  <span className="sub-cab-preview__per">{perMonth}</span>
                </div>
                {isCurrent && periodLine ? (
                  <p className="sub-cab-preview__period">
                    <span className="sub-cab-preview__period-label">{t('buyerCabinet_periodEnd')}</span>
                    {periodLine}
                  </p>
                ) : null}
                <ul className="sub-cab-preview__features sub-cab-preview__features--three">
                  {def.featureKeys.map((key) => (
                    <li key={key} className="sub-cab-preview__feature">
                      <span className="sub-cab-preview__check" aria-hidden>
                        <FiCheck size={12} strokeWidth={2.5} />
                      </span>
                      <span>{t(key)}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button type="button" className="sub-cab-preview__cta sub-cab-preview__cta--muted" disabled>
                    {t('subCab_preview_planPurchased')}
                  </button>
                ) : null}
                {isBelow ? (
                  <button type="button" className="sub-cab-preview__cta sub-cab-preview__cta--muted" disabled>
                    {t('subCab_preview_planBelow')}
                  </button>
                ) : null}
                {isAbove && tierId === 'pro' ? (
                  <button
                    type="button"
                    className="sub-cab-preview__cta"
                    onClick={() => onSubscribePlan?.('pro')}
                    disabled={upgradeLoading}
                  >
                    {t('subCab_preview_upgradeToPro')}
                  </button>
                ) : null}
                {isAbove && tierId === 'vip' ? (
                  <button
                    type="button"
                    className="sub-cab-preview__cta"
                    onClick={() => onSubscribePlan?.('vip')}
                    disabled={upgradeLoading}
                  >
                    {t('subCab_preview_upgradeToVip')}
                  </button>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
