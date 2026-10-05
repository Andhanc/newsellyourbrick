import OwnerAddPropertyWizardSection from '../../components/OwnerAddPropertyWizardSection'
import { useTranslation } from 'react-i18next'
import {
  DEVELOPMENT_FIELDS,
  SELLER_GOALS,
  GOAL_MODELS,
  calculateWaterfall,
} from '../../utils/developmentFinance'
import './development.css'
export const EMPTY_TERMS = {
  landArea: '',
  builtArea: '',
  landCost: '',
  constructionCost: '',
  otherCosts: 0,
  expectedSale: '',
  requiredCapital: '',
  termMonths: '',
  preferredReturn: '',
  platformShare: '',
  license: '',
  assumptions: '',
}
export function useDealFormat(currency = 'EUR') {
  const { i18n } = useTranslation()
  return (value) =>
    value == null || !Number.isFinite(Number(value))
      ? '—'
      : new Intl.NumberFormat(i18n.language, {
          style: 'currency',
          currency,
          maximumFractionDigits: 0,
        }).format(Number(value))
}
export function Waterfall({ terms, currency = 'EUR' }) {
  const { t } = useTranslation(),
    fmt = useDealFormat(currency),
    result = calculateWaterfall(terms)
  if (!result) return null
  return (
    <section className="dev-panel">
      <h2>{t('develop.waterfall')}</h2>
      <p className="dev-muted">{t('develop.waterfallNote')}</p>
      <dl className="dev-metrics">
        {[
          'budget',
          'grossProfit',
          'capitalReturned',
          'sponsorCapitalReturned',
          'preferredPaid',
          'residual',
          'platformProfit',
          'developerProfit',
          'capitalLoss',
          'preferredShortfall',
        ].map((k) => (
          <div key={k}>
            <dt>{t(`develop.${k}`)}</dt>
            <dd>{fmt(result[k])}</dd>
          </div>
        ))}
      </dl>
      <p>
        {t('develop.investorRoi')}:{' '}
        <strong>{result.investorRoi.toFixed(2)}%</strong> ·{' '}
        {t('develop.investorIrr')}:{' '}
        <strong>{result.investorIrr.toFixed(2)}%</strong>
      </p>
      <p className="dev-muted">{t('develop.irrNote')}</p>
    </section>
  )
}
export default function DevelopmentFields({
  value = EMPTY_TERMS,
  onChange,
  errors = {},
  currency = 'EUR',
}) {
  const { t } = useTranslation()
  return (
    <div className="dev-feature dev-economics-form">
      <OwnerAddPropertyWizardSection
        number={1}
        title={t('develop.projectEconomics')}
        hint={t('develop.forecastNote')}
      >
        <div className="dev-form-grid">
          {DEVELOPMENT_FIELDS.map((k) => (
            <label key={k}>
              {t(`develop.${k}`)}{' '}
              {['landArea', 'builtArea'].includes(k)
                ? '(m²)'
                : ['platformShare', 'preferredReturn'].includes(k)
                  ? '(%)'
                  : k === 'termMonths'
                    ? ''
                    : `(${currency})`}
              <input
                type="number"
                min="0"
                max={
                  ['platformShare', 'preferredReturn'].includes(k)
                    ? 100
                    : k === 'termMonths'
                      ? 600
                      : 1e10
                }
                step="any"
                required
                value={value[k] ?? ''}
                aria-invalid={!!errors[k]}
                onChange={(e) => onChange({ ...value, [k]: e.target.value })}
              />
              {errors[k] && (
                <small role="alert">{t(`develop.${errors[k]}`)}</small>
              )}
            </label>
          ))}
        </div>
        <label>
          {t('develop.license')}
          <textarea
            value={value.license || ''}
            onChange={(e) => onChange({ ...value, license: e.target.value })}
          />
        </label>
        <label>
          {t('develop.assumptions')}
          <textarea
            value={value.assumptions || ''}
            onChange={(e) =>
              onChange({ ...value, assumptions: e.target.value })
            }
          />
        </label>
      </OwnerAddPropertyWizardSection>
      <Waterfall terms={value} currency={currency} />
    </div>
  )
}
export function SellerGoalSelector({ value = '', onChange }) {
  const { t } = useTranslation()
  return (
    <OwnerAddPropertyWizardSection
      className="dev-feature dev-goal-selector"
      title={t('develop.sellerGoal')}
    >
      <select
        aria-label={t('develop.sellerGoal')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{t('develop.chooseGoal')}</option>
        {SELLER_GOALS.map((k) => (
          <option value={k} key={k}>
            {t(`develop.goal_${k}`)}
          </option>
        ))}
      </select>
      {value && (
        <p>
          {t('develop.recommended')}:{' '}
          <strong>{t(`develop.model_${GOAL_MODELS[value]}`)}</strong>.{' '}
          {t('develop.goalNote')}
        </p>
      )}
    </OwnerAddPropertyWizardSection>
  )
}
