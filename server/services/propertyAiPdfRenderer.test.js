import test from 'node:test'
import assert from 'node:assert/strict'

import {
  renderPropertyAiReportHtml,
  renderPropertyAiReportPdf,
  resolvePropertyAiPuppeteerOptions,
  waitForPropertyAiImages,
} from './propertyAiPdfRenderer.js'

const report = {
  title: '<script>alert(1)</script> Разбор',
  summary: 'Сильные стороны объекта',
  images: ['https://img.example/real.jpg'],
  neighborhood: {
    summary: 'Рядом есть инфраструктура для повседневных сценариев.',
    highlights: ['Школа — 320 м', 'Возможный вывод: удобно для семьи'],
    groups: [{ label: 'Образование', places: [{ name: 'Школа', distanceMeters: 320 }] }],
  },
  disclaimer: 'Не является финансовой консультацией.',
  pages: [
    { type: 'cover', title: 'Разбор', body: 'Главное' },
    { type: 'snapshot', title: 'Цифры', metrics: [{ label: 'Площадь', value: '39 м²' }] },
    { type: 'balance', title: 'Баланс', strengths: ['Свет'], risks: ['Документы'] },
    { type: 'answer', title: 'Ответ', body: 'Текст', bullets: ['Факт'] },
    { type: 'gallery', title: 'Реальные фотографии объекта', images: ['https://img.example/real.jpg'] },
    { type: 'details', title: 'Проверки', body: 'Текст', bullets: ['Проверка'] },
    { type: 'neighborhood', title: 'Район и инфраструктура' },
  ],
}

test('renders one controlled wrapper per report page', () => {
  const html = renderPropertyAiReportHtml({
    report,
    property: { title: 'Петровский парк', price: 26878012, area: 39, currency: 'RUB' },
    mediaBaseUrl: 'https://sell.example/',
  })

  assert.equal((html.match(/class="report-page/g) || []).length, 7)
  assert.match(html, /<base href="https:\/\/sell\.example\/">/)
  assert.match(html, /https:\/\/img\.example\/real\.jpg/)
  assert.match(html, /Не является финансовой консультацией/)
})

test('uses the warm editorial presentation system with real photos', () => {
  const html = renderPropertyAiReportHtml({ report, property: { title: 'Объект' } })

  assert.match(html, /--report-clay:#a45d3b/i)
  assert.match(html, /--report-ink:#171717/i)
  assert.match(html, /--report-paper:#fbfaf8/i)
  assert.match(html, /@page\{size:A4 landscape/i)
  assert.match(html, /width:297mm;height:210mm/i)
  assert.match(html, /class="cover-photo-frame"/)
  assert.match(html, /class="listing-gallery"/)
  assert.match(html, /class="infrastructure-grid"/)
  assert.match(html, /Школа[\s\S]*320 м/)
  assert.doesNotMatch(html, /report-page--visual/)
  assert.doesNotMatch(html, /report-page--conclusion/)
})

test('uses a clearly labelled generic illustration only when listing photos are absent', () => {
  const html = renderPropertyAiReportHtml({
    report: { ...report, images: [], pages: report.pages.filter((page) => page.type !== 'gallery') },
    property: { title: 'Объект без фотографий' },
  })

  assert.match(html, /images\/property-ai\/editorial-house-fallback\.png/)
  assert.match(html, /ИЛЛЮСТРАЦИЯ · НЕ ФОТО ОБЪЕКТА/)
})

test('uses dedicated compact layouts for long analysis and infrastructure content', () => {
  const html = renderPropertyAiReportHtml({ report, property: { title: 'Объект' } })

  assert.match(html, /class="details-layout"/)
  assert.match(html, /class="infrastructure-grid"/)
  assert.match(html, /\.details-layout\{[^}]*grid-template-columns/s)
})

test('waits for every image to load or fail before printing', async () => {
  let evaluationSource = ''
  await waitForPropertyAiImages({
    evaluate: async (callback) => { evaluationSource = String(callback) },
  })

  assert.match(evaluationSource, /document\.images/)
  assert.match(evaluationSource, /naturalWidth/)
  assert.match(evaluationSource, /error/)
  assert.match(String(renderPropertyAiReportPdf), /waitUntil:\s*'domcontentloaded'/)
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
