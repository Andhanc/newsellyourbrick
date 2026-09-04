import * as cheerio from 'cheerio'
import { SPAIN_LEGAL_SOURCES } from './spainLegalKnowledge.js'

const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 9000
const cache = new Map()

const LIVE_MORTGAGE_SOURCE_IDS = [
  'bdeMortgageTable',
  'caixaBankMortgage',
  'santanderMortgage',
  'sabadellMortgage',
]

const SOURCE_TERMS = Object.freeze({
  boeCivilCode: ['compraventa', 'vicios ocultos', 'arras', 'usufructo'],
  boeMortgageLaw: ['Registro de la Propiedad', 'hipoteca', 'cargas'],
  boeHorizontalProperty: ['certificación sobre el estado de deudas', 'transmitente', 'siete días naturales'],
  boeUrbanLeases: ['enajenación de la vivienda arrendada', 'adquirente', 'arrendatario'],
  boeMortgageCredit: ['FEIN', 'préstamo inmobiliario', 'tipo de interés'],
  boeGoldenVisaRepeal: ['visados de residencia para inversores', '3 de abril de 2025', 'disposición transitoria'],
  ugeInvestors: ['Ley Orgánica 1/2025', 'solicitud', 'renovaciones'],
  taxSale: ['vendo un inmueble', 'ganancia o pérdida patrimonial', 'vivienda habitual'],
  taxNonResidentSale: ['3%', 'modelo 211', 'transmitente no residente'],
  taxReinvestment: ['dos años', 'reinversión', 'vivienda habitual'],
  registrars: ['Nota simple', 'titular', 'cargas', 'certificaciones'],
  cadastre: ['valor de referencia', 'referencia catastral'],
  notaries: ['compraventa', 'escritura pública'],
  bdeMortgageGuide: ['tipo fijo', 'tipo variable', 'TAE'],
  boeEnergyCertificate: ['venta', 'certificado de eficiencia energética'],
  boeCoasts: ['servidumbre de protección', 'transmisión'],
  boeAml: ['identificación formal', 'titular real', 'origen de los fondos'],
})

function cleanPageText(html) {
  const $ = cheerio.load(String(html || ''))
  $('script, style, noscript, svg, nav, footer').remove()
  return $('body').text().replace(/\s+/g, ' ').trim()
}

function extractBdeMortgageSummary($, pageText) {
  const year = pageText.match(/Año\s+(20\d{2})/i)?.[1] || new Date().getFullYear()
  const rows = []
  $('table tr').slice(2).each((_, row) => {
    rows.push(
      $(row).find('th,td').map((__, cell) =>
        $(cell).text().replace(/Abre en ventana nueva/gi, '').trim(),
      ).get(),
    )
  })
  const latest = (cellIndex) => {
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      const value = String(rows[index]?.[cellIndex] || '').match(/\d+[,.]\d+/)?.[0]
      if (value) return { period: `${rows[index][0]} ${year}`, percent: value.replace(',', '.') }
    }
    return null
  }
  return JSON.stringify({
    notice: 'Official reference values, not a personalised bank offer',
    IRPH_entities: latest(1),
    Euribor_12_months: latest(8),
    euro_area_mortgages_initial_fixing_1_to_5_years: latest(9),
  })
}

function excerptAroundTerms(text, terms, maxLength = 4200) {
  if (!text) return ''
  const lowered = text.toLowerCase()
  const hits = terms
    .map((term) => lowered.indexOf(term.toLowerCase()))
    .filter((index) => index >= 0)
  const start = hits.length ? Math.max(0, Math.min(...hits) - 350) : 0
  return text.slice(start, start + maxLength)
}

function detectOfferExpiry(text) {
  const match = String(text || '').match(
    /(?:v[aá]lid[ao]|vigentes?|disponible)[^\d]{0,80}(\d{1,2})(?:\s+de\s+|[./-])(\d{1,2}|[a-záéíóúñ]+)(?:\s+de\s+|[./-])(20\d{2})/i,
  )
  if (!match) return null
  const monthNames = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  }
  const month = Number(match[2]) || monthNames[match[2].toLowerCase()]
  if (!month) return null
  const iso = `${match[3]}-${String(month).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`
  return /^20\d{2}-\d{2}-\d{2}$/.test(iso) ? iso : null
}

function isMortgageQuery(query) {
  return /ипотек|ставк|процент|eur[ií]bor|\btin\b|\btae\b|mortgage|hipoteca|interest\s+rate/i.test(
    String(query || ''),
  )
}

async function fetchOfficialPage(sourceId, fetchImpl, query = '') {
  const source = SPAIN_LEGAL_SOURCES[sourceId]
  if (!source) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetchImpl(source.url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'SellYourBrick legal-source verifier/1.0',
        accept: 'text/html,application/xhtml+xml',
      },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const html = await response.text()
    const $ = cheerio.load(String(html || ''))
    const text = cleanPageText(html)
    const content = sourceId === 'bdeMortgageTable'
      ? extractBdeMortgageSummary($, text)
      : excerptAroundTerms(
          text,
          source.kind === 'live-bank-offer'
            ? ['TIN', 'TAE', 'bonificación', 'vigente']
            : [...(SOURCE_TERMS[sourceId] || []), ...String(query).split(/\s+/).filter((term) => term.length > 4)],
          4200,
        )
    if (!content) throw new Error('empty official page')
    const validUntil = source.kind === 'live-bank-offer' ? detectOfferExpiry(text) : null
    const today = new Date().toISOString().slice(0, 10)
    return {
      sourceId,
      authority: source.authority,
      title: source.title,
      url: source.url,
      fetchedAt: new Date().toISOString(),
      validUntil,
      status: validUntil && validUntil < today
        ? 'expired'
        : source.kind === 'live-bank-offer' && !validUntil
          ? 'retrieved-undated'
          : 'retrieved',
      content,
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function getSpainLegalLiveContext(query = '', options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch
  if (typeof fetchImpl !== 'function') return []
  const sourceIds = isMortgageQuery(query)
    ? LIVE_MORTGAGE_SOURCE_IDS
    : [...new Set(Array.isArray(options.sourceIds) ? options.sourceIds : [])].slice(0, 3)
  if (!sourceIds.length) return []
  const key = sourceIds.join(',')
  const cached = cache.get(key)
  if (cached && Date.now() - cached.storedAt < CACHE_TTL_MS) return cached.value

  const settled = await Promise.allSettled(
    sourceIds.map((sourceId) => fetchOfficialPage(sourceId, fetchImpl, query)),
  )
  const value = settled
    .filter((entry) => entry.status === 'fulfilled' && entry.value)
    .map((entry) => entry.value)
  cache.set(key, { storedAt: Date.now(), value })
  return value
}

export function clearSpainLegalLiveCache() {
  cache.clear()
}
