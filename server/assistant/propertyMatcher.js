/**
 * Подбор объектов SellYourBrick: скоринг + коридор бюджета ±26%.
 */

import { itemMatchesCatalogLocation } from './catalogLocations.js'

export function isShareListing(item) {
  if (!item) return false
  return (
    item.isShare === true ||
    item.is_share === 1 ||
    item.is_share === true ||
    item.is_shared_ownership === 1 ||
    item.is_shared_ownership === true ||
    item.sale_type === 'share'
  )
}

export function isDebtListing(item) {
  if (!item) return false
  return (
    item.isDebt === true ||
    item.sale_type === 'debt' ||
    item.is_debt === 1 ||
    item.is_debt === true ||
    item.has_debt === 1 ||
    item.has_debt === true ||
    ['red', 'yellow', 'green'].includes(item.debt_severity)
  )
}

function propertyPrice(item) {
  const bid = Number(item?.currentBid)
  const price = Number(item?.price)
  if (Number.isFinite(bid) && bid > 0) return bid
  if (Number.isFinite(price) && price > 0) return price
  return 0
}

function propertyText(item) {
  const listText = (value) => {
    if (Array.isArray(value)) return value.join(' ')
    if (value && typeof value === 'object') return Object.values(value).join(' ')
    return value
  }
  return [
    item?.title,
    item?.name,
    item?.location,
    item?.address,
    item?.description,
    item?.property_type,
    item?.propertyType,
    listText(item?.features),
    listText(item?.amenities),
    listText(item?.comforts),
    item?.view,
    item?.slug,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

const PREFERENCE_SIGNALS = [
  { request: /(море|пляж|набережн|sea|beach|ocean|mar|playa|meer|strand)/i, listing: /(море|пляж|набережн|sea|beach|ocean|mar|playa|meer|strand)/i },
  { request: /(бассейн|pool|piscina|schwimmbad|piscine)/i, listing: /(бассейн|pool|piscina|schwimmbad|piscine)/i },
  { request: /(центр|central|downtown|centro|zentrum|centre)/i, listing: /(центр|central|downtown|centro|zentrum|centre)/i },
  { request: /(террас|балкон|terrace|balcony|terraza|balkon|terrasse)/i, listing: /(террас|балкон|terrace|balcony|terraza|balkon|terrasse)/i },
  { request: /(вид|панорам|view|vista|aussicht|vue)/i, listing: /(вид|панорам|view|vista|aussicht|vue)/i },
  { request: /(новострой|новый дом|new build|new construction|obra nueva|neubau)/i, listing: /(новострой|новый дом|new build|new construction|obra nueva|neubau)/i },
  { request: /(паркинг|гараж|parking|garage|aparcamiento)/i, listing: /(паркинг|гараж|parking|garage|aparcamiento)/i },
  { request: /(мебел|furnished|möbliert|amueblado|meublé)/i, listing: /(мебел|furnished|möbliert|amueblado|meublé)/i },
  { request: /(гольф|golf)/i, listing: /(гольф|golf)/i },
]

function preferenceScore(item, dialog) {
  const request = String(dialog?.lastUser || dialog?.rawText || '').toLowerCase()
  if (!request) return 0
  const listing = propertyText(item)
  return PREFERENCE_SIGNALS.reduce((score, signal) => {
    if (!signal.request.test(request)) return score
    return score + (signal.listing.test(listing) ? 3 : -0.5)
  }, 0)
}

function normalizeTextList(value, limit = 12) {
  const source = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Object.entries(value).filter(([, enabled]) => enabled).map(([name]) => name)
      : typeof value === 'string'
        ? value.split(/[,;\n]/)
        : []
  return source.map((item) => String(item).trim()).filter(Boolean).slice(0, limit)
}

function itemMatchesLocation(item, dialog) {
  if (!dialog?.hasCountry && !dialog?.hasCity && !dialog?.hasLocation) return true
  return itemMatchesCatalogLocation(item, dialog)
}

function locationScore(item, dialog) {
  if (!dialog?.hasCountry && !dialog?.hasCity && !dialog?.hasLocation) return 1
  return itemMatchesCatalogLocation(item, dialog) ? 5 : 0
}

function typeScore(item, types) {
  if (!types?.length) return 0
  const blob = propertyText(item)
  const declared = String(item?.property_type || item?.propertyType || '').toLowerCase()
  let score = 0
  if (types.includes('apartment') && /(apart|квартир|flat|студи|piso)/.test(`${blob} ${declared}`)) score += 4
  if (types.includes('villa') && /(villa|вилл)/.test(`${blob} ${declared}`)) score += 4
  if (types.includes('house') && /(house|дом|town|коттедж)/.test(`${blob} ${declared}`)) score += 4
  return score
}

function itemMatchesType(item, types) {
  if (!types?.length) return true
  return typeScore(item, types) > 0
}

function formatScore(item, format) {
  if (!format) return 0
  const isAuction = Boolean(item?.isAuction || item?.is_auction)
  if (format === 'auction') return isAuction ? 3 : -2
  if (format === 'buy_now') return isAuction ? -2 : 3
  if (format === 'shares') return isShareListing(item) ? 5 : -2
  if (format === 'debt') return isDebtListing(item) ? 5 : -2
  return 0
}

function investmentVehicleScore(item, preferInvestmentVehicles) {
  if (!preferInvestmentVehicles) return 0
  if (isShareListing(item) || isDebtListing(item)) return 8
  return -3
}

function itemMatchesPurposeVehicle(item, dialog) {
  if (dialog?.preferInvestmentVehicles) {
    return isShareListing(item) || isDebtListing(item)
  }
  if (dialog?.isLiving) {
    return !isShareListing(item) && !isDebtListing(item)
  }
  return true
}

function roomsScore(item, rooms) {
  if (!rooms) return 0
  const value = Number(item?.rooms || item?.beds || item?.bedrooms || 0)
  if (!value) return 0
  if (value === rooms) return 3
  if (Math.abs(value - rooms) === 1) return 1
  return 0
}

function priceScore(price, band) {
  if (!band || !price) return 0
  if (price < band.floor || price > band.ceiling) return -8
  const mid = band.anchor || (band.floor + band.ceiling) / 2
  const diff = mid > 0 ? Math.abs(price - mid) / mid : 1
  if (diff <= 0.08) return 6
  if (diff <= 0.18) return 4
  return 2
}

export function slimProperty(item) {
  if (!item || item.id == null) return null
  const auctionPrice =
    item.currentBid ??
    item.current_bid ??
    item.auction_starting_price ??
    item.auctionStartingPrice ??
    null
  return {
    id: Number(item.id) || item.id,
    slug: item.slug || null,
    title: String(item.title || item.name || `Объект ${item.id}`).slice(0, 80),
    location: String(item.location || '').slice(0, 80),
    address: String(item.address || '').slice(0, 160) || null,
    country: item.country || null,
    city: item.city || null,
    price:
      Number(
        item.price ??
        item.totalPrice ??
        item.total_price ??
        item.pricePerShare ??
        item.price_per_share ??
        auctionPrice,
      ) || 0,
    currentBid: auctionPrice != null && Number.isFinite(Number(auctionPrice))
      ? Number(auctionPrice)
      : null,
    area: item.area || item.sqft || null,
    rooms: item.rooms || item.beds || item.bedrooms || null,
    bathrooms: item.bathrooms || item.baths || null,
    property_type: item.property_type || item.propertyType || null,
    description: String(item.description || '').slice(0, 700) || null,
    features: normalizeTextList(item.features || item.comforts),
    amenities: normalizeTextList(item.amenities),
    view: String(item.view || '').slice(0, 120) || null,
    yield: item.yield ?? item.rental_yield ?? item.roi ?? null,
    sale_type: item.sale_type || null,
    isAuction: Boolean(item.isAuction || item.is_auction),
    isShare: isShareListing(item),
    isDebt: isDebtListing(item),
    is_shared_ownership: item.is_shared_ownership ?? (isShareListing(item) ? 1 : 0),
    is_debt: item.is_debt ?? (isDebtListing(item) ? 1 : 0),
  }
}

export function searchCatalog(properties, dialog, limit = 5) {
  const catalog = (Array.isArray(properties) ? properties : []).map(slimProperty).filter(Boolean)
  if (!catalog.length) {
    return { ids: [], items: [], total: 0 }
  }

  const band =
    dialog?.ignoreBudget || (dialog?.preferInvestmentVehicles && !dialog?.hasBudget)
      ? null
      : dialog?.priceTarget || null
  const scored = catalog
    .filter((item) => itemMatchesPurposeVehicle(item, dialog))
    .filter((item) => itemMatchesLocation(item, dialog))
    .filter((item) => itemMatchesType(item, dialog?.propertyTypes))
    .map((item) => {
      const price = propertyPrice(item)
      let score = 1
      score += locationScore(item, dialog)
      score += typeScore(item, dialog?.propertyTypes)
      score += formatScore(item, dialog?.dealFormat)
      score += investmentVehicleScore(item, dialog?.preferInvestmentVehicles)
      score += roomsScore(item, dialog?.rooms)
      score += priceScore(price, band)
      score += preferenceScore(item, dialog)
      if (item.isAuction) score += 0.5
      return { item, score, price }
    })
    .filter((row) => row.score > 0)

  let pool = scored
  if (dialog?.preferInvestmentVehicles) {
    const vehicles = scored.filter((row) => isShareListing(row.item) || isDebtListing(row.item))
    if (vehicles.length) pool = vehicles
  }
  if (band) {
    const inBand = pool.filter((row) => row.price <= 0 || (row.price >= band.floor && row.price <= band.ceiling))
    if (inBand.length) pool = inBand
  }

  pool.sort((a, b) => b.score - a.score || a.price - b.price)

  let picked
  if (dialog?.preferInvestmentVehicles) {
    const shares = pool.filter((row) => isShareListing(row.item))
    const debts = pool.filter((row) => isDebtListing(row.item) && !isShareListing(row.item))
    const mixed = []
    const shareLimit = Math.ceil(Math.max(1, limit) / 2)
    const debtLimit = Math.max(1, limit) - Math.min(shareLimit, shares.length)
    mixed.push(...shares.slice(0, shareLimit), ...debts.slice(0, debtLimit))
    if (mixed.length < limit) {
      const used = new Set(mixed.map((row) => row.item.id))
      for (const row of pool) {
        if (used.has(row.item.id)) continue
        mixed.push(row)
        if (mixed.length >= limit) break
      }
    }
    picked = mixed.slice(0, Math.max(1, limit))
  } else {
    picked = pool.slice(0, Math.max(1, limit))
  }
  return {
    ids: picked.map((row) => row.item.id),
    items: picked.map((row) => row.item),
    total: catalog.length,
    band,
  }
}

export function formatCatalogForPrompt(match, lang = 'ru') {
  if (!match?.items?.length) {
    return lang === 'en'
      ? 'CATALOG MATCH: empty. Do not invent listings. Offer /auction.'
      : lang === 'es'
        ? 'CATÁLOGO: vacío. No inventes fichas. Ofrece /auction.'
        : 'КАТАЛОГ: пусто. Не выдумывай объекты. Предложи /auction.'
  }
  const lines = match.items.map((item) => {
    const price = item.currentBid || item.price || 0
    const kind = item.isShare ? 'shares' : item.isDebt ? 'debt' : item.isAuction ? 'auction' : 'buy now'
    const details = [
      item.area ? `${item.area} m²` : '',
      item.rooms ? `${item.rooms} rooms` : '',
      item.bathrooms ? `${item.bathrooms} baths` : '',
      item.features?.length ? `features: ${item.features.join(', ')}` : '',
      item.amenities?.length ? `amenities: ${item.amenities.join(', ')}` : '',
      item.view ? `view: ${item.view}` : '',
      item.yield ? `yield: ${item.yield}` : '',
      item.description ? `description: ${item.description.slice(0, 320)}` : '',
    ].filter(Boolean).join(' | ')
    return `- id=${item.id} | ${item.title} | ${item.location} | €${Number(price).toLocaleString('en-US')} | ${kind}${details ? ` | ${details}` : ''}`
  })
  return `**ПОДБОРКА ИЗ КАТАЛОГА (используй только эти id в recommendations):**\n${lines.join('\n')}`
}
