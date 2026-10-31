export const PROPERTY_AI_CATEGORIES = Object.freeze({
  risks: 'What are the main strengths and risks of this property?',
  investment: 'What is the investment potential of this property?',
  details: 'Provide a detailed review of this property.',
  presentation: 'Create a property presentation with features, benefits, amenities, location, sale conditions and payment steps.',
  custom: '',
})

const limitText = (value, max = 1800) => String(value ?? '').trim().slice(0, max)
const cleanList = (value, maxItems = 8, maxLength = 240) =>
  (Array.isArray(value) ? value : [])
    .map((item) => limitText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems)

const SLIDE_LAYOUTS = new Set([
  'cover', 'photo_statement', 'split', 'cards', 'stats', 'chart', 'comparison',
  'gallery', 'timeline', 'neighborhood', 'conclusion',
])
const SLIDE_ICONS = new Set([
  'home', 'key', 'area', 'rooms', 'location', 'price', 'check', 'alert', 'shield',
  'trend', 'school', 'transport', 'store', 'medical', 'tree', 'document', 'clock',
  'building', 'camera', 'spark',
])
const SLIDE_TONES = new Set(['tiffany', 'cream', 'white', 'ink'])
const CHART_TYPES = new Set(['none', 'bar', 'line', 'donut'])

