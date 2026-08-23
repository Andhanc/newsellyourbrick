import fs from 'node:fs/promises';
import path from 'node:path';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const ROOT = '/Users/vtichonenko/newsellyourbrick';
const BUILD = path.join(ROOT, 'audit/mobile-showcase-build');
const OUT = path.join(ROOT, 'audit/mobile-showcase');
const SHOTS = 'audit/mobile-showcase-2026-08-23/screenshots';
const PPTX = path.join(OUT, 'SellYourBrick-Mobile-Product-Showcase.pptx');

const W = 1280;
const H = 720;
const M = 64;
const FONT = 'Montserrat';

const C = {
  tiffany: '#0099A9',
  tiffanyDark: '#007D8A',
  tiffanyDeep: '#006672',
  tiffanyLight: '#4ECDD6',
  tiffanySoft: '#F0FAFB',
  ink: '#0F172A',
  ink2: '#111827',
  muted: '#64748B',
  subtle: '#94A3B8',
  line: '#E2E8F0',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  red: '#DC2626',
  redSoft: '#FEF2F2',
  amber: '#B45309',
  amberSoft: '#FFF7ED',
  green: '#15803D',
  greenSoft: '#F0FDF4',
  lilacSoft: '#F7F3FA',
};

const A = {
  profile: `${SHOTS}/01-profile.png`,
  home: `${SHOTS}/02-home.png`,
  auction: `${SHOTS}/03-auction.png`,
  shares: `${SHOTS}/04-shares.png`,
  debts: `${SHOTS}/05-debts.png`,
  testDrive: `${SHOTS}/06-test-drive.png`,
  favorites: `${SHOTS}/07-favorites.png`,
  compare: `${SHOTS}/08-compare.png`,
  bonuses: `${SHOTS}/09-bonuses.png`,
  about: `${SHOTS}/10-about.png`,
  vip: `${SHOTS}/11-vip-club.png`,
  smart: `${SHOTS}/12-smart-panel.png`,
  buyer: `${SHOTS}/13-buyer.png`,
  seller: `${SHOTS}/14-seller.png`,
  profileData: `${SHOTS}/15-profile-data.png`,
  profileHistory: `${SHOTS}/16-profile-history.png`,
  profileBookings: `${SHOTS}/17-profile-bookings.png`,
  profileSubscriptions: `${SHOTS}/18-profile-subscriptions.png`,
  property: `${SHOTS}/20-property-villa.png`,
  notifications: `${SHOTS}/21-notifications.png`,
  drawerMenu: `${SHOTS}/22-drawer-menu.png`,
  drawerSearch: `${SHOTS}/23-drawer-search.png`,
  deposit: `${SHOTS}/24-profile-deposit.png`,
};

const abs = (p) => path.join(ROOT, p);
const mimeFor = (p) => p.endsWith('.png') ? 'image/png' : p.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

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
  const shape = slide.shapes.add({
    geometry: 'textbox',
    name: opts.name,
    position: { left: x, top: y, width: w, height: h },
    fill: 'none',
    line: { style: 'solid', fill: 'none', width: 0 },
  });
  shape.text = value;
  shape.text.style = {
    fontSize: size,
    typeface: opts.typeface || FONT,
    color,
    bold: opts.bold || false,
    italic: opts.italic || false,
    alignment: opts.align || 'left',
    verticalAlignment: opts.valign || 'top',
    autoFit: opts.autoFit || 'shrinkText',
    lineSpacing: opts.lineSpacing || 1.06,
    insets: opts.insets || { top: 0, right: 0, bottom: 0, left: 0 },
  };
  return shape;
}

function line(slide, x, y, w, color = C.line, weight = 1) {
  return slide.shapes.add({
    geometry: 'line',
    position: { left: x, top: y, width: w, height: 0 },
    fill: 'none',
    line: { style: 'solid', fill: color, width: weight },
  });
}

