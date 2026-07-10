import { normalizeApiKey } from '../aiChatConfig.js'
import { appendPropertyAiMessage, updatePropertyAiReport } from '../database/propertyAiReportsPrisma.js'
import { parsePropertyAiModelContent } from './propertyAiReportContract.js'
import { renderPropertyAiReportPdf } from './propertyAiPdfRenderer.js'

export const PROPERTY_AI_MODEL = process.env.PROPERTY_AI_MODEL || 'google/gemini-3.5-flash'

const REPORT_JSON_SCHEMA = {
  name: 'property_ai_report',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['shortAnswer', 'title', 'summary', 'strengths', 'risks', 'metrics', 'sections', 'conclusion', 'assumptions'],
    properties: {
      shortAnswer: { type: 'string' },
      title: { type: 'string' },
      summary: { type: 'string' },
      strengths: { type: 'array', items: { type: 'string' } },
      risks: { type: 'array', items: { type: 'string' } },
      metrics: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false, required: ['label', 'value', 'note'],
          properties: { label: { type: 'string' }, value: { type: 'string' }, note: { type: 'string' } },
        },
      },
      sections: {
        type: 'array', minItems: 1, maxItems: 3,
        items: {
          type: 'object', additionalProperties: false, required: ['title', 'body', 'bullets'],
          properties: { title: { type: 'string' }, body: { type: 'string' }, bullets: { type: 'array', items: { type: 'string' } } },
        },
      },
      conclusion: { type: 'string' },
      assumptions: { type: 'array', items: { type: 'string' } },
    },
  },
}

function compactProperty(property = {}) {
  const keys = [
    'id', 'title', 'name', 'description', 'location', 'price', 'currency', 'area', 'rooms',
    'bedrooms', 'bathrooms', 'floor', 'total_floors', 'year_built', 'property_type',
    'renovation', 'condition', 'balcony', 'parking', 'elevator', 'garden', 'pool',
    'additional_amenities', 'coordinates',
  ]
  return Object.fromEntries(keys.filter((key) => property[key] != null).map((key) => [key, property[key]]))
}

export async function requestPropertyAiModel({ category, question, property }) {
  const apiKey = normalizeApiKey(process.env.OPENROUTER_API_KEY)
  if (!apiKey) throw new Error('OPENROUTER_API_KEY не настроен')

  const system = `Ты — осторожный аналитик недвижимости SellYourBrick. Отвечай на русском языке.
Используй только факты из объявления. Не придумывай район, состояние, доходность, аренду, документы или юридические обстоятельства.
Любые расчёты называй ориентировочными и перечисляй допущения. Риски формулируй как пункты для проверки.
Сделай короткий ответ для чата и содержание красивого отчёта на 6–8 страниц. Не возвращай HTML или markdown.`
  const text = `Категория: ${category}\nВопрос: ${question}\nДанные объекта:\n${JSON.stringify(compactProperty(property), null, 2)}`
  const content = [{ type: 'text', text }]
  for (const url of (Array.isArray(property.images) ? property.images : []).filter((item) => /^https:\/\//i.test(String(item))).slice(0, 4)) {
    content.push({ type: 'image_url', image_url: { url } })
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
      temperature: 0.25,
      max_tokens: 5000,
      response_format: { type: 'json_schema', json_schema: REPORT_JSON_SCHEMA },
    }),
    signal: AbortSignal.timeout(32_000),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || `OpenRouter вернул ${response.status}`)
  }
  const answer = data?.choices?.[0]?.message?.content
  if (typeof answer !== 'string' || !answer.trim()) throw new Error('OpenRouter вернул пустой ответ')
  return answer
}

export async function runPropertyAiGeneration(input, overrides = {}) {
  const requestModel = overrides.requestModel || requestPropertyAiModel
  const renderPdf = overrides.renderPdf || renderPropertyAiReportPdf
  const updateReport = overrides.updateReport || updatePropertyAiReport
  const appendMessage = overrides.appendMessage || appendPropertyAiMessage
  let report = null
  let shortAnswer = ''

  try {
    await updateReport(input.reportId, { status: 'analyzing', error: null })
    const content = await requestModel(input)
    report = parsePropertyAiModelContent(content, input)
    shortAnswer = report.shortAnswer
    await updateReport(input.reportId, { status: 'rendering', shortAnswer, report, error: null })
    const pdfData = await renderPdf({ report, property: input.property })
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
