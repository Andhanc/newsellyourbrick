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

test('parses fenced JSON into a compact seven-page report', () => {
  const content = `\`\`\`json
  {
    "directAnswer":"Объект выглядит интересно, но требует проверки документов.",
    "shortAnswer":"Объект выглядит интересно, но требует проверки документов.",
    "title":"Разбор объекта",
    "summary":"Краткое резюме",
    "strengths":["Светлая квартира"],
    "risks":["Нет данных о ремонте"],
    "metrics":[{"label":"Цена за м²","value":"250 000 ₽"}],
    "sections":[{"title":"Главное","body":"Факты объявления","bullets":["39 м²"]}],
    "conclusion":"Проверить документы до сделки",
    "assumptions":["Расчёты ориентировочные"],
    "visualPrompt":"premium isometric 3D apartment interior",
    "neighborhoodSummary":"Рядом есть базовая инфраструктура.",
    "infrastructureHighlights":["Школа — 320 м","Возможный вывод: удобно для семьи"]
  }
  \`\`\``

  const report = parsePropertyAiModelContent(content, {
    category: 'risks',
    question: 'Какие плюсы и риски?',
    property: {
      title: 'Петровский парк', area: 39, rooms: 2, price: 26878012,
      images: ['https://img.example/home.jpg'],
      nearbyInfrastructure: [{ category: 'schools', label: 'Образование', places: [{ name: 'Школа', distanceMeters: 320 }] }],
    },
  })

  assert.equal(report.pages.length, 7)
  assert.equal(report.shortAnswer, 'Объект выглядит интересно, но требует проверки документов.')
  assert.equal(report.images[0], 'https://img.example/home.jpg')
  assert.ok(report.pages.some((page) => page.type === 'answer'))
  assert.ok(report.pages.some((page) => page.type === 'gallery'))
  assert.ok(!report.pages.some((page) => page.type === 'visual'))
  assert.ok(!report.pages.some((page) => page.type === 'conclusion'))
  assert.ok(report.pages.some((page) => page.type === 'neighborhood'))
  assert.match(report.disclaimer, /не является финансовой/i)
})

test('fills sparse reports with factual strengths, checks, metrics, and a direct answer', () => {
  const report = parsePropertyAiModelContent(JSON.stringify({
    shortAnswer: 'Предварительный ответ по данным объявления.',
    sections: [],
  }), {
    category: 'custom',
    question: 'Подойдёт ли объект семье?',
    property: {
      title: 'Семейная квартира',
      area: 82,
      rooms: 3,
      location: 'Минск',
      year_built: 2021,
      price: 175000,
      currency: 'USD',
      images: ['/uploads/one.jpg', '/uploads/two.jpg'],
      nearbyInfrastructure: [{ category: 'transport', label: 'Транспорт', places: [{ name: 'Остановка', distanceMeters: 180 }] }],
    },
  })

  assert.match(report.directAnswer, /Предварительный ответ/)
  assert.ok(report.strengths.length >= 2)
  assert.ok(report.risks.length >= 2)
  assert.ok(report.metrics.length >= 4)
  assert.equal(report.pages.length, 7)
  assert.ok(report.pages.some((page) => page.type === 'gallery'))
  assert.ok(!report.pages.some((page) => page.type === 'visual'))
  assert.ok(!report.pages.some((page) => page.type === 'conclusion'))
  assert.ok(report.pages.some((page) => page.type === 'neighborhood'))
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
