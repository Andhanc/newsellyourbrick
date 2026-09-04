import fs from 'node:fs'
import { propertyAiMediaBaseUrl } from './propertyAiImages.js'

export const PROPERTY_AI_PDF_TEMPLATE_VERSION = 'tiffany-canva-ai-v3'

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

const textWithBreaks = (value) => escapeHtml(value).replace(/\n+/g, '<br>')
const renderBullets = (items = []) => items.length
  ? `<ul class="slide-bullets">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
  : ''

const brandLockup = (modifier = '') => `<div class="brand-lockup${modifier ? ` brand-lockup--${modifier}` : ''}" aria-label="SellYourBrick"><span>Sell</span><b>Your</b><span>Brick</span></div>`

const ICON_PATHS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V21h13V10.5"/><path d="M9.5 21v-6h5v6"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8m-3 3 2 2m-5 1 2 2"/>',
  area: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><path d="m8 16 8-8"/>',
  rooms: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M3 12h9"/>',
  location: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  price: '<path d="M12 2v20M17 6.5c-1-1-2.5-1.5-4.5-1.5-2.8 0-4.5 1.2-4.5 3s1.7 2.6 4.5 3.1S17 12.4 17 15s-2 4-5 4c-2.1 0-3.8-.6-5-1.8"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.7 2.7L16.5 9"/>',
  alert: '<path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5m0 3h.01"/>',
  shield: '<path d="M12 3 5 6v5c0 4.8 2.8 8.1 7 10 4.2-1.9 7-5.2 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  trend: '<path d="M3 17 9 11l4 4 8-9"/><path d="M15 6h6v6"/>',
  school: '<path d="m3 10 9-6 9 6-9 6-9-6Z"/><path d="M7 13v5c3 2 7 2 10 0v-5M21 10v6"/>',
  transport: '<rect x="5" y="3" width="14" height="16" rx="3"/><path d="M8 19v2m8-2v2M5 11h14M9 7h6"/><circle cx="9" cy="15" r="1"/><circle cx="15" cy="15" r="1"/>',
  store: '<path d="M4 10v10h16V10M3 10l2-6h14l2 6"/><path d="M3 10c1 2 3 2 4 0 1 2 3 2 5 0 1 2 3 2 5 0 1 2 3 2 4 0M9 20v-6h6v6"/>',
  medical: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/>',
  tree: '<path d="M12 21v-7M8 21h8"/><path d="M12 3 6 12h12L12 3Z"/><path d="m12 7-7 9h14l-7-9Z"/>',
  document: '<path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h5M9 12h6m-6 4h6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  building: '<path d="M4 21V6l8-3 8 3v15M2 21h20"/><path d="M8 8h2m4 0h2m-8 4h2m4 0h2m-8 4h2m4 0h2"/>',
  camera: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="m8 6 1.5-3h5L16 6"/><circle cx="12" cy="13" r="4"/>',
  spark: '<path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z"/><path d="m19 17 .6 2.4L22 20l-2.4.6L19 23l-.6-2.4L16 20l2.4-.6L19 17Z"/>',
}

function renderIcon(name = 'spark') {
  const path = ICON_PATHS[name] || ICON_PATHS.spark
  return `<svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`
}

const EDITORIAL_FALLBACK_IMAGE = '/images/property-ai/editorial-house-fallback.png'

function photoMarkup(image, className = 'page-photo', label = '') {
  const imageMarkup = image
    ? `<img class="${className}" src="${escapeHtml(image)}" alt="" onerror="this.dataset.failed='true'">`
    : `<img class="${className}" src="${EDITORIAL_FALLBACK_IMAGE}" alt="" onerror="this.dataset.failed='true'">`
  return `<figure class="photo-frame${image ? '' : ' photo-frame--fallback'}">${imageMarkup}${label ? `<figcaption>${escapeHtml(label)}</figcaption>` : ''}${image ? '' : '<span>ИЛЛЮСТРАЦИЯ · НЕ ФОТО ОБЪЕКТА</span>'}</figure>`
}

function reportPhoto(report, index = 0) {
  const images = Array.isArray(report.images) ? report.images : []
  return images.length ? images[index % images.length] : ''
}

function slideImages(slide, report, fallbackIndex = 0) {
  const images = Array.isArray(report.images) ? report.images : []
  const selected = (Array.isArray(slide.imageIndices) ? slide.imageIndices : [])
    .map((index) => images[index])
    .filter(Boolean)
  return selected.length ? selected : (images.length ? [reportPhoto(report, fallbackIndex)] : [])
}

function renderCards(cards = [], modifier = '') {
  if (!cards.length) return ''
  return `<div class="card-grid${modifier ? ` card-grid--${modifier}` : ''} card-grid--count-${Math.min(cards.length, 4)}">${cards.map((card, index) => `
    <article class="info-card info-card--${escapeHtml(card.tone || (index === 0 ? 'tiffany' : 'cream'))}">
      <div class="info-card__top">${renderIcon(card.icon)}<span>${String(index + 1).padStart(2, '0')}</span></div>
      ${card.value ? `<strong class="info-card__value">${escapeHtml(card.value)}</strong>` : ''}
      <h3>${escapeHtml(card.title)}</h3>
      ${card.body ? `<p>${textWithBreaks(card.body)}</p>` : ''}
    </article>`).join('')}</div>`
}

function renderChart(chart = {}) {
  const labels = Array.isArray(chart.labels) ? chart.labels.slice(0, 6) : []
  const series = (Array.isArray(chart.series) ? chart.series : [])
    .map((item) => ({ name: item.name || '', values: (item.values || []).map(Number).filter(Number.isFinite).slice(0, labels.length) }))
    .filter((item) => item.values.length)
  if (chart.type === 'none' || !labels.length || !series.length) return ''
  const colors = ['#31c7cf', '#12343b', '#e5a77a']
  const values = series.flatMap((item) => item.values)
  const min = Math.min(0, ...values)
  const max = Math.max(1, ...values)
  const range = Math.max(1, max - min)
  const y = (value) => 250 - ((value - min) / range) * 190
  const baseline = y(0)
  let marks = ''

  if (chart.type === 'bar') {
    const groupWidth = 500 / labels.length
    const barWidth = Math.min(34, (groupWidth - 18) / series.length)
    marks = series.map((item, seriesIndex) => item.values.map((value, valueIndex) => {
      const x = 78 + valueIndex * groupWidth + 9 + seriesIndex * barWidth
      const valueY = y(value)
      return `<rect x="${x.toFixed(1)}" y="${Math.min(valueY, baseline).toFixed(1)}" width="${Math.max(8, barWidth - 4).toFixed(1)}" height="${Math.max(2, Math.abs(baseline - valueY)).toFixed(1)}" rx="5" fill="${colors[seriesIndex]}"/><text x="${(x + (barWidth - 4) / 2).toFixed(1)}" y="${(Math.min(valueY, baseline) - 8).toFixed(1)}" text-anchor="middle" class="chart-value">${escapeHtml(value)}</text>`
    }).join('')).join('')
  } else if (chart.type === 'line') {
    marks = series.map((item, seriesIndex) => {
      const points = item.values.map((value, valueIndex) => `${(85 + valueIndex * (485 / Math.max(1, labels.length - 1))).toFixed(1)},${y(value).toFixed(1)}`).join(' ')
      const dots = item.values.map((value, valueIndex) => `<circle cx="${(85 + valueIndex * (485 / Math.max(1, labels.length - 1))).toFixed(1)}" cy="${y(value).toFixed(1)}" r="5" fill="#fff" stroke="${colors[seriesIndex]}" stroke-width="4"/>`).join('')
      return `<polyline points="${points}" fill="none" stroke="${colors[seriesIndex]}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>${dots}`
    }).join('')
  } else if (chart.type === 'donut') {
    const donutValues = series[0].values.map((value) => Math.max(0, value))
    const total = donutValues.reduce((sum, value) => sum + value, 0) || 1
    let offset = 0
    const circles = donutValues.map((value, index) => {
      const length = (value / total) * 603.19
      const circle = `<circle cx="220" cy="150" r="96" fill="none" stroke="${colors[index % colors.length]}" stroke-width="36" stroke-dasharray="${length.toFixed(2)} ${(603.19 - length).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"/>`
      offset += length
      return circle
    }).join('')
    const legend = labels.map((label, index) => `<g transform="translate(390 ${80 + index * 50})"><circle cx="0" cy="0" r="7" fill="${colors[index % colors.length]}"/><text x="20" y="5" class="chart-label">${escapeHtml(label)}</text><text x="170" y="5" text-anchor="end" class="chart-legend-value">${escapeHtml(donutValues[index] ?? '')}${escapeHtml(chart.unit || '')}</text></g>`).join('')
    return `<div class="chart-shell"><div class="chart-heading"><strong>${escapeHtml(chart.title)}</strong><span>${escapeHtml(chart.unit)}</span></div><svg class="chart-svg" viewBox="0 0 640 320" role="img"><g transform="rotate(-90 220 150)">${circles}</g><text x="220" y="144" text-anchor="middle" class="chart-total">${escapeHtml(total)}</text><text x="220" y="169" text-anchor="middle" class="chart-label">ВСЕГО</text>${legend}</svg>${chart.caption ? `<p class="chart-caption">${escapeHtml(chart.caption)}</p>` : ''}</div>`
  }

  const grid = [60, 105, 150, 195, 240].map((gridY) => `<line x1="70" x2="590" y1="${gridY}" y2="${gridY}" class="chart-grid-line"/>`).join('')
  const labelX = (index) => chart.type === 'bar'
    ? 78 + index * (500 / labels.length) + (500 / labels.length) / 2
    : 85 + index * (485 / Math.max(1, labels.length - 1))
  const axisLabels = labels.map((label, index) => `<text x="${labelX(index).toFixed(1)}" y="286" text-anchor="middle" class="chart-label">${escapeHtml(label)}</text>`).join('')
  const legend = series.map((item, index) => `<span><i style="background:${colors[index]}"></i>${escapeHtml(item.name)}</span>`).join('')
  return `<div class="chart-shell"><div class="chart-heading"><strong>${escapeHtml(chart.title)}</strong><span>${escapeHtml(chart.unit)}</span></div><svg class="chart-svg" viewBox="0 0 640 320" role="img">${grid}<line x1="70" x2="590" y1="${baseline.toFixed(1)}" y2="${baseline.toFixed(1)}" class="chart-axis"/>${marks}${axisLabels}</svg><div class="chart-legend">${legend}</div>${chart.caption ? `<p class="chart-caption">${escapeHtml(chart.caption)}</p>` : ''}</div>`
}

