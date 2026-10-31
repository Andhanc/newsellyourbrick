import { resolvePropertyAiImageUrl, propertyAiMediaBaseUrl, normalizePropertyAiImages } from './propertyAiImages.js'
import { resolvePropertyAiPuppeteerOptions, waitForPropertyAiImages } from './propertyAiPdfRenderer.js'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Waves, Smartphone, DoorOpen, Trees, CarFront, Wifi, Dumbbell, Sun, Bath, Flame, ShieldCheck, Sofa, CookingPot, Accessibility, PlugZap, CircleCheck, FileCheck2, FileSignature, BadgeCheck } from 'lucide-react'

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const text = (v) => esc(v).replace(/\n/g, '<br>')
const paymentStepIcons = [FileCheck2, FileSignature, BadgeCheck]
const paymentStepIcon = (index) => renderToStaticMarkup(createElement(paymentStepIcons[index] || BadgeCheck, { size: 38, strokeWidth: 1.55, 'aria-hidden': true }))

// Reuse the application's Lucide icon system. Match localized amenity titles;
// the icon remains decorative, so the adjacent text is the accessible label.
function amenityIcon(card) {
  const label = String(card.title || '').toLowerCase()
  const matches = [
    [/бассейн|pool|schwimm|piscin|basen|bassäng/u, Waves],
    [/умн|smart|domoti|intelligen|inteligent|connectée/u, Smartphone],
    [/вход|entrance|eingang|zugang|entrada|entrée|wejści|ingång/u, DoorOpen],
    [/сад|garden|garten|jard[ií]|ogród|trädgård/u, Trees],
    [/парков|гараж|parking|garage|aparcamiento|parkering|parkin/u, CarFront],
    [/wi.?fi|интернет|internet|bredband/u, Wifi],
    [/спорт|фитнес|gym|fitness|gimnasio|siłown|träning/u, Dumbbell],
    [/террас|балкон|terrac|balcon|balkon|taras|terrass/u, Sun],
    [/ванн|bath|bad|baño|bain|łazien|badrum/u, Bath],
    [/отоп|камин|heating|fireplace|heizung|kamin|calefac|chauffage|ogrzew|värme/u, Flame],
    [/охран|security|sicherheit|seguridad|sécurité|ochron|säkerhet/u, ShieldCheck],
    [/мебел|furni|möbli|mueble|meubl|umebl|möbler/u, Sofa],
    [/кухн|kitchen|küche|cocina|cuisine|kuchni|kök/u, CookingPot],
    [/доступн|accessib|barriere|accesib|dostęp|tillgäng/u, Accessibility],
    [/электр|electric|strom|électric|prąd|elektr/u, PlugZap],
  ]
  const Icon = matches.find(([pattern]) => pattern.test(label))?.[1] || CircleCheck
  return renderToStaticMarkup(createElement(Icon, { size: 32, strokeWidth: 1.65, 'aria-hidden': true }))
}
const STYLE = `
:root{--tiffany:#3ac4cd;--tiffany-start:#31bec8;--tiffany-end:#42c9d1;--tiffany-fill:linear-gradient(180deg,var(--tiffany-start),var(--tiffany-end))}
@page{size:1280px 720px;margin:0}*{box-sizing:border-box}body{margin:0;background:#dfe8e5;color:#163e40;font-family:Arial,"Helvetica Neue",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.slide{width:1280px;height:720px;position:relative;padding:64px 66px 70px;overflow:hidden;background:#f3f5ef;break-after:page}.slide:last-child{break-after:auto}.slide.branded{background:var(--tiffany-fill);color:#123b3e}.slide.accent{background:var(--tiffany-fill);color:#123b3e}.brand{font-size:18px;font-weight:700;letter-spacing:-.6px}.brand span{color:var(--tiffany)}.accent .brand span,.branded .brand span{color:#123b3e}.footer{position:absolute;bottom:27px;left:66px;right:66px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #91afab66;padding-top:14px}.page-number{font-size:14px;letter-spacing:2px}.eyebrow{font-size:12px;letter-spacing:2.4px;text-transform:uppercase;margin:0 0 20px;color:#31868a;font-weight:700}.branded .eyebrow{color:#225b5d}.accent .eyebrow{color:#225b5d}h1,h2,h3,p{margin:0}h1,h2{font-family:Georgia,"Times New Roman",serif;font-weight:400;letter-spacing:-1.6px;line-height:1.07}h1{font-size:57px}h2{font-size:46px;max-width:1000px}h3{font-size:22px;line-height:1.16;font-weight:500}.body{font-size:20px;line-height:1.45;max-width:740px;margin-top:22px;color:#466465}.branded .body{color:#214f51}.accent .body{color:#214f51}.photo{width:100%;height:100%;object-fit:cover;display:block;border-radius:14px}.photo-empty{height:100%;display:grid;place-items:center;background:#dce9e4;color:#466465;padding:30px;font-size:18px}.heading{margin-bottom:28px}.cover-copy{width:50%;padding-right:46px}.cover h1{font-size:53px;line-height:1.08}.cover .body{font-size:19px;max-width:480px}.cover-image{position:absolute;top:40px;right:42px;bottom:88px;width:46%}.cover-image .photo{border-radius:12px}.location-line{margin-top:24px;font-size:15px;line-height:1.4;max-width:470px;color:#214f51}.cover-price{display:inline-block;margin-top:30px;padding-top:18px;border-top:1px solid #3ac4cd77;color:var(--tiffany);font-family:Georgia,serif;font-size:32px}.cover-price small{display:block;font:12px Arial;letter-spacing:1px;margin-bottom:6px}.stats-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;margin-top:30px}.stat{border-top:1px solid #8ba8a2;padding:17px 16px 0 0}.stat .value{font-family:Georgia,serif;font-size:40px;line-height:1.05;display:block;margin:0 0 12px;overflow-wrap:anywhere}.stat h3{font-size:18px}.stat p{font-size:16px;line-height:1.35;margin-top:10px;color:#56706f}.branded .stat p{color:#214f51}.stats-image{height:235px;width:44%;position:absolute;bottom:95px;right:66px}.stats-body{font-size:20px;line-height:1.45;width:44%;position:absolute;left:66px;bottom:124px;color:#56706f}.split-copy{width:48%;padding-right:34px}.split-copy h2{font-size:47px}.split-copy .body{font-size:21px}.split-image{position:absolute;right:66px;top:60px;width:45%;height:560px}.bullets{list-style:none;padding:0;margin:24px 0 0}.bullets li{font-size:19px;line-height:1.4;padding:12px 0;border-top:1px solid #91afab66}/* Amenities: one property photo on the left, a vertical icon list on the right. */
.amenities-layout{display:grid;grid-template-columns:1.05fr 1fr;gap:48px;height:560px;min-height:0}.amenities-photo{min-width:0;min-height:0;overflow:hidden;border-radius:14px}.amenities-photo .photo{object-position:50% 55%}.amenities-copy{min-width:0;padding:8px 0}.amenities-copy h2{font-size:44px}.amenities-copy>.body{font-size:17px;line-height:1.45;margin-top:16px;max-width:510px;color:#56706f}.amenities-list{margin:26px 0 0;padding:0;list-style:none}.amenity{display:grid;grid-template-columns:58px minmax(0,1fr);gap:20px;align-items:start;padding:20px 0;border-top:1px solid #b8cfcb}.amenity-icon{display:grid;place-items:center;width:58px;height:58px;border-radius:16px;background:var(--tiffany-fill);color:#123b3e}.amenity-icon svg{display:block}.amenity-description{min-width:0}.amenity h3{font-size:22px;line-height:1.2}.amenity p{font-size:17px;line-height:1.4;margin-top:8px;color:#466465}.amenity small{display:block;margin-top:6px;color:#67817b;font-size:12px;line-height:1.3}
.map-layout{display:grid;grid-template-columns:1fr .65fr 1fr;gap:22px;margin-top:28px}.map-view{height:310px;position:relative;background:#e1e8e2;border-radius:12px;overflow:hidden}.map-view>img{width:100%;height:100%;object-fit:cover;filter:saturate(.3)}.map-halo{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:135px;height:135px;background:#3ac4cd44;border:3px solid var(--tiffany);border-radius:50%}.map-pin{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border:4px solid white;border-radius:50%;background:var(--tiffany);box-shadow:0 3px 10px #16434566;width:24px;height:24px}.map-credit{position:absolute;right:4px;bottom:4px;background:#ffffffe8;color:#294849;font-size:10px;padding:3px 5px}.map-title{font-size:16px;margin-bottom:12px}.nearby{padding-top:27px}.nearby h3{font-size:19px;margin-bottom:13px}.place{padding:13px 0;border-bottom:1px solid #a1b8b066}.place b{font-size:16px;font-weight:500;display:block}.place em{display:block;font-size:13px;font-style:normal;line-height:1.3;color:#55726d;margin-top:5px}.place span{display:block;margin-top:4px;font-family:Georgia,serif;font-size:24px;color:#26878c}.map-note{font-size:13px;line-height:1.35;position:absolute;bottom:91px;left:66px;right:66px;max-width:1100px;color:#5d7772}.location .body{font-size:17px;line-height:1.35;margin-top:12px;max-width:1100px}.location h2{font-size:42px}.gallery-grid{height:445px;display:grid;grid-template-columns:1.3fr 1fr 1fr;grid-template-rows:minmax(0,1fr) minmax(0,1fr);gap:14px;margin-top:24px}.gallery-grid>div{min-width:0;min-height:0;overflow:hidden;border-radius:14px}.gallery-grid>div:first-child{grid-row:1/3}.gallery-grid>div:last-child{grid-column:2/4}.sale-copy{width:57%;padding-right:24px}.sale h2{font-size:53px}.sale .body{font-size:21px;line-height:1.5}.sale .stats-row{grid-template-columns:1fr 1fr;gap:25px}.sale .stat .value{font-size:32px}.sale .stat p{font-size:14px}.sale-image{position:absolute;right:66px;top:65px;width:34%;height:550px}.payment .body{max-width:1090px;font-size:21px}.payment-facts{position:absolute;top:64px;right:66px;display:flex;gap:32px;margin:0;color:#fff}.payment-facts strong{font:700 42px/1.05 Georgia;display:block;margin-bottom:8px;white-space:nowrap}.payment-facts span{font-size:16px}.payment--with-facts h2{max-width:620px;font-size:42px}.payment--with-facts>.body{margin-top:34px}.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin-top:34px}.step{min-width:0;min-height:310px;padding:28px;border:1px solid #ffffffd9;border-radius:20px;background:linear-gradient(145deg,#f8f8f7 0%,#e5e4e2 65%,#d7d9dc 100%);box-shadow:0 14px 30px #137e8a24;color:#183b40}.step-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:25px}.step-icon{display:grid;place-items:center;width:64px;height:64px;border-radius:18px;background:#ffffffb8;border:1px solid #fff;color:var(--tiffany)}.step-icon svg{display:block}.step-number{font:30px/1 Georgia;color:#92999e}.step h3{font-size:23px;font-weight:600;line-height:1.2}.step p{font-size:18px;line-height:1.45;margin-top:16px;color:#42595f}.payment--with-facts .steps{margin-top:28px}
.conclusion .split-copy{padding-top:34px}.conclusion h2{font-size:50px}.conclusion .body{font-size:21px}.disclaimer{font-size:13px;line-height:1.35;margin-top:30px;color:#214f51}.conclusion .location-line{color:#214f51}.data-note{font-size:12px;line-height:1.35;color:#617871;margin-top:14px}
/* White typography on every Tiffany surface, including footer branding. */
.slide.branded,.slide.accent{color:#fff}.branded .body,.accent .body,.branded .eyebrow,.accent .eyebrow,.branded .location-line,.branded .disclaimer,.branded .stat p,.branded .brand span,.accent .brand span{color:#fff}.branded .cover-price{color:#fff;font-size:58px;font-weight:700;line-height:1.05;letter-spacing:-1.4px;border-color:#ffffff66}.cover-price small{font-weight:400;letter-spacing:1px}.sale .stat .value{font-size:56px;font-weight:700;line-height:1.05;letter-spacing:-1px}.branded .footer,.accent .footer,.branded .bullets li,.branded .stat{border-color:#ffffff55}
@media screen{body{padding:30px}.slide{margin:0 auto 30px;box-shadow:0 15px 45px #173d4022}}
`

