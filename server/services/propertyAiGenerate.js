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
  if (!apiKey) throw new Error('OPENROUTER_API_KEY не настроен')
  const fetchImpl = overrides.fetchImpl || fetch
  const mediaBaseUrl = overrides.mediaBaseUrl || propertyAiMediaBaseUrl()
  const pickImages = overrides.pickImages || pickReachablePropertyAiImages

  const system = `Ты — осторожный аналитик недвижимости и арт-директор презентаций SellYourBrick. Отвечай на русском языке.
Сначала прямо ответь на заданный вопрос в поле directAnswer: 2–4 содержательных предложения.
Используй только факты из объявления и видимых фотографий. Не придумывай район, состояние, доходность, аренду, документы или юридические обстоятельства.
Для района используй только nearbyInfrastructure: это проверенные точки OpenStreetMap с приблизительным расстоянием по прямой. Подробно объясняй пользу инфраструктуры для повседневной жизни, семьи и ликвидности.
Интерпретации отделяй от фактов и начинай словами «Возможный вывод:». Если nearbyInfrastructure пуст, честно напиши, что инфраструктура не проверена.
Любые расчёты называй ориентировочными и перечисляй допущения. Риски формулируй как пункты для проверки.
Всегда дай минимум 2 подтверждённых плюса и минимум 2 риска или пункта для проверки. Если данных мало, честно объясни, какой информации не хватает.
Подготовь 4–8 полезных метрик, 2–4 подробных раздела и вывод со следующими шагами.

Полностью спроектируй презентацию сам в массиве slides. Пользователь не задаёт структуру, количество или параметры слайдов: ты выбираешь их как арт-директор исходя из вопроса, данных и фотографий объекта. Создай 7–10 слайдов и реши, какие факты заслуживают отдельного слайда, какой layout нужен, где использовать фотографию, карточки, иконки или график. Не повторяй одну и ту же структуру: используй минимум четыре разных layout.

Визуальный язык: светлый тёплый бежевый фон, крупные фирменные тифани-блоки SellYourBrick, тонкая типографика, большие фотографии объекта с мягкими скруглениями, чистые карточки, контурные иконки и ясная инфографика. Первый слайд должен быть cover, последний — conclusion. При наличии двух и более фотографий обязательно используй gallery и ещё минимум два фото-ориентированных слайда. Используй cards или stats для ключевых фактов, timeline для последовательности проверок, comparison для взвешенного решения. Добавь chart, только если в объявлении есть честные числовые данные для него; никогда не выдумывай рынок или динамику. Если данных для графика нет, выбери другой layout. Для chart.caption укажи происхождение данных или формулу расчёта. imageIndices — индексы фотографий в исходном порядке, начиная с 0. Пустые неиспользуемые поля возвращай пустыми строками, массивами и chart.type = "none".

Сделай короткий ответ для чата и содержание цельной, визуально разнообразной презентации. Не возвращай HTML или markdown.`
  const text = `Категория: ${category}\nВопрос: ${question}\nДанные объекта:\n${JSON.stringify(compactProperty(property), null, 2)}`
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
    throw new Error(data?.error?.message || data?.error || `OpenRouter вернул ${response.status}`)
  }
  const answer = data?.choices?.[0]?.message?.content
  if (typeof answer !== 'string' || !answer.trim()) throw new Error('OpenRouter вернул пустой ответ')
  return answer
}

function fallbackAnswerForCategory(category) {
  if (category === 'investment') {
    return 'По данным объявления можно провести только предварительную инвестиционную оценку: заявленные характеристики подходят для сравнения с альтернативами, но доходность нельзя подтвердить без цены аренды, расходов и локальных рыночных данных. До решения проверьте документы, фактическое состояние, эксплуатационные затраты и реалистичный арендный сценарий.'
  }
  if (category === 'risks') {
    return 'Главные плюсы объекта можно подтвердить только по указанным в объявлении характеристикам и доступным фотографиям. Основные риски сейчас связаны с данными, которых нет в объявлении: перед решением нужно проверить документы, фактическое состояние, инженерные системы, расходы и соответствие фотографий самому объекту.'
  }
  return 'По доступным данным объявления можно сделать предварительный разбор объекта, но окончательное решение пока преждевременно. Подтвердите у продавца документы, фактическое состояние, инженерные системы, расходы и соответствие фотографий объекту.'
}

function buildFallbackReport(input, property, modelError) {
  const directAnswer = fallbackAnswerForCategory(input.category)
  return normalizePropertyAiReport({
    directAnswer,
    shortAnswer: directAnswer,
    title: `Разбор объекта: ${property?.title || property?.name || 'недвижимость'}`,
    summary: 'Предварительный анализ сформирован по фактам из объявления. Неподтверждённые сведения не использовались.',
    sections: [
      {
        title: 'Что можно оценить сейчас',
        body: 'В отчёте собраны опубликованные характеристики, доступные фотографии и проверяемые ориентиры для сравнения объекта.',
        bullets: ['Сопоставьте цену и параметры с похожими предложениями.', 'Подготовьте вопросы продавцу до личного просмотра.'],
      },
      {
        title: 'Что проверить до решения',
        body: 'Данные объявления не заменяют техническую, юридическую и финансовую проверку объекта.',
        bullets: ['Запросите документы и сведения об ограничениях.', 'Проверьте состояние объекта, инженерные системы и регулярные расходы.'],
      },
    ],
    assumptions: [
      'Анализ основан только на данных, опубликованных в объявлении.',
      'Автоматическая интерпретация модели была недоступна; выводы ограничены проверяемыми фактами.',
    ],
    conclusion: 'Используйте этот отчёт как список фактов и проверок: запросите документы, проведите осмотр и сравните объект с альтернативами перед финансовым решением.',
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
