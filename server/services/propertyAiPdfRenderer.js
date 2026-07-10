import fs from 'node:fs'

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

function renderPage(page, index, report, property) {
  const image = report.images?.[index % Math.max(report.images?.length || 1, 1)] || ''
  const pageNo = index + 1
  const chrome = `<div class="page-chrome"><span>SELLYOURBRICK · НЕДВИЖИМОСТЬ AI</span><span>${pageNo}</span></div>`
  const photo = image ? `<img class="page-photo" src="${escapeHtml(image)}" alt="">` : '<div class="photo-placeholder">SYB<span>AI</span></div>'

  if (page.type === 'cover') {
    return `<section class="report-page report-page--cover">${photo}<div class="cover-shade"></div><div class="cover-copy"><div class="ai-pill">✦ НЕДВИЖИМОСТЬ AI</div><p>${escapeHtml(property.location || 'Персональный разбор объекта')}</p><h1>${escapeHtml(page.title || report.title)}</h1><div class="cover-facts"><span>${escapeHtml(money(property.price, property.currency))}</span>${property.area ? `<span>${escapeHtml(property.area)} м²</span>` : ''}${property.rooms ? `<span>${escapeHtml(property.rooms)} комн.</span>` : ''}</div></div>${chrome}</section>`
  }

  if (page.type === 'snapshot') {
    return `<section class="report-page"><div class="page-accent"></div>${chrome}<div class="page-head"><p>КЛЮЧЕВЫЕ ДАННЫЕ</p><h2>${escapeHtml(page.title)}</h2></div>${renderMetrics(page.metrics)}<div class="snapshot-bottom">${photo}<div><strong>${escapeHtml(property.title || property.name || 'Объект')}</strong><p>${escapeHtml(property.description || report.summary || '')}</p></div></div></section>`
  }

  if (page.type === 'balance') {
    return `<section class="report-page"><div class="page-accent"></div>${chrome}<div class="page-head"><p>ВЗВЕШЕННОЕ РЕШЕНИЕ</p><h2>${escapeHtml(page.title)}</h2></div><div class="balance-grid"><article class="good"><span>ПЛЮСЫ</span>${renderBullets(page.strengths)}</article><article class="risk"><span>РИСКИ</span>${renderBullets(page.risks)}</article></div><p class="note">Риски — это пункты для дополнительной проверки, а не утверждение о недостатках объекта.</p></section>`
  }

  return `<section class="report-page"><div class="page-accent"></div>${chrome}<div class="page-head"><p>${page.type === 'conclusion' ? 'ВЫВОД AI' : 'АНАЛИЗ ОБЪЕКТА'}</p><h2>${escapeHtml(page.title)}</h2></div><div class="editorial"><div><p class="lead">${escapeHtml(page.body || '')}</p>${renderBullets(page.bullets)}</div>${photo}</div>${page.type === 'conclusion' ? `<div class="disclaimer">${escapeHtml(report.disclaimer)}</div>` : ''}</section>`
}

export function renderPropertyAiReportHtml({ report, property = {} }) {
  const pages = Array.isArray(report?.pages) ? report.pages : []
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>${escapeHtml(report?.title || 'AI-отчёт')}</title>
<style>
@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#d9d9d9;color:#111;font-family:Arial,"Helvetica Neue",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.report-page{position:relative;width:210mm;height:297mm;padding:24mm 20mm 20mm;background:#f6f4f0;overflow:hidden;page-break-after:always}.report-page:last-child{page-break-after:auto}.page-accent{position:absolute;top:0;left:0;width:12mm;height:100%;background:#ffe000}.page-chrome{position:absolute;left:20mm;right:18mm;bottom:10mm;display:flex;justify-content:space-between;font-size:7pt;letter-spacing:.12em;color:#666}.page-head p{margin:0 0 5mm;font-size:8pt;font-weight:800;letter-spacing:.18em}.page-head h2{max-width:150mm;margin:0 0 16mm;font-size:30pt;line-height:1.02;letter-spacing:-.04em}.report-page--cover{padding:0;background:#050505;color:#fff}.report-page--cover .page-photo{position:absolute;width:100%;height:100%;object-fit:cover}.cover-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.94) 0%,rgba(0,0,0,.72) 52%,rgba(0,0,0,.2) 100%)}.cover-copy{position:absolute;left:18mm;right:26mm;bottom:38mm}.ai-pill{display:inline-block;margin-bottom:20mm;padding:4mm 7mm;border-radius:20mm;background:#ffe000;color:#111;font-size:10pt;font-weight:900}.cover-copy>p{font-size:10pt;letter-spacing:.12em;text-transform:uppercase}.cover-copy h1{max-width:155mm;margin:5mm 0 14mm;font-size:38pt;line-height:.98;letter-spacing:-.055em}.cover-facts{display:flex;gap:5mm;flex-wrap:wrap}.cover-facts span{padding:3mm 5mm;border:1px solid rgba(255,255,255,.35);border-radius:12mm;font-weight:700}.report-page--cover .page-chrome{color:#ddd}.metric-grid{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.metric{min-height:31mm;padding:7mm;border-radius:7mm;background:#fff;box-shadow:0 2mm 8mm rgba(0,0,0,.06)}.metric span,.metric small{display:block;color:#777;font-size:9pt}.metric strong{display:block;margin:3mm 0;font-size:19pt}.snapshot-bottom{display:grid;grid-template-columns:64mm 1fr;gap:8mm;align-items:center;margin-top:13mm;padding:7mm;border-radius:9mm;background:#111;color:#fff}.snapshot-bottom .page-photo,.editorial .page-photo{width:100%;height:52mm;object-fit:cover;border-radius:6mm}.snapshot-bottom strong{font-size:15pt}.snapshot-bottom p{font-size:9.5pt;line-height:1.5;color:#ccc}.balance-grid{display:grid;grid-template-columns:1fr 1fr;gap:7mm}.balance-grid article{min-height:125mm;padding:10mm;border-radius:9mm}.balance-grid span{font-size:9pt;font-weight:900;letter-spacing:.15em}.balance-grid ul{margin-top:9mm}.good{background:#111;color:#fff}.risk{background:#ffe000}.report-page ul{padding-left:6mm}.report-page li{margin:0 0 5mm;font-size:12pt;line-height:1.45}.note,.muted{color:#666;font-size:9pt;line-height:1.5}.editorial{display:grid;grid-template-columns:1.25fr .75fr;gap:10mm}.lead{margin:0 0 9mm;font-size:14pt;line-height:1.55}.editorial .page-photo{height:135mm}.photo-placeholder{display:flex;align-items:center;justify-content:center;flex-direction:column;width:100%;height:100%;background:linear-gradient(135deg,#111,#444);color:#fff;font-weight:900;font-size:24pt}.photo-placeholder span{color:#ffe000}.disclaimer{position:absolute;left:20mm;right:20mm;bottom:23mm;padding:5mm 7mm;border-radius:4mm;background:#eae7e1;color:#666;font-size:8pt;line-height:1.45}
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
      waitUntil: 'networkidle0',
      timeout: 20_000,
    })
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
