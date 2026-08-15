import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { hasMeaningfulDraftData } from './oapAddPropertyDraft.js'

describe('hasMeaningfulDraftData', () => {
  it('rejects empty initial form defaults', () => {
    assert.equal(
      hasMeaningfulDraftData({
        form: {
          title: '',
          description: '',
          calculatorApplied: false,
          pricingFieldSource: {},
          testDriveCurrency: 'EUR',
          listingCurrency: 'EUR',
        },
        step: 1,
        mobileScreen: 1,
      }),
      false,
    )
  })

  it('accepts filled title', () => {
    assert.equal(
      hasMeaningfulDraftData({
        form: { title: 'Villa', calculatorApplied: false, pricingFieldSource: {} },
        step: 1,
        mobileScreen: 1,
      }),
      true,
    )
  })

  it('accepts advanced mobile screen', () => {
    assert.equal(
      hasMeaningfulDraftData({
        form: { title: '', calculatorApplied: false, pricingFieldSource: {} },
        step: 1,
        mobileScreen: 3,
      }),
      true,
    )
  })
})
