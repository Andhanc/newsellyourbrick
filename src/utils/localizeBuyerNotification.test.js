import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BUYER_NOTIFICATION_TITLE_KEYS,
  getBuyerNotificationTitle,
  localizeNotificationLocation,
} from './localizeBuyerNotification.js'

const tDe = (key, opts = {}) => {
  const map = {
    toastBidOutbidTitle: 'Ihr Gebot wurde überboten',
    regionSpain: 'Spanien',
    regionMadrid: 'Madrid',
    notificationTitle_verificationSuccess: 'Verifizierung bestanden',
  }
  return map[key] || opts.defaultValue || key
}

test('outbid title is taken from i18n, not Russian DB string', () => {
  const title = getBuyerNotificationTitle(
    { type: 'bid_outbid', title: 'Вашу ставку перебили' },
    tDe,
  )
  assert.equal(title, 'Ihr Gebot wurde überboten')
})

test('location country and city are localized, street stays', () => {
  const localized = localizeNotificationLocation(
    'Испания, Мадрид, Calle de San Simón, 3',
    tDe,
    'de',
  )
  assert.match(localized, /Spanien/)
  assert.match(localized, /Madrid/)
  assert.match(localized, /Calle de San Simón/)
  assert.doesNotMatch(localized, /Испания/)
  assert.doesNotMatch(localized, /Мадрид/)
})

test('title map covers core buyer notification types', () => {
  assert.equal(BUYER_NOTIFICATION_TITLE_KEYS.bid_outbid, 'toastBidOutbidTitle')
  assert.equal(BUYER_NOTIFICATION_TITLE_KEYS.verification_success, 'notificationTitle_verificationSuccess')
  assert.equal(BUYER_NOTIFICATION_TITLE_KEYS.test_drive_request, 'notificationTitle_testDriveRequest')
})
