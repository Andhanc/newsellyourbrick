import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getSoftLaunchBlockedFeatureForHref,
  isSoftLaunchExemptPath,
  isSoftLaunchFeatureBlocked,
  isSoftLaunchHrefBlocked,
  isSoftLaunchPathAllowed,
  isSoftLaunchSellerContourPath,
  shouldShowSoftLaunchUnavailable,
} from './softLaunchAccess.js'

const ALLOWED = [
  '/',
  '/auction',
  '/auction/buy-now',
  '/auction/property/abc-123',
  '/auction/spain/madrid/property/villa-1',
  '/co-investment',
  '/co-investment/share-1',
  '/shares',
  '/shares/old-id',
  '/debts',
  '/debts/property/d-1',
  '/property/p-1',
  '/property/p-1/test-drive',
  '/test-drive',
  '/test-drive/survey/tok',
  '/test-drive/feedback/tok',
  '/about',
  '/buyer',
  '/seller',
  '/private-club',
  '/wallet',
  '/deposit',
  '/profile',
  '/profile/bookings',
  '/profile/bookings/b1/check-in',
  '/data',
  '/history',
  '/subscriptions',
  '/favorites',
  '/compare',
  '/oauth-bridge',
  '/auth/telegram-callback',
  '/main',
  '/mobile-discover',
]

const BLOCKED = [
  '/owner-test',
  '/owner-test/wallet',
  '/owner-test/properties',
  '/owner-test/add-property',
  '/owner',
  '/owner/property/new',
  '/property/p-1/edit',
  '/main-owner-test',
  '/owner-wallet-test',
  '/owner-add-property-test',
  '/map',
  '/chat',
  '/calculator',
  '/bonuses',
  '/news',
  '/news/some-slug',
  '/sections',
  '/sellyourbrick',
  '/search-results',
  '/search-results/spain/madrid',
  '/test',
  '/profile/purchased/99',
  '/spain/madrid',
  '/spain/madrid/apartments',
]

const EXEMPT = ['/admin', '/admin/users', '/marketer']

test('allowlist paths are allowed', () => {
  for (const path of ALLOWED) {
    assert.equal(isSoftLaunchPathAllowed(path), true, path)
    assert.equal(shouldShowSoftLaunchUnavailable(path), false, path)
  }
})

test('blocklist paths show unavailable', () => {
  for (const path of BLOCKED) {
    assert.equal(isSoftLaunchPathAllowed(path), false, path)
    assert.equal(shouldShowSoftLaunchUnavailable(path), true, path)
  }
})

test('seller contour helpers', () => {
  assert.equal(isSoftLaunchSellerContourPath('/seller'), false)
  assert.equal(isSoftLaunchSellerContourPath('/seller/extra'), true)
  assert.equal(isSoftLaunchSellerContourPath('/owner-test/wallet'), true)
  assert.equal(isSoftLaunchSellerContourPath('/property/x/edit'), true)
  assert.equal(isSoftLaunchSellerContourPath('/buyer'), false)
  assert.equal(isSoftLaunchSellerContourPath('/wallet'), false)
})

test('admin and marketer are exempt', () => {
  for (const path of EXEMPT) {
    assert.equal(isSoftLaunchExemptPath(path), true, path)
    assert.equal(shouldShowSoftLaunchUnavailable(path), false, path)
  }
})

test('AI and seller role features are blocked in UI', () => {
  assert.equal(isSoftLaunchFeatureBlocked('sellerRole'), true)
  assert.equal(isSoftLaunchFeatureBlocked('aiAssistant'), true)
  assert.equal(isSoftLaunchFeatureBlocked('aiRealEstate'), true)
  assert.equal(isSoftLaunchFeatureBlocked('smartInvestor'), true)
  assert.equal(getSoftLaunchBlockedFeatureForHref('/calculator'), 'smartInvestor')
  assert.equal(getSoftLaunchBlockedFeatureForHref('/chat?assistant=1'), 'aiAssistant')
  assert.equal(getSoftLaunchBlockedFeatureForHref('/chat?manager=1'), 'managerChat')
  assert.equal(isSoftLaunchHrefBlocked('/map'), true)
  assert.equal(isSoftLaunchHrefBlocked('/seller'), false)
})
