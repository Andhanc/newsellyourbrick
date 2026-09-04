import { wantsEscalation } from './botCoreRules.js'
import { detectDealFormat, detectLocationPreference, detectPropertyTypePreference } from './dialogContext.js'
import { isSpainPropertyLegalQuery } from './spainLegalKnowledge.js'

export const SCENARIOS = {
  PROPERTY_SEARCH: 'property_search',
  PLATFORM_HELP: 'platform_help',
  AUCTION_HELP: 'auction_help',
  SHARES: 'shares',
  VISA_DOCS: 'visa_docs',
  SPAIN_LEGAL: 'spain_property_sale_legal',
  MANAGER_HANDOFF: 'manager_handoff',
  SUPPORT_OTHER: 'support_other',
  GENERAL: 'general',
}

function wantsManagerHandoff(text) {
  const s = String(text || '').toLowerCase()
  if (!s.trim()) return false
  if (
    /\b(не\s+нужен|не\s+хочу|не\s+надо|без\s+менеджера)\b/i.test(s) &&
    /\b(менеджер|оператор|консультант)\b/i.test(s)
  ) {
    return false
  }
  return (
    wantsEscalation(s) ||
    /связ(ать|и|итесь|ься)\s+(с\s+)?(менеджер|оператор|консультант|специалист)/i.test(s) ||
    /(менеджер|оператор).{0,40}(позвон|перезвон|напиш|связ)/i.test(s) ||
    /(?:нужен|нужна|хочу|можно|позовите|позови)\s+(?:живого\s+)?(?:менеджер|оператор|консультант)/i.test(s) ||
    /(перезвон|обратн(ый|ого)\s+звонок|call\s*back)/i.test(s) ||
    /\b(human|live)\s+(agent|operator|person|support)\b/i.test(s) ||
    /\b(connect|speak|talk)\s+(to|with)\s+(a\s+)?(manager|agent|operator|human)\b/i.test(s)
  )
}

function isGreetingOrSmallTalk(text) {
  const s = String(text || '').trim()
  if (s.length > 80) return false
  return /^(привет|здравствуйте|добрый\s+(день|вечер)|hello|hi|hey|hola|gracias|спасибо|ок|ok|хорошо|fine)[\s!.?]*$/i.test(
    s,
  )
}

export function classifyScenario(text) {
  const value = String(text || '').trim()
  const lower = value.toLowerCase()
  if (!value) return { scenario: SCENARIOS.GENERAL, confidence: 0, strongSignal: false }

  if (wantsManagerHandoff(value)) {
    return { scenario: SCENARIOS.MANAGER_HANDOFF, confidence: 1, strongSignal: true }
  }

  if (
    /подписк|ошибк[а-яё]*\s+(?:сайт|бот|кабинет)|не\s+работает\s+(?:сайт|бот)|тех(?:ническ)?\s*поддерж|technical\s+support/i.test(
      lower,
    )
  ) {
    return { scenario: SCENARIOS.SUPPORT_OTHER, confidence: 0.95, strongSignal: true }
  }

  if (isSpainPropertyLegalQuery(lower)) {
    return { scenario: SCENARIOS.SPAIN_LEGAL, confidence: 0.95, strongSignal: true }
  }

  if (/доли|shares?|соинвест|фракцион|долев/i.test(lower)) {
    return { scenario: SCENARIOS.SHARES, confidence: 0.9, strongSignal: true }
  }

  if (/как\s+работ.*(аукцион|торг)|что\s+такое\s+аукцион|правила\s+аукцион|how\s+(does\s+)?(the\s+)?auction/i.test(lower)) {
    return { scenario: SCENARIOS.AUCTION_HELP, confidence: 0.92, strongSignal: true }
  }

  if (
    /о\s+платформ|о\s+вас|что\s+такое\s+sellyourbrick|как\s+работ.*(сайт|платформ)|тест.?драйв|test.?drive|калькулятор|панель\s+инвест|сравн|compare|карта\s+объект|бонус|промокод|реферал|кошел|депозит|подписк|тариф|избран|профил|личн.*кабинет|истори.*став|презентац|property\s*ai|размест.*объект|кабинет\s+продав|скачать.*прилож|лотере|bonus|promo\s*code|wallet|deposit|subscription|favorite|profile|seller\s+cabinet/i.test(
      lower,
    )
  ) {
    return { scenario: SCENARIOS.PLATFORM_HELP, confidence: 0.9, strongSignal: true }
  }

  const type = detectPropertyTypePreference(value)
  const location = detectLocationPreference(value)
  const format = detectDealFormat(value)
  const propertySignal =
    type.hasType ||
    location.hasLocation ||
    format.hasFormat ||
    /(?:инвест|investment|недвижимост|объект|подборк|вариант|купить|квартир|вилл|дом\b|property|listing|apartment|villa)/i.test(
      lower,
    )

  if (propertySignal) {
    return {
      scenario: SCENARIOS.PROPERTY_SEARCH,
      confidence: type.hasType || location.hasLocation ? 0.95 : 0.75,
      strongSignal: true,
    }
  }

  if (isGreetingOrSmallTalk(value)) {
    return {
      scenario: SCENARIOS.GENERAL,
      confidence: 0.8,
      strongSignal: true,
      smallTalk: true,
    }
  }

  return { scenario: SCENARIOS.GENERAL, confidence: 0.35, strongSignal: false }
}

