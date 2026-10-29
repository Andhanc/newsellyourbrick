import { normalizeApiKey } from '../aiChatConfig.js'
import { appendPropertyAiMessage, updatePropertyAiReport } from '../database/propertyAiReportsPrisma.js'
import { normalizePropertyAiReport, parsePropertyAiModelContent } from './propertyAiReportContract.js'
import { PROPERTY_AI_PDF_TEMPLATE_VERSION, renderPropertyAiReportPdf } from './propertyAiPdfRenderer.js'
import { propertyAiMediaBaseUrl, resolvePropertyAiImageUrl } from './propertyAiImages.js'
import { enrichPropertyAiNeighborhood } from './propertyAiNeighborhood.js'

export const PROPERTY_AI_MODEL = process.env.PROPERTY_AI_MODEL || 'google/gemini-3.5-flash'
export { PROPERTY_AI_PDF_TEMPLATE_VERSION }
export const PROPERTY_AI_REPORT_MODEL = `${PROPERTY_AI_MODEL}:property-ai-v9:${PROPERTY_AI_PDF_TEMPLATE_VERSION}`

const SLIDE_LAYOUTS = [
  'cover',
  'photo_statement',
  'split',
  'cards',
  'stats',
  'chart',
  'comparison',
  'gallery',
  'timeline',
  'neighborhood',
  'conclusion',
]

const SLIDE_ICONS = [
  'home', 'key', 'area', 'rooms', 'location', 'price', 'check', 'alert', 'shield',
  'trend', 'school', 'transport', 'store', 'medical', 'tree', 'document', 'clock',
  'building', 'camera', 'spark',
]

const REPORT_JSON_SCHEMA = {
  name: 'property_ai_report',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['directAnswer', 'shortAnswer', 'title', 'summary', 'strengths', 'risks', 'metrics', 'sections', 'conclusion', 'assumptions', 'neighborhoodSummary', 'infrastructureHighlights', 'slides'],
    properties: {
      directAnswer: { type: 'string' },
      shortAnswer: { type: 'string' },
      title: { type: 'string' },
      summary: { type: 'string' },
      strengths: { type: 'array', minItems: 2, maxItems: 6, items: { type: 'string' } },
      risks: { type: 'array', minItems: 2, maxItems: 6, items: { type: 'string' } },
      metrics: {
        type: 'array', minItems: 4, maxItems: 8,
        items: {
          type: 'object', additionalProperties: false, required: ['label', 'value', 'note'],
          properties: { label: { type: 'string' }, value: { type: 'string' }, note: { type: 'string' } },
        },
      },
      sections: {
        type: 'array', minItems: 2, maxItems: 4,
        items: {
          type: 'object', additionalProperties: false, required: ['title', 'body', 'bullets'],
          properties: { title: { type: 'string' }, body: { type: 'string' }, bullets: { type: 'array', items: { type: 'string' } } },
        },
      },
      conclusion: { type: 'string' },
      assumptions: { type: 'array', items: { type: 'string' } },
      neighborhoodSummary: { type: 'string' },
      infrastructureHighlights: { type: 'array', minItems: 2, maxItems: 10, items: { type: 'string' } },
      slides: {
        type: 'array', minItems: 7, maxItems: 10,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['layout', 'kicker', 'title', 'body', 'bullets', 'cards', 'chart', 'imageIndices'],
          properties: {
            layout: { type: 'string', enum: SLIDE_LAYOUTS },
            kicker: { type: 'string' },
            title: { type: 'string' },
            body: { type: 'string' },
            bullets: { type: 'array', maxItems: 6, items: { type: 'string' } },
            cards: {
              type: 'array', maxItems: 4,
              items: {
                type: 'object', additionalProperties: false,
                required: ['title', 'value', 'body', 'icon', 'tone'],
                properties: {
                  title: { type: 'string' },
                  value: { type: 'string' },
                  body: { type: 'string' },
                  icon: { type: 'string', enum: SLIDE_ICONS },
                  tone: { type: 'string', enum: ['tiffany', 'cream', 'white', 'ink'] },
                },
              },
            },
            chart: {
              type: 'object', additionalProperties: false,
              required: ['type', 'title', 'unit', 'caption', 'labels', 'series'],
              properties: {
                type: { type: 'string', enum: ['none', 'bar', 'line', 'donut'] },
                title: { type: 'string' },
                unit: { type: 'string' },
                caption: { type: 'string' },
                labels: { type: 'array', maxItems: 6, items: { type: 'string' } },
                series: {
                  type: 'array', maxItems: 3,
                  items: {
                    type: 'object', additionalProperties: false,
                    required: ['name', 'values'],
                    properties: {
                      name: { type: 'string' },
                      values: { type: 'array', maxItems: 6, items: { type: 'number' } },
                    },
                  },
                },
              },
            },
            imageIndices: { type: 'array', maxItems: 6, items: { type: 'integer', minimum: 0, maximum: 5 } },
          },
        },
      },
    },
  },
}

