import test from 'node:test'
import assert from 'node:assert/strict'

import {
  PROPERTY_AI_PDF_TEMPLATE_VERSION,
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
  slides: [
    { layout: 'cover', kicker: 'AI-РАЗБОР', title: 'Разбор', body: 'Главное', imageIndices: [0] },
    { layout: 'stats', kicker: 'ЦИФРЫ', title: 'Паспорт объекта', cards: [{ title: 'Площадь', value: '39 м²', body: 'По объявлению', icon: 'area', tone: 'tiffany' }], imageIndices: [0] },
    { layout: 'comparison', kicker: 'БАЛАНС', title: 'Плюсы и риски', cards: [{ title: 'Сильные стороны', body: 'Свет', icon: 'check', tone: 'cream' }, { title: 'Проверить', body: 'Документы', icon: 'shield', tone: 'ink' }] },
    { layout: 'photo_statement', kicker: 'ОТВЕТ', title: 'Ответ', body: 'Текст', imageIndices: [0] },
    { layout: 'gallery', kicker: 'ФОТО', title: 'Реальные фотографии объекта', imageIndices: [0] },
    { layout: 'split', kicker: 'АНАЛИЗ', title: 'Проверки', body: 'Текст', bullets: ['Проверка'], imageIndices: [0] },
    { layout: 'chart', kicker: 'ДАННЫЕ', title: 'Сравнение площадей', body: 'Только заявленные параметры', chart: { type: 'bar', title: 'Площади', unit: 'м²', caption: 'Данные объявления', labels: ['Кухня', 'Гостиная'], series: [{ name: 'Площадь', values: [12, 21] }] } },
    { layout: 'neighborhood', kicker: 'РАЙОН', title: 'Район и инфраструктура', cards: [] },
    { layout: 'conclusion', kicker: 'ИТОГ', title: 'Решение начинается с проверки фактов', body: 'Итог', bullets: ['Шаг'], imageIndices: [0] },
  ],
}

test('renders one controlled wrapper per report page', () => {
  const html = renderPropertyAiReportHtml({
    report,
    property: { title: 'Петровский парк', price: 26878012, area: 39, currency: 'RUB' },
    mediaBaseUrl: 'https://sell.example/',
  })

  assert.equal((html.match(/class="report-page/g) || []).length, 9)
  assert.match(html, /<base href="https:\/\/sell\.example\/">/)
  assert.match(html, /https:\/\/img\.example\/real\.jpg/)
  assert.match(html, /Не является финансовой консультацией/)
})

test('uses the premium Tiffany presentation system with real photos', () => {
  const html = renderPropertyAiReportHtml({ report, property: { title: 'Объект' } })

  assert.equal(PROPERTY_AI_PDF_TEMPLATE_VERSION, 'tiffany-canva-ai-v3')
  assert.match(html, /--report-tiffany:#4ecdd6/i)
  assert.match(html, /--report-paper:#f5f0e8/i)
  assert.match(html, /--report-tiffany-soft:#e9f8f7/i)
  assert.match(html, /--report-ink:#12343b/i)
  assert.match(html, /@page\{size:A4 landscape/i)
  assert.match(html, /width:297mm;height:210mm/i)
  assert.match(html, /class="cover-title-card"/)
  assert.match(html, /class="card-grid card-grid--stats/)
  assert.match(html, /class="line-icon"/)
  assert.match(html, /class="gallery-grid"/)
  assert.match(html, /class="chart-shell"/)
  assert.match(html, /class="chart-svg"/)
  assert.match(html, /class="card-grid card-grid--neighborhood/)
  assert.match(html, /class="report-page report-page--conclusion"/)
  assert.match(html, /Школа/)
  assert.match(html, /320 м/)
  assert.doesNotMatch(html, /--report-clay/)
})

test('uses a clearly labelled generic illustration only when listing photos are absent', () => {
  const html = renderPropertyAiReportHtml({
    report: { ...report, images: [], slides: report.slides.filter((slide) => slide.layout !== 'gallery') },
    property: { title: 'Объект без фотографий' },
  })

  assert.match(html, /images\/property-ai\/editorial-house-fallback\.png/)
  assert.match(html, /ИЛЛЮСТРАЦИЯ · НЕ ФОТО ОБЪЕКТА/)
})

test('uses dedicated layouts for AI-authored analysis, chart, and infrastructure slides', () => {
  const html = renderPropertyAiReportHtml({ report, property: { title: 'Объект' } })

  assert.match(html, /class="split-layout"/)
  assert.match(html, /class="chart-layout"/)
  assert.match(html, /class="card-grid card-grid--neighborhood/)
  assert.match(html, /\.split-layout\{[^}]*grid-template-columns/s)
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
