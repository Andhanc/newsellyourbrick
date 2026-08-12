import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (relative) => readFile(new URL(relative, import.meta.url), 'utf8')

test('paid Stripe reservation is the only source of a processing purchase request', async () => {
  const stripe = await read('../../server/stripeBilling.js')
  assert.match(stripe, /payment_status === 'paid'/)
  assert.match(stripe, /piObj\?\.status === 'succeeded'/)
  assert.match(stripe, /status: 'processing'/)
  assert.match(stripe, /auction_winners\.findFirst\(\{[\s\S]*user_id: userId/)
})

test('admin completion is blocked without a verified reservation payment', async () => {
  const server = await read('../../server/server.js')
  const admin = await read('./admin/PurchaseRequests.jsx')
  assert.match(server, /RESERVATION_PAYMENT_REQUIRED/)
  assert.match(server, /findPaidReservationByPurchaseRequestId/)
  assert.match(admin, /!paymentVerified/)
  assert.doesNotMatch(admin, /handleDelete/)
  assert.doesNotMatch(admin, /handleStatusUpdate\('processing'\)/)
})

test('purchase UI is a three-step mobile drawer with one PDF presentation', async () => {
  const modal = await read('./BuyNowModal.jsx')
  const modalStyles = await read('./BuyNowModal.css')
  const pdfLauncher = await read('../utils/reserveTermsPdfUrl.js')
  const reserveTerms = await readFile(
    new URL('../../public/documents/reserve-terms.pdf', import.meta.url)
  )
  assert.doesNotMatch(modal, /buy-now-modal__progress/)
  assert.doesNotMatch(modal, /Шаг \{step\} из 3/)
  assert.match(modal, /setStep\(3\)/)
  assert.match(modal, /launchReserveTermsPdf\(\)[\s\S]*setPdfOpened\(true\)/)
  assert.doesNotMatch(modal, /<iframe/)
  assert.match(modal, /purchaseVariant: isAuctionWinner \? 'auctionWinner' : 'buyNow'/)
  assert.match(modal, /!signatureReady/)
  assert.match(modal, /onInkChange=\{setSignatureReady\}/)
  assert.match(modalStyles, /html\.buy-now-modal-open \.property-ai-launcher/)
  assert.match(modalStyles, /\.buy-now-modal__cta \{[\s\S]*display: inline-flex;[\s\S]*justify-content: center;/)
  assert.match(modalStyles, /\.buy-now-modal--v2 \.buy-now-modal__cta > svg \{[\s\S]*position: static !important;/)
  assert.match(pdfLauncher, /window\.open\(url, '_blank', 'noopener,noreferrer'\)/)
  assert.match(pdfLauncher, /openedInNewTab: true/)
  assert.equal(reserveTerms.subarray(0, 4).toString(), '%PDF')
  assert.ok(reserveTerms.length > 50_000, 'reserve terms must not be a one-line placeholder')
  assert.doesNotMatch(reserveTerms.toString('latin1'), /Dummy PDF file/)
})

test('profile distinguishes a paid reserve from a completed sale', async () => {
  const assets = await read('./OwnerPurchasedAssets.jsx')
  const guide = await read('../pages/PurchasedObjectGuidePage.jsx')
  assert.match(assets, /Оплачен только резерв/)
  assert.match(assets, /ReservationDealProgress/)
  assert.match(guide, /Сейчас оплачен только резерв/)
  assert.match(guide, /dealCompleted \?/)
})
