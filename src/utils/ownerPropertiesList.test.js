import { describe, expect, it } from 'vitest'
import {
  countOwnerPropertiesByTab,
  filterOwnerProperties,
  getOwnerPropertyRecencyTs,
  mapApiPropertyToOwnerListRow,
  resolveSourcePurchasedPropertyId,
  sortOwnerPropertiesByNewest,
} from './ownerPropertiesList.js'

describe('ownerPropertiesList novelty sort', () => {
  it('ignores SQLite datetime(now) literal in created_at', () => {
    const row = mapApiPropertyToOwnerListRow({
      id: 18,
      title: 'old',
      created_at: "datetime('now')",
      updated_at: '2026-07-13T18:24:04.341Z',
      property_type: 'apartment',
      moderation_status: 'approved',
    })
    expect(row.createdAtTs).toBe(0)
    expect(getOwnerPropertyRecencyTs(row)).toBe(0)
  })

  it('orders newest added first by higher id', () => {
    const rows = sortOwnerPropertiesByNewest([
      mapApiPropertyToOwnerListRow({
        id: 18,
        title: 'kvartira new new test',
        created_at: "datetime('now')",
        updated_at: '2026-07-13T20:00:00.000Z',
        property_type: 'apartment',
        moderation_status: 'approved',
      }),
      mapApiPropertyToOwnerListRow({
        id: 82,
        title: 'майами',
        created_at: "datetime('now')",
        updated_at: '2026-06-01T00:00:00.000Z',
        property_type: 'apartment',
        moderation_status: 'approved',
      }),
      mapApiPropertyToOwnerListRow({
        id: 90,
        title: 'brand new',
        created_at: '2026-08-14T01:00:00.000Z',
        property_type: 'apartment',
        moderation_status: 'approved',
      }),
    ])
    expect(rows.map((r) => r.title)).toEqual(['brand new', 'майами', 'kvartira new new test'])
  })
})

describe('ownerPropertiesList purchased tab', () => {
  const listing = mapApiPropertyToOwnerListRow({
    id: 82,
    title: 'майами',
    property_type: 'apartment',
    moderation_status: 'approved',
  })
  const purchased = {
    id: 39,
    title: 'Palm-Mar',
    isPurchased: true,
    filterKey: 'purchased',
    listingType: 'buy_now',
    displayId: 'BUY-39',
  }

  it('counts purchased separately from listing statuses', () => {
    const counts = countOwnerPropertiesByTab([listing, purchased])
    expect(counts.all).toBe(2)
    expect(counts.purchased).toBe(1)
    expect(counts.active).toBe(1)
  })

  it('keeps purchased rows in all objects and in the purchased tab only', () => {
    const all = filterOwnerProperties([listing, purchased], { tab: 'all' })
    expect(all.map((row) => row.title)).toEqual(['Palm-Mar', 'майами'])

    const onlyPurchased = filterOwnerProperties([listing, purchased], { tab: 'purchased' })
    expect(onlyPurchased.map((row) => row.title)).toEqual(['Palm-Mar'])

    const active = filterOwnerProperties([listing, purchased], { tab: 'active' })
    expect(active.map((row) => row.title)).toEqual(['майами'])
  })
})

describe('ownerPropertiesList purchased source id', () => {
  it('reads source_purchased_property_id from tz parameters', () => {
    const row = mapApiPropertyToOwnerListRow({
      id: 104,
      title: '234',
      property_type: 'apartment',
      moderation_status: 'pending',
      tz_parameters_json: { bathrooms: 1, source_purchased_property_id: 79 },
    })
    expect(row.sourcePurchasedPropertyId).toBe(79)
    expect(resolveSourcePurchasedPropertyId(row.raw)).toBe(79)
  })
})
