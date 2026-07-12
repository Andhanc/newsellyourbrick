import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDebtCategories,
  getDebtRiskPresentation,
  normalizeDebtAmount,
} from './debtPropertyDetail.js'

test('maps known debt severities to honest risk presentation', () => {
  assert.deepEqual(getDebtRiskPresentation('red'), {
    tone: 'high',
    label: 'Высокий риск',
    shortLabel: 'Высокий',
    description: 'Красный — сложные и существенные задолженности',
  })
  assert.equal(getDebtRiskPresentation('yellow').tone, 'medium')
  assert.equal(getDebtRiskPresentation('green').tone, 'low')
})

test('uses a neutral state when debt severity is missing or invalid', () => {
  assert.deepEqual(getDebtRiskPresentation(null), {
    tone: 'unknown',
    label: 'Риск оценивается',
    shortLabel: 'Оценивается',
    description: 'Полная оценка риска ещё формируется',
  })
  assert.equal(getDebtRiskPresentation('blue').tone, 'unknown')
})

test('normalizes only positive finite debt amounts', () => {
  assert.equal(normalizeDebtAmount('125000'), 125000)
  assert.equal(normalizeDebtAmount(0), null)
  assert.equal(normalizeDebtAmount(''), null)
  assert.equal(normalizeDebtAmount('not-a-number'), null)
})

test('builds a stable list of real debt categories without inventing data', () => {
  const categories = buildDebtCategories({
    debt_utilities: 1,
    debt_mortgage_pledge: true,
    debt_property_taxes: 0,
    debt_arrest: '1',
    debt_inherited: false,
    debt_third_party: true,
    debt_other: ' Судебные расходы ',
  })

  assert.deepEqual(categories, [
    { id: 'utilities', label: 'Коммунальные платежи' },
    { id: 'mortgage', label: 'Банковский залог' },
    { id: 'arrest', label: 'Аресты и ограничения' },
    { id: 'third-party', label: 'Обязательства перед третьими лицами' },
    { id: 'other', label: 'Судебные расходы' },
  ])
  assert.deepEqual(buildDebtCategories({}), [])
})
