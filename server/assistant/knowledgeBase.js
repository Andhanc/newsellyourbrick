import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const KNOWLEDGE_PATH =
  process.env.SYB_KNOWLEDGE_PATH || path.join(__dirname, 'consultant-knowledge.json')

const EXCLUDED_RETRIEVAL_KEYS = new Set(['_admin_meta', 'brand', 'disclaimer'])

const STOP_WORDS = new Set([
  'для',
  'как',
  'что',
  'это',
  'или',
  'мне',
  'нужен',
  'нужна',
  'хочу',
  'the',
  'and',
  'for',
  'with',
  'what',
  'how',
  'please',
  'que',
  'para',
  'con',
])

function loadFromDisk() {
  const raw = fs.readFileSync(KNOWLEDGE_PATH, 'utf8')
  const data = JSON.parse(raw)
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('База знаний должна быть JSON-объектом')
  }
  return data
}

export function getKnowledgeBase() {
  try {
    return loadFromDisk()
  } catch (error) {
    console.warn('[assistant] knowledge base:', error.message)
    return {}
  }
}

export function tokenizeKnowledge(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
}

function scoreKnowledgeValue(key, value, queryTokens) {
  const normalizedKey = String(key).replace(/_/g, ' ').toLowerCase()
  const haystack = `${normalizedKey} ${JSON.stringify(value)}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
  let score = 0
  for (const token of queryTokens) {
    if (normalizedKey.includes(token)) score += 5
    else if (haystack.includes(token)) score += 1
  }
  return score
}

function getScenarioPriorities(scenario, query) {
  const priorities = new Map()
  const add = (key, score) => priorities.set(key, (priorities.get(key) || 0) + score)

  if (scenario === 'platform_help') {
    add('platform_overview', 28)
    add('company_services', 18)
    add('site_map', 16)
  } else if (scenario === 'auction_help') {
    add('auctions', 32)
    add('buy_now', 18)
  } else if (scenario === 'shares') {
    add('shares', 34)
    add('investor_tools', 12)
  } else if (scenario === 'visa_docs') {
    add('visa_residency', 32)
    add('purchase_documents', 28)
    add('mortgage', 16)
  } else if (scenario === 'support_other' || scenario === 'manager_handoff') {
    add('contacts', 24)
    add('company_services', 12)
  } else if (scenario === 'property_search') {
    add('platform_overview', 6)
    add('auctions', 4)
  }

  const text = String(query || '').toLowerCase()
  if (/аукцион|торг|ставк|auction|subasta/i.test(text)) add('auctions', 30)
  if (/доли|shares|соинвест|фракцион/i.test(text)) add('shares', 32)
  if (/тест.?драйв|test.?drive/i.test(text)) add('test_drive', 32)
  if (/долг|distress|обремен/i.test(text)) add('debts', 30)
  if (/калькулятор|доходн|панель\s+инвест|roi|yield/i.test(text)) add('investor_tools', 30)
  if (/внж|виза|golden|residenc/i.test(text)) add('visa_residency', 32)
  if (/документ|паспорт|\bnie\b|dld/i.test(text)) add('purchase_documents', 28)
  if (/ипотек|mortgage|hipoteca/i.test(text)) add('mortgage', 30)
  if (/купить\s+сейчас|buy\s*now/i.test(text)) add('buy_now', 26)
  if (/о\s+платформ|что\s+такое\s+sellyourbrick|о\s+вас/i.test(text)) add('platform_overview', 30)
  if (/контакт|менеджер|manager|whatsapp/i.test(text)) add('contacts', 28)
  return priorities
}

export function selectRelevantKnowledge(kb, options = {}) {
  if (!kb || typeof kb !== 'object') return {}
  const query = String(options.query || '')
  const scenario = options.scenario || 'general'
  const maxSections = Math.max(1, parseInt(options.maxSections, 10) || 4)
  const queryTokens = tokenizeKnowledge(query)
  const priorities = getScenarioPriorities(scenario, query)

  const ranked = Object.entries(kb)
    .filter(([key]) => !EXCLUDED_RETRIEVAL_KEYS.has(key))
    .map(([key, value]) => ({
      key,
      value,
      score: scoreKnowledgeValue(key, value, queryTokens) + (priorities.get(key) || 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
    .slice(0, maxSections)

  const selected = {
    brand: kb.brand,
    disclaimer: kb.disclaimer,
  }
  for (const entry of ranked) {
    selected[entry.key] = entry.value
  }
  return selected
}

export function getKnowledgeBaseForPrompt(options = null) {
  const kb = getKnowledgeBase()
  if (options && typeof options === 'object') {
    return selectRelevantKnowledge(kb, options)
  }
  return kb
}
