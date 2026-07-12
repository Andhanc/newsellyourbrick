import fs from 'node:fs'
import { propertyAiMediaBaseUrl } from './propertyAiImages.js'

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

const money = (value, currency = 'RUB') => {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return 'Цена по запросу'
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency', currency: String(currency || 'RUB').toUpperCase(), maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return new Intl.NumberFormat('ru-RU').format(amount)
  }
}

const renderBullets = (items = []) => items.length
  ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
  : ''

const renderMetrics = (metrics = []) => metrics.length
  ? `<div class="metric-grid">${metrics.map((metric) => `
      <div class="metric"><span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong>${metric.note ? `<small>${escapeHtml(metric.note)}</small>` : ''}</div>
    `).join('')}</div>`
  : '<p class="muted">В объявлении недостаточно данных для расчёта дополнительных показателей.</p>'

function reportPhoto(report, index = 0) {
  const images = Array.isArray(report.images) ? report.images : []
  return images[index % Math.max(images.length, 1)] || ''
}

const EDITORIAL_FALLBACK_IMAGE = '/images/property-ai/editorial-house-fallback.png'

function photoMarkup(image, className = 'page-photo') {
  return image
    ? `<img class="${className}" src="${escapeHtml(image)}" alt="" onerror="this.dataset.failed='true'">`
    : `<figure class="photo-placeholder"><img class="${className}" src="${EDITORIAL_FALLBACK_IMAGE}" alt="" onerror="this.dataset.failed='true'"><figcaption>ИЛЛЮСТРАЦИЯ · НЕ ФОТО ОБЪЕКТА</figcaption></figure>`
}

