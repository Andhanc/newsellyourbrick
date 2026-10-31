import { createHash } from 'node:crypto'
import { normalizePropertyAiImages } from './propertyAiImages.js'
import { presentationCopy, presentationFactCopy, presentationNearbyBenefit } from './propertyPresentationCopy.js'

export const PROPERTY_PRESENTATION_VERSION = 'property-brochure-v5'
const enabled = (value) => value === true || value === 1 || value === '1' || value === 'true'
const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0

export function propertyPresentationCacheModel(model, property, language) {
  const fingerprint = createHash('sha256').update(JSON.stringify(property, (_, v) => typeof v === 'bigint' ? String(v) : v)).digest('hex').slice(0, 20)
  return `${model}:${PROPERTY_PRESENTATION_VERSION}:${language}:${fingerprint}`
}

export function presentationImages(property) {
  const seen = new Set()
  return normalizePropertyAiImages(property.presentationMediaVerified ? property.images : [property.images, property.photos, property.image]).filter((url) => {
    let decoded = url
    try { decoded = decodeURIComponent(url) } catch { /* use original path */ }
    if (/logo|haus-tenerife|хаус-тенерифе|\/2020\/02\/\d+\.png|maxim-img|-(?:150x150|584x438|592x444)\./i.test(decoded)) return false
    const key = url.replace(/-(?:\d{2,4}x\d{2,4}|scaled)(?=\.)/g, '')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 8)
}

export function presentationSaleFacts(property, language = 'en') {
  const copy = presentationCopy(language)
  const money = (value) => positive(value)
    ? new Intl.NumberFormat(language, { style: 'currency', currency: /^[A-Z]{3}$/.test(property.currency) ? property.currency : 'EUR', maximumFractionDigits: 0 }).format(Number(value))
    : copy.confirm
  const debt = property.sale_type === 'debt' || enabled(property.is_debt) || enabled(property.has_debt) || ['red', 'yellow', 'green'].includes(property.debt_severity)
  const shared = property.sale_type === 'share' || enabled(property.is_shared_ownership)
  const auction = enabled(property.is_auction) || property.sale_type === 'auction'
  const buyNow = enabled(property.buy_now_enabled) && !shared && !debt
  const kind = debt ? 'debt' : shared ? 'share' : auction ? 'auction' : buyNow ? 'fixed' : 'listing'
  const facts = []
  if (positive(property.price)) facts.push({ title: copy.price, value: money(property.price), body: copy.asListed })
  if (auction && positive(property.auction_starting_price)) facts.push({ title: copy.start, value: money(property.auction_starting_price), body: copy.auction })
  if (auction && property.auction_end_date) facts.push({ title: copy.end, value: String(property.auction_end_date).slice(0, 10), body: copy.asListed })
  if (shared) {
    if (positive(property.total_shares)) facts.push({ title: copy.totalShares, value: String(property.total_shares), body: copy.share })
    if (property.shares_sold != null) facts.push({ title: copy.soldShares, value: String(property.shares_sold), body: copy.asListed })
  }
  if (debt && positive(property.debt_amount)) facts.push({ title: copy.debtAmount, value: money(property.debt_amount), body: copy.asListed })
  // Only show an actionable buy-now path when the stored flag enables it.
  const title = kind === 'auction' && buyNow ? `${copy.auction} / ${copy.fixed}` : copy[kind]
  const payment = copy[`${kind}Payment`]
  const paymentFacts = kind === 'fixed' && positive(property.price) ? [
    { title: copy.reserve, value: money(Number(property.price) * 0.1), body: '10%' },
    { title: copy.balance, value: money(Number(property.price) * 0.9), body: '90%' },
  ] : []
  return { kind, title, facts: facts.slice(0, 4), payment, paymentFacts }
}

export function composePropertyPresentation(report, property, language = 'en') {
  report = { ...report, images: presentationImages(property) }
  const copy = presentationCopy(language)
  const sale = presentationSaleFacts(property, language)
  const base = (slide) => ({ body: '', bullets: [], cards: [], imageIndices: [], ...slide })
  const aiSlides = report.slides || []
  const find = (...layouts) => aiSlides.find((slide) => layouts.includes(slide.layout)) || {}
  const overview = find('stats')
  const factCopy = presentationFactCopy(language)
  const specCards = [
    { title: factCopy[0], value: positive(property.area) ? `${property.area} m²` : '', body: factCopy[5] },
    { title: positive(property.bedrooms) ? factCopy[1] : factCopy[3], value: positive(property.bedrooms || property.rooms) ? String(property.bedrooms || property.rooms) : '', body: positive(property.bedrooms) ? factCopy[6] : factCopy[8] },
    { title: factCopy[2], value: positive(property.bathrooms) ? String(property.bathrooms) : '', body: factCopy[7] },
    { title: factCopy[4], value: positive(property.land_area) ? `${property.land_area} m²` : '', body: factCopy[9] },
  ].filter((card) => card.value)
  const features = aiSlides.filter((slide) => ['split', 'photo_statement'].includes(slide.layout)).at(-1) || {}
  const amenities = find('cards')
  const location = property.presentationLocation || { maps: [] }
  const priority = ['shops', 'transport', 'medical', 'recreation', 'schools']
  const groups = [...(property.nearbyInfrastructure || [])].sort((a, b) => priority.indexOf(a.category) - priority.indexOf(b.category))
  // Prefer different everyday needs to four branches of the same shop chain.
  const points = groups.map((group) => group.places?.[0] ? { ...group.places[0], benefit: presentationNearbyBenefit(group.category, language) } : null)
    .filter(Boolean).filter((point, index, list) => list.findIndex((p) => p.name === point.name) === index).slice(0, 3)
  const slides = [
    base({ layout: 'cover', title: property.title || property.name, kicker: copy.cover, body: report.summary, imageIndices: [0] }),
    base({ ...overview, layout: 'stats', title: copy.features, cards: specCards, imageIndices: [1] }),
    base({ ...features, layout: 'split', title: features.title || copy.features, body: features.body || report.sections?.[0]?.body || report.summary, imageIndices: [2] }),
    base({ ...amenities, layout: 'cards', title: amenities.title || copy.amenities, body: amenities.body || '', cards: amenities.cards?.length ? amenities.cards : [{ title: copy.amenitiesMissing, body: copy.confirm }], imageIndices: [3] }),
    base({ layout: 'neighborhood', title: copy.location, body: report.neighborhood?.summary || '', places: points, imageIndices: [] }),
    base({ layout: 'gallery', title: copy.gallery, imageIndices: [4, 5, 6, 7].filter((i) => i < report.images.length) }),
    base({ layout: 'sale', title: sale.title, kicker: copy.sale, body: sale.payment, cards: sale.facts, imageIndices: [6] }),
    base({ layout: 'payment', title: copy.payment, body: sale.payment, cards: sale.paymentFacts, steps: [
      { title: copy.check, body: copy.checkBody },
      { title: copy.sign, body: sale.kind === 'fixed' ? copy.signBody : copy.confirm },
      { title: copy.settle, body: sale.kind === 'share' || sale.kind === 'debt' ? copy.confirm : copy.settleBody },
    ] }),
    base({ layout: 'conclusion', title: copy.cta, kicker: copy.next, body: report.conclusion || '', imageIndices: [7] }),
  ]
  return { ...report, propertyId: property.id, sourceUrl: property.presentationSourceUrl || '', presentationVersion: PROPERTY_PRESENTATION_VERSION, language, copy, sale, location, slides, pages: slides, disclaimer: copy.disclaimer }
}
