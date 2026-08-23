import fs from 'node:fs/promises';
import path from 'node:path';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const ROOT = '/Users/vtichonenko/newsellyourbrick';
const BUILD = path.join(ROOT, 'audit/visual-brandbook-build');
const OUT = path.join(ROOT, 'audit/visual-brandbook');
const PPTX = path.join(OUT, 'SellYourBrick-Visual-Brandbook.pptx');
const PREVIEW = path.join(OUT, 'SellYourBrick-Visual-Brandbook-preview.webp');

const W = 1280;
const H = 720;
const M = 64;

const C = {
  tiffany: '#0099A9',
  tiffanyDark: '#007D8A',
  tiffanyDeep: '#006672',
  tiffanyLight: '#4ECDD6',
  tiffanySoft: '#F0FAFB',
  ink: '#0F172A',
  ink2: '#111827',
  inkSoft: '#475569',
  muted: '#64748B',
  subtle: '#94A3B8',
  line: '#E2E8F0',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  red: '#B91C1C',
  amber: '#B45309',
  green: '#15803D',
};

const FONT = 'Montserrat';
const SERIF = 'Playfair Display';

const assets = {
  cover: 'public/images/sellyourbrick/about/about-hero-spain.jpg',
  villa: 'public/images/sellyourbrick/about/mission-villa.jpg',
  strategyAuction: 'public/images/sellyourbrick/strategies/strategy-auction.jpg',
  strategyBuy: 'public/images/sellyourbrick/strategies/strategy-buy-now.jpg',
  strategyDebts: 'public/images/sellyourbrick/strategies/strategy-debts.jpg',
  strategyShares: 'public/images/sellyourbrick/strategies/strategy-shares.jpg',
  testDrivePhoto: 'public/images/test-drive/hero-resort-mobile.png',
  newsArt: 'public/news/news-mobile-sky-v2.png',
  auction: 'audit/mobile/screenshots/03-auction.png',
  shares: 'audit/mobile/screenshots/04-shares.png',
  debts: 'audit/mobile/screenshots/05-debts.png',
  testDrive: 'audit/mobile/screenshots/06-test-drive.png',
  smartInvestor: 'audit/mobile/screenshots/10-smart-investor.png',
  favorites: 'audit/mobile/screenshots/12-favorites.png',
  deposit: 'audit/mobile/screenshots/13-deposit.png',
  property: 'audit/mobile/screenshots/14-property.png',
  about: 'audit/mobile/screenshots/08-about.png',
  news: 'audit/mobile/screenshots/09-news.png',
};

const mimeFor = (p) => p.endsWith('.png') ? 'image/png' : p.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
const abs = (p) => path.join(ROOT, p);

async function bytes(rel) {
  return new Uint8Array(await fs.readFile(abs(rel)));
}

async function addImage(slide, rel, position, options = {}) {
  return slide.images.add({
    blob: await bytes(rel),
    contentType: mimeFor(rel),
    alt: options.alt || path.basename(rel),
    fit: options.fit || 'cover',
    position,
    geometry: options.geometry || 'rect',
    ...(options.borderRadius ? { borderRadius: options.borderRadius } : {}),
    ...(options.crop ? { crop: options.crop } : {}),
  });
}

function rect(slide, x, y, w, h, fill, radius = 0, line = 'none', name) {
  return slide.shapes.add({
    geometry: radius ? 'roundRect' : 'rect',
    name,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: line === 'none' ? { style: 'solid', fill: 'none', width: 0 } : line,
    ...(radius ? { borderRadius: radius } : {}),
  });
}

function text(slide, value, x, y, w, h, size, color = C.ink, opts = {}) {
  const s = slide.shapes.add({
    geometry: 'textbox',
    name: opts.name,
    position: { left: x, top: y, width: w, height: h },
    fill: 'none',
    line: { style: 'solid', fill: 'none', width: 0 },
  });
  s.text = value;
  s.text.style = {
    fontSize: size,
    typeface: opts.typeface || FONT,
    color,
    bold: opts.bold || false,
    italic: opts.italic || false,
    alignment: opts.align || 'left',
    verticalAlignment: opts.valign || 'top',
    autoFit: opts.autoFit || 'shrinkText',
    lineSpacing: opts.lineSpacing || 1.05,
    insets: opts.insets || { top: 0, right: 0, bottom: 0, left: 0 },
  };
  return s;
}