function compactProperty(property = {}) {
  const keys = [
    'id', 'title', 'name', 'description', 'location', 'price', 'currency', 'area', 'rooms',
    'bedrooms', 'bathrooms', 'floor', 'total_floors', 'year_built', 'property_type',
    'renovation', 'condition', 'balcony', 'parking', 'elevator', 'garden', 'pool',
    'additional_amenities', 'coordinates',
    'nearbyInfrastructure',
  ]
  return Object.fromEntries(keys.filter((key) => property[key] != null).map((key) => [key, property[key]]))
}

/** Не отдаём в Gemini битые /uploads (на Railway файлы часто 404) — иначе запрос зависает. */
export async function pickReachablePropertyAiImages(urls = [], overrides = {}) {
  const fetchImpl = overrides.fetchImpl || fetch
  const timeoutMs = Number(overrides.timeoutMs) || 2500
  const limit = Math.max(1, Number(overrides.limit) || 4)
  const selected = []
  for (const url of urls) {
    if (selected.length >= limit) break
    if (!/^https:\/\//i.test(String(url || ''))) continue
    try {
      const response = await fetchImpl(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (response.ok) {
        selected.push(url)
        continue
      }
      // Некоторые CDN не отдают HEAD — пробуем лёгкий GET.
      if (response.status === 405 || response.status === 403) {
        const getResponse = await fetchImpl(url, {
          method: 'GET',
          headers: { Range: 'bytes=0-0' },
          redirect: 'follow',
          signal: AbortSignal.timeout(timeoutMs),
        })
        if (getResponse.ok || getResponse.status === 206) selected.push(url)
      }
    } catch {
      /* skip unreachable */
    }
  }
  return selected
}

export async function requestPropertyAiModel({ category, question, property }, overrides = {}) {
  const apiKey = normalizeApiKey(overrides.apiKey || process.env.OPENROUTER_API_KEY)
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured')
  const fetchImpl = overrides.fetchImpl || fetch
  const mediaBaseUrl = overrides.mediaBaseUrl || propertyAiMediaBaseUrl()
  const pickImages = overrides.pickImages || pickReachablePropertyAiImages

  const system = `You are a careful real-estate analyst and presentation art director for SellYourBrick. Reply in English.
First answer the asked question directly in directAnswer: 2–4 substantive sentences.
Use only facts from the listing and visible photos. Do not invent neighborhood details, condition, yield, rent, documents, or legal circumstances.
For the area, use only nearbyInfrastructure: verified OpenStreetMap points with approximate straight-line distance. Explain clearly how nearby amenities help daily life, families, and liquidity.
Separate interpretations from facts and start them with “Possible takeaway:”. If nearbyInfrastructure is empty, say honestly that infrastructure was not verified.
Call any calculations approximate and list assumptions. Phrase risks as items to verify.
Always give at least 2 confirmed strengths and at least 2 risks or verification items. If data is scarce, explain honestly what is missing.
Prepare 4–8 useful metrics, 2–4 detailed sections, and a conclusion with next steps.

Fully design the presentation yourself in the slides array. The user does not set slide structure, count, or parameters: choose them as art director from the question, listing data, and photos. Create 7–10 slides and decide which facts deserve their own slide, which layout to use, and where to place photos, cards, icons, or a chart. Do not repeat the same structure: use at least four different layouts.

Visual language: light warm beige background, large SellYourBrick Tiffany brand blocks, refined typography, large property photos with soft rounded corners, clean cards, outline icons, and clear infographics. The first slide must be cover, the last — conclusion. When two or more photos exist, include gallery and at least two more photo-led slides. Use cards or stats for key facts, timeline for a verification sequence, comparison for a balanced decision. Add chart only when the listing has honest numeric data for it; never invent market trends. If chart data is missing, choose another layout. For chart.caption, state the data source or calculation. imageIndices are photo indexes in the original order starting at 0. Unused empty fields must be empty strings, empty arrays, and chart.type = "none".

Produce a short chat answer and a cohesive, visually varied presentation. Do not return HTML or markdown.`
  const text = `Category: ${category}\nQuestion: ${question}\nListing data:\n${JSON.stringify(compactProperty(property), null, 2)}`
  const content = [{ type: 'text', text }]
  const candidateUrls = (Array.isArray(property.images) ? property.images : [])
    .map((value) => resolvePropertyAiImageUrl(value, mediaBaseUrl))
    .filter(Boolean)
  const imageUrls = await pickImages(candidateUrls, { fetchImpl, limit: 4 })
  for (const url of imageUrls) {
    content.push({ type: 'image_url', image_url: { url } })
  }

  const response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://sellyourbrick.com',
      'X-Title': 'SellYourBrick Property AI',
    },
    body: JSON.stringify({
      model: PROPERTY_AI_MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content }],
      temperature: 0.4,
      max_tokens: 7500,
      response_format: { type: 'json_schema', json_schema: REPORT_JSON_SCHEMA },
    }),
    signal: AbortSignal.timeout(45_000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || `OpenRouter returned ${response.status}`)
  }
  const answer = data?.choices?.[0]?.message?.content
  if (typeof answer !== 'string' || !answer.trim()) throw new Error('OpenRouter returned an empty response')
  return answer
}

