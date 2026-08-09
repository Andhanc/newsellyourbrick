/**
 * Каталог разделов сайта и вспомогательная логика умного помощника:
 * навигация, локальный подбор объектов, ориентировочный расчёт доходности.
 */

export const SITE_ASSISTANT_NAV = [
  { path: '/auction', label: 'Аукционы', aliases: ['аукцион', 'лоты', 'торги', 'auction', 'home', 'главн'] },
  { path: '/map', label: 'Карта объектов', aliases: ['карта', 'карту', 'карты', 'map', 'на карте'] },
  { path: '/shares', label: 'Доли (Shares)', aliases: ['доли', 'shares', 'share', 'соинвест'] },
  { path: '/calculator', label: 'Умная панель инвестора', aliases: ['калькулятор', 'инвестор', 'доходност', 'roi', 'yield', 'панель инвестора', 'умный инвестор'] },
  { path: '/compare', label: 'Сравнение объектов', aliases: ['сравн', 'compare'] },
  { path: '/test-drive', label: 'Test-drive объектов', aliases: ['тест-драйв', 'test-drive', 'testdrive', 'посмотр'] },
  { path: '/favorites', label: 'Избранное', aliases: ['избранн', 'favourites', 'favorites'] },
  { path: '/news', label: 'Новости', aliases: ['новост', 'news'] },
  { path: '/about', label: 'О платформе', aliases: ['о нас', 'о платформе', 'about', 'компания'] },
  { path: '/buyer', label: 'Покупателям', aliases: ['покупател', 'buyer'] },
  { path: '/debts', label: 'Долги / Distressed', aliases: ['долг', 'debt', 'distressed'] },
  { path: '/private-club', label: 'Private Club', aliases: ['private club', 'vip', 'клуб'] },
  { path: '/chat', label: 'Чат с помощником', aliases: ['чат', 'chat', 'помощник'] },
  { path: '/profile', label: 'Личный кабинет', aliases: ['кабинет', 'профиль', 'profile'] },
]

const ALLOWED_PATHS = new Set(SITE_ASSISTANT_NAV.map((item) => item.path))

/** Разрешённые пути для кнопок навигации из ответа модели. */
export function isAllowedAssistantPath(path) {
  if (!path || typeof path !== 'string') return false
  const normalized = normalizeAssistantPath(path)
  if (ALLOWED_PATHS.has(normalized)) return true
  // Карточки объектов: /property/:id|slug
  if (/^\/property\/[A-Za-z0-9\-_%]+$/i.test(normalized)) return true
  return false
}