function legacySlide(page = {}) {
  if (page.layout) return page
  if (page.type === 'snapshot') return { ...page, layout: 'stats', cards: (page.metrics || []).slice(0, 4).map((metric) => ({ ...metric, title: metric.label, body: metric.note, icon: 'home', tone: 'cream' })) }
  if (page.type === 'balance') return { ...page, layout: 'comparison', cards: [
    { title: 'Сильные стороны', body: (page.strengths || []).join('\n'), icon: 'check', tone: 'cream' },
    { title: 'Нужно проверить', body: (page.risks || []).join('\n'), icon: 'shield', tone: 'ink' },
  ] }
  if (page.type === 'answer') return { ...page, layout: 'photo_statement' }
  if (page.type === 'details') return { ...page, layout: 'split' }
  return { ...page, layout: page.type || 'split' }
}

function slideChrome(index, total, label = '') {
  return `<div class="slide-chrome">${brandLockup('chrome')}<span>${escapeHtml(label || 'AI PROPERTY PRESENTATION')}</span><b>${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</b></div>`
}

function slideHeading(slide, index) {
  const long = String(slide.title || '').length > 68 ? ' slide-head--long' : ''
  return `<div class="slide-head${long}"><p>${escapeHtml(slide.kicker || `РАЗДЕЛ ${String(index + 1).padStart(2, '0')}`)}</p><h2>${escapeHtml(slide.title)}</h2>${slide.body ? `<div class="slide-lead">${textWithBreaks(slide.body)}</div>` : ''}</div>`
}

