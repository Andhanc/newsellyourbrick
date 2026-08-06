import { normalizeApiKey } from '../aiChatConfig.js'

export const PASSPORT_AI_MODEL =
  process.env.PASSPORT_AI_MODEL || process.env.PROPERTY_AI_MODEL || 'google/gemini-3.5-flash'

const PASSPORT_JSON_SCHEMA = {
  name: 'passport_fields',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'isIdentityDocument',
      'documentType',
      'issuingCountry',
      'scriptLanguage',
      'passportNumber',
      'identificationNumber',
      'passportSeries',
      'firstName',
      'lastName',
      'mrzPresent',
      'detectedFieldLabels',
      'confidence',
    ],
    properties: {
      isIdentityDocument: { type: 'boolean' },
      documentType: {
        type: 'string',
        description: 'passport | national_id | residence_permit | travel_document | other | unknown',
      },
      issuingCountry: {
        type: 'string',
        description: 'ISO 3166-1 alpha-2 or English country name if ISO unknown; empty if unknown',
      },
      scriptLanguage: {
        type: 'string',
        description: 'Primary script/language visible on the document, e.g. latin, cyrillic, arabic, mixed',
      },
      passportNumber: { type: 'string' },
      identificationNumber: { type: 'string' },
      passportSeries: { type: 'string' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      mrzPresent: { type: 'boolean' },
      detectedFieldLabels: {
        type: 'array',
        items: { type: 'string' },
        description: 'Labels actually visible on the document (original language), e.g. Passport No., Nº pasaporte, Личный номер',
      },
      confidence: { type: 'number' },
    },
  },
}

const SYSTEM_PROMPT = `You extract structured identity-document fields from a photo.
Return ONLY JSON matching the schema. The document may be from ANY country and written in ANY language/script (Latin, Cyrillic, Arabic, Chinese, etc.).

Step 1 — Document understanding
- Decide whether this is an identity document (passport booklet page, passport card, national ID, residence permit, travel document).
- Identify issuing country when possible (from coat of arms, country name, or MRZ country code).
- List detectedFieldLabels: the real printed labels you can see, in their original language.
- Set mrzPresent=true if an ICAO MRZ (P< / I< / A< lines with <<<<<) is visible.

Step 2 — Field mapping (country-agnostic)
Map whatever fields exist on THIS document into our targets. Do not assume a Russian/Belarusian layout.

passportNumber:
- Document / passport / travel document number as printed.
- Prefer MRZ passport/document number when MRZ is readable and reliable.
- If series and number are printed separately, put series in passportSeries and the numeric/alpha number in passportNumber; if only one combined value exists, put the full value in passportNumber and leave passportSeries empty.
- Strip spaces and hyphens in the returned values.

identificationNumber:
- Personal / national / citizen / resident identifier that is NOT the passport/document number.
- Examples by country (non-exhaustive): Belarus personal number; Spain DNI/NIE; Poland PESEL; Sweden personnummer; Germany Personalausweis number or Steuer-ID only if clearly a personal ID on the same page; UK National Insurance only if explicitly present; US passport card / passport number stays in passportNumber (US passports often have no separate personal number — leave empty).
- Prefer explicit labels such as: Personal No., National ID, ID No., DNI, NIE, PESEL, Личный номер, Identificación, Nº identidad, Numéro personnel, etc.
- If the document has no separate personal/national ID, return an empty string "".
- Never invent a value and never copy passportNumber into identificationNumber unless the document truly uses one shared identifier.

Names:
- Prefer the Latin / MRZ transliteration when both native and Latin names are present; otherwise use the clearest printed given/surname.

Rules:
- Never invent unreadable characters. Use "" when unsure.
- confidence is 0..1 for the extracted critical fields overall.
- isIdentityDocument=false for selfies, random photos, covers without data page, screenshots of unrelated content.`

const USER_PROMPT = `Analyze this identity document photo from any country.
1) Confirm it is a passport/ID data page.
2) Detect which fields exist (any language).
3) Extract passport/document number and personal/national identification number when present.
4) Return JSON only.`

