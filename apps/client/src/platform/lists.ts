import { storage } from '../platform/storage'
import { apiFetch } from '../api/client'

async function readIdList(key: string): Promise<string[]> {
  const raw = await storage.getItem(key)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

async function writeIdList(key: string, ids: string[]) {
  await storage.setItem(key, JSON.stringify([...new Set(ids.map(String))]))
}

export async function toggleLocalFavorite(propertyId: string | number) {
  const key = 'favoritePropertyIds'
  const ids = await readIdList(key)
  const id = String(propertyId)
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
  await writeIdList(key, next)
  return next.includes(id)
}

export async function toggleCompare(propertyId: string | number) {
  const key = 'comparePropertyIds'
  const ids = await readIdList(key)
  const id = String(propertyId)
  let next: string[]
  if (ids.includes(id)) next = ids.filter((x) => x !== id)
  else next = [...ids, id].slice(-4)
  await writeIdList(key, next)
  return next.includes(id)
}

export async function syncFavoriteToServer(opts: {
  userId: string | number
  propertyId: string | number
  propertyTable?: string
  added: boolean
}) {
  const path = `/users/${encodeURIComponent(String(opts.userId))}/favorites`
  if (opts.added) {
    await apiFetch(path, {
      method: 'POST',
      body: JSON.stringify({
        property_id: opts.propertyId,
        property_table: opts.propertyTable || 'apartment',
      }),
    })
  } else {
    await apiFetch(path, {
      method: 'DELETE',
      body: JSON.stringify({
        property_id: opts.propertyId,
        property_table: opts.propertyTable || 'apartment',
      }),
    })
  }
}