function renderSlide(inputSlide, index, total, report, property) {
  const slide = legacySlide(inputSlide)
  const layout = slide.layout || 'split'
  const images = slideImages(slide, report, index)
  const chrome = slideChrome(index, total, slide.kicker)

  if (layout === 'cover') {
    const long = String(slide.title || report.title || '').length > 62 ? ' cover-title-card--long' : ''
    return `<section class="report-page report-page--cover"><div class="cover-stage">${photoMarkup(images[0])}<div class="cover-title-card${long}"><p>${escapeHtml(slide.kicker || 'ПЕРСОНАЛЬНЫЙ AI-РАЗБОР')}</p><h1>${escapeHtml(slide.title || report.title)}</h1><div>${escapeHtml(property.location || 'Аналитическая презентация объекта')}</div></div><div class="cover-facts"><span><small>СТОИМОСТЬ</small>${escapeHtml(money(property.price, property.currency))}</span>${property.area ? `<span><small>ПЛОЩАДЬ</small>${escapeHtml(property.area)} м²</span>` : ''}${property.rooms ? `<span><small>КОМНАТЫ</small>${escapeHtml(property.rooms)}</span>` : ''}</div></div><div class="cover-footer">${brandLockup('cover')}<span>AI PRESENTATION · ${new Date().getFullYear()}</span><b>01</b></div></section>`
  }

  if (layout === 'photo_statement') {
    return `<section class="report-page report-page--photo-statement">${chrome}<div class="photo-statement-stage">${photoMarkup(images[0])}<article><p>${escapeHtml(slide.kicker)}</p><h2>${escapeHtml(slide.title)}</h2><div>${textWithBreaks(slide.body)}</div></article></div></section>`
  }

  if (layout === 'gallery') {
    const galleryImages = images.length ? images : (report.images || []).slice(0, 4)
    return `<section class="report-page report-page--gallery">${chrome}<div class="gallery-title"><p>${escapeHtml(slide.kicker || 'ФОТОГРАФИИ ОБЪЕКТА')}</p><h2>${escapeHtml(slide.title)}</h2></div><div class="gallery-grid">${galleryImages.slice(0, 4).map((image, photoIndex) => photoMarkup(image, 'gallery-photo', String(photoIndex + 1).padStart(2, '0'))).join('')}</div></section>`
  }

  if (layout === 'cards' || layout === 'stats') {
    return `<section class="report-page report-page--${layout}">${chrome}<div class="cards-stage">${slideHeading(slide, index)}${renderCards(slide.cards, layout)}${images[0] ? `<div class="cards-photo">${photoMarkup(images[0])}</div>` : ''}</div></section>`
  }

  if (layout === 'chart') {
    return `<section class="report-page report-page--chart">${chrome}<div class="chart-layout"><div class="chart-copy">${slideHeading(slide, index)}${renderBullets(slide.bullets)}</div>${renderChart(slide.chart)}</div></section>`
  }

  if (layout === 'comparison') {
    return `<section class="report-page report-page--comparison">${chrome}${slideHeading(slide, index)}${renderCards((slide.cards || []).slice(0, 2), 'comparison')}${renderBullets(slide.bullets)}</section>`
  }

  if (layout === 'timeline') {
    return `<section class="report-page report-page--timeline">${chrome}${slideHeading(slide, index)}<div class="timeline-line"></div>${renderCards((slide.cards || []).slice(0, 4), 'timeline')}</section>`
  }

  if (layout === 'neighborhood') {
    const groups = report.neighborhood?.groups || []
    const generatedCards = slide.cards?.length ? slide.cards : groups.slice(0, 4).map((group, groupIndex) => ({
      title: group.label,
      value: group.places?.[0] ? `${group.places[0].distanceMeters} м` : '',
      body: (group.places || []).map((place) => place.name).join(' · '),
      icon: ['school', 'transport', 'store', 'tree'][groupIndex] || 'location',
      tone: groupIndex === 0 ? 'tiffany' : 'cream',
    }))
    return `<section class="report-page report-page--neighborhood">${chrome}${slideHeading(slide, index)}${renderCards(generatedCards, 'neighborhood')}${renderBullets(slide.bullets)}<p class="source-note">${escapeHtml(report.neighborhood?.sourceNote || '')}</p></section>`
  }

  if (layout === 'conclusion') {
    const long = String(slide.title || '').length > 62 ? ' conclusion-panel--long' : ''
    return `<section class="report-page report-page--conclusion"><div class="conclusion-photo">${photoMarkup(images[0])}</div><div class="conclusion-panel${long}">${brandLockup('conclusion')}<p>${escapeHtml(slide.kicker || 'ИТОГ · СЛЕДУЮЩИЙ ШАГ')}</p><h2>${escapeHtml(slide.title)}</h2><div class="conclusion-body">${textWithBreaks(slide.body)}</div>${renderBullets(slide.bullets)}<small>${escapeHtml(report.disclaimer)}</small></div><b class="conclusion-number">${String(index + 1).padStart(2, '0')}</b></section>`
  }

  return `<section class="report-page report-page--split">${chrome}<div class="split-layout"><div class="split-copy">${slideHeading(slide, index)}${renderBullets(slide.bullets)}${slide.cards?.length ? renderCards(slide.cards.slice(0, 2), 'compact') : ''}</div><div class="split-photo">${photoMarkup(images[0])}<span>${escapeHtml(property.title || property.name || 'ОБЪЕКТ')}</span></div></div></section>`
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
:root{--report-tiffany:#4ecdd6;--report-tiffany-dark:#199eaa;--report-tiffany-deep:#107b85;--report-tiffany-light:#92e4e8;--report-tiffany-soft:#e9f8f7;--report-ink:#12343b;--report-ink-soft:#31545a;--report-paper:#f5f0e8;--report-cream:#fbf8f1;--report-white:#fff;--report-muted:#71878a;--report-line:#d8e3df;--report-peach:#e5a77a}
@page{size:A4 landscape;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#dfe7e5;color:var(--report-ink);font-family:Arial,"Helvetica Neue",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.report-page{position:relative;width:297mm;height:210mm;padding:14mm 16mm 16mm;background:var(--report-paper);overflow:hidden;page-break-after:always}.report-page:last-child{page-break-after:auto}.report-page:before{content:"";position:absolute;right:-24mm;top:-28mm;width:72mm;height:72mm;border:1px solid rgba(78,205,214,.3);border-radius:50%}.report-page:after{content:"";position:absolute;right:-10mm;top:-14mm;width:42mm;height:42mm;border:1px solid rgba(78,205,214,.22);border-radius:50%}
.brand-lockup{display:inline-flex;align-items:baseline;gap:.1em;font-size:15pt;font-weight:800;letter-spacing:-.06em;line-height:1;white-space:nowrap}.brand-lockup b{padding:.08em .24em .1em;border-radius:.3em;background:var(--report-tiffany);color:#fff;font:inherit}.brand-lockup--chrome{font-size:8pt}.brand-lockup--cover{font-size:14pt}.brand-lockup--conclusion{font-size:14pt;color:#fff}.brand-lockup--conclusion b{background:#fff;color:var(--report-tiffany-dark)}
.slide-chrome{position:absolute;z-index:20;left:16mm;right:16mm;bottom:6mm;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:6mm;color:var(--report-muted)}.slide-chrome:before{content:"";position:absolute;left:36mm;right:18mm;top:50%;height:1px;background:rgba(25,158,170,.2)}.slide-chrome>*{position:relative;background:var(--report-paper)}.slide-chrome>span{justify-self:start;padding:0 3mm;font-size:5.6pt;font-weight:700;letter-spacing:.14em}.slide-chrome>b{padding-left:3mm;color:var(--report-tiffany-dark);font-size:6.5pt;letter-spacing:.1em}
.slide-head{position:relative;z-index:2}.slide-head>p,.gallery-title>p,.cover-title-card>p,.conclusion-panel>p{margin:0 0 3mm;color:var(--report-tiffany-dark);font-size:6.8pt;font-weight:800;letter-spacing:.17em}.slide-head h2,.gallery-title h2,.conclusion-panel h2{margin:0;font-family:Georgia,"Times New Roman",serif;font-size:30pt;font-weight:400;line-height:1.03;letter-spacing:-.035em}.slide-lead{max-width:128mm;margin-top:4mm;color:var(--report-muted);font-size:9pt;line-height:1.48}.slide-bullets{margin:6mm 0 0;padding:0;list-style:none}.slide-bullets li{position:relative;margin:0 0 3mm;padding-left:7mm;font-size:8.5pt;line-height:1.4}.slide-bullets li:before{content:"";position:absolute;left:0;top:1.7mm;width:3mm;height:3mm;border-radius:50%;background:var(--report-tiffany)}
.line-icon{width:10mm;height:10mm}.photo-frame{position:relative;width:100%;height:100%;margin:0;overflow:hidden;background:#e7ebe8}.photo-frame>img{display:block;width:100%;height:100%;object-fit:cover}.photo-frame>figcaption{position:absolute;right:3mm;bottom:3mm;display:grid;place-items:center;width:9mm;height:9mm;border-radius:50%;background:var(--report-tiffany);color:#fff;font-size:6pt;font-weight:800}.photo-frame>span{position:absolute;right:3mm;bottom:3mm;padding:1.6mm 2.5mm;border-radius:99px;background:rgba(255,255,255,.92);color:var(--report-tiffany-deep);font-size:5.5pt;font-weight:800;letter-spacing:.07em}img[data-failed="true"]{visibility:hidden}
.report-page--cover{padding:11mm 12mm 13mm}.cover-stage{position:relative;height:176mm;overflow:hidden;border-radius:0 0 12mm 0;background:#e8e3da}.cover-stage>.photo-frame{position:absolute;left:0;right:0;bottom:0;height:139mm}.cover-title-card{position:absolute;z-index:3;left:18mm;top:8mm;width:184mm;min-height:52mm;padding:10mm 12mm 8mm;background:var(--report-tiffany);color:#fff}.cover-title-card>p{color:rgba(255,255,255,.78)}.cover-title-card h1{margin:0 0 4mm;font-family:Georgia,"Times New Roman",serif;font-size:35pt;font-weight:400;line-height:.98;letter-spacing:-.035em}.cover-title-card>div{font-size:8pt;letter-spacing:.06em}.cover-facts{position:absolute;z-index:4;left:18mm;bottom:10mm;display:flex;background:rgba(251,248,241,.95);box-shadow:0 5mm 12mm rgba(18,52,59,.12)}.cover-facts span{min-width:42mm;padding:4mm 6mm;color:var(--report-ink);font-family:Georgia,serif;font-size:13pt}.cover-facts small{display:block;margin-bottom:1.5mm;color:var(--report-tiffany-dark);font:700 5.5pt Arial,sans-serif;letter-spacing:.12em}.cover-footer{position:absolute;left:15mm;right:15mm;bottom:5mm;display:flex;align-items:center;justify-content:space-between}.cover-footer>span{font-size:5.8pt;color:var(--report-muted);letter-spacing:.13em}.cover-footer>b{font-size:7pt;color:var(--report-tiffany-dark)}
.photo-statement-stage{position:relative;height:168mm;margin-top:0;overflow:hidden;border-radius:9mm}.photo-statement-stage>.photo-frame{position:absolute;inset:0}.photo-statement-stage:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(18,52,59,.16),transparent 70%)}.photo-statement-stage>article{position:absolute;z-index:3;left:22mm;top:50%;transform:translateY(-50%);width:166mm;padding:12mm 15mm;background:var(--report-tiffany);color:#fff;box-shadow:0 8mm 18mm rgba(18,52,59,.15)}.photo-statement-stage>article>p{margin:0 0 4mm;color:rgba(255,255,255,.74);font-size:6.5pt;font-weight:800;letter-spacing:.16em}.photo-statement-stage h2{margin:0 0 5mm;font-family:Georgia,serif;font-size:29pt;font-weight:400;line-height:1}.photo-statement-stage article>div{font-size:10pt;line-height:1.52}
.cards-stage{position:relative;height:168mm;padding:12mm 13mm;border-radius:9mm;background:var(--report-tiffany)}.cards-stage .slide-head{color:#fff}.cards-stage .slide-head>p{color:rgba(255,255,255,.72)}.cards-stage .slide-lead{color:rgba(255,255,255,.8)}.cards-stage .card-grid{position:absolute;left:13mm;right:13mm;bottom:12mm}.cards-stage .cards-photo{position:absolute;right:0;top:0;width:82mm;height:58mm;border-radius:0 9mm 0 9mm;overflow:hidden}.cards-stage .cards-photo:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,var(--report-tiffany),transparent 52%)}
.card-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5mm}.info-card{position:relative;min-height:91mm;padding:6mm;border-radius:0 0 8mm 0;background:var(--report-white);overflow:hidden}.info-card__top{display:flex;align-items:flex-start;justify-content:space-between;color:var(--report-tiffany-dark)}.info-card__top>span{font-size:6pt;font-weight:800;letter-spacing:.1em;opacity:.65}.info-card__value{display:block;margin:8mm 0 3mm;font-family:Georgia,serif;font-size:25pt;font-weight:400;line-height:1}.info-card h3{margin:4mm 0 3mm;font-size:9pt;line-height:1.2;letter-spacing:.03em}.info-card p{margin:0;color:var(--report-muted);font-size:7.4pt;line-height:1.42}.info-card--tiffany{background:var(--report-tiffany-soft)}.info-card--ink{background:var(--report-ink);color:#fff}.info-card--ink .info-card__top{color:var(--report-tiffany-light)}.info-card--ink p{color:rgba(255,255,255,.7)}.info-card--cream{background:var(--report-cream)}.info-card--white{background:#fff}.card-grid--stats .info-card{min-height:83mm}.card-grid--stats .info-card__value{font-size:27pt}
.gallery-title{position:absolute;z-index:4;left:27mm;top:18mm;width:94mm;padding:9mm 10mm;background:var(--report-tiffany);color:#fff;box-shadow:0 7mm 18mm rgba(18,52,59,.15)}.gallery-title>p{color:rgba(255,255,255,.75)}.gallery-title h2{font-size:27pt}.gallery-grid{display:grid;grid-template-columns:1.12fr .88fr .88fr;grid-template-rows:79mm 79mm;gap:3mm;height:161mm;margin-top:0}.gallery-grid>.photo-frame:first-child{grid-row:1/3}.gallery-grid>.photo-frame:nth-child(4){grid-column:2/4}.gallery-grid>.photo-frame{border-radius:0 0 7mm 0}
.chart-layout{display:grid;grid-template-columns:.78fr 1.22fr;height:163mm;border-radius:9mm;overflow:hidden;background:var(--report-cream)}.chart-copy{padding:14mm 12mm;background:var(--report-tiffany);color:#fff}.chart-copy .slide-head>p{color:rgba(255,255,255,.72)}.chart-copy .slide-head h2{font-size:27pt}.chart-copy .slide-lead{color:rgba(255,255,255,.82)}.chart-copy .slide-bullets li{font-size:7.8pt}.chart-copy .slide-bullets li:before{background:#fff}.chart-shell{padding:10mm 11mm 7mm;background:var(--report-white)}.chart-heading{display:flex;align-items:baseline;justify-content:space-between}.chart-heading strong{font-family:Georgia,serif;font-size:15pt;font-weight:400}.chart-heading span{color:var(--report-tiffany-dark);font-size:7pt;font-weight:800}.chart-svg{display:block;width:100%;height:105mm;margin-top:2mm}.chart-grid-line{stroke:#e4ebe8;stroke-width:1}.chart-axis{stroke:#b8cbc7;stroke-width:1.5}.chart-label{fill:#71878a;font:12px Arial,sans-serif}.chart-value,.chart-legend-value{fill:#31545a;font:700 12px Arial,sans-serif}.chart-total{fill:#12343b;font:34px Georgia,serif}.chart-legend{display:flex;gap:6mm;color:var(--report-muted);font-size:6.5pt}.chart-legend span{display:flex;align-items:center;gap:2mm}.chart-legend i{width:3mm;height:3mm;border-radius:50%}.chart-caption{margin:3mm 0 0;color:var(--report-muted);font-size:6.3pt;line-height:1.35}
.report-page--comparison>.slide-head,.report-page--timeline>.slide-head,.report-page--neighborhood>.slide-head{max-width:215mm;margin:3mm 0 9mm}.card-grid--comparison{grid-template-columns:1fr 1fr;gap:7mm}.card-grid--comparison .info-card{min-height:105mm;padding:8mm 10mm}.card-grid--comparison .info-card p{white-space:pre-line;font-size:8.5pt;line-height:1.58}.card-grid--comparison .info-card h3{font-family:Georgia,serif;font-size:18pt;font-weight:400}.card-grid--comparison .line-icon{width:13mm;height:13mm}.report-page--comparison>.slide-bullets{position:absolute;left:16mm;bottom:20mm}
.report-page--timeline{background:var(--report-cream)}.timeline-line{position:absolute;z-index:0;left:34mm;right:34mm;top:106mm;height:1px;background:var(--report-tiffany-dark)}.timeline-line:before,.timeline-line:after{content:"";position:absolute;top:-1.5mm;width:3mm;height:3mm;border-radius:50%;background:var(--report-tiffany-dark)}.timeline-line:before{left:0}.timeline-line:after{right:0}.card-grid--timeline{position:relative;z-index:2;grid-template-columns:repeat(4,1fr);gap:6mm}.card-grid--timeline .info-card{min-height:91mm;border:1px solid rgba(25,158,170,.15);box-shadow:0 5mm 14mm rgba(18,52,59,.05)}.card-grid--timeline .info-card__value{margin:4mm 0;color:var(--report-tiffany-dark);font-size:20pt}
.card-grid--neighborhood{grid-template-columns:repeat(4,1fr)}.card-grid--neighborhood .info-card{min-height:76mm}.report-page--neighborhood>.slide-bullets{display:grid;grid-template-columns:repeat(2,1fr);gap:0 8mm;margin-top:6mm}.report-page--neighborhood>.slide-bullets li{font-size:7.2pt}.source-note{position:absolute;left:16mm;bottom:18mm;margin:0;color:var(--report-muted);font-size:6pt}
.split-layout{display:grid;grid-template-columns:1.06fr .94fr;height:162mm;border-radius:9mm;overflow:hidden}.split-copy{padding:11mm 12mm;background:var(--report-cream)}.split-copy .slide-lead{font-size:9.2pt}.split-photo{position:relative}.split-photo>.photo-frame{position:absolute;inset:0}.split-photo>span{position:absolute;left:0;bottom:11mm;max-width:82%;padding:4mm 7mm;background:var(--report-tiffany);color:#fff;font-family:Georgia,serif;font-size:13pt}.card-grid--compact{grid-template-columns:1fr 1fr;margin-top:6mm}.card-grid--compact .info-card{min-height:48mm;padding:4mm}.card-grid--compact .line-icon{width:7mm;height:7mm}.card-grid--compact .info-card__value{margin:2mm 0;font-size:15pt}.card-grid--compact .info-card h3{margin:2mm 0}.card-grid--compact .info-card p{font-size:6.4pt}
.report-page--conclusion{padding:0;background:var(--report-tiffany)}.report-page--conclusion:before,.report-page--conclusion:after{display:none}.conclusion-photo{position:absolute;left:0;top:0;width:43%;height:100%}.conclusion-photo>.photo-frame{position:absolute;inset:0}.conclusion-photo:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 58%,var(--report-tiffany))}.conclusion-panel{position:absolute;left:39%;right:0;top:0;bottom:0;padding:16mm 18mm;color:#fff}.conclusion-panel>p{margin-top:22mm;color:rgba(255,255,255,.72)}.conclusion-panel h2{max-width:150mm;font-size:34pt}.conclusion-body{max-width:142mm;margin-top:6mm;color:rgba(255,255,255,.84);font-size:9.5pt;line-height:1.5}.conclusion-panel .slide-bullets{max-width:137mm}.conclusion-panel .slide-bullets li{font-size:8pt}.conclusion-panel .slide-bullets li:before{background:#fff}.conclusion-panel small{position:absolute;left:18mm;right:18mm;bottom:10mm;color:rgba(255,255,255,.62);font-size:5.8pt;line-height:1.4}.conclusion-number{position:absolute;right:10mm;bottom:4mm;color:rgba(255,255,255,.18);font:70pt Georgia,serif}
.slide-head h2,.gallery-title h2,.cover-title-card h1,.conclusion-panel h2{text-wrap:balance}.slide-head--long h2{font-size:24pt}.cover-title-card--long h1{font-size:28pt}.conclusion-panel--long h2{font-size:27pt}.card-grid--count-1{grid-template-columns:minmax(0,1fr)}.card-grid--count-2{grid-template-columns:repeat(2,minmax(0,1fr))}.card-grid--count-3{grid-template-columns:repeat(3,minmax(0,1fr))}
`

export function renderPropertyAiReportHtml({ report, property = {}, mediaBaseUrl = propertyAiMediaBaseUrl() }) {
  const slides = Array.isArray(report?.slides) && report.slides.length ? report.slides : (Array.isArray(report?.pages) ? report.pages : [])
  const baseUrl = safeMediaBaseUrl(mediaBaseUrl)
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><base href="${escapeHtml(baseUrl)}"><title>${escapeHtml(report?.title || 'AI-презентация')}</title><style>${REPORT_STYLES}</style></head><body>${slides.map((slide, index) => renderSlide(slide, index, slides.length, report, property)).join('')}</body></html>`
}

export function resolvePropertyAiPuppeteerOptions({
  platform = process.platform,
  envPath = process.env.PUPPETEER_EXECUTABLE_PATH || '',
  exists = fs.existsSync,
} = {}) {
  const configured = String(envPath).trim()
  if (configured && exists(configured)) return { executablePath: configured }
  const candidates = platform === 'darwin'
    ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser']
    : platform === 'linux'
      ? ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/opt/google/chrome/chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium']
      : platform === 'win32'
        ? ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe']
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
    await page.setContent(renderPropertyAiReportHtml({ report, property }), { waitUntil: 'domcontentloaded', timeout: 20_000 })
    await waitForPropertyAiImages(page)
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