function logo(slide, x, y, scale = 1, light = false) {
  const color = light ? C.surface : C.ink;
  const fs = 34 * scale;
  const h = 44 * scale;
  const w1 = 75 * scale;
  const w2 = 84 * scale;
  text(slide, 'Sell', x, y, w1, h, fs, color, { bold: true, valign: 'middle' });
  rect(slide, x + w1 - 2 * scale, y + 2 * scale, w2, h - 4 * scale, C.tiffany, 13 * scale);
  text(slide, 'Your', x + w1, y, w2 - 2 * scale, h, fs, C.surface, { bold: true, align: 'center', valign: 'middle' });
  text(slide, 'Brick', x + w1 + w2 + 3 * scale, y, 100 * scale, h, fs, color, { bold: true, valign: 'middle' });
}

function kicker(slide, value, x = M, y = 40, color = C.tiffanyDark) {
  return text(slide, value.toUpperCase(), x, y, 500, 20, 13, color, { bold: true });
}

function footer(slide, n, light = false) {
  const c = light ? '#FFFFFF/58' : C.subtle;
  text(slide, 'SELLYOURBRICK  •  MOBILE PRODUCT SHOWCASE', M, 684, 560, 16, 10, c, { bold: true });
  text(slide, String(n).padStart(2, '0'), 1170, 681, 46, 18, 11, c, { bold: true, align: 'right' });
}

function notes(slide, sources) {
  slide.speakerNotes.textFrame.setText(`[Sources]\n${sources.map((s) => `- ${s}`).join('\n')}\n[/Sources]`);
}

async function phone(slide, rel, x, y, h, options = {}) {
  const w = Math.round(h * 390 / 844);
  rect(slide, x - 7, y - 7, w + 14, h + 14, options.frameColor || C.ink, 34, 'none');
  const image = await addImage(slide, rel, { left: x, top: y, width: w, height: h }, {
    fit: 'cover', geometry: 'roundRect', borderRadius: 28, alt: options.alt || path.basename(rel),
  });
  if (options.label) text(slide, options.label.toUpperCase(), x - 8, y + h + 17, w + 16, 18, 12, options.labelColor || C.muted, { bold: true, align: 'center' });
  return { w, image };
}

function title(slide, value, x = 470, y = 72, w = 730, h = 110, size = 42, color = C.ink) {
  return text(slide, value, x, y, w, h, size, color, { bold: true, lineSpacing: 0.98 });
}

function sectionLabel(slide, value, x, y, color = C.tiffanyDark) {
  text(slide, value.toUpperCase(), x, y, 280, 18, 12, color, { bold: true });
}

function bulletList(slide, items, x, y, w, color = C.ink, size = 18, gap = 42) {
  items.forEach((item, i) => {
    rect(slide, x, y + i * gap + 7, 8, 8, C.tiffany, 4);
    text(slide, item, x + 22, y + i * gap, w - 22, gap - 2, size, color, { bold: i === 0 });
  });
}

function verdict(slide, label, body, x, y, w, tone = 'good') {
  const map = {
    good: [C.greenSoft, C.green],
    medium: [C.amberSoft, C.amber],
    gap: [C.redSoft, C.red],
  };
  const [bg, fg] = map[tone];
  rect(slide, x, y, w, 82, bg, 20, { style: 'solid', fill: `${fg}/22`, width: 1 });
  text(slide, label.toUpperCase(), x + 18, y + 14, 190, 18, 11, fg, { bold: true });
  text(slide, body, x + 18, y + 38, w - 36, 30, 16, C.ink, { bold: true });
}

async function singlePageSlide(deck, cfg) {
  const s = deck.slides.add();
  s.background.fill = cfg.background || C.surfaceMuted;
  kicker(s, cfg.kicker);
  await phone(s, cfg.image, 88, 76, 570, { label: cfg.phoneLabel || cfg.kicker });
  title(s, cfg.title, 440, 78, 760, cfg.titleHeight || 108, cfg.titleSize || 42, cfg.titleColor || C.ink);
  sectionLabel(s, 'Преимущество', 440, 218);
  text(s, cfg.benefit, 440, 242, 700, 76, 25, C.ink, { bold: true, lineSpacing: 1.02 });
  line(s, 440, 336, 700);
  sectionLabel(s, 'Стилистические приёмы', 440, 365);
  bulletList(s, cfg.patterns, 440, 392, 700, C.ink, 18, 44);
  verdict(s, cfg.verdictLabel, cfg.verdictBody, 440, 570, 700, cfg.tone || 'good');
  footer(s, cfg.number);
  notes(s, [`${cfg.url} — captured at 390×844 on 2026-08-23`, cfg.image, ...(cfg.extraSources || [])]);
  return s;
}

