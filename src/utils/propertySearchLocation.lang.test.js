import test from 'node:test'
import assert from 'node:assert/strict'
import { matchCountryKey, parsePropertyLocation } from './propertySearchLocation.js'

test('matchCountryKey accepts country names from every site language', () => {
  for (const name of ['Spain', 'Испания', 'Spanien', 'España', 'Espagne', 'Hiszpania']) {
    assert.equal(matchCountryKey(name), 'spain', name)
  }
  for (const name of ['Germany', 'Германия', 'Deutschland', 'Alemania', 'Allemagne', 'Niemcy', 'Tyskland']) {
    assert.equal(matchCountryKey(name), 'germany', name)
  }
})

test('parsePropertyLocation keeps Spain when the country field is translated', () => {
  const fromFields = parsePropertyLocation({
    country: 'Spanien',
    city: 'Adeje',
    location: 'Callao Salvaje, Adeje, Tenerife, Spanien',
  })
  assert.equal(fromFields?.countryKey, 'spain')

  const fromAddress = parsePropertyLocation({
    location: 'Calle Salvaje 12, Adeje, Spanien',
  })
  assert.equal(fromAddress?.countryKey, 'spain')
})
