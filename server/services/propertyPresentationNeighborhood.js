import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { enrichPropertyAiNeighborhood, parsePropertyCoordinates } from './propertyAiNeighborhood.js'

const CACHE = path.join(os.tmpdir(), 'sellyourbrick-presentation-places-v1')
const MAX_AGE = 2 * 24 * 60 * 60 * 1000
const categories = {
  schools: (t) => /^(school|kindergarten|college|university)$/.test(t.amenity),
  transport: (t) => t.highway === 'bus_stop' || t.railway === 'station',
  medical: (t) => /^(hospital|clinic|doctors|pharmacy|dentist)$/.test(t.amenity),
  recreation: (t) => /^(park|garden|sports_centre|fitness_centre)$/.test(t.leisure),
  shops: (t) => /^(supermarket|convenience|mall|department_store)$/.test(t.shop),
}
const labels = { schools: 'Education', transport: 'Transport', medical: 'Healthcare', recreation: 'Leisure and sports', shops: 'Shops and services' }

export function parsePresentationNearbyElements(elements, origin) {
  const nodes = new Map(elements.filter((e) => e.type === 'node').map((e) => [e.id, e]))
  const groups = Object.fromEntries(Object.keys(categories).map((k) => [k, []]))
  const radians = Math.PI / 180
  for (const element of elements) {
    const tags = element.tags || {}
    const name = tags.name || tags['name:en']
    if (!name) continue
    const category = Object.keys(categories).find((k) => categories[k](tags))
    if (!category) continue
    let lat = element.lat, lng = element.lon
    if (element.type === 'way') {
      const points = (element.nodes || []).map((id) => nodes.get(id)).filter(Boolean)
      if (!points.length) continue
      lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length
      lng = points.reduce((sum, p) => sum + p.lon, 0) / points.length
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const a = Math.sin((lat - origin.lat) * radians / 2) ** 2
      + Math.cos(origin.lat * radians) * Math.cos(lat * radians) * Math.sin((lng - origin.lng) * radians / 2) ** 2
    const distanceMeters = Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
    if (distanceMeters > 1000) continue
    groups[category].push({ name, distanceMeters, source: 'OpenStreetMap', sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}` })
  }
  return Object.entries(groups).filter(([, places]) => places.length).map(([category, places]) => ({
    category, label: labels[category], places: places.sort((a, b) => a.distanceMeters - b.distanceMeters)
      .filter((p, i, list) => list.findIndex((v) => v.name === p.name) === i).slice(0, 5),
  }))
}

// If Overpass is unavailable, read one small visible area from OSM. Never crawl
// surrounding areas. Cache the extracted points for 48h; do not keep the large map.
export async function enrichPresentationNeighborhood(property, overrides = {}) {
  const enriched = await (overrides.enrich || enrichPropertyAiNeighborhood)(property)
  if (enriched.nearbyInfrastructure?.length) return enriched
  const coordinates = parsePropertyCoordinates(enriched.coordinates)
  if (!coordinates || Math.abs(coordinates.lat) > 80) return enriched
  const key = `${coordinates.lat.toFixed(3)}-${coordinates.lng.toFixed(3)}`
  const filename = path.join(CACHE, `${key}.json`)
  try {
    const stat = await fs.stat(filename)
    if (Date.now() - stat.mtimeMs < MAX_AGE) return { ...enriched, nearbyInfrastructure: JSON.parse(await fs.readFile(filename, 'utf8')) }
  } catch { /* cache miss */ }
  try {
    const deltaLat = 700 / 111320
    const deltaLng = deltaLat / Math.cos(coordinates.lat * Math.PI / 180)
    const bbox = [coordinates.lng - deltaLng, coordinates.lat - deltaLat, coordinates.lng + deltaLng, coordinates.lat + deltaLat].join(',')
    const response = await (overrides.fetchImpl || fetch)(`https://api.openstreetmap.org/api/0.6/map.json?bbox=${bbox}`, {
      headers: { 'User-Agent': 'SellYourBrick/1.0 (+https://sellyourbrick.com)' }, signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) return enriched
    const payload = await response.json()
    if (!Array.isArray(payload.elements)) return enriched
    const nearbyInfrastructure = parsePresentationNearbyElements(payload.elements, coordinates)
    await fs.mkdir(CACHE, { recursive: true })
    await fs.writeFile(filename, JSON.stringify(nearbyInfrastructure))
    return { ...enriched, nearbyInfrastructure }
  } catch { return enriched }
}
