import express from 'express'
import { getPrisma } from './database/prismaClient.js'
import {
  appendPropertyAiMessage,
  createPropertyAiReport,
  ensurePropertyAiConversation,
  findReusablePropertyAiReport,
  getOwnedPropertyAiReport,
  listPropertyAiHistory,
  userExistsForPropertyAi,
} from './database/propertyAiReportsPrisma.js'
import { normalizePropertyAiRequest } from './services/propertyAiReportContract.js'
import { PROPERTY_AI_REPORT_MODEL, runPropertyAiGeneration } from './services/propertyAiGenerate.js'
import { normalizePropertyAiImages } from './services/propertyAiImages.js'

const ALLOWED_PROPERTY_TABLES = ['properties', 'properties_apartments', 'properties_houses']

function positiveInt(value) {
  const number = Number.parseInt(String(value ?? ''), 10)
  return Number.isSafeInteger(number) && number > 0 ? number : null
}

function normalizeProperty(row, table) {
  const images = normalizePropertyAiImages([row.images, row.photos, row.image])
  return {
    ...row,
    title: row.title || row.name || `Объект №${row.id}`,
    images: images.slice(0, 8),
    source_table: table,
  }
}

async function loadProperty(propertyId, requestedTable) {
  const prisma = getPrisma()
  const tables = ALLOWED_PROPERTY_TABLES.includes(requestedTable)
    ? [requestedTable]
    : ALLOWED_PROPERTY_TABLES
  for (const table of tables) {
    try {
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}" WHERE id = $1 LIMIT 1`, propertyId)
      if (rows[0]) return normalizeProperty(rows[0], table)
    } catch (error) {
      if (!/does not exist/i.test(String(error?.message || error))) throw error
    }
  }
  return null
}

async function requirePropertyAiUser(req, res, next) {
  const userId = positiveInt(req.get('X-User-Id') || req.query.user_id || req.body?.user_id)
  if (!userId || !(await userExistsForPropertyAi(userId))) {
    return res.status(401).json({ detail: 'Войдите в аккаунт, чтобы использовать Недвижимость AI.' })
  }
  req.propertyAiUserId = userId
  next()
}

/** @param {import('express').Express} app */
export function registerPropertyAiRoutes(app) {
  const router = express.Router()
  router.use(express.json({ limit: '1mb' }))
  router.use(requirePropertyAiUser)

  router.get('/history', async (req, res) => {
    try {
      const propertyId = positiveInt(req.query.property_id)
      if (!propertyId) return res.status(400).json({ detail: 'Некорректный ID объекта.' })
      const history = await listPropertyAiHistory({
        userId: req.propertyAiUserId,
        propertyId,
        propertyTable: ALLOWED_PROPERTY_TABLES.includes(req.query.property_table) ? req.query.property_table : null,
      })
      res.json({ success: true, data: history })
    } catch (error) {
      console.error('[property-ai/history]', error)
      res.status(500).json({ detail: 'Не удалось загрузить историю AI.' })
    }
  })

  router.post('/reports', async (req, res) => {
    try {
      const propertyId = positiveInt(req.body?.property_id)
      if (!propertyId) return res.status(400).json({ detail: 'Некорректный ID объекта.' })
      const request = normalizePropertyAiRequest(req.body)
      const property = await loadProperty(propertyId, req.body?.property_table)
      if (!property) return res.status(404).json({ detail: 'Объект не найден.' })
      const conversation = await ensurePropertyAiConversation({
        userId: req.propertyAiUserId,
        propertyId,
        propertyTable: property.source_table,
      })
      const reusable = await findReusablePropertyAiReport({
        conversationId: conversation.id,
        category: request.category,
        question: request.question,
        model: PROPERTY_AI_REPORT_MODEL,
      })
      if (reusable) return res.status(200).json({ success: true, reused: true, data: reusable })

      const report = await createPropertyAiReport({
        conversationId: conversation.id,
        category: request.category,
        question: request.question,
        model: PROPERTY_AI_REPORT_MODEL,
      })
      await appendPropertyAiMessage({
        conversationId: conversation.id,
        reportId: report.id,
        role: 'user',
        content: request.question,
      })
      res.status(202).json({ success: true, reused: false, data: report })

      queueMicrotask(() => {
        runPropertyAiGeneration({
          reportId: report.id,
          conversationId: conversation.id,
          category: request.category,
          question: request.question,
          property,
        }).catch((error) => console.error(`[property-ai/report/${report.id}]`, error))
      })
    } catch (error) {
      const message = String(error?.message || error)
      const status = /категория|вопрос/i.test(message) ? 400 : 500
      console.error('[property-ai/reports]', error)
      res.status(status).json({ detail: status === 400 ? message : 'Не удалось запустить AI-анализ.' })
    }
  })

  router.get('/reports/:reportId', async (req, res) => {
    try {
      const reportId = positiveInt(req.params.reportId)
      if (!reportId) return res.status(400).json({ detail: 'Некорректный ID отчёта.' })
      const report = await getOwnedPropertyAiReport({ reportId, userId: req.propertyAiUserId })
      if (!report) return res.status(404).json({ detail: 'Отчёт не найден.' })
      res.json({ success: true, data: report })
    } catch (error) {
      console.error('[property-ai/report]', error)
      res.status(500).json({ detail: 'Не удалось получить статус отчёта.' })
    }
  })

  router.get('/reports/:reportId/pdf', async (req, res) => {
    try {
      const reportId = positiveInt(req.params.reportId)
      if (!reportId) return res.status(400).json({ detail: 'Некорректный ID отчёта.' })
      const report = await getOwnedPropertyAiReport({ reportId, userId: req.propertyAiUserId, includePdf: true })
      if (!report) return res.status(404).json({ detail: 'Отчёт не найден.' })
      if (report.status !== 'completed' || !report.pdfData) {
        return res.status(409).json({ detail: 'PDF ещё не готов.' })
      }
      const disposition = req.query.download === '1' ? 'attachment' : 'inline'
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `${disposition}; filename="property-ai-report-${report.id}.pdf"`)
      res.setHeader('Cache-Control', 'private, max-age=3600')
      res.send(Buffer.from(report.pdfData))
    } catch (error) {
      console.error('[property-ai/pdf]', error)
      res.status(500).json({ detail: 'Не удалось открыть PDF.' })
    }
  })

  app.use('/api/property-ai', router)
}