function renderPage(page, index, report, property) {
  const pageNo = index + 1
  const chrome = `<div class="page-chrome"><span>SELLYOURBRICK · НЕДВИЖИМОСТЬ AI</span><span>${pageNo}</span></div>`

  if (page.type === 'cover') {
    return `<section class="report-page report-page--cover"><div class="cover-copy"><p class="eyebrow">REAL ESTATE · AI REVIEW</p><h1>${escapeHtml(page.title || report.title)}</h1><p class="cover-location">${escapeHtml(property.location || 'Персональный разбор объекта')}</p><div class="cover-facts"><span>${escapeHtml(money(property.price, property.currency))}</span>${property.area ? `<span>${escapeHtml(property.area)} м²</span>` : ''}${property.rooms ? `<span>${escapeHtml(property.rooms)} комн.</span>` : ''}</div></div><div class="cover-photo-frame">${photoMarkup(reportPhoto(report, 0))}</div>${chrome}</section>`
  }

  if (page.type === 'snapshot') {
    return `<section class="report-page report-page--snapshot">${chrome}<div class="page-head"><p>КЛЮЧЕВЫЕ ДАННЫЕ</p><h2>${escapeHtml(page.title)}</h2></div><div class="snapshot-layout"><div>${renderMetrics(page.metrics)}<div class="snapshot-copy"><strong>${escapeHtml(property.title || property.name || 'Объект')}</strong><p>${escapeHtml(property.description || report.summary || '')}</p></div></div><div class="snapshot-photo">${photoMarkup(reportPhoto(report, 1))}</div></div></section>`
  }

  if (page.type === 'balance') {
    return `<section class="report-page report-page--balance">${chrome}<div class="page-head page-head--split"><div><p>ВЗВЕШЕННОЕ РЕШЕНИЕ</p><h2>${escapeHtml(page.title)}</h2></div><p class="page-intro">Сильные стороны и вопросы, которые стоит проверить перед следующим шагом.</p></div><div class="balance-grid"><article class="good"><span>01 · ПЛЮСЫ</span>${renderBullets(page.strengths)}</article><article class="risk"><span>02 · РИСКИ</span>${renderBullets(page.risks)}</article></div><p class="note">Риски — это пункты для дополнительной проверки, а не утверждение о недостатках объекта.</p></section>`
  }

  if (page.type === 'gallery') {
    const images = (Array.isArray(page.images) ? page.images : report.images || []).slice(0, 4)
    const gallery = images.map((image, photoIndex) => `<figure>${photoMarkup(image, 'gallery-photo')}<figcaption>РЕАЛЬНОЕ ФОТО · ${photoIndex + 1}</figcaption></figure>`).join('')
    return `<section class="report-page report-page--gallery">${chrome}<div class="page-head page-head--gallery"><p>ФОТОГРАФИИ ИЗ ОБЪЯВЛЕНИЯ</p><h2>${escapeHtml(page.title)}</h2></div><div class="listing-gallery">${gallery || photoMarkup('')}</div><p class="note">В галерее используются только изображения, прикреплённые к объявлению.</p></section>`
  }

  if (page.type === 'details') {
    return `<section class="report-page report-page--details">${chrome}<div class="page-head"><p>ПОДРОБНЫЙ АНАЛИЗ</p><h2>${escapeHtml(page.title)}</h2></div><div class="details-layout"><div class="details-copy"><p>${escapeHtml(page.body || '')}</p></div><aside class="details-checklist"><strong>ЧТО ПРОВЕРИТЬ</strong>${renderBullets(page.bullets)}</aside></div><p class="details-disclaimer">${escapeHtml(report.disclaimer)}</p></section>`
  }

  if (page.type === 'neighborhood') {
    const neighborhood = page.neighborhood || report.neighborhood || {}
    const groups = (Array.isArray(neighborhood.groups) ? neighborhood.groups : []).map((group) => {
      const places = (group.places || []).map((place) => `<li><strong>${escapeHtml(place.name)}</strong><span>${escapeHtml(place.distanceMeters)} м</span></li>`).join('')
      return `<article><h3>${escapeHtml(group.label)}</h3><ul>${places}</ul></article>`
    }).join('')
    const fallback = (neighborhood.highlights || []).slice(0, 6).map((item) => `<article class="infrastructure-note">${escapeHtml(item)}</article>`).join('')
    return `<section class="report-page report-page--neighborhood">${chrome}<div class="page-head page-head--split"><div><p>ПРОВЕРЕНО ПО КООРДИНАТАМ</p><h2>${escapeHtml(page.title)}</h2></div><p class="page-intro">${escapeHtml(neighborhood.summary || '')}</p></div><div class="infrastructure-grid">${groups || fallback}</div>${renderBullets((neighborhood.highlights || []).filter((item) => /^Возможный вывод:/i.test(item)).slice(0, 2))}<p class="note">${escapeHtml(neighborhood.sourceNote || '')}</p></section>`
  }

  const kicker = page.type === 'answer' ? 'ОТВЕТ НА ВАШ ВОПРОС' : 'ПОДРОБНЫЙ АНАЛИЗ'
  return `<section class="report-page report-page--${escapeHtml(page.type || 'analysis')}">${chrome}<div class="page-head"><p>${kicker}</p><h2>${escapeHtml(page.title)}</h2></div><div class="editorial"><div><p class="lead">${escapeHtml(page.body || '')}</p>${renderBullets(page.bullets)}</div><div class="editorial-photo">${photoMarkup(reportPhoto(report, index))}</div></div></section>`
}

function safeMediaBaseUrl(value) {
  try {
    const url = new URL(String(value || ''))
    return /^https?:$/.test(url.protocol) ? url.toString() : propertyAiMediaBaseUrl()
  } catch {
    return propertyAiMediaBaseUrl()
  }
}

