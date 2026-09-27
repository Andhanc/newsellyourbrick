import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDebtCategories,
  getDebtRiskPresentation,
  normalizeDebtAmount,
  resolveDebtRiskPresentation,
} from './debtPropertyDetail.js'

const t = (key) => `t:${key}`

test('maps known debt severities to honest risk presentation keys', () => {
  assert.deepEqual(getDebtRiskPresentation('red'), {
    tone: 'high',
    labelKey: 'debtsHighRisk',
    shortLabelKey: 'debtRiskShort_high',
    descriptionKey: 'debtsHighRiskSubtitle',
  })
  assert.equal(getDebtRiskPresentation('yellow').tone, 'medium')
  assert.equal(getDebtRiskPresentation('green').tone, 'low')
})

test('uses a neutral state when debt severity is missing or invalid', () => {
  assert.deepEqual(getDebtRiskPresentation(null), {
    tone: 'unknown',
    labelKey: 'debtRiskUnknown',
    shortLabelKey: 'debtRiskUnknownShort',
    descriptionKey: 'debtRiskUnknownDescription',
  })
  assert.equal(getDebtRiskPresentation('blue').tone, 'unknown')
})

test('resolves risk presentation strings through the translator', () => {
  assert.deepEqual(resolveDebtRiskPresentation('red', t), {
    tone: 'high',
    label: 't:debtsHighRisk',
    shortLabel: 't:debtRiskShort_high',
    description: 't:debtsHighRiskSubtitle',
  })
  assert.equal(resolveDebtRiskPresentation(null, t).label, 't:debtRiskUnknown')
})

test('normalizes only positive finite debt amounts', () => {
  assert.equal(normalizeDebtAmount('125000'), 125000)
  assert.equal(normalizeDebtAmount(0), null)
  assert.equal(normalizeDebtAmount(''), null)
  assert.equal(normalizeDebtAmount('not-a-number'), null)
})

test('builds a stable list of real debt categories without inventing data', () => {
  const categories = buildDebtCategories(
    {
      debt_utilities: 1,
      debt_mortgage_pledge: true,
      debt_property_taxes: 0,
      debt_arrest: '1',
      debt_inherited: false,
      debt_third_party: true,
      debt_other: ' Судебные расходы ',
    },
    t,
  )

  assert.deepEqual(categories, [
    { id: 'utilities', label: 't:debtRiskCategory_utilities' },
    { id: 'mortgage', label: 't:debtRiskCategory_mortgage' },
    { id: 'arrest', label: 't:debtRiskCategory_arrest' },
    { id: 'third-party', label: 't:debtRiskCategory_thirdParty' },
    { id: 'other', label: 'Судебные расходы' },
  ])
  assert.deepEqual(buildDebtCategories({}), [])
})
