import express from 'express'
import { buildAssistantReply } from './askAssistant.js'
import { loadLiveCatalog, resolveAssistantCatalog } from './liveCatalog.js'
import { slimProperty } from './propertyMatcher.js'
import { prepareAssistantAttachments } from './fileAttachments.js'

/** @param {import('express').Express} app */
export function registerAssistantRoutes(app) {
  app.post('/api/ai/assistant-reply', express.json({ limit: '12mb' }), async (req, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {}
      const attachments = await prepareAssistantAttachments(body.attachments)
      const reply = await buildAssistantReply({
        messages: body.messages || body.history || [],
        preferences: body.preferences || {},
        selectedLanguage: body.selectedLanguage,
        detectedLanguage: body.detectedLanguage,
        attachments,
        assistantSessionId: body.assistantSessionId,
        userContext: body.userContext,
        properties: resolveAssistantCatalog(
          await loadLiveCatalog().catch((error) => {
            console.warn('[assistant] live catalog:', error?.message || error)
            return []
          }),
          (Array.isArray(body.properties) ? body.properties : []).map(slimProperty).filter(Boolean),
        ),
      })
      res.json(reply)
    } catch (error) {
      console.error('[api/ai/assistant-reply]', error)
      res.status(500).json({
        detail: String(error?.message || error),
        text: 'Не удалось получить ответ помощника. Попробуйте ещё раз или откройте аукционы на сайте.',
        buttons: null,
        needsMoreInfo: false,
        recommendations: null,
        navigation: [{ path: '/auction', label: 'Аукционы' }],
        actions: null,
        sources: null,
        languageSuggestion: null,
        yieldEstimate: null,
      })
    }
  })
}
