import crypto from 'crypto'
import { postChatCompletions } from './aiChatCompletion.js'
import { cleanAiText, parseLooseJson } from '../utils/parseLooseJson.js'
import { findNewsCoverImage } from './newsImageSearch.js'
import { generateImageMetaFromDraft } from './newsImageAi.js'

const JSON_RULES = `Правила JSON:
- только двойные кавычки "
- внутри строк text не используй переносы строк
- без запятой после последнего элемента
- экранируй кавычки в тексте как \\"`

const NEWS_SYSTEM_PROMPT = `Ты редактор travel-блога на русском языке.
Ответь ТОЛЬКО одним JSON-объектом (без markdown, без текста до/после).
${JSON_RULES}

Формат:
{
  "badge": "Идеи для поездок",
  "title": "заголовок",
  "lead": "лид 2-3 предложения",
  "excerpt": "до 180 символов",
  "imageSearchQuery": "english keywords",
  "cardSize": "medium",
  "sections": [{"id":"s1","title":"Раздел 1","level":2}],
  "body": [
    {"type":"p","text":"абзац до 200 символов"},
    {"type":"h2","text":"Заголовок","id":"s1"},
    {"type":"p","text":"абзац"}
  ]
}

Обязательно: ровно 4 заголовка h2 (id s1-s4), между ними абзацы p. Короткие тексты. cardSize: large, medium или small.`

const COMPACT_NEWS_PROMPT = `Ты редактор travel-блога. Ответь ТОЛЬКО JSON без markdown.
${JSON_RULES}

Сделай КОРОТКУЮ статью: title, lead, excerpt, imageSearchQuery, cardSize, sections (4 шт), body.
Ровно 4 h2 с id s1,s2,s3,s4. Между h2 по 1-2 абзаца p (до 150 символов). Минимум JSON, без лишних слов.`

const OUTLINE_PROMPT = `Ты редактор travel-блога. Ответь ТОЛЬКО JSON без markdown.
${JSON_RULES}

Формат:
{
  "badge": "Идеи для поездок",
  "title": "...",
  "lead": "...",
  "excerpt": "...",
  "imageSearchQuery": "english keywords",
  "cardSize": "medium",
  "sections": [
    {"id":"s1","title":"...","level":2},
    {"id":"s2","title":"...","level":2},
    {"id":"s3","title":"...","level":2},
    {"id":"s4","title":"...","level":2}
  ]
}
Ровно 4 раздела.`

const BODY_FROM_OUTLINE_PROMPT = `Ты редактор travel-блога. По outline статьи верни ТОЛЬКО JSON:
${JSON_RULES}

Формат: {"body":[{"type":"p","text":"..."},{"type":"h2","text":"...","id":"s1"},{"type":"p","text":"..."}]}
Для каждого раздела из outline: h2 с тем же id и title, до 2 абзацев p (до 180 символов).`

function simplifyUserPrompt(raw) {
  let text = String(raw || '').trim()
  if (text.length > 4000) {
    text = `${text.slice(0, 4000)}\n[Сокращено.]`
  }
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const russianLines = lines.filter((l) => /[а-яё]/i.test(l))
  if (russianLines.length > 0 && russianLines.length < lines.length) {
    return russianLines.slice(0, 10).join('\n')
  }
  return text
}

function parseNewsPayload(content) {
  const parsed = parseLooseJson(content)
  if (!parsed.title) {
    throw new Error('Неполный ответ AI: нет title')
  }
  if (!Array.isArray(parsed.body) || !parsed.body.length) {
    throw new Error('Неполный ответ AI: нет body')
  }
  return parsed
}

function normalizeBodyBlocks(body, sections) {
  const out = []
  const mergedSections = Array.isArray(sections) ? [...sections] : []
  const sectionIds = new Set(mergedSections.map((s) => s.id))

  for (const block of body) {
    if (!block || typeof block !== 'object') continue
    const type = block.type
    if (type === 'h2' || type === 'h3') {
      const id =
        block.id ||
        String(block.text || '')
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 48)
      const safeId = id || `s-${crypto.randomUUID().slice(0, 8)}`
      out.push({ type, text: String(block.text || '').trim(), id: safeId })
      if (type === 'h2' && !sectionIds.has(safeId)) {
        mergedSections.push({ id: safeId, title: String(block.text || '').trim(), level: 2 })
        sectionIds.add(safeId)
      }
    } else if (type === 'p') {
      const text = String(block.text || '').trim()
      if (text) {
        out.push({
          type: 'p',
          text,
          emphasis: Boolean(block.emphasis || block.highlight),
        })
      }
    }
  }
  return { body: out, sections: mergedSections }
}

function countH2(body) {
  return (body || []).filter((b) => b.type === 'h2').length
}

function validateHeadingCount(body) {
  const n = countH2(body)
  if (n < 3 || n > 7) {
    throw new Error(`HEADING_COUNT:${n}`)
  }
}

function getMessageContent(data) {
  const msg = data?.choices?.[0]?.message
  let content = msg?.content

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : part?.text || part?.content || ''))
      .join('')
      .trim()
  }

  if (content && String(content).trim()) return String(content)
  if (typeof content === 'string') return content

  const alt = data?.choices?.[0]?.text
  if (alt && String(alt).trim()) return String(alt)

  return cleanAiText(JSON.stringify(msg || ''))
}

async function requestNewsJson(messages, { maxTokens = 4096, temperature = 0.45 } = {}) {
  return postChatCompletions(
    {
      messages,
      temperature,
      max_tokens: maxTokens,
    },
    { timeoutMs: 240000 },
  )
}

