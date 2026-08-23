/**
 * Оркестрация умного помощника: воронка + база знаний + каталог + LLM.
 */

import { getActiveAiProvider, isAiConfigured } from '../aiChatConfig.js'
import { postChatCompletions } from '../services/aiChatCompletion.js'
import { DEFAULT_CONFIG, formatDialogPathForPrompt, getBotConfig } from './botConfig.js'
import { formatCoreRulesForPrompt } from './botCoreRules.js'
import { analyzeConversation, dialogToPreferences, formatCriteriaForPrompt, formatStageInstruction } from './dialogContext.js'
import { evaluateIntentGate, formatIntentGateForPrompt, SCENARIOS } from './intentGate.js'
import { getKnowledgeBaseForPrompt } from './knowledgeBase.js'
import { formatCatalogForPrompt, searchCatalog, slimProperty } from './propertyMatcher.js'

const SITE_NAV = [
  { path: '/auction', label: 'Аукционы' },
  { path: '/map', label: 'Карта объектов' },
  { path: '/shares', label: 'Доли (Shares)' },
  { path: '/calculator', label: 'Умная панель инвестора' },
  { path: '/compare', label: 'Сравнение объектов' },
  { path: '/test-drive', label: 'Test-drive объектов' },
  { path: '/favorites', label: 'Избранное' },
  { path: '/news', label: 'Новости' },
  { path: '/about', label: 'О платформе' },
  { path: '/buyer', label: 'Покупателям' },
  { path: '/debts', label: 'Долги / Distressed' },
  { path: '/private-club', label: 'Private Club' },
  { path: '/chat', label: 'Чат с помощником' },
  { path: '/profile', label: 'Личный кабинет' },
]

const ALLOWED_PATHS = new Set(SITE_NAV.map((item) => item.path))

export function detectReplyLanguage(text = '') {
  const t = String(text || '')
  if (/[а-яё]/i.test(t)) return 'ru'
  if (
    /[ñáéíóúü¿¡]/i.test(t) ||
    /\b(hola|gracias|quiero|necesito|hipoteca|cómo|propiedad|subasta)\b/i.test(t)
  ) {
    return 'es'
  }
  if (/[a-z]/i.test(t)) return 'en'
  return 'ru'
}

function normalizeHistory(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((m) => m && (m.text || m.content))
    .map((m) => ({
      sender: m.sender === 'user' || m.role === 'user' ? 'user' : 'assistant',
      text: String(m.text || m.content || '').trim(),
    }))
    .filter((m) => m.text)
}

function languageRule(lang) {
  if (lang === 'en') return 'Reply STRICTLY in English. No mixed languages.'
  if (lang === 'es') return 'Responde ESTRICTAMENTE en español. Sin mezclar idiomas.'
  return 'Отвечай СТРОГО на русском языке. Без смеси языков. Обращение на «Вы».'
}

