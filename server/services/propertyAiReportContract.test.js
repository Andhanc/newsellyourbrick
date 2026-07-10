import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizePropertyAiRequest,
  parsePropertyAiModelContent,
} from './propertyAiReportContract.js'

test('normalizes a predefined category into a Russian question', () => {
  assert.deepEqual(normalizePropertyAiRequest({ category: 'risks' }), {
    category: 'risks',
    question: 'Какие у этого объекта главные плюсы и риски?',
  })
})

test('requires a meaningful custom question', () => {
  assert.throws(
    () => normalizePropertyAiRequest({ category: 'custom', question: '  да  ' }),
    /не менее 5 символов/i,
  )
})

test('parses fenced JSON and normalizes it into six report pages', () => {
  const content = `\`\`\`json
  {
    "shortAnswer":"Объект выглядит интересно, но требует проверки документов.",
    "title":"Разбор объекта",
    "summary":"Краткое резюме",
    "strengths":["Светлая квартира"],
    "risks":["Нет данных о ремонте"],
    "metrics":[{"label":"Цена за м²","value":"250 000 ₽"}],
    "sections":[{"title":"Главное","body":"Факты объявления","bullets":["39 м²"]}],
    "conclusion":"Проверить документы до сделки",
    "assumptions":["Расчёты ориентировочные"]
  }
  \`\`\``

  const report = parsePropertyAiModelContent(content, {
    category: 'risks',
    question: 'Какие плюсы и риски?',
    property: { title: 'Петровский парк', images: ['https://img.example/home.jpg'] },
  })

  assert.equal(report.pages.length, 6)
  assert.equal(report.shortAnswer, 'Объект выглядит интересно, но требует проверки документов.')
  assert.equal(report.images[0], 'https://img.example/home.jpg')
  assert.match(report.disclaimer, /не является финансовой/i)
})

test('uses listing images only and removes unsafe URLs', () => {
  const report = parsePropertyAiModelContent(JSON.stringify({
    shortAnswer: 'Достаточно данных для предварительного вывода.',
    images: ['javascript:alert(1)', 'https://evil.example/fake.jpg'],
    sections: [],
  }), {
    category: 'details',
    question: 'Расскажите подробнее',
    property: {
      title: 'Объект',
      images: ['/images/real.jpg', 'data:image/png;base64,abc', 'javascript:bad'],
    },
  })

  assert.deepEqual(report.images, ['/images/real.jpg', 'data:image/png;base64,abc'])
})
