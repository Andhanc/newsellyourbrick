import express from 'express'
import { analyzeInvestorScenario } from './services/investorAiAnalysis.js'

const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS = 12
const requestWindows = new Map()

function investorAiRateLimit(req, res, next) {
  const key = String(req.ip || req.socket?.remoteAddress || 'unknown')
  const now = Date.now()
  const current = requestWindows.get(key)
  if (!current || now - current.startedAt >= WINDOW_MS) {
    requestWindows.set(key, { startedAt: now, count: 1 })
    return next()
  }
  current.count += 1
  if (current.count > MAX_REQUESTS) {
    res.setHeader('Retry-After', Math.ceil((WINDOW_MS - (now - current.startedAt)) / 1000))
    return res.status(429).json({
      success: false,
      detail: 'Слишком много AI-расчётов. Повторите немного позже.',
    })
  }
  return next()
}

/** @param {import('express').Express} app */
export function registerInvestorAiRoutes(app) {
  app.post('/api/investment/ai-analysis', investorAiRateLimit, express.json({ limit: '1mb' }), async (req, res) => {
    try {
      const analysis = await analyzeInvestorScenario(req.body || {})
      return res.json({ success: true, analysis })
    } catch (error) {
      console.error('[api/investment/ai-analysis]', error)
      return res.status(400).json({
        success: false,
        detail: String(error?.message || error),
      })
    }
  })
}
