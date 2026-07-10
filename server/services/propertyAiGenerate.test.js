import test from 'node:test'
import assert from 'node:assert/strict'

import { runPropertyAiGeneration } from './propertyAiGenerate.js'

test('moves a report through analysis, rendering, and completion', async () => {
  const updates = []
  const messages = []
  const result = await runPropertyAiGeneration({
    reportId: 7,
    conversationId: 3,
    category: 'risks',
    question: 'Какие плюсы и риски?',
    property: { id: 11, title: 'Квартира', images: ['/real.jpg'] },
  }, {
    requestModel: async () => JSON.stringify({
      shortAnswer: 'Короткий ответ по объекту.',
      title: 'Разбор квартиры',
      sections: [{ title: 'Главное', body: 'Факты', bullets: [] }],
    }),
    renderPdf: async () => Buffer.from('%PDF-test'),
    updateReport: async (_id, patch) => { updates.push(patch); return patch },
    appendMessage: async (message) => { messages.push(message) },
  })

  assert.deepEqual(updates.map((item) => item.status), ['analyzing', 'rendering', 'completed'])
  assert.equal(result.status, 'completed')
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