function fallbackAnswerForCategory(category) {
  if (category === 'investment') {
    return 'Based on the listing you can only run a preliminary investment review: the stated features are useful for comparison, but yield cannot be confirmed without rent, costs, and local market data. Before deciding, verify documents, actual condition, operating costs, and a realistic rental scenario.'
  }
  if (category === 'risks') {
    return 'The main strengths can only be confirmed from the listed features and available photos. The main risks come from missing listing data: before deciding, verify documents, actual condition, building systems, costs, and whether the photos match the property.'
  }
  return 'Available listing data supports a preliminary review, but a final decision is premature. Confirm documents, actual condition, building systems, costs, and photo accuracy with the seller.'
}

function buildFallbackReport(input, property, modelError) {
  const directAnswer = fallbackAnswerForCategory(input.category)
  return normalizePropertyAiReport({
    directAnswer,
    shortAnswer: directAnswer,
    title: `Listing review: ${property?.title || property?.name || 'property'}`,
    summary: 'This preliminary analysis uses facts from the listing only. Unverified claims were not used.',
    sections: [
      {
        title: 'What can be assessed now',
        body: 'The report gathers published features, available photos, and checkable comparison points for the listing.',
        bullets: ['Compare price and specs with similar listings.', 'Prepare questions for the seller before an in-person viewing.'],
      },
      {
        title: 'What to verify before deciding',
        body: 'Listing data does not replace technical, legal, and financial due diligence.',
        bullets: ['Request documents and information about encumbrances.', 'Check condition, building systems, and recurring costs.'],
      },
    ],
    assumptions: [
      'The analysis is based only on data published in the listing.',
      'Automatic model interpretation was unavailable; conclusions are limited to checkable facts.',
    ],
    conclusion: 'Use this report as a checklist of facts and verifications: request documents, inspect the property, and compare alternatives before a financial decision.',
  }, { ...input, property, modelError: String(modelError?.message || modelError || '') })
}

export async function runPropertyAiGeneration(input, overrides = {}) {
  const requestModel = overrides.requestModel || requestPropertyAiModel
  const renderPdf = overrides.renderPdf || renderPropertyAiReportPdf
  const updateReport = overrides.updateReport || updatePropertyAiReport
  const appendMessage = overrides.appendMessage || appendPropertyAiMessage
  const loadNeighborhood = overrides.loadNeighborhood || enrichPropertyAiNeighborhood
  let report = null
  let shortAnswer = ''

  try {
    await updateReport(input.reportId, { status: 'analyzing', error: null })
    let property = input.property
    try {
      property = await loadNeighborhood(input.property)
    } catch (neighborhoodError) {
      console.warn('Property AI neighborhood enrichment failed; continuing with listing data:', neighborhoodError?.message || neighborhoodError)
    }
    const generationInput = { ...input, property }
    try {
      const content = await requestModel(generationInput)
      report = parsePropertyAiModelContent(content, generationInput)
    } catch (modelError) {
      console.warn('Property AI model failed; creating a factual fallback report:', modelError?.message || modelError)
      report = buildFallbackReport(generationInput, property, modelError)
    }
    shortAnswer = report.shortAnswer
    await updateReport(input.reportId, { status: 'rendering', shortAnswer, report, error: null })
    const pdfData = await renderPdf({ report, property })
    const completed = await updateReport(input.reportId, {
      status: 'completed', shortAnswer, report, pdfData, error: null,
    })
    await appendMessage({
      conversationId: input.conversationId,
      reportId: input.reportId,
      role: 'assistant',
      content: shortAnswer,
    })
    return { ...completed, status: 'completed', report }
  } catch (error) {
    await updateReport(input.reportId, {
      status: 'failed',
      shortAnswer: shortAnswer || null,
      report,
      error: String(error?.message || error).slice(0, 1000),
    })
    throw error
  }
}