const REPORT_STYLES = `
:root{--report-clay:#a45d3b;--report-clay-dark:#7f4028;--report-ink:#171717;--report-paper:#fbfaf8;--report-soft:#f1efeb;--report-muted:#77736e;--report-line:#dedad4}
@page{size:A4 landscape;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#e9e7e3;color:var(--report-ink);font-family:Arial,"Helvetica Neue",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.report-page{position:relative;width:297mm;height:210mm;padding:16mm 18mm 15mm;background:var(--report-paper);overflow:hidden;page-break-after:always}.report-page:last-child{page-break-after:auto}
.page-chrome{position:absolute;left:18mm;right:18mm;bottom:7mm;display:flex;justify-content:space-between;font-size:6.5pt;letter-spacing:.08em;color:var(--report-muted)}
.page-head>p,.page-head>div>p,.eyebrow{margin:0 0 3mm;color:var(--report-clay);font-size:7pt;font-weight:700;letter-spacing:.13em}.page-head h2{max-width:186mm;margin:0 0 8mm;font-size:31pt;font-weight:500;line-height:.98;letter-spacing:-.045em}.page-head--split{display:grid;grid-template-columns:1.1fr .9fr;gap:18mm;align-items:end}.page-head--split h2{margin-bottom:7mm}.page-intro{align-self:end;margin:0 0 8mm;max-width:110mm;color:var(--report-muted);font-size:9.5pt;line-height:1.45}
.report-page--cover{display:grid;grid-template-columns:1.03fr .97fr;gap:10mm;padding:18mm 18mm 15mm}.cover-copy{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:5mm 0 10mm 7mm}.cover-copy h1{max-width:142mm;margin:5mm 0 9mm;font-size:45pt;font-weight:500;line-height:.96;letter-spacing:-.065em}.cover-location{max-width:110mm;margin:0 0 8mm;color:var(--report-muted);font-size:10pt;line-height:1.4}.cover-facts{display:flex;gap:0;border-top:1px solid var(--report-line)}.cover-facts span{padding:4mm 7mm 0 0;margin-right:7mm;color:var(--report-ink);font-size:10pt}.cover-photo-frame{position:relative;height:168mm;overflow:hidden;background:var(--report-soft)}.cover-photo-frame>.page-photo,.cover-photo-frame>.photo-placeholder,.cover-photo-frame .page-photo{width:100%;height:100%;object-fit:cover}.cover-photo-frame:after{content:"";position:absolute;left:-1px;top:16mm;width:18mm;height:48mm;background:var(--report-paper)}
.snapshot-layout{display:grid;grid-template-columns:1.12fr .88fr;gap:10mm;height:137mm}.metric-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0;border-top:1px solid var(--report-line);border-left:1px solid var(--report-line)}.metric{min-height:33mm;padding:5mm;border-right:1px solid var(--report-line);border-bottom:1px solid var(--report-line);background:#fff}.metric span,.metric small{display:block;color:var(--report-muted);font-size:7.5pt}.metric strong{display:block;margin:3mm 0 1mm;font-size:18pt;font-weight:500}.snapshot-copy{display:grid;grid-template-columns:.75fr 1.25fr;gap:6mm;margin-top:6mm}.snapshot-copy strong{font-size:13pt;font-weight:500}.snapshot-copy p{margin:0;color:var(--report-muted);font-size:8.5pt;line-height:1.45}.snapshot-photo,.snapshot-photo>.page-photo,.snapshot-photo>.photo-placeholder,.snapshot-photo .page-photo{width:100%;height:100%;object-fit:cover}
.balance-grid{display:grid;grid-template-columns:1fr 1fr;gap:8mm}.balance-grid article{min-height:106mm;padding:8mm 9mm}.balance-grid span{font-size:7.5pt;font-weight:700;letter-spacing:.13em}.balance-grid ul{margin-top:7mm}.good{border:1px solid var(--report-line);background:#fff}.risk{background:var(--report-clay);color:#fff}.risk li::marker{color:#fff}
.report-page ul{padding-left:5mm}.report-page li{margin:0 0 3.3mm;font-size:9.3pt;line-height:1.35}.note,.muted{color:var(--report-muted);font-size:7.5pt;line-height:1.4}
.editorial{display:grid;grid-template-columns:1.08fr .92fr;gap:11mm;height:126mm}.editorial>div:first-child{display:flex;flex-direction:column;justify-content:flex-start;padding:8mm;background:var(--report-clay);color:#fff}.lead{white-space:pre-line;margin:0 0 6mm;font-size:12.5pt;line-height:1.45}.editorial-photo,.editorial-photo>.page-photo,.editorial-photo>.photo-placeholder,.editorial-photo .page-photo{width:100%;height:100%;object-fit:cover}
.page-head--gallery{position:absolute;z-index:2;left:18mm;top:16mm;width:78mm;padding:7mm;background:var(--report-paper)}.page-head--gallery h2{margin:0;font-size:27pt}.listing-gallery{display:grid;grid-template-columns:1.32fr .68fr .68fr;grid-template-rows:78mm 78mm;gap:4mm;height:160mm}.listing-gallery figure{position:relative;margin:0;overflow:hidden;background:var(--report-soft)}.listing-gallery figure:first-child{grid-row:1/3}.listing-gallery figure:nth-child(4){grid-column:2/4}.gallery-photo,.listing-gallery .photo-placeholder{width:100%;height:100%;object-fit:cover}.listing-gallery figcaption{position:absolute;left:3mm;bottom:3mm;padding:1.8mm 2.5mm;background:var(--report-clay);color:#fff;font-size:6.5pt;letter-spacing:.08em}.report-page--gallery>.note{position:absolute;right:18mm;bottom:7mm}
.details-layout{display:grid;grid-template-columns:1.25fr .75fr;gap:8mm;align-items:stretch;height:116mm}.details-copy{padding:8mm;border-top:1px solid var(--report-line);background:#fff}.details-copy p{white-space:pre-line;margin:0;font-size:10pt;line-height:1.42}.details-checklist{padding:8mm;background:var(--report-clay);color:#fff}.details-checklist>strong{font-size:7.5pt;letter-spacing:.13em}.details-checklist ul{margin:6mm 0 0}.details-checklist li{font-size:8.5pt}.details-disclaimer{margin:4mm 0 0;color:var(--report-muted);font-size:7pt;line-height:1.35}
.infrastructure-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-bottom:5mm}.infrastructure-grid article{overflow:hidden;border-top:1px solid var(--report-line);background:#fff}.infrastructure-grid h3{margin:0;padding:4mm 0 3mm;color:var(--report-clay);font-size:10pt}.infrastructure-grid ul{margin:0;padding:0;list-style:none}.infrastructure-grid li{display:flex;justify-content:space-between;gap:3mm;margin:0;padding:2.3mm 0;border-bottom:1px solid var(--report-line);font-size:8pt}.infrastructure-grid li span{flex:none;color:var(--report-clay);font-weight:700}.infrastructure-note{padding:4mm 0!important;color:var(--report-ink);font-size:9pt;line-height:1.4}.report-page--neighborhood>ul{margin:3mm 0}.report-page--neighborhood>ul li{font-size:8pt}
.photo-placeholder{position:relative;margin:0;background:var(--report-soft);overflow:hidden}.photo-placeholder figcaption{position:absolute;right:3mm;bottom:3mm;padding:1.8mm 2.5mm;background:rgba(251,250,248,.92);color:var(--report-clay-dark);font-size:6.3pt;font-weight:700;letter-spacing:.06em}img[data-failed="true"]{visibility:hidden}
`