export function normalizeAssistantPath(path) {
  const raw = String(path || '').trim()
  if (!raw) return ''
  try {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const url = new URL(raw)
      return `${url.pathname}${url.search || ''}`.replace(/\/+$/, '') || '/'
    }
  } catch {
    /* ignore */
  }
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`
  const noHash = withSlash.split('#')[0]
  return noHash.replace(/\/+$/, '') || '/'
}

/**
 * @param {unknown} navigation
 * @returns {Array<{ path: string, label: string }>}
 */
export function sanitizeNavigationLinks(navigation) {
  if (!Array.isArray(navigation)) return []
  const seen = new Set()
  const out = []
  for (const item of navigation) {
    if (!item) continue
    const path = normalizeAssistantPath(typeof item === 'string' ? item : item.path || item.to || item.href)
    if (!isAllowedAssistantPath(path) || seen.has(path)) continue
    seen.add(path)
    const fromCatalog = SITE_ASSISTANT_NAV.find((n) => n.path === path)
    const label =
      (typeof item === 'object' && (item.label || item.title || item.text)) ||
      fromCatalog?.label ||
      path
    out.push({ path, label: String(label).slice(0, 80) })
    if (out.length >= 6) break
  }
  return out
}

/**
 * Эвристика: пользователь просит раздел сайта.
 * @param {string} userMessage
 * @returns {Array<{ path: string, label: string }>}
 */
export function detectNavigationFromMessage(userMessage) {
  const t = String(userMessage || '').toLowerCase()
  if (!t.trim()) return []

  const wantsNav =
    /(где|как\s+попасть|открой|открыть|перейди|перейти|покажи|навигац|раздел|страниц|хочу\s+(на|в)|go\s+to|open|show\s+me)/i.test(
      t,
    ) || SITE_ASSISTANT_NAV.some((item) => item.aliases.some((a) => t.includes(a)))

  if (!wantsNav) return []

  const matched = SITE_ASSISTANT_NAV.filter((item) => item.aliases.some((a) => t.includes(a)))
  if (matched.length) {
    return matched.slice(0, 4).map(({ path, label }) => ({ path, label }))
  }

  // Общий запрос «куда можно перейти / разделы сайта»
  if (/(раздел|страниц|навигац|что\s+есть\s+на\s+сайте|меню)/i.test(t)) {
    return SITE_ASSISTANT_NAV.filter((item) =>
      ['/auction', '/map', '/calculator', '/shares', '/test-drive', '/about'].includes(item.path),
    ).map(({ path, label }) => ({ path, label }))
  }

  return []
}

/**
 * Ориентировочная валовая доходность (gross yield).
 * @param {{ price?: number, annualRent?: number, monthlyRent?: number, location?: string }} input
 */
export function estimateSimpleYield(input = {}) {
  const price = Number(input.price)
  if (!Number.isFinite(price) || price <= 0) return null

  let annualRent = Number(input.annualRent)
  const monthlyRent = Number(input.monthlyRent)
  if ((!Number.isFinite(annualRent) || annualRent <= 0) && Number.isFinite(monthlyRent) && monthlyRent > 0) {
    annualRent = monthlyRent * 12
  }

  const location = String(input.location || '').toLowerCase()
  const assumedRate =
    location.includes('дубай') || location.includes('dubai') || location.includes('uae') || location.includes('оаэ')
      ? 0.055
      : 0.045

  let usedAssumedRent = false
  if (!Number.isFinite(annualRent) || annualRent <= 0) {
    annualRent = Math.round(price * assumedRate)
    usedAssumedRent = true
  }

  const yieldPercent = Math.round((annualRent / price) * 1000) / 10
  const monthlyIncome = Math.round(annualRent / 12)

  return {
    price: Math.round(price),
    annualRent: Math.round(annualRent),
    monthlyIncome,
    yieldPercent,
    usedAssumedRent,
    note: usedAssumedRent
      ? 'Ориентир по типичной арендной ставке региона. Не гарантия доходности.'
      : 'Ориентировочная валовая доходность до налогов и расходов.',
  }
}

/**
 * Явный запрос расчёта доходности (не путать с «хочу инвестировать»).
 */
export function wantsExplicitYieldCalc(userMessage = '') {
  const lower = String(userMessage || '').toLowerCase()
  // Только явный расчёт доходности — не «инвестировать», не «открой калькулятор».
  return /(доходност|окупаем|\broi\b|\byield\b|рентабельн|сколько\s+(принес|будет\s+доход)|(?:посчитай|рассчитай|расчёт|расчет).{0,24}(доход|аренд|yield|roi)|арендн(ая|ый)\s+доход|monthly\s+income|gross\s+yield|rentabilidad|cuánto\s+rinde|cuanto\s+rinde)/i.test(
    lower,
  )
}

/**
 * Пытается вытащить цену/аренду из текста пользователя.
 * Считает yield только при явном запросе расчёта — не на каждое «инвестировать».
 * @param {string} userMessage
 * @param {{ budget?: number|null, location?: string|null }} [prefs]
 */
export function extractYieldInputsFromMessage(userMessage, prefs = {}) {
  const text = String(userMessage || '')
  if (!wantsExplicitYieldCalc(text)) return null

  let price = Number(prefs.budget) || null
  const priceMatch = text.match(
    /(?:цена|бюджет|стоимост[ьи]|price|budget|precio|presupuesto|за\s+)?(\d[\d\s,.]*\d|\d+)\s*(тыс|млн|k|m|€|eur|евро|mil)?/i,
  )
  if (priceMatch) {
    let value = parseFloat(priceMatch[1].replace(/\s/g, '').replace(',', '.'))
    const unit = (priceMatch[2] || '').toLowerCase()
    if (unit.includes('млн') || unit === 'm') value *= 1_000_000
    else if (unit.includes('тыс') || unit === 'k' || unit === 'mil') value *= 1000
    if (Number.isFinite(value) && value > 1000) price = value
  }

  let monthlyRent = null
  let annualRent = null
  const rentMonth = text.match(
    /(?:аренд[аыу]|rent|alquiler)\s*(?:в\s*месяц|\/\s*мес|monthly|al\s*mes)?[^\d]{0,12}(\d[\d\s,.]*\d|\d+)\s*(€|eur|евро)?/i,
  )
  const rentYear = text.match(
    /(?:аренд[аыу]|rent|alquiler)\s*(?:в\s*год|\/\s*год|yearly|annual|al\s*año|al\s*ano)[^\d]{0,12}(\d[\d\s,.]*\d|\d+)/i,
  )
  if (rentYear) {
    annualRent = parseFloat(rentYear[1].replace(/\s/g, '').replace(',', '.'))
  } else if (rentMonth) {
    monthlyRent = parseFloat(rentMonth[1].replace(/\s/g, '').replace(',', '.'))
  }

  if (!price || price < 10000) return null

  return estimateSimpleYield({
    price,
    annualRent,
    monthlyRent,
    location: prefs.location || '',
  })
}

/**
 * Локальный подбор объектов, если модель не вернула recommendations.
 * @param {object} preferences
 * @param {Array<object>} properties
 * @param {number} [limit]
 */
export function pickLocalRecommendations(preferences = {}, properties = [], limit = 3) {
  if (!Array.isArray(properties) || properties.length === 0) return []

  const budget = Number(preferences.budget)
  const location = String(preferences.location || '').toLowerCase()
  const type = String(preferences.propertyType || '').toLowerCase()
  const rooms = Number(preferences.rooms)

  const scored = properties
    .map((p) => {
      const price = Number(p.currentBid || p.price || 0)
      const loc = String(p.location || '').toLowerCase()
      const name = String(p.name || p.title || '').toLowerCase()
      const pRooms = Number(p.rooms || p.beds || 0)
      let score = 1

      if (Number.isFinite(budget) && budget > 0 && price > 0) {
        const diff = Math.abs(price - budget) / budget
        if (diff <= 0.15) score += 5
        else if (diff <= 0.35) score += 3
        else if (price <= budget * 1.1) score += 2
        else if (price > budget * 1.4) score -= 3
      }

      if (location) {
        if (location.includes('испан') && (loc.includes('spain') || loc.includes('испан') || loc.includes('tenerife') || loc.includes('barcelona') || loc.includes('madrid') || loc.includes('costa'))) {
          score += 4
        } else if (location.includes('дубай') && (loc.includes('dubai') || loc.includes('дубай') || loc.includes('uae'))) {
          score += 4
        } else if (loc.includes(location) || name.includes(location)) {
          score += 3
        }
      }

      if (type) {
        if (type.includes('квартир') && (name.includes('apart') || name.includes('квартир') || String(p.property_type || '').includes('apart'))) score += 3
        if (type.includes('вилл') && (name.includes('villa') || name.includes('вилл'))) score += 3
        if (type.includes('дом') && (name.includes('house') || name.includes('дом') || name.includes('town'))) score += 3
      }

      if (Number.isFinite(rooms) && rooms > 0 && pRooms > 0) {
        if (pRooms === rooms) score += 3
        else if (Math.abs(pRooms - rooms) === 1) score += 1
      }

      if (p.isAuction || p.is_auction) score += 1

      return { id: p.id, score }
    })
    .filter((row) => row.id != null && row.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map((row) => row.id)
}

export function buildSiteMapPromptBlock() {
  return SITE_ASSISTANT_NAV.map((item) => `- ${item.path} — ${item.label}`).join('\n')
}

/**
 * Гарантирует кнопку на Умную панель инвестора при вопросах про доход/инвестиции.
 * @param {Array<{ path: string, label: string }>} navigation
 * @param {{ purpose?: string|null }} preferences
 * @param {string} userMessage
 * @param {object|null} yieldEstimate
 */
export function ensureInvestorPanelNavigation(navigation, preferences, userMessage, yieldEstimate) {
  const list = Array.isArray(navigation) ? [...navigation] : []
  const lower = String(userMessage || '').toLowerCase()
  const investIntent =
    Boolean(yieldEstimate) ||
    preferences?.purpose === 'инвестиции' ||
    preferences?.purpose === 'под сдачу' ||
    /(доход|инвест|аренда|roi|yield|окупаем|калькулятор|панель\s+инвестора)/i.test(lower)

  if (!investIntent) return list
  if (list.some((item) => item.path === '/calculator')) return list
  return [{ path: '/calculator', label: 'Умная панель инвестора' }, ...list].slice(0, 6)
}

/** Язык ответа: только ru | en | es (по умолчанию ru). */
export function detectAssistantReplyLanguage(userMessage = '') {
  const t = String(userMessage || '')
  if (/[а-яё]/i.test(t)) return 'ru'
  if (
    /[ñáéíóúü¿¡]/i.test(t) ||
    /\b(hola|gracias|quiero|necesito|hipoteca|cómo|como|dónde|donde|cuánto|cuanto|propiedad|inmueble|subasta)\b/i.test(
      t,
    )
  ) {
    return 'es'
  }
  if (/[a-z]/i.test(t)) return 'en'
  return 'ru'
}

/**
 * Убирает утечки reasoning / chain-of-thought из ответа модели.
 */
export function stripModelReasoning(text = '') {
  let out = String(text || '')
  if (!out) return ''

  // XML / markdown think blocks
  out = out.replace(/<think>[\s\S]*?<\/think>/gi, '')
  out = out.replace(/<\/?think>/gi, '')
  out = out.replace(/<redacted_reasoning>[\s\S]*?<\/redacted_reasoning>/gi, '')
  out = out.replace(/<\/?redacted_reasoning>/gi, '')
  out = out.replace(/```(?:thinking|reasoning)[\s\S]*?```/gi, '')

  // Если модель вернула «мысли» до JSON — оставляем JSON
  const jsonMatch = out.match(/\{[\s\S]*"text"\s*:[\s\S]*\}/)
  if (jsonMatch) {
    return jsonMatch[0].trim()
  }

  // Обрезаем типичный англ. monologue reasoning
  const leakStart =
    /(?:^|\n)\s*(?:okay[,.]?\s+the\s+user|let\s+me\s+(?:recall|check|think)|looking\s+back\s+at|i\s+need\s+to\s+check|the\s+user\s+is\s+asking|first[,.]?\s+i\s+should|hmm[,.]?\s+)/i
  if (leakStart.test(out) && !/^[А-ЯЁа-яё]/.test(out.trim())) {
    // Нет полезного ответа после мыслей — очищаем
    return ''
  }

  return out.trim()
}

/** Похоже ли на утечку внутренних рассуждений модели, а не на ответ клиенту. */
export function looksLikeModelReasoningLeak(text = '') {
  const t = String(text || '').trim()
  if (!t) return true
  if (t.length > 80 && /^(okay|alright|let me|looking back|the user is asking|i need to|first[,.]?\s+i|hmm\b)/i.test(t)) {
    return true
  }
  if (/\b(let me recall|looking back at the initial instructions|i should check if|chain of thought)\b/i.test(t)) {
    return true
  }
  // Длинный английский ответ на явно русскоязычный контекст без кириллицы в тексте ответа
  const cyr = (t.match(/[а-яё]/gi) || []).length
  const lat = (t.match(/[a-z]/gi) || []).length
  if (lat > 120 && cyr < 8 && /\b(user|instructions|platform|mortgage|documents)\b/i.test(t)) {
    return true
  }
  return false
}

/**
 * Локальный ответ помощника без LLM — для FAQ, навигации, подбора и yield,
 * а также как fallback при ошибках AI (402/429/сеть).
 *
 * @param {string} userMessage
 * @param {object} [preferences]
 * @param {Array<object>} [properties]
 * @param {{ force?: boolean }} [options] force=true — всегда вернуть полезный ответ
 */
export function buildOfflineAssistantReply(userMessage, preferences = {}, properties = [], options = {}) {
  const text = String(userMessage || '').trim()
  const lower = text.toLowerCase()
  const prefs = preferences && typeof preferences === 'object' ? preferences : {}
  const catalog = Array.isArray(properties) ? properties : []
  const lang = detectAssistantReplyLanguage(text)

  const yieldEstimate = extractYieldInputsFromMessage(text, prefs)
  let navigation = detectNavigationFromMessage(text)
  navigation = ensureInvestorPanelNavigation(navigation, prefs, text, yieldEstimate)

  const aboutIntent =
    /(компани|о\s+вас|о\s+платформ|что\s+такое\s+sellyourbrick|sellyourbrick|кто\s+вы|расскаж.*(проект|платформ|сервис|сайт)|what\s+is\s+sellyourbrick|about\s+(the\s+)?(company|platform)|sobre\s+(la\s+)?(empresa|plataforma)|quiénes\s+sois)/i.test(
      lower,
    )
  const auctionIntent =
    /(как\s+работ.*(аукцион|торг)|что\s+такое\s+аукцион|правила\s+аукцион|ставки|how\s+(does\s+)?(the\s+)?auction|cómo\s+funcion[ao]\s+la\s+subasta|que\s+es\s+una\s+subasta)/i.test(
      lower,
    )
  const visaIntent =
    /(внж|виза|golden\s*visa|резиденц|вид\s+на\s+житель|residency|residence\s+permit|residencia|visado|golden\s+visa)/i.test(
      lower,
    )
  const docsIntent =
    /(документ|какие\s+бумаг|что\s+нужно\s+для\s+покуп|documents?\s+(needed|required)|qué\s+documentos|documentos\s+necesarios)/i.test(
      lower,
    )
  const mortgageIntent =
    /(ипотек|ипотечн|кредит\s+на\s+(жиль|квартир|дом)|mortgage|home\s+loan|hipoteca|préstamo\s+hipotecario|prestamo\s+hipotecario)/i.test(
      lower,
    )
  const buyTypeIntent =
    /(тип\s+покуп|тип\s+объект|как\s+лучше\s+покупать|какой\s+тип\s+(покуп|продаж|сделк|объект)|аукцион\s+или\s+(buy\s*now|купить\s+сейчас)|buy\s*now\s+или|формат\s+сделк|тип\s+продаж|how\s+to\s+buy|which\s+purchase\s+type|which\s+property\s+type|auction\s+or\s+buy\s*now|tipo\s+de\s+compra|tipo\s+de\s+(inmueble|propiedad)|cómo\s+comprar|subasta\s+o\s+compra)/i.test(
      lower,
    )
  // Совет по инвестициям / типу объекта — без карточки доходности
  const investAdviceIntent =
    /(хочу\s+инвестир|инвестировать\s+\d|что\s+(можешь\s+)?посоветовать|посоветуй|что\s+купить|куда\s+вложить|what\s+(can\s+you\s+)?(advise|recommend)|what\s+should\s+i\s+(buy|invest)|advise\s+me|recommend\s+(a\s+)?(propert|invest|buy)|quiero\s+invertir|qué\s+me\s+recomiendas|que\s+me\s+recomiendas)/i.test(
      lower,
    )
  // Только явный запрос подбора — не срабатывает от старых prefs.purpose/budget
  const listingIntent =
    /(подбер|покаж(и|ите)\s+(объект|вариант|лот)|рекоменд(уй|ации)?\s+(объект|вариант|лот)|найд(и|ите)\s+(мне\s+)?(объект|квартир|вилл|дом)|какие\s+есть\s+(объект|вариант|лот)|варианты\s+из\s+каталог|find\s+(a\s+)?(property|apartment|villa)|show\s+(me\s+)?(listings|properties)|busca[rme]?\s+(un\s+)?(piso|apartamento|villa|inmueble)|recomienda\s+(un\s+)?(piso|inmueble))/i.test(
      lower,
    )

  const meaningfulKeys = ['purpose', 'budget', 'location', 'propertyType', 'rooms']
  const prefCount = meaningfulKeys.filter((k) => prefs[k] != null && prefs[k] !== '').length
  const adviceBudget = Number(prefs.budget) > 0 ? Number(prefs.budget) : null

  let recommendations = null
  if (listingIntent || investAdviceIntent || (buyTypeIntent && adviceBudget) || (options.force && prefCount >= 2)) {
    const ids = pickLocalRecommendations(prefs, catalog, 3)
    recommendations = ids.length ? ids : null
  }

  const copy = {
    ru: {
      about:
        'SellYourBrick — платформа аукционов недвижимости в Испании и Дубае: прозрачные торги, доли (shares), test-drive объектов и умная панель инвестора. Помогаем с подбором, сделкой и вопросами по ВНЖ.',
      auction:
        'На аукционе вы смотрите лот, делаете ставку выше текущей и следите за таймером. Если ставка в конце — время может продлиться. Побеждает лучшая ставка, дальше оформление через платформу.',
      visa:
        'По ВНЖ ориентиры такие: Испания — инвестиционный ВНЖ (часто от €500,000), Дубай — резидентская виза инвестора в недвижимость (порог зависит от объекта). Точные условия лучше уточнить у менеджера и юриста.',
      docs:
        'Обычно нужны паспорт, подтверждение средств, страховка; для Испании — NIE и нотариат, для Дубая — регистрация в DLD. Полный список зависит от страны и типа сделки.',
      mortgage:
        'Ипотека в Испании для нерезидентов обычно возможна: банк смотрит доход, кредитную историю и объект. Часто нужны паспорт, NIE, справки о доходах, выписки со счетов и оценка недвижимости; первый взнос нередко 30–40%. Точные условия зависят от банка — могу связать с менеджером или открыть Умную панель инвестора для сценария с кредитом.',
      buyType:
        'На SellYourBrick обычно три формата: аукцион — конкурентная цена и фиксированный таймер; «купить сейчас» — быстрее, если цена вас устраивает; доли (shares) — меньший вход в объект. Для жизни чаще смотрят готовый лот/buy-now, для инвестиций — аукцион или доли. Могу подобрать объекты или открыть калькулятор сценария.',
      investAdvice: (budget) =>
        budget
          ? `При бюджете около ${Math.round(budget).toLocaleString('ru-RU')} € для инвестиций чаще смотрят квартиры/апарты под аренду в туристических зонах Испании или Дубая; виллы — если важнее капитал и lifestyle. Форматы сделки: аукцион (цена), buy now (скорость), shares (меньший вход). Могу подобрать лоты или открыть Умную панель инвестора для точного сценария.`
          : 'Для инвестиций обычно смотрят квартиры/апарты под аренду или доли для меньшего входа; виллы — под капитал и lifestyle. Форматы на платформе: аукцион, buy now и shares. Уточните бюджет и локацию — подберу объекты; цифры по доходу лучше считать в Умной панели инвестора.',
      nav: 'Могу сразу открыть нужный раздел — выберите кнопку ниже.',
      listingOk:
        'Подобрал варианты из текущего каталога. Откройте карточку или уточните бюджет, город и тип жилья — подберу точнее.',
      listingEmpty:
        'Сейчас каталог для подбора пуст. Откройте аукционы на сайте — там актуальные лоты.',
      listingAsk:
        'Уточните цель, бюджет в евро и локацию (Испания или Дубай) — подберу объекты из каталога.',
      yield: (y) =>
        `Ориентир по вашим цифрам: валовая доходность около ${y.yieldPercent}% годовых (~${Number(y.monthlyIncome).toLocaleString('ru-RU')} € в месяц). Это упрощённый расчёт до налогов и расходов — для точного сценария откройте Умную панель инвестора.`,
      forceBudget: 'Принял. Какой бюджет в евро рассматриваете, и какая локация важнее — Испания или Дубай?',
      forceList: 'Могу предложить несколько объектов из каталога. Если нужно иначе — напишите бюджет и город.',
      forceHello:
        'Я помощник SellYourBrick: расскажу о платформе, подберу объекты, подскажу разделы сайта и дам ориентир по доходности. С чего начнём?',
      btnManager: 'Связать с менеджером',
      btnPick: 'Подобрать объект',
      btnSpain: 'Испания',
      btnDubai: 'Дубай',
      btnSelf: 'Для себя',
      btnRent: 'Под сдачу',
      btnInvest: 'Инвестиции',
      btnAbout: 'О платформе',
      btnMap: 'Карта',
      btnInvestor: 'Умная панель инвестора',
      btnAuction: 'Смотреть аукционы',
      btnShares: 'Доли',
      navAbout: 'О платформе',
      navAuction: 'Смотреть аукционы',
      navBuyer: 'Покупателям',
      navOpenAuction: 'Открыть аукционы',
      navAuctionShort: 'Аукционы',
      navCalculator: 'Умная панель инвестора',
      navMap: 'Карта',
    },
    en: {
      about:
        'SellYourBrick is a property auction platform for Spain and Dubai: transparent bidding, shares, property test-drive, and a smart investor panel. We help with selection, the deal, and residency questions.',
      auction:
        'On an auction you view a lot, place a bid above the current one, and watch the timer. Late bids can extend time. Highest bid wins, then closing goes through the platform.',
      visa:
        'Residency guide: Spain often from €500,000 (investor residence); Dubai property investor residence depends on the asset. Confirm details with a manager and lawyer.',
      docs:
        'Usually passport, proof of funds, insurance; Spain also needs NIE and notary steps; Dubai needs DLD registration. Exact checklist depends on country and deal type.',
      mortgage:
        'Mortgages in Spain for non-residents are often possible: banks review income, credit history, and the property. Typical papers: passport, NIE, income proof, bank statements, valuation; down payment is often 30–40%. Exact terms vary by bank — I can connect you with a manager or open the smart investor panel for a loan scenario.',
      buyType:
        'On SellYourBrick there are usually three formats: auction — competitive price with a timer; buy now — faster if the price works; shares — smaller entry into a property. For living, people often prefer ready lots/buy-now; for investing — auction or shares. I can match listings or open the investor calculator.',
      investAdvice: (budget) =>
        budget
          ? `With a budget around €${Math.round(budget).toLocaleString('en-US')}, investors often look at apartments for rent in tourist areas of Spain or Dubai; villas if capital and lifestyle matter more. Deal formats: auction (price), buy now (speed), shares (smaller entry). I can match lots or open the smart investor panel for a full scenario.`
          : 'For investing, people often choose apartments for rent or shares for a smaller entry; villas for capital and lifestyle. Platform formats: auction, buy now, and shares. Share budget and location — I will match listings; use the smart investor panel for yield numbers.',
      nav: 'I can open the right section — pick a button below.',
      listingOk: 'Here are options from the current catalog. Open a card or refine budget, city, and property type.',
      listingEmpty: 'The catalog is empty right now. Open auctions on the site for live lots.',
      listingAsk: 'Tell me your goal, budget in EUR, and location (Spain or Dubai) — I will match listings.',
      yield: (y) =>
        `Rough estimate: about ${y.yieldPercent}% gross yield per year (~€${Number(y.monthlyIncome).toLocaleString('en-US')} / month). This ignores taxes and costs — use the smart investor panel for a full scenario.`,
      forceBudget: 'Got it. What EUR budget are you considering, and which location matters more — Spain or Dubai?',
      forceList: 'I can suggest listings from the catalog. Or send budget and city for a tighter match.',
      forceHello:
        'I am the SellYourBrick assistant: platform info, listings, site navigation, and a yield estimate. Where should we start?',
      btnManager: 'Talk to a manager',
      btnPick: 'Find a property',
      btnSpain: 'Spain',
      btnDubai: 'Dubai',
      btnSelf: 'For myself',
      btnRent: 'For rent',
      btnInvest: 'Investing',
      btnAbout: 'About the platform',
      btnMap: 'Map',
      btnInvestor: 'Smart investor panel',
      btnAuction: 'View auctions',
      btnShares: 'Shares',
      navAbout: 'About',
      navAuction: 'View auctions',
      navBuyer: 'For buyers',
      navOpenAuction: 'Open auctions',
      navAuctionShort: 'Auctions',
      navCalculator: 'Smart investor panel',
      navMap: 'Map',
    },
    es: {
      about:
        'SellYourBrick es una plataforma de subastas inmobiliarias en España y Dubái: pujas transparentes, participaciones (shares), test-drive de inmuebles y un panel inteligente para inversores. Ayudamos con la selección, la operación y la residencia.',
      auction:
        'En la subasta ves el lote, pujas por encima de la oferta actual y sigues el temporizador. Una puja tardía puede ampliar el tiempo. Gana la puja más alta y el cierre se hace a través de la plataforma.',
      visa:
        'Residencia: en España suele partir de 500.000 € (residencia por inversión); en Dubái la visa de inversor inmobiliario depende del activo. Confirma los detalles con un manager y un abogado.',
      docs:
        'Suelen hacer falta pasaporte, prueba de fondos y seguro; en España también NIE y notaría; en Dubái, registro en DLD. La lista exacta depende del país y del tipo de operación.',
      mortgage:
        'La hipoteca en España para no residentes suele ser posible: el banco revisa ingresos, historial crediticio y el inmueble. Documentos típicos: pasaporte, NIE, justificación de ingresos, extractos bancarios y tasación; la entrada suele ser del 30–40%. Las condiciones exactas dependen del banco: puedo conectarte con un manager o abrir el panel inteligente del inversor para un escenario con crédito.',
      buyType:
        'En SellYourBrick hay tres formatos habituales: subasta — precio competitivo con temporizador; comprar ahora — más rápido si el precio te encaja; shares — entrada menor en un inmueble. Para vivir suele convenir lote listo/buy-now; para invertir — subasta o shares. Puedo buscar inmuebles o abrir el calculador del inversor.',
      investAdvice: (budget) =>
        budget
          ? `Con un presupuesto de unos ${Math.round(budget).toLocaleString('es-ES')} €, para invertir suelen mirarse pisos/apartamentos para alquiler en zonas turísticas de España o Dubái; villas si importan más el capital y el lifestyle. Formatos: subasta (precio), comprar ahora (rapidez), shares (entrada menor). Puedo buscar lotes o abrir el panel inteligente del inversor.`
          : 'Para invertir suelen elegirse pisos para alquiler o shares con entrada menor; villas para capital y lifestyle. Formatos: subasta, comprar ahora y shares. Indica presupuesto y ubicación: te propongo inmuebles; los números de rentabilidad mejor en el panel inteligente del inversor.',
      nav: 'Puedo abrir la sección que necesitas: elige un botón abajo.',
      listingOk:
        'Aquí tienes opciones del catálogo actual. Abre una ficha o concreta presupuesto, ciudad y tipo de vivienda.',
      listingEmpty: 'El catálogo está vacío ahora. Abre las subastas del sitio para ver lotes activos.',
      listingAsk:
        'Indica tu objetivo, presupuesto en euros y ubicación (España o Dubái): te propongo inmuebles del catálogo.',
      yield: (y) =>
        `Estimación orientativa: alrededor del ${y.yieldPercent}% bruto al año (~${Number(y.monthlyIncome).toLocaleString('es-ES')} € al mes). No incluye impuestos ni gastos: usa el panel inteligente del inversor para un escenario completo.`,
      forceBudget:
        'Entendido. ¿Qué presupuesto en euros consideras y qué ubicación te importa más: España o Dubái?',
      forceList:
        'Puedo sugerir inmuebles del catálogo. O envía presupuesto y ciudad para afinar.',
      forceHello:
        'Soy el asistente de SellYourBrick: info de la plataforma, inmuebles, navegación del sitio y una estimación de rentabilidad. ¿Por dónde empezamos?',
      btnManager: 'Hablar con un manager',
      btnPick: 'Buscar inmueble',
      btnSpain: 'España',
      btnDubai: 'Dubái',
      btnSelf: 'Para mí',
      btnRent: 'Para alquilar',
      btnInvest: 'Inversión',
      btnAbout: 'Sobre la plataforma',
      btnMap: 'Mapa',
      btnInvestor: 'Panel inteligente del inversor',
      btnAuction: 'Ver subastas',
      btnShares: 'Shares',
      navAbout: 'Sobre nosotros',
      navAuction: 'Ver subastas',
      navBuyer: 'Para compradores',
      navOpenAuction: 'Abrir subastas',
      navAuctionShort: 'Subastas',
      navCalculator: 'Panel inteligente del inversor',
      navMap: 'Mapa',
    },
  }
  const t = copy[lang] || copy.ru

  let replyText = ''
  let buttons = null
  let needsMoreInfo = false

  if (aboutIntent) {
    replyText = t.about
    navigation = sanitizeNavigationLinks([
      ...navigation,
      { path: '/about', label: t.navAbout },
      { path: '/auction', label: t.navAuction },
      { path: '/buyer', label: t.navBuyer },
    ])
  } else if (auctionIntent) {
    replyText = t.auction
    navigation = sanitizeNavigationLinks([...navigation, { path: '/auction', label: t.navOpenAuction }])
  } else if (mortgageIntent) {
    replyText = t.mortgage
    buttons = [t.btnManager, t.btnInvestor]
    navigation = sanitizeNavigationLinks([
      ...navigation,
      { path: '/calculator', label: t.navCalculator },
      { path: '/about', label: t.navAbout },
    ])
  } else if (buyTypeIntent || investAdviceIntent) {
    replyText =
      investAdviceIntent || adviceBudget ? t.investAdvice(adviceBudget) : t.buyType
    if (recommendations?.length && (investAdviceIntent || adviceBudget)) {
      replyText = `${replyText} ${t.listingOk}`
    }
    buttons = [t.btnAuction, t.btnShares, t.btnInvestor, t.btnPick]
    navigation = sanitizeNavigationLinks([
      ...navigation,
      { path: '/auction', label: t.navAuctionShort },
      { path: '/shares', label: t.btnShares },
      { path: '/calculator', label: t.navCalculator },
    ])
  } else if (visaIntent) {
    replyText = t.visa
    buttons = [t.btnManager, t.btnPick]
  } else if (docsIntent) {
    replyText = t.docs
    buttons = [t.btnSpain, t.btnDubai, t.btnManager]
  } else if (yieldEstimate) {
    replyText = t.yield(yieldEstimate)
  } else if (navigation.length && /(где|открой|открыть|перейди|перейти|покажи|навигац|раздел|страниц|калькулятор|карта|доли|open|show|go\s+to|abre|abrir|muéstrame|muestrame|mapa|calculadora)/i.test(lower)) {
    replyText = t.nav
  } else if (listingIntent) {
    if (recommendations?.length) {
      replyText = t.listingOk
      needsMoreInfo = prefCount < 2
      if (needsMoreInfo) buttons = [t.btnSelf, t.btnRent, t.btnInvest]
    } else if (!catalog.length) {
      replyText = t.listingEmpty
      navigation = sanitizeNavigationLinks([...navigation, { path: '/auction', label: t.navAuctionShort }])
    } else {
      replyText = t.listingAsk
      needsMoreInfo = true
      buttons = [t.btnSelf, t.btnRent, t.btnInvest, t.btnSpain, t.btnDubai]
    }
  } else if (options.force) {
    if (prefs.purpose && !prefs.budget) {
      replyText = t.forceBudget
      needsMoreInfo = true
      buttons =
        lang === 'ru'
          ? ['до 200 тыс €', '200–400 тыс €', 'от 500 тыс €', t.btnSpain, t.btnDubai]
          : lang === 'es'
            ? ['hasta 200 mil €', '200–400 mil €', 'desde 500 mil €', t.btnSpain, t.btnDubai]
            : ['up to €200k', '€200–400k', 'from €500k', t.btnSpain, t.btnDubai]
    } else if (recommendations?.length) {
      replyText = t.forceList
    } else {
      replyText = t.forceHello
      buttons = [t.btnAbout, t.btnPick, t.btnMap, t.btnInvestor]
      navigation = sanitizeNavigationLinks([
        { path: '/about', label: t.navAbout },
        { path: '/auction', label: t.navAuctionShort },
        { path: '/calculator', label: t.navCalculator },
        { path: '/map', label: t.navMap },
      ])
    }
  } else {
    return null
  }

  navigation = ensureInvestorPanelNavigation(navigation, prefs, text, yieldEstimate)

  return {
    text: replyText,
    buttons,
    needsMoreInfo,
    recommendations,
    navigation: navigation.length ? navigation : null,
    yieldEstimate,
  }
}
