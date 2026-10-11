import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = path.join(ROOT, 'docs', 'testing-users-3');
const OUTPUT_DIR = path.join(SOURCE_DIR, 'pdf');
const VARIANTS = [
  {
    sourceDir: SOURCE_DIR,
    outputDir: path.join(OUTPUT_DIR, 'Russian'),
    files: [
      '00-Общий-план-3-человека.txt',
      '01-Продавец-1.txt',
      '02-Покупатель-1.txt',
      '03-Покупатель-2.txt',
    ],
    generalLabel: 'ОБЩИЙ ПЛАН',
    personalLabel: 'ПЕРСОНАЛЬНЫЙ ЧЕК-ЛИСТ',
    subtitle: 'Пошаговая инструкция для ручного тестирования платформы',
    footer: 'SellYourBrick · План тестирования',
  },
  {
    sourceDir: path.join(SOURCE_DIR, 'en'),
    outputDir: path.join(OUTPUT_DIR, 'English'),
    files: [
      '00-Group-Plan-3-People.txt',
      '01-Seller-1.txt',
      '02-Buyer-1.txt',
      '03-Buyer-2.txt',
    ],
    generalLabel: 'GENERAL PLAN',
    personalLabel: 'PERSONAL CHECKLIST',
    subtitle: 'Step-by-step instructions for manual platform testing',
    footer: 'SellYourBrick · Testing plan',
  },
  {
    sourceDir: path.join(SOURCE_DIR, 'es'),
    outputDir: path.join(OUTPUT_DIR, 'Spanish'),
    files: [
      '00-Plan-General-3-Personas.txt',
      '01-Vendedor-1.txt',
      '02-Comprador-1.txt',
      '03-Comprador-2.txt',
    ],
    generalLabel: 'PLAN GENERAL',
    personalLabel: 'LISTA PERSONAL',
    subtitle: 'Instrucciones paso a paso para las pruebas manuales de la plataforma',
    footer: 'SellYourBrick · Plan de pruebas',
  },
];

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

function renderLine(line, index, lines) {
  const text = line.trim();
  if (!text) return '<div class="spacer"></div>';
  const isSection =
    /^\d+\.\s+\S/.test(text) &&
    (index === 0 || !lines[index - 1].trim()) &&
    (index === lines.length - 1 || !lines[index + 1].trim());
  if (isSection) {
    const [, number, title] = text.match(/^(\d+)\.\s+(.+)$/);
    return `<h2><span>${number}</span>${escapeHtml(title)}</h2>`;
  }
  if (text.startsWith('[ ] ')) {
    return `<div class="check"><span class="box"></span><span>${escapeHtml(text.slice(4))}</span></div>`;
  }
  if (text.startsWith('- ')) {
    return `<div class="bullet"><span></span><div>${escapeHtml(text.slice(2))}</div></div>`;
  }
  const numbered = text.match(/^(\d+)\.\s+(.+)$/);
  if (numbered) {
    return `<div class="step"><span>${numbered[1]}</span><div>${escapeHtml(numbered[2])}</div></div>`;
  }
  if (/^(Тестовая карта|Test card|Tarjeta de prueba):/i.test(text)) {
    const [label, ...value] = text.split(':');
    return `<div class="callout"><strong>${escapeHtml(label)}</strong><div>${escapeHtml(value.join(':').trim())}</div></div>`;
  }
  if (/^(Готово|Complete|Completado),/i.test(text)) {
    return `<div class="success">${escapeHtml(text)}</div>`;
  }
  if (/^(Важно|Important|Importante):/i.test(text)) {
    return `<div class="notice">${escapeHtml(text)}</div>`;
  }
  return `<p>${escapeHtml(text)}</p>`;
}

