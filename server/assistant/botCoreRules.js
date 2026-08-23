/**
 * Жёсткие правила умного помощника SellYourBrick.
 * Адаптация воронки housetenerife под нашу платформу (аукционы, buy now, доли).
 */

export const BUDGET_RANGE_RATIO = 0.26

export const CORE_RULES = Object.freeze([
  {
    id: 1,
    title: 'Сначала цель',
    summary: 'Спроси: инвестиции или для себя. Инвестиции — только доли и долги; для себя — только аукцион и купить сейчас.',
  },
  {
    id: 2,
    title: 'Страна, затем город',
    summary: 'После типа спроси страну, затем отдельным сообщением город внутри выбранной страны. Не смешивай уровни.',
  },
  {
    id: 3,
    title: 'Уточнить цель',
    summary: 'Для себя / инвестиции / под сдачу. От цели зависит формат сделки и тон подборки.',
  },
  {
    id: 4,
    title: 'Формат сделки',
    summary: 'После цели и бюджета мягко уточни формат: аукцион, купить сейчас или доли (shares). Не читай лекцию, если клиент уже выбрал.',
  },
  {
    id: 5,
    title: 'Мягко предложить менеджера',
    summary: 'Созвон или чат с менеджером — только после согласия, выбранного объекта или жалобы. Не подменяй подбор эскалацией.',
  },
  {
    id: 6,
    title: 'Диапазон ±26%',
    summary: 'Подбирай объекты в коридоре ±26% от названного бюджета.',
  },
  {
    id: 7,
    title: 'Запоминать контекст',
    summary: 'Цель, тип, страну, город и бюджет не переспрашивай. Коротко подтверди и задай следующий шаг.',
  },
  {
    id: 8,
    title: 'Сценарий по ключевым словам',
    summary: 'Поиск / платформа / ВНЖ / доли / аукцион / эскалация. Приветствие без темы недвижимости — мягко введи в воронку, объекты не слать.',
  },
  {
    id: 9,
    title: 'Эскалировать сложное',
    summary: 'Жалобы, юридические споры и сложные схемы — к менеджеру, без спора в чате.',
  },
])

export function detectInvestmentTimeline(text) {
  const s = String(text || '').toLowerCase()
  if (!s.trim()) return false
  return (
    /(?:срок|тайминг|timeline|когда\s+(?:план|хот|готов)|через\s+(?:\d+|пару|несколько|месяц|год)|asap|срочно|(?:^|[^\p{L}])(?:сейчас|сразу|позже)(?:[^\p{L}]|$)|this\s+year|next\s+year|in\s+\d+\s*(?:month|week|year)|(?:^|[^\p{L}])(?:now|later|soon)(?:[^\p{L}]|$)|este\s+a[nñ]o|en\s+\d+\s+mes)/iu.test(
      s,
    ) || /(?:2|3|два|три|two|three)\s*(?:-|–|—)?\s*(?:месяц|мес\.?|months?|meses)/i.test(s)
  )
}

export function wantsEscalation(text) {
  const s = String(text || '').toLowerCase()
  if (!s.trim()) return false
  const complaint =
    /(?:жалоб|претензи|обман|мошенн|верните?\s+деньг|суд\b|хамств|недоволен|ужасн(?:ый|ая)\s+сервис|complaint|scam|fraud|refund|terrible\s+service)/i.test(
      s,
    )
  const complexSpecialist =
    /(?:сложн(?:ый|ое|ая)\s+вопрос|нужен\s+(?:юрист|нотариус|специалист)|налогов(?:ый|ая)\s+(?:спор|схем)|due\s+diligence|офф?шор|escalat|speak\s+to\s+(?:a\s+)?(?:specialist|lawyer))/i.test(
      s,
    )
  return complaint || complexSpecialist
}

/**
 * @param {{ minPrice?: number|null, maxPrice?: number|null }} budget
 * @param {number} [ratio]
 */