function safeListingImage(value) {
  const image = limitText(value, 2000)
  if (/^\/[^/]/.test(image)) return image
  if (/^https:\/\//i.test(image)) return image
  if (/^data:image\/(?:png|jpe?g|webp);base64,/i.test(image)) return image
  return ''
}

export function normalizePropertyAiRequest(input = {}) {
  const category = limitText(input.category, 40)
  if (!Object.hasOwn(PROPERTY_AI_CATEGORIES, category)) {
    throw new Error('Unknown analysis category')
  }

  const question = category === 'custom'
    ? limitText(input.question, 600)
    : PROPERTY_AI_CATEGORIES[category]

  if (category === 'custom' && question.length < 5) {
    throw new Error('Custom question must be at least 5 characters')
  }

  const language = ['ru', 'en', 'de', 'es', 'fr', 'pl', 'sv'].includes(input.language) ? input.language : 'en'
  return category === 'presentation'
    ? { category, question: `[${language}] ${question}`, language }
    : { category, question }
}

function normalizeMetrics(metrics) {
  return (Array.isArray(metrics) ? metrics : [])
    .map((metric) => ({
      label: limitText(metric?.label, 80),
      value: limitText(metric?.value, 100),
      note: limitText(metric?.note, 180),
    }))
    .filter((metric) => metric.label && metric.value)
    .slice(0, 8)
}

function normalizeSections(sections) {
  return (Array.isArray(sections) ? sections : [])
    .map((section) => ({
      title: limitText(section?.title, 120),
      body: limitText(section?.body, 1400),
      bullets: cleanList(section?.bullets, 8, 260),
    }))
    .filter((section) => section.title || section.body || section.bullets.length)
    .slice(0, 4)
}

function normalizeSlideCards(cards) {
  return (Array.isArray(cards) ? cards : [])
    .map((card) => ({
      title: limitText(card?.title, 80),
      value: limitText(card?.value, 80),
      body: limitText(card?.body, 240),
      icon: SLIDE_ICONS.has(card?.icon) ? card.icon : 'spark',
      tone: SLIDE_TONES.has(card?.tone) ? card.tone : 'cream',
    }))
    .filter((card) => card.title || card.value || card.body)
    .slice(0, 4)
}

function normalizeSlideChart(chart) {
  const type = CHART_TYPES.has(chart?.type) ? chart.type : 'none'
  const labels = cleanList(chart?.labels, 6, 34)
  const series = (Array.isArray(chart?.series) ? chart.series : [])
    .map((item) => ({
      name: limitText(item?.name, 48),
      values: (Array.isArray(item?.values) ? item.values : [])
        .map(Number)
        .filter(Number.isFinite)
        .slice(0, labels.length || 6),
    }))
    .filter((item) => item.values.length)
    .slice(0, 3)
  const usableType = type !== 'none' && labels.length && series.length ? type : 'none'
  return {
    type: usableType,
    title: limitText(chart?.title, 100),
    unit: limitText(chart?.unit, 24),
    caption: limitText(chart?.caption, 220),
    labels,
    series,
  }
}

function normalizeAiSlides(slides, images) {
  return (Array.isArray(slides) ? slides : [])
    .map((slide) => {
      const chart = normalizeSlideChart(slide?.chart)
      const cards = normalizeSlideCards(slide?.cards)
      const requestedLayout = SLIDE_LAYOUTS.has(slide?.layout) ? slide.layout : 'split'
      const layout = requestedLayout === 'chart' && chart.type === 'none'
        ? 'split'
        : ['cards', 'stats', 'timeline', 'comparison'].includes(requestedLayout) && !cards.length
          ? 'split'
          : requestedLayout
      return {
        layout,
        kicker: limitText(slide?.kicker, 80),
        title: limitText(slide?.title, 140),
        body: limitText(slide?.body, 1000),
        bullets: cleanList(slide?.bullets, 6, 220),
        cards,
        chart,
        imageIndices: (Array.isArray(slide?.imageIndices) ? slide.imageIndices : [])
          .map(Number)
          .filter((index) => Number.isInteger(index) && index >= 0 && index < images.length)
          .slice(0, 6),
      }
    })
    .filter((slide) => slide.title || slide.body || slide.cards.length || slide.chart.type !== 'none')
    .slice(0, 10)
}

function metricCards(metrics) {
  const iconByLabel = (label) => {
    const normalized = String(label || '').toLowerCase()
    if (/цен|стоим/.test(normalized)) return 'price'
    if (/площад/.test(normalized)) return 'area'
    if (/комнат|спаль/.test(normalized)) return 'rooms'
    if (/локац|адрес|район/.test(normalized)) return 'location'
    if (/фото/.test(normalized)) return 'camera'
    if (/год/.test(normalized)) return 'building'
    return 'home'
  }
  return metrics.slice(0, 4).map((metric, index) => ({
    title: metric.label,
    value: metric.value,
    body: metric.note,
    icon: iconByLabel(metric.label),
    tone: index === 0 ? 'tiffany' : index === 3 ? 'ink' : 'cream',
  }))
}

function fallbackSlides({ title, summary, directAnswer, strengths, risks, metrics, detailsBody, detailsBullets, conclusion, images, neighborhood }) {
  const emptyChart = { type: 'none', title: '', unit: '', caption: '', labels: [], series: [] }
  const base = (slide) => ({ kicker: '', body: '', bullets: [], cards: [], chart: emptyChart, imageIndices: [], ...slide })
  return [
    base({ layout: 'cover', kicker: 'PERSONAL AI REVIEW', title, body: summary, imageIndices: images.length ? [0] : [] }),
    base({ layout: 'stats', kicker: 'PROPERTY IN FIGURES', title: 'Key facts at a glance', cards: metricCards(metrics), imageIndices: images[1] ? [1] : [] }),
    base({
      layout: 'comparison', kicker: 'BALANCED DECISION', title: 'Strengths and checks',
      cards: [
        { title: 'Strengths', value: '', body: strengths.slice(0, 4).join('\n'), icon: 'check', tone: 'cream' },
        { title: 'Needs verification', value: '', body: risks.slice(0, 4).join('\n'), icon: 'shield', tone: 'ink' },
      ],
    }),
    base({ layout: 'photo_statement', kicker: 'ANSWER TO YOUR QUESTION', title: 'What matters now', body: directAnswer, imageIndices: images.length ? [Math.min(2, images.length - 1)] : [] }),
    ...(images.length > 1 ? [base({ layout: 'gallery', kicker: 'LISTING PHOTOS', title: 'Property spaces', imageIndices: images.map((_, index) => index).slice(0, 4) })] : []),
    base({ layout: 'split', kicker: 'DETAILED ANALYSIS', title: 'Facts, context, and assumptions', body: detailsBody || summary, bullets: detailsBullets, imageIndices: images.length ? [Math.min(3, images.length - 1)] : [] }),
    base({ layout: 'neighborhood', kicker: 'AREA AND INFRASTRUCTURE', title: 'What is nearby', body: neighborhood.summary, bullets: neighborhood.highlights }),
    base({ layout: 'timeline', kicker: 'DUE-DILIGENCE PLAN', title: 'Three steps before deciding', cards: [
      { title: 'Documents', value: '01', body: 'Confirm ownership, encumbrances, and the document pack.', icon: 'document', tone: 'white' },
      { title: 'Inspection', value: '02', body: 'Check property condition and building systems.', icon: 'home', tone: 'cream' },
      { title: 'Comparison', value: '03', body: 'Compare price and costs with alternatives.', icon: 'trend', tone: 'tiffany' },
    ] }),
    base({ layout: 'conclusion', kicker: 'SUMMARY · NEXT STEP', title: 'Decisions start with verifying the facts', body: conclusion, bullets: detailsBullets.slice(0, 3), imageIndices: images.length ? [0] : [] }),
  ].slice(0, 10)
}

function propertyFactStrengths(property, images) {
  const items = []
  if (property.area) items.push(`The listing states an area of ${property.area} m² — useful for concrete comparison with alternatives.`)
  if (property.rooms) items.push(`The layout is listed as ${property.rooms}-room — a baseline for living-scenario assessment.`)
  if (property.location) items.push(`Location is listed as “${limitText(property.location, 120)}”, so the surroundings can be checked before a viewing.`)
  if (property.year_built) items.push(`Year built is listed as ${property.year_built} — an important cue for technical checks.`)
  if (images.length) items.push(`The listing includes ${images.length} real photo${images.length === 1 ? '' : 's'} for an initial visual assessment.`)
  if (property.price) items.push('Price is published, so price per m² can be calculated and compared with similar listings.')
  if (!items.length) items.push('The property has a dedicated listing and is available for an initial review.')
  if (items.length < 2) items.push('A focused list of seller questions can be prepared before an in-person viewing.')
  return items
}

function propertyRiskChecks(property) {
  const items = []
  if (!property.condition && !property.renovation) items.push('Finish condition and possible renovation scope are not disclosed — verify via photos, video, or a viewing.')
  if (!property.year_built) items.push('Year built is missing — clarify building age and major renovation history.')
  if (!property.floor && !property.total_floors) items.push('Floor and building height are missing — these can affect convenience and liquidity.')
  if (!property.coordinates && !property.location) items.push('Exact location is not disclosed — transit, infrastructure, and surroundings cannot be verified.')
  items.push('Legal status, encumbrances, and the document pack must be confirmed before a deal.')
  items.push('Building systems condition and actual operating costs need separate clarification.')
  return items
}

function propertyMetrics(property, images) {
  const metrics = []
  if (property.price) metrics.push({ label: 'Price', value: `${property.price} ${property.currency || ''}`.trim(), note: 'From the listing' })
  if (property.area) metrics.push({ label: 'Area', value: `${property.area} m²`, note: 'Stated area' })
  if (property.rooms) metrics.push({ label: 'Rooms', value: String(property.rooms), note: 'From the listing' })
  if (property.bedrooms) metrics.push({ label: 'Bedrooms', value: String(property.bedrooms), note: 'From the listing' })
  if (property.floor) metrics.push({ label: 'Floor', value: property.total_floors ? `${property.floor} of ${property.total_floors}` : String(property.floor), note: 'Position in the building' })
  if (property.year_built) metrics.push({ label: 'Year', value: String(property.year_built), note: 'Year built' })
  if (property.location) metrics.push({ label: 'Location', value: limitText(property.location, 100), note: 'As stated in the listing' })
  if (images.length) metrics.push({ label: 'Photos', value: String(images.length), note: 'Real listing photos' })
  return metrics.slice(0, 8)
}

function normalizeNeighborhood(property, input) {
  const groups = (Array.isArray(property.nearbyInfrastructure) ? property.nearbyInfrastructure : [])
    .map((group) => ({
      category: limitText(group?.category, 40),
      label: limitText(group?.label, 80) || 'Infrastructure',
      places: (Array.isArray(group?.places) ? group.places : [])
        .map((place) => ({
          name: limitText(place?.name, 140),
          distanceMeters: Math.max(0, Math.round(Number(place?.distanceMeters) || 0)),
          source: 'OpenStreetMap',
        }))
        .filter((place) => place.name)
        .slice(0, 3),
    }))
    .filter((group) => group.places.length)

  const verifiedHighlights = groups.flatMap((group) => group.places.slice(0, 2).map((place) => `${group.label}: ${place.name} — ${place.distanceMeters} m`))
  const modelHighlights = cleanList(input.infrastructureHighlights, 6, 240)
  const highlights = [...verifiedHighlights, ...modelHighlights]
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 6)
  const fallbackSummary = groups.length
    ? 'Everyday infrastructure points were found within 1.5 km of the property coordinates. Distances are approximate as-the-crow-flies and need route verification.'
    : 'Coordinates or OpenStreetMap data are unavailable, so neighborhood infrastructure should be checked manually before deciding.'

  return {
    summary: limitText(input.neighborhoodSummary, 700) || fallbackSummary,
    highlights: highlights.length ? highlights : [
      'Check walking time to transit stops and shops.',
      'Clarify schools, healthcare, noise, and planned nearby development.',
    ],
    groups,
    sourceNote: groups.length ? 'Fact source: OpenStreetMap, search radius 1.5 km.' : 'Automatic infrastructure check was not completed.',
  }
}

