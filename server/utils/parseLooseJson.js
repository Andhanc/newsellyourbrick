/**
 * Извлечение и починка JSON из ответов LLM (частые trailing comma, «ёлочки», обрезка).
 */

export function cleanAiText(raw) {
  let text = String(raw || '')
  while (text.includes('</think>')) {
    text = text.split('</think>').pop().trim()
  }
  text = text.replace(/<\/?redacted_reasoning>/g, '').trim()
  text = text.replace(/<\/?think>/g, '').trim()
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  return text
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
  ]

  let lastError = null
  for (const candidate of attempts) {
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
