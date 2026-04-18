/**
 * Прокси к intelligence.io: ключ хранится в process.env на сервере (runtime),
 * а не в Vite-бандле — достаточно задать переменную в Railway и перезапустить сервер,
 * без обязательной пересборки фронта.
 */
import express from 'express'

const UPSTREAM = 'https://api.intelligence.io.solutions/api/v1/chat/completions'

export function normalizeIntelligenceIoKey(raw) {
  if (raw == null) return ''
  let s = String(raw).trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim()
  }
  if (s.toLowerCase().startsWith('bearer ')) s = s.slice(7).trim()
  s = s.replace(/\r\n/g, '').replace(/\n/g, '').replace(/\s/g, '')
  return s
}

export function getIntelligenceIoKeyFromEnv() {
  return normalizeIntelligenceIoKey(
    process.env.INTELLIGENCE_IO_API_KEY || process.env.VITE_INTELLIGENCE_IO_API_KEY || ''
  )
}

/** @param {import('express').Express} app */
export function registerIntelligenceIoProxy(app) {
  app.post('/api/ai/intelligence-chat', express.json({ limit: '4mb' }), async (req, res) => {
    const key = getIntelligenceIoKeyFromEnv()
    if (!key) {
      return res.status(503).json({
        detail:
          'Intelligence.io API key is not configured on the server. Set INTELLIGENCE_IO_API_KEY or VITE_INTELLIGENCE_IO_API_KEY in the server environment and restart.',
      })
    }
    try {
      const upstream = await fetch(UPSTREAM, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(req.body),
      })
      const text = await upstream.text()
      const ct = upstream.headers.get('content-type') || 'application/json; charset=utf-8'
      res.status(upstream.status).setHeader('Content-Type', ct).send(text)
    } catch (err) {
      console.error('[api/ai/intelligence-chat]', err)
      res.status(502).json({ detail: String(err?.message || err) })
    }
  })
}
