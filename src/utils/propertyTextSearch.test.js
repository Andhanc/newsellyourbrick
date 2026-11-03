import assert from 'node:assert/strict'
import test from 'node:test'
import { filterPropertiesByTextSearch, propertyMatchesTextSearch } from './propertyTextSearch.js'

const villa = {
  title: 'Sea view',
  location: 'Barcelona, Spain',
  property_type: 'villa',
  description: 'Private pool and garden',
}

const flat = {
  title: 'City flat',
  location: 'Madrid, Spain',
  property_type: 'apartment',
  description_de: 'Helle Zimmer in der Stadt',
}

test('property form matches in every interface language', () => {
  assert.equal(propertyMatchesTextSearch(villa, 'вилла'), true)
  assert.equal(propertyMatchesTextSearch(villa, 'Villa'), true)
  assert.equal(propertyMatchesTextSearch(flat, 'Wohnung'), true)
  assert.equal(propertyMatchesTextSearch(flat, 'piso'), true)
  assert.equal(propertyMatchesTextSearch(flat, 'appartement'), true)
  assert.equal(propertyMatchesTextSearch(villa, 'дом'), false)
  assert.equal(propertyMatchesTextSearch(flat, 'вилла'), false)
})

test('location matches localized country and city names', () => {
  assert.equal(propertyMatchesTextSearch(villa, 'Испания'), true)
  assert.equal(propertyMatchesTextSearch(villa, 'Испании'), true)
  assert.equal(propertyMatchesTextSearch(villa, 'Spanien'), true)
  assert.equal(propertyMatchesTextSearch(villa, 'España'), true)
  assert.equal(propertyMatchesTextSearch(villa, 'Барселона'), true)
  assert.equal(propertyMatchesTextSearch(flat, 'Барселона'), false)
  assert.equal(propertyMatchesTextSearch(flat, 'Мадрид'), true)
})

test('description matches stored text and localized description fields', () => {
  assert.equal(propertyMatchesTextSearch(villa, 'pool'), true)
  assert.equal(propertyMatchesTextSearch(villa, 'бассейн'), false)
  assert.equal(propertyMatchesTextSearch(flat, 'Zimmer'), true)
})

test('every word must match location, form, or description', () => {
  assert.equal(propertyMatchesTextSearch(villa, 'вилла барселона'), true)
  assert.equal(propertyMatchesTextSearch(flat, 'вилла барселона'), false)
  assert.equal(propertyMatchesTextSearch(villa, 'вилла мадрид'), false)
})

test('owner rows search the raw property', () => {
  const row = {
    title: 'Sea view',
    location: 'Barcelona, Spain',
    displayId: 'OB-4',
    raw: { property_type: 'house', description: 'Семейный дом' },
  }
  assert.equal(propertyMatchesTextSearch(row, 'дом'), true)
  assert.equal(propertyMatchesTextSearch(row, 'OB-4', 'OB-4'), true)
})

test('short foreign words do not match unrelated English words', () => {
  const listing = {
    title: 'Refund policy',
    location: 'Madrid, Spain',
    property_type: 'apartment',
    description: 'All investments will be refunded in special cases.',
  }
  assert.equal(propertyMatchesTextSearch(listing, 'willa'), false)
  assert.equal(propertyMatchesTextSearch(listing, 'casa'), false)
  assert.equal(propertyMatchesTextSearch({ ...listing, property_type: 'villa', title: 'Two villas' }, 'willa'), true)
})

test('a saved translation is searchable in its own language', () => {
  const property = {
    title: 'Talaïa Residences',
    location: 'Tenerife, Spain',
    property_type: 'apartment',
    description: 'Portfolio of 28 units and a Bosch kitchen',
    search_corpus: [
      'Teneriffa. Neubau 2026 Küche Bosch',
      'Ténérife. Portefeuille cuisine Bosch',
      'Teneryfa. kuchnia Bosch',
      'Teneriffa. kök Bosch',
      'Tenerife. cocina Bosch',
    ],
  }
  assert.equal(propertyMatchesTextSearch(property, 'Küche'), true)
  assert.equal(propertyMatchesTextSearch(property, 'Teneriffa'), true)
  assert.equal(propertyMatchesTextSearch(property, 'Portefeuille'), true)
  assert.equal(propertyMatchesTextSearch(property, 'Teneryfa'), true)
  assert.equal(propertyMatchesTextSearch(property, 'kök'), true)
  assert.equal(propertyMatchesTextSearch(property, 'cocina'), true)
})

test('empty query keeps the full list', () => {
  assert.equal(filterPropertiesByTextSearch([villa, flat], '  ').length, 2)
})
