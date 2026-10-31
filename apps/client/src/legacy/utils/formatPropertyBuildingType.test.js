import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  COMPARE_BUILDING_TYPE_I18N_KEYS,
  formatPropertyBuildingType,
  formatPropertyCommercialType,
  resolvePropertyBuildingTypeKey,
} from './formatPropertyBuildingType.js'

const LABELS = {
  addPropertyDetailsBuildingMonolithic: 'Monolithique',
  addPropertyDetailsBuildingBrick: 'Brique',
  addPropertyDetailsBuildingPanel: 'Panneau',
  addPropertyDetailsBuildingBlock: 'Bloc',
  addPropertyDetailsBuildingWood: 'Bois',
  addPropertyDetailsBuildingFrame: 'Ossature',
  addPropertyDetailsBuildingAerated: 'Béton cellulaire',
  addPropertyDetailsBuildingFoam: 'Béton mousse',
  addPropertyDetailsBuildingOther: 'Autre',
  comparePage_building_monolithic: 'Monolithe',
}

const t = (key) => LABELS[key] || key

test('resolves English keys and Russian legacy labels', () => {
  assert.equal(resolvePropertyBuildingTypeKey('monolithic'), 'monolithic')
  assert.equal(resolvePropertyBuildingTypeKey('Монолит'), 'monolithic')
  assert.equal(resolvePropertyBuildingTypeKey('монолитный'), 'monolithic')
  assert.equal(resolvePropertyBuildingTypeKey('Кирпич'), 'brick')
  assert.equal(resolvePropertyBuildingTypeKey('Панель'), 'panel')
  assert.equal(resolvePropertyBuildingTypeKey('aerated_concrete'), 'aerated_concrete')
  assert.equal(resolvePropertyBuildingTypeKey('Газобетон'), 'aerated_concrete')
})

test('formats building type into the active locale', () => {
  assert.equal(formatPropertyBuildingType('Монолит', t), 'Monolithique')
  assert.equal(formatPropertyBuildingType('monolithic', t), 'Monolithique')
  assert.equal(formatPropertyBuildingType('Кирпич', t), 'Brique')
  assert.equal(
    formatPropertyBuildingType('Монолит', t, { keyMap: COMPARE_BUILDING_TYPE_I18N_KEYS }),
    'Monolithe',
  )
})

test('unknown values fall back to the raw string', () => {
  assert.equal(formatPropertyBuildingType('Custom steel', t), 'Custom steel')
  assert.equal(formatPropertyBuildingType('', t, { fallback: '—' }), '—')
  assert.equal(formatPropertyBuildingType(null, t, { fallback: '—' }), '—')
})

test('formats commercial type codes and Russian aliases', () => {
  const labels = {
    oap_commercialTypeOffice: 'Bureau',
    oap_commercialTypeShop: 'Commerce',
    oap_commercialTypeWarehouse: 'Entrepôt',
    oap_commercialTypeOther: 'Autre',
  }
  const tc = (key) => labels[key] || key
  assert.equal(formatPropertyCommercialType('office', tc), 'Bureau')
  assert.equal(formatPropertyCommercialType('Офис', tc), 'Bureau')
  assert.equal(formatPropertyCommercialType('склад', tc), 'Entrepôt')
})
