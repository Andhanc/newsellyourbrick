import { wantsEscalation } from './botCoreRules.js'
import { detectDealFormat, detectLocationPreference, detectPropertyTypePreference } from './dialogContext.js'
import { matchSiteGuide } from './siteGuide.js'
import { isSpainPropertyLegalQuery } from './spainLegalKnowledge.js'
import { isCabinetPersonalQuery } from './userContext.js'

export const SCENARIOS = {
  PROPERTY_SEARCH: 'property_search',
  PROPERTY_ABOUT: 'property_about',
  PLATFORM_HELP: 'platform_help',
  AUCTION_HELP: 'auction_help',
  SHARES: 'shares',
  VISA_DOCS: 'visa_docs',
  SPAIN_LEGAL: 'spain_property_sale_legal',
  MANAGER_HANDOFF: 'manager_handoff',
  SUPPORT_OTHER: 'support_other',
  GENERAL: 'general',
}

/** Режимы выбора в начале диалога умного помощника. */
export const ASSISTANT_MODES = {
  MATCH: 'match',
  PLATFORM: 'platform',
  ABOUT: 'about',
}

export function normalizeAssistantMode(value) {
  const mode = String(value || '').toLowerCase().trim()
  if (mode === ASSISTANT_MODES.MATCH || mode === ASSISTANT_MODES.PLATFORM || mode === ASSISTANT_MODES.ABOUT) {
    return mode
  }
  return null
}

const GUIDE_SCENARIOS = new Set([
  SCENARIOS.PLATFORM_HELP,
  SCENARIOS.AUCTION_HELP,
  SCENARIOS.SHARES,
  SCENARIOS.SPAIN_LEGAL,
  SCENARIOS.VISA_DOCS,
  SCENARIOS.SUPPORT_OTHER,
  SCENARIOS.MANAGER_HANDOFF,
])

function isGuideScenario(scenario) {
  return GUIDE_SCENARIOS.has(scenario)
}

/**
 * Режим стартера — предпочтение, а не замок.
 * Явный вопрос о разделе сайта отвечает гид, даже если чат начат с подбора.
 * Явный поиск объекта включает воронку, даже если чат начат с вопросов о платформе.
 * Эскалацию к менеджеру не перебиваем.
 */
export function applyAssistantMode(gate, assistantMode) {
  const mode = normalizeAssistantMode(assistantMode)
  if (!mode || !gate) return gate
  if (gate.scenario === SCENARIOS.MANAGER_HANDOFF) {
    return { ...gate, assistantMode: mode }
  }

  const guideTurn = Boolean(gate.strongSignal && isGuideScenario(gate.scenario))
  const searchTurn = Boolean(gate.strongSignal && gate.scenario === SCENARIOS.PROPERTY_SEARCH)
  if (guideTurn) {
    return { ...gate, assistantMode: mode, guideTurn: true }
  }

  if (mode === ASSISTANT_MODES.MATCH) {
    return { ...gate, scenario: SCENARIOS.PROPERTY_SEARCH, assistantMode: mode, forcedMode: true }
  }
  if (mode === ASSISTANT_MODES.ABOUT) {
    const explicitSearch =
      /подбер|подборк|список\s+(?:объект|квартир|вилл)|найд\p{L}{0,4}\s+(?:мне\s+)?(?:квартир|вилл|дом|объект)|looking\s+for\s+(?:a\s+)?(?:home|apartment|villa|property)/iu.test(
        gate.lastUserText || '',
      )
    if (searchTurn && explicitSearch) {
      return { ...gate, scenario: SCENARIOS.PROPERTY_SEARCH, assistantMode: mode }
    }
    return { ...gate, scenario: SCENARIOS.PROPERTY_ABOUT, assistantMode: mode, forcedMode: true }
  }

  if (searchTurn) {
    return { ...gate, scenario: SCENARIOS.PROPERTY_SEARCH, assistantMode: mode }
  }

  if (isGuideScenario(gate.scenario)) {
    return { ...gate, assistantMode: mode, forcedMode: true }
  }
  return { ...gate, scenario: SCENARIOS.PLATFORM_HELP, assistantMode: mode, forcedMode: true }
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

function countDealFormats(text) {
  const patterns = [
    /аукцион|торг|auction|subasta|ench[eè]re|aukcj/i,
    /купить\s+сейчас|buy[\s-]*now|compra\s+inmediata|sofortkauf/i,
    /доли|shares?|соинвест|фракцион|долев|anteil|participacion|udzia/i,
    /долг|distress|deuda|schulden/i,
    /development|девелоп/i,
  ]
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0)
}

