import express from 'express'
import crypto from 'crypto'
import { generateNewsDraftFromPrompt } from './services/newsAiGenerate.js'
import {
  deleteArticle,
  getArticleBySlug,
  incrementArticleViews,
  listAllArticles,
  listPublishedArticles,
  publishArticle,
} from './services/newsStore.js'
import {
  createAd,
  deleteAd,
  listActiveAds,
  listAllAds,
  toPublicAd,
} from './services/siteAdsStore.js'

const MARKETER_LOGIN = () => String(process.env.MARKETER_LOGIN || 'manager').trim()
const MARKETER_PASSWORD = () => String(process.env.MARKETER_PASSWORD || 'manager').trim()

/** @type {Map<string, { createdAt: number }>} */
const marketerTokens = new Map()

function issueMarketerToken() {
  const token = crypto.randomBytes(32).toString('hex')
  marketerTokens.set(token, { createdAt: Date.now() })
  return token
}

function isValidMarketerToken(token) {
  if (!token) return false
  const entry = marketerTokens.get(token)
  if (!entry) return false
  const maxAge = 24 * 60 * 60 * 1000
  if (Date.now() - entry.createdAt > maxAge) {
    marketerTokens.delete(token)
    return false
  }
  return true
}

function requireMarketer(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!isValidMarketerToken(token)) {
    return res.status(401).json({ success: false, error: 'Требуется вход маркетолога' })
  }
  req.marketerToken = token
  return next()
}

function toPublicCard(article) {
  return {
    id: article.id,
    slug: article.slug,
    badge: article.badge,
    title: article.title,
    excerpt: article.excerpt,
    image: article.image,
    date: article.date,
    views: article.views,
    comments: article.comments,
    likes: article.likes,
    size: article.size,
    featured: article.featured,
    publishedAt: article.publishedAt,
  }
}

function toPublicDetail(article) {
  return {
    id: article.id,
    slug: article.slug,
    badge: article.badge,
    title: article.title,
    lead: article.lead,
    excerpt: article.excerpt,
    image: article.image,
    date: article.date,
    views: article.views,
    comments: article.comments,
    likes: article.likes,
    sections: article.sections,
    body: article.body,
    publishedAt: article.publishedAt,
  }
}

/** @param {import('express').Express} app */
export function registerNewsRoutes(app) {
  const router = express.Router()

  router.post('/marketer/login', express.json(), (req, res) => {
    const login = String(req.body?.login || '').trim()
    const password = String(req.body?.password || '')
    if (login !== MARKETER_LOGIN() || password !== MARKETER_PASSWORD()) {
      return res.status(401).json({ success: false, error: 'Неверный логин или пароль' })
    }
    const token = issueMarketerToken()
    return res.json({ success: true, token })
  })

  router.post('/marketer/logout', requireMarketer, (req, res) => {
    marketerTokens.delete(req.marketerToken)
    return res.json({ success: true })
  })

  router.get('/marketer/articles', requireMarketer, (_req, res) => {
    const articles = listAllArticles()
    return res.json({ success: true, articles })
  })

  router.post('/marketer/generate', requireMarketer, express.json(), async (req, res) => {
    try {
      const prompt = String(req.body?.prompt || '').trim()
      const draft = await generateNewsDraftFromPrompt(prompt)
      return res.json({ success: true, draft })
    } catch (err) {
      console.error('[news/generate]', err)
      return res.status(500).json({
        success: false,
        error: err?.message || 'Не удалось сгенерировать новость',
      })
    }
  })

  router.post('/marketer/publish', requireMarketer, express.json(), (req, res) => {
    try {
      const draft = req.body?.draft
      if (!draft?.title || !draft?.image) {
        return res.status(400).json({ success: false, error: 'Нет данных для публикации' })
      }
      const article = publishArticle(draft)
      return res.json({ success: true, article })
    } catch (err) {
      console.error('[news/publish]', err)
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка публикации' })
    }
  })

  router.delete('/marketer/articles/:id', requireMarketer, (req, res) => {
    const ok = deleteArticle(req.params.id)
    if (!ok) return res.status(404).json({ success: false, error: 'Статья не найдена' })
    return res.json({ success: true })
  })

  router.get('/marketer/ads', requireMarketer, (_req, res) => {
    const ads = listAllAds()
    return res.json({ success: true, ads })
  })

  router.post('/marketer/ads', requireMarketer, express.json(), (req, res) => {
    try {
      const ad = createAd(req.body || {})
      return res.json({ success: true, ad })
    } catch (err) {
      const status = err?.statusCode || 500
      return res.status(status).json({
        success: false,
        error: err?.message || 'Ошибка создания рекламы',
      })
    }
  })

  router.delete('/marketer/ads/:id', requireMarketer, (req, res) => {
    const ok = deleteAd(req.params.id)
    if (!ok) return res.status(404).json({ success: false, error: 'Реклама не найдена' })
    return res.json({ success: true })
  })

  router.get('/ads', (_req, res) => {
    const ads = listActiveAds().map(toPublicAd)
    return res.json({ success: true, ads })
  })

  router.get('/articles', (_req, res) => {
    const articles = listPublishedArticles().map(toPublicCard)
    return res.json({ success: true, articles })
  })

  router.get('/articles/:slug', (req, res) => {
    const article = getArticleBySlug(req.params.slug)
    if (!article) {
      return res.status(404).json({ success: false, error: 'Статья не найдена' })
    }
    const views = incrementArticleViews(req.params.slug)
    const payload = toPublicDetail({ ...article, views: views ?? article.views })
    return res.json({ success: true, article: payload })
  })

  app.use('/api/news', router)
}
