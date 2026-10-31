import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { parsePropertyCoordinates } from './propertyAiNeighborhood.js'
import { geocodeQuery } from './yandexGeocodeService.js'

const CACHE = path.join(os.tmpdir(), 'sellyourbrick-presentation-tiles-v1')
const MAX_AGE = 7 * 24 * 60 * 60 * 1000
const USER_AGENT = 'SellYourBrick/1.0 (+https://sellyourbrick.com)'

// Render only the two visible map views; cache OSM tiles for at least seven days.
async function tile(z, x, y, fetchImpl) {
  const size = 2 ** z
  const wrappedX = ((x % size) + size) % size
  if (y < 0 || y >= size) throw new Error('Map tile outside Mercator bounds')
  const filename = path.join(CACHE, `${z}-${wrappedX}-${y}.png`)
  try {
    const stat = await fs.stat(filename)
    if (Date.now() - stat.mtimeMs < MAX_AGE) return await fs.readFile(filename)
  } catch { /* cache miss */ }
  const response = await fetchImpl(`https://tile.openstreetmap.org/${z}/${wrappedX}/${y}.png`, {
    headers: { 'User-Agent': USER_AGENT, Referer: 'https://sellyourbrick.com/' },
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(`Map tile unavailable (${response.status})`)
  const data = Buffer.from(await response.arrayBuffer())
  await fs.mkdir(CACHE, { recursive: true })
  await fs.writeFile(filename, data)
  return data
}

export function mercatorPixel({ lat, lng }, zoom) {
  const latitude = Math.max(-85.05112878, Math.min(85.05112878, lat))
  const sin = Math.sin(latitude * Math.PI / 180)
  const world = 256 * 2 ** zoom
  return { x: (lng + 180) / 360 * world, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world }
}

export async function renderPresentationMap(coordinates, zoom, overrides = {}) {
  const pixel = mercatorPixel(coordinates, zoom)
  const width = 768
  const height = 576
  const originX = Math.floor(pixel.x - width / 2)
  const originY = Math.floor(pixel.y - height / 2)
  const startX = Math.floor(originX / 256)
  const startY = Math.floor(originY / 256)
  const cols = Math.ceil((originX - startX * 256 + width) / 256)
  const rows = Math.ceil((originY - startY * 256 + height) / 256)
  const overlays = []
  // At most four concurrent tile requests, no speculative downloads.
  for (let row = 0; row < rows; row++) {
    overlays.push(...await Promise.all(Array.from({ length: cols }, async (_, col) => ({
      input: await tile(zoom, startX + col, startY + row, overrides.fetchImpl || fetch),
      left: col * 256, top: row * 256,
    }))))
  }
  const data = await sharp({ create: { width: cols * 256, height: rows * 256, channels: 3, background: '#eef2ec' } })
    .composite(overlays).png().toBuffer()
  const cropped = await sharp(data).extract({
    left: originX - startX * 256, top: originY - startY * 256, width, height,
  }).png().toBuffer()
  return `data:image/png;base64,${cropped.toString('base64')}`
}

export async function preparePresentationLocation(property, overrides = {}) {
  let coordinates = parsePropertyCoordinates(property.coordinates)
  let precision = property.presentationLocationPrecision || 'listing'
  const address = [property.address, property.city, property.country].filter(Boolean).join(', ')
  const query = overrides.location || (property.address ? address : property.location || (property.city ? address : ''))
  let label = query
  if (!coordinates && query) {
    try {
      const hits = await (overrides.geocode || geocodeQuery)({ q: query, limit: 5, lang: 'en' })
      // An address lookup must not silently select an identically named business or stop.
      const hit = hits.find((item) => ['house', 'building', 'street', 'road', 'residential', 'suburb', 'neighbourhood', 'district', 'city', 'town', 'village', 'hamlet', 'locality', 'administrative', 'yes'].includes(item.type))
      coordinates = hit ? parsePropertyCoordinates({ lat: hit.lat, lng: hit.lon }) : null
      // A geocoder result is an estimate even when the query contains a house number.
      precision = hit?.type === 'house' || hit?.address?.house_number ? 'address-estimate' : 'area'
      label = query || hit?.display_name || ''
    } catch { /* the presentation explicitly marks unavailable location data */ }
  }
  const location = { label: label || address, coordinates, precision, maps: [] }
  if (coordinates) {
    for (const zoom of [11, 15]) {
      try {
        location.maps.push(await (overrides.renderMap || renderPresentationMap)(coordinates, zoom))
      } catch { location.maps.push(null) }
    }
  }
  return { ...property, ...(coordinates ? { coordinates: [coordinates.lat, coordinates.lng] } : {}), presentationLocation: location }
}
