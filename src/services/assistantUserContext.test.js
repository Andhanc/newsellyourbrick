import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAssistantUserContext,
  invalidateAssistantUserContext,
  loadAssistantUserContext,
} from './assistantUserContext.js'

test('builds a compact cabinet snapshot for the assistant', () => {
  const context = buildAssistantUserContext({
    identity: { displayName: 'Anna I.', role: 'buyer' },
    catalog: [{ id: 42, title: 'Casa Azul', location: 'Spain, Malaga', price: 310000 }],
    payloads: {
      profile: {
        data: {
          first_name: 'Anna',
          last_name: 'Ivanova',
          country: 'Spain',
          city: 'Malaga',
          email: 'private@example.com',
          phone: '+34123456789',
        },
      },
      favorites: { data: [{ property_id: 42, property_table: 'properties' }] },
      ownedProperties: { data: [{ id: 70, title: 'My Loft', status: 'published' }] },
      bids: { data: [{ id: 3, property_id: 42, bid_amount: 285000 }] },
      auctionWins: { data: [{ id: 4, property_id: 91, winning_bid_amount: 250000 }] },
      reservations: { data: [{ id: 5, property_id: 92, status: 'reserved' }] },
      sharePurchases: { data: [{ id: 6, property_id: 93, total_paid: 20000 }] },
      bookings: { data: [{ id: 7, property_id: 94, property_title: 'Sea View', status: 'confirmed' }] },
      subscription: {
        data: {
          subscription: { plan_key: 'pro', status: 'active' },
          vipClub: { active: false },
        },
      },
      wallet: { data: { depositAmount: 1500, currency: 'EUR' } },
    },
  })

  assert.equal(context.profile.firstName, 'Anna')
  assert.equal(context.profile.city, 'Malaga')
  assert.equal(context.favorites.count, 1)
  assert.equal(context.favorites.items[0].title, 'Casa Azul')
  assert.equal(context.ownedProperties.count, 1)
  assert.equal(context.bids.items[0].amount, 285000)
  assert.equal(context.auctionWins.count, 1)
  assert.equal(context.reservations.count, 1)
  assert.equal(context.sharePurchases.count, 1)
  assert.equal(context.bookings.items[0].title, 'Sea View')
  assert.equal(context.subscription.plan, 'pro')
  assert.equal(context.wallet.depositAmount, 1500)
  assert.doesNotMatch(JSON.stringify(context), /private@example\.com|123456789/)
})

test('loads every cabinet source in parallel and caches the snapshot', async () => {
  const originalFetch = globalThis.fetch
  const requested = []
  globalThis.fetch = async (url) => {
    requested.push(String(url))
    return {
      ok: true,
      async json() {
        if (String(url).endsWith('/users/98765')) {
          return { success: true, data: { first_name: 'Anna', role: 'client' } }
        }
        return { success: true, data: [] }
      },
    }
  }

  try {
    invalidateAssistantUserContext('98765')
    const first = await loadAssistantUserContext({ userId: 98765 })
    const second = await loadAssistantUserContext({ userId: 98765 })

    assert.equal(first.profile.firstName, 'Anna')
    assert.equal(second, first)
    assert.equal(requested.length, 10)
    assert.ok(requested.some((url) => url.endsWith('/users/98765/favorites')))
    assert.ok(requested.some((url) => url.endsWith('/bids/user/98765')))
    assert.ok(requested.some((url) => url.endsWith('/test-drive-bookings/user/98765')))

    invalidateAssistantUserContext('98765')
    await loadAssistantUserContext({ userId: 98765 })
    assert.equal(requested.length, 20)
  } finally {
    invalidateAssistantUserContext('98765')
    globalThis.fetch = originalFetch
  }
})
