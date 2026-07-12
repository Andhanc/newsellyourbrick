import test from 'node:test'
import assert from 'node:assert/strict'

import {
  PROPERTY_AI_REPORT_MODEL,
  requestPropertyAiModel,
  runPropertyAiGeneration,
} from './propertyAiGenerate.js'

test('versions generated reports so legacy cached PDFs are not reused', () => {
  assert.match(PROPERTY_AI_REPORT_MODEL, /property-ai-v4$/)
})

test('sends relative listing photos to the multimodal model as absolute URLs', async () => {
  let requestBody
  await requestPropertyAiModel({
    category: 'custom',
    question: 'Что важно знать?',
    property: { id: 3, title: 'Дом', images: ['/uploads/real.jpg'] },
  }, {
    apiKey: 'test-key',
    mediaBaseUrl: 'https://sell.example/',
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body)
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"shortAnswer":"Ответ"}' } }] }),
      }
    },
  })

  const userContent = requestBody.messages[1].content
  assert.equal(userContent[1].image_url.url, 'https://sell.example/uploads/real.jpg')
  assert.ok(requestBody.response_format.json_schema.schema.required.includes('directAnswer'))
  assert.ok(requestBody.response_format.json_schema.schema.required.includes('neighborhoodSummary'))
  assert.equal(requestBody.response_format.json_schema.schema.properties.strengths.minItems, 2)
  assert.equal(requestBody.response_format.json_schema.schema.properties.risks.minItems, 2)
})

test('moves a report through analysis, rendering, and completion', async () => {
  const updates = []
  const messages = []
  let modelProperty
  const result = await runPropertyAiGeneration({
    reportId: 7,
    conversationId: 3,
    category: 'risks',
    question: 'Какие плюсы и риски?',
    property: { id: 11, title: 'Квартира', images: ['/real.jpg'] },
  }, {
    loadNeighborhood: async (property) => ({ ...property, nearbyInfrastructure: [{ category: 'schools', places: [{ name: 'Школа', distanceMeters: 320 }] }] }),
    requestModel: async (request) => {
      modelProperty = request.property
      return JSON.stringify({
      shortAnswer: 'Короткий ответ по объекту.',
      title: 'Разбор квартиры',
      sections: [{ title: 'Главное', body: 'Факты', bullets: [] }],
      })
    },
    renderPdf: async () => Buffer.from('%PDF-test'),
    updateReport: async (_id, patch) => { updates.push(patch); return patch },
    appendMessage: async (message) => { messages.push(message) },
  })

  assert.deepEqual(updates.map((item) => item.status), ['analyzing', 'rendering', 'completed'])
  assert.equal(result.status, 'completed')
  assert.equal(modelProperty.nearbyInfrastructure[0].places[0].name, 'Школа')
  assert.equal(messages[0].role, 'assistant')
  assert.match(messages[0].content, /Короткий ответ/)
})

test('preserves the answer and report when PDF rendering fails', async () => {
  const updates = []
  await assert.rejects(() => runPropertyAiGeneration({
    reportId: 9,
    conversationId: 4,
    category: 'details',
    question: 'Подробный разбор',
    property: { id: 12, title: 'Дом', images: [] },
  }, {
    requestModel: async () => JSON.stringify({ shortAnswer: 'Ответ сохранён.', sections: [] }),
    renderPdf: async () => { throw new Error('Chrome failed') },
    updateReport: async (_id, patch) => { updates.push(patch); return patch },
    appendMessage: async () => {},
  }), /Chrome failed/)

  assert.equal(updates.at(-1).status, 'failed')
  assert.match(updates.at(-1).shortAnswer, /Ответ сохранён/)
  assert.ok(updates.at(-1).report)
})