export function expandBudgetBand(budget, ratio = BUDGET_RANGE_RATIO) {
  const { minPrice, maxPrice } = budget || {}
  if (minPrice == null && maxPrice == null) return null

  const r = Number.isFinite(ratio) && ratio > 0 ? ratio : BUDGET_RANGE_RATIO
  let anchor
  let floor
  let ceiling

  if (minPrice != null && maxPrice != null) {
    const mid = (minPrice + maxPrice) / 2
    const spread = mid > 0 ? (maxPrice - minPrice) / mid : 1
    if (spread < 0.3) {
      anchor = Math.round(mid)
      floor = Math.round(mid * (1 - r))
      ceiling = Math.round(mid * (1 + r))
    } else {
      anchor = Math.round(mid)
      floor = Math.round(minPrice * (1 - r))
      ceiling = Math.round(maxPrice * (1 + r))
    }
  } else if (maxPrice != null) {
    anchor = Math.round(maxPrice)
    floor = Math.round(maxPrice * (1 - r))
    ceiling = Math.round(maxPrice * (1 + r))
  } else {
    anchor = minPrice
    floor = Math.round(minPrice * (1 - r))
    ceiling = Math.round(minPrice * (1 + r))
  }

  return { anchor, floor, ceiling, hardMin: floor, hardMax: ceiling, ratio: r }
}

export function formatCoreRulesForPrompt(lang = 'ru') {
  const code = String(lang || 'ru').toLowerCase().slice(0, 2)

  if (code === 'en') {
    return `**9 CORE BOT RULES (always follow):**
1. *Ask the goal first* — investment means shares/debts only; personal use means auctions/buy-now only.
2. *Country, then city, then type* — ask each separately and list only options available at that level.
3. *Clarify purpose* — living / investment / rental.
4. *Deal format* — auction, buy now, or shares. Do not lecture if already chosen.
5. *Soft manager offer* — only after they agree, pick a listing, or complain.
6. *±26% band* — shortlist around the stated budget.
7. *Remember context* — never re-ask known budget/location/type/goal.
8. *Stay in scenario* — search / platform / visa / shares / escalation. Greetings without property keywords → warm intro, no listings.
9. *Escalate complexity* — complaints and specialist topics → human manager.

**CATALOG FUNNEL:**
investment or personal use → country → city → property type available there → budget only when more than 5 listings remain → matching listings.
Never mix investment vehicles with personal-use listings. Never show listings before the city is selected.`
  }

  if (code === 'es') {
    return `**9 REGLAS NÚCLEO (síguelas siempre):**
1. *Primero el objetivo* — inversión: participaciones/deudas; uso propio: subastas/compra inmediata.
2. *País y luego ciudad* — pregunta el país y después una ciudad dentro de ese país.
3. *Objetivo* — vivir / inversión / alquiler.
4. *Formato* — subasta, compra ahora o participaciones (shares).
5. *Gestor* — solo tras el sí, un objeto elegido o una queja.
6. *Banda ±26%* — selección en torno al presupuesto.
7. *Memoria* — no repitas datos ya conocidos.
8. *Escenario* — búsqueda / plataforma / visado / shares / escalado.
9. *Escalar lo complejo* — quejas → manager humano.

**EMBUDO:**
inversión o uso propio → país → ciudad → tipo disponible → presupuesto solo si quedan más de 5 inmuebles → inmuebles coincidentes.
No mezcles las dos ramas.`
  }

  const lines = CORE_RULES.map((r) => `${r.id}. *${r.title}* — ${r.summary}`).join('\n')
  return `**9 КЛЮЧЕВЫХ ПРАВИЛ БОТА (соблюдай всегда):**
${lines}

**ВОРОНКА КАТАЛОГА:**
инвестиции или для себя → страна → город → доступный тип недвижимости → бюджет, только если осталось больше 5 объектов → совпавшие объекты.
Инвестиции — только доли и долги. Для себя — только аукцион и купить сейчас. Запрещено смешивать ветки.`
}
