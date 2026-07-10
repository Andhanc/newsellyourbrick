export const PROPERTY_AI_CATEGORIES = Object.freeze({
  risks: 'Какие у этого объекта главные плюсы и риски?',
  investment: 'Какой инвестиционный потенциал у этого объекта?',
  details: 'Сделай подробный разбор этого объекта.',
  custom: '',
})

const limitText = (value, max = 1800) => String(value ?? '').trim().slice(0, max)
const cleanList = (value, maxItems = 8, maxLength = 240) =>
  (Array.isArray(value) ? value : [])
    .map((item) => limitText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems)

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
    throw new Error('Неизвестная категория анализа')
  }

  const question = category === 'custom'
    ? limitText(input.question, 600)
    : PROPERTY_AI_CATEGORIES[category]

  if (category === 'custom' && question.length < 5) {
    throw new Error('Свой вопрос должен содержать не менее 5 символов')
  }

  return { category, question }
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
    .slice(0, 3)
}

export function normalizePropertyAiReport(input = {}, context = {}) {
  const property = context.property || {}
  const propertyTitle = limitText(property.title || property.name || 'Объект недвижимости', 160)
  const title = limitText(input.title, 160) || `AI-разбор: ${propertyTitle}`
  const summary = limitText(input.summary, 1200) || limitText(input.shortAnswer, 1200)
  const shortAnswer = limitText(input.shortAnswer, 1800) || summary || 'Отчёт по объекту подготовлен.'
  const strengths = cleanList(input.strengths, 8, 260)
  const risks = cleanList(input.risks, 8, 260)
  const metrics = normalizeMetrics(input.metrics)
  const sections = normalizeSections(input.sections)
  const assumptions = cleanList(input.assumptions, 8, 260)
  const conclusion = limitText(input.conclusion, 1400) || 'Перед решением рекомендуем проверить документы и исходные данные объекта.'
  const images = (Array.isArray(property.images) ? property.images : [])
    .map(safeListingImage)
    .filter(Boolean)
    .slice(0, 6)

  const analysisPage = sections[0] || {
    title: context.question || 'Подробный анализ',
    body: summary,
    bullets: [],
  }
  const extraSections = sections.slice(1)

  const pages = [
    { type: 'cover', title, body: summary },
    { type: 'snapshot', title: 'Объект в цифрах', metrics },
    { type: 'balance', title: 'Плюсы и риски', strengths, risks },
    { type: 'analysis', ...analysisPage },
    {
      type: 'details',
      title: extraSections[0]?.title || 'Что важно проверить',
      body: extraSections[0]?.body || '',
      bullets: extraSections[0]?.bullets?.length ? extraSections[0].bullets : assumptions,
    },
    { type: 'conclusion', title: 'Итог', body: conclusion, bullets: assumptions },
  ]

  if (extraSections[1]) {
    pages.splice(5, 0, { type: 'details', ...extraSections[1] })
  }

  return {
    category: context.category || 'details',
    question: limitText(context.question, 600),
    title,
    summary,
    shortAnswer,
    strengths,
    risks,
    metrics,
    sections,
    assumptions,
    conclusion,
    images,
    pages: pages.slice(0, 8),
    disclaimer: 'Материал сформирован AI на основе данных объявления, носит информационный характер и не является финансовой, юридической или оценочной консультацией.',
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
    if (!match) throw new Error('AI вернул ответ в неподдерживаемом формате')
    parsed = JSON.parse(match[0])
  }
  return normalizePropertyAiReport(parsed, context)
}