/** Несколько стратегий в одном вопросе — это объяснение, а не сценарий только про доли. */
function asksAboutSeveralStrategies(text) {
  const explaining =
    /что\s+такое|чем\s+отлича|в\s+ч[её]м\s+разниц|расскаж|объясн|какие\s+стратег|про\s+стратег|how\s+.+\bdiffer|what\s+(?:is|are)|explain|difference|unterschied/iu.test(
      text,
    )
  const huntingProperty =
    /подбер|подборк|ищу\s+(?:квартир|вилл|дом|объект)|looking\s+for|buy\s+(?:an?\s+)?(?:apartment|villa|property)/iu.test(
      text,
    )
  if (huntingProperty && !explaining) return false
  if (/стратег/iu.test(text) && (explaining || countDealFormats(text) >= 2)) return true
  return countDealFormats(text) >= 2 && explaining
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
    /ошибк[а-яё]*\s+(?:сайт|бот|кабинет|подписк)|не\s+работает\s+(?:сайт|бот|подписк|оплат)|тех(?:ническ)?\s*поддерж|technical\s+support/i.test(
      lower,
    )
  ) {
    return { scenario: SCENARIOS.SUPPORT_OTHER, confidence: 0.95, strongSignal: true }
  }

  if (isSpainPropertyLegalQuery(lower)) {
    return { scenario: SCENARIOS.SPAIN_LEGAL, confidence: 0.95, strongSignal: true }
  }

  if (asksAboutSeveralStrategies(value)) {
    return { scenario: SCENARIOS.PLATFORM_HELP, confidence: 0.94, strongSignal: true }
  }

  if (/доли|shares?|соинвест|фракцион|долев/i.test(lower)) {
    const explainingShares =
      /что\s+такое|как\s+(?:это\s+)?работ|расскаж|объясн|what\s+(?:is|are)|how\s+(?:do|does)|explain|dónde|where\s+(?:is|are|can)|cómo\s+funcion/i.test(
        lower,
      )
    const huntingShares =
      detectLocationPreference(value).hasLocation ||
      /подбер|купить|ищу|buy|looking\s+for|найд/i.test(lower)
    if (huntingShares && !explainingShares) {
      return { scenario: SCENARIOS.PROPERTY_SEARCH, confidence: 0.92, strongSignal: true }
    }
    return { scenario: SCENARIOS.SHARES, confidence: 0.9, strongSignal: true }
  }

  if (/как\s+работ.*(аукцион|торг)|что\s+такое\s+аукцион|правила\s+аукцион|how\s+(does\s+)?(the\s+)?auction/i.test(lower)) {
    return { scenario: SCENARIOS.AUCTION_HELP, confidence: 0.92, strongSignal: true }
  }

  // Личный кабинет раньше гида и подбора: «мои объекты» и «мой баланс» — про человека, не про страницу.
  if (isCabinetPersonalQuery(lower)) {
    return { scenario: SCENARIOS.PLATFORM_HELP, confidence: 0.96, strongSignal: true, cabinetPersonal: true }
  }

  const siteGuide = matchSiteGuide(value)
  if (siteGuide) {
    return {
      scenario: SCENARIOS.PLATFORM_HELP,
      confidence: 0.96,
      strongSignal: true,
      siteSection: siteGuide.id,
    }
  }

  if (
    /о\s+платформ|о\s+вас|что\s+такое\s+sellyourbrick|как\s+работ.*(сайт|платформ)|где\s+(найти|открыть|посмотреть|лежит|находится)|как\s+(попасть|открыть|найти|зайти|добраться)|куда\s+(зайти|нажать|перейти|идти)|открой|перейди|раздел|навигац|карта\s+сервис|все\s+сервис|тест.?драйв|test.?drive|калькулятор|панель\s+инвест|умн\p{L}*\s+панел|smart\s+panel|сравн|compare|карта\s+объект|бонус|промокод|реферал|кошел|депозит|баланс|подписк|тариф|избран|профил|личн.*кабинет|истори.*став|презентац|property\s*ai|размест.*объект|кабинет\s+продав|скачать.*прилож|лотере|private\s*club|долг|distress|shares|доли|bonus|promo\s*code|wallet|deposit|balance|subscription|favorite|profile|seller\s+cabinet|where\s+is|how\s+(do\s+i\s+)?(open|find|get\s+to)|go\s+to|find\s+the/iu.test(
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
    guideTurn: Boolean(classification.strongSignal && isGuideScenario(scenario)),
    language: String(language || 'ru').toLowerCase().slice(0, 2),
    lastUserText: String(lastUser).slice(0, 500),
  }
}