async function pairedPageSlide(deck, cfg) {
  const s = deck.slides.add();
  s.background.fill = cfg.background || C.surfaceMuted;
  kicker(s, cfg.kicker);
  await phone(s, cfg.left.image, 56, 112, 488, { label: cfg.left.label });
  await phone(s, cfg.right.image, 306, 112, 488, { label: cfg.right.label });
  title(s, cfg.title, 585, 82, 620, 108, cfg.titleSize || 40);
  sectionLabel(s, 'Общее преимущество', 585, 220);
  text(s, cfg.benefit, 585, 245, 600, 76, 24, C.ink, { bold: true, lineSpacing: 1.02 });
  line(s, 585, 340, 600);
  sectionLabel(s, 'Что объединяет', 585, 368);
  bulletList(s, cfg.patterns, 585, 394, 600, C.ink, 17, 42);
  verdict(s, cfg.verdictLabel, cfg.verdictBody, 585, 572, 600, cfg.tone || 'good');
  footer(s, cfg.number);
  notes(s, [
    `${cfg.left.url} — captured at 390×844 on 2026-08-23`, cfg.left.image,
    `${cfg.right.url} — captured at 390×844 on 2026-08-23`, cfg.right.image,
  ]);
  return s;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  await fs.mkdir(path.join(BUILD, 'renders'), { recursive: true });
  const deck = Presentation.create({ slideSize: { width: W, height: H } });

  // 01 — Cover
  {
    const s = deck.slides.add();
    s.background.fill = C.ink;
    rect(s, 0, 0, 470, H, C.tiffanyDeep);
    rect(s, 0, 510, 470, 210, C.tiffany);
    logo(s, 62, 54, 0.86, true);
    text(s, 'МОБИЛЬНЫЙ\nПРОДУКТ', 62, 188, 390, 145, 58, C.surface, { bold: true, lineSpacing: 0.92 });
    text(s, 'Страницы, преимущества\nи единая стилистика', 64, 364, 350, 76, 24, '#FFFFFF/82', { lineSpacing: 1.18 });
    text(s, 'SMARTPHONE EDITION  •  2026', 64, 642, 350, 20, 12, '#FFFFFF/70', { bold: true });
    await phone(s, A.home, 528, 118, 500, { frameColor: '#0B1220' });
    await phone(s, A.profile, 1008, 126, 482, { frameColor: '#0B1220' });
    await phone(s, A.auction, 752, 66, 576, { frameColor: C.surface });
    notes(s, ['http://localhost:5173/ — mobile capture', A.home, 'http://localhost:5173/auction — mobile capture', A.auction, 'http://localhost:5173/profile — mobile capture', A.profile]);
  }

  // 02 — System overview
  {
    const s = deck.slides.add();
    s.background.fill = C.surfaceMuted;
    kicker(s, '01 / МОБИЛЬНЫЙ ЯЗЫК');
    text(s, 'Недвижимость ведёт. Интерфейс помогает.', M, 76, 1080, 64, 46, C.ink, { bold: true });
    await phone(s, A.auction, 72, 190, 410, { label: 'Фото-led hero' });
    await phone(s, A.testDrive, 302, 190, 410, { label: 'Сценарий жизни' });
    await phone(s, A.profile, 532, 190, 410, { label: 'Белые surfaces' });
    const items = [
      ['01', 'ФОТОГРАФИЯ', 'Дом, вилла или человек создают первый эмоциональный контакт.'],
      ['02', 'ЯСНАЯ ИЕРАРХИЯ', 'Крупный заголовок, короткое объяснение, одно действие.'],
      ['03', 'TIFFANY-НАВИГАЦИЯ', 'Бирюзовый ведёт пользователя, но не забирает весь экран.'],
    ];
    items.forEach((it, i) => {
      const y = 194 + i * 132;
      text(s, it[0], 820, y, 48, 28, 18, C.tiffany, { bold: true });
      text(s, it[1], 880, y, 300, 24, 16, C.ink, { bold: true });
      text(s, it[2], 880, y + 34, 330, 66, 17, C.muted, { lineSpacing: 1.15 });
      if (i < 2) line(s, 820, y + 111, 360);
    });
    footer(s, 2);
    notes(s, [A.auction, A.testDrive, A.profile]);
  }

  await singlePageSlide(deck, {
    number: 3, kicker: '02 / ГЛАВНАЯ', image: A.home, phoneLabel: 'Главная',
    url: 'http://localhost:5173/', title: 'Главная делает первый контакт эмоциональным',
    benefit: 'Один экран сразу обещает лёгкий путь к дому мечты.',
    patterns: ['Вилла занимает весь экран', 'Tiffany-overlay связывает фото с брендом', 'Минимум текста и один scroll-cue'],
    verdictLabel: 'Связь с системой', verdictBody: 'Узнаваемый цвет, но нет общего header-паттерна', tone: 'medium',
  });

  await singlePageSlide(deck, {
    number: 4, kicker: '03 / АУКЦИОН', image: A.auction, phoneLabel: 'Аукцион',
    url: 'http://localhost:5173/auction', title: 'Аукцион соединяет историю и действие',
    benefit: 'Пользователь видит смысл формата до первой карточки.',
    patterns: ['Photo-led hero с затемнением', 'Плавающий белый header', 'Белый CTA с Tiffany-action', 'Карточки продолжают тот же ритм'],
    verdictLabel: 'Связь с системой', verdictBody: 'Эталонный шаблон для продуктовых разделов', tone: 'good',
  });

  await singlePageSlide(deck, {
    number: 5, kicker: '04 / ДОЛИ', image: A.shares, phoneLabel: 'Доли',
    url: 'http://localhost:5173/co-investment', title: 'Доли наследуют общий продуктовый каркас',
    benefit: 'Новый инвестиционный формат ощущается частью того же продукта.',
    patterns: ['Тот же header и hero-геометрия', 'Tiffany label объясняет контекст', 'Поиск и фильтр стоят на знакомом месте', 'Карточки начинаются сразу после hero'],
    verdictLabel: 'Связь с системой', verdictBody: 'Высокая — меняются смысл и фото, не язык', tone: 'good',
  });

  await singlePageSlide(deck, {
    number: 6, kicker: '05 / ДОЛГИ', image: A.debts, phoneLabel: 'Долги',
    url: 'http://localhost:5173/debts', title: 'Долги меняют смысл, сохраняя каркас',
    benefit: 'Риск становится понятным ещё до просмотра объектов.',
    patterns: ['Тёмный фотофон для серьёзного контекста', 'Три белые risk-карточки', 'Семантические красный, жёлтый, зелёный', 'Общий поиск и floating actions'],
    verdictLabel: 'Связь с системой', verdictBody: 'Высокая — отдельная семантика встроена аккуратно', tone: 'good',
  });

  await singlePageSlide(deck, {
    number: 7, kicker: '06 / ТЕСТ-ДРАЙВ', image: A.testDrive, phoneLabel: 'Тест-драйв',
    url: 'http://localhost:5173/test-drive', title: 'Тест-драйв превращает услугу в сценарий жизни',
    benefit: 'Вместо описания функции пользователь сразу видит будущий опыт.',
    patterns: ['Lifestyle-фото виллы и бассейна', 'Белая карточка поверх hero', 'Три шага в спокойных pills', 'Один Tiffany CTA'],
    verdictLabel: 'Связь с системой', verdictBody: 'Очень высокая — лучший баланс эмоции и действия', tone: 'good',
  });

  await pairedPageSlide(deck, {
    number: 8, kicker: '07 / ВЫБОР', title: 'Понравилось и сравнение продолжают путь выбора',
    left: { image: A.favorites, label: 'Понравилось', url: 'http://localhost:5173/favorites' },
    right: { image: A.compare, label: 'Сравнение', url: 'http://localhost:5173/compare' },
    benefit: 'Сохранение и сопоставление превращены в понятный следующий шаг.',
    patterns: ['Объекты сохраняют карточную модель', 'Sticky CTA удерживает действие', 'Крупные заголовки без лишней навигации'],
    verdictLabel: 'Зона выравнивания', verdictBody: 'Сравнение слишком долго остаётся полностью Tiffany', tone: 'medium',
  });

  await pairedPageSlide(deck, {
    number: 9, kicker: '08 / ВОВЛЕЧЕНИЕ', title: 'Бонусы и VIP-клуб добавляют мотивацию',
    left: { image: A.bonuses, label: 'Бонусы', url: 'http://localhost:5173/bonuses' },
    right: { image: A.vip, label: 'VIP-клуб', url: 'http://localhost:5173/private-club' },
    benefit: 'Две разные механики усиливают повторные действия и доверие.',
    patterns: ['Бонусы — фирменный Tiffany и line-art', 'VIP — белый premium-canvas и чёрный CTA', 'Оба экрана используют крупную вертикальную историю'],
    verdictLabel: 'Связь с системой', verdictBody: 'Средняя — VIP стоит вернуть один Tiffany-акцент', tone: 'medium',
  });

  await singlePageSlide(deck, {
    number: 10, kicker: '09 / О НАС', image: A.about, phoneLabel: 'О платформе',
    url: 'http://localhost:5173/about', title: '«О нас» строит доверие через реальные цифры',
    benefit: 'Имидж быстро переходит в доказательства и факты.',
    patterns: ['Фото здания с мягким overlay', 'Короткий манифест без перегруза', 'Tiffany-плашки для ключевых метрик', 'Та же curved hero-геометрия'],
    verdictLabel: 'Связь с системой', verdictBody: 'Высокая — брендовый storytelling без смены языка', tone: 'good',
  });

  await singlePageSlide(deck, {
    number: 11, kicker: '10 / УМНАЯ ПАНЕЛЬ', image: A.smart, phoneLabel: 'Умный инвестор',
    url: 'http://localhost:5173/calculator', title: 'Умная панель — сильный образ, но другой бренд-язык',
    benefit: 'Экран обещает энергию, технологичность и персональный расчёт.',
    patterns: ['Чёрная grid-сцена', 'Неоновые розовый, оранжевый и синий', 'Наклонённые glow-карточки', 'Белый CTA без Tiffany-роли'],
    verdictLabel: 'Главный разрыв', verdictBody: 'Сохранить драму, но вернуть палитру и форму системы', tone: 'gap',
  });

  await pairedPageSlide(deck, {
    number: 12, kicker: '11 / РОЛИ', title: 'Покупатель и продавец видят одну платформу',
    left: { image: A.buyer, label: 'Для покупателя', url: 'http://localhost:5173/buyer' },
    right: { image: A.seller, label: 'Для продавца', url: 'http://localhost:5173/seller' },
    benefit: 'Разные задачи получают разные истории, не разрушая общую систему.',
    patterns: ['Единый плавающий header', 'Крупный Montserrat-заголовок', 'Фото недвижимости и понятная выгода', 'Чёрный CTA как сильное действие'],
    verdictLabel: 'Связь с системой', verdictBody: 'Высокая — разные кампании, единая продуктовая рамка', tone: 'good',
  });

  await singlePageSlide(deck, {
    number: 13, kicker: '12 / ОБЪЕКТ', image: A.property, phoneLabel: 'Вилла',
    url: 'http://localhost:5173/property/villa-preview?buyer_detail_preview=1', title: 'Карточка виллы говорит языком сделки',
    benefit: 'Фотография, цена и действие считываются в правильном порядке.',
    patterns: ['Крупная фотография реальной недвижимости', 'Контекстная навигация вместо общего header', 'Белые карточки и мягкая тень', 'Tiffany показывает выбор валюты и CTA'],
    verdictLabel: 'Связь с системой', verdictBody: 'Высокая — спокойная продуктовая поверхность', tone: 'good',
  });

  await pairedPageSlide(deck, {
    number: 14, kicker: '13 / DRAWERS', title: 'Навигация раскрывается слоями',
    left: { image: A.drawerMenu, label: 'Меню', url: 'http://localhost:5173/auction — menu open' },
    right: { image: A.drawerSearch, label: 'Поиск', url: 'http://localhost:5173/auction — search open' },
    benefit: 'Дополнительные действия появляются поверх контекста, не уводя со страницы.',
    patterns: ['Белые surfaces поверх размытого фона', 'Крупные touch-targets', 'Аккордеоны в меню', 'Поиск занимает только нужную высоту'],
    verdictLabel: 'Связь с системой', verdictBody: 'Высокая — единый слой, радиусы и поведение', tone: 'good',
  });

  await singlePageSlide(deck, {
    number: 15, kicker: '14 / УВЕДОМЛЕНИЯ', image: A.notifications, phoneLabel: 'Bottom sheet',
    url: 'http://localhost:5173/auction — notifications open', title: 'Уведомления сохраняют спокойный тон',
    benefit: 'Даже пустое состояние объясняет, что появится здесь дальше.',
    patterns: ['Bottom sheet с blur-контекстом', 'Три временные вкладки', 'Нейтральная иллюстрация', 'Короткая человеческая формулировка'],
    verdictLabel: 'Связь с системой', verdictBody: 'Очень высокая — чистый системный компонент', tone: 'good',
  });

  await singlePageSlide(deck, {
    number: 16, kicker: '15 / ПРОФИЛЬ', image: A.profile, phoneLabel: 'Обзор',
    url: 'http://localhost:5173/profile', title: 'Профиль собирает путь пользователя в одном месте',
    benefit: 'Статус, разделы и ключевые направления доступны с одного экрана.',
    patterns: ['Tiffany-gradient задаёт персональный контекст', 'Горизонтальная карусель разделов', 'Белые action-строки', 'Контент продолжает общие направления'],
    verdictLabel: 'Связь с системой', verdictBody: 'Высокая — профиль ощущается частью продукта', tone: 'good',
  });

  // 17 — Profile sheets
  {
    const s = deck.slides.add();
    s.background.fill = C.surfaceMuted;
    kicker(s, '16 / ПРОФИЛЬНЫЕ РАЗДЕЛЫ');
    text(s, 'Один sheet-шаблон удерживает разные задачи', M, 75, 1050, 58, 43, C.ink, { bold: true });
    await phone(s, A.profileData, 58, 168, 430, { label: 'Данные' });
    await phone(s, A.profileHistory, 274, 168, 430, { label: 'История' });
    await phone(s, A.profileBookings, 490, 168, 430, { label: 'Брони' });
    const x = 744;
    sectionLabel(s, 'Общий паттерн', x, 176);
    text(s, 'Имидж сверху.\nЗадача снизу.\nОдно действие.', x, 208, 420, 142, 34, C.ink, { bold: true, lineSpacing: 1.08 });
    line(s, x, 370, 410);
    bulletList(s, ['Одинаковая кнопка закрытия', 'Белая curved surface', 'Tiffany CTA', 'Понятные empty states'], x, 402, 420, C.ink, 18, 43);
    verdict(s, 'Единая система', 'Структура стабильна; art direction изображений стоит унифицировать', x, 577, 430, 'medium');
    footer(s, 17);
    notes(s, ['http://localhost:5173/profile?data=1', A.profileData, 'http://localhost:5173/profile?history=1', A.profileHistory, 'http://localhost:5173/profile?bookings=1', A.profileBookings]);
  }

  await pairedPageSlide(deck, {
    number: 18, kicker: '17 / ФИНАНСЫ', title: 'Подписки и депозит делают деньги понятными',
    left: { image: A.profileSubscriptions, label: 'Подписки', url: 'http://localhost:5173/profile?subscriptions=1' },
    right: { image: A.deposit, label: 'Депозит', url: 'http://localhost:5173/deposit' },
    benefit: 'Финансовые действия остаются ясными даже на маленьком экране.',
    patterns: ['Крупные суммы и тарифы', 'Tiffany-gradient обозначает финансовую зону', 'Белые surfaces разделяют задачи', 'Основное действие всегда заметно'],
    verdictLabel: 'Связь с системой', verdictBody: 'Высокая — разные функции используют общий финансовый тон', tone: 'good',
  });

  // 19 — Consistency matrix
  {
    const s = deck.slides.add();
    s.background.fill = C.surface;
    kicker(s, '18 / ЕДИНСТВО СИСТЕМЫ');
    text(s, 'Стилистика едина в ядре — исключения точечные', M, 76, 1080, 52, 38, C.ink, { bold: true });
    text(s, 'Критерии: header, палитра, типографика, surfaces и роль фотографии.', M, 132, 860, 28, 17, C.muted);
    const rows = [
      ['ЯДРО ПРОДУКТА', 'Аукцион · Доли · Долги · Тест-драйв · Объект', 'ВЫСОКАЯ', C.greenSoft, C.green],
      ['ДОВЕРИЕ И РОЛИ', 'О нас · Покупатель · Продавец · Профиль · Депозит', 'ВЫСОКАЯ', C.greenSoft, C.green],
      ['ВОВЛЕЧЕНИЕ', 'Бонусы · VIP-клуб · Главная', 'СРЕДНЯЯ', C.amberSoft, C.amber],
      ['ИНСТРУМЕНТЫ', 'Понравилось · Сравнение · Умная панель', 'НЕРАВНОМЕРНАЯ', C.redSoft, C.red],
    ];
    rows.forEach((r, i) => {
      const y = 215 + i * 94;
      line(s, M, y - 16, 1152);
      text(s, r[0], M, y + 8, 230, 24, 14, C.tiffanyDark, { bold: true });
      text(s, r[1], 300, y + 4, 650, 34, 20, C.ink, { bold: true });
      rect(s, 986, y, 220, 42, r[3], 21, { style: 'solid', fill: `${r[4]}/22`, width: 1 });
      text(s, r[2], 986, y, 220, 42, 12, r[4], { bold: true, align: 'center', valign: 'middle' });
    });
    line(s, M, 585, 1152);
    text(s, 'Главный вывод', M, 612, 220, 22, 13, C.tiffanyDark, { bold: true });
    text(s, 'Пользователь узнаёт SellYourBrick по фото, крупному Montserrat, белым surfaces и Tiffany-действиям.', 300, 604, 900, 50, 23, C.ink, { bold: true });
    footer(s, 19);
    notes(s, ['Visual synthesis based on screenshots 01–24 in the current audit run', 'src/App.jsx', 'src/pages/PropertyDetailPage.jsx']);
  }

  // 20 — Closing
  {
    const s = deck.slides.add();
    s.background.fill = C.ink;
    logo(s, M, 46, 0.82, true);
    text(s, 'СИСТЕМА УЖЕ\nУЗНАВАЕМА.', M, 158, 590, 150, 58, C.surface, { bold: true, lineSpacing: 0.93 });
    text(s, 'Нужно не менять характер,\nа вернуть исключения в общий язык.', M, 345, 520, 80, 24, '#FFFFFF/76', { lineSpacing: 1.18 });
    rect(s, 706, 92, 500, 560, C.surface, 34);
    sectionLabel(s, 'Сохраняем', 754, 138, C.green);
    bulletList(s, ['Фото-led hero', 'Tiffany как навигация', 'Белые rounded surfaces', 'Один главный CTA'], 754, 176, 400, C.ink, 20, 48);
    line(s, 754, 382, 400);
    sectionLabel(s, 'Выравниваем', 754, 416, C.red);
    bulletList(s, ['Умную панель', 'Сравнение', 'VIP-акцент', 'Art direction профиля'], 754, 454, 400, C.ink, 20, 44);
    text(s, 'MOBILE PRODUCT SHOWCASE  •  2026', M, 650, 500, 20, 12, '#FFFFFF/58', { bold: true });
    notes(s, ['Final synthesis based on current-run screenshots and local product code']);
  }

  for (let i = 0; i < deck.slides.items.length; i++) {
    const slide = deck.slides.items[i];
    const png = await deck.export({ slide, format: 'png', scale: 1 });
    await fs.writeFile(path.join(BUILD, 'renders', `slide-${String(i + 1).padStart(2, '0')}.png`), new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: 'layout' });
    await fs.writeFile(path.join(BUILD, 'renders', `slide-${String(i + 1).padStart(2, '0')}.layout.json`), await layout.text());
  }

  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(PPTX);
  console.log(JSON.stringify({ pptx: PPTX, slides: deck.slides.items.length }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
