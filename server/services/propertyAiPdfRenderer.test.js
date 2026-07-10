import test from 'node:test'
import assert from 'node:assert/strict'

import {
  renderPropertyAiReportHtml,
  resolvePropertyAiPuppeteerOptions,
} from './propertyAiPdfRenderer.js'

const report = {
  title: '<script>alert(1)</script> Разбор',
  summary: 'Сильные стороны объекта',
  images: ['https://img.example/real.jpg'],
  disclaimer: 'Не является финансовой консультацией.',
  pages: [
    { type: 'cover', title: 'Разбор', body: 'Главное' },
    { type: 'snapshot', title: 'Цифры', metrics: [{ label: 'Площадь', value: '39 м²' }] },
    { type: 'balance', title: 'Баланс', strengths: ['Свет'], risks: ['Документы'] },
    { type: 'analysis', title: 'Анализ', body: 'Текст', bullets: ['Факт'] },
    { type: 'details', title: 'Проверки', body: 'Текст', bullets: ['Проверка'] },
    { type: 'conclusion', title: 'Итог', body: 'Проверить', bullets: [] },
  ],
}

test('renders one controlled wrapper per report page', () => {
  const html = renderPropertyAiReportHtml({
    report,
    property: { title: 'Петровский парк', price: 26878012, area: 39, currency: 'RUB' },
  })

  assert.equal((html.match(/class="report-page/g) || []).length, 6)
  assert.match(html, /https:\/\/img\.example\/real\.jpg/)
  assert.match(html, /Не является финансовой консультацией/)
})

test('escapes model content and never renders scripts', () => {
  const html = renderPropertyAiReportHtml({ report, property: { title: 'Объект' } })

  assert.doesNotMatch(html, /<script>/i)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
})

test('uses an installed system Chrome when the Puppeteer cache is empty', () => {
  const options = resolvePropertyAiPuppeteerOptions({
    platform: 'darwin',
    envPath: '',
    exists: (path) => path === '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  })

  assert.equal(options.executablePath, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
})