function line(slide, x, y, w, color = C.line, weight = 1) {
  return slide.shapes.add({
    geometry: 'line',
    position: { left: x, top: y, width: w, height: 0 },
    fill: 'none',
    line: { style: 'solid', fill: color, width: weight },
  });
}

function kicker(slide, value, x = M, y = 44, color = C.tiffanyDark) {
  return text(slide, value.toUpperCase(), x, y, 440, 22, 14, color, { bold: true });
}

function title(slide, value, y = 78, color = C.ink, width = 950, size = 48) {
  return text(slide, value, M, y, width, 82, size, color, { bold: true, lineSpacing: 0.98 });
}

function footer(slide, n, light = false) {
  text(slide, 'SELLYOURBRICK  •  VISUAL BRAND SYSTEM', M, 686, 540, 16, 10, light ? '#FFFFFF/62' : C.subtle, { bold: true });
  text(slide, String(n).padStart(2, '0'), 1168, 682, 48, 20, 12, light ? '#FFFFFF/62' : C.subtle, { bold: true, align: 'right' });
}

function notes(slide, lines) {
  slide.speakerNotes.textFrame.setText(`[Sources]\n${lines.map((s) => `- ${s}`).join('\n')}`);
}

function logo(slide, x, y, scale = 1, light = false) {
  const color = light ? C.surface : C.ink;
  const fs = 46 * scale;
  const h = 58 * scale;
  const w1 = 104 * scale;
  const w2 = 110 * scale;
  text(slide, 'Sell', x, y, w1, h, fs, color, { bold: true, valign: 'middle' });
  rect(slide, x + w1 - 4 * scale, y + 2 * scale, w2, h - 4 * scale, C.tiffany, 18 * scale);
  text(slide, 'Your', x + w1 + 2 * scale, y, w2 - 4 * scale, h, fs, C.surface, { bold: true, align: 'center', valign: 'middle' });
  text(slide, 'Brick', x + w1 + w2 + 3 * scale, y, 128 * scale, h, fs, color, { bold: true, valign: 'middle' });
}

