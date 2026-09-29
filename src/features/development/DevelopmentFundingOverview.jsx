import { useTranslation } from 'react-i18next'
import { ArrowUpRight } from 'lucide-react'
import { publicAsset } from '../../utils/publicAsset'
import { useDealFormat } from './DevelopmentFields'
import './DevelopmentFundingOverview.css'

export default function DevelopmentFundingOverview({
  project,
  canApply,
  onApply,
}) {
  const { t, i18n } = useTranslation()
  const fmt = useDealFormat(project.currency)
  const number = (value, digits = 0) =>
    Number.isFinite(Number(value)) && value != null
      ? new Intl.NumberFormat(i18n.language, {
          maximumFractionDigits: digits,
        }).format(Number(value))
      : '—'
  const metrics = [
    {
      key: 'yield',
      label: 'preferredReturn',
      value: `${number(project.terms.preferredReturn, 2)}%`,
    },
    {
      key: 'term',
      label: 'termMonths',
      value: `${number(project.terms.termMonths)} ${t('develop.months')}`,
    },
    {
      key: 'roi',
      label: 'grossRoi',
      value: `${number(project.economics?.grossRoi, 2)}%`,
    },
  ]
  return (
    <section
      className="dev-funding-overview"
      aria-label={t('develop.requiredCapital')}
    >
      <div className="dev-capital-costs">
        {[
          { key: 'landCost', label: 'landCostCard', art: 'land-cost-v1' },
          { key: 'constructionCost', label: 'constructionCostCard', art: 'construction-cost-v1' },
        ].map(({ key, label, art }) => (
          <section className={`dev-capital-cost dev-capital-cost--${key}`} key={key}>
            <div className="dev-capital-cost__copy">
              <h2>{t(`develop.${label}`)}</h2>
              <p>{fmt(project.terms[key])}</p>
            </div>
            <img
              src={publicAsset(`images/development/${art}.webp`)}
              alt=""
              aria-hidden="true"
            />
          </section>
        ))}
      </div>
      <section
        className="dev-metrics-promo"
        aria-labelledby="development-metrics-title"
      >
        <header className="dev-metrics-promo__heading">
          <h2 id="development-metrics-title">
            {t('develop.projectEconomics')}
          </h2>
          <p>{t('develop.projectEconomicsDescription')}</p>
        </header>
        <dl
          className="dev-metric-cards"
          tabIndex={0}
          aria-label={t('develop.projectEconomics')}
        >
          {metrics.map(({ key, label, value }) => (
            <div
              className={`dev-metric-card dev-metric-card--${key}`}
              key={key}
            >
              <img
                src={publicAsset(`images/development/${key}-art-v1.webp`)}
                alt=""
                aria-hidden="true"
                loading="lazy"
              />
              <dt aria-label={t(`develop.${label}`)}>
                {t(`develop.${key === 'yield' ? 'yieldCardLabel' : label}`)}
              </dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="dev-funding-overview__notes">
        {canApply && (
          <button
            className="dev-button dev-project-summary__cta"
            type="button"
            aria-haspopup="dialog"
            onClick={onApply}
          >
            {t('develop.expressInterest')}
            <ArrowUpRight size={18} />
          </button>
        )}
      </div>
    </section>
  )
}
