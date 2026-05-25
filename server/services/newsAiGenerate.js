import crypto from 'crypto'
import { postChatCompletions } from './aiChatCompletion.js'
import { cleanAiText, parseLooseJson } from '../utils/parseLooseJson.js'

const NEWS_SYSTEM_PROMPT = `Ты редактор travel-блога на русском языке.
По теме от пользователя напиши статью.
Ответь ТОЛЬКО одним JSON-объектом (без markdown, без текста до/после).
Правила JSON:
- только двойные кавычки "
- внутри строк text не используй переносы строк — пишите одним абзацем
- без запятой после последнего элемента массива
- экранируй кавычки в тексте как \\"

Формат:
{
  "badge": "Идеи для поездок",
  "title": "заголовок до 100 символов",
  "lead": "лид 2-3 предложения",
  "excerpt": "до 180 символов для карточки",
  "imageSearchQuery": "english keywords for photo search",
  "cardSize": "medium",
  "sections": [{"id":"section-one","title":"Раздел","level":2}],
  "body": [
    {"type":"p","text":"абзац"},
    {"type":"h2","text":"Заголовок","id":"section-one"},
    {"type":"h3","text":"Подзаголовок"},
    {"type":"p","text":"текст","emphasis":true}
  ]
}
Минимум 5 блоков в body, 2 h2 с id, 1 h3. cardSize: large, medium или small.`

function simplifyUserPrompt(raw) {
  let text = String(raw || '').trim()
  if (text.length > 6000) {
    text = `${text.slice(0, 6000)}\n[Сокращено.]`
  }
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const russianLines = lines.filter((l) => /[а-яё]/i.test(l))
  if (russianLines.length > 0 && russianLines.length < lines.length) {
    return russianLines.slice(0, 12).join('\n')
  }
  return text
}

function parseNewsPayload(content) {
  const parsed = parseLooseJson(content)
  if (!parsed.title || !Array.isArray(parsed.body)) {
    throw new Error('Неполный ответ AI')
  }
  return parsed
}

function normalizeBodyBlocks(body, sections) {
  const out = []
  const sectionIds = new Set((sections || []).map((s) => s.id))

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
      out.push({ type, text: String(block.text || '').trim(), id: id || crypto.randomUUID() })
      if (type === 'h2' && id && !sectionIds.has(id)) {
        sections.push({ id, title: String(block.text || '').trim(), level: 2 })
        sectionIds.add(id)
      }
    } else if (type === 'p') {
      out.push({
        type: 'p',
        text: String(block.text || '').trim(),
        emphasis: Boolean(block.emphasis || block.highlight),
      })
    }
  }
  return { body: out, sections: sections || [] }
}

async function requestNewsJson(userPrompt, { retry = false } = {}) {
  const messages = retry
    ? [
        { role: 'system', content: NEWS_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Тема статьи:\n${userPrompt}\n\nПредыдущий ответ был с ошибкой JSON. Верни ТОЛЬКО исправленный JSON, короче: 4-6 блоков body.`,
        },
      ]
    : [
        { role: 'system', content: NEWS_SYSTEM_PROMPT },
        { role: 'user', content: `Тема статьи:\n${userPrompt}` },
      ]

  return postChatCompletions(
    {
      messages,
      temperature: retry ? 0.35 : 0.55,
      max_tokens: 2600,
    },
    { timeoutMs: 240000 },
  )
}

function getMessageContent(data) {
  const msg = data?.choices?.[0]?.message
  const content = msg?.content
  if (content && String(content).trim()) return String(content)
  if (typeof content === 'string') return content
  return cleanAiText(JSON.stringify(msg || ''))
}

/**
 * @param {string} prompt
 */
export async function generateNewsDraftFromPrompt(prompt) {
  const userPrompt = simplifyUserPrompt(prompt)
  if (userPrompt.length < 8) {
    throw new Error('Промпт слишком короткий — опишите тему подробнее')
  }

  let data
  try {
    data = await requestNewsJson(userPrompt)
  } catch (err) {
    const msg = String(err?.message || err)
    if (/aborted|timeout|timed out/i.test(msg)) {
      throw new Error(
        'Генерация заняла слишком много времени. Сократите промпт или подождите 15 секунд и попробуйте снова.',
      )
    }
    throw err
  }

  let parsed
  try {
    parsed = parseNewsPayload(getMessageContent(data))
  } catch {
    try {
      data = await requestNewsJson(userPrompt, { retry: true })
      parsed = parseNewsPayload(getMessageContent(data))
    } catch {
      throw new Error(
        'AI вернул некорректный JSON. Опишите только тему статьи (2–5 предложений), без инструкций про фото и Unsplash — и нажмите «Сгенерировать» снова.',
      )
    }
  }

  let sections = Array.isArray(parsed.sections) ? parsed.sections : []
  const { body, sections: mergedSections } = normalizeBodyBlocks(parsed.body, sections)

  const { findNewsCoverImage } = await import('./newsImageSearch.js')
  const image = await findNewsCoverImage(parsed.imageSearchQuery || parsed.title)

  return {
    id: crypto.randomUUID(),
    status: 'draft',
    badge: parsed.badge || 'Идеи для поездок',
    title: String(parsed.title).trim(),
    lead: String(parsed.lead || '').trim(),
    excerpt: String(parsed.excerpt || parsed.lead || '').trim().slice(0, 220),
    image,
    imageSearchQuery: parsed.imageSearchQuery || '',
    size: ['large', 'medium', 'small'].includes(parsed.cardSize) ? parsed.cardSize : 'medium',
    featured: false,
    sections: mergedSections,
    body,
    views: 0,
    comments: 0,
    likes: 0,
  }
}