function phoneFrame(slide, x, y, w, h) {
  rect(slide, x - 8, y - 8, w + 16, h + 16, C.ink2, 34, 'none');
  rect(slide, x + w * 0.36, y - 2, w * 0.28, 11, C.ink2, 6, 'none');
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  await fs.mkdir(path.join(BUILD, 'renders'), { recursive: true });

  const deck = Presentation.create({ slideSize: { width: W, height: H } });

  // 1 — Cover
  {
    const s = deck.slides.add();
    s.background.fill = C.ink;
    await addImage(s, assets.cover, { left: 0, top: 0, width: W, height: H }, { alt: 'Современная недвижимость в Испании' });
    rect(s, 0, 0, W, H, 'linear(90deg, #0F172A/94 0%, #0F172A/76 42%, #0F172A/18 100%)');
    logo(s, M, 64, 0.85, true);
    text(s, 'ВИЗУАЛЬНЫЙ\nБРЕНДБУК', M, 230, 660, 170, 72, C.surface, { bold: true, lineSpacing: 0.9 });
    text(s, 'Недвижимость. Ясные цифры. Один Tiffany-акцент.', M, 430, 590, 48, 23, '#FFFFFF/82', { bold: false });
    rect(s, M, 520, 186, 48, C.surface, 24);
    text(s, 'BRAND SYSTEM 1.0', M, 520, 186, 48, 13, C.ink, { bold: true, align: 'center', valign: 'middle' });
    text(s, '2026', 1140, 650, 76, 24, 14, '#FFFFFF/70', { bold: true, align: 'right' });
    notes(s, [assets.cover, 'audit/mobile/BRANDBOOK.md']);
  }

  // 2 — Brand idea
  {
    const s = deck.slides.add();
    s.background.fill = C.surfaceMuted;
    kicker(s, '01 / характер бренда');
    title(s, 'Спокойная премиальность, которой верят');
    await addImage(s, assets.villa, { left: 64, top: 188, width: 590, height: 442 }, { geometry: 'roundRect', borderRadius: 28, alt: 'Вилла — основной образ бренда' });
    rect(s, 684, 190, 532, 126, C.surface, 24, { style: 'solid', fill: C.line, width: 1 });
    text(s, 'РЕАЛЬНАЯ НЕДВИЖИМОСТЬ', 716, 218, 448, 26, 16, C.tiffanyDark, { bold: true });
    text(s, 'Фотография создаёт желание и доверие.', 716, 254, 448, 38, 24, C.ink, { bold: true });
    rect(s, 684, 334, 532, 126, C.surface, 24, { style: 'solid', fill: C.line, width: 1 });
    text(s, 'ЯСНЫЕ ЦИФРЫ', 716, 362, 448, 26, 16, C.tiffanyDark, { bold: true });
    text(s, 'Цена, риск и действие видны сразу.', 716, 398, 448, 38, 24, C.ink, { bold: true });
    rect(s, 684, 478, 532, 126, C.ink, 24);
    text(s, 'ОДИН АКЦЕНТ', 716, 506, 448, 26, 16, C.tiffanyLight, { bold: true });
    text(s, 'Tiffany направляет, а не шумит.', 716, 542, 448, 38, 24, C.surface, { bold: true });
    footer(s, 2);
    notes(s, [assets.villa, 'audit/mobile/BRANDBOOK.md']);
  }

  // 3 — Logo system
  {
    const s = deck.slides.add();
    s.background.fill = C.surface;
    kicker(s, '02 / логотип');
    title(s, 'Your — единственное слово, которое получает цвет');
    logo(s, 86, 224, 1.42, false);
    line(s, 86, 346, 1100, C.line, 1);
    rect(s, 64, 390, 558, 214, C.ink, 28);
    logo(s, 114, 452, 0.86, true);
    text(s, 'На фотографии и тёмной поверхности', 114, 546, 410, 30, 16, '#FFFFFF/70');
    rect(s, 658, 390, 558, 214, C.tiffanySoft, 28);
    logo(s, 708, 452, 0.86, false);
    text(s, 'На светлом редакционном холсте', 708, 546, 410, 30, 16, C.muted);
    text(s, 'Не менять регистр: Sell Your Brick — логотип, SellYourBrick — текстовое имя продукта.', 86, 636, 1080, 28, 16, C.inkSoft);
    footer(s, 3);
    notes(s, ['audit/mobile/BRANDBOOK.md']);
  }

  // 4 — Palette
  {
    const s = deck.slides.add();
    s.background.fill = C.surface;
    kicker(s, '03 / цвет');
    title(s, 'Tiffany узнаваем, когда его немного');
    const swatches = [
      [C.tiffany, 'BRAND TIFFANY', '#0099A9', C.surface],
      [C.tiffanyDark, 'ACCESSIBLE CTA', '#007D8A', C.surface],
      [C.tiffanyDeep, 'PRESSED / DEEP', '#006672', C.surface],
      [C.tiffanyLight, 'DECORATIVE LIGHT', '#4ECDD6', C.ink],
      [C.tiffanySoft, 'SOFT SURFACE', '#F0FAFB', C.ink],
    ];
    const gap = 14;
    const sw = (W - 2 * M - 4 * gap) / 5;
    swatches.forEach(([fill, label, hex, fg], i) => {
      const x = M + i * (sw + gap);
      rect(s, x, 206, sw, 296, fill, 24);
      text(s, label, x + 18, 394, sw - 36, 38, 13, fg, { bold: true });
      text(s, hex, x + 18, 446, sw - 36, 30, 20, fg, { bold: true });
    });
    text(s, 'INK', 70, 548, 110, 24, 13, C.muted, { bold: true });
    text(s, '#0F172A', 70, 580, 140, 26, 21, C.ink, { bold: true });
    text(s, 'SURFACE', 300, 548, 110, 24, 13, C.muted, { bold: true });
    text(s, '#FFFFFF', 300, 580, 140, 26, 21, C.ink, { bold: true });
    text(s, 'LINE', 530, 548, 110, 24, 13, C.muted, { bold: true });
    text(s, '#E2E8F0', 530, 580, 140, 26, 21, C.ink, { bold: true });
    rect(s, 788, 538, 428, 82, C.ink, 20);
    text(s, 'Правило: один цветовой акцент на блок', 820, 563, 364, 30, 20, C.surface, { bold: true, valign: 'middle' });
    footer(s, 4);
    notes(s, ['audit/mobile/BRANDBOOK.md']);
  }

  // 5 — Contrast
  {
    const s = deck.slides.add();
    s.background.fill = C.surfaceMuted;
    kicker(s, '04 / доступность');
    title(s, 'Один Tiffany — разные роли');
    rect(s, 64, 204, 352, 330, C.tiffanyLight, 28);
    text(s, 'НЕ ТАК', 92, 236, 120, 22, 14, C.red, { bold: true });
    text(s, 'Белый текст', 92, 330, 296, 58, 40, C.surface, { bold: true });
    text(s, '1.90 : 1', 92, 420, 240, 36, 26, C.surface, { bold: true });
    text(s, '#4ECDD6 + white', 92, 472, 260, 26, 15, C.surface);
    rect(s, 452, 204, 352, 330, C.tiffanyDark, 28);
    text(s, 'ТАК', 480, 236, 120, 22, 14, C.surface, { bold: true });
    text(s, 'Белый текст', 480, 330, 296, 58, 40, C.surface, { bold: true });
    text(s, '4.88 : 1', 480, 420, 240, 36, 26, C.surface, { bold: true });
    text(s, '#007D8A + white', 480, 472, 260, 26, 15, '#FFFFFF/82');
    rect(s, 840, 204, 376, 330, C.tiffanyLight, 28);
    text(s, 'ЕЩЁ ЛУЧШЕ', 868, 236, 160, 22, 14, C.ink, { bold: true });
    text(s, 'Ink-текст', 868, 330, 310, 58, 40, C.ink, { bold: true });
    text(s, '9.37 : 1', 868, 420, 240, 36, 26, C.ink, { bold: true });
    text(s, '#4ECDD6 + ink', 868, 472, 260, 26, 15, C.inkSoft);
    text(s, 'Tiffany Light — декор. Tiffany Dark — интерактив. Ink — основной текст.', 64, 582, 1050, 36, 24, C.ink, { bold: true });
    footer(s, 5);
    notes(s, ['audit/mobile/BRANDBOOK.md']);
  }

  // 6 — Typography
  {
    const s = deck.slides.add();
    s.background.fill = C.surface;
    kicker(s, '05 / типографика');
    title(s, 'Montserrat держит продукт собранным');
    text(s, 'Aa', 64, 190, 248, 148, 118, C.tiffany, { bold: true, lineSpacing: 0.8 });
    text(s, 'MONTSERRAT', 72, 342, 300, 28, 14, C.muted, { bold: true });
    text(s, 'Display / 800', 438, 198, 340, 44, 36, C.ink, { bold: true });
    text(s, 'Недвижимость без лишних барьеров', 438, 254, 720, 62, 32, C.ink, { bold: true });
    line(s, 438, 332, 718, C.line, 1);
    text(s, 'Title / 700', 438, 356, 340, 30, 18, C.tiffanyDark, { bold: true });
    text(s, 'Условия, доступность и прогноз видны до покупки', 438, 400, 720, 46, 24, C.ink, { bold: true });
    line(s, 438, 466, 718, C.line, 1);
    text(s, 'Body / 400', 438, 492, 340, 30, 18, C.tiffanyDark, { bold: true });
    text(s, 'Спокойный ритм, ясная формулировка и достаточно воздуха между строками.', 438, 534, 690, 62, 18, C.inkSoft, { lineSpacing: 1.35 });
    rect(s, 64, 424, 316, 176, C.ink, 24);
    text(s, 'Playfair Display', 90, 454, 260, 40, 30, C.surface, { typeface: SERIF, bold: true, italic: true });
    text(s, 'Только editorial: истории, журнал, манифест.', 90, 514, 250, 58, 16, '#FFFFFF/72', { lineSpacing: 1.3 });
    footer(s, 6);
    notes(s, ['audit/mobile/BRANDBOOK.md']);
  }

  // 7 — Graphic language
  {
    const s = deck.slides.add();
    s.background.fill = C.surfaceMuted;
    kicker(s, '06 / визуальный язык');
    title(s, 'Выделяем только то, что помогает решить');
    rect(s, 64, 198, 562, 428, C.ink, 30);
    text(s, 'ЧЕТЫРЕ', 100, 242, 234, 46, 38, C.surface, { bold: true });
    rect(s, 310, 238, 230, 52, C.tiffany, 18);
    text(s, 'СТРАТЕГИИ', 322, 238, 206, 52, 32, C.surface, { bold: true, align: 'center', valign: 'middle' });
    text(s, 'ПРОДАЖИ', 100, 304, 300, 46, 38, C.surface, { bold: true });
    text(s, '01  CAPS KICKER', 100, 390, 300, 24, 14, C.tiffanyLight, { bold: true });
    text(s, 'Одно ключевое слово получает Tiffany-плашку.', 100, 430, 450, 70, 24, C.surface, { bold: true, lineSpacing: 1.15 });
    rect(s, 100, 538, 410, 56, C.surface, 28);
    text(s, 'Смотреть объекты', 126, 538, 260, 56, 18, C.ink, { bold: true, valign: 'middle' });
    rect(s, 444, 544, 44, 44, C.tiffanyLight, 22);
    text(s, '↓', 444, 544, 44, 44, 20, C.ink, { bold: true, align: 'center', valign: 'middle' });
    await addImage(s, assets.about, { left: 676, top: 198, width: 244, height: 428 }, { geometry: 'roundRect', borderRadius: 28, alt: 'Фото-led mobile hero' });
    await addImage(s, assets.news, { left: 956, top: 198, width: 244, height: 428 }, { geometry: 'roundRect', borderRadius: 28, alt: 'Editorial mobile hero' });
    text(s, 'ФОТО + OVERLAY', 676, 638, 244, 24, 13, C.muted, { bold: true, align: 'center' });
    text(s, 'EDITORIAL', 956, 638, 244, 24, 13, C.muted, { bold: true, align: 'center' });
    footer(s, 7);
    notes(s, ['audit/mobile/BRANDBOOK.md', assets.about, assets.news]);
  }

  // 8 — Components
  {
    const s = deck.slides.add();
    s.background.fill = C.surface;
    kicker(s, '07 / компоненты');
    title(s, 'Один набор компонентов на весь путь');
    text(s, 'BUTTONS', 64, 192, 200, 24, 14, C.muted, { bold: true });
    rect(s, 64, 232, 304, 60, C.tiffanyDark, 30);
    text(s, 'Смотреть объекты  →', 64, 232, 304, 60, 18, C.surface, { bold: true, align: 'center', valign: 'middle' });
    rect(s, 392, 232, 304, 60, C.surface, 30, { style: 'solid', fill: C.ink, width: 2 });
    text(s, 'Сравнить объекты', 392, 232, 304, 60, 18, C.ink, { bold: true, align: 'center', valign: 'middle' });
    rect(s, 720, 232, 304, 60, C.tiffanyLight, 30);
    text(s, 'Рассчитать', 720, 232, 304, 60, 18, C.ink, { bold: true, align: 'center', valign: 'middle' });
    text(s, 'PROPERTY CARD', 64, 346, 240, 24, 14, C.muted, { bold: true });
    rect(s, 64, 386, 548, 218, C.surface, 24, { style: 'solid', fill: C.line, width: 1 });
    await addImage(s, assets.strategyAuction, { left: 64, top: 386, width: 230, height: 218 }, { geometry: 'roundRect', borderRadius: 24, alt: 'Фотография объекта в карточке' });
    text(s, 'АУКЦИОН ИДЁТ', 326, 408, 220, 22, 12, C.tiffanyDark, { bold: true });
    text(s, 'Вилла на побережье', 326, 446, 236, 46, 25, C.ink, { bold: true });
    text(s, 'Марбелья, Испания', 326, 505, 226, 26, 15, C.muted);
    text(s, '€248 000', 326, 552, 190, 30, 24, C.ink, { bold: true });
    text(s, 'STATUS', 672, 346, 200, 24, 14, C.muted, { bold: true });
    rect(s, 672, 386, 150, 42, '#DCFCE7', 21);
    text(s, 'Низкий риск', 672, 386, 150, 42, 14, C.green, { bold: true, align: 'center', valign: 'middle' });
    rect(s, 840, 386, 170, 42, '#FEF3C7', 21);
    text(s, 'Средний риск', 840, 386, 170, 42, 14, C.amber, { bold: true, align: 'center', valign: 'middle' });
    rect(s, 1028, 386, 154, 42, '#FEE2E2', 21);
    text(s, 'Высокий риск', 1028, 386, 154, 42, 14, C.red, { bold: true, align: 'center', valign: 'middle' });
    text(s, 'Форма следует задаче: status → объект → локация → цена → действие.', 672, 474, 500, 72, 24, C.ink, { bold: true, lineSpacing: 1.15 });
    text(s, 'Радиус 18 px  •  Touch 44 px  •  Border #E2E8F0  •  Одна primary CTA', 672, 566, 500, 30, 15, C.muted);
    footer(s, 8);
    notes(s, ['audit/mobile/BRANDBOOK.md', assets.strategyAuction]);
  }

  // 9 — Photography
  {
    const s = deck.slides.add();
    s.background.fill = C.ink;
    kicker(s, '08 / изображения', M, 44, C.tiffanyLight);
    title(s, 'Фотография создаёт премиальность', 78, C.surface, 980, 48);
    const gallery = [assets.strategyBuy, assets.strategyDebts, assets.strategyShares, assets.testDrivePhoto];
    const positions = [
      { left: 64, top: 194, width: 344, height: 420 },
      { left: 426, top: 194, width: 244, height: 200 },
      { left: 426, top: 414, width: 244, height: 200 },
      { left: 688, top: 194, width: 528, height: 420 },
    ];
    for (let i = 0; i < gallery.length; i++) {
      await addImage(s, gallery[i], positions[i], { geometry: 'roundRect', borderRadius: 24, alt: 'Фирменная фотография недвижимости и путешествия' });
    }
    rect(s, 714, 472, 460, 110, '#0F172A/76', 20);
    text(s, 'Свет, пространство, архитектура и реальный жизненный сценарий.', 742, 498, 406, 64, 24, C.surface, { bold: true, lineSpacing: 1.15 });
    footer(s, 9, true);
    notes(s, gallery);
  }

  // 10 — Mobile catalogue family
  {
    const s = deck.slides.add();
    s.background.fill = C.surfaceMuted;
    kicker(s, '09 / мобильная система');
    title(s, 'Разделы узнаются как одна семья');
    const shots = [assets.auction, assets.shares, assets.debts, assets.testDrive];
    const labels = ['АУКЦИОН', 'ДОЛИ', 'ДОЛГИ', 'ТЕСТ-ДРАЙВ'];
    const pw = 214;
    const ph = 464;
    for (let i = 0; i < 4; i++) {
      const x = 82 + i * 296;
      phoneFrame(s, x, 192, pw, ph);
      await addImage(s, shots[i], { left: x, top: 192, width: pw, height: ph }, { geometry: 'roundRect', borderRadius: 28, alt: `Мобильный экран ${labels[i]}` });
      text(s, labels[i], x, 670, pw, 20, 12, C.muted, { bold: true, align: 'center' });
    }
    footer(s, 10);
    notes(s, shots);
  }

  // 11 — Product surfaces
  {
    const s = deck.slides.add();
    s.background.fill = C.surface;
    kicker(s, '10 / продуктовые поверхности');
    title(s, 'Покупка, депозит и объект говорят одним языком');
    const shots = [assets.favorites, assets.deposit, assets.property];
    const labels = ['ПОНРАВИЛОСЬ', 'ДЕПОЗИТ', 'ОБЪЕКТ'];
    const sub = ['выбор и сравнение', 'ясные финансовые действия', 'ставка без потери контекста'];
    for (let i = 0; i < 3; i++) {
      const x = 126 + i * 382;
      phoneFrame(s, x, 190, 224, 484);
      await addImage(s, shots[i], { left: x, top: 190, width: 224, height: 484 }, { geometry: 'roundRect', borderRadius: 30, alt: `Продуктовый экран ${labels[i]}` });
      text(s, labels[i], x + 244, 222, 112, 22, 13, C.tiffanyDark, { bold: true });
      text(s, sub[i], x + 244, 258, 118, 86, 20, C.ink, { bold: true, lineSpacing: 1.12 });
    }
    footer(s, 11);
    notes(s, shots);
  }

  // 12 — Do / Don't + summary
  {
    const s = deck.slides.add();
    s.background.fill = C.ink;
    kicker(s, '11 / правило системы', M, 44, C.tiffanyLight);
    title(s, 'Один продукт — один характер', 78, C.surface, 860, 52);
    phoneFrame(s, 88, 194, 214, 464);
    await addImage(s, assets.auction, { left: 88, top: 194, width: 214, height: 464 }, { geometry: 'roundRect', borderRadius: 28, alt: 'Правильное направление — аукцион' });
    rect(s, 64, 174, 112, 40, C.green, 20);
    text(s, 'DO', 64, 174, 112, 40, 15, C.surface, { bold: true, align: 'center', valign: 'middle' });
    phoneFrame(s, 398, 194, 214, 464);
    await addImage(s, assets.smartInvestor, { left: 398, top: 194, width: 214, height: 464 }, { geometry: 'roundRect', borderRadius: 28, alt: 'Неподходящее направление — neon Smart Investor' });
    rect(s, 374, 174, 142, 40, C.red, 20);
    text(s, "DON'T", 374, 174, 142, 40, 15, C.surface, { bold: true, align: 'center', valign: 'middle' });
    text(s, 'DO', 684, 210, 92, 22, 14, C.tiffanyLight, { bold: true });
    text(s, 'Фото-led hero\nTiffany как навигация\nБелые поверхности\nОдин понятный CTA', 684, 252, 450, 166, 28, C.surface, { bold: true, lineSpacing: 1.3 });
    line(s, 684, 440, 470, '#FFFFFF/18', 1);
    text(s, "DON'T", 684, 472, 110, 22, 14, '#FCA5A5', { bold: true });
    text(s, 'Неон + розовый + фиолетовый\nРазные 3D-языки\nGlow на каждом элементе', 684, 510, 470, 126, 24, '#FFFFFF/76', { lineSpacing: 1.28 });
    footer(s, 12, true);
    notes(s, [assets.auction, assets.smartInvestor, 'audit/mobile/BRANDBOOK.md']);
  }

  // 13 — Closing reference card
  {
    const s = deck.slides.add();
    s.background.fill = C.tiffany;
    logo(s, 64, 58, 0.78, true);
    text(s, 'НЕДВИЖИМОСТЬ.\nЯСНЫЕ ЦИФРЫ.\nОДИН АКЦЕНТ.', 64, 210, 700, 224, 64, C.surface, { bold: true, lineSpacing: 0.96 });
    text(s, 'Это и есть характер SellYourBrick.', 66, 474, 620, 40, 24, '#FFFFFF/80');
    rect(s, 846, 112, 370, 496, C.surface, 34);
    text(s, 'SYSTEM CARD', 886, 154, 260, 22, 13, C.tiffanyDark, { bold: true });
    text(s, '#0099A9', 886, 208, 260, 40, 30, C.ink, { bold: true });
    text(s, 'Brand Tiffany', 886, 250, 260, 24, 15, C.muted);
    line(s, 886, 302, 250, C.line, 1);
    text(s, 'MONTSERRAT', 886, 334, 260, 34, 24, C.ink, { bold: true });
    text(s, '800 / 700 / 400', 886, 372, 260, 24, 15, C.muted);
    line(s, 886, 424, 250, C.line, 1);
    rect(s, 886, 458, 250, 58, C.tiffanyDark, 29);
    text(s, 'Primary action', 886, 458, 250, 58, 18, C.surface, { bold: true, align: 'center', valign: 'middle' });
    text(s, '18 px radius  •  44 px touch', 886, 546, 260, 24, 14, C.muted);
    text(s, 'VISUAL BRAND SYSTEM 1.0', 64, 654, 520, 20, 12, '#FFFFFF/68', { bold: true });
    notes(s, ['audit/mobile/BRANDBOOK.md']);
  }

  for (let i = 0; i < deck.slides.items.length; i++) {
    const slide = deck.slides.items[i];
    const png = await deck.export({ slide, format: 'png', scale: 1 });
    await fs.writeFile(path.join(BUILD, 'renders', `slide-${String(i + 1).padStart(2, '0')}.png`), new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: 'layout' });
    await fs.writeFile(path.join(BUILD, 'renders', `slide-${String(i + 1).padStart(2, '0')}.layout.json`), await layout.text());
  }

  const montage = await deck.export({ format: 'webp', montage: true, scale: 1 });
  await fs.writeFile(PREVIEW, new Uint8Array(await montage.arrayBuffer()));

  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(PPTX);
  console.log(JSON.stringify({ pptx: PPTX, preview: PREVIEW, slides: deck.slides.items.length }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