export function evaluateIntentGate(conversationHistory, language = 'ru', previousTopic = null) {
  const lastUser =
    [...(conversationHistory || [])].reverse().find((message) => message?.sender === 'user')?.text ||
    ''
  const classification = classifyScenario(lastUser)
  let previous = previousTopic && typeof previousTopic === 'object' ? previousTopic : null
  if (!previous && !classification.strongSignal) {
    const earlierUsers = (conversationHistory || [])
      .filter((message) => message?.sender === 'user')
      .slice(0, -1)
      .reverse()
    for (const message of earlierUsers) {
      const candidate = classifyScenario(message.text)
      if (!candidate.strongSignal || candidate.smallTalk) continue
      previous = candidate
      break
    }
  }

  let scenario = classification.scenario
  if (!classification.strongSignal && previous?.scenario) {
    scenario = previous.scenario
  }
  if (classification.smallTalk && previous?.scenario === SCENARIOS.PROPERTY_SEARCH) {
    scenario = SCENARIOS.PROPERTY_SEARCH
  }

  return {
    scenario,
    confidence: classification.confidence,
    strongSignal: classification.strongSignal,
    smallTalk: Boolean(classification.smallTalk),
    language: String(language || 'ru').toLowerCase().slice(0, 2),
    lastUserText: String(lastUser).slice(0, 500),
  }
}

export function formatIntentGateForPrompt(gate) {
  if (!gate) return ''
  if (gate.smallTalk) {
    return `**ACTIVE SCENARIO: SMALL TALK**
Ответь тепло и коротко, верни в воронку (цель/бюджет). Объекты не отправляй.`
  }
  if (gate.scenario === SCENARIOS.SUPPORT_OTHER) {
    return `**ACTIVE SCENARIO: SUPPORT**
Ответь по кабинету/сайту. Не запускай воронку подбора и не проси бюджет, пока клиент сам не вернётся к объектам.`
  }
  if (gate.scenario === SCENARIOS.SPAIN_LEGAL || gate.scenario === SCENARIOS.VISA_DOCS) {
    return `**ACTIVE SCENARIO: SPAIN PROPERTY-SALE LEGAL**
Отвечай только по юридическим вопросам продажи/покупки недвижимости в Испании и только из блока SPAIN LEGAL VERIFIED CONTEXT.
Не используй старые знания модели для меняющихся процентов, налоговых ставок, сроков, визовых правил и банковских предложений.
Если источника или обязательной локации не хватает, прямо скажи это и запроси автономное сообщество/муниципалитет либо предложи испанского профильного специалиста.`
  }
  if (gate.scenario === SCENARIOS.SHARES) {
    return `**ACTIVE SCENARIO: SHARES**
Объясни доли SellYourBrick из базы знаний. Дай navigation на /shares. Не подменяй это виллами, если клиент не просил подбор.`
  }
  if (gate.scenario === SCENARIOS.AUCTION_HELP) {
    return `**ACTIVE SCENARIO: AUCTION HELP**
Объясни, как работает аукцион на SellYourBrick. Дай navigation на /auction. Подборку — только если явно просят объекты.`
  }
  if (gate.scenario === SCENARIOS.PLATFORM_HELP) {
    return `**ACTIVE SCENARIO: PLATFORM**
Консультация по сайту: аукционы, доли, test-drive, калькулятор, сравнение, карта, кабинеты. Используй разрешённые path в navigation.`
  }
  if (gate.scenario === SCENARIOS.MANAGER_HANDOFF) {
    return `**ACTIVE SCENARIO: MANAGER HANDOFF**
Клиент хочет человека. Не подменяй это новой квалификацией и не шли объекты вместо связи с менеджером.`
  }
  if (gate.scenario === SCENARIOS.PROPERTY_SEARCH) {
    return `**ACTIVE SCENARIO: PROPERTY SEARCH**
Держи воронку подбора по объектам SellYourBrick. Не переключайся на ипотеку/поддержку без явного запроса.`
  }
  return ''
}
