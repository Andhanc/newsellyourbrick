import fs from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
const DATA_FILE = join(DATA_DIR, 'news-articles.json')
const VIEWS_FILE = join(DATA_DIR, 'news-views.json')

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ articles: [] }, null, 2), 'utf8')
  }
}

function ensureViewsFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(VIEWS_FILE)) {
    fs.writeFileSync(VIEWS_FILE, '{}\n', 'utf8')
  }
}

function readStore() {
  ensureDataFile()
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed?.articles) ? parsed : { articles: [] }
  } catch {
    return { articles: [] }
  }
}

function writeStore(data) {
  ensureDataFile()
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function readViewsMap() {
  ensureViewsFile()
  try {
    const parsed = JSON.parse(fs.readFileSync(VIEWS_FILE, 'utf8'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function writeViewsMap(map) {
  ensureViewsFile()
  fs.writeFileSync(VIEWS_FILE, JSON.stringify(map, null, 2), 'utf8')
}

function resolveViews(article) {
  if (!article?.slug) return 0
  const map = readViewsMap()
  if (typeof map[article.slug] === 'number') return map[article.slug]
  return Number(article.views) || 0
}

function withResolvedViews(article) {
  if (!article) return null
  return { ...article, views: resolveViews(article) }
}

export function listPublishedArticles() {
  const { articles } = readStore()
  return articles
    .filter((a) => a.status === 'published')
    .map((a) => withResolvedViews(a))
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
}

export function listAllArticles() {
  const { articles } = readStore()
  return [...articles]
    .map((a) => withResolvedViews(a))
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
}

export function getArticleBySlug(slug) {
  const { articles } = readStore()
  const article = articles.find((a) => a.slug === slug && a.status === 'published') || null
  return withResolvedViews(article)
}

export function getArticleById(id) {
  const { articles } = readStore()
  const article = articles.find((a) => a.id === id) || null
  return withResolvedViews(article)
}

export function slugifyTitle(title) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
    х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  }
  const base = String(title || '')
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
  return base || `article-${Date.now()}`
}

function uniqueSlug(base) {
  const { articles } = readStore()
  let slug = base
  let n = 0
  while (articles.some((a) => a.slug === slug)) {
    n += 1
    slug = `${base}-${n}`
  }
  return slug
}

export function formatRuDate(iso) {
  const d = new Date(iso)
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export function publishArticle(draft) {
  const now = new Date().toISOString()
  const id = draft.id || crypto.randomUUID()
  const slugBase = slugifyTitle(draft.title)
  const slug = draft.slug || uniqueSlug(slugBase)

  const article = {
    id,
    slug,
    status: 'published',
    badge: draft.badge || 'Идеи для поездок',
    title: draft.title,
    lead: draft.lead || '',
    excerpt: draft.excerpt || draft.lead || '',
    image: draft.image,
    imageSearchQuery: draft.imageSearchQuery || '',
    imagePrompt: draft.imagePrompt || '',
    size: draft.size || 'medium',
    featured: Boolean(draft.featured),
    sections: Array.isArray(draft.sections) ? draft.sections : [],
    body: Array.isArray(draft.body) ? draft.body : [],
    views: Number(draft.views) || 0,
    comments: Number(draft.comments) || 0,
    likes: Number(draft.likes) || 0,
    publishedAt: draft.publishedAt || now,
    updatedAt: now,
    date: formatRuDate(draft.publishedAt || now),
  }

  const store = readStore()
  const idx = store.articles.findIndex((a) => a.id === id)
  if (idx >= 0) {
    store.articles[idx] = { ...store.articles[idx], ...article }
  } else {
    store.articles.unshift(article)
  }
  writeStore(store)

  const viewsMap = readViewsMap()
  if (typeof viewsMap[slug] !== 'number') {
    viewsMap[slug] = article.views
    writeViewsMap(viewsMap)
  }

  return withResolvedViews(article)
}

export function deleteArticle(id) {
  const store = readStore()
  const removed = store.articles.find((a) => a.id === id)
  const before = store.articles.length
  store.articles = store.articles.filter((a) => a.id !== id)
  writeStore(store)

  if (removed?.slug) {
    const viewsMap = readViewsMap()
    if (viewsMap[removed.slug] != null) {
      delete viewsMap[removed.slug]
      writeViewsMap(viewsMap)
    }
  }

  return store.articles.length < before
}

/** Счётчик просмотров — отдельный файл, чтобы dev-сервер Vite не перезагружал страницу при каждом открытии статьи. */
export function incrementArticleViews(slug) {
  const { articles } = readStore()
  const article = articles.find((a) => a.slug === slug && a.status === 'published')
  if (!article) return null

  const map = readViewsMap()
  const base =
    typeof map[slug] === 'number' ? map[slug] : Number(article.views) || 0
  const next = base + 1
  map[slug] = next
  writeViewsMap(map)
  return next
}
