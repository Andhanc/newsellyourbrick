const RISK_PRESENTATIONS = {
  red: {
    tone: 'high',
    label: 'Высокий риск',
    shortLabel: 'Высокий',
    description: 'Красный — сложные и существенные задолженности',
  },
  yellow: {
    tone: 'medium',
    label: 'Средний риск',
    shortLabel: 'Средний',
    description: 'Жёлтый — часть вопросов потребует времени и расходов',
  },
  green: {
    tone: 'low',
    label: 'Низкий риск',
    shortLabel: 'Низкий',
    description: 'Зелёный — технические и процедурные моменты',
  },
}

const UNKNOWN_RISK = {
  tone: 'unknown',
  label: 'Риск оценивается',
  shortLabel: 'Оценивается',
  description: 'Полная оценка риска ещё формируется',
}

const CATEGORY_FIELDS = [
  ['debt_utilities', 'utilities', 'Коммунальные платежи'],
  ['debt_mortgage_pledge', 'mortgage', 'Банковский залог'],
  ['debt_property_taxes', 'taxes', 'Налоги на имущество'],
  ['debt_arrest', 'arrest', 'Аресты и ограничения'],
  ['debt_inherited', 'inherited', 'Наследственные обязательства'],
  ['debt_third_party', 'third-party', 'Обязательства перед третьими лицами'],
]

function isEnabled(value) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

export function getDebtRiskPresentation(severity) {
  return RISK_PRESENTATIONS[String(severity || '').toLowerCase()] || UNKNOWN_RISK
}

export function normalizeDebtAmount(value) {
  if (value == null || value === '') return null
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

export function buildDebtCategories(property = {}) {
  const categories = CATEGORY_FIELDS.flatMap(([field, id, label]) =>
    isEnabled(property[field]) ? [{ id, label }] : [],
  )
  const other = typeof property.debt_other === 'string' ? property.debt_other.trim() : ''
  if (other) categories.push({ id: 'other', label: other })
  return categories
}
