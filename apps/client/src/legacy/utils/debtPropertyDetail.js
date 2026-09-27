const RISK_PRESENTATIONS = {
  red: {
    tone: 'high',
    labelKey: 'debtsHighRisk',
    shortLabelKey: 'debtRiskShort_high',
    descriptionKey: 'debtsHighRiskSubtitle',
  },
  yellow: {
    tone: 'medium',
    labelKey: 'debtsMediumRisk',
    shortLabelKey: 'debtRiskShort_medium',
    descriptionKey: 'debtsMediumRiskSubtitle',
  },
  green: {
    tone: 'low',
    labelKey: 'debtsLowRisk',
    shortLabelKey: 'debtRiskShort_low',
    descriptionKey: 'debtsLowRiskSubtitle',
  },
}

const UNKNOWN_RISK = {
  tone: 'unknown',
  labelKey: 'debtRiskUnknown',
  shortLabelKey: 'debtRiskUnknownShort',
  descriptionKey: 'debtRiskUnknownDescription',
}

const CATEGORY_FIELDS = [
  ['debt_utilities', 'utilities', 'debtRiskCategory_utilities'],
  ['debt_mortgage_pledge', 'mortgage', 'debtRiskCategory_mortgage'],
  ['debt_property_taxes', 'taxes', 'debtRiskCategory_taxes'],
  ['debt_arrest', 'arrest', 'debtRiskCategory_arrest'],
  ['debt_inherited', 'inherited', 'debtRiskCategory_inherited'],
  ['debt_third_party', 'third-party', 'debtRiskCategory_thirdParty'],
]

function isEnabled(value) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

export function getDebtRiskPresentation(severity) {
  return RISK_PRESENTATIONS[String(severity || '').toLowerCase()] || UNKNOWN_RISK
}

export function resolveDebtRiskPresentation(severity, t) {
  const meta = getDebtRiskPresentation(severity)
  if (typeof t !== 'function') {
    return {
      tone: meta.tone,
      label: meta.labelKey,
      shortLabel: meta.shortLabelKey,
      description: meta.descriptionKey,
    }
  }
  return {
    tone: meta.tone,
    label: t(meta.labelKey),
    shortLabel: t(meta.shortLabelKey),
    description: t(meta.descriptionKey),
  }
}

export function normalizeDebtAmount(value) {
  if (value == null || value === '') return null
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

export function buildDebtCategories(property = {}, t) {
  const categories = CATEGORY_FIELDS.flatMap(([field, id, labelKey]) =>
    isEnabled(property[field])
      ? [{ id, label: typeof t === 'function' ? t(labelKey) : labelKey }]
      : [],
  )
  const other = typeof property.debt_other === 'string' ? property.debt_other.trim() : ''
  if (other) categories.push({ id: 'other', label: other })
  return categories
}
