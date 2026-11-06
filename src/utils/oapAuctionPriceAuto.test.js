import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  applyPricingFieldChange,
  PRICING_SOURCE_BUY_NOW,
  PRICING_SOURCE_MANUAL,
  PRICING_SOURCE_MINIMUM_SALE,
} from './oapAuctionPriceAuto.js'

const buyNowForm = {
  listingMode: 'auction_buy_now',
  price: '',
  minimumSalePrice: '',
  auctionStartingPrice: '',
  pricingFieldSource: {},
}

test('buy now fills minimum at 90% and starting bid at 30%', () => {
  const next = applyPricingFieldChange(buyNowForm, 'price', '100000')
  assert.equal(next.minimumSalePrice, '90000')
  assert.equal(next.auctionStartingPrice, '30000')
  assert.equal(next.pricingFieldSource.minimumSalePrice, PRICING_SOURCE_BUY_NOW)
  assert.equal(next.pricingFieldSource.auctionStartingPrice, PRICING_SOURCE_BUY_NOW)
})

test('calculated prices can be lowered and cannot exceed their share', () => {
  const filled = applyPricingFieldChange(buyNowForm, 'price', '100000')
  const loweredMin = applyPricingFieldChange(filled, 'minimumSalePrice', '50000')
  assert.equal(loweredMin.minimumSalePrice, '50000')
  assert.equal(loweredMin.auctionStartingPrice, '30000')
  assert.equal(loweredMin.pricingFieldSource.minimumSalePrice, PRICING_SOURCE_MANUAL)

  const tooHighMin = applyPricingFieldChange(filled, 'minimumSalePrice', '95000')
  assert.equal(tooHighMin.minimumSalePrice, '90000')

  const loweredStart = applyPricingFieldChange(filled, 'auctionStartingPrice', '10000')
  assert.equal(loweredStart.auctionStartingPrice, '10000')
  assert.equal(loweredStart.pricingFieldSource.auctionStartingPrice, PRICING_SOURCE_MANUAL)

  const tooHighStart = applyPricingFieldChange(filled, 'auctionStartingPrice', '50000')
  assert.equal(tooHighStart.auctionStartingPrice, '30000')
})

test('lowering the minimum also pulls the starting bid down to it', () => {
  const filled = applyPricingFieldChange(buyNowForm, 'price', '100000')
  const next = applyPricingFieldChange(filled, 'minimumSalePrice', '20000')
  assert.equal(next.minimumSalePrice, '20000')
  assert.equal(next.auctionStartingPrice, '20000')
  assert.equal(next.pricingFieldSource.auctionStartingPrice, PRICING_SOURCE_MINIMUM_SALE)
})

test('a manual price stays while buy now changes, then clamps to the new cap', () => {
  const filled = applyPricingFieldChange(buyNowForm, 'price', '100000')
  const custom = applyPricingFieldChange(filled, 'minimumSalePrice', '50000')
  const raised = applyPricingFieldChange(custom, 'price', '200000')
  assert.equal(raised.minimumSalePrice, '50000')
  assert.equal(raised.auctionStartingPrice, '50000')

  const lowered = applyPricingFieldChange(custom, 'price', '40000')
  assert.equal(lowered.minimumSalePrice, '36000')
  assert.equal(lowered.auctionStartingPrice, '12000')
})

test('clearing buy now clears prices that were still automatic', () => {
  const filled = applyPricingFieldChange(buyNowForm, 'price', '100000')
  const cleared = applyPricingFieldChange(filled, 'price', '')
  assert.equal(cleared.minimumSalePrice, '')
  assert.equal(cleared.auctionStartingPrice, '')
})

test('auction without buy now starts at one third of the minimum and cannot go higher', () => {
  const form = {
    listingMode: 'auction',
    minimumSalePrice: '',
    auctionStartingPrice: '',
    pricingFieldSource: {},
  }
  const filled = applyPricingFieldChange(form, 'minimumSalePrice', '90000')
  assert.equal(filled.auctionStartingPrice, '30000')
  assert.equal(filled.pricingFieldSource.auctionStartingPrice, PRICING_SOURCE_MINIMUM_SALE)

  const tooHigh = applyPricingFieldChange(filled, 'auctionStartingPrice', '40000')
  assert.equal(tooHigh.auctionStartingPrice, '30000')

  const lowered = applyPricingFieldChange(filled, 'auctionStartingPrice', '12000')
  assert.equal(lowered.auctionStartingPrice, '12000')
  assert.equal(lowered.pricingFieldSource.auctionStartingPrice, PRICING_SOURCE_MANUAL)
})

test('pricing step explains the 90% and 30% caps in web and legacy copies', async () => {
  const web = await readFile(new URL('../pages/OwnerAddPropertyPricingStep.jsx', import.meta.url), 'utf8')
  const legacy = await readFile(
    new URL('../../apps/client/src/legacy/pages/OwnerAddPropertyPricingStep.jsx', import.meta.url),
    'utf8',
  )
  assert.equal(web, legacy)
  assert.match(web, /oap_pricingAutoStartFromBuyNow/)
  assert.match(web, /oap_pricingManualMinCap/)
  assert.match(web, /oap_pricingManualStartCap/)
})
