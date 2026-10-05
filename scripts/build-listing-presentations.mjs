/**
 * Презентации объектов в формате панели инвестора (tiffany-canva-ai-v3),
 * со структурой investment-брошюр Максима (cover → overview → location → gallery → deal → CTA).
 *
 * Usage:
 *   node scripts/build-listing-presentations.mjs
 *   node scripts/build-listing-presentations.mjs --ids 83,84,86,53
 *   node scripts/build-listing-presentations.mjs --html-only
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { normalizePropertyAiReport } from '../server/services/propertyAiReportContract.js';
import {
  renderPropertyAiReportHtml,
  renderPropertyAiReportPdf,
} from '../server/services/propertyAiPdfRenderer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'presentations', 'property-decks');
const API = (process.env.PRODUCTION_API_BASE || 'https://sellyourbrick.com/api').replace(/\/$/, '');
const HTML_ONLY = process.argv.includes('--html-only');

const DEFAULT_IDS = [83, 84, 86, 53, 47];
const idsArg = process.argv.includes('--ids')
  ? (process.argv[process.argv.indexOf('--ids') + 1] || '')
      .split(',')
      .map((x) => parseInt(x.trim(), 10))
      .filter(Boolean)
  : DEFAULT_IDS;

function parsePhotos(raw) {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function eur(n) {
  const amount = Number(n);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

function buildMaximStyleSlides(p, images) {
  const emptyChart = { type: 'none', title: '', unit: '', caption: '', labels: [], series: [] };
  const base = (slide) => ({ kicker: '', body: '', bullets: [], cards: [], chart: emptyChart, imageIndices: [], ...slide });
  const beds = p.bedrooms ?? p.rooms;
  const isCommercial = p.property_type === 'commercial';
  const typeLabel = isCommercial ? 'hotel / commercial' : p.building_type || p.property_type || 'property';

  const coverTitle = isCommercial
    ? `Investment Opportunity:\n${p.title}`
    : `Own a Luxury ${typeLabel === 'apartment' ? 'Apartment' : 'Villa'}\nin ${p.city || 'Tenerife'}`;

  const coverBody = isCommercial
    ? `A rare income-oriented asset in ${p.city || 'Tenerife'}: ${p.rooms || 27} units across ${p.area || '—'} m², offered via auction with fixed buy-now on SellYourBrick.`
    : `Imagine owning a ${beds || ''}-bedroom ${typeLabel} in ${p.city || 'Tenerife'}. ${p.area || '—'} m² living space${p.land_area ? `, plot ${p.land_area} m²` : ''} — luxury lifestyle with a clear auction / buy-now path.`;

  const overviewCards = [
    { title: 'Buy now', value: eur(p.price), body: 'Fixed price on SellYourBrick', icon: 'price', tone: 'tiffany' },
    {
      title: isCommercial ? 'Units / rooms' : 'Bedrooms',
      value: String(beds ?? p.rooms ?? '—'),
      body: isCommercial ? 'Apartment inventory' : 'Sleeping rooms',
      icon: 'rooms',
      tone: 'cream',
    },
    {
      title: 'Area',
      value: p.area != null ? `${p.area}` : '—',
      body: p.living_area ? `Living ${p.living_area} m²` : 'Total area, m²',
      icon: 'area',
      tone: 'cream',
    },
    {
      title: 'Auction start',
      value: eur(p.auction_starting_price),
      body: `Min sale ${eur(p.minimum_sale_price)}`,
      icon: 'key',
      tone: 'ink',
    },
  ];

  const locationBullets = [
    `${p.address || p.city || 'Tenerife'}, Spain`,
    p.city === 'Adeje' || /adeje|callao|caleta/i.test(`${p.address} ${p.city}`)
      ? 'South Tenerife lifestyle belt — near Costa Adeje / Callao Salvaje amenities'
      : 'Southern Tenerife — golf, airport access, year-round climate',
    p.test_drive ? 'Test drive available before purchase decision' : 'Documents pack attached on the listing',
    'Pinned map coordinates on the live listing for due diligence',
  ];

  const featureBullets = [
    p.bathrooms ? `${p.bathrooms} bathrooms` : null,
    p.floors || p.total_floors ? `${p.floors || p.total_floors} floors` : null,
    p.year_built ? `Built / estimated ${p.year_built}` : null,
    p.pool ? 'Swimming pool' : null,
    p.garden ? 'Garden' : null,
    p.parking || p.garage ? 'Parking / garage' : null,
    p.land_area ? `Plot ${p.land_area} m²` : null,
    'Auction + Buy now sale format',
  ].filter(Boolean);

  const desc = String(p.description || '')
    .replace(/\s+/g, ' ')
    .replace(/Источник:.*$/i, '')
    .trim()
    .slice(0, 520);

  const slides = [
    base({
      layout: 'cover',
      kicker: 'INVESTMENT OPPORTUNITY · SELLYOURBRICK',
      title: coverTitle.replace(/\n/g, ' '),
      body: coverBody,
      imageIndices: images[0] ? [0] : [],
    }),
    base({
      layout: 'stats',
      kicker: 'INVESTMENT OVERVIEW',
      title: 'Key figures at a glance',
      body: 'Core numbers from the listing — price path, size and inventory.',
      cards: overviewCards,
      imageIndices: images[1] ? [1] : images[0] ? [0] : [],
    }),
    base({
      layout: 'photo_statement',
      kicker: 'THE OPPORTUNITY',
      title: p.title,
      body: desc || coverBody,
      imageIndices: images[2] ? [2] : images[0] ? [0] : [],
    }),
    base({
      layout: 'split',
      kicker: 'PRIME LOCATION',
      title: `${p.city || 'Tenerife'}, Spain`,
      body: 'Location and access for lifestyle buyers and investors.',
      bullets: locationBullets,
      imageIndices: images[3] ? [3] : images[0] ? [0] : [],
    }),
    ...(images.length > 1
      ? [
          base({
            layout: 'gallery',
            kicker: 'PROPERTY PHOTOGRAPHY',
            title: 'Selected views of the asset',
            imageIndices: images.map((_, i) => i).slice(0, 4),
          }),
        ]
      : []),
    base({
      layout: 'comparison',
      kicker: 'WHY THIS LISTING',
      title: 'Strengths and points to verify',
      cards: [
        {
          title: 'Strengths',
          body: [
            `${eur(p.price)} buy-now clarity`,
            featureBullets.slice(0, 3).join('\n') || 'Curated Tenerife asset',
            images.length ? `${images.length}+ listing photos` : 'Listing dossier ready',
            p.test_drive ? 'Test drive enabled' : 'Auction + buy-now dual path',
          ].join('\n'),
          icon: 'check',
          tone: 'cream',
        },
        {
          title: 'Verify before close',
          body: [
            'Ownership & no-debt documents on listing',
            'Confirm utilities, community fees, VV licence if needed',
            'On-site / test-drive inspection',
            'Compare with nearby South Tenerife comps',
          ].join('\n'),
          icon: 'shield',
          tone: 'ink',
        },
      ],
    }),
    base({
      layout: 'timeline',
      kicker: 'DEAL PATH',
      title: 'How to proceed on SellYourBrick',
      cards: [
        { title: 'Review', value: '01', body: 'Open the live listing, gallery, map pin and documents.', icon: 'document', tone: 'white' },
        { title: 'Experience', value: '02', body: p.test_drive ? 'Book a test drive or private viewing.' : 'Request a private viewing with the seller.', icon: 'home', tone: 'cream' },
        { title: 'Transact', value: '03', body: `Bid from ${eur(p.auction_starting_price)} or buy now for ${eur(p.price)}.`, icon: 'key', tone: 'tiffany' },
        { title: 'Close', value: '04', body: 'Complete KYC, contract and secure settlement.', icon: 'shield', tone: 'ink' },
      ],
    }),
    base({
      layout: 'conclusion',
      kicker: 'NEXT STEP',
      title: 'Open the listing and take the first action',
      body: `OB-${p.id} · ${p.address || p.city || 'Tenerife'} · Buy now ${eur(p.price)}. Auction start ${eur(p.auction_starting_price)}, minimum ${eur(p.minimum_sale_price)}.`,
      bullets: featureBullets.slice(0, 4),
      imageIndices: images[0] ? [0] : [],
    }),
  ];

  return slides;
}

async function fetchProperty(id) {
  // Prefer user portfolio then auctions list match
  const auctions = await fetch(`${API}/properties/auctions?limit=100`).then((r) => r.json());
  let p = (auctions.data || []).find((x) => Number(x.id) === Number(id));
  if (!p) {
    const user = await fetch(`${API}/properties/user/42`).then((r) => r.json());
    p = (user.data || []).find((x) => Number(x.id) === Number(id));
  }
  if (!p) throw new Error(`Property ${id} not found on production`);
  return p;
}

function toContextProperty(p, images) {
  return {
    title: p.title,
    name: p.title,
    price: p.price,
    currency: p.currency || 'EUR',
    area: p.area,
    rooms: p.rooms || p.bedrooms,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    floor: p.floor,
    total_floors: p.total_floors || p.floors,
    year_built: p.year_built,
    location: [p.address, p.city, p.country || 'Spain'].filter(Boolean).join(', '),
    coordinates: p.coordinates,
    images,
    condition: p.condition,
    renovation: p.renovation,
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const indexItems = [];

  for (const id of idsArg) {
    console.log(`\n→ Building presentation for #${id}`);
    const p = await fetchProperty(id);
    const images = parsePhotos(p.photos).slice(0, 6);
    const slides = buildMaximStyleSlides(
      {
        ...p,
        floors: p.total_floors || p.floors,
      },
      images
    );

    const report = normalizePropertyAiReport(
      {
        title: p.title,
        summary: slides[0]?.body || '',
        directAnswer: slides[2]?.body || '',
        conclusion: slides[slides.length - 1]?.body || '',
        strengths: [],
        risks: [],
        metrics: [],
        slides,
      },
      {
        category: 'details',
        question: 'Investment presentation',
        property: toContextProperty(p, images),
      }
    );

    // Keep our Maxim-style slides (normalize may append fallback if too few — we send enough)
    report.slides = slides;
    report.pages = slides;
    report.images = images;
    report.title = p.title;
    report.disclaimer =
      'Presentation generated for SellYourBrick listing dossier. Figures follow the published listing. Not a formal valuation or legal advice.';

    const property = {
      title: p.title,
      location: [p.address, p.city, 'Spain'].filter(Boolean).join(', '),
      price: p.price,
      currency: 'EUR',
      area: p.area,
      rooms: p.bedrooms || p.rooms,
    };

    const html = renderPropertyAiReportHtml({
      report,
      property,
      mediaBaseUrl: 'https://sellyourbrick.com/',
    });

    const stem = `${id}-${String(p.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48)}`;
    const htmlPath = path.join(OUT_DIR, `${stem}.html`);
    fs.writeFileSync(htmlPath, html);
    console.log('  HTML', htmlPath);

    let pdfPath = null;
    if (!HTML_ONLY) {
      try {
        const pdf = await renderPropertyAiReportPdf({ report, property });
        pdfPath = path.join(OUT_DIR, `${stem}.pdf`);
        fs.writeFileSync(pdfPath, pdf);
        console.log('  PDF ', pdfPath, `(${Math.round(pdf.length / 1024)} KB)`);
      } catch (e) {
        console.warn('  PDF failed:', e.message);
      }
    }

    indexItems.push({
      id,
      title: p.title,
      price: p.price,
      html: path.basename(htmlPath),
      pdf: pdfPath ? path.basename(pdfPath) : null,
      slides: slides.length,
    });
  }

  const indexHtml = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SellYourBrick · Listing presentations</title>
<style>
body{margin:0;font-family:Arial,sans-serif;background:#f5f0e8;color:#12343b;padding:40px 24px}
.wrap{max-width:820px;margin:0 auto}
h1{font-family:Georgia,serif;font-weight:400;font-size:34px;margin:0 0 10px}
.lead{color:#71878a;line-height:1.5;max-width:640px}
.note{margin:18px 0 28px;padding:14px 16px;background:#e9f8f7;border-left:4px solid #4ecdd6;font-size:14px;line-height:1.45}
ul{list-style:none;padding:0;margin:0}
li{background:#fff;border:1px solid #d8e3df;border-radius:12px;padding:16px 18px;margin:0 0 12px}
li strong{display:block;font-size:16px;margin-bottom:6px}
a{color:#107b85;font-weight:700;margin-right:14px}
.meta{color:#71878a;font-size:13px;margin-top:6px}
</style></head><body><div class="wrap">
<h1>Презентации объектов</h1>
<p class="lead">Формат визуала — как в панели инвестора (tiffany-canva-ai-v3, A4 landscape). Структура слайдов — как у investment-брошюр Максима: cover → overview → opportunity → location → gallery → verify → deal path → CTA.</p>
<div class="note">Источник шаблона: <code>server/services/propertyAiPdfRenderer.js</code>. Референс структуры: PDF Максима (Jardin de Armeñime, La Ola, Callao Salvaje villa, Alcalá).</div>
<ul>
${indexItems
  .map(
    (item) => `<li>
  <strong>${item.title}</strong>
  <div>
    <a href="./${item.html}">HTML</a>
    ${item.pdf ? `<a href="./${item.pdf}">PDF</a>` : '<span class="meta">PDF не собран</span>'}
  </div>
  <div class="meta">OB-${item.id} · €${Number(item.price).toLocaleString('en-US')} · ${item.slides} slides</div>
</li>`
  )
  .join('')}
</ul>
</div></body></html>`;

  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexHtml);
  console.log('\nIndex:', path.join(OUT_DIR, 'index.html'));
  console.log('Done:', indexItems.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
