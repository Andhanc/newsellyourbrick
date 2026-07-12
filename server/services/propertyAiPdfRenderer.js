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

function photoMarkup(image, className = 'page-photo') {
  return image
    ? `<img class="${className}" src="${escapeHtml(image)}" alt="" onerror="this.dataset.failed='true'">`
    : '<div class="photo-placeholder">SYB<span>AI</span></div>'
}

function renderPage(page, index, report, property) {
  const pageNo = index + 1
  const chrome = `<div class="page-chrome"><span>SELLYOURBRICK · НЕДВИЖИМОСТЬ AI</span><span>${pageNo}</span></div>`

  if (page.type === 'cover') {
    return `<section class="report-page report-page--cover">${photoMarkup(reportPhoto(report, 0))}<div class="cover-shade"></div><div class="cover-copy"><div class="ai-pill">✦ НЕДВИЖИМОСТЬ AI</div><p>${escapeHtml(property.location || 'Персональный разбор объекта')}</p><h1>${escapeHtml(page.title || report.title)}</h1><div class="cover-facts"><span>${escapeHtml(money(property.price, property.currency))}</span>${property.area ? `<span>${escapeHtml(property.area)} м²</span>` : ''}${property.rooms ? `<span>${escapeHtml(property.rooms)} комн.</span>` : ''}</div></div>${chrome}</section>`
  }

  if (page.type === 'snapshot') {
    return `<section class="report-page report-page--snapshot"><div class="page-accent"></div>${chrome}<div class="page-head"><p>КЛЮЧЕВЫЕ ДАННЫЕ</p><h2>${escapeHtml(page.title)}</h2></div>${renderMetrics(page.metrics)}<div class="snapshot-bottom">${photoMarkup(reportPhoto(report, 1))}<div><strong>${escapeHtml(property.title || property.name || 'Объект')}</strong><p>${escapeHtml(property.description || report.summary || '')}</p></div></div></section>`
  }

  if (page.type === 'balance') {
    return `<section class="report-page"><div class="page-accent"></div>${chrome}<div class="page-head"><p>ВЗВЕШЕННОЕ РЕШЕНИЕ</p><h2>${escapeHtml(page.title)}</h2></div><div class="balance-grid"><article class="good"><span>ПЛЮСЫ</span>${renderBullets(page.strengths)}</article><article class="risk"><span>РИСКИ</span>${renderBullets(page.risks)}</article></div><p class="note">Риски — это пункты для дополнительной проверки, а не утверждение о недостатках объекта.</p></section>`
  }

  if (page.type === 'gallery') {
    const images = (Array.isArray(page.images) ? page.images : report.images || []).slice(0, 4)
    const gallery = images.map((image, photoIndex) => `<figure>${photoMarkup(image, 'gallery-photo')}<figcaption>РЕАЛЬНОЕ ФОТО · ${photoIndex + 1}</figcaption></figure>`).join('')
    return `<section class="report-page report-page--gallery"><div class="page-accent"></div>${chrome}<div class="page-head"><p>ФОТОГРАФИИ ИЗ ОБЪЯВЛЕНИЯ</p><h2>${escapeHtml(page.title)}</h2></div><div class="listing-gallery">${gallery || photoMarkup('')}</div><p class="note">В галерее используются только изображения, прикреплённые к объявлению.</p></section>`
  }

  if (page.type === 'details') {
    return `<section class="report-page report-page--details"><div class="page-accent"></div>${chrome}<div class="page-head"><p>ПОДРОБНЫЙ АНАЛИЗ</p><h2>${escapeHtml(page.title)}</h2></div><div class="details-layout"><div class="details-copy"><p>${escapeHtml(page.body || '')}</p></div><aside class="details-checklist"><strong>ЧТО ПРОВЕРИТЬ</strong>${renderBullets(page.bullets)}</aside></div><p class="details-disclaimer">${escapeHtml(report.disclaimer)}</p></section>`
  }

  if (page.type === 'neighborhood') {
    const neighborhood = page.neighborhood || report.neighborhood || {}
    const groups = (Array.isArray(neighborhood.groups) ? neighborhood.groups : []).map((group) => {
      const places = (group.places || []).map((place) => `<li><strong>${escapeHtml(place.name)}</strong><span>${escapeHtml(place.distanceMeters)} м</span></li>`).join('')
      return `<article><h3>${escapeHtml(group.label)}</h3><ul>${places}</ul></article>`
    }).join('')
    const fallback = (neighborhood.highlights || []).slice(0, 6).map((item) => `<article class="infrastructure-note">${escapeHtml(item)}</article>`).join('')
    return `<section class="report-page report-page--neighborhood"><div class="page-accent"></div>${chrome}<div class="page-head"><p>ПРОВЕРЕНО ПО КООРДИНАТАМ</p><h2>${escapeHtml(page.title)}</h2></div><p class="neighborhood-lead">${escapeHtml(neighborhood.summary || '')}</p><div class="infrastructure-grid">${groups || fallback}</div>${renderBullets((neighborhood.highlights || []).filter((item) => /^Возможный вывод:/i.test(item)).slice(0, 2))}<p class="note">${escapeHtml(neighborhood.sourceNote || '')}</p></section>`
  }

  const kicker = page.type === 'answer' ? 'ОТВЕТ НА ВАШ ВОПРОС' : 'ПОДРОБНЫЙ АНАЛИЗ'
  return `<section class="report-page report-page--${escapeHtml(page.type || 'analysis')}"><div class="page-accent"></div>${chrome}<div class="page-head"><p>${kicker}</p><h2>${escapeHtml(page.title)}</h2></div><div class="editorial"><div><p class="lead">${escapeHtml(page.body || '')}</p>${renderBullets(page.bullets)}</div>${photoMarkup(reportPhoto(report, index))}</div></section>`
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
:root{--report-tiffany:#0099a9;--report-ink:#0f172a;--report-tiffany-soft:#f0fafb;--report-surface:#ffffff;--report-muted:#64748b;--report-line:#e2e8f0}
@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#dbe4e7;color:var(--report-ink);font-family:Arial,"Helvetica Neue",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.report-page{position:relative;width:210mm;height:297mm;padding:22mm 18mm 18mm 24mm;background:var(--report-surface);overflow:hidden;page-break-after:always}.report-page:last-child{page-break-after:auto}
.page-accent{position:absolute;inset:0 auto 0 0;width:7mm;background:var(--report-tiffany)}.page-chrome{position:absolute;left:24mm;right:18mm;bottom:9mm;display:flex;justify-content:space-between;font-size:7pt;font-weight:700;letter-spacing:.12em;color:var(--report-muted)}
.page-head p{margin:0 0 4mm;color:var(--report-tiffany);font-size:8pt;font-weight:900;letter-spacing:.17em}.page-head h2{max-width:158mm;margin:0 0 12mm;font-size:29pt;line-height:1.04;letter-spacing:-.04em}
.report-page--cover{padding:0;background:var(--report-ink);color:#fff}.report-page--cover .page-photo,.report-page--cover>.photo-placeholder{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.cover-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(15,23,42,.96) 0%,rgba(15,23,42,.76) 50%,rgba(0,153,169,.2) 100%)}.cover-copy{position:absolute;left:18mm;right:24mm;bottom:35mm}.ai-pill{display:inline-block;margin-bottom:17mm;padding:4mm 7mm;border-radius:20mm;background:var(--report-tiffany);color:#fff;font-size:10pt;font-weight:900}.cover-copy>p{font-size:10pt;letter-spacing:.12em;text-transform:uppercase}.cover-copy h1{max-width:160mm;margin:5mm 0 13mm;font-size:38pt;line-height:.98;letter-spacing:-.055em}.cover-facts{display:flex;gap:4mm;flex-wrap:wrap}.cover-facts span{padding:3mm 5mm;border:1px solid rgba(255,255,255,.4);border-radius:12mm;font-weight:700}.report-page--cover .page-chrome{color:#dbe4e7}
.metric-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.metric{min-height:27mm;padding:6mm;border:1px solid var(--report-line);border-radius:6mm;background:var(--report-tiffany-soft)}.metric span,.metric small{display:block;color:var(--report-muted);font-size:8.5pt}.metric strong{display:block;margin:2.5mm 0;color:var(--report-ink);font-size:18pt}.snapshot-bottom{display:grid;grid-template-columns:62mm 1fr;gap:7mm;align-items:center;margin-top:10mm;padding:6mm;border-radius:7mm;background:var(--report-ink);color:#fff}.snapshot-bottom .page-photo,.snapshot-bottom>.photo-placeholder{width:100%;height:47mm;object-fit:cover;border-radius:5mm}.snapshot-bottom strong{font-size:15pt}.snapshot-bottom p{font-size:9pt;line-height:1.5;color:#cbd5e1}
.balance-grid{display:grid;grid-template-columns:1fr 1fr;gap:6mm}.balance-grid article{min-height:158mm;padding:8mm;border-radius:8mm}.balance-grid span{font-size:9pt;font-weight:900;letter-spacing:.15em}.balance-grid ul{margin-top:8mm}.good{background:var(--report-ink);color:#fff}.risk{background:var(--report-tiffany);color:#fff}
.report-page ul{padding-left:5mm}.report-page li{margin:0 0 4mm;font-size:10.5pt;line-height:1.42}.note,.muted{color:var(--report-muted);font-size:8.5pt;line-height:1.5}
.editorial{display:grid;grid-template-columns:1.18fr .82fr;gap:8mm}.lead{white-space:pre-line;margin:0 0 7mm;font-size:13pt;line-height:1.55}.editorial .page-photo,.editorial>.photo-placeholder{width:100%;height:138mm;object-fit:cover;border-radius:7mm}.report-page--answer .editorial>div:first-child{padding:9mm;border-radius:8mm;background:var(--report-tiffany-soft)}
.listing-gallery{display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:79mm;gap:5mm}.listing-gallery figure{position:relative;margin:0;overflow:hidden;border-radius:7mm;background:var(--report-tiffany-soft)}.gallery-photo,.listing-gallery .photo-placeholder{width:100%;height:100%;object-fit:cover}.listing-gallery figcaption{position:absolute;left:4mm;bottom:4mm;padding:2mm 3mm;border-radius:10mm;background:rgba(15,23,42,.82);color:#fff;font-size:7pt;font-weight:800;letter-spacing:.09em}
.details-layout{display:grid;grid-template-columns:1.25fr .75fr;gap:7mm;align-items:start}.details-copy{padding:7mm;border:1px solid var(--report-line);border-radius:7mm;background:var(--report-tiffany-soft)}.details-copy p{white-space:pre-line;margin:0;font-size:10.5pt;line-height:1.45}.details-checklist{padding:6mm;border-radius:7mm;background:var(--report-ink);color:#fff}.details-checklist>strong{font-size:8pt;letter-spacing:.14em}.details-checklist ul{margin:6mm 0 0}.details-checklist li{font-size:9pt;line-height:1.4}.details-disclaimer{margin:7mm 0 0;padding-top:4mm;border-top:1px solid var(--report-line);color:var(--report-muted);font-size:7.5pt;line-height:1.4}
.report-page--details .page-head,.report-page--neighborhood .page-head{margin-bottom:0}.report-page--details .page-head h2,.report-page--neighborhood .page-head h2{margin-bottom:8mm}.neighborhood-lead{max-width:160mm;margin:0 0 5mm;font-size:10.5pt;line-height:1.45}.infrastructure-grid{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-bottom:5mm}.infrastructure-grid article{overflow:hidden;border:1px solid var(--report-line);border-radius:5mm;background:var(--report-tiffany-soft)}.infrastructure-grid h3{margin:0;padding:3mm 4mm;background:var(--report-tiffany);color:#fff;font-size:9.5pt}.infrastructure-grid ul{margin:0;padding:2.5mm 4mm;list-style:none}.infrastructure-grid li{display:flex;justify-content:space-between;gap:3mm;margin:0;padding:1.5mm 0;border-bottom:1px solid var(--report-line);font-size:8pt}.infrastructure-grid li:last-child{border-bottom:0}.infrastructure-grid li span{flex:none;color:var(--report-tiffany);font-weight:800}.infrastructure-note{padding:4mm!important;color:var(--report-ink);font-size:9pt;line-height:1.4}.report-page--neighborhood>ul{margin:4mm 0}.report-page--neighborhood>ul li{margin-bottom:2mm;font-size:8.5pt}
.photo-placeholder{display:flex;align-items:center;justify-content:center;flex-direction:column;background:linear-gradient(145deg,var(--report-ink),#1e3a46);color:#fff;font-weight:900;font-size:24pt}.photo-placeholder span{color:var(--report-tiffany)}img[data-failed="true"]{visibility:hidden}.disclaimer{position:absolute;left:24mm;right:18mm;bottom:18mm;padding:5mm 7mm;border-radius:4mm;background:var(--report-tiffany-soft);color:var(--report-muted);font-size:8pt;line-height:1.45}
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
