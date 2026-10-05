import test from 'node:test'
import assert from 'node:assert/strict'
import { getFavoriteDrawerMilestone } from './favoriteDrawerMilestone.js'

const dbProperty = { id: 293, source_table: 'properties_apartments' }

test('first real favorite ignores unrelated saved demo objects', () => {
  const mockMap = new Map([['recommended-1', true]])
  assert.equal(getFavoriteDrawerMilestone(dbProperty, undefined, new Set(), mockMap), 'first')
  assert.equal(
    getFavoriteDrawerMilestone(dbProperty, undefined, new Set(['properties_apartments:293']), mockMap),
    'compare',
  )
})

test('mock milestones count only current comparison group and visible objects', () => {
  const mockMap = new Map([
    ['nearby-1', true],
    ['recommended-999', true],
  ])
  const selected = { id: 2 }
  assert.equal(getFavoriteDrawerMilestone(selected, 'recommended', new Set(), mockMap), 'first')
  mockMap.set('recommended-1', true)
  assert.equal(getFavoriteDrawerMilestone(selected, 'recommended', new Set(), mockMap), 'compare')
})

test('apartment and flat demo favorites share a comparison group', () => {
  const mockMap = new Map([['apartment-1', true]])
  assert.equal(getFavoriteDrawerMilestone({ id: 1 }, 'flat', new Set(), mockMap), 'compare')
})
