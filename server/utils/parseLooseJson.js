/**
 * Извлечение и починка JSON из ответов LLM (частые trailing comma, «ёлочки», обрезка).
 */

export function cleanAiText(raw) {
  let text = String(raw || '')
  while (text.includes('</think>')) {
    text = text.split('</think>').pop().trim()
  }
  text = text.replace(/<\/?redacted_reasoning>/gi, '').trim()
  text = text.replace(/<\/?think>/gi, '').trim()
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  return text.replace(/^\uFEFF/, '').trim()
}

/** Баланс скобок — один корневой объект, без жадного regex */
export function extractJsonObject(text) {
  const cleaned = cleanAiText(text)
  const start = cleaned.indexOf('{')
  if (start < 0) return null

  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < cleaned.length; i += 1) {
    const c = cleaned[i]
    if (inString) {
      if (escape) escape = false
      else if (c === '\\') escape = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') {
      inString = true
      continue
    }
    if (c === '{') depth += 1
    if (c === '}') {
      depth -= 1
      if (depth === 0) return cleaned.slice(start, i + 1)
    }
  }
  return null
}

export function repairJsonString(jsonStr) {
  let s = String(jsonStr || '')
  s = s.replace(/[\u201c\u201d]/g, '"')
  s = s.replace(/[\u2018\u2019]/g, "'")
  s = s.replace(/,\s*([}\]])/g, '$1')
  s = s.replace(/\}\s*\{/g, '},{')
  s = s.replace(/\]\s*\[/g, '],[')
  // Иногда модель вставляет переносы внутри строк — заменяем на пробел
  s = s.replace(/"text"\s*:\s*"([^"]*?)"/gs, (_m, inner) => {
    const fixed = String(inner).replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim()
    return `"text":"${fixed.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  })
  return s
}

/** Попытка закрыть обрезанный JSON (лимит токенов) */
export function closeTruncatedJson(jsonStr) {
  let s = String(jsonStr || '').trim()
  if (!s.startsWith('{')) return s

  const lastItem = s.lastIndexOf('},')
  if (lastItem > 20) {
    s = s.slice(0, lastItem + 1)
  }

  const openBraces = (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length
  const openBrackets = (s.match(/\[/g) || []).length - (s.match(/\]/g) || []).length

  for (let i = 0; i < openBrackets; i += 1) s += ']'
  for (let i = 0; i < openBraces; i += 1) s += '}'

  return s
}

/**
 * @param {string} text
 * @returns {object}
 */
export function parseLooseJson(text) {
  const extracted = extractJsonObject(text)
  if (!extracted) {
    throw new Error('AI не вернул JSON-объект')
  }

  const attempts = [
    extracted,
    repairJsonString(extracted),
    repairJsonString(extracted.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ')),
    closeTruncatedJson(extracted),
    repairJsonString(closeTruncatedJson(extracted)),
  ]

  let lastError = null
  for (const candidate of attempts) {
    if (!candidate) continue
    try {
      return JSON.parse(candidate)
    } catch (e) {
      lastError = e
    }
  }

  const msg = lastError?.message || 'невалидный JSON'
  throw new Error(
    msg.includes('JSON') ? `AI вернул некорректный JSON: ${msg}` : 'AI вернул некорректный JSON',
  )
}