export function formatIntentGateForPrompt(gate) {
  if (!gate) return ''
  if (gate.smallTalk) {
    return `**ACTIVE SCENARIO: SMALL TALK**
Ответь тепло и коротко. Предложи два пути: подобрать объект из каталога или найти раздел сайта. Объекты не отправляй и анкету подбора не начинай, пока человек сам не попросит.`
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
Ответь своими словами на каждую часть вопроса по базе знаний. Не копируй заготовленный абзац и не подменяй объяснение общим слоганом платформы.
Если названы несколько стратегий или разделов — коротко объясни каждый и дай кнопку navigation на каждый. Кнопки только по темам этого сообщения.
Не начинай анкету подбора и не спрашивай «инвестиции или для себя», если человек не просит найти объект.
Вопрос «где раздел / что это / как открыть» — объяснение страницы. Число избранных, баланс или статус VIP из персонального контекста можно добавить одной фразой, но не вместо объяснения.
Если вопрос именно про «мои» цифры и объекты — отвечай по ПЕРСОНАЛЬНОМУ КОНТЕКСТУ.
Если перечисляешь форматы — дай navigation и на /debts, и на /development, когда они относятся к вопросу. Используй только разрешённые path.`
  }
  if (gate.scenario === SCENARIOS.MANAGER_HANDOFF) {
    return `**ACTIVE SCENARIO: MANAGER HANDOFF**
Клиент хочет человека. Не подменяй это новой квалификацией и не шли объекты вместо связи с менеджером.`
  }
  if (gate.scenario === SCENARIOS.PROPERTY_SEARCH) {
    return `**ACTIVE SCENARIO: PROPERTY SEARCH**
Держи воронку подбора по объектам SellYourBrick. Не переключайся на ипотеку/поддержку без явного запроса.`
  }
  if (gate.scenario === SCENARIOS.PROPERTY_ABOUT) {
    return `**ACTIVE SCENARIO: PROPERTY ABOUT**
Клиент хочет узнать всё об одном объекте из каталога. Не запускай воронку подбора (цель/бюджет/город).
Если объект найден в блоке каталога — расскажи по фактам: цена/ставка, локация, тип, площадь, комнаты, формат сделки, описание, особенности. Добавь recommendations с этими id и navigation на /property/:id.
Если совпадений нет или название неясное — попроси точное название, id или город и коротко уточни. Не выдумывай объекты.`
  }
  return ''
}
