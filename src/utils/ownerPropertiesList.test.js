import { describe, expect, it } from 'vitest'
import {
  getOwnerPropertyRecencyTs,
  mapApiPropertyToOwnerListRow,
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