export function normalizePropertyAiReport(input = {}, context = {}) {
  const property = context.property || {}
  const propertyTitle = limitText(property.title || property.name || 'Property', 160)
  const title = limitText(input.title, 160) || `AI review: ${propertyTitle}`
  const summary = limitText(input.summary, 1200) || limitText(input.directAnswer || input.shortAnswer, 1200)
  const directAnswer = limitText(input.directAnswer || input.shortAnswer, 1800) || summary || 'Based on the listing, only a preliminary conclusion is possible; key parameters must be confirmed with the seller.'
  const shortAnswer = directAnswer
  const sections = normalizeSections(input.sections)
  const assumptions = cleanList(input.assumptions, 8, 260)
  const conclusion = limitText(input.conclusion, 1400) || 'Before deciding, we recommend verifying documents and the listing source data.'
  const images = (Array.isArray(property.images) ? property.images : [])
    .map(safeListingImage)
    .filter(Boolean)
    .slice(0, 6)
  const strengths = [...cleanList(input.strengths, 8, 260), ...propertyFactStrengths(property, images)]
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 8)
  const risks = [...cleanList(input.risks, 8, 260), ...propertyRiskChecks(property)]
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 8)
  const metrics = [...normalizeMetrics(input.metrics), ...propertyMetrics(property, images)]
    .filter((metric, index, list) => list.findIndex((item) => item.label === metric.label) === index)
    .slice(0, 8)
  const neighborhood = normalizeNeighborhood(property, input)

  const detailSections = (sections.length ? sections : [{ title: 'Detailed analysis', body: summary, bullets: assumptions }]).slice(0, 2)
  const detailsBody = limitText(detailSections.map((section) => [section.title, section.body].filter(Boolean).join(': ')).filter(Boolean).join('\n\n'), 1800)
  const detailsBullets = cleanList(detailSections.flatMap((section) => section.bullets || []).concat(assumptions), 6, 220)
  const aiSlides = normalizeAiSlides(input.slides, images)
  const slides = aiSlides.length >= 2
    ? aiSlides
    : fallbackSlides({
        title, summary, directAnswer, strengths, risks, metrics, detailsBody, detailsBullets,
        conclusion, images, neighborhood,
      })

  return {
    category: context.category || 'details',
    question: limitText(context.question, 600),
    title,
    summary,
    directAnswer,
    shortAnswer,
    strengths,
    risks,
    metrics,
    sections,
    assumptions,
    conclusion,
    neighborhood,
    images,
    slides,
    // Alias for already stored reports and older clients. New presentations are driven by AI slides.
    pages: slides,
    disclaimer: 'This material was generated by AI from listing data for information only and is not financial, legal, or valuation advice.',
  }
}

export function parsePropertyAiModelContent(content, context = {}) {
  const raw = limitText(content, 60_000)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI returned a response in an unsupported format')
    parsed = JSON.parse(match[0])
  }
  const report = normalizePropertyAiReport(parsed, context)
  if (context.category === 'presentation') {
    // The brochure prompt provides localized strengths/checks. Do not append
    // English analytical-report defaults to the localized chat response.
    report.strengths = cleanList(parsed.strengths, 6, 260)
    report.risks = cleanList(parsed.risks, 6, 260)
  }
  return report
}