function buildHtml(source, filename, variant) {
  const lines = source.replaceAll('\r\n', '\n').split('\n');
  const title = lines.shift()?.trim() || 'План тестирования';
  const body = lines.map((line, index) => renderLine(line, index, lines)).join('\n');
  const isOverview = filename.startsWith('00-');
  const label = isOverview ? variant.generalLabel : variant.personalLabel;

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --surface: #ffffff;
      --muted: #f8fafc;
      --warm: #f4f7f5;
      --ink: #0f172a;
      --soft: #475569;
      --quiet: #64748b;
      --line: #e2e8f0;
      --tiffany: #0099a9;
      --tiffany-dark: #007d8a;
      --tiffany-soft: #f0fafb;
    }
    * { box-sizing: border-box; }
    html { color: var(--ink); background: var(--surface); }
    body {
      margin: 0;
      font-family: "Avenir Next", Montserrat, Arial, sans-serif;
      font-size: 10.2pt;
      line-height: 1.58;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .hero {
      position: relative;
      margin: 0 0 12mm;
      padding: 14mm 14mm 12mm;
      border: 1px solid var(--line);
      border-top: 4mm solid var(--tiffany);
      border-radius: 5mm;
      background: var(--surface);
      break-inside: avoid;
    }
    .brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 13mm;
      font-size: 7.6pt;
      font-weight: 750;
      letter-spacing: .16em;
      text-transform: uppercase;
      color: var(--tiffany-dark);
    }
    .mark {
      width: 8mm;
      height: 8mm;
      border-radius: 50%;
      background: var(--tiffany);
      color: white;
      display: inline-grid;
      place-items: center;
      letter-spacing: 0;
      font-size: 8pt;
    }
    h1 {
      max-width: 155mm;
      margin: 0;
      font-family: "Iowan Old Style", "Playfair Display", Georgia, serif;
      font-size: 27pt;
      line-height: 1.08;
      font-style: italic;
      letter-spacing: .01em;
      color: var(--ink);
    }
    .subtitle {
      margin-top: 6mm;
      max-width: 130mm;
      color: var(--soft);
      font-size: 10.5pt;
    }
    main { padding: 0 1mm; }
    h2 {
      display: flex;
      align-items: center;
      gap: 4mm;
      margin: 10mm 0 4mm;
      padding-top: 3mm;
      border-top: 1px solid var(--line);
      font-family: "Iowan Old Style", "Playfair Display", Georgia, serif;
      font-size: 17pt;
      line-height: 1.2;
      font-style: italic;
      color: var(--ink);
      break-after: avoid;
    }
    h2 span {
      display: inline-grid;
      place-items: center;
      min-width: 8mm;
      height: 8mm;
      border-radius: 50%;
      background: var(--tiffany);
      color: white;
      font: 700 8.5pt/1 "Avenir Next", Arial, sans-serif;
    }
    p {
      margin: 0 0 3.4mm;
      color: var(--soft);
      orphans: 3;
      widows: 3;
    }
    .spacer { height: 1.5mm; }
    .check, .bullet, .step {
      display: grid;
      grid-template-columns: 6mm 1fr;
      gap: 2.5mm;
      align-items: start;
      margin: 0 0 2.3mm;
      break-inside: avoid;
    }
    .box {
      width: 4.3mm;
      height: 4.3mm;
      margin-top: 1mm;
      border: 1.2pt solid var(--tiffany-dark);
      border-radius: 1mm;
      background: white;
    }
    .bullet > span {
      width: 2mm;
      height: 2mm;
      margin: 2.2mm 0 0 1.2mm;
      border-radius: 50%;
      background: var(--tiffany);
    }
    .step > span {
      display: inline-grid;
      place-items: center;
      width: 5mm;
      height: 5mm;
      border: 1px solid var(--line);
      border-radius: 50%;
      color: var(--tiffany-dark);
      font-size: 7.5pt;
      font-weight: 700;
    }
    .callout, .notice, .success {
      margin: 5mm 0;
      padding: 4.5mm 5mm;
      border-radius: 3mm;
      break-inside: avoid;
    }
    .callout {
      border-left: 1.2mm solid var(--tiffany);
      background: var(--tiffany-soft);
      color: var(--ink);
    }
    .callout strong {
      display: block;
      margin-bottom: 1mm;
      color: var(--tiffany-dark);
      font-size: 8pt;
      letter-spacing: .1em;
      text-transform: uppercase;
    }
    .notice {
      border: 1px solid #d9e6e8;
      background: var(--warm);
      color: var(--soft);
    }
    .success {
      border: 1px solid rgba(0,153,169,.35);
      background: var(--tiffany-soft);
      color: var(--tiffany-dark);
      font-weight: 700;
    }
    @page { size: A4; margin: 15mm 16mm 19mm; }
  </style>
</head>
<body>
  <header class="hero">
    <div class="brand"><span>SellYourBrick</span><span class="mark">SYB</span></div>
    <div class="brand">${label}</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="subtitle">${escapeHtml(variant.subtitle)}</div>
  </header>
  <main>${body}</main>
</body>
</html>`;
}

const browser = await puppeteer.launch({ headless: true });

try {
  for (const variant of VARIANTS) {
    await fs.mkdir(variant.outputDir, { recursive: true });
    for (const filename of variant.files) {
      const source = await fs.readFile(path.join(variant.sourceDir, filename), 'utf8');
      const pdfPath = path.join(variant.outputDir, filename.replace(/\.txt$/i, '.pdf'));
      const page = await browser.newPage();
      await page.setContent(buildHtml(source, filename, variant), { waitUntil: 'networkidle0' });
      await page.emulateMediaType('print');
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="width:100%;padding:0 16mm;color:#64748b;font:8px Arial,sans-serif;display:flex;justify-content:space-between;">
            <span>${escapeHtml(variant.footer)}</span>
            <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
          </div>`,
        margin: { top: '15mm', right: '16mm', bottom: '19mm', left: '16mm' },
        preferCSSPageSize: true,
      });
      await page.close();
      console.log(path.relative(ROOT, pdfPath));
    }
  }
} finally {
  await browser.close();
}