async function tryParseResponse(data) {
  return parseNewsPayload(getMessageContent(data))
}

async function generateFullArticle(userPrompt, { compact = false } = {}) {
  const system = compact ? COMPACT_NEWS_PROMPT : NEWS_SYSTEM_PROMPT
  const data = await requestNewsJson(
    [
      { role: 'system', content: system },
      { role: 'user', content: `Тема статьи:\n${userPrompt}` },
    ],
    { maxTokens: compact ? 3500 : 4096, temperature: compact ? 0.35 : 0.45 },
  )
  return tryParseResponse(data)
}

async function generateWithRetry(userPrompt) {
  const attempts = [
    () => generateFullArticle(userPrompt, { compact: false }),
    () => generateFullArticle(userPrompt, { compact: true }),
    async () => {
      const data = await requestNewsJson(
        [
          { role: 'system', content: COMPACT_NEWS_PROMPT },
          {
            role: 'user',
            content: `Тема:\n${userPrompt}\n\nПредыдущий ответ был битым. Верни ТОЛЬКО валидный JSON. Короткие тексты. 4 раздела h2.`,
          },
        ],
        { maxTokens: 3200, temperature: 0.25 },
      )
      return tryParseResponse(data)
    },
  ]

  let lastErr = null
  for (const attempt of attempts) {
    try {
      return await attempt()
    } catch (e) {
      lastErr = e
      console.warn('[news/generate] parse attempt failed:', e?.message || e)
    }
  }
  throw lastErr || new Error('parse failed')
}

async function generateOutlineThenBody(userPrompt) {
  const outlineData = await requestNewsJson(
    [
      { role: 'system', content: OUTLINE_PROMPT },
      { role: 'user', content: `Тема статьи:\n${userPrompt}` },
    ],
    { maxTokens: 1200, temperature: 0.35 },
  )
  const outline = parseLooseJson(getMessageContent(outlineData))
  if (!outline.title || !Array.isArray(outline.sections) || outline.sections.length < 3) {
    throw new Error('outline incomplete')
  }

  const bodyData = await requestNewsJson(
    [
      { role: 'system', content: BODY_FROM_OUTLINE_PROMPT },
      {
        role: 'user',
        content: `Outline:\n${JSON.stringify({
          title: outline.title,
          lead: outline.lead,
          sections: outline.sections,
        })}`,
      },
    ],
    { maxTokens: 3500, temperature: 0.35 },
  )
  const bodyPayload = parseLooseJson(getMessageContent(bodyData))

  return {
    ...outline,
    body: bodyPayload.body || bodyPayload.blocks || [],
  }
}

/**
 * @param {string} prompt
 */
export async function generateNewsDraftFromPrompt(prompt) {
  const userPrompt = simplifyUserPrompt(prompt)
  if (userPrompt.length < 8) {
    throw new Error('Промпт слишком короткий — опишите тему подробнее')
  }

  let parsed
  try {
    parsed = await generateWithRetry(userPrompt)
  } catch (err) {
    const msg = String(err?.message || err)
    if (/aborted|timeout|timed out/i.test(msg)) {
      throw new Error(
        'Генерация заняла слишком много времени. Сократите промпт или подождите 15 секунд и попробуйте снова.',
      )
    }
    console.warn('[news/generate] full article failed, trying outline+body:', msg)
    try {
      parsed = await generateOutlineThenBody(userPrompt)
    } catch (outlineErr) {
      console.error('[news/generate] outline+body failed:', outlineErr?.message || outlineErr)
      throw new Error(
        'Не удалось сгенерировать статью. Опишите тему короче (2–4 предложения на русском) и повторите через 20 секунд.',
      )
    }
  }

  let sections = Array.isArray(parsed.sections) ? parsed.sections : []
  let { body, sections: mergedSections } = normalizeBodyBlocks(parsed.body, sections)

  const h2Count = countH2(body)
  if (h2Count < 3 || h2Count > 7) {
    try {
      parsed = await generateFullArticle(userPrompt, { compact: true })
      sections = Array.isArray(parsed.sections) ? parsed.sections : []
      ;({ body, sections: mergedSections } = normalizeBodyBlocks(parsed.body, sections))
      validateHeadingCount(body)
    } catch {
      if (h2Count >= 2) {
        console.warn(`[news/generate] accepting ${countH2(body)} h2 sections (wanted 3-7)`)
      } else {
        throw new Error(
          'AI не сформировал достаточно разделов. Уточните тему и повторите генерацию.',
        )
      }
    }
  }

  const draftBase = {
    id: crypto.randomUUID(),
    status: 'draft',
    badge: parsed.badge || 'Идеи для поездок',
    title: String(parsed.title).trim(),
    lead: String(parsed.lead || '').trim(),
    excerpt: String(parsed.excerpt || parsed.lead || '').trim().slice(0, 220),
    imageSearchQuery: parsed.imageSearchQuery || '',
    size: ['large', 'medium', 'small'].includes(parsed.cardSize) ? parsed.cardSize : 'medium',
    featured: false,
    sections: mergedSections,
    body,
    views: 0,
    comments: 0,
    likes: 0,
  }

  const imageMeta = await generateImageMetaFromDraft(draftBase)
  const image = await findNewsCoverImage(imageMeta.imageSearchQuery)

  return {
    ...draftBase,
    image,
    imageSearchQuery: imageMeta.imageSearchQuery,
    imagePrompt: imageMeta.imagePrompt,
    headingCount: countH2(body),
  }
}