export function renderPropertyAiReportHtml({ report, property = {}, mediaBaseUrl = propertyAiMediaBaseUrl() }) {
  const pages = Array.isArray(report?.pages) ? report.pages : []
  const baseUrl = safeMediaBaseUrl(mediaBaseUrl)
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><base href="${escapeHtml(baseUrl)}"><title>${escapeHtml(report?.title || 'AI-отчёт')}</title>
<style>
${REPORT_STYLES}
</style></head><body>${pages.map((page, index) => renderPage(page, index, report, property)).join('')}</body></html>`
}

export function resolvePropertyAiPuppeteerOptions({
  platform = process.platform,
  envPath = process.env.PUPPETEER_EXECUTABLE_PATH || '',
  exists = fs.existsSync,
} = {}) {
  const configured = String(envPath).trim()
  if (configured && exists(configured)) return { executablePath: configured }

  const candidates = platform === 'darwin'
    ? [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      ]
    : platform === 'linux'
      ? [
          '/usr/bin/google-chrome-stable',
          '/usr/bin/google-chrome',
          '/opt/google/chrome/chrome',
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium',
        ]
      : platform === 'win32'
        ? [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          ]
        : []
  const executablePath = candidates.find((candidate) => exists(candidate))
  return executablePath ? { executablePath } : {}
}

export async function waitForPropertyAiImages(page) {
  await page.evaluate(async () => {
    const images = [...document.images]
    await Promise.all(images.map((image) => {
      if (image.complete) return image.naturalWidth > 0 ? 'loaded' : 'error'
      return new Promise((resolve) => {
        const done = (status) => resolve(status)
        image.addEventListener('load', () => done('loaded'), { once: true })
        image.addEventListener('error', () => done('error'), { once: true })
        window.setTimeout(() => done('timeout'), 12_000)
      })
    }))
  })
}

export async function renderPropertyAiReportPdf({ report, property = {} }) {
  const { default: puppeteer } = await import('puppeteer')
  const browser = await puppeteer.launch({
    headless: true,
    ...resolvePropertyAiPuppeteerOptions(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(renderPropertyAiReportHtml({ report, property }), {
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    })
    await waitForPropertyAiImages(page)
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
