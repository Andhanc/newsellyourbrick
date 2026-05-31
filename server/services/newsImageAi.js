import { postChatCompletions } from './aiChatCompletion.js'
import { parseLooseJson, cleanAiText } from '../utils/parseLooseJson.js'

const IMAGE_META_SYSTEM = `Ты помогаешь подобрать обложку для travel-статьи на русском.
По заголовку, лиду и разделам статьи сформулируй запросы для поиска и генерации фото.
Ответь ТОЛЬКО JSON (без markdown):
{
  "imageSearchQuery": "3-6 english keywords for stock photo search",
  "imagePrompt": "detailed english photorealistic scene description, 20-35 words, no text on image, editorial travel magazine style"
}`

function draftSummary(draft) {
  const headings = (draft?.body || [])
    .filter((b) => b.type === 'h2')
    .map((b) => b.text)
    .join(' · ')
  return [
    `Title: ${draft?.title || ''}`,
    `Lead: ${draft?.lead || ''}`,
    `Excerpt: ${draft?.excerpt || ''}`,
    `Sections: ${headings || '—'}`,
    draft?.imageSearchQuery ? `Editor keywords: ${draft.imageSearchQuery}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function extractJsonContent(data) {
  const msg = data?.choices?.[0]?.message
  const content = msg?.content
  if (content && String(content).trim()) return String(content)
  return cleanAiText(JSON.stringify(msg || ''))
}

/**
 * @param {{ title?: string, lead?: string, excerpt?: string, body?: object[], imageSearchQuery?: string }} draft
 */
export async function generateImageMetaFromDraft(draft) {
  try {
    const data = await postChatCompletions(
      {
        messages: [
          { role: 'system', content: IMAGE_META_SYSTEM },
          { role: 'user', content: draftSummary(draft) },
        ],
        temperature: 0.4,
        max_tokens: 400,
      },
      { timeoutMs: 60000 },
    )
    const parsed = parseLooseJson(extractJsonContent(data))
    const imageSearchQuery = String(parsed?.imageSearchQuery || draft?.imageSearchQuery || draft?.title || '')
      .trim()
      .slice(0, 120)
    const imagePrompt = String(parsed?.imagePrompt || imageSearchQuery).trim().slice(0, 400)
    return { imageSearchQuery, imagePrompt }
  } catch (err) {
    console.warn('[newsImageAi] meta:', err?.message || err)
    const fallback = String(draft?.imageSearchQuery || draft?.title || 'travel destination').trim()
    return {
      imageSearchQuery: fallback.slice(0, 120),
      imagePrompt: `Professional travel photography, ${fallback}, golden hour, editorial quality, no text`,
    }
  }
}

/** Pollinations — бесплатная генерация без ключа */
export function buildAiGeneratedImageUrl(imagePrompt) {
  const prompt = String(imagePrompt || 'beautiful travel destination landscape')
    .trim()
    .slice(0, 500)
  const encoded = encodeURIComponent(prompt)
  return `https://image.pollinations.ai/prompt/${encoded}?width=1400&height=700&nologo=true&enhance=true`
}

/**
 * @param {{ title?: string, lead?: string, body?: object[], imageSearchQuery?: string, imagePrompt?: string }} draft
 */
export async function generateAiCoverFromDraft(draft) {
  const meta = draft?.imagePrompt
    ? {
        imageSearchQuery: draft.imageSearchQuery || draft.title,
        imagePrompt: draft.imagePrompt,
      }
    : await generateImageMetaFromDraft(draft)

  const seed = Date.now()
  const image = `${buildAiGeneratedImageUrl(meta.imagePrompt)}&seed=${seed}`
  return { ...meta, image }
}