function stripDataUrlPrefix(raw = '') {
  const value = String(raw).trim()
  const match = value.match(/^data:([^;]+);base64,(.+)$/i)
  if (match) {
    return { mimeType: match[1], base64: match[2] }
  }
  return { mimeType: null, base64: value.replace(/\s+/g, '') }
}

function emptyToNull(value) {
  if (value == null) return null
  const trimmed = String(value).trim()
  return trimmed ? trimmed : null
}

function asStringArray(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 24)
}

export function normalizePassportAiPayload(raw = {}) {
  const isPassport =
    raw.isIdentityDocument === true ||
    raw.isPassport === true ||
    ['passport', 'national_id', 'residence_permit', 'travel_document'].includes(
      String(raw.documentType || '')
        .toLowerCase()
        .trim(),
    )

  return {
    firstName: emptyToNull(raw.firstName),
    lastName: emptyToNull(raw.lastName),
    middleName: null,
    passportSeries: emptyToNull(raw.passportSeries),
    passportNumber: emptyToNull(raw.passportNumber),
    identificationNumber: emptyToNull(raw.identificationNumber),
    address: null,
    email: null,
    isPassport: Boolean(isPassport),
    documentType: emptyToNull(raw.documentType) || 'unknown',
    issuingCountry: emptyToNull(raw.issuingCountry),
    scriptLanguage: emptyToNull(raw.scriptLanguage),
    mrzPresent: Boolean(raw.mrzPresent),
    detectedFieldLabels: asStringArray(raw.detectedFieldLabels),
    confidence: typeof raw.confidence === 'number' ? raw.confidence : null,
    source: 'gemini_vision',
  }
}

export function parsePassportAiModelContent(content) {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Модель вернула пустой ответ')
  }
  let text = content.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  }
  const parsed = JSON.parse(text)
  return normalizePassportAiPayload(parsed)
}

/**
 * Извлекает поля паспорта/ID с изображения через Google Gemini (OpenRouter).
 * Документы любых стран и языков.
 * @param {{ imageBase64: string, mimeType?: string }} input
 */
export async function extractPassportFieldsWithGemini(input = {}, overrides = {}) {
  const apiKey = normalizeApiKey(overrides.apiKey || process.env.OPENROUTER_API_KEY)
  if (!apiKey) throw new Error('OPENROUTER_API_KEY не настроен')

  const { mimeType: fromDataUrl, base64 } = stripDataUrlPrefix(input.imageBase64 || '')
  if (!base64 || base64.length < 32) {
    throw new Error('Изображение паспорта не предоставлено')
  }

  const mimeType = (input.mimeType || fromDataUrl || 'image/jpeg').split(';')[0].trim() || 'image/jpeg'
  if (!/^image\//i.test(mimeType)) {
    throw new Error('Нужен файл изображения')
  }

  // ~8MB base64 ≈ разумный верхний предел для vision-запроса
  if (base64.length > 11_000_000) {
    throw new Error('Файл слишком большой. Сожмите фото и попробуйте снова.')
  }

  const fetchImpl = overrides.fetchImpl || fetch
  const model = overrides.model || PASSPORT_AI_MODEL
  const dataUrl = `data:${mimeType};base64,${base64}`

  const response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://sellyourbrick.com',
      'X-Title': 'SellYourBrick Passport OCR',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: USER_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 1200,
      response_format: { type: 'json_schema', json_schema: PASSPORT_JSON_SCHEMA },
    }),
    signal: AbortSignal.timeout(45_000),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || `OpenRouter вернул ${response.status}`)
  }

  const answer = data?.choices?.[0]?.message?.content
  const extracted = parsePassportAiModelContent(answer)

  if (!extracted.isPassport) {
    const err = new Error(
      'На фото не распознан паспорт или удостоверение личности. Снимите страницу с данными документа.',
    )
    err.code = 'NOT_PASSPORT'
    throw err
  }

  if (!extracted.passportNumber && !extracted.identificationNumber) {
    const err = new Error(
      'Не удалось прочитать номер документа и идентификационный номер. Попробуйте более чёткое фото.',
    )
    err.code = 'EMPTY_FIELDS'
    throw err
  }

  return extracted
}
