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
    .slice(0, 4)
}

function propertyFactStrengths(property, images) {
  const items = []
  if (property.area) items.push(`В объявлении указана площадь ${property.area} м² — объект можно предметно сравнивать с альтернативами.`)
  if (property.rooms) items.push(`Планировка заявлена как ${property.rooms}-комнатная — это даёт базу для оценки сценария проживания.`)
  if (property.location) items.push(`Локация указана как «${limitText(property.location, 120)}», поэтому окружение можно проверить до просмотра.`)
  if (property.year_built) items.push(`Указан ${property.year_built} год строительства — важный ориентир для технической проверки дома.`)
  if (images.length) items.push(`В объявлении доступно ${images.length} ${images.length === 1 ? 'реальное фото' : 'реальных фото'} для первичной визуальной оценки.`)
  if (property.price) items.push('Цена опубликована, поэтому можно рассчитать стоимость за м² и сравнить объект с похожими предложениями.')
  if (!items.length) items.push('Объект представлен отдельным объявлением и доступен для первичного анализа.')
  if (items.length < 2) items.push('По объекту можно сформировать точечный список вопросов продавцу до личного просмотра.')
  return items
}

function propertyRiskChecks(property) {
  const items = []
  if (!property.condition && !property.renovation) items.push('Состояние отделки и объём возможных работ не раскрыты — это нужно проверить по фото, видео или на просмотре.')
  if (!property.year_built) items.push('Год строительства не указан — важно уточнить возраст здания и историю капитальных ремонтов.')
  if (!property.floor && !property.total_floors) items.push('Этаж и этажность не указаны — эти параметры могут влиять на удобство и ликвидность.')
  if (!property.coordinates && !property.location) items.push('Точная локация не раскрыта — нельзя проверить транспорт, инфраструктуру и окружение.')
  items.push('Юридический статус, ограничения и комплект документов необходимо подтвердить до сделки.')
  items.push('Состояние инженерных систем и фактические эксплуатационные расходы нужно уточнить отдельно.')
  return items
}

function propertyMetrics(property, images) {
  const metrics = []
  if (property.price) metrics.push({ label: 'Цена', value: `${property.price} ${property.currency || ''}`.trim(), note: 'По данным объявления' })
  if (property.area) metrics.push({ label: 'Площадь', value: `${property.area} м²`, note: 'Заявленная площадь' })
  if (property.rooms) metrics.push({ label: 'Комнаты', value: String(property.rooms), note: 'По данным объявления' })
  if (property.bedrooms) metrics.push({ label: 'Спальни', value: String(property.bedrooms), note: 'По данным объявления' })
  if (property.floor) metrics.push({ label: 'Этаж', value: property.total_floors ? `${property.floor} из ${property.total_floors}` : String(property.floor), note: 'Положение в здании' })
  if (property.year_built) metrics.push({ label: 'Год', value: String(property.year_built), note: 'Год строительства' })
  if (property.location) metrics.push({ label: 'Локация', value: limitText(property.location, 100), note: 'Как указано в объявлении' })
  if (images.length) metrics.push({ label: 'Фотографии', value: String(images.length), note: 'Реальные фото объявления' })
  return metrics.slice(0, 8)
}

function normalizeNeighborhood(property, input) {
  const groups = (Array.isArray(property.nearbyInfrastructure) ? property.nearbyInfrastructure : [])
    .map((group) => ({
      category: limitText(group?.category, 40),
      label: limitText(group?.label, 80) || 'Инфраструктура',
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

  const verifiedHighlights = groups.flatMap((group) => group.places.slice(0, 2).map((place) => `${group.label}: ${place.name} — ${place.distanceMeters} м`))
  const modelHighlights = cleanList(input.infrastructureHighlights, 6, 240)
  const highlights = [...verifiedHighlights, ...modelHighlights]
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 6)
  const fallbackSummary = groups.length
    ? 'По координатам объекта найдены точки повседневной инфраструктуры в радиусе 1,5 км. Расстояния указаны приблизительно по прямой и требуют проверки маршрута.'
    : 'Координаты или данные OpenStreetMap недоступны, поэтому инфраструктуру района нужно проверить вручную перед решением.'

  return {
    summary: limitText(input.neighborhoodSummary, 700) || fallbackSummary,
    highlights: highlights.length ? highlights : [
      'Проверьте время пешего маршрута до остановок и магазинов.',
      'Уточните школы, медицину, шум и будущую застройку района.',
    ],
    groups,
    sourceNote: groups.length ? 'Источник фактов: OpenStreetMap, радиус поиска 1,5 км.' : 'Автоматическая проверка инфраструктуры не выполнена.',
  }
}

export function normalizePropertyAiReport(input = {}, context = {}) {
  const property = context.property || {}
  const propertyTitle = limitText(property.title || property.name || 'Объект недвижимости', 160)
  const title = limitText(input.title, 160) || `AI-разбор: ${propertyTitle}`
  const summary = limitText(input.summary, 1200) || limitText(input.directAnswer || input.shortAnswer, 1200)
  const directAnswer = limitText(input.directAnswer || input.shortAnswer, 1800) || summary || 'По данным объявления можно сделать только предварительный вывод; ключевые параметры нужно подтвердить у продавца.'
  const shortAnswer = directAnswer
  const sections = normalizeSections(input.sections)
  const assumptions = cleanList(input.assumptions, 8, 260)
  const conclusion = limitText(input.conclusion, 1400) || 'Перед решением рекомендуем проверить документы и исходные данные объекта.'
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

  const detailSections = (sections.length ? sections : [{ title: 'Подробный анализ', body: summary, bullets: assumptions }]).slice(0, 2)
  const detailsBody = limitText(detailSections.map((section) => [section.title, section.body].filter(Boolean).join(': ')).filter(Boolean).join('\n\n'), 1800)
  const detailsBullets = cleanList(detailSections.flatMap((section) => section.bullets || []).concat(assumptions), 6, 220)

  const pages = [
    { type: 'cover', title, body: summary },
    { type: 'snapshot', title: 'Паспорт объекта', metrics },
    { type: 'balance', title: 'Плюсы и риски', strengths, risks },
    {
      type: 'answer',
      title: limitText(context.question, 120) || 'Ответ на вопрос',
      body: directAnswer,
      bullets: detailSections[0]?.bullets || [],
    },
    ...(images.length ? [{ type: 'gallery', title: 'Реальные фотографии объекта', images: images.slice(0, 4) }] : []),
    { type: 'details', title: 'Подробный анализ и проверки', body: detailsBody || summary, bullets: detailsBullets },
    { type: 'neighborhood', title: 'Район и инфраструктура', neighborhood },
  ]

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
    pages: pages.slice(0, 10),
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
