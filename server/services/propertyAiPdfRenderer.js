import fs from 'node:fs'
import { propertyAiMediaBaseUrl } from './propertyAiImages.js'

export const PROPERTY_AI_PDF_TEMPLATE_VERSION = 'tiffany-editorial-v2'

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

const brandLockup = (modifier = '') => `<div class="brand-lockup${modifier ? ` brand-lockup--${modifier}` : ''}" aria-label="SellYourBrick"><span>Sell</span><b>Your</b><span>Brick</span></div>`

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
  const pageNoLabel = String(pageNo).padStart(2, '0')
  const sectionNoLabel = String(Math.max(1, pageNo - 1)).padStart(2, '0')
  const chrome = `<div class="page-chrome">${brandLockup('chrome')}<span class="page-chrome__label">TIFFANY EDITION · AI REVIEW</span><span class="page-chrome__number">${pageNoLabel}</span></div>`

  if (page.type === 'cover') {
    return `<section class="report-page report-page--cover"><div class="cover-photo-frame">${photoMarkup(reportPhoto(report, 0))}</div><div class="cover-scrim"></div><div class="cover-top">${brandLockup('cover')}<span class="cover-edition">TIFFANY EDITION · PRIVATE PROPERTY REVIEW · ${new Date().getFullYear()}</span></div><div class="cover-copy"><p class="eyebrow">НЕДВИЖИМОСТЬ · ПЕРСОНАЛЬНЫЙ AI-РАЗБОР</p><h1>${escapeHtml(page.title || report.title)}</h1><p class="cover-location">${escapeHtml(property.location || 'Персональный разбор объекта')}</p><div class="cover-facts"><span><small>СТОИМОСТЬ</small>${escapeHtml(money(property.price, property.currency))}</span>${property.area ? `<span><small>ПЛОЩАДЬ</small>${escapeHtml(property.area)} м²</span>` : ''}${property.rooms ? `<span><small>КОМНАТЫ</small>${escapeHtml(property.rooms)}</span>` : ''}</div></div><div class="cover-accent" aria-hidden="true"></div><div class="cover-page">${pageNoLabel}</div></section>`
  }

  if (page.type === 'snapshot') {
    return `<section class="report-page report-page--snapshot">${chrome}<div class="page-head"><p>${sectionNoLabel} · КЛЮЧЕВЫЕ ДАННЫЕ</p><h2>${escapeHtml(page.title)}</h2></div><div class="snapshot-layout"><div class="snapshot-data">${renderMetrics(page.metrics)}<div class="snapshot-copy"><strong>${escapeHtml(property.title || property.name || 'Объект')}</strong><p>${escapeHtml(property.description || report.summary || '')}</p></div></div><div class="snapshot-photo"><span class="photo-index">01 / OBJECT</span>${photoMarkup(reportPhoto(report, 1))}</div></div></section>`
  }

  if (page.type === 'balance') {
    return `<section class="report-page report-page--balance">${chrome}<div class="page-head page-head--split"><div><p>${sectionNoLabel} · ВЗВЕШЕННОЕ РЕШЕНИЕ</p><h2>${escapeHtml(page.title)}</h2></div><p class="page-intro">Сильные стороны объекта — рядом с вопросами, которые стоит закрыть до следующего шага.</p></div><div class="balance-grid"><article class="good"><div class="balance-label"><i>+</i><span>СИЛЬНЫЕ СТОРОНЫ</span></div>${renderBullets(page.strengths)}</article><article class="risk"><div class="balance-label"><i>!</i><span>НУЖНО ПРОВЕРИТЬ</span></div>${renderBullets(page.risks)}</article></div><p class="note">Пункты проверки не являются утверждением о недостатках объекта.</p></section>`
  }

  if (page.type === 'gallery') {
    const images = (Array.isArray(page.images) ? page.images : report.images || []).slice(0, 4)
    const gallery = images.map((image, photoIndex) => `<figure>${photoMarkup(image, 'gallery-photo')}<figcaption>${String(photoIndex + 1).padStart(2, '0')}</figcaption></figure>`).join('')
    return `<section class="report-page report-page--gallery">${chrome}<div class="page-head page-head--gallery"><p>${sectionNoLabel} · ФОТОГРАФИИ ИЗ ОБЪЯВЛЕНИЯ</p><h2>${escapeHtml(page.title)}</h2><span>Только реальные кадры объекта</span></div><div class="listing-gallery">${gallery || photoMarkup('')}</div></section>`
  }

  if (page.type === 'details') {
    return `<section class="report-page report-page--details">${chrome}<div class="page-head"><p>${sectionNoLabel} · ПОДРОБНЫЙ АНАЛИЗ</p><h2>${escapeHtml(page.title)}</h2></div><div class="details-layout"><div class="details-copy"><span class="details-quote" aria-hidden="true">“</span><p>${escapeHtml(page.body || '')}</p></div><aside class="details-checklist"><strong>ЧЕК-ЛИСТ РЕШЕНИЯ</strong>${renderBullets(page.bullets)}</aside></div><p class="details-disclaimer">${escapeHtml(report.disclaimer)}</p></section>`
  }

  if (page.type === 'neighborhood') {
    const neighborhood = page.neighborhood || report.neighborhood || {}
    const groups = (Array.isArray(neighborhood.groups) ? neighborhood.groups : []).map((group) => {
      const places = (group.places || []).map((place) => `<li><strong>${escapeHtml(place.name)}</strong><span>${escapeHtml(place.distanceMeters)} м</span></li>`).join('')
      return `<article><h3>${escapeHtml(group.label)}</h3><ul>${places}</ul></article>`
    }).join('')
    const fallback = (neighborhood.highlights || []).slice(0, 6).map((item) => `<article class="infrastructure-note">${escapeHtml(item)}</article>`).join('')
    return `<section class="report-page report-page--neighborhood">${chrome}<div class="page-head page-head--split"><div><p>${sectionNoLabel} · ПРОВЕРЕНО ПО КООРДИНАТАМ</p><h2>${escapeHtml(page.title)}</h2></div><p class="page-intro">${escapeHtml(neighborhood.summary || '')}</p></div><div class="infrastructure-grid">${groups || fallback}</div><p class="note">${escapeHtml(neighborhood.sourceNote || '')}</p><div class="neighborhood-checks"><span class="neighborhood-checks__title">ПРОВЕРИТЬ НА МЕСТЕ</span><article><b>01</b><div><strong>Реальный маршрут</strong><p>Сверьте расстояние с пешим или автомобильным маршрутом.</p></div></article><article><b>02</b><div><strong>Ритм района</strong><p>Оцените шум и трафик утром, вечером и в выходной.</p></div></article><article><b>03</b><div><strong>Планы развития</strong><p>Уточните будущую застройку и изменения инфраструктуры.</p></div></article></div></section>`
  }

  if (page.type === 'conclusion') {
    return `<section class="report-page report-page--conclusion"><div class="conclusion-grid"><div class="conclusion-copy">${brandLockup('conclusion')}<p class="eyebrow">ИТОГ · СЛЕДУЮЩИЙ ШАГ</p><h2>${escapeHtml(page.title || 'Решение начинается с проверки фактов')}</h2><p class="conclusion-lead">${escapeHtml(page.body || report.conclusion || '')}</p></div><div class="conclusion-steps"><span class="conclusion-kicker">ПЕРЕД РЕШЕНИЕМ</span>${renderBullets(page.bullets)}<p>${escapeHtml(report.disclaimer)}</p></div></div><div class="conclusion-mark">${pageNoLabel}</div></section>`
  }

  const kicker = page.type === 'answer' ? 'ОТВЕТ НА ВАШ ВОПРОС' : 'ПОДРОБНЫЙ АНАЛИЗ'
  return `<section class="report-page report-page--${escapeHtml(page.type || 'analysis')}">${chrome}<div class="page-head"><p>${sectionNoLabel} · ${kicker}</p><h2>${escapeHtml(page.title)}</h2></div><div class="editorial"><div class="editorial-copy"><span class="editorial-rule"></span><p class="lead">${escapeHtml(page.body || '')}</p>${renderBullets(page.bullets)}</div><div class="editorial-photo"><span class="photo-index">AI / REVIEW</span>${photoMarkup(reportPhoto(report, index))}</div></div></section>`
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
:root{--report-tiffany:#4ecdd6;--report-tiffany-dark:#3bc0cb;--report-tiffany-deep:#2aa8b4;--report-tiffany-light:#79dce2;--report-tiffany-soft:#effbfc;--report-ink:#0f172a;--report-ink-soft:#334155;--report-paper:#ffffff;--report-surface:#f8fafc;--report-muted:#64748b;--report-line:#e2e8f0}
@page{size:A4 landscape;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#dce7e8;color:var(--report-ink);font-family:Montserrat,Arial,"Helvetica Neue",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.report-page{position:relative;width:297mm;height:210mm;padding:15mm 18mm 16mm;background:var(--report-paper);overflow:hidden;page-break-after:always}.report-page:last-child{page-break-after:auto}.report-page:not(.report-page--cover):not(.report-page--conclusion):before{content:"";position:absolute;top:0;left:18mm;width:24mm;height:2.2mm;background:var(--report-tiffany)}
.brand-lockup{display:inline-flex;align-items:baseline;gap:.12em;font-size:17pt;font-weight:800;letter-spacing:-.055em;line-height:1;white-space:nowrap}.brand-lockup b{padding:.08em .24em .1em;border-radius:.32em;background:var(--report-tiffany);color:#fff;font:inherit;box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}.brand-lockup--cover{color:#fff;font-size:20pt;text-shadow:0 5px 20px rgba(2,12,15,.32)}.brand-lockup--cover b{background:rgba(78,205,214,.76)}.brand-lockup--chrome{font-size:8.5pt;letter-spacing:-.04em}.brand-lockup--chrome b{padding:.06em .2em .08em}.brand-lockup--conclusion{font-size:16pt;color:#fff;margin-bottom:32mm}.brand-lockup--conclusion b{background:var(--report-tiffany-light);color:var(--report-ink)}
.page-chrome{position:absolute;z-index:5;left:18mm;right:18mm;bottom:6mm;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:5mm;color:var(--report-muted)}.page-chrome:before{content:"";position:absolute;left:39mm;right:15mm;top:50%;height:1px;background:var(--report-line)}.page-chrome>*{position:relative;background:var(--report-paper)}.page-chrome__label{padding:0 3mm;font-size:6pt;font-weight:700;letter-spacing:.12em}.page-chrome__number{padding-left:3mm;color:var(--report-tiffany-dark);font-size:7pt;font-weight:800;letter-spacing:.12em}
.page-head>p,.page-head>div>p,.eyebrow{margin:0 0 3mm;color:var(--report-tiffany-dark);font-size:7pt;font-weight:800;letter-spacing:.15em}.page-head h2{max-width:194mm;margin:0 0 8mm;font-size:30pt;font-weight:750;line-height:1;letter-spacing:-.055em}.page-head--split{display:grid;grid-template-columns:1.12fr .88fr;gap:18mm;align-items:end}.page-head--split h2{margin-bottom:7mm}.page-intro{align-self:end;margin:0 0 8mm;max-width:106mm;color:var(--report-muted);font-size:9.2pt;line-height:1.5}.note,.muted{color:var(--report-muted);font-size:7.2pt;line-height:1.4}
.report-page--cover{padding:0;background:var(--report-ink)}.cover-photo-frame,.cover-photo-frame>.page-photo,.cover-photo-frame>.photo-placeholder,.cover-photo-frame .page-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.cover-scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(2,12,15,.92) 0%,rgba(2,12,15,.68) 38%,rgba(2,12,15,.12) 73%,rgba(2,12,15,.2) 100%),linear-gradient(180deg,rgba(1,10,12,.28),transparent 35%,rgba(1,10,12,.62) 100%)}.cover-top{position:absolute;left:18mm;right:18mm;top:15mm;display:flex;align-items:center;justify-content:space-between;color:#fff}.cover-edition{font-size:6.5pt;font-weight:700;letter-spacing:.15em;color:rgba(255,255,255,.8)}.cover-copy{position:absolute;left:18mm;bottom:20mm;width:188mm;color:#fff}.cover-copy .eyebrow{color:var(--report-tiffany-light)}.cover-copy h1{max-width:182mm;margin:5mm 0 5mm;font-size:42pt;font-weight:780;line-height:.96;letter-spacing:-.065em;text-wrap:balance;text-shadow:0 8px 28px rgba(1,10,12,.3)}.cover-location{max-width:135mm;margin:0 0 7mm;color:rgba(255,255,255,.82);font-size:10.5pt;line-height:1.45}.cover-facts{display:flex;align-items:flex-start;gap:0;border-top:1px solid rgba(255,255,255,.34)}.cover-facts span{min-width:41mm;padding:4mm 8mm 0 0;margin-right:8mm;color:#fff;font-size:11pt;font-weight:650}.cover-facts small{display:block;margin-bottom:1.5mm;color:var(--report-tiffany-light);font-size:5.8pt;font-weight:800;letter-spacing:.14em}.cover-accent{position:absolute;right:0;bottom:0;width:74mm;height:5mm;background:var(--report-tiffany)}.cover-page{position:absolute;right:18mm;bottom:13mm;color:#fff;font-size:7pt;font-weight:800;letter-spacing:.14em}
.snapshot-layout{display:grid;grid-template-columns:1.14fr .86fr;gap:10mm;height:137mm}.snapshot-data{display:flex;flex-direction:column;justify-content:space-between}.metric-grid{display:grid;grid-template-columns:repeat(2,1fr);border-top:1px solid var(--report-line);border-left:1px solid var(--report-line)}.metric{min-height:29mm;padding:4.5mm 5mm;border-right:1px solid var(--report-line);border-bottom:1px solid var(--report-line);background:#fff}.metric:nth-child(4n+2),.metric:nth-child(4n+3){background:var(--report-tiffany-soft)}.metric span,.metric small{display:block;color:var(--report-muted);font-size:6.8pt}.metric span{font-weight:700;letter-spacing:.06em;text-transform:uppercase}.metric strong{display:block;margin:2.3mm 0 1mm;color:var(--report-ink);font-size:17pt;font-weight:750;letter-spacing:-.04em}.snapshot-copy{display:grid;grid-template-columns:.72fr 1.28fr;gap:7mm;padding-top:5mm;border-top:2px solid var(--report-tiffany)}.snapshot-copy strong{font-size:12.5pt;font-weight:750;line-height:1.2}.snapshot-copy p{margin:0;color:var(--report-muted);font-size:8.2pt;line-height:1.5}.snapshot-photo{position:relative;overflow:hidden;border-radius:0 0 28mm 0;background:var(--report-surface)}.snapshot-photo>.page-photo,.snapshot-photo>.photo-placeholder,.snapshot-photo .page-photo{width:100%;height:100%;object-fit:cover}.photo-index{position:absolute;z-index:2;top:4mm;right:4mm;padding:2mm 3mm;border:1px solid rgba(255,255,255,.48);border-radius:99px;background:rgba(2,12,15,.38);color:#fff;font-size:5.8pt;font-weight:800;letter-spacing:.12em;backdrop-filter:blur(8px)}
.balance-grid{display:grid;grid-template-columns:1fr 1fr;gap:7mm}.balance-grid article{min-height:105mm;padding:7mm 9mm}.balance-label{display:flex;align-items:center;gap:3mm}.balance-label i{display:grid;place-items:center;width:10mm;height:10mm;border-radius:50%;font-size:12pt;font-style:normal;font-weight:800}.balance-label span{font-size:7.2pt;font-weight:800;letter-spacing:.13em}.balance-grid ul{margin-top:6mm}.good{border:1px solid rgba(0,153,169,.2);background:linear-gradient(145deg,#fff 0%,var(--report-tiffany-soft) 100%)}.good .balance-label{color:var(--report-tiffany-deep)}.good .balance-label i{background:var(--report-tiffany);color:#fff}.risk{background:var(--report-ink);color:#fff}.risk .balance-label i{background:var(--report-tiffany-light);color:var(--report-ink)}.risk li::marker{color:var(--report-tiffany-light)}.report-page--balance>.note{margin-top:3mm}
.report-page ul{padding-left:5mm}.report-page li{margin:0 0 3mm;font-size:8.8pt;line-height:1.38}.editorial{display:grid;grid-template-columns:1.05fr .95fr;gap:9mm;height:126mm}.editorial-copy{position:relative;display:flex;flex-direction:column;justify-content:flex-start;padding:11mm 10mm;background:var(--report-tiffany-soft);overflow:hidden}.editorial-rule{position:absolute;left:0;top:0;bottom:0;width:3mm;background:var(--report-tiffany)}.lead{white-space:pre-line;margin:0 0 6mm;font-size:12pt;font-weight:550;line-height:1.48;letter-spacing:-.015em}.editorial-photo{position:relative;overflow:hidden;border-radius:0 0 0 30mm}.editorial-photo>.page-photo,.editorial-photo>.photo-placeholder,.editorial-photo .page-photo{width:100%;height:100%;object-fit:cover}
.report-page--gallery{padding:0;background:var(--report-ink)}.report-page--gallery .page-chrome{left:18mm;right:18mm}.report-page--gallery .page-chrome>*{background:var(--report-ink);color:#fff}.report-page--gallery .page-chrome:before{background:rgba(255,255,255,.22)}.page-head--gallery{position:absolute;z-index:3;left:14mm;top:14mm;width:90mm;padding:8mm;background:rgba(255,255,255,.94);box-shadow:0 10mm 24mm rgba(2,12,15,.22)}.page-head--gallery h2{margin:0 0 4mm;font-size:27pt}.page-head--gallery span{color:var(--report-muted);font-size:7pt}.listing-gallery{display:grid;grid-template-columns:1.34fr .66fr .66fr;grid-template-rows:96mm 96mm;gap:2.5mm;height:195mm;padding:0 0 2.5mm}.listing-gallery figure{position:relative;margin:0;overflow:hidden;background:var(--report-surface)}.listing-gallery figure:first-child{grid-row:1/3}.listing-gallery figure:nth-child(4){grid-column:2/4}.gallery-photo,.listing-gallery .photo-placeholder{width:100%;height:100%;object-fit:cover}.listing-gallery figcaption{position:absolute;right:3mm;bottom:3mm;display:grid;place-items:center;width:9mm;height:9mm;border-radius:50%;background:var(--report-tiffany);color:#fff;font-size:6pt;font-weight:800;letter-spacing:.05em}
.details-layout{display:grid;grid-template-columns:1.28fr .72fr;gap:0;align-items:stretch;height:117mm}.details-copy{position:relative;padding:11mm 12mm 9mm 18mm;border:1px solid var(--report-line);background:#fff;overflow:hidden}.details-quote{position:absolute;left:4mm;top:2mm;color:var(--report-tiffany-soft);font:800 68pt/1 Georgia,serif}.details-copy p{position:relative;white-space:pre-line;margin:0;font-size:9.6pt;line-height:1.5}.details-checklist{padding:9mm;background:linear-gradient(145deg,var(--report-tiffany-deep),var(--report-tiffany));color:#fff}.details-checklist>strong{font-size:7.2pt;letter-spacing:.14em}.details-checklist ul{margin:7mm 0 0}.details-checklist li{font-size:8.2pt}.details-checklist li::marker{color:var(--report-tiffany-light)}.details-disclaimer{margin:3.5mm 0 0;color:var(--report-muted);font-size:6.7pt;line-height:1.35}
.infrastructure-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin-bottom:4mm}.infrastructure-grid article{overflow:hidden;border-top:2px solid var(--report-tiffany);background:var(--report-surface);padding:0 5mm 4mm}.infrastructure-grid h3{margin:0;padding:5mm 0 3mm;color:var(--report-ink);font-size:10pt;font-weight:750}.infrastructure-grid ul{margin:0;padding:0;list-style:none}.infrastructure-grid li{display:flex;justify-content:space-between;gap:3mm;margin:0;padding:2.4mm 0;border-bottom:1px solid var(--report-line);font-size:7.8pt}.infrastructure-grid li span{flex:none;color:var(--report-tiffany-dark);font-weight:800}.infrastructure-note{padding:5mm!important;color:var(--report-ink);font-size:8.5pt;line-height:1.45}.neighborhood-checks{position:absolute;left:18mm;right:18mm;bottom:23mm;display:grid;grid-template-columns:32mm repeat(3,1fr);min-height:39mm;background:var(--report-ink);color:#fff}.neighborhood-checks__title{display:flex;align-items:center;padding:6mm;color:var(--report-tiffany-light);font-size:6.5pt;font-weight:800;letter-spacing:.14em}.neighborhood-checks article{display:flex;align-items:flex-start;gap:4mm;padding:7mm 6mm;border-left:1px solid rgba(255,255,255,.15)}.neighborhood-checks article>b{color:var(--report-tiffany-light);font-size:7pt;letter-spacing:.08em}.neighborhood-checks strong{font-size:8.5pt}.neighborhood-checks article p{margin:2mm 0 0;color:rgba(255,255,255,.68);font-size:7pt;line-height:1.35}
.report-page--conclusion{padding:0;background:var(--report-ink);color:#fff}.conclusion-grid{display:grid;grid-template-columns:1.2fr .8fr;height:100%}.conclusion-copy{position:relative;padding:17mm 18mm;background:radial-gradient(circle at 18% 72%,rgba(78,205,214,.18),transparent 36%),var(--report-ink)}.conclusion-copy:after{content:"";position:absolute;right:0;top:0;width:3mm;height:100%;background:var(--report-tiffany)}.conclusion-copy .eyebrow{color:var(--report-tiffany-light)}.conclusion-copy h2{max-width:150mm;margin:5mm 0 7mm;font-size:36pt;font-weight:780;line-height:.98;letter-spacing:-.06em}.conclusion-lead{max-width:145mm;margin:0;color:rgba(255,255,255,.74);font-size:10.2pt;line-height:1.52}.conclusion-steps{display:flex;flex-direction:column;justify-content:center;padding:18mm 17mm;background:var(--report-tiffany-soft);color:var(--report-ink)}.conclusion-kicker{color:var(--report-tiffany-dark);font-size:7pt;font-weight:800;letter-spacing:.15em}.conclusion-steps ul{margin:8mm 0 10mm;counter-reset:steps;list-style:none;padding:0}.conclusion-steps li{position:relative;min-height:12mm;margin:0 0 5mm;padding:0 0 5mm 16mm;border-bottom:1px solid rgba(0,153,169,.2);font-size:9pt;font-weight:600}.conclusion-steps li:before{counter-increment:steps;content:"0" counter(steps);position:absolute;left:0;top:0;color:var(--report-tiffany-dark);font-size:8pt;font-weight:800}.conclusion-steps>p{margin:0;color:var(--report-muted);font-size:6.5pt;line-height:1.45}.conclusion-mark{position:absolute;right:8mm;bottom:6mm;color:rgba(0,125,138,.22);font-size:44pt;font-weight:800;letter-spacing:-.08em}
.photo-placeholder{position:relative;margin:0;background:var(--report-surface);overflow:hidden}.photo-placeholder figcaption{position:absolute;right:3mm;bottom:3mm;padding:1.8mm 2.5mm;border-radius:99px;background:rgba(255,255,255,.9);color:var(--report-tiffany-deep);font-size:6pt;font-weight:800;letter-spacing:.06em}img[data-failed="true"]{visibility:hidden}
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
