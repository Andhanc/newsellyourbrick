import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizePassportAiPayload, parsePassportAiModelContent } from './passportAiExtract.js'

describe('passportAiExtract', () => {
  it('parses international passport json', () => {
    const raw = JSON.stringify({
      isIdentityDocument: true,
      documentType: 'passport',
      issuingCountry: 'ES',
      scriptLanguage: 'latin',
      passportNumber: 'PAA123456',
      identificationNumber: '12345678Z',
      passportSeries: '',
      firstName: 'Maria',
      lastName: 'Garcia',
      mrzPresent: true,
      detectedFieldLabels: ['Pasaporte', 'Nº pasaporte', 'DNI'],
      confidence: 0.91,
    })
    const parsed = parsePassportAiModelContent(raw)
    assert.equal(parsed.isPassport, true)
    assert.equal(parsed.passportNumber, 'PAA123456')
    assert.equal(parsed.identificationNumber, '12345678Z')
    assert.equal(parsed.issuingCountry, 'ES')
    assert.deepEqual(parsed.detectedFieldLabels, ['Pasaporte', 'Nº pasaporte', 'DNI'])
    assert.equal(parsed.source, 'gemini_vision')
  })

  it('accepts legacy isPassport field', () => {
    const normalized = normalizePassportAiPayload({
      isPassport: true,
      passportNumber: 'AB1',
      identificationNumber: '',
      confidence: 0.4,
    })
    assert.equal(normalized.isPassport, true)
    assert.equal(normalized.passportNumber, 'AB1')
    assert.equal(normalized.identificationNumber, null)
  })

  it('strips markdown fences', () => {
    const parsed = parsePassportAiModelContent(
      '```json\n{"isIdentityDocument":true,"documentType":"passport","issuingCountry":"BY","scriptLanguage":"cyrillic","passportNumber":"MP1234567","identificationNumber":"1234567A123PB1","passportSeries":"MP","firstName":"Ivan","lastName":"Ivanov","mrzPresent":true,"detectedFieldLabels":["Паспорт","Личный номер"],"confidence":0.88}\n```',
    )
    assert.equal(parsed.passportNumber, 'MP1234567')
    assert.equal(parsed.issuingCountry, 'BY')
  })
})