function stripReasoning(text = '') {
  let out = String(text || '')
  out = out.replace(/<think>[\s\S]*?<\/think>/gi, '')
  out = out.replace(/<\/?think>/gi, '')
  out = out.replace(/<redacted_reasoning>[\s\S]*?<\/redacted_reasoning>/gi, '')
  out = out.replace(/```(?:thinking|reasoning)[\s\S]*?```/gi, '')
  const jsonMatch = out.match(/\{[\s\S]*"text"\s*:[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0].trim()
  return out.trim()
}

function parseAssistantJson(raw) {
  const cleaned = stripReasoning(raw).replace(/```json\s*/g, '').replace(/```\s*/g, '')
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return { text: cleaned, buttons: null, needsMoreInfo: true, recommendations: null }
  }
}

function sanitizeNavigation(navigation) {
  if (!Array.isArray(navigation)) return []
  const seen = new Set()
  const out = []
  for (const item of navigation) {
    const path = String(typeof item === 'string' ? item : item?.path || item?.href || '')
      .trim()
      .split('#')[0]
      .replace(/\/+$/, '') || '/'
    const normalized = path.startsWith('/') ? path : `/${path}`
    const allowed =
      ALLOWED_PATHS.has(normalized) || /^\/property\/[A-Za-z0-9\-_%]+$/i.test(normalized)
    if (!allowed || seen.has(normalized)) continue
    seen.add(normalized)
    const fromCatalog = SITE_NAV.find((n) => n.path === normalized)
    out.push({
      path: normalized,
      label: String(item?.label || fromCatalog?.label || normalized).slice(0, 80),
    })
    if (out.length >= 6) break
  }
  return out
}

function navigationForScenario(gate, dialog) {
  if (gate.scenario === SCENARIOS.SHARES) return [{ path: '/shares', label: 'Доли (Shares)' }]
  if (gate.scenario === SCENARIOS.AUCTION_HELP) return [{ path: '/auction', label: 'Аукционы' }]
  if (gate.scenario === SCENARIOS.PLATFORM_HELP) {
    return [
      { path: '/about', label: 'О платформе' },
      { path: '/auction', label: 'Аукционы' },
      { path: '/calculator', label: 'Умная панель инвестора' },
    ]
  }
  return []
}

function deterministicCopy(dialog, gate, match, lang) {
  const ru = {
    hello:
      'Я помощник SellYourBrick и подбираю объекты только из текущего каталога. Что Вас интересует: инвестиции или недвижимость для себя?',
    purpose:
      'Что Вас интересует: инвестиции или недвижимость для себя? Для инвестиций подберу доли и объекты с долгами, для себя — аукцион и покупку сейчас.',
    budget: `В городе ${dialog.cityLabel} есть ${dialog.matchingLocationCount} подходящих объектов. Какой бюджет в евро Вы рассматриваете?`,
    location: 'Сначала выберем страну, затем город.',
    type: dialog.unavailablePropertyType
      ? `В городе ${dialog.cityLabel} нет объектов типа «${dialog.unavailablePropertyType}». Доступны: ${dialog.availablePropertyTypesLabel}. Какой тип Вам нужен?`
      : `Теперь выберите тип недвижимости. В городе ${dialog.cityLabel} доступны: ${dialog.availablePropertyTypesLabel}. Какой тип Вам нужен?`,
    country: `Выберите страну. В Вашей категории сейчас есть объекты в странах: ${dialog.availableCountriesLabel}.`,
    city: `Теперь выберите город в стране ${dialog.countryLabel}. Подходящие объекты есть в городах: ${dialog.availableCitiesLabel}.`,
    format: 'Какой формат удобнее: аукцион, купить сейчас или доли?',
    listings: match.items.length
      ? dialog.preferInvestmentVehicles
        ? dialog.unknownLocation
          ? `В каталоге нет объектов в «${dialog.unknownLocation}». Для инвестиций сразу подобрал доли и долги из наших локаций: ${dialog.availableLocationsLabel}.`
          : 'Для инвестиций сразу подобрал доли и объекты с долгами из нашего каталога. Откройте карточку или уточните локацию из тех, что есть у нас.'
        : 'Подобрал варианты из каталога SellYourBrick. Откройте карточку или скажите, какой ближе.'
      : dialog.unknownLocation
        ? `В каталоге нет объектов в «${dialog.unknownLocation}». Сейчас есть: ${dialog.availableLocationsLabel}.`
        : 'Сейчас по вашим критериям в каталоге пусто. Откройте доли или долги — там актуальные инвестиционные лоты.',
    platform:
      'SellYourBrick — платформа аукционов, покупки сейчас, долей и test-drive. Подбираю только объекты из текущего каталога сайта.',
    auction:
      'На аукционе вы смотрите лот, ставите выше текущей ставки и следите за таймером. Поздняя ставка может продлить торги, побеждает лучшая цена. Оформление — через платформу.',
    shares:
      'Доли — вход в объект меньшим чеком. Это раздел Shares: можно собрать портфель, не выкупая объект целиком.',
    visa:
      'По ВНЖ ориентиры такие: Испания часто от €500,000, Дубай зависит от объекта. Точные условия лучше подтвердить с менеджером.',
    manager: 'Могу соединить с менеджером. Напишите, как удобнее: звонок, почта, WhatsApp, Telegram или чат.',
  }
  const en = {
    hello:
      'I match listings only from the live SellYourBrick catalog. Are you interested in investment or a home for yourself?',
    purpose:
      'Are you interested in investment or a home for yourself? Investment searches use shares and debt listings; personal searches use auctions and buy-now listings.',
    budget: `There are ${dialog.matchingLocationCount} matching listings in ${dialog.cityLabel}. What EUR budget are you considering?`,
    location: 'First choose a country, then a city.',
    type: dialog.unavailablePropertyType
      ? `There are no “${dialog.unavailablePropertyType}” listings in ${dialog.cityLabel}. Available types: ${dialog.availablePropertyTypesLabel}. Which type do you need?`
      : `Now choose a property type. Available in ${dialog.cityLabel}: ${dialog.availablePropertyTypesLabel}. Which type do you need?`,
    country: `Choose a country. Your category currently has listings in: ${dialog.availableCountriesLabel}.`,
    city: `Now choose a city in ${dialog.countryLabel}. Matching listings are available in: ${dialog.availableCitiesLabel}.`,
    format: 'Which format works better: auction, buy now, or shares?',
    listings: match.items.length
      ? dialog.preferInvestmentVehicles
        ? dialog.unknownLocation
          ? `We have no listings in “${dialog.unknownLocation}”. For investing I picked shares and distressed lots from: ${dialog.availableLocationsLabel}.`
          : 'For investing I immediately picked shares and distressed lots from our catalog. Open a card or refine a location we actually have.'
        : 'Here are catalog matches. Open a card or tell me which is closer.'
      : dialog.unknownLocation
        ? `We have no listings in “${dialog.unknownLocation}”. Available now: ${dialog.availableLocationsLabel}.`
        : 'No catalog matches. Open shares or distressed lots for live investment options.',
    platform:
      'SellYourBrick is a platform for auctions, buy now, shares, and test-drive. I only match listings from the current catalog.',
    auction:
      'On an auction you view a lot, bid above the current price, and watch the timer. Late bids can extend time. Highest bid wins, then closing goes through the platform.',
    shares: 'Shares are a smaller entry into a property. Open the Shares section to build a portfolio without buying the whole asset.',
    visa: 'Residency guide: Spain often from €500,000; Dubai depends on the asset. Confirm details with a manager.',
    manager: 'I can connect you with a manager. How should they reach you: call, email, WhatsApp, Telegram, or chat?',
  }
  const es = {
    hello:
      'Busco inmuebles solo en el catálogo actual de SellYourBrick. ¿Le interesa invertir o comprar para usted?',
    purpose:
      '¿Le interesa invertir o comprar para usted? Para inversión buscaré participaciones y deudas; para usted, subastas y compra inmediata.',
    budget: `Hay ${dialog.matchingLocationCount} inmuebles adecuados en ${dialog.cityLabel}. ¿Qué presupuesto en euros contempla?`,
    location: 'Primero elegimos el país y después la ciudad.',
    type: dialog.unavailablePropertyType
      ? `No hay inmuebles del tipo «${dialog.unavailablePropertyType}» en ${dialog.cityLabel}. Tipos disponibles: ${dialog.availablePropertyTypesLabel}. ¿Qué tipo necesita?`
      : `Ahora elija el tipo. En ${dialog.cityLabel} hay: ${dialog.availablePropertyTypesLabel}. ¿Qué tipo necesita?`,
    country: `Elija el país. En su categoría hay inmuebles en: ${dialog.availableCountriesLabel}.`,
    city: `Ahora elija una ciudad en ${dialog.countryLabel}. Hay inmuebles adecuados en: ${dialog.availableCitiesLabel}.`,
    format: '¿Qué formato le encaja: subasta, compra ahora o participaciones?',
    listings: match.items.length
      ? dialog.preferInvestmentVehicles
        ? dialog.unknownLocation
          ? `No hay inmuebles en «${dialog.unknownLocation}». Para invertir le muestro participaciones y deudas de: ${dialog.availableLocationsLabel}.`
          : 'Para invertir le muestro ya participaciones y lotes con deudas de nuestro catálogo.'
        : 'Aquí tiene opciones del catálogo. Abra una ficha o dígame cuál encaja.'
      : dialog.unknownLocation
        ? `No hay inmuebles en «${dialog.unknownLocation}». Ahora hay: ${dialog.availableLocationsLabel}.`
        : 'No hay coincidencias. Abra participaciones o deudas.',
    platform:
      'SellYourBrick es una plataforma de subastas, compra ahora, participaciones y test-drive. Solo uso el catálogo actual.',
    auction:
      'En la subasta ve el lote, puja por encima del precio actual y sigue el temporizador. Una puja tardía puede ampliar el tiempo.',
    shares: 'Las participaciones permiten entrar en un inmueble con un ticket menor. Puede abrir la sección Shares.',
    visa: 'Residencia: España suele partir de 500.000 €; Dubái depende del activo. Confírmelo con un gestor.',
    manager: 'Puedo conectarle con un gestor. ¿Cómo le contactamos: llamada, email, WhatsApp, Telegram o chat?',
  }
  const pack = lang === 'en' ? en : lang === 'es' ? es : ru

  if (gate.scenario === SCENARIOS.MANAGER_HANDOFF) return pack.manager
  if (gate.scenario === SCENARIOS.AUCTION_HELP) return pack.auction
  if (gate.scenario === SCENARIOS.SHARES) return pack.shares
  if (gate.scenario === SCENARIOS.VISA_DOCS) return pack.visa
  if (gate.scenario === SCENARIOS.PLATFORM_HELP) return pack.platform
  if (dialog.stage === 'SHOW_LISTINGS') return pack.listings
  if (dialog.stage === 'NEED_BUDGET') return pack.budget
  if (dialog.stage === 'NEED_LOCATION') return pack.location
  if (dialog.stage === 'NEED_PROPERTY_TYPE') return pack.type
  if (dialog.stage === 'NEED_COUNTRY') return pack.country
  if (dialog.stage === 'NEED_CITY') return pack.city
  if (dialog.stage === 'NEED_FORMAT') return pack.format
  if (dialog.stage === 'NEED_PURPOSE') return pack.purpose
  return pack.hello
}

function buildDeterministicReply(dialog, gate, match, lang, preferences) {
  const navigation = sanitizeNavigation(navigationForScenario(gate, dialog))
  const mayRecommend = dialog.stage === 'SHOW_LISTINGS'
  return {
    text: deterministicCopy(dialog, gate, match, lang),
    buttons: null,
    needsMoreInfo: dialog.stage !== 'SHOW_LISTINGS',
    recommendations: mayRecommend && match.ids.length ? match.ids : null,
    navigation: navigation.length ? navigation : null,
    yieldEstimate: null,
    preferences: dialogToPreferences(dialog, preferences),
    stage: dialog.stage,
    scenario: gate.scenario,
  }
}

function buildSystemPrompt({ config, dialog, gate, match, knowledge, lang }) {
  const siteMap = SITE_NAV.map((item) => `- ${item.path} — ${item.label}`).join('\n')
  const knowledgeBlock = JSON.stringify(knowledge).slice(0, 12000)
  const catalogBlock =
    dialog.stage === 'SHOW_LISTINGS'
      ? formatCatalogForPrompt(match, lang)
      : 'Каталог не подключай: сначала закрой текущий этап воронки. recommendations = null.'
  const locationsBlock = `**ИЕРАРХИЯ ЛОКАЦИЙ КАТАЛОГА:**
- Страны для выбранной цели: ${dialog.availableCountriesLabel}
- Выбранная страна: ${dialog.countryLabel || 'ещё не выбрана'}
- Города только в выбранной стране: ${dialog.hasCountry ? dialog.availableCitiesLabel : 'не перечислять до выбора страны'}
Никогда не смешивай страны и города в одном списке. Сначала страна, следующим сообщением город.`

  return `${config.mainPrompt}

${languageRule(lang)}

${formatDialogPathForPrompt(config.dialogPath)}
${formatCoreRulesForPrompt(lang)}

${formatIntentGateForPrompt(gate)}

**ЭТАП:** ${dialog.stage}
${formatStageInstruction(dialog, lang)}
${formatCriteriaForPrompt(dialog)}

${locationsBlock}

${config.additionalConditions}

**РАЗДЕЛЫ САЙТА (navigation — только эти path или /property/:id):**
${siteMap}

**БАЗА ЗНАНИЙ (факты только отсюда):**
${knowledgeBlock}

${catalogBlock}

**ФОРМАТ ОТВЕТА (ТОЛЬКО JSON):**
{
  "text": "Текст ответа. Все варианты (цель, локации, тип, формат) пиши здесь, без кнопок.",
  "buttons": null,
  "needsMoreInfo": true/false,
  "recommendations": [1, 2] или null,
  "navigation": [{"path": "/auction", "label": "Аукционы"}] или null,
  "yieldEstimate": null
}

НИКОГДА не пиши рассуждения. Поле text — только финальный ответ клиенту.`
}

function validateRecommendations(ids, match, dialog) {
  if (dialog.stage !== 'SHOW_LISTINGS') return null
  const allowed = new Set((match?.ids || []).map(Number).filter(Number.isFinite))
  const incoming = (Array.isArray(ids) ? ids : [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && allowed.has(id))
  if (incoming.length) return incoming.slice(0, 5)
  return match.ids.length ? match.ids.slice(0, 5) : null
}

export function buildAssistantContext({ messages, preferences = {}, properties = [] }) {
  const history = normalizeHistory(messages)
  const lastUser = [...history].reverse().find((m) => m.sender === 'user')?.text || ''
  const lang = detectReplyLanguage(lastUser)
  const catalog = (Array.isArray(properties) ? properties : []).map(slimProperty).filter(Boolean)
  const dialog = analyzeConversation(history, lang, preferences, { catalog })
  const gate = evaluateIntentGate(history, lang)
  const maySearch = dialog.stage === 'SHOW_LISTINGS'
  const match = maySearch ? searchCatalog(catalog, dialog, 5) : { ids: [], items: [], total: catalog.length }
  const knowledge = getKnowledgeBaseForPrompt({
    query: lastUser,
    scenario: gate.scenario,
    language: lang,
    maxSections: 4,
  })
  return { history, lastUser, lang, dialog, gate, catalog, match, knowledge, preferences }
}

/**
 * @param {{ messages: Array, preferences?: object, properties?: Array, postChat?: Function }} input
 */
export async function buildAssistantReply(input = {}) {
  const ctx = buildAssistantContext(input)
  const fallback = buildDeterministicReply(ctx.dialog, ctx.gate, ctx.match, ctx.lang, ctx.preferences)
  const config = getBotConfig()

  const canCallLlm = typeof input.postChat === 'function' || isAiConfigured()
  if (!canCallLlm) return fallback

  const systemPrompt = buildSystemPrompt({
    config,
    dialog: ctx.dialog,
    gate: ctx.gate,
    match: ctx.match,
    knowledge: ctx.knowledge,
    lang: ctx.lang,
  })

  const messages = [
    { role: 'system', content: systemPrompt },
    ...ctx.history.slice(-12).map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
    })),
  ]

  try {
    const postChat = input.postChat || postChatCompletions
    const provider = getActiveAiProvider()
    const data = await postChat(
      {
        model: provider.defaultModel,
        messages,
        temperature: 0.6,
        max_tokens: 700,
      },
      { timeoutMs: 45000 },
    )
    const raw = data?.choices?.[0]?.message?.content || ''
    const parsed = parseAssistantJson(raw)
    if (!parsed?.text) return fallback

    const funnelStages = ['NEED_PURPOSE', 'NEED_COUNTRY', 'NEED_CITY', 'NEED_PROPERTY_TYPE', 'NEED_BUDGET', 'SHOW_LISTINGS']
    const inPropertyFunnel = funnelStages.includes(ctx.dialog.stage)
    const navigation = inPropertyFunnel
      ? []
      : sanitizeNavigation([
          ...(parsed.navigation || []),
          ...navigationForScenario(ctx.gate, ctx.dialog),
        ])

    const lockFunnelStage = ['NEED_PURPOSE', 'NEED_COUNTRY', 'NEED_CITY', 'NEED_BUDGET'].includes(ctx.dialog.stage)

    return {
      text: lockFunnelStage ? fallback.text : String(parsed.text).replace(/\*\*/g, '').trim(),
      buttons: null,
      needsMoreInfo: parsed.needsMoreInfo !== false,
      recommendations: validateRecommendations(parsed.recommendations, ctx.match, ctx.dialog),
      navigation: navigation.length ? navigation : fallback.navigation,
      yieldEstimate: null,
      preferences: dialogToPreferences(ctx.dialog, ctx.preferences),
      stage: ctx.dialog.stage,
      scenario: ctx.gate.scenario,
    }
  } catch (error) {
    console.warn('[assistant] LLM fallback:', error?.message || error)
    return fallback
  }
}

export { DEFAULT_CONFIG, SITE_NAV }