export function renderPropertyPresentationHtml({ report, property = {}, mediaBaseUrl = propertyAiMediaBaseUrl() }) {
  const c = report.copy
  const imageUrls = normalizePropertyAiImages(report.images).map((v) => resolvePropertyAiImageUrl(v, mediaBaseUrl))
  const photo = (index) => {
    const url = imageUrls[index] || imageUrls[0]
    return url ? `<img class="photo" src="${esc(url)}" alt="${esc(property.title)}">` : `<div class="photo-empty">${esc(c.asListed)} · ${esc(c.confirm)}</div>`
  }
  const cards = (items = []) => items.slice(0, 4).map((item) => `<article class="stat">${item.value ? `<strong class="value">${esc(item.value)}</strong>` : ''}<h3>${esc(item.title)}</h3><p>${text(item.body)}</p></article>`).join('')
  const bullets = (items = []) => items.length ? `<ul class="bullets">${items.slice(0, 3).map((v) => `<li>${esc(v)}</li>`).join('')}</ul>` : ''
  const heading = (s) => `${s.kicker ? `<p class="eyebrow">${esc(s.kicker)}</p>` : ''}<h2>${esc(s.title)}</h2>`
  const mapView = (index) => {
    const url = report.location.maps?.[index]
    const valid = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(url || '')
    return `<div><p class="map-title">${esc(index ? c.localMap : c.areaMap)}</p><div class="map-view">${valid ? `<img src="${url}" alt="${esc(c.location)}"><div class="map-halo"></div><div class="map-pin"></div><span class="map-credit">© OpenStreetMap contributors</span>` : `<div class="photo-empty">${esc(report.location.coordinates ? c.mapUnavailable : c.locationMissing)}</div>`}</div></div>`
  }
  const slides = report.slides.map((s, index) => {
    let content = ''
    let theme = ''
    if (s.layout === 'cover') {
      theme = 'branded'
      content = `<div class="cover-copy"><p class="eyebrow">${esc(c.cover)} · ${esc(property.id)}</p><h1>${esc(s.title)}</h1><p class="body">${text(s.body)}</p><div class="location-line">${esc(report.location.label || property.location || c.locationMissing)}</div>${report.sale.facts[0] ? `<div class="cover-price"><small>${esc(report.sale.facts[0].title)}</small>${esc(report.sale.facts[0].value)}</div>` : ''}</div><div class="cover-image">${photo(0)}</div>`
    } else if (s.layout === 'stats') {
      content = `${heading(s)}<div class="stats-row" style="grid-template-columns:repeat(${Math.max(1,s.cards.length)},minmax(0,1fr))">${cards(s.cards)}</div><div class="stats-body">${text(s.body || report.summary)}</div><div class="stats-image">${photo(1)}</div>`
    } else if (s.layout === 'split') {
      theme = 'branded'
      content = `<div class="split-copy">${heading(s)}<p class="body">${text(s.body)}</p>${bullets(s.bullets)}</div><div class="split-image">${photo(2)}</div>`
    } else if (s.layout === 'cards') {
      content = `<div class="amenities-layout"><div class="amenities-photo">${photo(s.imageIndices?.[0] ?? 3)}</div><div class="amenities-copy">${heading(s)}${s.body ? `<p class="body">${text(s.body)}</p>` : ''}<ul class="amenities-list">${(s.cards || []).slice(0, 3).map((v) => `<li class="amenity"><span class="amenity-icon">${amenityIcon(v)}</span><div class="amenity-description"><h3>${esc(v.title)}</h3><p>${text(v.body)}</p>${v.value ? `<small>${esc(v.value)}</small>` : ''}</div></li>`).join('')}</ul></div></div>`
    } else if (s.layout === 'neighborhood') {
      const approximate = report.location.precision !== 'listing'
      content = `<h2>${esc(s.title)}</h2><p class="body">${esc(report.location.label || c.locationMissing)}${s.body ? `<br>${esc(s.body.slice(0, 220))}` : ''}</p><div class="map-layout">${mapView(0)}<div class="nearby"><h3>${esc(c.localMap)}</h3>${s.places.length ? s.places.map((p) => `<div class="place"><b>${esc(p.name)}</b><span>≈ ${esc(p.distanceMeters)} m</span>${p.benefit ? `<em>${esc(p.benefit)}</em>` : ''}</div>`).join('') : `<p class="body">${esc(c.confirm)}</p>`}</div>${mapView(1)}</div><p class="map-note">${esc(approximate ? c.approximateLocation : c.listingLocation)}<br>${esc(c.distanceNote)}</p>`
    } else if (s.layout === 'gallery') {
      const indices = s.imageIndices.length ? s.imageIndices : imageUrls.map((_, i) => i).slice(0, 4)
      content = `${heading(s)}<div class="gallery-grid">${indices.slice(0, 4).map((i) => `<div>${photo(i)}</div>`).join('')}</div>`
    } else if (s.layout === 'sale') {
      theme = 'branded'
      content = `<div class="sale-copy">${heading(s)}<p class="body">${text(s.body)}</p><div class="stats-row">${cards(s.cards)}</div></div><div class="sale-image">${photo(6)}</div>`
    } else if (s.layout === 'payment') {
      theme = 'accent'
      content = `${heading(s)}<p class="body">${text(s.body)}</p>${s.cards.length ? `<div class="payment-facts">${s.cards.map((v) => `<div><strong>${esc(v.value)}</strong><span>${esc(v.title)} · ${esc(v.body)}</span></div>`).join('')}</div>` : ''}<div class="steps">${s.steps.map((v, i) => `<article class="step"><div class="step-top"><span class="step-icon">${paymentStepIcon(i)}</span><span class="step-number">0${i + 1}</span></div><h3>${esc(v.title)}</h3><p>${text(v.body)}</p></article>`).join('')}</div>`
    } else {
      theme = 'branded'
      content = `<div class="split-copy">${heading(s)}<p class="body">${text(s.body)}</p><p class="location-line">${esc(property.title)}<br>${esc(report.location.label || '')}</p><p class="disclaimer">${esc(c.disclaimer)}${report.sourceUrl ? `<br><a href="${esc(report.sourceUrl)}" style="color:inherit">${esc(c.asListed)} · housetenerife.eu</a>` : ''}</p></div><div class="split-image">${photo(7)}</div>`
    }
    const layoutClass = s.layout === 'cards' ? 'amenities' : s.layout === 'neighborhood' ? 'location' : s.layout === 'payment' && s.cards.length ? 'payment payment--with-facts' : s.layout
    return `<section class="slide ${esc(layoutClass)} ${theme}">${content}<footer class="footer"><span class="brand">SellYour<span>Brick</span></span><span class="page-number">${String(index + 1).padStart(2, '0')} / ${String(report.slides.length).padStart(2, '0')}</span></footer></section>`
  })
  return `<!doctype html><html lang="${esc(report.language)}"><head><meta charset="utf-8"><title>${esc(property.title)} · SellYourBrick</title><style>${STYLE}</style></head><body>${slides.join('')}</body></html>`
}

export async function renderPropertyPresentationPdf(input) {
  const { default: puppeteer } = await import('puppeteer')
  const browser = await puppeteer.launch({ headless: true, ...resolvePropertyAiPuppeteerOptions(), args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 720 })
    await page.emulateMediaType('print')
    await page.setContent(renderPropertyPresentationHtml(input), { waitUntil: 'domcontentloaded', timeout: 30000 })
    await waitForPropertyAiImages(page)
    await page.evaluate(() => document.fonts.ready)
    return Buffer.from(await page.pdf({ printBackground: true, preferCSSPageSize: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } }))
  } finally { await browser.close() }
}
