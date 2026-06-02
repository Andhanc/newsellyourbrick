import dotenv from 'dotenv';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import axios from 'axios';
import sharp from 'sharp';
import { initDatabase, closeDatabase, schemaCache } from './database/database.js';
import { userQueries, documentQueries, notificationQueries, testDriveBookingQueries, administratorQueries, debtReasonQueries, debtDocumentQueries, whatsappUserQueries, purchaseRequestQueries, assistantLeadQueries, liveChatQueries, apartmentQueries, houseQueries, propertyQueries, favoriteQueries, crmQueries, auctionReminderQueries, passesApprovedFilters, passesAuctionFilters, stripeSubscriptionQueries } from './database/database.js';
import { getPrisma } from './database/prismaClient.js';
import { mergePropertyTranslations, mergeReservationFields } from './propertyListBatch.js';
import { fileURLToPath } from 'url';
import { dirname, join, resolve, sep } from 'path';
import multer from 'multer';
import fs from 'fs';
const { readFileSync } = fs;
import crypto from 'crypto';
import qrcode from 'qrcode-terminal';
import QRCodePNG from 'qrcode';
import whatsappPkg from 'whatsapp-web.js';
import { calculatePropertyPrice } from './services/propertyParser.js';
import { SPAIN_CITIES, DISTRICTS_BY_CITY, getDistrictOptions } from './data/propertyCalculatorLocations.js';
import { parseBulkImportFile, rowToPropertyData } from './services/bulkImportProperties.js';
import { Address, beginCell, Cell } from '@ton/core';
import { getMarketData, getMortgageRates, getRentalYieldByRegion } from './services/investmentDataService.js';
import { translatePropertyToAllLanguages } from './services/aiPropertyTranslate.js';
import { buildDatabaseSnapshot } from './services/storageSnapshot.js';
import { buildOwnerSaleCelebrations } from './ownerSaleCelebrations.js';
import { buildPropertySearchOptionsWithBids } from './services/propertySearchOptions.js';
import { getAuctionMinBidStep } from '../src/utils/auctionBidStep.js';
import {
  getBidCeiling,
  upsertBidCeiling,
  deactivateBidCeiling,
  evaluateBidCeilings,
} from './database/auctionBidCeilingPrisma.js';
import {
  registerStripeBillingRoutes,
  createStripeWebhookHandler,
  refundHalfTestDriveBookingPayment,
  parseTestDriveBuyerCancelBody,
} from './stripeBilling.js';
import { sendCrmEmailViaEmailJS, resolveBuyerEmailForPurchaseRequest } from './emailJsCrmSend.js';
import { registerIntelligenceIoProxy } from './intelligenceIoProxy.js';
import { getActiveAiProvider, isAiConfigured } from './aiChatConfig.js';
import { registerNewsRoutes } from './newsRoutes.js';
import { publicPropertyListsCache } from './middleware/publicPropertyListsCache.js';
import { getCurrencySymbol } from './utils/currency.js';
import {
  applyFormattedPropertyAmenities,
  collectAmenityKeys,
  amenitiesKeysToJsonString,
  parseTzAmenitiesJson,
} from './utils/propertyAmenitiesFormat.js';
import {
  buildEditApprovalUpdateData,
  resolveOriginalPropertyForEdit,
  resolveEditApprovalTargetTable,
} from './utils/propertyEditApprove.js';
import {
  applyListingPhotosToFormatted,
  normalizePhotosListInput,
} from './utils/normalizeListingPhotos.js';
import { propertyRowAllowsTestDriveListing } from './testDriveListingRules.js';
import {
  AUCTION_DEPOSIT_MIN_EUR,
  isAuctionDepositSufficient,
} from './utils/auctionDeposit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });
dotenv.config({ path: join(__dirname, '.env') });

const { Client, LocalAuth } = whatsappPkg;

// Логирование при старте для диагностики
console.log('═══════════════════════════════════════════════════════');
console.log('[SERVER] 🚀 Начало инициализации сервера...');
console.log('[SERVER] 📋 Переменные окружения:');
console.log('[SERVER]    - SERVER_PORT:', process.env.SERVER_PORT || 'не установлен (будет использован 3000)');
console.log('[SERVER]    - PORT:', process.env.PORT || 'не установлен');
console.log('[SERVER]    - NODE_ENV:', process.env.NODE_ENV || 'не установлен');
console.log('[SERVER] 📧 EmailJS переменные:');
console.log('[SERVER]    - REACT_APP_EMAILJS_SERVICE_ID:', process.env.REACT_APP_EMAILJS_SERVICE_ID ? '✅ установлен' : '❌ не установлен');
console.log('[SERVER]    - VITE_EMAILJS_SERVICE_ID:', process.env.VITE_EMAILJS_SERVICE_ID ? '✅ установлен' : '❌ не установлен');
console.log('[SERVER]    - REACT_APP_EMAILJS_TEMPLATE_ID:', process.env.REACT_APP_EMAILJS_TEMPLATE_ID ? '✅ установлен' : '❌ не установлен');
console.log('[SERVER]    - VITE_EMAILJS_TEMPLATE_ID:', process.env.VITE_EMAILJS_TEMPLATE_ID ? '✅ установлен' : '❌ не установлен');
console.log('[SERVER]    - REACT_APP_EMAILJS_PUBLIC_KEY:', process.env.REACT_APP_EMAILJS_PUBLIC_KEY ? '✅ установлен' : '❌ не установлен');
console.log('[SERVER]    - VITE_EMAILJS_PUBLIC_KEY:', process.env.VITE_EMAILJS_PUBLIC_KEY ? '✅ установлен' : '❌ не установлен');
console.log(
  '[SERVER]    - EMAILJS_CRM_TEMPLATE_ID / VITE_EMAILJS_CRM_TEMPLATE_ID:',
  process.env.EMAILJS_CRM_TEMPLATE_ID || process.env.VITE_EMAILJS_CRM_TEMPLATE_ID
    ? '✅ установлен (напоминания/CRM с сервера)'
    : '❌ не установлен → письма с сервера не отправятся (нужен отдельный шаблон, не OTP)'
);
const ejPriv =
  String(
    process.env.EMAILJS_PRIVATE_KEY ||
      process.env.EMAILJS_ACCESS_TOKEN ||
      process.env.EMAILJS_PRIVATE_API_KEY ||
      ''
  ).trim();
console.log(
  '[SERVER]    - EMAILJS_PRIVATE_KEY (или ACCESS_TOKEN):',
  ejPriv ? '✅ установлен (серверная отправка)' : '❌ не установлен → будет 403 без «Allow non-browser API» в EmailJS'
);
const emailJsServiceId = process.env.REACT_APP_EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID || '';
const emailJsTemplateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID || '';
const emailJsPublicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY || '';
console.log('[SERVER] 📧 Итоговая конфигурация EmailJS:');
console.log('[SERVER]    - Service ID:', emailJsServiceId ? emailJsServiceId.substring(0, 15) + '...' : '❌ не установлен');
console.log('[SERVER]    - Template ID:', emailJsTemplateId || '❌ не установлен');
console.log('[SERVER]    - Public Key:', emailJsPublicKey ? emailJsPublicKey.substring(0, 15) + '...' : '❌ не установлен');
const aiProvider = getActiveAiProvider();
const aiOk = isAiConfigured();
console.log(
  '[SERVER] 🤖 AI (POST /api/ai/intelligence-chat):',
  aiOk
    ? `✅ провайдер «${aiProvider.id}», модель ${aiProvider.defaultModel}${aiProvider.needsKey ? '' : ' (без ключа)'}`
    : `❌ провайдер «${aiProvider.id}» — нужен API-ключ или AI_PROVIDER=pollinations`,
);
console.log('[SERVER] ═══════════════════════════════════════════════════════');

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(
  compression({
    threshold: 1024,
    filter: (req, res) => {
      const p = req.path || '';
      if (p.startsWith('/api/events')) return false;
      return compression.filter(req, res);
    },
  })
);

registerIntelligenceIoProxy(app);
registerNewsRoutes(app);
// На Railway в production: сервер должен слушать на PORT (который устанавливает Railway, например 8080)
// В development: используем SERVER_PORT или 3000
// Логика: если NODE_ENV=production и есть PORT, используем PORT, иначе SERVER_PORT или 3000
const PORT = (process.env.NODE_ENV === 'production' && process.env.PORT) 
  ? parseInt(process.env.PORT, 10) 
  : (process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 3000);

/** Лог каждого HTTP-запроса и шум SSE: в production выключено, для отладки задайте VERBOSE_HTTP=1 */
const VERBOSE_HTTP = process.env.VERBOSE_HTTP === '1' || process.env.NODE_ENV !== 'production';

/**
 * Валидация пароля
 * Проверяет наличие заглавной буквы, спецсимволов и цифр
 * @param {string} password - Пароль для проверки
 * @returns {object} - { valid: boolean, errors: string[], missing: string[] }
 */
function validatePassword(password) {
  const errors = [];
  const missing = [];
  const present = [];

  // Проверка наличия заглавной буквы
  if (!/[A-ZА-Я]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы одну заглавную букву');
    missing.push('заглавную букву');
  } else {
    present.push('заглавную букву');
  }

  // Проверка наличия спецсимволов
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы один спецсимвол (!@#$%^&*()_+-=[]{}|;:,.<>?)');
    missing.push('спецсимвол');
  } else {
    present.push('спецсимвол');
  }

  // Проверка наличия цифры
  if (!/[0-9]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы одну цифру');
    missing.push('цифру');
  } else {
    present.push('цифру');
  }

  return {
    valid: errors.length === 0,
    errors,
    missing,
    present,
    message: errors.length > 0 
      ? `Пароль не соответствует требованиям. Добавьте: ${missing.join(', ')}. ${present.length > 0 ? `Уже есть: ${present.join(', ')}.` : ''}`
      : 'Пароль соответствует всем требованиям'
  };
}

// Настройка middleware
// CORS с поддержкой dev tunnels и других доменов
// Health check endpoint для Railway
app.get('/health', async (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT,
    serverPort: process.env.SERVER_PORT || 'not set',
    railwayPort: process.env.PORT || 'not set',
    uptime: process.uptime()
  });
});

// Хранилище онлайн-посетителей: sessionId -> lastSeen (timestamp)
const onlineVisitors = new Map();
const ONLINE_TIMEOUT_MS = 2 * 60 * 1000; // 2 минуты

function pruneOnlineVisitors() {
  const now = Date.now();
  for (const [id, lastSeen] of onlineVisitors.entries()) {
    if (now - lastSeen > ONLINE_TIMEOUT_MS) onlineVisitors.delete(id);
  }
}

/**
 * POST /api/visitor-heartbeat - Пинг от посетителя сайта (открытая вкладка)
 * Тело: { sessionId: string } или query sessionId. Обновляет lastSeen для учёта в "Онлайн".
 */
app.post('/api/visitor-heartbeat', express.json(), async (req, res) => {
  const sessionId = req.body?.sessionId || req.query?.sessionId || req.headers['x-visitor-id'] || null;
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 128) {
    return res.status(400).json({ success: false, error: 'sessionId required' });
  }
  pruneOnlineVisitors();
  onlineVisitors.set(sessionId, Date.now());
  res.json({ success: true });
});

/**
 * GET /api/admin/online-count - Количество посетителей онлайн (для админки)
 */
app.get('/api/admin/online-count', async (req, res) => {
  try {
    pruneOnlineVisitors();
    const count = onlineVisitors.size;
    res.json({ success: true, count });
  } catch (error) {
    console.error('Ошибка при получении online count:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Смотрят карточку объекта: propertyId -> Map(sessionId -> lastSeen)
const propertyPageViewers = new Map();
const PROPERTY_VIEWER_TIMEOUT_MS = 90 * 1000;

function prunePropertyPageViewers(propertyId) {
  const sessions = propertyPageViewers.get(propertyId);
  if (!sessions) return;
  const now = Date.now();
  for (const [sessionId, lastSeen] of sessions.entries()) {
    if (now - lastSeen > PROPERTY_VIEWER_TIMEOUT_MS) sessions.delete(sessionId);
  }
  if (sessions.size === 0) propertyPageViewers.delete(propertyId);
}

function getPropertyPageViewerCount(propertyId) {
  const key = String(propertyId);
  prunePropertyPageViewers(key);
  return propertyPageViewers.get(key)?.size ?? 0;
}

/**
 * POST /api/properties/:id/viewer-heartbeat — пинг просмотра карточки объекта
 */
app.post('/api/properties/:id/viewer-heartbeat', express.json(), async (req, res) => {
  const propertyId = String(req.params.id || '').trim();
  const sessionId = req.body?.sessionId || req.query?.sessionId || req.headers['x-visitor-id'] || null;
  if (!propertyId || !/^\d+$/.test(propertyId)) {
    return res.status(400).json({ success: false, error: 'property id required' });
  }
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 128) {
    return res.status(400).json({ success: false, error: 'sessionId required' });
  }
  let sessions = propertyPageViewers.get(propertyId);
  if (!sessions) {
    sessions = new Map();
    propertyPageViewers.set(propertyId, sessions);
  }
  sessions.set(sessionId, Date.now());
  prunePropertyPageViewers(propertyId);
  res.json({ success: true, count: getPropertyPageViewerCount(propertyId) });
});

/**
 * GET /api/properties/:id/viewer-count — сколько сейчас смотрят объект
 */
app.get('/api/properties/:id/viewer-count', async (req, res) => {
  const propertyId = String(req.params.id || '').trim();
  if (!propertyId || !/^\d+$/.test(propertyId)) {
    return res.status(400).json({ success: false, error: 'property id required' });
  }
  try {
    res.json({ success: true, count: getPropertyPageViewerCount(propertyId) });
  } catch (error) {
    console.error('Ошибка при получении viewer count:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Подписчики SSE для автообновления списка аукциона (без polling)
const auctionSSEClients = new Set();

function broadcastAuctionNewObjects(properties) {
  if (!properties || properties.length === 0) return;
  const payload = JSON.stringify({ type: 'new_auction_objects', properties });
  if (VERBOSE_HTTP) {
    console.log(
      `[SSE] 📤 Рассылка новых объектов аукциона подписчикам: ${auctionSSEClients.size} клиент(ов), объектов: ${properties.length}`
    );
  }
  auctionSSEClients.forEach((res) => {
    try {
      res.write(`data: ${payload}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    } catch (e) {
      auctionSSEClients.delete(res);
    }
  });
}

/** Push в тот же SSE-канал, что и новые лоты: обновление тестового таймера без polling. */
function broadcastAuctionSseEvent(payload) {
  if (!payload || auctionSSEClients.size === 0) return;
  const line = JSON.stringify(payload);
  auctionSSEClients.forEach((res) => {
    try {
      res.write(`data: ${line}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    } catch (e) {
      auctionSSEClients.delete(res);
    }
  });
}

/**
 * GET /api/events/auction-updates - Server-Sent Events для новых объектов на странице аукциона.
 * Клиент подписывается один раз; сервер пушит события только при появлении новых объектов (после одобрения).
 */
app.get('/api/events/auction-updates', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  auctionSSEClients.add(res);
  if (VERBOSE_HTTP) {
    console.log(`[SSE] 🔌 Подключён подписчик аукциона. Всего: ${auctionSSEClients.size}`);
  }
  res.write(': connected\n\n');
  if (typeof res.flush === 'function') res.flush();
  const heartbeat = setInterval(() => {
    if (!auctionSSEClients.has(res)) return;
    try {
      res.write(': hb\n\n');
      if (typeof res.flush === 'function') res.flush();
    } catch (e) {
      clearInterval(heartbeat);
      auctionSSEClients.delete(res);
    }
  }, 15000);
  req.on('close', () => {
    clearInterval(heartbeat);
    auctionSSEClients.delete(res);
  });
});

/** SSE: админка «Чаты с сайта» — новые сообщения и сессии без polling */
const liveChatAdminSSEClients = new Set();

function broadcastLiveChatAdminEvent(payload) {
  if (!payload || liveChatAdminSSEClients.size === 0) return;
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  liveChatAdminSSEClients.forEach((res) => {
    try {
      res.write(line);
      if (typeof res.flush === 'function') res.flush();
    } catch (e) {
      liveChatAdminSSEClients.delete(res);
    }
  });
}

/**
 * GET /api/events/live-chat-admin — Server-Sent Events для раздела чатов с посетителями в админке.
 */
app.get('/api/events/live-chat-admin', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  liveChatAdminSSEClients.add(res);
  res.write(': connected\n\n');
  if (typeof res.flush === 'function') res.flush();
  const heartbeat = setInterval(() => {
    if (!liveChatAdminSSEClients.has(res)) return;
    try {
      res.write(': hb\n\n');
      if (typeof res.flush === 'function') res.flush();
    } catch (e) {
      clearInterval(heartbeat);
      liveChatAdminSSEClients.delete(res);
    }
  }, 30000);
  req.on('close', () => {
    clearInterval(heartbeat);
    liveChatAdminSSEClients.delete(res);
  });
});

/** Подписчики SSE по user_id — push в кабинет продавца/покупателя без polling (одобрение в админке) */
const userCabinetSSEByUserId = new Map();

function broadcastUserCabinetEvent(userId, payload) {
  const uid = String(userId);
  const set = userCabinetSSEByUserId.get(uid);
  if (!set || set.size === 0) return;
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  set.forEach((res) => {
    try {
      res.write(line);
      if (typeof res.flush === 'function') res.flush();
    } catch (e) {
      set.delete(res);
    }
  });
}

/** Таблица Prisma для избранного/ставок по строке объекта (getByUserId раньше не всегда имел source_table). */
function engagementTableFromPropertyRow(p) {
  if (!p) return 'properties_apartments';
  const st = p.source_table;
  if (st != null && String(st).trim() !== '') {
    return favoriteQueries.normalizePropertyTable(st);
  }
  const pt = String(p.property_type || '').toLowerCase();
  if (pt === 'house' || pt === 'villa') return 'properties_houses';
  if (pt === 'apartment' || pt === 'commercial') return 'properties_apartments';
  return 'properties_apartments';
}

/** WHERE для bids: numeric property_id совпадает в разных таблицах — нужен property_table. */
function buildBidWhereForProperty(propertyId, propertyTable) {
  const pid = Number(propertyId);
  const tbl = String(propertyTable || 'properties_apartments');
  if (tbl === 'properties_apartments') {
    return { property_id: pid, OR: [{ property_table: tbl }, { property_table: null }] };
  }
  return { property_id: pid, property_table: tbl };
}

function normalizeBidPropertyTableQuery(raw) {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (!t) return null;
  if (t === 'apartments') return 'properties_apartments';
  if (t === 'houses') return 'properties_houses';
  if (t === 'properties_apartments' || t === 'properties_houses' || t === 'properties') return t;
  return null;
}

function bidAmountCompositeKey(propertyId, propertyTable) {
  const tbl = normalizeBidPropertyTableQuery(propertyTable) || 'properties_apartments';
  return `${tbl}:${Number(propertyId)}`;
}

function isAuctionListingRow(p) {
  return (
    p?.is_auction === 1 ||
    p?.is_auction === true ||
    p?.is_auction === '1' ||
    p?.is_auction === 'true' ||
    p?.isAuction === true ||
    p?.isAuction === 1
  );
}

/** Подставляет current_bid / currentBid по макс. ставке с учётом property_table. */
function propertyTypeHintFromBidContext(propertyTable, propertyType) {
  const pt = propertyType != null ? String(propertyType).trim().toLowerCase() : '';
  if (pt === 'house' || pt === 'villa') return pt;
  if (pt === 'apartment' || pt === 'commercial') return pt;
  const tbl = normalizeBidPropertyTableQuery(propertyTable);
  if (tbl === 'properties_houses') return 'house';
  if (tbl === 'properties_apartments') return 'apartment';
  return null;
}

/** Загрузка объекта для ставки: обязательно property_table / property_type с клиента при коллизии id. */
async function loadPropertyForBid(propertyId, { property_table: propertyTableRaw, property_type: propertyTypeRaw } = {}) {
  const nid = Number(propertyId);
  if (!Number.isFinite(nid)) return { property: null, tableName: null };

  const typeHint = propertyTypeHintFromBidContext(propertyTableRaw, propertyTypeRaw);
  let tableName = normalizeBidPropertyTableQuery(propertyTableRaw);

  if (typeHint === 'house' || typeHint === 'villa' || tableName === 'properties_houses') {
    const row = await houseQueries.getById(nid);
    if (row) {
      row.source_table = 'properties_houses';
      return { property: row, tableName: 'properties_houses' };
    }
    if (tableName === 'properties_houses') return { property: null, tableName: null };
  }

  if (typeHint === 'apartment' || typeHint === 'commercial' || tableName === 'properties_apartments') {
    const row = await apartmentQueries.getById(nid);
    if (row) {
      row.source_table = 'properties_apartments';
      return { property: row, tableName: 'properties_apartments' };
    }
    if (tableName === 'properties_apartments') return { property: null, tableName: null };
  }

  if (tableName === 'properties') {
    const legacy = await getPrisma().properties.findUnique({ where: { id: nid } });
    if (legacy) {
      legacy.source_table = 'properties';
      return { property: legacy, tableName: 'properties' };
    }
    return { property: null, tableName: null };
  }

  const property = await propertyQueries.getById(nid, typeHint);
  if (!property) return { property: null, tableName: null };
  tableName = engagementTableFromPropertyRow(property);
  property.source_table = tableName;
  return { property, tableName };
}

async function enrichListingPropertiesWithMaxBids(prisma, properties) {
  if (!Array.isArray(properties) || properties.length === 0) return properties;
  const orWhere = [];
  const seen = new Set();
  for (const p of properties) {
    if (!isAuctionListingRow(p)) continue;
    const id = Number(p.id);
    if (!Number.isFinite(id)) continue;
    const table = engagementTableFromPropertyRow(p);
    const sk = `${id}\0${table}`;
    if (seen.has(sk)) continue;
    seen.add(sk);
    orWhere.push(buildBidWhereForProperty(id, table));
  }
  if (orWhere.length === 0) return properties;

  const bids = await prisma.bids.findMany({
    where: { OR: orWhere },
    select: { property_id: true, property_table: true, bid_amount: true },
  });
  const maxByPair = new Map();
  for (const b of bids) {
    const amount = Number(b.bid_amount);
    if (!Number.isFinite(amount)) continue;
    let tbl = b.property_table;
    if (tbl == null || tbl === '') tbl = 'properties_apartments';
    const key = `${b.property_id}\0${tbl}`;
    const prev = maxByPair.get(key);
    if (prev == null || amount > prev) maxByPair.set(key, amount);
  }

  return properties.map((p) => {
    if (!isAuctionListingRow(p)) return p;
    const id = Number(p.id);
    const table = engagementTableFromPropertyRow(p);
    const key = `${id}\0${table}`;
    const maxBid = maxByPair.get(key);
    const start =
      p.auction_starting_price != null && p.auction_starting_price !== ''
        ? Number(p.auction_starting_price)
        : NaN;
    const hasMax = maxBid != null && Number.isFinite(maxBid) && maxBid > 0;
    const currentBid = hasMax
      ? maxBid
      : Number.isFinite(start) && start > 0
        ? start
        : null;
    if (currentBid == null) return p;
    return {
      ...p,
      current_bid: currentBid,
      currentBid,
    };
  });
}

async function fetchEngagementCountsForProperty(prisma, propertyId, propertyTable) {
  const bidWhere = buildBidWhereForProperty(propertyId, propertyTable);
  const [likes_count, bids_count] = await Promise.all([
    prisma.property_favorites.count({
      where: { property_id: pid, property_table: tbl },
    }),
    prisma.bids.count({ where: bidWhere }),
  ]);
  return { likes_count, bids_count };
}

/** Push владельцу объекта: лайки/ставки обновились (один канал SSE user-updates, без polling). */
async function notifyOwnerPropertyEngagement(prisma, propertyRow, propertyTableOverride) {
  try {
    const ownerId = propertyRow?.user_id;
    if (!ownerId) return;
    const tbl = propertyTableOverride || engagementTableFromPropertyRow(propertyRow);
    const { likes_count, bids_count } = await fetchEngagementCountsForProperty(
      prisma,
      propertyRow.id,
      tbl
    );
    const payload = {
      type: 'property_engagement',
      property_id: Number(propertyRow.id),
      likes_count,
      bids_count,
    };
    const isAuc =
      propertyRow.is_auction === 1 ||
      propertyRow.is_auction === true ||
      propertyRow.is_auction === '1' ||
      propertyRow.is_auction === 'true';
    if (isAuc) {
      try {
        const bidWhere = buildBidWhereForProperty(propertyRow.id, tbl);
        const agg = await prisma.bids.aggregate({ where: bidWhere, _max: { bid_amount: true } });
        const maxBid = agg?._max?.bid_amount != null ? Number(agg._max.bid_amount) : null;
        const start =
          propertyRow.auction_starting_price != null && propertyRow.auction_starting_price !== ''
            ? Number(propertyRow.auction_starting_price)
            : NaN;
        const hasMax = maxBid != null && Number.isFinite(maxBid) && maxBid > 0;
        payload.current_bid = hasMax
          ? maxBid
          : Number.isFinite(start) && start > 0
            ? start
            : null;
      } catch (_) {
        payload.current_bid = null;
      }
    }
    broadcastUserCabinetEvent(ownerId, payload);
  } catch (e) {
    console.warn('notifyOwnerPropertyEngagement:', e?.message || e);
  }
}

/** In-app уведомление покупателю: верификация одобрена — можно делать ставки на аукционе */
async function notifyBuyerVerificationApproved(userId) {
  try {
    const uid = parseInt(String(userId), 10);
    if (!uid) return;
    await notificationQueries.create({
      user_id: uid,
      type: 'verification_success',
      title: 'Верификация пройдена',
      message:
        'Ваши документы одобрены администратором. Теперь вы можете делать ставки на аукционах и пользоваться всеми функциями покупателя.',
      is_read: 0,
      view_count: 0,
    });
    console.log('✅ Уведомление verification_success для пользователя', uid);
  } catch (e) {
    console.warn('⚠️ notifyBuyerVerificationApproved:', e.message);
  }
}

/** In-app уведомление: верификация отклонена — нужно загрузить документы снова */
async function notifyBuyerVerificationRejected(userId, rejectionReason) {
  try {
    const uid = parseInt(String(userId), 10);
    if (!uid) return;
    const reason = rejectionReason && String(rejectionReason).trim() ? String(rejectionReason).trim() : null;
    const message = reason
      ? `Документы отклонены. Причина: ${reason}. Загрузите документы заново для повторной проверки.`
      : 'Документы отклонены. Загрузите документы заново для повторной проверки.';
    await notificationQueries.create({
      user_id: uid,
      type: 'verification_rejected',
      title: 'Верификация отклонена',
      message,
      data: { rejection_reason: reason },
      is_read: 0,
      view_count: 0,
    });
    console.log('✅ Уведомление verification_rejected для пользователя', uid);
  } catch (e) {
    console.warn('⚠️ notifyBuyerVerificationRejected:', e.message);
  }
}

/**
 * GET /api/events/user-updates?user_id= — SSE: события для кабинета (верификация, модерация объявлений).
 * Одно долгоживущее соединение на вкладку; сервер пушит только при действиях админа.
 */
app.get('/api/events/user-updates', async (req, res) => {
  const raw = req.query.user_id;
  if (raw === undefined || raw === null || String(raw).trim() === '' || !/^\d+$/.test(String(raw).trim())) {
    return res.status(400).json({ success: false, error: 'Нужен корректный user_id' });
  }
  const uid = String(parseInt(String(raw).trim(), 10));
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  if (!userCabinetSSEByUserId.has(uid)) {
    userCabinetSSEByUserId.set(uid, new Set());
  }
  const set = userCabinetSSEByUserId.get(uid);
  set.add(res);
  res.write(': connected\n\n');
  if (typeof res.flush === 'function') res.flush();
  const heartbeat = setInterval(() => {
    if (!set.has(res)) return;
    try {
      res.write(': hb\n\n');
      if (typeof res.flush === 'function') res.flush();
    } catch (e) {
      clearInterval(heartbeat);
      set.delete(res);
    }
  }, 25000);
  req.on('close', () => {
    clearInterval(heartbeat);
    set.delete(res);
    if (set.size === 0) userCabinetSSEByUserId.delete(uid);
  });
});

/** Подписчики SSE по property_id — push при новой ставке (страница объекта без polling) */
const propertyBidSSEByPropertyId = new Map();

function broadcastPropertyBidEvent(propertyId, payload) {
  const key = String(propertyId);
  const set = propertyBidSSEByPropertyId.get(key);
  if (!set || set.size === 0) return;
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  set.forEach((res) => {
    try {
      res.write(line);
      if (typeof res.flush === 'function') res.flush();
    } catch (e) {
      set.delete(res);
    }
  });
}

/**
 * GET /api/events/property-bids?property_id= — SSE: обновление ставок на странице объекта при новой ставке.
 */
app.get('/api/events/property-bids', async (req, res) => {
  const raw = req.query.property_id;
  if (raw === undefined || raw === null || String(raw).trim() === '' || !/^\d+$/.test(String(raw).trim())) {
    return res.status(400).json({ success: false, error: 'Нужен корректный property_id' });
  }
  const pid = String(parseInt(String(raw).trim(), 10));
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  if (!propertyBidSSEByPropertyId.has(pid)) {
    propertyBidSSEByPropertyId.set(pid, new Set());
  }
  const set = propertyBidSSEByPropertyId.get(pid);
  set.add(res);
  res.write(': connected\n\n');
  if (typeof res.flush === 'function') res.flush();
  const heartbeat = setInterval(() => {
    if (!set.has(res)) return;
    try {
      res.write(': hb\n\n');
      if (typeof res.flush === 'function') res.flush();
    } catch (e) {
      clearInterval(heartbeat);
      set.delete(res);
    }
  }, 20000);
  req.on('close', () => {
    clearInterval(heartbeat);
    set.delete(res);
    if (set.size === 0) propertyBidSSEByPropertyId.delete(pid);
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    service: 'api',
    timestamp: new Date().toISOString(),
  });
});

// API endpoint для получения конфигурации клиента (runtime переменные)
/**
 * Страна посетителя по заголовкам CDN / прокси (для локали после cookie consent).
 * GET /api/geo/country → { success, country: "DE" | null }
 */
function resolveVisitorCountryCode(req) {
  const candidates = [
    req.headers['cf-ipcountry'],
    req.headers['x-vercel-ip-country'],
    req.headers['x-country-code'],
    req.headers['cloudfront-viewer-country'],
    req.headers['x-appengine-country'],
  ];
  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    const code = raw.trim().toUpperCase();
    if (code === 'XX' || code === 'T1') continue;
    if (/^[A-Z]{2}$/.test(code)) return code;
  }
  return null;
}

app.get('/api/geo/country', (req, res) => {
  let country = resolveVisitorCountryCode(req);
  if (!country && process.env.GEO_COUNTRY_DEV) {
    const dev = String(process.env.GEO_COUNTRY_DEV).trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(dev)) country = dev;
  }
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({
    success: true,
    country,
  });
});

app.get('/api/config', async (req, res) => {
  res.setHeader(
    'Cache-Control',
    'public, max-age=120, stale-while-revalidate=600'
  );
  res.json({
    success: true,
    data: {
      clerkPublishableKey: process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || '',
      googleClientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '',
      emailjsServiceId: process.env.REACT_APP_EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID || '',
      emailjsTemplateId: process.env.REACT_APP_EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID || '',
      emailjsCrmTemplateId:
        process.env.EMAILJS_CRM_TEMPLATE_ID ||
        process.env.REACT_APP_EMAILJS_CRM_TEMPLATE_ID ||
        process.env.VITE_EMAILJS_CRM_TEMPLATE_ID ||
        '',
      emailjsPublicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY || '',
      apiBaseUrl: process.env.REACT_APP_API_BASE_URL || process.env.VITE_API_BASE_URL || '/api',
      telegramBotUsername: process.env.VITE_TELEGRAM_BOT_USERNAME || process.env.TELEGRAM_BOT_USERNAME || ''
    }
  });
});

// Получить адрес Jetton-кошелька по владельцу и мастер-контракту (для USDT и др.)
app.get('/api/ton/jetton-wallet', async (req, res) => {
  try {
    const owner = req.query.owner;
    const master = req.query.master || 'EQA_fTd7v1HOV3UqVh2EIkT7-A28MoQbr0opM7ZeqcJi97N4';
    if (!owner) {
      return res.status(400).json({ success: false, error: 'owner required' });
    }
    const ownerCell = beginCell().storeAddress(Address.parse(owner)).endCell();
    const stackB64 = ownerCell.toBoc().toString('base64');
    const payload = {
      address: master,
      method: 'get_wallet_address',
      stack: [['slice', stackB64]]
    };
    const r = await axios.post('https://toncenter.com/api/v2/runGetMethod', payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    const data = r.data;
    if (!data || data.ok === false) {
      return res.status(502).json({ success: false, error: 'TonCenter error' });
    }
    const stack = data.result?.stack ?? data.stack ?? [];
    const first = Array.isArray(stack) && stack[0];
    const cellB64 = Array.isArray(first) ? first[1] : (first?.value ?? first?.cell);
    if (!cellB64) {
      return res.status(502).json({ success: false, error: 'Invalid response' });
    }
    const cell = Cell.fromBase64(cellB64);
    const jettonWalletAddress = cell.beginParse().loadAddress();
    return res.json({
      success: true,
      walletAddress: jettonWalletAddress.toString()
    });
  } catch (err) {
    console.error('jetton-wallet error', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Internal error' });
  }
});

// Root endpoint для проверки доступности
// В production режиме НЕ регистрируем этот маршрут, чтобы статика могла отдать index.html
// В development режиме возвращаем JSON для проверки
if (process.env.NODE_ENV !== 'production') {
  app.get('/', (req, res) => {
    res.status(200).json({ 
      status: 'ok',
      message: 'Server is running',
      port: PORT,
      timestamp: new Date().toISOString()
    });
  });
}

app.use(cors({
  origin: function (origin, callback) {
    // Разрешаем запросы без origin (например, Postman, мобильные приложения)
    if (!origin) return callback(null, true);
    
    // Разрешаем localhost для локальной разработки
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Разрешаем dev tunnels домены
    if (origin.includes('devtunnels.ms') || origin.includes('devtunnels')) {
      return callback(null, true);
    }
    
    // Разрешаем все остальные домены (для тестирования)
    // В production здесь нужно указать конкретные домены
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
// Stripe webhook требует сырой body для проверки подписи
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), createStripeWebhookHandler());
/** Опрос тест-драйва может содержать base64-фото; дефолтный лимит 100kb рвёт такие запросы. */
app.use(express.json({ limit: '18mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(publicPropertyListsCache);

registerStripeBillingRoutes(app);

// Папка для загрузки файлов
const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB максимум для файлов
    fieldSize: 50 * 1024 * 1024, // 50MB максимум для текстовых полей (JSON с большими массивами URL)
    fieldNameSize: 100, // Максимальная длина имени поля
    fields: 100, // Максимальное количество полей
    files: 70 // Максимальное количество файлов (6 категорий × 10 + photo/doc fields)
  }
});

// Multer в памяти для массовой загрузки Excel/CSV (нужен buffer для парсинга)
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Статическая папка для загрузок
app.use('/uploads', express.static(uploadsDir));

const IMAGE_RESIZE_CACHE_SECONDS = 60 * 60 * 24 * 30;
const ALLOWED_RESIZE_FITS = new Set(['cover', 'contain', 'fill', 'inside', 'outside']);
const ALLOWED_RESIZE_FORMATS = new Set(['auto', 'webp', 'jpeg', 'jpg', 'png']);

function asPositiveInt(value, max) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const rounded = Math.round(n);
  if (max && rounded > max) return max;
  return rounded;
}

/**
 * GET /api/images/resize?src=/uploads/xxx.jpg&w=640&h=360&q=72&fit=cover
 * Ресайзим только изображения из локальной uploads-папки.
 */
app.get('/api/images/resize', async (req, res) => {
  try {
    const rawSrc = String(req.query.src || '').trim();
    if (!rawSrc) {
      res.status(400).json({ success: false, error: 'Missing src query param' });
      return;
    }

    let decodedSrc = rawSrc;
    try {
      decodedSrc = decodeURIComponent(rawSrc);
    } catch {
      decodedSrc = rawSrc;
    }
    const normalizedSrc = decodedSrc.replace(/\\/g, '/');
    if (!normalizedSrc.startsWith('/uploads/')) {
      res.status(400).json({ success: false, error: 'Only /uploads paths are allowed' });
      return;
    }

    const relativePath = normalizedSrc.replace(/^\/uploads\//, '');
    const uploadsRoot = resolve(uploadsDir);
    const absolutePath = resolve(uploadsDir, relativePath);
    if (!(absolutePath === uploadsRoot || absolutePath.startsWith(`${uploadsRoot}${sep}`))) {
      res.status(400).json({ success: false, error: 'Invalid src path' });
      return;
    }
    if (!fs.existsSync(absolutePath)) {
      res.status(404).json({ success: false, error: 'Image not found' });
      return;
    }

    const width = asPositiveInt(req.query.w, 2400);
    const height = asPositiveInt(req.query.h, 2400);
    const quality = asPositiveInt(req.query.q, 95) || 72;
    const fitRaw = String(req.query.fit || 'cover').toLowerCase();
    const fit = ALLOWED_RESIZE_FITS.has(fitRaw) ? fitRaw : 'cover';
    const fmtRaw = String(req.query.fmt || 'webp').toLowerCase();
    const fmt = ALLOWED_RESIZE_FORMATS.has(fmtRaw) ? fmtRaw : 'webp';

    const source = sharp(absolutePath, { failOn: 'none' });
    const metadata = await source.metadata();
    const sourceFormat = String(metadata.format || '').toLowerCase();

    const transformer = source.rotate();
    if (width || height) {
      transformer.resize({
        width: width || undefined,
        height: height || undefined,
        fit,
        withoutEnlargement: true,
      });
    }

    const outputFormat =
      fmt === 'auto'
        ? (sourceFormat === 'png' ? 'png' : 'webp')
        : (fmt === 'jpg' ? 'jpeg' : fmt);
    if (outputFormat === 'png') {
      transformer.png({ compressionLevel: 9, effort: 9 });
      res.type('image/png');
    } else if (outputFormat === 'jpeg') {
      transformer.jpeg({ quality, mozjpeg: true });
      res.type('image/jpeg');
    } else {
      transformer.webp({ quality, effort: 5 });
      res.type('image/webp');
    }

    res.set('Cache-Control', `public, max-age=${IMAGE_RESIZE_CACHE_SECONDS}, immutable`);
    const buffer = await transformer.toBuffer();
    res.send(buffer);
  } catch (error) {
    console.error('GET /api/images/resize error:', error);
    res.status(500).json({ success: false, error: 'Failed to resize image' });
  }
});

// Middleware для логирования всех запросов и подсчета
let requestCount = 0;
let requestStats = {
  total: 0,
  byMethod: {},
  byPath: {},
  startTime: Date.now()
};

app.use((req, res, next) => {
  if (!VERBOSE_HTTP) return next();

  requestCount++;
  requestStats.total++;
  requestStats.byMethod[req.method] = (requestStats.byMethod[req.method] || 0) + 1;
  if (req.path.startsWith('/api/')) {
    const pathKey = req.method + ' ' + req.path.split('?')[0];
    requestStats.byPath[pathKey] = (requestStats.byPath[pathKey] || 0) + 1;
  }
  console.log(
    `📥 [${requestCount}] ${req.method} ${req.path}${
      req.query && Object.keys(req.query).length > 0 ? '?' + new URLSearchParams(req.query).toString() : ''
    }`
  );
  if (requestCount % 10 === 0) {
    const uptime = Math.floor((Date.now() - requestStats.startTime) / 1000);
    console.log(`\n📊 Статистика запросов (за ${uptime} сек):`);
    console.log(`   Всего запросов: ${requestStats.total}`);
    console.log(`   По методам:`, requestStats.byMethod);
    console.log(
      `   Топ-10 API запросов:`,
      Object.entries(requestStats.byPath)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, count]) => `${path}: ${count}`)
        .join(', ')
    );
    console.log('');
  }
  next();
});

// Middleware для логирования запросов к test-timer (для диагностики)
app.use('/api/properties', (req, res, next) => {
  if (req.path.includes('test-timer')) {
    console.log('🔍 Middleware: Запрос к test-timer:', {
      method: req.method,
      path: req.path,
      url: req.url,
      originalUrl: req.originalUrl
    });
  }
  next();
});

// Инициализация базы данных (PostgreSQL через Prisma)
console.log('💾 Инициализация базы данных...');
try {
  await initDatabase();
  console.log('✅ База данных инициализирована успешно');
} catch (dbError) {
  console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Не удалось инициализировать базу данных:', dbError);
  console.error('💡 Проверьте DATABASE_URL и доступность PostgreSQL.');
}

// ========== НАСТРОЙКА WHATSAPP WEB КЛИЕНТА ==========
let waClientReady = false;
let currentQRCode = null; // Сохраняем текущий QR-код для отображения в футере
/** Диагностика для GET /api/whatsapp/status (waDiag) */
let waLastQrAt = null;
let waLastInitError = null;
let waConnectionState = null;

// ========== СИСТЕМА ОТСЛЕЖИВАНИЯ ОБЪЕКТОВ БЕЗ СТАВОК ==========
// Map для хранения таймеров объектов: propertyId -> timeoutId
const propertyTimers = new Map();
// Map для отслеживания объектов, на которые уже отправлены уведомления: propertyId -> true
const notifiedProperties = new Set();
// ========== КОНЕЦ СИСТЕМЫ ОТСЛЕЖИВАНИЯ ==========

/** Явный URL кэша версии WA Web (перекрывает значение по умолчанию). */
const waRemoteVersionPath = String(process.env.WA_WEB_VERSION_REMOTE_PATH || '').trim();
/** Отключить remote cache полностью: WA_DISABLE_REMOTE_WEB_VERSION=1 */
const waDisableRemoteWebVersion = process.env.WA_DISABLE_REMOTE_WEB_VERSION === '1';
/**
 * Без remote webVersionCache WhatsApp Web часто не доходит до события qr (устаревший скрипт в бандле).
 * По умолчанию включаем remote cache wwebjs; при проблемах с DNS задайте WA_DISABLE_REMOTE_WEB_VERSION=1
 * или свой WA_WEB_VERSION_REMOTE_PATH.
 */
const waDefaultRemoteCacheUrl =
  'https://raw.githubusercontent.com/wwebjs-bot/whatsapp-web.js/main/web-cache/version.json';

/**
 * Chrome/Chromium для whatsapp-web.js (Puppeteer). Иначе: "Could not find Chrome" — см. npm run puppeteer:install
 * Переопределение: PUPPETEER_EXECUTABLE_PATH=/path/to/chrome
 */
function resolvePuppeteerExecutablePath() {
  const envPath = String(process.env.PUPPETEER_EXECUTABLE_PATH || '').trim();
  if (envPath && fs.existsSync(envPath)) return envPath;

  if (process.platform === 'darwin') {
    const mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (fs.existsSync(mac)) return mac;
    const brave = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
    if (fs.existsSync(brave)) return brave;
  }
  if (process.platform === 'linux') {
    const candidates = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/opt/google/chrome/chrome',
      '/snap/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }
  if (process.platform === 'win32') {
    const win = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
    for (const c of win) {
      if (fs.existsSync(c)) return c;
    }
  }
  return undefined;
}

/**
 * Результат: executablePath | channel | bundled.
 * Раньше по умолчанию был channel "chrome" → на Linux без .deb Chrome мгновенно падало с
 * "Could not find Google Chrome ... /opt/google/chrome/chrome". Встроенный Chromium
 * надёжнее на Docker/minimal-серверах; системный Chrome — через PUPPETEER_EXECUTABLE_PATH
 * или явный PUPPETEER_CHANNEL=chrome.
 */
function resolvePuppeteerLaunchOptions() {
  const envPath = String(process.env.PUPPETEER_EXECUTABLE_PATH || '').trim();
  if (envPath && fs.existsSync(envPath)) {
    return { mode: 'executablePath', executablePath: envPath };
  }

  const resolved = resolvePuppeteerExecutablePath();
  if (resolved) {
    return { mode: 'executablePath', executablePath: resolved };
  }

  if (process.env.WA_PUPPETEER_CHANNEL_DISABLE === '1') {
    return { mode: 'bundled' };
  }

  const ch = String(process.env.PUPPETEER_CHANNEL || '').trim();
  if (!ch || ch === 'none') {
    return { mode: 'bundled' };
  }

  return { mode: 'channel', channel: ch };
}

const waPuppeteerLaunch = resolvePuppeteerLaunchOptions();

const waClientOptions = {
  authStrategy: new LocalAuth({
    dataPath: join(__dirname, '.wwebjs_auth')
  }),
  puppeteer: {
    ...(waPuppeteerLaunch.mode === 'executablePath'
      ? { executablePath: waPuppeteerLaunch.executablePath }
      : waPuppeteerLaunch.mode === 'channel'
        ? { channel: waPuppeteerLaunch.channel }
        : {}),
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],
    // Увеличиваем таймаут для протокольных операций (по умолчанию 180000мс)
    // Это решает ошибку "Runtime.evaluate timed out" и "Runtime.callFunctionOn timed out"
    // На Railway может потребоваться больше времени из-за ограниченных ресурсов
    protocolTimeout: 600000, // 10 минут (для Railway и медленных соединений)
    // Дополнительные настройки для стабильности
    defaultViewport: {
      width: 1280,
      height: 720
    },
    // Игнорируем ошибки HTTPS (если есть проблемы с сертификатами)
    ignoreHTTPSErrors: true
  },
  ...(!waDisableRemoteWebVersion
    ? {
        webVersionCache: {
          type: 'remote',
          remotePath: waRemoteVersionPath || waDefaultRemoteCacheUrl,
        },
      }
    : {})
};

const waClient = new Client(waClientOptions);

if (waPuppeteerLaunch.mode === 'executablePath') {
  console.log('[WA] Puppeteer → executablePath:', waPuppeteerLaunch.executablePath);
} else if (waPuppeteerLaunch.mode === 'channel') {
  console.log(
    `[WA] Puppeteer → channel: "${waPuppeteerLaunch.channel}" (явный PUPPETEER_CHANNEL; иначе по умолчанию — встроенный Chromium)`
  );
} else {
  console.log(
    '[WA] Puppeteer → встроенный Chromium (кэш Puppeteer). При ошибке запуска: npm run puppeteer:install или PUPPETEER_EXECUTABLE_PATH к Chrome/Chromium'
  );
}

waClient.on('loading_screen', (percent, message) => {
  const p = Number(percent);
  if (p === 0 || p >= 99 || p % 20 === 0) {
    console.log(`[WA] Загрузка WhatsApp Web: ${p}% ${message ? String(message) : ''}`);
  }
});

waClient.on('change_state', (state) => {
  waConnectionState = state != null ? String(state) : null;
  console.log('[WA] Состояние:', state);
});

waClient.on('error', (err) => {
  waLastInitError = err?.message || String(err);
  console.error('[WA] Ошибка клиента:', waLastInitError);
});

waClient.on('qr', (qr) => {
  // Сохраняем QR-код для отображения в футере
  currentQRCode = qr;
  waLastQrAt = Date.now();
  
  // Выводим компактный QR-код
  console.log('\n📲 WhatsApp QR-код для сканирования:');
  console.log('═══════════════════════════════════════════════════════');
  try {
    // Используем минимальный размер QR-кода для консоли
    // qrcode-terminal автоматически использует small: true для компактного вывода
    qrcode.generate(qr, { small: true });
  } catch (e) {
    // Если не удалось сгенерировать, просто выводим URL
    console.log('⚠️ Не удалось сгенерировать QR-код, используйте код ниже');
  }
  console.log('═══════════════════════════════════════════════════════');
  console.log('💡 Альтернатива: Введите этот код вручную в WhatsApp:');
  console.log('');
  console.log('   Инструкция:');
  console.log('   1. Откройте WhatsApp на телефоне');
  console.log('   2. Перейдите в Настройки → Устройства → Связать устройство');
  console.log('   3. Нажмите "Связать устройство вручную"');
  console.log('   4. Введите код ниже (без пробелов и переносов строк):');
  console.log('');
  
  // Разбиваем длинную строку на части для лучшей читаемости
  // Но выводим код целиком, чтобы его можно было скопировать
  const chunkSize = 70; // Длина строки для отображения
  for (let i = 0; i < qr.length; i += chunkSize) {
    const chunk = qr.substring(i, i + chunkSize);
    console.log(`   ${chunk}`);
  }
  
  console.log('');
  console.log('   ⚠️ ВАЖНО: Скопируйте весь код выше (все строки) и вставьте в WhatsApp');
  console.log('   Код должен быть одной непрерывной строкой без пробелов!');
  console.log('═══════════════════════════════════════════════════════\n');
});

// Обработчик события authenticated - клиент успешно авторизован
waClient.on('authenticated', () => {
  console.log('✅ WhatsApp клиент успешно авторизован');
  // Очищаем QR-код после авторизации
  currentQRCode = null;
  // Не устанавливаем waClientReady здесь, ждем события 'ready'
});

// Функция для применения патча sendSeen (обход бага markedUnread)
const applySendSeenPatch = async () => {
  try {
    if (waClient && waClient.pupPage) {
      await waClient.pupPage.evaluate(() => {
        // Более агрессивный патч - переопределяем sendSeen на всех уровнях
        if (window.WWebJS) {
          // Сохраняем оригинальную функцию, если она существует
          const originalSendSeen = window.WWebJS.sendSeen;
          
          // Переопределяем sendSeen на безопасную функцию
          window.WWebJS.sendSeen = async function(...args) {
            try {
              // Пытаемся вызвать оригинальную функцию, если она существует и работает
              if (originalSendSeen && typeof originalSendSeen === 'function') {
                try {
                  return await originalSendSeen.apply(this, args);
                } catch (e) {
                  // Если оригинальная функция падает с ошибкой markedUnread, просто игнорируем
                  if (e.message && e.message.includes('markedUnread')) {
                    console.warn('⚠️ Обход ошибки markedUnread в sendSeen');
                    return;
                  }
                  throw e;
                }
              }
              // Если оригинальной функции нет, просто возвращаемся
              return;
            } catch (error) {
              // Игнорируем все ошибки в sendSeen
              if (error.message && error.message.includes('markedUnread')) {
                return;
              }
              // Для других ошибок тоже возвращаемся без ошибки
              return;
            }
          };
          
          // Также патчим возможные другие места, где может быть sendSeen
          if (window.Store && window.Store.Msg) {
            const originalMarkRead = window.Store.Msg.markRead;
            if (originalMarkRead) {
              window.Store.Msg.markRead = async function(...args) {
                try {
                  return await originalMarkRead.apply(this, args);
                } catch (e) {
                  if (e.message && e.message.includes('markedUnread')) {
                    return;
                  }
                  throw e;
                }
              };
            }
          }
        }
      });
      console.log('✅ Патч sendSeen применён успешно');
      return true;
    }
  } catch (patchError) {
    console.warn('⚠️ Не удалось применить патч sendSeen:', patchError.message);
    return false;
  }
  return false;
};

/** Внутренняя отправка WhatsApp (напоминания аукциона). */
async function trySendWhatsAppDigits(rawPhoneDigits, messageText) {
  const text = String(messageText || '').trim();
  if (!text) return { ok: false, error: 'empty' };
  if (!waClientReady) {
    try {
      if (waClient && waClient.info && waClient.info.wid) waClientReady = true;
    } catch (_) {
      /* ignore */
    }
  }
  if (!waClientReady) return { ok: false, error: 'not_ready' };
  const digits = String(rawPhoneDigits || '').replace(/\D/g, '');
  if (!digits) return { ok: false, error: 'bad_phone' };
  const chatId = `${digits}@c.us`;
  try {
    await applySendSeenPatch();
    await waClient.sendMessage(chatId, text);
    return { ok: true };
  } catch (e) {
    const errMessage = e?.message || '';
    if (
      errMessage.includes('markedUnread') ||
      errMessage.includes('Cannot read properties of undefined')
    ) {
      try {
        await applySendSeenPatch();
        await waClient.sendMessage(chatId, text);
        return { ok: true };
      } catch (e2) {
        console.error('[auction-reminder] WA retry failed:', e2);
        return { ok: false, error: e2.message };
      }
    }
    console.error('[auction-reminder] WA:', e);
    return { ok: false, error: e.message };
  }
}

function getFrontendBaseUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

/** Рассылка WhatsApp с ссылкой на опрос проживания (тест-драйв). */
async function sendTestDriveSurveyWhatsAppForBooking(bookingId, options = {}) {
  const manual = Boolean(options.manual);
  await testDriveBookingQueries.ensureTable();
  const booking = await testDriveBookingQueries.getById(bookingId);
  if (!booking || !booking.survey_token) {
    return { ok: false, error: 'no_booking_or_token' };
  }
  const st = String(booking.status || '').toLowerCase();
  if (st === 'cancelled') return { ok: false, error: 'cancelled' };
  const sentAlready = String(booking.survey_whatsapp_status || '').toLowerCase() === 'sent';
  if (sentAlready && !manual) return { ok: true, already: true };

  const user = await userQueries.getById(booking.user_id);
  const phone = user?.phone_number || '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return { ok: false, error: 'no_phone' };

  const url = `${getFrontendBaseUrl()}/test-drive/survey/${booking.survey_token}`;
  const hello = user?.first_name ? `Здравствуйте, ${user.first_name}! ` : '';
  const text = `${hello}Как проходит проживание? Пройдите короткий опрос: ${url}`;

  const wa = await trySendWhatsAppDigits(digits, text);
  if (!wa.ok) return { ok: false, error: wa.error || 'wa_failed' };

  await testDriveBookingQueries.markSurveyWhatsAppSent(bookingId);
  return { ok: true };
}

/** Рассылка WhatsApp после выезда — оценка объекта (звёзды). */
async function sendTestDriveExitFeedbackWhatsAppForBooking(bookingId, options = {}) {
  const manual = Boolean(options.manual);
  await testDriveBookingQueries.ensureTable();
  const booking = await testDriveBookingQueries.getById(bookingId);
  if (!booking || !String(booking.exit_feedback_token || '').trim()) {
    return { ok: false, error: 'no_booking_or_token' };
  }
  const st = String(booking.status || '').toLowerCase();
  if (st === 'cancelled' || st === 'rejected') return { ok: false, error: 'cancelled' };
  const sentAlready = String(booking.exit_feedback_whatsapp_status || '').toLowerCase() === 'sent';
  if (sentAlready && !manual) return { ok: true, already: true };

  const user = await userQueries.getById(booking.user_id);
  const phone = user?.phone_number || '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return { ok: false, error: 'no_phone' };

  const url = `${getFrontendBaseUrl()}/test-drive/feedback/${booking.exit_feedback_token}`;
  const hello = user?.first_name ? `Здравствуйте, ${user.first_name}! ` : '';
  const text = `${hello}Как всё прошло после проживания? Оцените объект по ссылке: ${url}`;

  const wa = await trySendWhatsAppDigits(digits, text);
  if (!wa.ok) return { ok: false, error: wa.error || 'wa_failed' };

  await testDriveBookingQueries.markExitFeedbackWhatsAppSent(bookingId);
  return { ok: true };
}

waClient.on('ready', async () => {
  waClientReady = true;
  // Очищаем QR-код после готовности клиента
  currentQRCode = null;
  console.log('✅ WhatsApp клиент готов к отправке сообщений');

  // Применяем патч sendSeen при готовности клиента
  await applySendSeenPatch();
});

waClient.on('auth_failure', (msg) => {
  waClientReady = false;
  waLastInitError = typeof msg === 'string' ? msg : JSON.stringify(msg);
  console.error('❌ Ошибка авторизации WhatsApp:', msg);
});

waClient.on('disconnected', (reason) => {
  waClientReady = false;
  console.warn('⚠️ WhatsApp клиент отключен. Причина:', reason);
  console.log('🔄 Пытаемся переподключиться через 5 секунд...');
  
  // Задержка перед переподключением для избежания быстрых циклов переподключения
  setTimeout(() => {
    try {
      waClient.initialize();
    } catch (error) {
      console.error('❌ Ошибка при переподключении WhatsApp:', error.message);
    }
  }, 5000);
});

// Функция для проверки состояния клиента
const checkClientState = async () => {
  try {
    if (waClient && waClient.info) {
      const info = waClient.info;
      console.log('📊 Состояние WhatsApp клиента:', {
        wid: info.wid ? info.wid.user : 'не определен',
        platform: info.platform || 'не определен',
        pushname: info.pushname || 'не определен'
      });
      
      // Если клиент имеет информацию, значит он авторизован
      if (info.wid) {
        console.log('✅ Клиент уже авторизован, проверяем готовность...');
        // Проверяем, можем ли мы отправить тестовое сообщение
        try {
          // Просто проверяем наличие pupPage как индикатор готовности
          if (waClient.pupPage) {
            waClientReady = true;
            console.log('✅ WhatsApp клиент готов (определено через проверку состояния)');
            // Применяем патч sendSeen при обнаружении готовности
            await applySendSeenPatch();
          }
        } catch (checkError) {
          console.warn('⚠️ Не удалось проверить готовность клиента:', checkError.message);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Ошибка при проверке состояния клиента:', error.message);
  }
};

// Функция для инициализации WhatsApp с повторными попытками
let waInitAttempts = 0;
const MAX_WA_INIT_ATTEMPTS = 3;
const WA_INIT_RETRY_DELAY = 30000; // 30 секунд между попытками

function buildWaDiag() {
  const authPath = join(__dirname, '.wwebjs_auth');
  return {
    lastQrAt: waLastQrAt,
    lastError: waLastInitError,
    connectionState: waConnectionState,
    initAttempts: waInitAttempts,
    sessionFolderExists: fs.existsSync(authPath),
    remoteWebCache: waDisableRemoteWebVersion ? 'off' : 'remote',
    remoteCacheUrl: waDisableRemoteWebVersion ? null : waRemoteVersionPath || waDefaultRemoteCacheUrl,
    pairingCodeLength: currentQRCode ? currentQRCode.length : 0,
    chromeExecutable:
      waPuppeteerLaunch.mode === 'executablePath' ? waPuppeteerLaunch.executablePath : null,
    puppeteerChannel: waPuppeteerLaunch.mode === 'channel' ? waPuppeteerLaunch.channel : null,
  };
}

const initializeWhatsApp = () => {
  waInitAttempts++;
  console.log(`🔄 Попытка инициализации WhatsApp (${waInitAttempts}/${MAX_WA_INIT_ATTEMPTS})...`);
  
  try {
    waClient.initialize().then(() => {
      // После инициализации проверяем состояние через небольшую задержку
      setTimeout(() => {
        checkClientState();
      }, 2000); // 2 секунды задержка для завершения инициализации
    }).catch((error) => {
      waLastInitError = error?.message || String(error);
      console.error('❌ Ошибка при инициализации WhatsApp клиента:', error.message);
      
      const msg = error?.message || '';
      const chromeMissing =
        msg.includes('Could not find Chrome') ||
        msg.includes('Could not find browser') ||
        msg.includes('Browser was not found');

      // Специальная обработка для timeout ошибок
      if (msg.includes('timed out') || msg.includes('timeout')) {
        console.warn('⚠️ Таймаут при инициализации WhatsApp (это нормально на Railway).');
        
        // Повторная попытка через некоторое время, если не превышен лимит
        if (waInitAttempts < MAX_WA_INIT_ATTEMPTS) {
          console.log(`🔄 Повторная попытка инициализации через ${WA_INIT_RETRY_DELAY / 1000} секунд...`);
          setTimeout(() => {
            initializeWhatsApp();
          }, WA_INIT_RETRY_DELAY);
        } else {
          console.warn('   Достигнут лимит попыток инициализации.');
          console.warn('   WhatsApp может инициализироваться позже или потребуется перезапуск.');
          console.warn('   Сервер продолжит работу без WhatsApp функциональности.');
          console.log('💡 Если нужно использовать WhatsApp, попробуйте:');
          console.log('   1. Перезапустить сервис на Railway');
          console.log('   2. Проверить логи через несколько минут (инициализация может занять время)');
        }
      } else if (msg.includes('libglib') || msg.includes('shared libraries')) {
        console.warn('⚠️ Не хватает системных библиотек для Chrome/Puppeteer.');
        console.warn('   WhatsApp функциональность будет недоступна, но сервер продолжит работу.');
      } else if (chromeMissing) {
        console.error('[WA] Не найден браузер для Puppeteer.');
        console.error('   Вариант 1 (рекомендуется): npm run puppeteer:install');
        console.error(
          '   Вариант 2: установите Google Chrome; на macOS путь подставится автоматически после перезапуска сервера.'
        );
        console.error('   Вариант 3: переменная окружения PUPPETEER_EXECUTABLE_PATH=/полный/путь/к/chrome');
      } else {
        console.log('💡 Это нормально, если WhatsApp Web еще не авторизован.');
        console.log('   Отсканируйте QR-код, который появится в консоли, чтобы подключить WhatsApp.');
      }
      
      // Сервер продолжает работу даже если WhatsApp не инициализировался
      if (waInitAttempts >= MAX_WA_INIT_ATTEMPTS) {
        console.log('✅ Сервер продолжает работу без WhatsApp функциональности.');
      }
    });
  } catch (error) {
    waLastInitError = error?.message || String(error);
    console.error('❌ Критическая ошибка при инициализации WhatsApp:', error.message);
    console.log('⚠️ WhatsApp клиент будет недоступен до перезапуска сервера.');
  }
};

// Инициализируем WhatsApp клиент с обработкой ошибок
initializeWhatsApp();

/**
 * Удаляет пароль из объекта пользователя (для безопасности)
 */
const removePasswordFromUser = (user) => {
  if (!user) return null;
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Удаляет пароли из массива пользователей
 */
const removePasswordsFromUsers = (users) => {
  return users.map(user => removePasswordFromUser(user));
};

// ========== РОУТЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ==========

/**
 * GET /api/users - Получить всех пользователей
 */
app.get('/api/users', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const users = await userQueries.getAll(limit, offset);
    console.log(`📋 Запрос пользователей: limit=${limit}, offset=${offset}, найдено=${users.length}`);
    // Удаляем пароли из всех пользователей перед отправкой
    const usersWithoutPasswords = removePasswordsFromUsers(users);
    res.json({ success: true, data: usersWithoutPasswords });
  } catch (error) {
    console.error('❌ Ошибка при получении пользователей:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/:id - Получить пользователя по ID
 */
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await userQueries.getById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    // Удаляем пароль перед отправкой (для безопасности)
    const userWithoutPassword = removePasswordFromUser(user);
    res.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users/:userId/private-club/redeem-promo
 * body: { code: string } — промокод VIP закрытого клуба (+30 дней). Список кодов: env VIP_CLUB_PROMO_CODES (по умолчанию ADMIN).
 */
app.post('/api/users/:userId/private-club/redeem-promo', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId) || userId < 1) {
      return res.status(400).json({ success: false, error: 'Некорректный user id' });
    }
    if (!(await userQueries.getById(userId))) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!code) {
      return res.status(400).json({ success: false, error: 'Укажите промокод' });
    }
    const envCodes = (process.env.VIP_CLUB_PROMO_CODES || 'ADMIN')
      .split(/[\s,;]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const normalized = code.toUpperCase();
    if (!envCodes.includes(normalized)) {
      return res.status(400).json({ success: false, error: 'invalid_promo' });
    }
    const updated = await userQueries.grantVipClubPromoMonth(userId);
    return res.json({
      success: true,
      data: {
        vip_until: updated?.vip_until || null,
        vip_granted_at: updated?.vip_granted_at || null,
      },
    });
  } catch (error) {
    console.error('POST /api/users/:userId/private-club/redeem-promo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/private-club/members — участники закрытого клуба (VIP в БД или активная подписка Stripe VIP).
 */
app.get('/api/admin/private-club/members', async (req, res) => {
  try {
    const data = await userQueries.listPrivateClubParticipants();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/admin/private-club/members:', error);
    return res.status(500).json({ success: false, error: error.message || 'Ошибка сервера' });
  }
});

/**
 * POST /api/admin/private-club/members/:userId/revoke — обнулить vip_until и vip_granted_at.
 * Push в кабинет (SSE), если после этого у пользователя больше нет VIP-доступа.
 */
app.post('/api/admin/private-club/members/:userId/revoke', async (req, res) => {
  try {
    const userId = parseInt(String(req.params.userId), 10);
    if (!Number.isFinite(userId) || userId < 1) {
      return res.status(400).json({ success: false, error: 'Некорректный user id' });
    }
    const before = await userQueries.getById(userId);
    if (!before) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    const hadDbVip = Boolean(before.vip_until && new Date(before.vip_until).getTime() > Date.now());
    await userQueries.revokePrivateClubDbVip(userId);
    const userRow = await userQueries.getById(userId);
    const subState = await stripeSubscriptionQueries.getStateByUserId(userId);
    const inactive = new Set(['canceled', 'unpaid', 'incomplete_expired', 'incomplete']);
    const st = subState?.status ? String(subState.status).toLowerCase() : '';
    const pk = subState?.plan_key ? String(subState.plan_key).toLowerCase() : '';
    const stripeVip = pk === 'vip' && st !== '' && !inactive.has(st);
    const untilMs = userRow?.vip_until ? new Date(userRow.vip_until).getTime() : 0;
    const dbVipActive = Boolean(untilMs && untilMs > Date.now());
    const stillHasVipAccess = dbVipActive || stripeVip;
    if (hadDbVip && !stillHasVipAccess) {
      broadcastUserCabinetEvent(userId, { type: 'private_club_removed' });
    }
    return res.json({
      success: true,
      data: {
        revoked_db_fields: hadDbVip,
        still_has_vip_access: stillHasVipAccess,
      },
    });
  } catch (error) {
    console.error('POST /api/admin/private-club/members/:userId/revoke:', error);
    return res.status(500).json({ success: false, error: error.message || 'Ошибка сервера' });
  }
});

/**
 * GET /api/users/:userId/favorites — список избранных объектов (property_id + property_table)
 */
app.get('/api/users/:userId/favorites', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Некорректный user id' });
    }
    if (!await userQueries.getById(userId)) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    const data = await favoriteQueries.listForUser(userId);
    res.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/users/:userId/favorites:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users/:userId/favorites — добавить в избранное
 * body: { property_id, property_table }
 */
app.post('/api/users/:userId/favorites', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Некорректный user id' });
    }
    if (!await userQueries.getById(userId)) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    const { property_id, property_table } = req.body || {};
    if (property_id == null) {
      return res.status(400).json({ success: false, error: 'Укажите property_id' });
    }
    const result = await favoriteQueries.add(userId, property_id, property_table);
    if (result.changes > 0) {
      try {
        const prismaFav = getPrisma();
        const pid = parseInt(property_id, 10);
        const propRow = await propertyQueries.getById(pid, null);
        if (propRow) {
          void notifyOwnerPropertyEngagement(
            prismaFav,
            propRow,
            favoriteQueries.normalizePropertyTable(property_table)
          );
        }
      } catch (e) {
        console.warn('POST favorites — push лайков владельцу:', e?.message || e);
      }
    }
    res.json({ success: true, added: result.changes > 0 });
  } catch (error) {
    console.error('POST /api/users/:userId/favorites:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/users/:userId/favorites — убрать из избранного
 * body: { property_id, property_table }
 */
app.delete('/api/users/:userId/favorites', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Некорректный user id' });
    }
    const { property_id, property_table } = req.body || {};
    if (property_id == null) {
      return res.status(400).json({ success: false, error: 'Укажите property_id' });
    }
    const result = await favoriteQueries.remove(userId, property_id, property_table);
    if (result.changes > 0) {
      try {
        const prismaFav = getPrisma();
        const pid = parseInt(property_id, 10);
        const propRow = await propertyQueries.getById(pid, null);
        if (propRow) {
          void notifyOwnerPropertyEngagement(
            prismaFav,
            propRow,
            favoriteQueries.normalizePropertyTable(property_table)
          );
        }
      } catch (e) {
        console.warn('DELETE favorites — push лайков владельцу:', e?.message || e);
      }
    }
    res.json({ success: true, removed: result.changes > 0 });
  } catch (error) {
    console.error('DELETE /api/users/:userId/favorites:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users/:userId/auction-reminders
 * body: { property_id, property_table, notify_email, notify_whatsapp, scheduled_at (ISO) }
 */
app.post('/api/users/:userId/auction-reminders', express.json(), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Некорректный user id' });
    }
    if (!await userQueries.getById(userId)) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    const {
      property_id: propertyId,
      property_table: propertyTable,
      notify_email: notifyEmail,
      notify_whatsapp: notifyWhatsapp,
      scheduled_at: scheduledAt,
    } = req.body || {};
    if (propertyId == null) {
      return res.status(400).json({ success: false, error: 'Укажите property_id' });
    }
    if (!notifyEmail && !notifyWhatsapp) {
      return res.status(400).json({ success: false, error: 'Выберите хотя бы один канал: почта или WhatsApp' });
    }
    const profile = await userQueries.getById(userId);
    const profileEmail = profile?.email && String(profile.email).trim();
    const profilePhone = profile?.phone_number && String(profile.phone_number).trim();
    if (notifyEmail && !profileEmail) {
      return res.status(400).json({
        success: false,
        error:
          'В профиле не сохранён email — укажите почту в личном кабинете, иначе напоминание на почту отправить некуда.',
      });
    }
    if (notifyWhatsapp && !profilePhone) {
      return res.status(400).json({
        success: false,
        error: 'В профиле не сохранён телефон — укажите номер для WhatsApp.',
      });
    }
    const schedMs = parsePropertyDateMs(scheduledAt);
    if (schedMs == null) {
      return res.status(400).json({ success: false, error: 'Некорректная дата напоминания' });
    }
    const minMs = Date.now() + 55 * 1000;
    if (schedMs < minMs) {
      return res.status(400).json({ success: false, error: 'Время напоминания должно быть в будущем' });
    }
    const row = await loadPropertyRowForReminder(propertyId, propertyTable);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Объект не найден' });
    }
    if (propertyRowHasCircularTestTimer(row)) {
      return res.status(400).json({
        success: false,
        error:
          'Напоминание доступно только в преаукционе (линейный таймер). Во время кругового таймера оно недоступно.',
      });
    }
    const startMs = parsePropertyDateMs(row.auction_start_date);
    const endMs = parsePropertyDateMs(row.auction_end_date);
    if (endMs != null && schedMs > endMs) {
      return res.status(400).json({
        success: false,
        error: 'Напоминание не может быть позже окончания аукциона',
      });
    }
    // Пока дата старта в будущем — напоминание только до неё. Если старт уже прошёл, линейный этап идёт до конца — ограничение только по дате окончания выше.
    if (startMs != null && startMs > Date.now() && schedMs >= startMs) {
      return res.status(400).json({
        success: false,
        error: 'Напоминание должно быть до начала аукциона',
      });
    }
    const nowForStart = Date.now();
    const auctionStartAtIso =
      startMs != null && startMs > nowForStart ? new Date(startMs).toISOString() : null;
    const title =
      row.title ||
      row.name ||
      row.property_title ||
      `Объект #${propertyId}`;
    await auctionReminderQueries.upsert({
      userId,
      propertyId,
      propertyTable,
      notifyEmail: Boolean(notifyEmail),
      notifyWhatsapp: Boolean(notifyWhatsapp),
      scheduledAtIso: new Date(schedMs).toISOString(),
      auctionStartAtIso,
      propertyTitle: title,
    });
    const saved = await auctionReminderQueries.getForUserProperty(userId, propertyId, propertyTable);
    const ch = [notifyEmail ? 'email' : null, notifyWhatsapp ? 'whatsapp' : null].filter(Boolean).join('+');
    console.log(
      `[auction-reminder] Сохранено напоминание: user_id=${userId} → email=${profileEmail || '—'} phone=${profilePhone ? 'есть' : '—'} | scheduled_at=${saved?.scheduled_at || new Date(schedMs).toISOString()} | объект #${propertyId} (${propertyTable}) «${title}» | каналы: ${ch}`
    );
    res.json({ success: true, data: saved });
  } catch (error) {
    console.error('POST auction-reminders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users/:userId/auction-reminders/send-test
 * Тестовое письмо «как напоминание» — не меняет запись в auction_reminders.
 * body: { property_id?, property_table? } — для ссылки в письме
 */
app.post('/api/users/:userId/auction-reminders/send-test', express.json(), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Некорректный user id' });
    }
    const user = await userQueries.getById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    const em = user.email && String(user.email).trim();
    if (!em) {
      return res.status(400).json({
        success: false,
        error: 'В профиле не сохранён email — тестовое письмо отправить некуда.',
      });
    }
    const { property_id: propertyId, property_table: propertyTable } = req.body || {};
    let title = 'Объект';
    let link = buildPropertyPublicLink(propertyId != null ? Number(propertyId) : 0);
    if (propertyId != null && propertyTable) {
      const row = await loadPropertyRowForReminder(propertyId, propertyTable);
      if (row) {
        title = row.title || row.name || row.property_title || title;
        link = buildPropertyPublicLink(propertyId);
      }
    }
    const subject = `[Тест] Напоминание об аукционе — ${title}`;
    const body = `Это тестовое письмо с сервера Sellyourbrick.\n\nЕсли вы его видите, доставка напоминаний на почту настроена верно.\n\nОбъект: ${title}\nСсылка:\n${link}\n\nС уважением, Sellyourbrick`;
    await sendCrmEmailViaEmailJS(em, subject, body);
    console.log(`[auction-reminder] Тестовое письмо отправлено → ${em} (user_id=${userId}) объект «${title}»`);
    res.json({ success: true });
  } catch (error) {
    console.error('POST auction-reminders/send-test:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Ошибка отправки' });
  }
});

/**
 * GET /api/users/:userId/auction-reminders?property_id=&property_table=
 */
app.get('/api/users/:userId/auction-reminders', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Некорректный user id' });
    }
    const pid = req.query.property_id != null ? parseInt(String(req.query.property_id), 10) : 0;
    const ptable = req.query.property_table;
    if (!pid || !ptable) {
      return res.status(400).json({ success: false, error: 'Нужны property_id и property_table' });
    }
    const row = await auctionReminderQueries.getForUserProperty(userId, pid, ptable);
    res.json({ success: true, data: row || null });
  } catch (error) {
    console.error('GET auction-reminders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/:id/verification-status - Получить статус готовности к верификации
 * Возвращает информацию о том, какие поля заполнены и что нужно для готовности
 */
app.get('/api/users/:id/verification-status', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await userQueries.getById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    // Получаем документы пользователя
    const documents = await documentQueries.getByUserId(userId);
    const rejectedDocuments = documents.filter(doc => doc.verification_status === 'rejected');
    const rejectionReasonsUnique = [
      ...new Set(
        rejectedDocuments
          .map((d) => (d.rejection_reason && String(d.rejection_reason).trim() ? String(d.rejection_reason).trim() : null))
          .filter(Boolean)
      ),
    ];
    const rejectionReasonSummary =
      rejectionReasonsUnique.length > 0 ? rejectionReasonsUnique.join(' ') : null;
    const roleNormForGate = String(user.role || 'buyer').toLowerCase();
    const skipRejectionGate = roleNormForGate === 'admin';
    const needsReverificationAfterRejection =
      !skipRejectionGate &&
      rejectedDocuments.length > 0 &&
      !(user.is_verified === 1 || user.is_verified === true);
    const pendingDocuments = documents.filter(doc => doc.verification_status === 'pending');
    
    // Создаем объект для проверки готовности
    const userForCheck = {
      ...user,
      documents: pendingDocuments
    };
    
    // Проверяем готовность
    const readiness = checkUserReadinessForModeration(userForCheck);
    
    // Подсчитываем прогресс заполнения
    const totalFields = 7; // Всего полей
    let filledFields = 0;
    if (readiness.missingFields.firstName === false) filledFields++;
    if (readiness.missingFields.lastName === false) filledFields++;
    if (readiness.missingFields.emailOrPhone === false) filledFields++;
    if (readiness.missingFields.country === false) filledFields++;
    if (readiness.missingFields.address === false) filledFields++;
    if (readiness.missingFields.passportNumber === false) filledFields++;
    if (readiness.missingFields.identificationNumber === false) filledFields++;
    
    const progress = Math.round((filledFields / totalFields) * 100);

    const cabinet = computeOwnerCabinetProfileStatus(user);
    
    res.json({
      success: true,
      data: {
        isReady: readiness.isReady,
        hasDocuments: readiness.hasDocuments,
        documentsCount: pendingDocuments.length,
        progress,
        filledFields,
        totalFields,
        missingFields: readiness.missingFields,
        isVerified: user.is_verified === 1 || user.is_verified === true,
        cardBound: user.card_bound === 1 || user.card_bound === true, // Добавляем статус привязки карты
        ownerCabinetProfileComplete: cabinet.ownerCabinetProfileComplete,
        ownerCabinetHasPassword: cabinet.ownerCabinetHasPassword,
        needsReverificationAfterRejection,
        rejectionReasonSummary,
        rejectedDocumentsCount: rejectedDocuments.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users/:id/clear-rejected-documents — удалить все отклонённые документы после полной повторной отправки (3 фото).
 * Вызывается клиентом после успешной загрузки комплекта в VerificationModal.
 */
app.post('/api/users/:id/clear-rejected-documents', async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (!id || id <= 0) {
      return res.status(400).json({ success: false, error: 'Некорректный id пользователя' });
    }
    const user = await userQueries.getById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    const result = await documentQueries.deleteAllRejectedForUser(id);
    try {
      broadcastUserCabinetEvent(id, { type: 'user_verification', action: 'resubmit_cleared' });
    } catch (e) {
      console.warn('[SSE] resubmit_cleared:', e.message);
    }
    res.json({ success: true, data: { deleted: result.deleted } });
  } catch (error) {
    console.error('POST /api/users/:id/clear-rejected-documents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users/:id/card-bound - Установить статус привязки карты
 */
app.put('/api/users/:id/card-bound', async (req, res) => {
  try {
    const userId = req.params.id;
    const { cardBound } = req.body;
    const result = await userQueries.update(userId, { has_card: cardBound ? 1 : 0 });
    if (!result || result.changes === 0) return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    
    const updatedUser = await userQueries.getById(userId);
    
    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        cardBound: updatedUser.has_card === 1 || updatedUser.has_card === true
      }
    });
  } catch (error) {
    console.error('Ошибка при обновлении статуса привязки карты:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/email/:email - Получить пользователя по email
 */
app.get('/api/users/email/:email', async (req, res) => {
  try {
    const user = await userQueries.getByEmail(req.params.email);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    // Удаляем пароль перед отправкой (для безопасности)
    const userWithoutPassword = removePasswordFromUser(user);
    res.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/phone/:phone - Получить пользователя по номеру телефона
 */
app.get('/api/users/phone/:phone', async (req, res) => {
  try {
    // Декодируем номер телефона из URL
    const phone = decodeURIComponent(req.params.phone);
    const user = await userQueries.getByPhone(phone);
    if (!user) {
      // 404 - это нормально, пользователь просто не существует (для регистрации)
      return res.status(404).json({ 
        success: false, 
        error: 'Пользователь не найден',
        exists: false
      });
    }
    // Удаляем пароль перед отправкой (для безопасности)
    const userWithoutPassword = removePasswordFromUser(user);
    res.json({ 
      success: true, 
      data: userWithoutPassword,
      exists: true
    });
  } catch (error) {
    console.error('Ошибка при получении пользователя по телефону:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/role/:role - Получить пользователей по роли
 */
app.get('/api/users/role/:role', async (req, res) => {
  try {
    const { role } = req.params;
    if (!['buyer', 'seller', 'admin', 'manager'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Недопустимая роль' });
    }
    const users = await userQueries.getByRole(role);
    // Удаляем пароли из всех пользователей перед отправкой
    const usersWithoutPasswords = removePasswordsFromUsers(users);
    res.json({ success: true, data: usersWithoutPasswords });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users - Создать нового пользователя (или вернуть существующего при совпадении email/телефона)
 * Поддерживает referrer_id для реферальной программы (Clerk/Google и др.)
 * Если пользователь с таким email или phone_number уже есть — возвращаем его (200), дубликат не создаём.
 */
app.post('/api/users', async (req, res) => {
  try {
    const { referrer_id: referrerId, ...rest } = req.body || {};
    const userData = { ...rest };
    
    // Валидация обязательных полей
    if (!userData.first_name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать имя (first_name)' 
      });
    }
    
    // Проверяем, что указан хотя бы email или phone_number
    if (!userData.email && !userData.phone_number) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать email или номер телефона' 
      });
    }
    
    // Проверка на существующего пользователя: не создаём дубликаты по email или телефону
    let existingUser = null;
    if (userData.email) {
      const emailLower = String(userData.email).toLowerCase().trim();
      existingUser = await userQueries.getByEmail(emailLower);
    }
    if (!existingUser && userData.phone_number) {
      const phoneDigits = String(userData.phone_number).replace(/\D/g, '');
      if (phoneDigits) {
        existingUser = await userQueries.getByPhone(phoneDigits);
      }
    }
    if (existingUser) {
      // Пользователь уже зарегистрирован — возвращаем его данные (вход, а не повторная регистрация)
      const onlinePatch = { is_online: 1 };
      const incomingPhoto = userData.user_photo != null && String(userData.user_photo).trim();
      if (incomingPhoto) {
        onlinePatch.user_photo = String(userData.user_photo).trim();
      }
      await userQueries.update(existingUser.id, onlinePatch);
      const updated = await userQueries.getById(existingUser.id);
      const userWithoutPassword = removePasswordFromUser(updated);
      return res.json({ success: true, data: userWithoutPassword });
    }
    
    // Если пароль передан, хешируем его перед сохранением
    if (userData.password && userData.password.trim() !== '') {
      userData.password = crypto
        .createHash('sha256')
        .update(userData.password)
        .digest('hex');
    }
    
    const result = await userQueries.create(userData);
    const newUser = await userQueries.getById(result.lastInsertRowid);
    
    if (referrerId) {
      try {
        await grantReferralBonus(referrerId, newUser.id);
      } catch (refErr) {
        console.warn('⚠️ Реферальный бонус не выдан (POST /api/users):', refErr.message);
      }
    }
    
    // Удаляем пароль перед отправкой (для безопасности)
    const userWithoutPassword = removePasswordFromUser(newUser);
    res.status(201).json({ success: true, data: userWithoutPassword });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ 
        success: false, 
        error: 'Пользователь с таким email или номером телефона уже существует' 
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users/:id/approve - Одобрить пользователя (верифицировать)
 * Одобряет все pending документы пользователя и устанавливает is_verified = 1
 */
app.put('/api/users/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewed_by } = req.body;

    if (!reviewed_by) {
      return res.status(400).json({ success: false, error: 'Необходимо указать reviewed_by' });
    }

    const user = await userQueries.getById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    // Получаем все pending документы пользователя
    const userDocuments = await documentQueries.getByUserId(id);
    const pendingDocuments = userDocuments.filter(doc => doc.verification_status === 'pending');

    if (pendingDocuments.length === 0) {
      return res.status(400).json({ success: false, error: 'У пользователя нет документов на верификацию' });
    }

    // Одобряем все pending документы
    for (const doc of pendingDocuments) {
      await documentQueries.updateStatus(doc.id, 'approved', reviewed_by, null);
    }

    // Устанавливаем пользователя как верифицированного
    await userQueries.update(id, { is_verified: 1 });

    try {
      await notifyBuyerVerificationApproved(id);
      const createdNotif = await notificationQueries.getByUserId(id);
      console.log('📋 Всего уведомлений у пользователя:', createdNotif ? createdNotif.length : 0);
    } catch (notifError) {
      console.error('❌ Не удалось создать уведомление в БД:', notifError);
    }

    // Отправляем уведомление через WhatsApp (если доступно)
    if (user.phone_number && waClientReady) {
      try {
        const chatId = `${user.phone_number}@c.us`;
        await waClient.sendMessage(
          chatId,
          '🎉 Верификация пройдена! Документы одобрены. Теперь вы можете делать ставки на аукционах.'
        );
      } catch (notifError) {
        console.warn('⚠️ Не удалось отправить уведомление через WhatsApp:', notifError.message);
      }
    }

    const updatedUser = await userQueries.getById(id);
    try {
      broadcastUserCabinetEvent(id, { type: 'user_verification', action: 'approved' });
    } catch (e) {
      console.warn('[SSE] user cabinet broadcast:', e.message);
    }
    res.json({ 
      success: true, 
      data: updatedUser,
      message: `Пользователь верифицирован. Одобрено документов: ${pendingDocuments.length}`
    });
  } catch (error) {
    console.error('Ошибка при одобрении пользователя:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users/:id/reject - Отклонить пользователя
 * Отклоняет все pending документы пользователя
 */
app.put('/api/users/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewed_by, rejection_reason } = req.body;

    if (!reviewed_by) {
      return res.status(400).json({ success: false, error: 'Необходимо указать reviewed_by' });
    }

    const user = await userQueries.getById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    // Получаем все pending документы пользователя
    const userDocuments = await documentQueries.getByUserId(id);
    const pendingDocuments = userDocuments.filter(doc => doc.verification_status === 'pending');

    if (pendingDocuments.length === 0) {
      return res.status(400).json({ success: false, error: 'У пользователя нет документов на верификацию' });
    }

    // Отклоняем все pending документы
    for (const doc of pendingDocuments) {
      await documentQueries.updateStatus(doc.id, 'rejected', reviewed_by, rejection_reason || 'Документы не прошли проверку');
    }

    await userQueries.update(id, { is_verified: 0 });
    try {
      await notifyBuyerVerificationRejected(id, rejection_reason || 'Документы не прошли проверку');
    } catch (notifErr) {
      console.warn('⚠️ verification_rejected notification:', notifErr.message);
    }

    // Отправляем уведомление пользователю
    if (user.phone_number && waClientReady) {
      try {
        const chatId = `${user.phone_number}@c.us`;
        const message = rejection_reason 
          ? `❌ Ваши документы были отклонены по причине: ${rejection_reason}. Пожалуйста, загрузите их снова.`
          : '❌ Ваши документы были отклонены. Пожалуйста, загрузите их снова.';
        await waClient.sendMessage(chatId, message);
      } catch (notifError) {
        console.warn('⚠️ Не удалось отправить уведомление через WhatsApp:', notifError.message);
      }
    }

    const updatedUser = await userQueries.getById(id);
    try {
      broadcastUserCabinetEvent(id, { type: 'user_verification', action: 'rejected' });
    } catch (e) {
      console.warn('[SSE] user cabinet broadcast:', e.message);
    }
    res.json({ 
      success: true, 
      data: updatedUser,
      message: `Пользователь отклонен. Отклонено документов: ${pendingDocuments.length}`
    });
  } catch (error) {
    console.error('Ошибка при отклонении пользователя:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users/:id/block - Заблокировать пользователя
 */
app.put('/api/users/:id/block', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await userQueries.getById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    await userQueries.update(userId, { is_blocked: 1 });
    const updatedUser = await userQueries.getById(userId);
    const userWithoutPassword = removePasswordFromUser(updatedUser);
    
    res.json({ 
      success: true, 
      data: userWithoutPassword,
      message: 'Пользователь заблокирован'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users/:id/unblock - Разблокировать пользователя
 */
app.put('/api/users/:id/unblock', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await userQueries.getById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    await userQueries.update(userId, { is_blocked: 0 });
    const updatedUser = await userQueries.getById(userId);
    const userWithoutPassword = removePasswordFromUser(updatedUser);
    
    res.json({ 
      success: true, 
      data: userWithoutPassword,
      message: 'Пользователь разблокирован'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users/:id - Обновить данные пользователя
 */
app.put('/api/users/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    const userId = req.params.id;
    
    console.log(`📥 PUT /api/users/${userId} - Получен запрос на обновление:`, {
      userId,
      updateData: { ...updateData, password: updateData.password ? '***скрыт***' : undefined }
    });
    
    // Получаем текущего пользователя
    const currentUser = await userQueries.getById(userId);
    if (!currentUser) {
      console.error(`❌ Пользователь с ID ${userId} не найден`);
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    // Проверяем, обновляется ли email и требуется ли его подтверждение
    if (updateData.email && updateData.email !== currentUser.email) {
      const emailLower = updateData.email.toLowerCase();
      
      // Проверяем, не занят ли email другим пользователем
      const existingUser = await userQueries.getByEmail(emailLower);
      if (existingUser && existingUser.id !== parseInt(userId)) {
        return res.status(409).json({ 
          success: false, 
          error: 'Пользователь с таким email уже существует' 
        });
      }
      
      // Смена email подтверждается явным согласием на фронтенде перед сохранением.
      // Здесь пропускаем изменение дальше, оставляя серверную проверку уникальности.
    }
    
    // Если пароль передан, валидируем и хешируем его перед сохранением
    if (updateData.password && updateData.password.trim() !== '') {
      // Валидация пароля
      const passwordValidation = validatePassword(updateData.password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          success: false,
          error: passwordValidation.message,
          passwordValidation: {
            missing: passwordValidation.missing,
            present: passwordValidation.present
          }
        });
      }
      
      // Хешируем пароль тем же способом, что и при регистрации
      updateData.password = crypto
        .createHash('sha256')
        .update(updateData.password)
        .digest('hex');
      console.log('🔐 Пароль обновлен (захеширован)');
    } else {
      // Если пароль пустой, не обновляем его (удаляем из данных)
      delete updateData.password;
    }
    
    // Нормализуем email в нижний регистр
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase();
    }
    
    console.log(`💾 Обновление пользователя ${userId} с данными:`, {
      fields: Object.keys(updateData),
      updateData: { ...updateData, password: updateData.password ? '***скрыт***' : undefined }
    });
    
    const result = await userQueries.update(userId, updateData);
    
    if (result.changes === 0) {
      console.warn(`⚠️ Пользователь ${userId} не обновлен (changes = 0)`);
      return res.status(404).json({ success: false, error: 'Пользователь не найден или данные не изменились' });
    }
    
    console.log(`✅ Пользователь ${userId} успешно обновлен (changes: ${result.changes})`);
    
    const updatedUser = await userQueries.getById(userId);
    
    // Не возвращаем пароль в ответе (даже захешированный)
    const { password, ...userWithoutPassword } = updatedUser;
    
    res.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    console.error(`❌ Ошибка при обновлении пользователя ${req.params.id}:`, error);
    console.error('   Тип ошибки:', error.name);
    console.error('   Сообщение:', error.message);
    console.error('   Stack:', error.stack);
    
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ 
        success: false, 
        error: 'Пользователь с таким email или номером телефона уже существует' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Внутренняя ошибка сервера при обновлении пользователя' 
    });
  }
});

/**
 * DELETE /api/users/:id - Удалить пользователя
 */
app.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await userQueries.delete(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    res.json({ success: true, message: 'Пользователь успешно удален' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/users/clear - Очистить БД (удалить всех пользователей)
 * ВНИМАНИЕ: Это опасная операция! Используйте только для разработки/тестирования
 */
app.delete('/api/users/clear', async (req, res) => {
  try {
    const prisma = getPrisma();
    const result = await prisma.users.deleteMany({});
    
    console.log(`🗑️ Очистка БД: удалено ${result.count} пользователей`);
    
    res.json({ 
      success: true, 
      message: `База данных очищена. Удалено пользователей: ${result.count}`,
      deletedCount: result.count
    });
  } catch (error) {
    console.error('❌ Ошибка при очистке БД:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users/:id/upload-photo - Загрузить фото пользователя
 */
app.post('/api/users/:id/upload-photo', upload.single('user_photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл не загружен' });
    }
    
    const filePath = `/uploads/${req.file.filename}`;
    const result = await userQueries.update(req.params.id, { user_photo: filePath });
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    res.json({ success: true, data: { user_photo: filePath } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users/:id/upload-passport - Загрузить фото паспорта
 */
app.post('/api/users/:id/upload-passport', upload.single('passport_photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл не загружен' });
    }
    
    const filePath = `/uploads/${req.file.filename}`;
    const result = await userQueries.update(req.params.id, { passport_photo: filePath });
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    res.json({ success: true, data: { passport_photo: filePath } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== РОУТЫ ДЛЯ РАСПОЗНАВАНИЯ ПАСПОРТА ==========

const MRZ_LINE_MIN_LENGTH = 30;
const MRZ_TD3_LINE_LENGTH = 44;

function cleanupMrzLine(rawLine = "") {
  return String(rawLine)
    .toUpperCase()
    .replace(/[^A-Z0-9<]/g, "")
    .trim();
}

function normalizePersonName(raw = "") {
  const words = String(raw)
    .replace(/</g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (!words.length) return null;
  return words
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function parseMrzTd3Lines(line1, line2) {
  const l1 = cleanupMrzLine(line1).padEnd(MRZ_TD3_LINE_LENGTH, "<").slice(0, MRZ_TD3_LINE_LENGTH);
  const l2 = cleanupMrzLine(line2).padEnd(MRZ_TD3_LINE_LENGTH, "<").slice(0, MRZ_TD3_LINE_LENGTH);

  if (!l1.startsWith("P<")) return null;

  const namesRaw = l1.slice(5);
  const [lastNameRaw = "", firstNamesRaw = ""] = namesRaw.split("<<");
  const passportNumberRaw = l2.slice(0, 9).replace(/</g, "").trim();
  const personalNumberRaw = l2.slice(28, 42).replace(/</g, "").trim();

  if (!passportNumberRaw) return null;

  // Для совместимости текущей формы:
  // passportSeries — первые 2 символа номера, passportNumber — остаток (или весь номер, если короткий).
  const passportSeries =
    passportNumberRaw.length > 2 ? passportNumberRaw.slice(0, 2) : null;
  const passportNumber =
    passportNumberRaw.length > 2 ? passportNumberRaw.slice(2) : passportNumberRaw;

  return {
    firstName: normalizePersonName(firstNamesRaw),
    lastName: normalizePersonName(lastNameRaw),
    middleName: null,
    passportSeries,
    passportNumber: passportNumber || null,
    identificationNumber: personalNumberRaw || null,
    address: null,
    email: null,
    source: "mrz_td3",
  };
}

function extractPassportDataFromMrz(recognizedText = "") {
  const lines = String(recognizedText)
    .split(/\r?\n/)
    .map((line) => cleanupMrzLine(line))
    .filter((line) => line.length >= MRZ_LINE_MIN_LENGTH && /[<]/.test(line));

  if (!lines.length) return null;

  // Ищем типичный паспортный MRZ (TD3): 2 строки по 44 символа, первая начинается с P<
  for (let i = 0; i < lines.length - 1; i += 1) {
    const first = lines[i];
    const second = lines[i + 1];
    if (!first.startsWith("P<")) continue;
    if (!second || second.length < MRZ_LINE_MIN_LENGTH) continue;
    const parsed = parseMrzTd3Lines(first, second);
    if (parsed) return parsed;
  }

  return null;
}

/**
 * POST /api/passport/extract - Извлечь данные из распознанного текста паспорта с помощью AI
 * Принимает распознанный текст (OCR сделан на клиенте) и извлекает структурированные данные
 */
app.post('/api/passport/extract', async (req, res) => {
  try {
    const recognizedText = req.body?.recognizedText;

    if (!recognizedText || !recognizedText.trim()) {
      return res.status(400).json({ success: false, error: 'Распознанный текст не предоставлен' });
    }

    console.log('🛂 Извлечение данных из MRZ паспорта...');

    const extractedData = extractPassportDataFromMrz(recognizedText);

    if (!extractedData) {
      return res.status(422).json({
        success: false,
        error: 'Не удалось распознать MRZ-зону паспорта. Попробуйте фото более высокого качества (нижние 2 строки паспорта должны быть видны полностью).',
      });
    }

    console.log('✅ Данные успешно извлечены:', extractedData);
    res.json({
      success: true,
      data: extractedData,
    });
  } catch (error) {
    console.error('❌ Ошибка при извлечении данных из паспорта:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== РОУТЫ ДЛЯ ДОКУМЕНТОВ ==========

/**
 * GET /api/documents - Получить все документы
 */
app.get('/api/documents', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const documents = await documentQueries.getAll(limit, offset);
    res.json({ success: true, data: documents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/documents/unreviewed - Получить непросмотренные документы
 */
app.get('/api/documents/unreviewed', async (req, res) => {
  try {
    const documents = await documentQueries.getUnreviewed();
    res.json({ success: true, data: documents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/documents/user/:userId - Получить документы пользователя
 */
app.get('/api/documents/user/:userId', async (req, res) => {
  try {
    const documents = await documentQueries.getByUserId(req.params.userId);
    res.json({ success: true, data: documents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Поля боковой панели «Профиль» в кабинете продавца (без подписки).
 * Используется только для скрытия плашки «Заполните данные для верификации».
 */
function computeOwnerCabinetProfileStatus(user) {
  const ownerCabinetProfileComplete =
    !!(user.first_name && String(user.first_name).trim()) &&
    !!(user.last_name && String(user.last_name).trim()) &&
    !!(user.country && String(user.country).trim()) &&
    !!(user.email && String(user.email).trim()) &&
    !!(user.phone_number && String(user.phone_number).trim());
  const ownerCabinetHasPassword = !!(user.password && String(user.password).trim());
  return { ownerCabinetProfileComplete, ownerCabinetHasPassword };
}

function normalizeCountryForDocumentRules(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[().,'"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSpainCountry(value) {
  const normalized = normalizeCountryForDocumentRules(value);
  return (
    normalized === 'es' ||
    normalized === 'spain' ||
    normalized === 'espana' ||
    normalized === 'испания' ||
    normalized === 'espagne' ||
    normalized === 'spanien'
  );
}

function isValidIdentificationNumberForCountry(value, country) {
  const raw = String(value || '').trim();
  if (!raw) return false;
  if (!isSpainCountry(country)) return true;

  const normalized = raw.toUpperCase().replace(/[\s-]/g, '');
  const dniRegex = /^\d{8}[A-Z]$/;
  const nieRegex = /^[XYZ]\d{7}[A-Z]$/;
  return dniRegex.test(normalized) || nieRegex.test(normalized);
}

/**
 * Проверяет готовность пользователя к модерации
 * Пользователь готов, если:
 * 1. Загружены документы на верификацию
 * 2. Заполнены все обязательные поля: имя, фамилия, email/телефон, страна, адрес, паспортные данные
 */
function checkUserReadinessForModeration(user) {
  // Проверяем наличие документов
  const hasDocuments = user.documents && user.documents.length > 0;
  
  // Проверяем обязательные поля (базовые для всех)
  const hasFirstName = user.first_name && user.first_name.trim() !== '';
  const hasLastName = user.last_name && user.last_name.trim() !== '';
  const hasEmailOrPhone = (user.email && user.email.trim() !== '') || 
                         (user.phone_number && user.phone_number.trim() !== '');
  
  // Базовые поля обязательны для всех ролей
  const basicFieldsFilled = hasFirstName && hasLastName && hasEmailOrPhone;
  
  // Определяем роль пользователя (по умолчанию 'buyer')
  const userRole = user.role || 'buyer';
  
  // Для покупателей (buyer) требуются дополнительные поля: паспортные данные, адрес, страна
  // Для продавцов (seller) достаточно базовых полей + документы
  let allFieldsFilled = basicFieldsFilled;
  let missingFields = {
    firstName: !hasFirstName,
    lastName: !hasLastName,
    emailOrPhone: !hasEmailOrPhone,
    country: false,
    address: false,
    passportSeries: false,
    passportNumber: false,
    identificationNumber: false
  };
  
  if (userRole === 'buyer') {
    // Для покупателей требуем все поля
    const hasCountry = user.country && user.country.trim() !== '';
    const hasAddress = user.address && user.address.trim() !== '';
    const hasPassportNumber = user.passport_number && user.passport_number.trim() !== '';
    const hasIdentificationNumber = isValidIdentificationNumberForCountry(
      user.identification_number,
      user.country
    );
    
    allFieldsFilled = basicFieldsFilled && hasCountry && hasAddress && 
                     hasPassportNumber && hasIdentificationNumber;
    
    missingFields.country = !hasCountry;
    missingFields.address = !hasAddress;
    // Серия паспорта больше не обязательна в профиле покупателя.
    missingFields.passportSeries = false;
    missingFields.passportNumber = !hasPassportNumber;
    missingFields.identificationNumber = !hasIdentificationNumber;
  } else if (userRole === 'seller' || userRole === 'owner') {
    // В кабинете продавца в профиле собираются страна и контакты — учитываем страну в готовности полей
    const hasCountry = user.country && user.country.trim() !== '';
    allFieldsFilled = basicFieldsFilled && hasCountry;
    missingFields.country = !hasCountry;
  }
  
  const isReady = hasDocuments && allFieldsFilled;
  
  // Логирование для отладки
  if (!isReady) {
    console.log(`⚠️ Пользователь ${user.id} (${userRole}) не готов к модерации:`, {
      hasDocuments,
      allFieldsFilled,
      missingFields
    });
  }
  
  // Возвращаем детальную информацию о готовности
  return {
    isReady,
    hasDocuments,
    missingFields,
    allFieldsFilled,
    role: userRole
  };
}

/**
 * GET /api/documents/pending - Получить документы на верификацию
 * ВАЖНО: Этот маршрут должен быть ПЕРЕД /api/documents/:id, иначе "pending" будет интерпретирован как ID
 * Возвращает только пользователей, которые полностью заполнили все поля
 */
app.get('/api/documents/pending', async (req, res) => {
  try {
    console.log('📥 Запрос на получение документов на верификацию');
    
    // Получаем все документы на верификацию
    const documents = await documentQueries.getPendingVerification();
    
    console.log('📄 Найдено документов:', documents.length);
    
    // Группируем документы по пользователям и проверяем готовность
    const readyUsers = [];
    const userMap = {};
    
    documents.forEach(doc => {
      const userId = doc.user_id;
      
      if (!userMap[userId]) {
        // Создаем объект пользователя с данными из документа
        userMap[userId] = {
          id: userId,
          user_id: userId,
          first_name: doc.first_name,
          last_name: doc.last_name,
          email: doc.email,
          phone_number: doc.phone_number,
          role: doc.role,
          country: null, // Нужно будет загрузить отдельно
          address: null,
          passport_series: null,
          passport_number: null,
          identification_number: null,
          documents: []
        };
      }
      
      userMap[userId].documents.push({
        id: doc.id,
        document_type: doc.document_type,
        document_photo: doc.document_photo,
        verification_status: doc.verification_status,
        created_at: doc.created_at
      });
    });
    
    // Загружаем полные данные пользователей из БД для проверки готовности
    const usersArray = Object.values(userMap);
    const readyDocuments = [];
    
    for (const user of usersArray) {
      try {
        // Загружаем полные данные пользователя
        const fullUser = await userQueries.getById(user.id);
        
        if (fullUser) {
          // Обновляем данные пользователя
          user.country = fullUser.country;
          user.address = fullUser.address;
          user.passport_series = fullUser.passport_series;
          user.passport_number = fullUser.passport_number;
          user.identification_number = fullUser.identification_number;
          
          // Убеждаемся, что роль правильно установлена из полных данных пользователя
          if (fullUser.role) {
            user.role = fullUser.role;
          }
          
          console.log(`🔍 Проверка готовности пользователя ${user.id} (роль: ${user.role}):`, {
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            phone: user.phone_number,
            hasDocuments: user.documents.length,
            role: user.role
          });
          
          // Проверяем готовность
          const readiness = checkUserReadinessForModeration(user);
          
          // ИЗМЕНЕНИЕ:
          //  - Документы должны попадать в модерацию, как только они отправлены,
          //    даже если профиль заполнен не полностью.
          //  - Поле is_verified используется только после одобрения документов админом.
          // Поэтому здесь проверяем прежде всего наличие документов.
          if (readiness.hasDocuments) {
            // Пользователь имеет документы - добавляем их на модерацию
            user.documents.forEach(doc => {
              readyDocuments.push({
                ...doc,
                user_id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                phone_number: user.phone_number,
                role: user.role || fullUser.role || 'buyer', // Используем роль из полных данных
                user_db_id: user.id
              });
            });
            
            if (readiness.isReady) {
              console.log(`✅ Пользователь ${user.id} (${user.role || 'buyer'}) готов к модерации (профиль заполнен)`);
            } else {
              console.log(`⚠️ Пользователь ${user.id} (${user.role || 'buyer'}) добавлен на модерацию, но профиль заполнен не полностью. Пропущенные поля:`, readiness.missingFields);
            }
          } else {
            console.log(`⚠️ Пользователь ${user.id} (${user.role || 'buyer'}) не добавлен на модерацию — нет документов`);
          }
        }
      } catch (error) {
        console.error(`❌ Ошибка при проверке пользователя ${user.id}:`, error.message);
      }
    }
    
    console.log('✅ Отправляем готовых к модерации:', readyDocuments.length);
    
    res.json({ success: true, data: readyDocuments });
  } catch (error) {
    console.error('❌ Ошибка при получении документов на верификацию:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/documents/:id - Получить документ по ID
 */
app.get('/api/documents/:id', async (req, res) => {
  try {
    const document = await documentQueries.getById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, error: 'Документ не найден' });
    }
    res.json({ success: true, data: document });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/documents - Создать новый документ
 */
app.post('/api/documents', upload.single('document_photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл документа не загружен' });
    }
    
    if (!req.body.user_id) {
      return res.status(400).json({ success: false, error: 'Необходимо указать user_id' });
    }
    
    // Преобразуем user_id в число и проверяем валидность
    const userIdStr = String(req.body.user_id).trim();
    if (userIdStr === '' || userIdStr === 'null' || userIdStr === 'undefined') {
      console.error('❌ Получен невалидный user_id:', req.body.user_id);
      return res.status(400).json({ success: false, error: 'Неверный формат user_id. Ожидается положительное число' });
    }
    
    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId) || userId <= 0) {
      console.error('❌ Не удалось преобразовать user_id в число:', req.body.user_id);
      return res.status(400).json({ success: false, error: 'Неверный формат user_id. Ожидается положительное число' });
    }
    
    // Проверяем, существует ли пользователь с таким ID
    const user = await userQueries.getById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: `Пользователь с ID ${userId} не найден` });
    }
    
    const filePath = `/uploads/${req.file.filename}`;
    const documentData = {
      user_id: userId, // Используем преобразованный в число user_id
      document_type: req.body.document_type || null,
      document_photo: filePath,
      is_reviewed: false,
      verification_status: 'pending' // Явно указываем статус 'pending' для верификации
    };
    
    console.log('📄 Создание документа:', documentData);
    
    const result = await documentQueries.create(documentData);
    const newDocument = await documentQueries.getById(result.lastInsertRowid);
    
    console.log('✅ Документ создан:', {
      id: newDocument.id,
      user_id: newDocument.user_id,
      document_type: newDocument.document_type,
      verification_status: newDocument.verification_status,
      is_reviewed: newDocument.is_reviewed
    });
    
    // Проверяем, что документ действительно имеет статус 'pending'
    if (newDocument.verification_status !== 'pending') {
      console.warn('⚠️ ВНИМАНИЕ: Документ создан со статусом', newDocument.verification_status, 'вместо pending!');
    }
    
    res.status(201).json({ success: true, data: newDocument });
  } catch (error) {
    console.error('❌ Ошибка при создании документа:', error);
    // Проверяем, является ли ошибка ошибкой внешнего ключа
    if (error.message && error.message.includes('FOREIGN KEY constraint failed')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Ошибка внешнего ключа: пользователь не найден. Убедитесь, что user_id корректен.' 
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/documents/:id/review - Отметить документ как просмотренный
 */
app.put('/api/documents/:id/review', async (req, res) => {
  try {
    if (!req.body.reviewed_by) {
      return res.status(400).json({ success: false, error: 'Необходимо указать reviewed_by (ID админа/менеджера)' });
    }
    
    const result = await documentQueries.markAsReviewed(req.params.id, req.body.reviewed_by);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Документ не найден' });
    }
    
    const updatedDocument = await documentQueries.getById(req.params.id);
    res.json({ success: true, data: updatedDocument });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/documents/:id/approve - Одобрить документ (верификация успешна)
 */
app.put('/api/documents/:id/approve', async (req, res) => {
  try {
    if (!req.body.reviewed_by) {
      return res.status(400).json({ success: false, error: 'Необходимо указать reviewed_by (ID админа/менеджера)' });
    }
    
    const document = await documentQueries.getById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, error: 'Документ не найден' });
    }
    
    // Одобряем документ
    const result = await documentQueries.approveDocument(req.params.id, req.body.reviewed_by);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Документ не найден' });
    }
    
    // Получаем пользователя
    const user = await userQueries.getById(document.user_id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    // Проверяем, все ли документы пользователя одобрены
    const userDocuments = await documentQueries.getByUserId(document.user_id);
    const allApproved = userDocuments.every(doc => 
      doc.verification_status === 'approved' || doc.id === parseInt(req.params.id)
    );
    
    // Если все документы одобрены, обновляем статус пользователя
    if (allApproved) {
      await userQueries.update(document.user_id, { is_verified: 1 });
      try {
        await notifyBuyerVerificationApproved(document.user_id);
      } catch (e) {
        console.warn('⚠️ Уведомление о верификации:', e.message);
      }
      try {
        broadcastUserCabinetEvent(document.user_id, { type: 'user_verification', action: 'approved' });
      } catch (e) {
        console.warn('[SSE] user cabinet broadcast:', e.message);
      }
    }
    
    // Отправляем уведомление пользователю
    try {
      if (allApproved && user.phone_number && waClientReady) {
        const digits = String(user.phone_number).replace(/\D/g, '');
        const chatId = `${digits}@c.us`;
        const message =
          '✅ Верификация пройдена!\n\nВсе документы одобрены. Теперь вы можете делать ставки на аукционах.';
        await waClient.sendMessage(chatId, message);
      }
    } catch (notifError) {
      console.warn('⚠️ Не удалось отправить уведомление через WhatsApp:', notifError.message);
    }
    
    const updatedDocument = await documentQueries.getById(req.params.id);
    res.json({ success: true, data: updatedDocument, message: 'Документ одобрен' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/documents/:id/reject - Отклонить документ
 */
app.put('/api/documents/:id/reject', async (req, res) => {
  try {
    if (!req.body.reviewed_by) {
      return res.status(400).json({ success: false, error: 'Необходимо указать reviewed_by (ID админа/менеджера)' });
    }
    
    const document = await documentQueries.getById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, error: 'Документ не найден' });
    }
    
    // Отклоняем документ
    const rejectionReason = req.body.rejection_reason || null;
    const result = await documentQueries.rejectDocument(req.params.id, req.body.reviewed_by, rejectionReason);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Документ не найден' });
    }
    
    // Получаем пользователя
    const user = await userQueries.getById(document.user_id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    try {
      await userQueries.update(document.user_id, { is_verified: 0 });
    } catch (uvErr) {
      console.warn('⚠️ is_verified при отклонении документа:', uvErr.message);
    }
    try {
      await notifyBuyerVerificationRejected(document.user_id, rejectionReason);
    } catch (notifErr) {
      console.warn('⚠️ verification_rejected (документ):', notifErr.message);
    }
    try {
      broadcastUserCabinetEvent(document.user_id, {
        type: 'user_verification',
        action: 'rejected',
        reason: rejectionReason || null,
      });
    } catch (cabErr) {
      console.warn('[SSE] user cabinet (document reject):', cabErr.message);
    }
    
    // Отправляем уведомление пользователю
    try {
      if (user.phone_number && waClientReady) {
        const digits = String(user.phone_number).replace(/\D/g, '');
        const chatId = `${digits}@c.us`;
        const message = `❌ Ваши документы были отклонены.\n\nПожалуйста, загрузите документы заново, убедившись, что они четкие и соответствуют требованиям.`;
        
        await waClient.sendMessage(chatId, message);
      }
    } catch (notifError) {
      console.warn('⚠️ Не удалось отправить уведомление через WhatsApp:', notifError.message);
    }
    
    const updatedDocument = await documentQueries.getById(req.params.id);
    res.json({ success: true, data: updatedDocument, message: 'Документ отклонен' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/documents/:id - Удалить документ
 */
app.delete('/api/documents/:id', async (req, res) => {
  try {
    const document = await documentQueries.getById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, error: 'Документ не найден' });
    }
    
    // Удаляем файл с диска
    if (document.document_photo) {
      const filePath = join(__dirname, document.document_photo);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    const result = await documentQueries.delete(req.params.id);
    res.json({ success: true, message: 'Документ успешно удален' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== РОУТЫ ДЛЯ АВТОРИЗАЦИИ ==========

/**
 * POST /api/auth/whatsapp - Регистрация/Авторизация через WhatsApp
 * mode: 'login' | 'register'
 *  - login: только вход, без создания нового пользователя
 *  - register: создаем пользователя, если его еще нет
 */
app.post('/api/auth/whatsapp', async (req, res) => {
  try {
    const { phone, code, mode = 'register', role, referrer_id: referrerId } = req.body;
    
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Необходимо указать номер телефона' });
    }
    
    // Проверяем, существует ли пользователь с таким номером
    let user = await userQueries.getByPhone(phone);
    
    if (user) {
      // Режим регистрации: пользователь уже есть — нельзя регистрироваться повторно
      if (mode === 'register') {
        return res.status(409).json({
          success: false,
          error: 'Вы уже зарегистрированы с этим номером. Войдите в аккаунт.',
          code: 'ALREADY_REGISTERED',
        });
      }
      // Проверяем, заблокирован ли пользователь
      if (user.is_blocked === 1) {
        return res.status(403).json({ 
          success: false, 
          error: 'Пользователь заблокирован',
          is_blocked: true
        });
      }
      
      // Пользователь существует - авторизуем и обновляем статус онлайн
      await userQueries.update(user.id, { is_online: 1 });
      const updatedUser = await userQueries.getById(user.id);
      return res.json({ 
        success: true, 
        user: {
          id: updatedUser.id,
          name: `${updatedUser.first_name} ${updatedUser.last_name}`.trim() || updatedUser.phone_number,
          phone: updatedUser.phone_number,
          phoneFormatted: req.body.phoneFormatted || updatedUser.phone_number,
          email: updatedUser.email,
          role: updatedUser.role,
          country: updatedUser.country,
          countryFlag: req.body.countryFlag || '',
          is_online: 1,
          is_blocked: updatedUser.is_blocked === 1
        }
      });
    }

    // Если пользователь не найден и это режим входа — не регистрируем, а возвращаем ошибку
    if (mode === 'login') {
      return res.status(404).json({
        success: false,
        error: 'Пользователь с таким номером не найден. Сначала зарегистрируйтесь через WhatsApp.',
        code: 'NEED_REGISTER',
      });
    }
    
    // Режим регистрации: создаем нового пользователя
    const country = phone.startsWith('375') ? 'Беларусь' : 
                   phone.startsWith('7') ? 'Россия' : 
                   phone.startsWith('380') ? 'Украина' : 'Неизвестно';
    
    // Разбиваем имя из номера (будет обновлено позже)
    const nameParts = (req.body.name || `Пользователь ${phone.substring(phone.length - 4)}`).split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const newUser = {
      first_name: firstName,
      last_name: lastName,
      email: null, // Email не требуется для WhatsApp
      phone_number: phone,
      country: country,
      role: role || 'buyer', // Используем переданную роль или 'buyer' по умолчанию
      is_verified: 0,
      is_online: 1
    };
    
    const result = await userQueries.create(newUser);
    const createdUser = await userQueries.getById(result.lastInsertRowid);

    if (referrerId) {
      try {
        await grantReferralBonus(referrerId, createdUser.id);
      } catch (refErr) {
        console.warn('⚠️ Реферальный бонус (WhatsApp) не выдан:', refErr.message);
      }
    }
    
    return res.status(201).json({ 
      success: true, 
      user: {
        id: createdUser.id,
        name: `${createdUser.first_name} ${createdUser.last_name}`.trim(),
        phone: createdUser.phone_number,
        phoneFormatted: req.body.phoneFormatted || phone,
        email: createdUser.email,
        role: createdUser.role,
        country: createdUser.country,
        countryFlag: req.body.countryFlag || '',
        picture: null,
        ...(createdUser.hasOwnProperty('user_id_number') && createdUser.user_id_number ? { user_id_number: createdUser.user_id_number } : {})
      }
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ 
        success: false, 
        error: 'Пользователь с таким номером телефона уже существует' 
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Определяет язык сообщения по коду страны в номере телефона (для WhatsApp верификации)
 * @param {string} phoneDigits - Номер телефона (только цифры, с кодом страны)
 * @returns {string} - Код языка: ru, en, uk, be, de, fr, it, es, tr, zh, ja, ko, pt, ar
 */
function getLanguageByPhone(phoneDigits) {
  const digits = String(phoneDigits).replace(/\D/g, '');
  const countryToLang = {
    '375': 'ru',  // Беларусь
    '7': 'ru',    // Россия, Казахстан
    '380': 'en',  // Украина
    '374': 'en',  // Армения
    '994': 'en',  // Азербайджан
    '996': 'en',  // Киргизия
    '373': 'en',  // Молдова
    '992': 'en',  // Таджикистан
    '998': 'en',  // Узбекистан
    '971': 'ar',  // ОАЭ
    '1': 'en',    // США / Канада
    '44': 'en',   // Великобритания
    '49': 'de',   // Германия
    '33': 'fr',   // Франция
    '39': 'it',   // Италия
    '34': 'es',   // Испания
    '90': 'tr',   // Турция
    '86': 'zh',   // Китай
    '81': 'ja',   // Япония
    '82': 'ko',   // Южная Корея
    '91': 'en',   // Индия
    '55': 'pt',   // Бразилия
    '52': 'es',   // Мексика
    '61': 'en',   // Австралия
    '27': 'en',   // ЮАР
    '20': 'ar',   // Египет
  };
  const sortedCodes = Object.keys(countryToLang).sort((a, b) => b.length - a.length);
  for (const code of sortedCodes) {
    if (digits.startsWith(code)) return countryToLang[code];
  }
  return 'en';
}

/**
 * Шаблоны сообщения верификации WhatsApp по языкам (красивый формат)
 */
const WHATSAPP_VERIFICATION_MESSAGES = {
  ru: `Добро пожаловать на платформу *Sellyourbrick* — инвестиционный маркетплейс для покупки и продажи недвижимости.

Для завершения регистрации введите проверочный код:

*${'{CODE}'}*

Код действителен 10 минут. Если вы не запрашивали код — проигнорируйте это сообщение.`,

  en: `Welcome to *Sellyourbrick* — the investment marketplace for buying and selling real estate.

To complete your registration, enter this verification code:

*${'{CODE}'}*

The code is valid for 10 minutes. If you didn't request this code, please ignore this message.`,

  uk: `Ласкаво просимо на платформу *Sellyourbrick* — інвестиційний маркетплейс для купівлі та продажу нерухомості.

Щоб завершити реєстрацію, введіть перевірочний код:

*${'{CODE}'}*

Код дійсний 10 хвилин. Якщо ви не запитували код — проігноруйте це повідомлення.`,

  be: `Сардэчна запрашаем на платформу *Sellyourbrick* — інвестыцыйны маркетплейс для куплі і продажу нерухомасці.

Каб скончыць рэгістрацыю, увядзіце правярочны код:

*${'{CODE}'}*

Код дзейнічае 10 хвілін. Калі вы не запытвалі код — ігнаруйце гэта паведамленне.`,

  de: `Willkommen bei *Sellyourbrick* — dem Investment-Marktplatz für Kauf und Verkauf von Immobilien.

Um die Registrierung abzuschließen, geben Sie bitte diesen Bestätigungscode ein:

*${'{CODE}'}*

Der Code ist 10 Minuten gültig. Falls Sie diesen Code nicht angefordert haben, ignorieren Sie diese Nachricht.`,

  fr: `Bienvenue sur *Sellyourbrick* — la place de marché d'investissement pour l'achat et la vente de biens immobiliers.

Pour terminer l'inscription, entrez ce code de vérification :

*${'{CODE}'}*

Le code est valable 10 minutes. Si vous n'avez pas demandé ce code, ignorez ce message.`,

  it: `Benvenuto su *Sellyourbrick* — il marketplace degli investimenti per comprare e vendere immobili.

Per completare la registrazione, inserisca questo codice di verifica:

*${'{CODE}'}*

Il codice è valido per 10 minuti. Se non ha richiesto questo codice, ignori questo messaggio.`,

  es: `Bienvenido a *Sellyourbrick* — el marketplace de inversiones para comprar y vender inmuebles.

Para completar el registro, introduzca este código de verificación:

*${'{CODE}'}*

El código es válido durante 10 minutos. Si no ha solicitado este código, ignore este mensaje.`,

  tr: `*Sellyourbrick* platformuna hoş geldiniz — gayrimenkul alım satımı için yatırım pazarı.

Kaydı tamamlamak için bu doğrulama kodunu girin:

*${'{CODE}'}*

Kod 10 dakika geçerlidir. Bu kodu siz talep etmediyseniz, bu mesajı yok sayın.`,

  zh: `欢迎使用 *Sellyourbrick* — 房地产买卖投资平台。

请输入以下验证码完成注册：

*${'{CODE}'}*

验证码有效期为 10 分钟。如非本人操作，请忽略此消息。`,

  ja: `*Sellyourbrick* へようこそ — 不動産の売買のための投資マーケットプレイスです。

登録を完了するには、以下の認証コードを入力してください：

*${'{CODE}'}*

コードの有効期限は10分です。心当たりがない場合は、このメッセージを無視してください。`,

  ko: `*Sellyourbrick* 플랫폼에 오신 것을 환영합니다 — 부동산 매매를 위한 투자 마켓플레이스입니다.

가입을 완료하려면 아래 인증 코드를 입력하세요:

*${'{CODE}'}*

코드는 10분간 유효합니다. 요청하지 않으셨다면 이 메시지를 무시하세요.`,

  pt: `Bem-vindo ao *Sellyourbrick* — marketplace de investimentos para comprar e vender imóveis.

Para concluir o cadastro, digite este código de verificação:

*${'{CODE}'}*

O código é válido por 10 minutos. Se você não solicitou este código, ignore esta mensagem.`,

  ar: `أهلاً بك في منصة *Sellyourbrick* — المنصة الاستثمارية لشراء وبيع العقارات.

لإكمال التسجيل، أدخل رمز التحقق:

*${'{CODE}'}*

الرمز صالح لمدة 10 دقائق. إن لم تطلب هذا الرمز، تجاهل هذه الرسالة.`
};

function getVerificationMessage(lang, code) {
  const template = WHATSAPP_VERIFICATION_MESSAGES[lang] || WHATSAPP_VERIFICATION_MESSAGES.en;
  return template.replace(/\{CODE\}/g, code);
}

/**
 * POST /api/auth/whatsapp/send-code - Отправка кода верификации через WhatsApp (whatsapp-web.js)
 */
app.post('/api/auth/whatsapp/send-code', async (req, res) => {
  try {
    const { phone, code, lang: preferredLang } = req.body;

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        error: 'Необходимо указать номер телефона и код'
      });
    }

    // Проверяем готовность клиента перед отправкой
    if (!waClientReady) {
      // Попытка проверить состояние клиента еще раз
      try {
        if (waClient && waClient.info && waClient.info.wid) {
          console.log('⚠️ waClientReady = false, но клиент авторизован. Устанавливаем готовность...');
          waClientReady = true;
        } else {
          console.warn('⚠️ Попытка отправить код через WhatsApp, но клиент не готов. Статус waClientReady:', waClientReady);
          return res.status(503).json({
            success: false,
            error: 'WhatsApp сервис временно недоступен. Пожалуйста, подождите несколько секунд и попробуйте снова. Если проблема сохраняется, убедитесь, что WhatsApp Web авторизован на сервере.',
            code: 'WHATSAPP_NOT_READY'
          });
        }
      } catch (checkError) {
        console.warn('⚠️ Попытка отправить код через WhatsApp, но клиент не готов. Статус waClientReady:', waClientReady);
        return res.status(503).json({
          success: false,
          error: 'WhatsApp сервис временно недоступен. Пожалуйста, подождите несколько секунд и попробуйте снова. Если проблема сохраняется, убедитесь, что WhatsApp Web авторизован на сервере.',
          code: 'WHATSAPP_NOT_READY'
        });
      }
    }

    const digits = String(phone).replace(/\D/g, '');
    if (!digits) {
      return res.status(400).json({
        success: false,
        error: 'Неверный формат номера телефона'
      });
    }

    const chatId = `${digits}@c.us`;
    // Язык: из запроса (выбранная пользователем страна) или по коду страны в номере
    const lang = (preferredLang && WHATSAPP_VERIFICATION_MESSAGES[preferredLang])
      ? preferredLang
      : getLanguageByPhone(digits);
    const message = getVerificationMessage(lang, code);

    let contactName = null;
    let profilePicUrl = null;

    try {
      const contact = await waClient.getContactById(chatId);
      if (contact) {
        contactName = contact.pushname || contact.name || contact.number || null;
        try {
          profilePicUrl = await contact.getProfilePicUrl();
        } catch {
          profilePicUrl = null;
        }
      }
    } catch {
      // Если контакт не найден, просто продолжаем отправку сообщения
    }

    // Применяем патч sendSeen перед отправкой (на случай, если он не был применен ранее). Не блокируем отправку при ошибке патча.
    await applySendSeenPatch().catch(() => {});

    // Отправляем сообщение с дополнительной диагностикой
    try {
      await waClient.sendMessage(chatId, message);
    } catch (sendError) {
      const errorMessage = sendError.message || '';
      const errorStack = sendError.stack || '';
      const isDetachedFrame = errorMessage.includes('detached') || errorStack.includes('detached Frame');
      if (isDetachedFrame) {
        waClientReady = false;
        console.warn('⚠️ Сессия WhatsApp устарела (detached Frame). Требуется повторная привязка по QR-коду.');
        return res.status(503).json({
          success: false,
          error: 'Сессия WhatsApp устарела. Зайдите в админ-панель → WhatsApp и заново отсканируйте QR-код, либо перезапустите сервер.',
          code: 'WHATSAPP_SESSION_EXPIRED'
        });
      }
      const isMarkedUnreadError = 
        errorMessage.includes('markedUnread') || 
        errorStack.includes('markedUnread') ||
        errorMessage.includes('Cannot read properties of undefined');
      
      if (isMarkedUnreadError) {
        // Это известная ошибка библиотеки. Пытаемся применить патч еще раз и повторить отправку
        console.warn('⚠️ Обнаружена ошибка markedUnread, применяем патч и повторяем отправку...');
        await applySendSeenPatch();
        
        try {
          // Повторная попытка отправки после применения патча
          await waClient.sendMessage(chatId, message);
          console.log('✅ Сообщение отправлено после применения патча');
        } catch (retryError) {
          // Если повторная попытка тоже не удалась, проверяем, было ли сообщение отправлено
          // Иногда сообщение отправляется, но ошибка возникает в sendSeen
          const retryErrorMessage = retryError.message || '';
          const retryErrorStack = retryError.stack || '';
          const isStillMarkedUnreadError = 
            retryErrorMessage.includes('markedUnread') || 
            retryErrorStack.includes('markedUnread');
          
          if (isStillMarkedUnreadError) {
            // В этом случае считаем, что сообщение могло быть отправлено, но sendSeen упал
            // Проверяем, можем ли мы получить информацию о чате (косвенный признак успешной отправки)
            try {
              const contact = await waClient.getContactById(chatId);
              if (contact) {
                console.warn('⚠️ Ошибка markedUnread, но контакт доступен. Предполагаем, что сообщение отправлено.');
                // Возвращаем успех, так как сообщение, вероятно, было отправлено
                return res.json({
                  success: true,
                  message: 'Код отправлен в WhatsApp',
                  contact: {
                    name: contactName,
                    picture: profilePicUrl
                  },
                  warning: 'Сообщение отправлено, но возникла техническая ошибка при отметке прочтения'
                });
              }
            } catch (contactError) {
              // Если не можем получить контакт, значит сообщение не было отправлено
            }
          }
          
          console.error('❌ Ошибка whatsapp-web.js (markedUnread) при отправке сообщения после повторной попытки.');
          throw retryError;
        }
      } else {
        // Если это другая ошибка - пробрасываем её дальше
        throw sendError;
      }
    }

    return res.json({
      success: true,
      message: 'Код отправлен в WhatsApp',
      contact: {
        name: contactName,
        picture: profilePicUrl
      }
    });
  } catch (error) {
    const errMsg = error.message || '';
    if (errMsg.includes('detached') || (error.stack && error.stack.includes('detached Frame'))) {
      waClientReady = false;
      console.warn('⚠️ Сессия WhatsApp устарела (detached Frame). Требуется повторная привязка по QR-коду.');
      return res.status(503).json({
        success: false,
        error: 'Сессия WhatsApp устарела. Зайдите в админ-панель → WhatsApp и заново отсканируйте QR-код, либо перезапустите сервер.',
        code: 'WHATSAPP_SESSION_EXPIRED'
      });
    }
    console.error('Ошибка отправки кода через WhatsApp:', error);
    return res.status(500).json({
      success: false,
      error: 'Не удалось отправить код через WhatsApp'
    });
  }
});

/**
 * POST /api/whatsapp/send-message - Отправка произвольного сообщения через WhatsApp
 */
app.post('/api/whatsapp/send-message', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Необходимо указать номер телефона и сообщение'
      });
    }

    if (!message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Сообщение не может быть пустым'
      });
    }

    // Проверяем готовность клиента перед отправкой
    if (!waClientReady) {
      // Попытка проверить состояние клиента еще раз
      try {
        if (waClient && waClient.info && waClient.info.wid) {
          console.log('⚠️ waClientReady = false, но клиент авторизован. Устанавливаем готовность...');
          waClientReady = true;
        } else {
          console.warn('⚠️ Попытка отправить сообщение через WhatsApp, но клиент не готов. Статус waClientReady:', waClientReady);
          return res.status(503).json({
            success: false,
            error: 'WhatsApp сервис временно недоступен. Пожалуйста, подождите несколько секунд и попробуйте снова. Если проблема сохраняется, убедитесь, что WhatsApp Web авторизован на сервере.',
            code: 'WHATSAPP_NOT_READY'
          });
        }
      } catch (checkError) {
        console.warn('⚠️ Попытка отправить сообщение через WhatsApp, но клиент не готов. Статус waClientReady:', waClientReady);
        return res.status(503).json({
          success: false,
          error: 'WhatsApp сервис временно недоступен. Пожалуйста, подождите несколько секунд и попробуйте снова. Если проблема сохраняется, убедитесь, что WhatsApp Web авторизован на сервере.',
          code: 'WHATSAPP_NOT_READY'
        });
      }
    }

    const digits = String(phone).replace(/\D/g, '');
    if (!digits) {
      return res.status(400).json({
        success: false,
        error: 'Неверный формат номера телефона'
      });
    }

    const chatId = `${digits}@c.us`;
    const messageText = message.trim();

    let contactName = null;
    let profilePicUrl = null;

    try {
      const contact = await waClient.getContactById(chatId);
      if (contact) {
        contactName = contact.pushname || contact.name || contact.number || null;
        try {
          profilePicUrl = await contact.getProfilePicUrl();
        } catch {
          profilePicUrl = null;
        }
      }
    } catch {
      // Если контакт не найден, просто продолжаем отправку сообщения
    }

    // Применяем патч sendSeen перед отправкой (на случай, если он не был применен ранее)
    await applySendSeenPatch();
    
    // Отправляем сообщение с дополнительной диагностикой
    try {
      await waClient.sendMessage(chatId, messageText);
    } catch (sendError) {
      const errorMessage = sendError.message || '';
      const errorStack = sendError.stack || '';
      const isMarkedUnreadError = 
        errorMessage.includes('markedUnread') || 
        errorStack.includes('markedUnread') ||
        errorMessage.includes('Cannot read properties of undefined');
      
      if (isMarkedUnreadError) {
        // Это известная ошибка библиотеки. Пытаемся применить патч еще раз и повторить отправку
        console.warn('⚠️ Обнаружена ошибка markedUnread, применяем патч и повторяем отправку...');
        await applySendSeenPatch();
        
        try {
          // Повторная попытка отправки после применения патча
          await waClient.sendMessage(chatId, messageText);
          console.log('✅ Сообщение отправлено после применения патча');
        } catch (retryError) {
          // Если повторная попытка тоже не удалась, проверяем, было ли сообщение отправлено
          // Иногда сообщение отправляется, но ошибка возникает в sendSeen
          const retryErrorMessage = retryError.message || '';
          const retryErrorStack = retryError.stack || '';
          const isStillMarkedUnreadError = 
            retryErrorMessage.includes('markedUnread') || 
            retryErrorStack.includes('markedUnread');
          
          if (isStillMarkedUnreadError) {
            // В этом случае считаем, что сообщение могло быть отправлено, но sendSeen упал
            // Проверяем, можем ли мы получить информацию о чате (косвенный признак успешной отправки)
            try {
              const contact = await waClient.getContactById(chatId);
              if (contact) {
                console.warn('⚠️ Ошибка markedUnread, но контакт доступен. Предполагаем, что сообщение отправлено.');
                // Возвращаем успех, так как сообщение, вероятно, было отправлено
                return res.json({
                  success: true,
                  message: 'Сообщение отправлено в WhatsApp',
                  contact: {
                    name: contactName,
                    picture: profilePicUrl
                  },
                  warning: 'Сообщение отправлено, но возникла техническая ошибка при отметке прочтения'
                });
              }
            } catch (contactError) {
              // Если не можем получить контакт, значит сообщение не было отправлено
            }
          }
          
          console.error('❌ Ошибка whatsapp-web.js (markedUnread) при отправке сообщения после повторной попытки.');
          throw retryError;
        }
      } else {
        // Если это другая ошибка - пробрасываем её дальше
        throw sendError;
      }
    }

    // Обновляем статистику в базе данных для WhatsApp пользователей
    try {
      const existingUser = await whatsappUserQueries.getByPhone(chatId);
      await whatsappUserQueries.createOrUpdate({
        phone_number: chatId,
        phone_number_clean: digits,
        country: existingUser?.country || null,
        language: existingUser?.language || 'ru'
      });
    } catch (dbError) {
      console.warn('⚠️ Ошибка обновления статистики в БД:', dbError.message);
    }

    return res.json({
      success: true,
      message: 'Сообщение отправлено в WhatsApp',
      contact: {
        name: contactName,
        picture: profilePicUrl
      }
    });
  } catch (error) {
    console.error('Ошибка отправки сообщения через WhatsApp:', error);
    return res.status(500).json({
      success: false,
      error: 'Не удалось отправить сообщение через WhatsApp'
    });
  }
});

/**
 * POST /api/purchase-requests - Создать новый запрос на покупку
 */
app.post('/api/purchase-requests', async (req, res) => {
  try {
    const {
      buyerId, buyerName, buyerEmail, buyerPhone,
      sellerId, sellerName, sellerEmail, sellerPhone,
      propertyId, propertyTitle, propertyDescription, propertyPrice, propertyCurrency,
      propertyLocation, propertyType, propertyArea,
      propertyRooms, propertyBedrooms, propertyBathrooms,
      propertyFloor, propertyTotalFloors, propertyYearBuilt,
      propertyLivingArea, propertyLandArea, propertyBuildingType,
      propertyRenovation, propertyCondition, propertyHeating,
      propertyWaterSupply, propertySewerage,
      propertyBalcony, propertyParking, propertyElevator,
      propertyGarage, propertyPool, propertyGarden,
      propertyElectricity, propertyInternet, propertySecurity, propertyFurniture,
      propertyCommercialType, propertyBusinessHours,
      requestDate, status
    } = req.body;

    // Валидация обязательных полей
    if (!buyerName) {
      return res.status(400).json({ success: false, error: 'Необходимо указать имя покупателя' });
    }

    if (!propertyTitle) {
      return res.status(400).json({ success: false, error: 'Необходимо указать название объекта' });
    }

    // Создаем запрос со всеми данными об объекте
    const result = await purchaseRequestQueries.create({
      buyerId: buyerId || null,
      buyerName,
      buyerEmail: buyerEmail || null,
      buyerPhone: buyerPhone || null,
      sellerId: sellerId || null,
      sellerName: sellerName || null,
      sellerEmail: sellerEmail || null,
      sellerPhone: sellerPhone || null,
      propertyId: propertyId || null,
      propertyTitle,
      propertyDescription: propertyDescription || null,
      propertyPrice: propertyPrice || null,
      propertyCurrency: propertyCurrency || 'USD',
      propertyLocation: propertyLocation || null,
      propertyType: propertyType || null,
      propertyArea: propertyArea || null,
      propertyRooms: propertyRooms || null,
      propertyBedrooms: propertyBedrooms || null,
      propertyBathrooms: propertyBathrooms || null,
      propertyFloor: propertyFloor !== undefined && propertyFloor !== null ? propertyFloor : null,
      propertyTotalFloors: propertyTotalFloors !== undefined && propertyTotalFloors !== null ? propertyTotalFloors : null,
      propertyYearBuilt: propertyYearBuilt !== undefined && propertyYearBuilt !== null ? propertyYearBuilt : null,
      propertyLivingArea: propertyLivingArea || null,
      propertyLandArea: propertyLandArea || null,
      propertyBuildingType: propertyBuildingType || null,
      propertyRenovation: propertyRenovation || null,
      propertyCondition: propertyCondition || null,
      propertyHeating: propertyHeating || null,
      propertyWaterSupply: propertyWaterSupply || null,
      propertySewerage: propertySewerage || null,
      propertyBalcony: propertyBalcony === 1 || propertyBalcony === true ? 1 : 0,
      propertyParking: propertyParking === 1 || propertyParking === true ? 1 : 0,
      propertyElevator: propertyElevator === 1 || propertyElevator === true ? 1 : 0,
      propertyGarage: propertyGarage === 1 || propertyGarage === true ? 1 : 0,
      propertyPool: propertyPool === 1 || propertyPool === true ? 1 : 0,
      propertyGarden: propertyGarden === 1 || propertyGarden === true ? 1 : 0,
      propertyElectricity: propertyElectricity === 1 || propertyElectricity === true ? 1 : 0,
      propertyInternet: propertyInternet === 1 || propertyInternet === true ? 1 : 0,
      propertySecurity: propertySecurity === 1 || propertySecurity === true ? 1 : 0,
      propertyFurniture: propertyFurniture === 1 || propertyFurniture === true ? 1 : 0,
      propertyCommercialType: propertyCommercialType || null,
      propertyBusinessHours: propertyBusinessHours || null,
      requestDate: requestDate || new Date().toISOString(),
      status: status || 'pending'
    });

    const newRequest = await purchaseRequestQueries.getById(result.lastInsertRowid);
    
    console.log('✅ Создан новый запрос на покупку:', {
      id: newRequest.id,
      buyer: buyerName,
      property: propertyTitle,
      price: propertyPrice,
      currency: propertyCurrency
    });

    // Отправляем WhatsApp сообщение покупателю (асинхронно, не блокируя основной ответ)
    if (buyerPhone && waClientReady && waClient) {
      // Форматируем номер телефона (убираем все кроме цифр)
      const digits = String(buyerPhone).replace(/\D/g, '');
      
      if (digits && digits.length >= 10) {
        // Формируем сообщение
        const whatsappMessage = `Вы отправили запрос на покупку объекта "${propertyTitle}". Наш менеджер скоро с вами свяжется.`;
        
        // Отправляем сообщение асинхронно, не ожидая результата
        setImmediate(async () => {
          try {
            const chatId = `${digits}@c.us`;
            
            // Применяем патч sendSeen перед отправкой
            await applySendSeenPatch();
            
            // Отправляем сообщение
            await waClient.sendMessage(chatId, whatsappMessage);
            
            console.log('📱 WhatsApp сообщение отправлено покупателю:', {
              phone: digits,
              buyer: buyerName,
              property: propertyTitle
            });
          } catch (whatsappError) {
            console.error('❌ Ошибка отправки WhatsApp сообщения покупателю:', {
              error: whatsappError.message,
              phone: digits,
              buyer: buyerName
            });
          }
        });
      }
    }

    res.json({ success: true, data: newRequest, message: 'Запрос на покупку успешно создан' });
  } catch (error) {
    console.error('❌ Ошибка создания запроса на покупку:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/purchase-requests - Получить все запросы на покупку
 */
app.get('/api/purchase-requests', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;

    let requests;
    if (status) {
      requests = await purchaseRequestQueries.getByStatus(status, limit, offset);
    } else {
      requests = await purchaseRequestQueries.getAll(limit, offset);
    }

    const total = status 
      ? await purchaseRequestQueries.getCountByStatus(status)
      : await purchaseRequestQueries.getCount();

    res.json({ 
      success: true, 
      data: requests, 
      total,
      limit,
      offset 
    });
  } catch (error) {
    console.error('❌ Ошибка получения запросов:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/purchase-requests/:id - Получить запрос по ID
 */
app.get('/api/purchase-requests/:id', async (req, res) => {
  try {
    const request = await purchaseRequestQueries.getById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Запрос не найден' });
    }
    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/purchase-requests/buyer/:buyerId - Получить запросы покупателя
 */
app.get('/api/purchase-requests/buyer/:buyerId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const requests = await purchaseRequestQueries.getByBuyerId(req.params.buyerId, limit, offset);
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/purchase-requests/:id/status - Обновить статус запроса
 */
app.put('/api/purchase-requests/:id/status', async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    
    if (!status) {
      return res.status(400).json({ success: false, error: 'Необходимо указать статус' });
    }

    const request = await purchaseRequestQueries.getById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Запрос не найден' });
    }

    // Письма (как напоминания по EmailJS) — без email нельзя перевести в «в обработку» или «завершить»
    let resolvedBuyerEmailForMails = null;
    if (status === 'processing' || status === 'completed') {
      resolvedBuyerEmailForMails = await resolveBuyerEmailForPurchaseRequest(request);
      if (!resolvedBuyerEmailForMails) {
        return res.status(400).json({
          success: false,
          code: 'BUYER_EMAIL_REQUIRED',
          error:
            'У покупателя нет email в заявке и в профиле. Укажите email в профиле пользователя или в заявке — без него нельзя отправить письмо.',
        });
      }
    }

    // Если статус "processing", резервируем объект на 72 часа
    if (status === 'processing' && request.property_id) {
      try {
        const buyerId = request.buyer_id || null;
        console.log(`🔍 PUT /api/purchase-requests/:id/status - Резервация объекта ID=${request.property_id}, buyerId=${buyerId}, requestId=${req.params.id}`);
        
        const reserveResult = await propertyQueries.reserve(request.property_id, buyerId, req.params.id);
        console.log(`✅ Объект #${request.property_id} забронирован на 72 часа для запроса #${req.params.id}`, reserveResult);
        
        // Проверяем, что резервация действительно произошла
        const checkReservation = await propertyQueries.isReserved(request.property_id);
        console.log(`🔍 Проверка резервации после установки:`, checkReservation);
        
        if (!checkReservation.isReserved) {
          console.error(`❌ ВНИМАНИЕ: Резервация не установлена! Объект ID=${request.property_id} не забронирован`);
        }
      } catch (reserveError) {
        console.error('❌ Ошибка при резервации объекта:', reserveError);
        console.error('❌ Stack trace:', reserveError.stack);
        // Продолжаем выполнение, даже если резервация не удалась
      }
    }

    // Завершение сделки «Купить сейчас»: фиксируем победителя на объекте; отмена — только снять бронь
    if (status === 'completed' && request.property_id) {
      try {
        const buyerIdNum =
          request.buyer_id != null ? parseInt(String(request.buyer_id).trim(), 10) : NaN;
        if (Number.isFinite(buyerIdNum)) {
          await propertyQueries.markBuyNowSaleComplete(request.property_id, buyerIdNum);
          console.log(
            `✅ Сделка завершена: объект #${request.property_id}, покупатель user_id=${buyerIdNum}, запрос #${req.params.id}`
          );
        } else {
          await propertyQueries.unreserve(request.property_id);
          console.warn(`⚠️ completed без buyer_id — снята только бронь, объект #${request.property_id}`);
        }
      } catch (completeErr) {
        console.error('❌ Ошибка markBuyNowSaleComplete / unreserve:', completeErr);
      }
    } else if (status === 'cancelled' && request.property_id) {
      try {
        await propertyQueries.unreserve(request.property_id);
        console.log(`✅ Резервация объекта #${request.property_id} снята (отмена запроса #${req.params.id})`);
      } catch (unreserveError) {
        console.error('❌ Ошибка при снятии резервации объекта:', unreserveError);
      }
    }

    await purchaseRequestQueries.updateStatus(req.params.id, status, adminNotes);
    const updatedRequest = await purchaseRequestQueries.getById(req.params.id);
    
    console.log(`✅ Статус запроса #${req.params.id} обновлен: ${status}`);

    // Завершение сделки: перенос активов с аккаунта покупателя на продавца (один email), чтобы кабинет продавца видел покупки
    if (status === 'completed') {
      try {
        const rawBuyerId = request.buyer_id;
        const buyerIdNum =
          rawBuyerId != null ? parseInt(String(rawBuyerId).trim(), 10) : NaN;
        if (Number.isFinite(buyerIdNum)) {
          const buyerUser = await userQueries.getById(buyerIdNum);
          const email =
            buyerUser?.email && String(buyerUser.email).trim().toLowerCase();
          if (email) {
            const sameEmail = await userQueries.getAllByEmail(email);
            const sellerRow = sameEmail.find(
              (u) =>
                Number(u.id) !== buyerIdNum &&
                String(u.role || '').toLowerCase() === 'seller'
            );
            if (sellerRow) {
              await userQueries.migrateBuyerAssetsToSellerUser(
                buyerIdNum,
                Number(sellerRow.id)
              );
              console.log(
                `✅ Перенос активов покупатель→продавец после завершения запроса #${req.params.id}: ${buyerIdNum} → ${sellerRow.id}`
              );
            }
          }
        }
      } catch (migrateOnCompleteErr) {
        console.error(
          '❌ Ошибка переноса активов при завершении запроса на покупку:',
          migrateOnCompleteErr
        );
      }
    }
    
    // Если статус "processing", отправляем уведомления покупателю
    if (status === 'processing') {
      try {
        // Получаем реквизиты для платежа (можно вынести в переменные окружения)
        const paymentAccount = process.env.PAYMENT_ACCOUNT_NUMBER || 'BY36ALFA30122345678901234567';
        
        // Формируем сообщение для покупателя
        const currencySymbol = getCurrencySymbol(request.property_currency);
        const propertyPrice = request.property_price ? 
          `${currencySymbol}${parseFloat(request.property_price).toLocaleString('ru-RU')}` : 
          'не указана';
        
        const message = `Здравствуйте, ${request.buyer_name || 'Покупатель'}!

Мы рассмотрели ваш запрос на покупку объекта недвижимости.

📋 Детали запроса:
🏠 Объект: ${request.property_title || 'Не указан'}
💰 Цена: ${propertyPrice}
📍 Местоположение: ${request.property_location || 'Не указано'}

Для продолжения необходимо совершить первоначальный платеж по следующим реквизитам:

💳 Номер счета: ${paymentAccount}

После получения платежа наш менеджер свяжется с вами для дальнейших действий.

С уважением,
Команда Sellyourbrick`;

        // Отправляем WhatsApp сообщение
        if (request.buyer_phone) {
          try {
            const formattedPhone = String(request.buyer_phone).replace(/\D/g, '');
            if (formattedPhone && waClientReady && waClient) {
              const chatId = `${formattedPhone}@c.us`;
              await waClient.sendMessage(chatId, message);
              console.log(`✅ WhatsApp сообщение отправлено покупателю: ${formattedPhone}`);
            }
          } catch (whatsappError) {
            console.error('❌ Ошибка отправки WhatsApp:', whatsappError);
          }
        }

        if (resolvedBuyerEmailForMails) {
          try {
            await sendCrmEmailViaEmailJS(
              resolvedBuyerEmailForMails,
              'Поздравляем! Запрос на покупку одобрен — Sellyourbrick',
              message
            );
          } catch (emailJsErr) {
            console.error('❌ EmailJS (одобрение запроса):', emailJsErr.message);
          }
        }
      } catch (notificationError) {
        console.error('❌ Ошибка при отправке уведомлений:', notificationError);
        // Продолжаем выполнение, даже если уведомления не отправились
      }
    }

    // High-priority уведомления для покупателя по "Купить сейчас"
    if (request.buyer_id) {
      try {
        const propertyIdNum = request.property_id ? parseInt(request.property_id, 10) : null;
        const safePropertyId = Number.isFinite(propertyIdNum) ? propertyIdNum : null;
        const propertyTitle = request.property_title || 'Объект недвижимости';
        const requestIdNum = parseInt(req.params.id, 10);
        const buyerIdForNotif = parseInt(String(request.buyer_id).trim(), 10);

        if (Number.isFinite(buyerIdForNotif)) {
          if (status === 'processing') {
            await notificationQueries.create({
              user_id: buyerIdForNotif,
              type: 'buy_now_approved',
              title: 'Покупка одобрена',
              message: `Ваш запрос на покупку "${propertyTitle}" одобрен. Перейдите к оформлению.`,
              data: {
                request_id: Number.isFinite(requestIdNum) ? requestIdNum : null,
                property_id: safePropertyId
              },
              is_read: 0,
              view_count: 0
            });
          } else if (status === 'completed') {
            await notificationQueries.create({
              user_id: buyerIdForNotif,
              type: 'buy_now_completed',
              title: 'Объект ваш!',
              message: `Вы успешно приобрели объект «${propertyTitle}».`,
              data: {
                request_id: Number.isFinite(requestIdNum) ? requestIdNum : null,
                property_id: safePropertyId
              },
              is_read: 0,
              view_count: 0
            });
          } else if (status === 'rejected' || status === 'cancelled') {
            await notificationQueries.create({
              user_id: buyerIdForNotif,
              type: 'buy_now_rejected',
              title: 'Покупка отклонена',
              message: `Ваш запрос на покупку "${propertyTitle}" был отклонен.`,
              data: {
                request_id: Number.isFinite(requestIdNum) ? requestIdNum : null,
                property_id: safePropertyId
              },
              is_read: 0,
              view_count: 0
            });
          }
          try {
            broadcastUserCabinetEvent(buyerIdForNotif, { type: 'notifications_refresh' });
          } catch (e) {
            console.warn('[SSE] notifications_refresh (purchase request buyer):', e?.message || e);
          }
        }
      } catch (buyerNotifError) {
        console.error('❌ Ошибка создания buyer-уведомления по purchase request:', buyerNotifError);
      }
    }

    if (status === 'completed') {
      try {
        const sellerId = parseInt(String(request.seller_id || '').trim(), 10);
        if (Number.isFinite(sellerId) && sellerId > 0) {
          broadcastUserCabinetEvent(sellerId, { type: 'notifications_refresh' });
        }
      } catch (e) {
        console.warn('[SSE] notifications_refresh (purchase request seller):', e?.message || e);
      }
    }

    if (status === 'completed' && resolvedBuyerEmailForMails) {
      try {
        const name = updatedRequest.buyer_name || 'Покупатель';
        const pTitle = updatedRequest.property_title || 'Объект недвижимости';
        const pLoc = updatedRequest.property_location || 'Не указано';
        const congratsBody = `Здравствуйте, ${name}!

Поздравляем с покупкой объекта недвижимости!

🏠 Объект: ${pTitle}
📍 Местоположение: ${pLoc}

Сделка по запросу #${req.params.id} отмечена как завершена. Спасибо, что выбрали нас.

С уважением,
Команда Sellyourbrick`;
        await sendCrmEmailViaEmailJS(
          resolvedBuyerEmailForMails,
          `Поздравляем! Объект «${pTitle}» ваш — Sellyourbrick`,
          congratsBody
        );
      } catch (completeMailErr) {
        console.error('❌ EmailJS (завершение сделки):', completeMailErr.message);
      }
    }
    
    res.json({ success: true, data: updatedRequest, message: 'Статус обновлен' });
  } catch (error) {
    console.error('❌ Ошибка обновления статуса:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/purchase-requests/:id - Удалить запрос
 */
app.delete('/api/purchase-requests/:id', async (req, res) => {
  try {
    const request = await purchaseRequestQueries.getById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Запрос не найден' });
    }

    // Снимаем резервацию объекта при удалении запроса
    if (request.property_id) {
      try {
        console.log(`🔍 DELETE /api/purchase-requests/:id - Снятие резервации объекта ID=${request.property_id} для запроса #${req.params.id}`);
        
        await propertyQueries.unreserve(request.property_id);
        console.log(`✅ Резервация объекта #${request.property_id} снята при удалении запроса #${req.params.id}`);
      } catch (unreserveError) {
        console.error('❌ Ошибка при снятии резервации объекта:', unreserveError);
        // Продолжаем выполнение, даже если снятие резервации не удалось
      }
    }

    await purchaseRequestQueries.delete(req.params.id);
    console.log(`✅ Запрос #${req.params.id} удален`);
    
    res.json({ success: true, message: 'Запрос успешно удален' });
  } catch (error) {
    console.error('❌ Ошибка удаления запроса:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== API ENDPOINTS ДЛЯ ИНВЕСТИЦИОННОГО КАЛЬКУЛЯТОРА ==========

/**
 * GET /api/investment/market-data - Получить данные о рынке недвижимости
 */
app.get('/api/investment/market-data', async (req, res) => {
  try {
    const result = await getMarketData();
    return res.json(result);
  } catch (error) {
    console.error('❌ GET /api/investment/market-data:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Ошибка получения данных о рынке' 
    });
  }
});

/**
 * GET /api/investment/mortgage-rates - Получить актуальные ипотечные ставки
 */
app.get('/api/investment/mortgage-rates', async (req, res) => {
  try {
    const result = await getMortgageRates();
    return res.json(result);
  } catch (error) {
    console.error('❌ GET /api/investment/mortgage-rates:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Ошибка получения ипотечных ставок' 
    });
  }
});

/**
 * GET /api/investment/rental-yield - Получить данные о доходности аренды по региону
 * Query: region (опционально, по умолчанию 'Москва')
 */
app.get('/api/investment/rental-yield', async (req, res) => {
  try {
    const region = req.query.region || 'Москва';
    const result = await getRentalYieldByRegion(region);
    return res.json(result);
  } catch (error) {
    console.error('❌ GET /api/investment/rental-yield:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Ошибка получения данных о доходности аренды' 
    });
  }
});

// ========== КОНЕЦ API ENDPOINTS ДЛЯ ИНВЕСТИЦИОННОГО КАЛЬКУЛЯТОРА ==========

/**
 * POST /api/assistant-leads - Сохранить/обновить сессию чата с умным помощником
 */
app.post('/api/assistant-leads', async (req, res) => {
  try {
    const { sessionId, userId, messages, preferences, email, phone } = req.body || {};
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
      return res.status(400).json({ success: false, error: 'sessionId обязателен' });
    }
    const result = await assistantLeadQueries.upsert({
      sessionId: sessionId.trim(),
      userId: userId ? parseInt(userId, 10) : null,
      messages: messages || [],
      preferences: preferences || {},
      email: email && String(email).trim() || null,
      phone: phone && String(phone).trim() || null
    });
    return res.json({ success: true, id: result.id, created: result.created });
  } catch (error) {
    console.error('❌ POST /api/assistant-leads:', error);
    return res.status(500).json({ success: false, error: error.message || 'Ошибка сервера' });
  }
});

/**
 * GET /api/assistant-leads - Список лидов умного помощника (для админки)
 */
app.get('/api/assistant-leads', async (req, res) => {
  try {
    const list = await assistantLeadQueries.getAll();
    return res.json({ success: true, data: list });
  } catch (error) {
    console.error('❌ GET /api/assistant-leads:', error);
    return res.status(500).json({ success: false, error: error.message || 'Ошибка сервера' });
  }
});

/**
 * GET /api/assistant-leads/:id - Один лид по ID (карточка клиента)
 */
app.get('/api/assistant-leads/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Некорректный id' });
    const lead = await assistantLeadQueries.getById(id);
    if (!lead) return res.status(404).json({ success: false, error: 'Лид не найден' });
    return res.json({ success: true, data: lead });
  } catch (error) {
    console.error('❌ GET /api/assistant-leads/:id:', error);
    return res.status(500).json({ success: false, error: error.message || 'Ошибка сервера' });
  }
});

/**
 * POST /api/live-chat/sessions — создать или вернуть существующую сессию чата с менеджером (по assistant_session_id).
 */
app.post('/api/live-chat/sessions', async (req, res) => {
  try {
    const { assistantSessionId, userId, waitMessage } = req.body || {};
    const asst = assistantSessionId && String(assistantSessionId).trim();
    let session = null;
    let createdNew = false;
    if (asst) {
      session = await liveChatQueries.findLatestSessionByAssistantId(asst);
    }
    if (!session) {
      const created = await liveChatQueries.createSession({
        userId: userId ? parseInt(userId, 10) : null,
        assistantSessionId: asst || null,
        waitMessage
      });
      session = await liveChatQueries.getSessionById(created.id);
      createdNew = true;
    }
    const messages = await liveChatQueries.getMessages(session.id, 0);
    if (createdNew) {
      const row = await liveChatQueries.getSessionListRowById(session.id);
      if (row) broadcastLiveChatAdminEvent({ type: 'live_chat_session', session: row });
      for (const m of messages) {
        broadcastLiveChatAdminEvent({
          type: 'live_chat_message',
          sessionId: session.id,
          message: m
        });
      }
    }
    return res.json({
      success: true,
      data: {
        sessionId: session.id,
        token: session.public_token,
        messages
      }
    });
  } catch (error) {
    console.error('❌ POST /api/live-chat/sessions:', error);
    return res.status(500).json({ success: false, error: error.message || 'Ошибка сервера' });
  }
});

/**
 * GET /api/live-chat/sessions/:token/messages?since=id
 */
app.get('/api/live-chat/sessions/:token/messages', async (req, res) => {
  try {
    const token = req.params.token;
    const session = await liveChatQueries.getSessionByToken(token);
    if (!session) return res.status(404).json({ success: false, error: 'Сессия не найдена' });
    const since = parseInt(req.query.since, 10) || 0;
    const messages = await liveChatQueries.getMessages(session.id, since);
    return res.json({ success: true, data: messages });
  } catch (error) {
    console.error('❌ GET live-chat messages:', error);
    return res.status(500).json({ success: false, error: error.message || 'Ошибка сервера' });
  }
});

/**
 * POST /api/live-chat/sessions/:token/messages — сообщение от посетителя
 */
app.post('/api/live-chat/sessions/:token/messages', async (req, res) => {
  try {
    const token = req.params.token;
    const session = await liveChatQueries.getSessionByToken(token);
    if (!session) return res.status(404).json({ success: false, error: 'Сессия не найдена' });
    const text = req.body && req.body.text != null ? String(req.body.text).trim() : '';
    if (!text) return res.status(400).json({ success: false, error: 'Пустое сообщение' });
    const msgId = await liveChatQueries.addMessage(session.id, 'user', text);
    if (!msgId) return res.status(400).json({ success: false, error: 'Не удалось сохранить сообщение' });
    const row = await liveChatQueries.getMessageRow(session.id, msgId);
    broadcastLiveChatAdminEvent({ type: 'live_chat_message', sessionId: session.id, message: row });
    return res.json({ success: true, data: row });
  } catch (error) {
    console.error('❌ POST live-chat user message:', error);
    return res.status(500).json({ success: false, error: error.message || 'Ошибка сервера' });
  }
});

/**
 * GET /api/admin/live-chat/sessions — список диалогов для админки
 */
app.get('/api/admin/live-chat/sessions', async (req, res) => {
  try {
    const list = await liveChatQueries.listSessionsForAdmin();
    return res.json({ success: true, data: list });
  } catch (error) {
    console.error('❌ GET /api/admin/live-chat/sessions:', error);
    return res.status(500).json({ success: false, error: error.message || 'Ошибка сервера' });
  }
});

/**
 * GET /api/admin/live-chat/sessions/:id/messages
 */
app.get('/api/admin/live-chat/sessions/:id/messages', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Некорректный id' });
    const session = await liveChatQueries.getSessionById(id);
    if (!session) return res.status(404).json({ success: false, error: 'Сессия не найдена' });
    const messages = await liveChatQueries.getMessages(id, 0);
    return res.json({ success: true, data: messages });
  } catch (error) {
    console.error('❌ GET admin live-chat messages:', error);
    return res.status(500).json({ success: false, error: error.message || 'Ошибка сервера' });
  }
});

/**
 * POST /api/admin/live-chat/sessions/:id/messages — ответ менеджера
 */
app.post('/api/admin/live-chat/sessions/:id/messages', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Некорректный id' });
    const session = await liveChatQueries.getSessionById(id);
    if (!session) return res.status(404).json({ success: false, error: 'Сессия не найдена' });
    const text = req.body && req.body.text != null ? String(req.body.text).trim() : '';
    if (!text) return res.status(400).json({ success: false, error: 'Пустое сообщение' });
    const msgId = await liveChatQueries.addMessage(id, 'manager', text);
    const row = await liveChatQueries.getMessageRow(id, msgId);
    broadcastLiveChatAdminEvent({ type: 'live_chat_message', sessionId: id, message: row });
    return res.json({ success: true, data: row });
  } catch (error) {
    console.error('❌ POST admin live-chat message:', error);
    return res.status(500).json({ success: false, error: error.message || 'Ошибка сервера' });
  }
});

/**
 * GET /api/admin/live-chat/user-messages-since?since=ISO — число сообщений от посетителя после метки «просмотрено»
 */
app.get('/api/admin/live-chat/user-messages-since', async (req, res) => {
  try {
    const raw = req.query && req.query.since != null ? String(req.query.since).trim() : '';
    const since = raw ? new Date(raw) : new Date(0);
    if (Number.isNaN(since.getTime())) {
      return res.status(400).json({ success: false, error: 'Некорректный since' });
    }
    const prisma = getPrisma();
    const count = await prisma.live_chat_messages.count({
      where: {
        created_at: { gt: since },
        sender_role: { in: ['user', 'client', 'visitor'] },
      },
    });
    return res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('❌ GET /api/admin/live-chat/user-messages-since:', error);
    return res.status(500).json({ success: false, error: error.message || 'Ошибка сервера' });
  }
});

/** ID задания «Пригласи друга» и промокод за реферала */
const REFERRAL_TASK_ID = 9;
const BONUS_REFER_PROMO = 'BONUS-REFER-10';

/**
 * Выдать бонус «Пригласи друга» пригласителю после регистрации нового пользователя по реферальной ссылке.
 * @param {string|number} referrerId - ID пригласителя
 * @param {number} newUserId - ID только что зарегистрированного пользователя
 */
async function grantReferralBonus(referrerId, newUserId) {
  if (!referrerId || !newUserId) return;
  const refId = String(referrerId).trim();
  const refNum = parseInt(refId, 10);
  if (!refNum || refNum === parseInt(newUserId, 10)) return;
  const referrer = await userQueries.getById(refNum);
  if (!referrer) return;
  const prisma = getPrisma();
  const existing = await prisma.bonus_task_submissions.findFirst({
    where: { user_id: refNum, task_id: REFERRAL_TASK_ID, status: 'approved' },
    select: { id: true },
  });
  if (existing) return;
  await prisma.bonus_task_submissions.create({
    data: {
      user_id: refNum,
      task_id: REFERRAL_TASK_ID,
      link: 'referral',
      status: 'approved',
      promo_code: BONUS_REFER_PROMO,
    },
  });
}

/**
 * POST /api/bonus-submissions - Отправить заявку на бонусное задание (ссылка на пост/профиль)
 */
app.post('/api/bonus-submissions', async (req, res) => {
  try {
    const prisma = getPrisma();
    const { user_id, task_id, link, promo_code } = req.body || {};
    if (!user_id || !task_id || !link || typeof link !== 'string' || !link.trim()) {
      return res.status(400).json({ success: false, message: 'Укажите user_id, task_id и ссылку.' });
    }
    const linkTrim = link.trim();
    if (!/^https?:\/\/.+/i.test(linkTrim)) {
      return res.status(400).json({ success: false, message: 'Некорректная ссылка.' });
    }
    const created = await prisma.bonus_task_submissions.create({
      data: {
        user_id: Number(user_id),
        task_id: Number(task_id),
        link: linkTrim,
        status: 'pending',
        promo_code: promo_code || null,
      },
      select: { id: true },
    });
    const id = created.id;
    return res.status(201).json({ success: true, data: { id, status: 'pending' } });
  } catch (error) {
    console.error('❌ POST /api/bonus-submissions:', error);
    return res.status(500).json({ success: false, message: error.message || 'Ошибка сервера.' });
  }
});

/**
 * GET /api/bonus-submissions/user/:userId - Заявки пользователя по заданиям
 */
app.get('/api/bonus-submissions/user/:userId', async (req, res) => {
  try {
    const prisma = getPrisma();
    const userId = req.params.userId;
    const rows = await prisma.bonus_task_submissions.findMany({
      where: { user_id: Number(userId) },
      select: {
        id: true,
        user_id: true,
        task_id: true,
        link: true,
        status: true,
        promo_code: true,
        created_at: true,
        used_at: true,
      },
      orderBy: { task_id: 'asc' },
    });
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ GET /api/bonus-submissions/user/:userId:', error);
    return res.status(500).json({ success: false, message: error.message || 'Ошибка сервера.' });
  }
});

/**
 * GET /api/bonus-submissions/pending - Список заявок на проверке (для админа)
 */
app.get('/api/bonus-submissions/pending', async (req, res) => {
  try {
    const prisma = getPrisma();
    const rows = await prisma.bonus_task_submissions.findMany({
      where: { status: 'pending' },
      select: {
        id: true,
        user_id: true,
        task_id: true,
        link: true,
        status: true,
        promo_code: true,
        created_at: true,
      },
      orderBy: { created_at: 'asc' },
    });
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ GET /api/bonus-submissions/pending:', error);
    return res.status(500).json({ success: false, message: error.message || 'Ошибка сервера.' });
  }
});

/**
 * PUT /api/bonus-submissions/:id/approve - Одобрить заявку (админ)
 */
app.put('/api/bonus-submissions/:id/approve', async (req, res) => {
  try {
    const prisma = getPrisma();
    const id = req.params.id;
    const row = await prisma.bonus_task_submissions.findUnique({
      where: { id: Number(id) },
      select: { id: true, status: true, promo_code: true },
    });
    if (!row) return res.status(404).json({ success: false, message: 'Заявка не найдена.' });
    if (row.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Заявка уже обработана.' });
    }
    await prisma.bonus_task_submissions.update({
      where: { id: Number(id) },
      data: { status: 'approved', reviewed_at: new Date().toISOString() },
    });
    return res.json({ success: true, data: { id, status: 'approved', promo_code: row.promo_code } });
  } catch (error) {
    console.error('❌ PUT /api/bonus-submissions/:id/approve:', error);
    return res.status(500).json({ success: false, message: error.message || 'Ошибка сервера.' });
  }
});

/**
 * PUT /api/bonus-submissions/:id/reject - Отклонить заявку (админ)
 */
app.put('/api/bonus-submissions/:id/reject', async (req, res) => {
  try {
    const prisma = getPrisma();
    const id = req.params.id;
    const row = await prisma.bonus_task_submissions.findUnique({
      where: { id: Number(id) },
      select: { id: true, status: true },
    });
    if (!row) return res.status(404).json({ success: false, message: 'Заявка не найдена.' });
    if (row.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Заявка уже обработана.' });
    }
    await prisma.bonus_task_submissions.update({
      where: { id: Number(id) },
      data: { status: 'rejected', reviewed_at: new Date().toISOString() },
    });
    return res.json({ success: true, data: { id, status: 'rejected' } });
  } catch (error) {
    console.error('❌ PUT /api/bonus-submissions/:id/reject:', error);
    return res.status(500).json({ success: false, message: error.message || 'Ошибка сервера.' });
  }
});

/** Список task_id для промокодов продавца (бонусы для продавцов) */
const SELLER_PROMO_TASK_IDS = [5, 6, 7, 8];

/**
 * POST /api/bonus-submissions/use-promo - Проверить и использовать промокод при публикации объекта (для продавца)
 * Body: { user_id, promo_code }
 * Проверяет: промокод существует, принадлежит пользователю, задание для продавца (task_id 5-8), ещё не использован.
 * При успехе помечает заявку used_at и возвращает success.
 */
app.post('/api/bonus-submissions/use-promo', async (req, res) => {
  try {
    const prisma = getPrisma();
    const { user_id, promo_code } = req.body || {};
    if (!user_id || !promo_code || typeof promo_code !== 'string') {
      return res.status(400).json({ success: false, reason: 'invalid', message: 'Укажите user_id и промокод.' });
    }
    const codeTrim = String(promo_code).trim().toUpperCase();
    if (!codeTrim) {
      return res.status(400).json({ success: false, reason: 'invalid', message: 'Введите промокод.' });
    }

    // Специальный "супер" промокод ADMIN, который всегда проходит без каких‑либо проверок
    if (codeTrim === 'ADMIN') {
      return res.json({
        success: true,
        data: {
          submission_id: null,
          promo_code: 'ADMIN',
          is_admin_promo: true,
        },
      });
    }

    const row = await prisma.bonus_task_submissions.findFirst({
      where: {
        user_id: Number(user_id),
        status: 'approved',
        promo_code: { equals: codeTrim, mode: 'insensitive' },
      },
      select: { id: true, user_id: true, task_id: true, status: true, promo_code: true, used_at: true },
    });

    if (!row) {
      return res.json({ success: false, reason: 'invalid', message: 'Промокод не найден или не подходит.' });
    }
    if (!SELLER_PROMO_TASK_IDS.includes(row.task_id)) {
      return res.json({ success: false, reason: 'invalid', message: 'Этот промокод не для оплаты публикации объекта.' });
    }
    if (row.used_at) {
      return res.json({ success: false, reason: 'used', message: 'Этот промокод уже был использован.' });
    }

    await prisma.bonus_task_submissions.update({
      where: { id: row.id },
      data: { used_at: new Date().toISOString() },
    });
    return res.json({ success: true, data: { submission_id: row.id, promo_code: row.promo_code } });
  } catch (error) {
    console.error('❌ POST /api/bonus-submissions/use-promo:', error);
    return res.status(500).json({ success: false, reason: 'error', message: error.message || 'Ошибка сервера.' });
  }
});

/**
 * GET /api/owner/:sellerId/interest-count - Получить количество уникальных пользователей, 
 * которые взаимодействовали с объектами продавца (ставки + запросы на покупку)
 */
app.get('/api/owner/:sellerId/interest-count', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const prisma = getPrisma();
    
    // Проверяем, существует ли продавец
    const seller = await userQueries.getById(sellerId);
    if (!seller) {
      return res.status(404).json({ success: false, error: 'Продавец не найден' });
    }
    
    // Получаем все объекты продавца
    const properties = await propertyQueries.getByUserId(sellerId);
    if (!properties || properties.length === 0) {
      return res.json({ success: true, data: { uniqueUsersCount: 0 } });
    }
    
    // Получаем ID всех объектов продавца
    const propertyIds = properties.map(p => p.id);
    
    // Получаем уникальных пользователей из ставок
    const uniqueBidUsers = new Set();
    const bids = await prisma.bids.findMany({
      where: { property_id: { in: propertyIds } },
      select: { user_id: true },
      distinct: ['user_id'],
    });
    bids.forEach((bid) => {
      if (bid.user_id) uniqueBidUsers.add(bid.user_id);
    });
    
    // Получаем уникальных пользователей из запросов на покупку
    const uniquePurchaseRequestUsers = new Set();
    const purchaseRequests = await prisma.purchase_requests.findMany({
      where: { property_id: { in: propertyIds }, buyer_id: { not: null } },
      select: { buyer_id: true },
      distinct: ['buyer_id'],
    });
    purchaseRequests.forEach((pr) => {
      const n = parseInt(String(pr.buyer_id), 10);
      if (Number.isFinite(n)) uniquePurchaseRequestUsers.add(n);
    });
    
    // Объединяем уникальных пользователей из обеих таблиц
    const allUniqueUsers = new Set([...uniqueBidUsers, ...uniquePurchaseRequestUsers]);
    const uniqueUsersCount = allUniqueUsers.size;
    
    console.log(`✅ Подсчет заинтересованности для продавца ${sellerId}:`, {
      propertiesCount: propertyIds.length,
      uniqueBidUsers: uniqueBidUsers.size,
      uniquePurchaseRequestUsers: uniquePurchaseRequestUsers.size,
      totalUniqueUsers: uniqueUsersCount
    });
    
    res.json({ 
      success: true, 
      data: { 
        uniqueUsersCount,
        propertiesCount: propertyIds.length,
        bidsUsersCount: uniqueBidUsers.size,
        purchaseRequestsUsersCount: uniquePurchaseRequestUsers.size
      } 
    });
  } catch (error) {
    console.error('❌ Ошибка при подсчете заинтересованности:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/email/check-seller-registration — перед регистрацией продавца: есть ли покупатель с этим email
 */
app.post('/api/auth/email/check-seller-registration', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Укажите email' });
    }
    const emailLower = email.toLowerCase().trim();
    const rows = await userQueries.getAllByEmail(emailLower);
    if (rows.length === 0) {
      return res.json({ success: true, status: 'ok' });
    }
    const isSellerRole = (r) => r === 'seller' || r === 'owner';
    const isBuyerLike = (r) => r === 'buyer' || r === 'client' || !r;
    if (rows.some((u) => isSellerRole(u.role))) {
      return res.status(409).json({
        success: false,
        status: 'already_seller',
        error: 'Этот email уже зарегистрирован как продавец. Войдите в кабинет продавца.',
      });
    }
    const buyers = rows.filter((u) => isBuyerLike(u.role));
    if (buyers.length === 0) {
      return res.status(409).json({
        success: false,
        status: 'email_unavailable',
        error: 'Этот email уже используется в системе.',
      });
    }
    const buyer = buyers[0];
    const { password } = req.body;
    if (password && typeof password === 'string' && buyer.password) {
      const hashedTry = crypto.createHash('sha256').update(password).digest('hex');
      if (hashedTry === buyer.password) {
        return res.status(400).json({
          success: false,
          status: 'password_same_as_buyer',
          error:
            'Пароль кабинета продавца должен отличаться от пароля кабинета покупателя. Укажите другой пароль.',
        });
      }
    }
    return res.json({
      success: true,
      status: 'needs_confirmation',
      buyerId: buyer.id,
    });
  } catch (error) {
    console.error('❌ check-seller-registration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/email/register - Регистрация через Email
 */
app.post('/api/auth/email/register', async (req, res) => {
  try {
    const { email, password, name, code, referrer_id: referrerId, link_buyer_id: linkBuyerIdRaw } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать email, пароль и имя' 
      });
    }
    
    // Валидация пароля
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: passwordValidation.message,
        passwordValidation: {
          missing: passwordValidation.missing,
          present: passwordValidation.present
        }
      });
    }
    
    const emailLower = email.toLowerCase();
    const linkBuyerId = linkBuyerIdRaw != null ? parseInt(String(linkBuyerIdRaw), 10) : null;
    const regRole = req.body.role || 'buyer';

    let linkBuyer = null;
    if (linkBuyerId) {
      if (regRole !== 'seller' && regRole !== 'owner') {
        return res.status(400).json({
          success: false,
          error: 'Привязка к покупателю допустима только при регистрации продавца',
        });
      }
      linkBuyer = await userQueries.getById(linkBuyerId);
      if (!linkBuyer || (linkBuyer.email || '').toLowerCase() !== emailLower) {
        return res.status(400).json({
          success: false,
          error: 'Не удалось подтвердить аккаунт покупателя для этого email',
        });
      }
      const br = linkBuyer.role || 'buyer';
      if (br === 'seller' || br === 'owner') {
        return res.status(409).json({
          success: false,
          error: 'Аккаунт уже оформлен как продавец',
        });
      }
      const others = await userQueries.getAllByEmail(emailLower);
      if (others.some((u) => u.id !== linkBuyerId && (u.role === 'seller' || u.role === 'owner'))) {
        return res.status(409).json({
          success: false,
          error: 'Для этого email уже есть кабинет продавца',
        });
      }
    }

    // Дубликат email: запрещён, кроме сценария «второй аккаунт продавца» с подтверждённым покупателем
    if (!linkBuyer) {
      const existingUser = await userQueries.getByEmail(emailLower);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Пользователь с таким email уже существует',
        });
      }
    }
    
    // Разбиваем имя на имя и фамилию
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Хешируем пароль (используем SHA-256 для безопасности)
    // В production рекомендуется использовать bcrypt, но для простоты используем crypto
    const hashedPassword = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    if (linkBuyer && linkBuyer.password && linkBuyer.password === hashedPassword) {
      return res.status(400).json({
        success: false,
        status: 'password_same_as_buyer',
        error:
          'Пароль кабинета продавца должен отличаться от пароля кабинета покупателя. Укажите другой пароль.',
      });
    }
    
    const newUser = {
      first_name: firstName,
      last_name: lastName,
      email: emailLower,
      password: hashedPassword, // Сохраняем хешированный пароль
      phone_number: null, // Телефон не требуется для email регистрации
      role: linkBuyer ? 'seller' : (req.body.role || 'buyer'),
      // ВАЖНО: is_verified отвечает за верификацию документов администратором,
      // а не за подтверждение email. Новый пользователь всегда стартует как не верифицированный.
      is_verified: 0,
      is_online: 1
    };
    
    console.log('📝 Создание нового пользователя:', { email: emailLower, name, role: newUser.role });
    const result = await userQueries.create(newUser);
    console.log('✅ Пользователь создан, ID:', result.lastInsertRowid);
    
    const createdUser = await userQueries.getById(result.lastInsertRowid);
    if (!createdUser) {
      console.error('❌ Ошибка: Пользователь не найден после создания, ID:', result.lastInsertRowid);
      return res.status(500).json({
        success: false,
        error: 'Ошибка при создании пользователя'
      });
    }

    if (referrerId) {
      try {
        await grantReferralBonus(referrerId, createdUser.id);
      } catch (refErr) {
        console.warn('⚠️ Реферальный бонус не выдан:', refErr.message);
      }
    }

    if (linkBuyer) {
      try {
        await userQueries.migrateBuyerAssetsToSellerUser(linkBuyer.id, createdUser.id);
        const dep = Number(linkBuyer.deposit_amount) || 0;
        if (dep > 0) {
          await userQueries.update(createdUser.id, { deposit_amount: dep });
          await userQueries.update(linkBuyer.id, { deposit_amount: 0 });
        }
      } catch (migErr) {
        console.error('❌ Ошибка переноса данных покупателя → продавец:', migErr);
        try {
          await userQueries.delete(createdUser.id);
        } catch (delErr) {
          console.error('❌ Не удалось откатить создание продавца:', delErr);
        }
        return res.status(500).json({
          success: false,
          error: 'Не удалось перенести данные покупателя. Попробуйте позже или обратитесь в поддержку.',
        });
      }
    }

    const createdUserFinal = linkBuyer ? await userQueries.getById(createdUser.id) : createdUser;

    console.log('✅ Пользователь успешно сохранен в БД:', {
      id: createdUserFinal.id,
      email: createdUserFinal.email,
      name: `${createdUserFinal.first_name} ${createdUserFinal.last_name}`.trim(),
      role: createdUserFinal.role
    });
    
    // Безопасно получаем user_id_number (может не существовать в старых БД)
    const userIdNumber = createdUserFinal.hasOwnProperty('user_id_number')
      ? (createdUserFinal.user_id_number || null)
      : null;
    
    res.status(201).json({ 
      success: true, 
      user: {
        id: createdUserFinal.id,
        name: `${createdUserFinal.first_name} ${createdUserFinal.last_name}`.trim(),
        email: createdUserFinal.email,
        role: createdUserFinal.role,
        phone: createdUserFinal.phone_number,
        ...(userIdNumber !== null && { user_id_number: userIdNumber })
      }
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ 
        success: false, 
        error: 'Пользователь с таким email уже существует' 
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/email/login - Вход через Email или Username
 */
app.post('/api/auth/email/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать email/username и пароль' 
      });
    }
    
    const identifier = email.toLowerCase().trim();
    
    console.log('🔐 Попытка входа:', { identifier });

    const candidates = await userQueries.getAllByEmail(identifier);
    if (candidates.length === 0) {
      console.log('❌ Пользователь не найден:', identifier);
      return res.status(401).json({
        success: false,
        error: 'Неверный email или пароль',
      });
    }

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    /** Несколько аккаунтов с одним email (покупатель + продавец) — подбираем по паролю */
    let user = null;
    for (const u of candidates) {
      if (!u.password) continue;
      if (u.password === hashedPassword) {
        user = u;
        break;
      }
    }

    if (!user) {
      if (candidates.length === 1 && !candidates[0].password) {
        return res.status(401).json({
          success: false,
          error:
            'Пароль не установлен. Установите пароль в настройках профиля (вкладка "Данные").',
        });
      }
      console.log('❌ Неверный пароль для email:', identifier);
      return res.status(401).json({
        success: false,
        error: 'Неверный email или пароль',
      });
    }

    console.log('✅ Пользователь найден:', { id: user.id, email: user.email, role: user.role });
    
    // Проверяем, заблокирован ли пользователь
    if (user.is_blocked === 1) {
      console.log('🚫 Пользователь заблокирован:', { id: user.id, email: user.email });
      return res.status(403).json({ 
        success: false, 
        error: 'Пользователь заблокирован',
        is_blocked: true
      });
    }
    
    // Пароль верный, обновляем статус онлайн (update может сгенерировать user_id_number для старых записей)
    await userQueries.update(user.id, { is_online: 1 });
    const refreshedUser = await userQueries.getById(user.id) || user;

    console.log('✅ Вход успешен:', { id: refreshedUser.id, email: refreshedUser.email, role: refreshedUser.role });

    res.json({
      success: true,
      user: {
        id: refreshedUser.id,
        name: `${refreshedUser.first_name} ${refreshedUser.last_name}`.trim() || refreshedUser.email || 'Пользователь',
        email: refreshedUser.email,
        role: refreshedUser.role,
        phone: refreshedUser.phone_number,
        is_verified: refreshedUser.is_verified,
        is_blocked: refreshedUser.is_blocked === 1,
        ...(refreshedUser.hasOwnProperty('user_id_number') && refreshedUser.user_id_number
          ? { user_id_number: refreshedUser.user_id_number }
          : {}),
      },
    });
  } catch (error) {
    console.error('❌ Ошибка при входе:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/email/send-code - Отправка кода верификации на email
 */
app.post('/api/auth/email/send-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать email' 
      });
    }
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать код верификации' 
      });
    }
    
    // Получаем конфигурацию EmailJS из переменных окружения
    // Проверяем все возможные варианты имен переменных
    const emailJsConfig = {
      serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID || process.env.EMAILJS_SERVICE_ID || '',
      templateId: process.env.REACT_APP_EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID || '',
      publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY || process.env.EMAILJS_PUBLIC_KEY || ''
    };
    
    // Логируем для диагностики
    console.log('📧 [send-code] Проверка EmailJS конфигурации:');
    console.log('   REACT_APP_EMAILJS_SERVICE_ID:', process.env.REACT_APP_EMAILJS_SERVICE_ID ? '✅' : '❌');
    console.log('   VITE_EMAILJS_SERVICE_ID:', process.env.VITE_EMAILJS_SERVICE_ID ? '✅' : '❌');
    console.log('   Итоговый serviceId:', emailJsConfig.serviceId ? emailJsConfig.serviceId.substring(0, 15) + '...' : '❌ не установлен');
    console.log('   Итоговый templateId:', emailJsConfig.templateId || '❌ не установлен');
    console.log('   Итоговый publicKey:', emailJsConfig.publicKey ? emailJsConfig.publicKey.substring(0, 15) + '...' : '❌ не установлен');
    
    // Отправляем email через EmailJS API
    if (emailJsConfig.serviceId && emailJsConfig.templateId && emailJsConfig.publicKey) {
      try {
        const emailData = {
          service_id: emailJsConfig.serviceId,
          template_id: emailJsConfig.templateId,
          user_id: emailJsConfig.publicKey,
          template_params: {
            to_email: email,
            email: email,
            verification_code: code,
            code: code,
            subject: 'Код верификации - Sellyourbrick'
          }
        };
        
        console.log('📧 Отправка кода верификации через EmailJS:', {
          email: email,
          serviceId: emailJsConfig.serviceId.substring(0, 15) + '...',
          templateId: emailJsConfig.templateId
        });
        
        const emailResponse = await axios.post('https://api.emailjs.com/api/v1.0/email/send', emailData, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (emailResponse.status === 200) {
          console.log(`✅ Email с кодом верификации отправлен на ${email}`);
          return res.json({ 
            success: true, 
            message: 'Код отправлен на email' 
          });
        } else {
          console.warn(`⚠️ EmailJS вернул статус ${emailResponse.status}`);
          return res.status(500).json({ 
            success: false, 
            error: `Ошибка отправки email: статус ${emailResponse.status}` 
          });
        }
      } catch (emailError) {
        console.error('❌ Ошибка отправки email через EmailJS:', emailError.message);
        // Если EmailJS не работает, все равно возвращаем успех (код может быть отправлен на фронтенде)
        return res.json({ 
          success: true, 
          message: 'Код отправлен на email',
          warning: 'EmailJS вернул ошибку, но код может быть отправлен на фронтенде'
        });
      }
    } else {
      console.warn('⚠️ EmailJS не настроен на сервере. Переменные окружения:');
      console.warn('   REACT_APP_EMAILJS_SERVICE_ID:', emailJsConfig.serviceId ? '✅' : '❌');
      console.warn('   REACT_APP_EMAILJS_TEMPLATE_ID:', emailJsConfig.templateId ? '✅' : '❌');
      console.warn('   REACT_APP_EMAILJS_PUBLIC_KEY:', emailJsConfig.publicKey ? '✅' : '❌');
      // Если EmailJS не настроен, все равно возвращаем успех (код может быть отправлен на фронтенде)
      return res.json({ 
        success: true, 
        message: 'Код отправлен на email',
        warning: 'EmailJS не настроен на сервере, код может быть отправлен на фронтенде'
      });
    }
  } catch (error) {
    console.error('❌ Ошибка в /api/auth/email/send-code:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users/:id/verify-email - Проверка кода подтверждения email при обновлении профиля
 */
app.post('/api/users/:id/verify-email', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать email и код подтверждения' 
      });
    }
    
    // Получаем пользователя
    const user = await userQueries.getById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Пользователь не найден' 
      });
    }
    
    // Проверяем, что код верный (в реальном приложении здесь должна быть проверка через БД)
    // Пока используем простую проверку через фронтенд
    
    // Проверяем, не занят ли email другим пользователем
    const existingUser = await userQueries.getByEmail(email.toLowerCase());
    if (existingUser && existingUser.id !== parseInt(id)) {
      return res.status(409).json({ 
        success: false, 
        error: 'Пользователь с таким email уже существует' 
      });
    }
    
    // Обновляем email. Статус is_verified (верификация документов) не трогаем.
    const result = await userQueries.update(id, { 
      email: email.toLowerCase()
    });
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Пользователь не найден' 
      });
    }
    
    const updatedUser = await userQueries.getById(id);
    const userWithoutPassword = removePasswordFromUser(updatedUser);
    
    res.json({ 
      success: true, 
      message: 'Email успешно подтвержден',
      data: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/google - Авторизация через Google
 * mode: 'login' | 'register' — при login не создаём нового; при register не разрешаем повторную регистрацию
 */
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential, access_token, userInfo, mode = 'register' } = req.body;
    
    let googleEmail = '';
    let googleName = '';
    let googlePicture = '';
    
    // Если передан credential (JWT токен), декодируем его
    if (credential) {
      try {
        const base64Payload = credential.split('.')[1];
        const payload = JSON.parse(atob(base64Payload));
        googleEmail = payload.email || '';
        googleName = payload.name || '';
        googlePicture = payload.picture || '';
      } catch (e) {
        console.error('Ошибка декодирования JWT:', e);
      }
    }
    
    // Если передан access_token и userInfo
    if (access_token && userInfo) {
      googleEmail = userInfo.email || '';
      googleName = userInfo.name || '';
      googlePicture = userInfo.picture || '';
    }
    
    if (!googleEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Не удалось получить данные от Google' 
      });
    }
    
    const emailLower = googleEmail.toLowerCase();
    
    // Проверяем, существует ли пользователь
    let user = await userQueries.getByEmail(emailLower);
    
    if (user) {
      // Режим регистрации: пользователь уже есть — нельзя регистрироваться повторно
      if (mode === 'register') {
        return res.status(409).json({ 
          success: false, 
          error: 'Вы уже зарегистрированы с этим аккаунтом Google. Войдите в аккаунт.',
          code: 'ALREADY_REGISTERED'
        });
      }
      
      // Проверяем, заблокирован ли пользователь
      if (user.is_blocked === 1) {
        return res.status(403).json({ 
          success: false, 
          error: 'Пользователь заблокирован',
          is_blocked: true
        });
      }
      
      // Пользователь существует - обновляем и авторизуем
      await userQueries.update(user.id, { 
        is_online: 1,
        user_photo: googlePicture || user.user_photo
      });
      const updatedUser = await userQueries.getById(user.id);
      
      res.json({ 
        success: true, 
        user: {
          id: updatedUser.id,
          name: `${updatedUser.first_name} ${updatedUser.last_name}`.trim() || googleName,
          email: updatedUser.email,
          picture: googlePicture,
          role: updatedUser.role,
          is_blocked: updatedUser.is_blocked === 1
        }
      });
    } else {
      // Режим входа: пользователя нет — нужно сначала зарегистрироваться
      if (mode === 'login') {
        return res.status(404).json({ 
          success: false, 
          error: 'Аккаунт с этим Google не найден. Сначала зарегистрируйтесь через Google.',
          code: 'NEED_REGISTER'
        });
      }
      
      // Пользователь не существует - создаем нового (режим register)
      const nameParts = (googleName || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const newUser = {
        first_name: firstName,
        last_name: lastName,
        email: emailLower,
        phone_number: null,
        user_photo: googlePicture,
        role: 'buyer',
        // Статус верификации документов всегда начинается с 0.
        // Одобрение документов админом устанавливает is_verified = 1.
        is_verified: 0,
        is_online: 1
      };
      
      const result = await userQueries.create(newUser);
      const createdUser = await userQueries.getById(result.lastInsertRowid);
      
      res.status(201).json({ 
        success: true, 
        user: {
          id: createdUser.id,
          name: googleName,
          email: createdUser.email,
          picture: googlePicture,
          role: createdUser.role,
          ...(createdUser.hasOwnProperty('user_id_number') && { user_id_number: createdUser.user_id_number || null })
        }
      });
    }
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ 
        success: false, 
        error: 'Пользователь с таким email уже существует' 
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Проверка подписи данных от Telegram Login Widget
 * @see https://core.telegram.org/widgets/login#checking-authorization
 * secret_key = SHA256(bot_token), hash = HMAC_SHA256(data_check_string, secret_key)
 * В data_check_string только поля, реально пришедшие в payload (без hash).
 */
function verifyTelegramAuthPayload(payload, botToken) {
  const hash = payload.hash;
  if (!hash || !botToken) return false;
  const trimmedToken = String(botToken).trim();
  if (!trimmedToken) return false;
  const rest = { ...payload };
  delete rest.hash;
  delete rest.mode;
  delete rest.role;
  const dataCheckString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join('\n');
  const secretKey = crypto.createHash('sha256').update(trimmedToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return calculatedHash.toLowerCase() === String(hash).toLowerCase();
}

/**
 * POST /api/auth/telegram - Вход/регистрация через Telegram Login Widget
 * Тело: id, first_name, last_name, username, photo_url, auth_date, hash (от Telegram) + mode, role (от фронта)
 */
app.post('/api/auth/telegram', async (req, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(503).json({
        success: false,
        error: 'Telegram-авторизация не настроена (нет TELEGRAM_BOT_TOKEN)',
      });
    }

    const { id, first_name, last_name, username, photo_url, auth_date, hash: telegramHash, mode = 'register', role, referrer_id: referrerId } = req.body;

    if (!id || !telegramHash) {
      return res.status(400).json({
        success: false,
        error: 'Не получены данные от Telegram (id и hash обязательны)',
      });
    }

    // В подпись входят только поля, которые пришли от Telegram (те же ключи и значения, что в редиректе).
    const telegramKeys = ['id', 'auth_date', 'first_name', 'last_name', 'username', 'photo_url'];
    const payload = { hash: telegramHash };
    for (const k of telegramKeys) {
      if (req.body.hasOwnProperty(k)) {
        const v = req.body[k];
        payload[k] = v === undefined || v === null ? '' : String(v);
      }
    }

    if (!verifyTelegramAuthPayload(payload, botToken)) {
      return res.status(400).json({
        success: false,
        error: 'Неверная подпись данных Telegram',
      });
    }

    const authDate = parseInt(String(auth_date || '0'), 10);
    const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
    if (!authDate || authDate < oneDayAgo) {
      return res.status(400).json({
        success: false,
        error: 'Данные авторизации устарели. Войдите через Telegram снова.',
      });
    }

    const telegramId = String(id);
    let user = await userQueries.getByTelegramId(telegramId);

    if (user) {
      // Режим регистрации: пользователь уже есть — нельзя регистрироваться повторно
      if (mode === 'register') {
        return res.status(409).json({
          success: false,
          error: 'Вы уже зарегистрированы с этим аккаунтом Telegram. Войдите в аккаунт.',
          code: 'ALREADY_REGISTERED',
        });
      }
      if (user.is_blocked === 1) {
        return res.status(403).json({
          success: false,
          error: 'Пользователь заблокирован',
          is_blocked: true,
        });
      }
      await userQueries.update(user.id, {
        is_online: 1,
        telegram_username: username || null,
        telegram_photo_url: photo_url || null,
      });
      const updatedUser = await userQueries.getById(user.id);
      return res.json({
        success: true,
        user: {
          id: updatedUser.id,
          name: `${updatedUser.first_name} ${updatedUser.last_name}`.trim() || [first_name, last_name].filter(Boolean).join(' ') || username || 'Пользователь',
          email: updatedUser.email,
          picture: updatedUser.telegram_photo_url || updatedUser.user_photo || photo_url,
          role: updatedUser.role,
          is_blocked: updatedUser.is_blocked === 1,
          telegram_id: updatedUser.telegram_id,
          telegram_username: updatedUser.telegram_username,
          ...(updatedUser.hasOwnProperty('user_id_number') && updatedUser.user_id_number
            ? { user_id_number: updatedUser.user_id_number }
            : {}),
        },
      });
    }

    // Режим входа: пользователя нет — нужно сначала зарегистрироваться
    if (mode === 'login') {
      return res.status(404).json({
        success: false,
        error: 'Аккаунт с этим Telegram не найден. Сначала зарегистрируйтесь через Telegram.',
        code: 'NEED_REGISTER',
      });
    }

    // Пользователя нет, режим регистрации: создаём аккаунт
    const fullName = [first_name, last_name].filter(Boolean).join(' ').trim() || username || `Telegram ${telegramId}`;
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const newUser = {
      first_name: firstName,
      last_name: lastName,
      email: null,
      phone_number: null,
      user_photo: photo_url || null,
      role: role || 'buyer',
      is_verified: 0,
      is_online: 1,
    };
    const result = await userQueries.create(newUser);
    const createdUser = await userQueries.getById(result.lastInsertRowid);
    await userQueries.update(createdUser.id, {
      telegram_id: telegramId,
      telegram_username: username || null,
      telegram_photo_url: photo_url || null,
    });
    const finalUser = await userQueries.getById(createdUser.id);

    if (referrerId) {
      try {
        await grantReferralBonus(referrerId, finalUser.id);
      } catch (refErr) {
        console.warn('⚠️ Реферальный бонус (Telegram) не выдан:', refErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      user: {
        id: finalUser.id,
        name: fullName,
        email: finalUser.email,
        picture: finalUser.telegram_photo_url || finalUser.user_photo,
        role: finalUser.role,
        telegram_id: finalUser.telegram_id,
        telegram_username: finalUser.telegram_username,
        ...(finalUser.hasOwnProperty('user_id_number') && finalUser.user_id_number ? { user_id_number: finalUser.user_id_number } : {}),
      },
    });
  } catch (error) {
    console.error('Ошибка auth/telegram:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/auth/whatsapp/user-info - Получение информации о пользователе WhatsApp по номеру
 */
app.get('/api/auth/whatsapp/user-info', async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Необходимо указать номер телефона'
      });
    }

    if (!waClientReady) {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp клиент еще не готов'
      });
    }

    const digits = String(phone).replace(/\D/g, '');
    if (!digits) {
      return res.status(400).json({
        success: false,
        error: 'Неверный формат номера телефона'
      });
    }

    const chatId = `${digits}@c.us`;

    const contact = await waClient.getContactById(chatId);

    let profilePicUrl = null;
    try {
      profilePicUrl = await contact.getProfilePicUrl();
    } catch {
      profilePicUrl = null;
    }

    const name = contact.pushname ||
      contact.name ||
      contact.shortName ||
      contact.number ||
      null;

    return res.json({
      success: true,
      data: {
        name,
        picture: profilePicUrl
      }
    });
  } catch (error) {
    console.error('Ошибка получения информации о пользователе WhatsApp:', error);
    return res.status(500).json({
      success: false,
      error: 'Не удалось получить информацию о пользователе WhatsApp'
    });
  }
});

// ========== РОУТЫ ДЛЯ WHATSAPP ПОЛЬЗОВАТЕЛЕЙ ==========

/**
 * POST /api/whatsapp/users - Создать или обновить WhatsApp пользователя
 */
app.post('/api/whatsapp/users', async (req, res) => {
  try {
    const { phone_number, phone_number_clean, first_name, last_name, country, language } = req.body;

    if (!phone_number) {
      return res.status(400).json({
        success: false,
        error: 'Номер телефона обязателен'
      });
    }

    // Логируем сохранение языка для отладки
    console.log(`💾 Сохранение WhatsApp пользователя: ${phone_number} | Язык: ${language || 'ru'}`);

    const result = await whatsappUserQueries.createOrUpdate({
      phone_number,
      phone_number_clean,
      first_name,
      last_name,
      country,
      language: language || 'ru'
    });
    
    console.log(`✅ WhatsApp пользователь сохранен в БД: ${phone_number} | Язык: ${language || 'ru'}`);

    res.json({
      success: true,
      data: {
        id: result.lastInsertRowid || null,
        message: 'Пользователь сохранен'
      }
    });
  } catch (error) {
    console.error('Ошибка сохранения WhatsApp пользователя:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/users/lead-type — тип лида из WhatsApp-бота (hot/warm/cold).
 * Обновляет whatsapp_users и карточки «Умный помощник» с тем же номером телефона.
 */
app.post('/api/whatsapp/users/lead-type', async (req, res) => {
  try {
    const { phone_number, lead_type } = req.body || {};
    const lt = lead_type != null ? String(lead_type).toLowerCase().trim() : '';
    const allowed = new Set(['hot', 'warm', 'cold']);
    if (!phone_number || !allowed.has(lt)) {
      return res.status(400).json({
        success: false,
        error: 'Нужны phone_number и lead_type: hot | warm | cold'
      });
    }
    const wa = await whatsappUserQueries.updateLeadType(phone_number, lt);
    const digits = String(phone_number).replace(/\D/g, '');
    const assistantUpdated = await assistantLeadQueries.updateLeadTypeByPhoneDigits(digits, lt);
    return res.json({
      success: true,
      whatsappUpdated: wa.changes || 0,
      whatsappInserted: !!wa.inserted,
      assistantLeadsUpdated: assistantUpdated
    });
  } catch (error) {
    console.error('Ошибка POST /api/whatsapp/users/lead-type:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// URL бота для рассылки
const BOT_URL = process.env.BOT_URL || 'http://localhost:3001';

const PAIRING_RESET_SECRET = String(process.env.WA_PAIRING_RESET_SECRET || '').trim();

function canShowWhatsAppPairingReset(req) {
  if (PAIRING_RESET_SECRET) return true;
  const ip = String(req.socket?.remoteAddress || '');
  const local = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  return Boolean(local && process.env.NODE_ENV !== 'production');
}

function assertWhatsAppPairingReset(req) {
  if (PAIRING_RESET_SECRET) {
    const h = String(req.headers['x-wa-pairing-reset'] || '').trim();
    return h === PAIRING_RESET_SECRET;
  }
  const ip = String(req.socket?.remoteAddress || '');
  const local = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  return Boolean(local && process.env.NODE_ENV !== 'production');
}

async function restartWhatsAppPairingRequest() {
  waClientReady = false;
  currentQRCode = null;
  try {
    await waClient.logout();
  } catch (e) {
    console.warn('[WA] logout:', e?.message || e);
  }
  try {
    await waClient.initialize();
  } catch (e) {
    console.error('[WA] initialize after pairing reset:', e?.message || e);
    throw e;
  }
}

/**
 * POST /api/whatsapp/restart-pairing — сброс сессии LocalAuth и повторный запрос QR (для админки).
 * Локально: разрешено с 127.0.0.1 в NODE_ENV!=production. В production: WA_PAIRING_RESET_SECRET + заголовок X-WA-Pairing-Reset.
 */
app.post('/api/whatsapp/restart-pairing', async (req, res) => {
  try {
    if (!assertWhatsAppPairingReset(req)) {
      return res.status(403).json({
        success: false,
        error:
          'Сброс сессии отклонён. Для production задайте WA_PAIRING_RESET_SECRET и заголовок X-WA-Pairing-Reset. Локально: только с localhost в development.',
      });
    }
    await restartWhatsAppPairingRequest();
    return res.json({
      success: true,
      message:
        'Сессия сброшена, запущена повторная инициализация. Через несколько секунд обновите страницу или нажмите «Проверить статус».',
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

/**
 * GET /api/whatsapp/status - Проверка статуса WhatsApp клиента
 */
app.get('/api/whatsapp/status', async (req, res) => {
  try {
    const diag = {
      hasQr: Boolean(currentQRCode),
      pairingResetRequiresSecret: Boolean(PAIRING_RESET_SECRET),
      canRestartPairing: canShowWhatsAppPairingReset(req),
      webVersionCache: waDisableRemoteWebVersion ? 'off' : 'remote',
      waDiag: buildWaDiag(),
      /** Строка для связки «устройство вручную», пока не отсканировали QR (тот же источник, что и PNG). */
      pairingCodeRaw: currentQRCode || null,
    };
    // Сначала проверяем локальное состояние клиента
    let localReady = waClientReady;
    let clientInfo = null;
    
    try {
      if (waClient && waClient.info) {
        clientInfo = {
          wid: waClient.info.wid ? waClient.info.wid.user : null,
          platform: waClient.info.platform || null,
          pushname: waClient.info.pushname || null
        };
        
        // Если клиент имеет информацию, но waClientReady = false, обновляем статус
        if (clientInfo.wid && !localReady) {
          console.log('⚠️ Обнаружено несоответствие: клиент авторизован, но waClientReady = false. Исправляем...');
          waClientReady = true;
          localReady = true;
        }
      }
    } catch (infoError) {
      console.warn('⚠️ Ошибка при получении информации о клиенте:', infoError.message);
    }
    
    // Если локальный клиент готов, возвращаем его статус
    if (localReady) {
      return res.json({
        ...diag,
        success: true,
        ready: true,
        state: 'READY',
        message: 'WhatsApp клиент готов к работе',
        info: clientInfo
      });
    }
    
    // Опционально: не подмешивать статус «бота» с BOT_URL (частая путаница с другим процессом на :3001)
    const skipBotStatus = process.env.WHATSAPP_SKIP_BOT_STATUS === '1';

    // Если локальный клиент не готов, проверяем через бот (если включено и доступен)
    if (!skipBotStatus) {
      try {
        const botResponse = await axios.get(`${BOT_URL}/api/status`, {
          timeout: 5000
        }).catch(() => null);

        const botData = botResponse && botResponse.data;
        const botReadyOk =
          botData &&
          typeof botData === 'object' &&
          typeof botData.ready === 'boolean';

        if (botReadyOk) {
          return res.json({
            ...diag,
            success: true,
            ready: botData.ready,
            state: botData.ready ? 'READY' : 'NOT_READY',
            message: botData.message || (botData.ready ? 'WhatsApp клиент готов к работе' : 'WhatsApp клиент не готов'),
            source: 'bot'
          });
        }
      } catch (botError) {
        // Игнорируем ошибки бота
      }
    }

    // Если ни локальный клиент, ни бот не готовы
    return res.json({
      ...diag,
      success: false,
      ready: false,
      state: 'NOT_READY',
      message: 'WhatsApp клиент не готов. Убедитесь, что WhatsApp Web авторизован на сервере.',
      info: clientInfo
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      ready: false,
      state: 'ERROR',
      error: error.message,
      hasQr: Boolean(currentQRCode),
      pairingResetRequiresSecret: Boolean(PAIRING_RESET_SECRET),
      canRestartPairing: canShowWhatsAppPairingReset(req),
      webVersionCache: waDisableRemoteWebVersion ? 'off' : 'remote',
      waDiag: buildWaDiag(),
    });
  }
});

/**
 * HEAD /api/whatsapp/qr — только проверка наличия QR (без генерации PNG; для опроса из админки).
 */
app.head('/api/whatsapp/qr', (req, res) => {
  if (!currentQRCode) {
    return res.status(404).end();
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).end();
});

/**
 * GET /api/whatsapp/qr - Получить QR-код WhatsApp для отображения в админке / футере
 */
app.get('/api/whatsapp/qr', async (req, res) => {
  try {
    if (!currentQRCode) {
      return res.status(404).json({
        success: false,
        error: 'QR-код недоступен. WhatsApp клиент уже авторизован или QR-код еще не сгенерирован.'
      });
    }

    // Пытаемся использовать библиотеку qrcode для генерации изображения
    try {
      const qrImageBuffer = await QRCodePNG.toBuffer(currentQRCode, {
        type: 'png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.send(qrImageBuffer);
    } catch (importError) {
      console.error('[WA] QR PNG (qrcode package):', importError?.message || importError);
      // Если библиотека qrcode не установлена, возвращаем SVG
      // Генерируем простой SVG QR-код
      const qrDataUrl = `data:image/svg+xml;base64,${Buffer.from(`
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
          <rect width="300" height="300" fill="white"/>
          <text x="150" y="150" text-anchor="middle" font-size="14" fill="black">
            QR-код WhatsApp
          </text>
          <text x="150" y="170" text-anchor="middle" font-size="12" fill="gray">
            Установите пакет qrcode
          </text>
        </svg>
      `).toString('base64')}`;
      
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(Buffer.from(`
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
          <rect width="300" height="300" fill="white"/>
          <text x="150" y="150" text-anchor="middle" font-size="14" fill="black">
            QR-код WhatsApp
          </text>
          <text x="150" y="170" text-anchor="middle" font-size="12" fill="gray">
            Установите пакет qrcode
          </text>
        </svg>
      `));
    }
  } catch (error) {
    console.error('Ошибка генерации QR-кода:', error);
    return res.status(500).json({
      success: false,
      error: 'Не удалось сгенерировать QR-код'
    });
  }
});

/**
 * POST /api/whatsapp/broadcast - Рассылка сообщений выбранным пользователям
 */
app.post('/api/whatsapp/broadcast', async (req, res) => {
  try {
    const { message, phoneNumbers } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Сообщение не может быть пустым'
      });
    }

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Необходимо выбрать хотя бы одного получателя'
      });
    }

    // Перенаправляем запрос на бот
    try {
      const botResponse = await axios.post(`${BOT_URL}/api/broadcast`, {
        message: message.trim(),
        phoneNumbers: phoneNumbers
      }, {
        timeout: 300000, // 5 минут таймаут для больших рассылок
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const botData = botResponse.data;

      // Обновляем статистику отправки в базе данных (НЕ перезаписываем язык!)
      try {
        for (const phoneNumber of phoneNumbers) {
          let chatId = phoneNumber;
          if (!chatId.includes('@')) {
            const digits = String(phoneNumber).replace(/\D/g, '');
            if (digits) {
              chatId = `${digits}@c.us`;
              // Получаем существующего пользователя, чтобы сохранить его язык
              const existingUser = await whatsappUserQueries.getByPhone(chatId);
              await whatsappUserQueries.createOrUpdate({
                phone_number: chatId,
                phone_number_clean: digits,
                country: existingUser?.country || null,
                language: existingUser?.language || 'ru' // Используем существующий язык или 'ru' по умолчанию
              });
            }
          } else {
            // Если chatId уже в правильном формате, просто обновляем статистику без изменения языка
            const existingUser = await whatsappUserQueries.getByPhone(chatId);
            if (existingUser) {
              // Обновляем только last_message_at и message_count, не трогая язык
              await whatsappUserQueries.createOrUpdate({
                phone_number: chatId,
                phone_number_clean: existingUser.phone_number_clean || null,
                first_name: existingUser.first_name || null,
                last_name: existingUser.last_name || null,
                country: existingUser.country || null,
                language: existingUser.language || 'ru' // Сохраняем существующий язык
              });
            }
          }
        }
      } catch (dbError) {
        console.warn('⚠️ Ошибка обновления статистики в БД:', dbError.message);
      }

      return res.json(botData);
    } catch (fetchError) {
      console.error('Ошибка обращения к боту:', fetchError.message);
      const errorMessage = fetchError.response?.data?.error || fetchError.message || 'Бот недоступен';
      return res.status(fetchError.response?.status || 503).json({
        success: false,
        error: errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout')
          ? 'Бот недоступен. Убедитесь, что бот запущен на порту 3001.'
          : errorMessage
      });
    }
  } catch (error) {
    console.error('Ошибка рассылки сообщений:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Не удалось выполнить рассылку'
    });
  }
});

/**
 * GET /api/whatsapp/users - Получить всех WhatsApp пользователей
 */
app.get('/api/whatsapp/users', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';
    const roleFilter = req.query.role || 'all';
    const statusFilter = req.query.status || 'all';

    let users;
    
    // Если есть поисковый запрос
    if (search) {
      users = await whatsappUserQueries.search(search, limit, offset);
    } else {
      users = await whatsappUserQueries.getAll(limit, offset);
    }

    // Фильтрация по статусу (активные/неактивные)
    let filteredUsers = users;
    if (statusFilter === 'active') {
      filteredUsers = users.filter(u => u.is_active === 1);
    } else if (statusFilter === 'blocked') {
      filteredUsers = users.filter(u => u.is_active === 0);
    }

    // Форматируем данные для фронтенда
    const formattedUsers = filteredUsers.map(user => ({
      id: user.id,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      email: '', // WhatsApp пользователи не имеют email
      phone: user.phone_number_clean || user.phone_number || '',
      phoneFull: user.phone_number || '',
      role: 'buyer', // По умолчанию покупатель
      status: user.is_active === 1 ? 'active' : 'blocked',
      verified: false, // WhatsApp пользователи не верифицированы через документы
      country: user.country || '',
      language: user.language || 'ru',
      leadType: user.lead_type || 'cold',
      lastMessageAt: user.last_message_at || null,
      messageCount: user.message_count || 0,
      createdAt: user.created_at || null
    }));

    const totalCount = await whatsappUserQueries.getCount();

    res.json({
      success: true,
      data: formattedUsers,
      total: totalCount,
      limit,
      offset
    });
  } catch (error) {
    console.error('Ошибка получения WhatsApp пользователей:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========== РОУТЫ ДЛЯ УВЕДОМЛЕНИЙ ==========

/**
 * GET /api/notifications/user/:userId - Получить все уведомления пользователя
 */
app.get('/api/notifications/user/:userId', async (req, res) => {
  try {
    console.log('📥 Запрос уведомлений для пользователя:', req.params.userId);
    const notifications = await notificationQueries.getByUserId(req.params.userId);
    console.log('📋 Найдено уведомлений:', notifications ? notifications.length : 0);
    
    if (!notifications || notifications.length === 0) {
      console.log('⚠️ Уведомления не найдены для пользователя:', req.params.userId);
      return res.json({ success: true, data: [] });
    }
    
    // Парсим JSON данные для каждого уведомления
    const formattedNotifications = notifications.map(notif => {
      try {
        return {
          ...notif,
          data: notif.data ? JSON.parse(notif.data) : null,
          is_read: notif.is_read === 1,
          view_count: notif.view_count || 0
        };
      } catch (parseError) {
        console.warn('⚠️ Ошибка парсинга данных уведомления:', parseError);
        return {
          ...notif,
          data: null,
          is_read: notif.is_read === 1,
          view_count: notif.view_count || 0
        };
      }
    });
    
    console.log('✅ Отправляем уведомления:', formattedNotifications.length);
    res.json({ success: true, data: formattedNotifications });
  } catch (error) {
    console.error('❌ Ошибка при получении уведомлений:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/user/:userId/unread - Получить непрочитанные уведомления
 */
app.get('/api/notifications/user/:userId/unread', async (req, res) => {
  try {
    const notifications = await notificationQueries.getUnreadByUserId(req.params.userId);
    const formattedNotifications = notifications.map(notif => ({
      ...notif,
      data: notif.data ? JSON.parse(notif.data) : null,
      is_read: false,
      view_count: notif.view_count || 0
    }));
    res.json({ success: true, data: formattedNotifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/notifications/:id/view - Отметить уведомление как просмотренное
 * Увеличивает счетчик просмотров. Если просмотрено 2 раза, удаляет уведомление
 */
app.put('/api/notifications/:id/view', async (req, res) => {
  try {
    await notificationQueries.markAsViewed(req.params.id);
    res.json({ success: true, message: 'Уведомление отмечено как просмотренное' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications - Создать новое уведомление
 */
app.post('/api/notifications', async (req, res) => {
  try {
    const { user_id, type, title, message, data } = req.body;
    
    if (!user_id || !type || !title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать user_id, type и title' 
      });
    }
    
    const result = await notificationQueries.create({
      user_id: user_id,
      type: type,
      title: title,
      message: message || null,
      data: data ? JSON.stringify(data) : null,
      is_read: 0,
      view_count: 0
    });
    
    res.json({ 
      success: true, 
      message: 'Уведомление создано',
      id: result.lastInsertRowid 
    });
  } catch (error) {
    console.error('Ошибка при создании уведомления:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/notifications/:id - Удалить уведомление
 */
app.delete('/api/notifications/:id', async (req, res) => {
  try {
    await notificationQueries.delete(req.params.id);
    res.json({ success: true, message: 'Уведомление удалено' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/check-properties-no-bids - Ручной запуск проверки объектов без ставок за 45 дней
 * Используется для тестирования и ручного запуска проверки
 */
app.post('/api/admin/check-properties-no-bids', async (req, res) => {
  try {
    console.log('📥 Ручной запрос на проверку объектов без ставок');
    const result = await checkPropertiesWithoutBids();
    res.json({ 
      success: true, 
      message: 'Проверка завершена',
      data: result
    });
  } catch (error) {
    console.error('❌ Ошибка при ручной проверке:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ========== РОУТЫ ДЛЯ АДМИН-ПАНЕЛИ ==========

/**
 * GET /api/admin/users/count - Получить количество зарегистрированных пользователей
 */
app.get('/api/admin/users/count', async (req, res) => {
  try {
    const count = await userQueries.getCount();
    res.json({ success: true, count });
  } catch (error) {
    console.error('Ошибка при получении количества пользователей:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/users/country-stats - Получить статистику по национальностям (странам)
 */
app.get('/api/admin/users/country-stats', async (req, res) => {
  try {
    const stats = await userQueries.getCountryStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Ошибка при получении статистики по странам:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/users/role-stats - Получить статистику по ролям (продавцы/покупатели)
 */
app.get('/api/admin/users/role-stats', async (req, res) => {
  try {
    const stats = await userQueries.getRoleStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Ошибка при получении статистики по ролям:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/users/registrations-by-day - Регистрации по дням за неделю
 * Query: weekStart=YYYY-MM-DD (понедельник выбранной недели)
 */
app.get('/api/admin/users/registrations-by-day', async (req, res) => {
  try {
    let { weekStart } = req.query;
    if (!weekStart) {
      const now = new Date();
      const day = now.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      weekStart = monday.toISOString().slice(0, 10);
    }
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const weekEnd = end.toISOString().slice(0, 10);
    const data = await userQueries.getRegistrationsByDay(weekStart, weekEnd);
    res.json({ success: true, data, weekStart, weekEnd });
  } catch (error) {
    console.error('Ошибка при получении регистраций по дням:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/properties/category-stats - Статистика по категориям недвижимости (по типу и по разделам)
 */
app.get('/api/admin/properties/category-stats', async (req, res) => {
  try {
    const byType = await propertyQueries.getCategoryStatsByType();
    const bySection = await propertyQueries.getCategoryStatsBySection();
    res.json({ success: true, byType, bySection });
  } catch (error) {
    console.error('Ошибка при получении статистики категорий:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/stats/counts - Количество выставленных объектов и аукционов (для карточек админки)
 */
app.get('/api/admin/stats/counts', async (req, res) => {
  try {
    const propertiesCount = await propertyQueries.getApprovedCount();
    const auctionsCount = await propertyQueries.getAuctionsCount();
    res.json({ success: true, propertiesCount, auctionsCount });
  } catch (error) {
    console.error('Ошибка при получении счётчиков:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/storage/mirror-push — снимок PostgreSQL → внешнее хранилище (см. проект «хранилище»).
 * Переменные окружения на сервере основного сайта: STORAGE_MIRROR_URL, STORAGE_MIRROR_SECRET (тот же секрет на хранилище).
 */
app.post('/api/admin/storage/mirror-push', async (req, res) => {
  const mirrorUrl = (process.env.STORAGE_MIRROR_URL || '').trim().replace(/\/$/, '');
  const secret = (process.env.STORAGE_MIRROR_SECRET || '').trim();
  if (!mirrorUrl || !secret) {
    return res.status(503).json({
      success: false,
      error:
        'Не заданы STORAGE_MIRROR_URL и STORAGE_MIRROR_SECRET на сервере (Railway Variables).',
    });
  }
  try {
    const snapshot = buildDatabaseSnapshot();
    const importUrl = `${mirrorUrl}/api/import`;
    const response = await axios.post(importUrl, snapshot, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      timeout: 180000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    res.json({
      success: true,
      tables: snapshot.blocks.length,
      rowsTotal: snapshot.blocks.reduce((a, b) => a + (b.count || 0), 0),
      remote: response.data,
    });
  } catch (error) {
    console.error('[storage mirror-push]', error.message);
    const detail = error.response?.data;
    res.status(500).json({
      success: false,
      error: detail?.error || error.message || 'Ошибка отправки в хранилище',
    });
  }
});

// ========== РОУТЫ ДЛЯ УПРАВЛЕНИЯ АДМИНИСТРАТОРАМИ ==========

/**
 * POST /api/admin/auth/login - Вход администратора
 */
app.post('/api/admin/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать username/email и пароль' 
      });
    }

    const identifier = username.toLowerCase().trim();

    // Проверяем супер-админа (admin, admin)
    if (identifier === 'admin' && password === 'admin') {
      // Создаем или получаем супер-админа
      let superAdmin = await administratorQueries.getByUsername('admin');
      if (!superAdmin) {
        const hashedPassword = crypto.createHash('sha256').update('admin').digest('hex');
        await administratorQueries.create({
          username: 'admin',
          password: hashedPassword,
          is_super_admin: 1,
          can_access_statistics: 1,
          can_access_users: 1,
          can_access_moderation: 1,
          can_access_chat: 1,
          can_access_objects: 1,
          can_access_access_management: 1
        });
        superAdmin = await administratorQueries.getByUsername('admin');
      }

      const { password: _, ...adminWithoutPassword } = superAdmin;
      return res.json({
        success: true,
        admin: adminWithoutPassword
      });
    }

    // Проверяем администратора сначала по username, затем по email
    let admin = await administratorQueries.getByUsername(identifier);
    if (!admin) {
      // Если не найден по username, пробуем найти по email
      admin = await administratorQueries.getByEmail(identifier);
    }
    
    if (!admin) {
      console.log('❌ Администратор не найден:', { identifier, searchedBy: 'username and email' });
      return res.status(401).json({ 
        success: false, 
        error: 'Неверный username/email или пароль' 
      });
    }
    
    console.log('✅ Администратор найден:', { id: admin.id, username: admin.username, email: admin.email });

    // Проверяем пароль
    const hashedPassword = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    if (admin.password !== hashedPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Неверный username/email или пароль' 
      });
    }

    const { password: __, ...adminWithoutPassword } = admin;
    res.json({
      success: true,
      admin: adminWithoutPassword
    });
  } catch (error) {
    console.error('Ошибка при входе администратора:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/administrators - Получить всех администраторов
 */
app.get('/api/admin/administrators', async (req, res) => {
  try {
    const admins = await administratorQueries.getAll();
    // Убираем пароли из ответа
    const adminsWithoutPasswords = admins.map(admin => {
      const { password, ...adminWithoutPassword } = admin;
      return adminWithoutPassword;
    });
    res.json({ success: true, data: adminsWithoutPasswords });
  } catch (error) {
    console.error('Ошибка при получении администраторов:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/administrators/:id - Получить администратора по ID
 */
app.get('/api/admin/administrators/:id', async (req, res) => {
  try {
    const admin = await administratorQueries.getById(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Администратор не найден' });
    }
    const { password, ...adminWithoutPassword } = admin;
    res.json({ success: true, data: adminWithoutPassword });
  } catch (error) {
    console.error('Ошибка при получении администратора:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/administrators - Создать нового администратора
 */
app.post('/api/admin/administrators', async (req, res) => {
  try {
    const { username, password, email, full_name, ...permissions } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать username и пароль' 
      });
    }

    // Проверяем, не существует ли уже администратор с таким username
    const existingAdmin = await administratorQueries.getByUsername(username);
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false, 
        error: 'Администратор с таким username уже существует' 
      });
    }

    // Валидация пароля
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: passwordValidation.message,
        passwordValidation: {
          missing: passwordValidation.missing,
          present: passwordValidation.present
        }
      });
    }

    // Хешируем пароль
    const hashedPassword = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    // Нормализуем email (lowercase и trim) если он указан
    const normalizedEmail = email ? email.toLowerCase().trim() : null;

    const result = await administratorQueries.create({
      username,
      password: hashedPassword,
      email: normalizedEmail,
      full_name: full_name || null,
      is_super_admin: 0,
      can_access_statistics: permissions.can_access_statistics ? 1 : 0,
      can_access_users: permissions.can_access_users ? 1 : 0,
      can_access_moderation: permissions.can_access_moderation ? 1 : 0,
      can_access_chat: permissions.can_access_chat ? 1 : 0,
      can_access_objects: permissions.can_access_objects ? 1 : 0,
      can_access_access_management: 0 // Только для супер-админа
    });

    const newAdmin = await administratorQueries.getById(result.lastInsertRowid);
    const { password: _, ...adminWithoutPassword } = newAdmin;
    
    res.json({ 
      success: true, 
      data: adminWithoutPassword,
      message: 'Администратор успешно создан' 
    });
  } catch (error) {
    console.error('Ошибка при создании администратора:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/admin/administrators/:id - Обновить администратора
 */
app.put('/api/admin/administrators/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, ...permissions } = req.body;

    const admin = await administratorQueries.getById(id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Администратор не найден' });
    }

    // Не позволяем изменять права супер-админа
    if (admin.is_super_admin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Нельзя изменять права супер-администратора' 
      });
    }

    // Нормализуем email (lowercase и trim) если он указан
    const normalizedEmail = email ? email.toLowerCase().trim() : null;

    await administratorQueries.update(id, {
      email: normalizedEmail,
      full_name: full_name || null,
      can_access_statistics: permissions.can_access_statistics ? 1 : 0,
      can_access_users: permissions.can_access_users ? 1 : 0,
      can_access_moderation: permissions.can_access_moderation ? 1 : 0,
      can_access_chat: permissions.can_access_chat ? 1 : 0,
      can_access_objects: permissions.can_access_objects ? 1 : 0,
      can_access_access_management: 0 // Только для супер-админа
    });

    const updatedAdmin = await administratorQueries.getById(id);
    const { password: _, ...adminWithoutPassword } = updatedAdmin;
    
    res.json({ 
      success: true, 
      data: adminWithoutPassword,
      message: 'Администратор успешно обновлен' 
    });
  } catch (error) {
    console.error('Ошибка при обновлении администратора:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/admin/administrators/:id - Удалить администратора
 */
app.delete('/api/admin/administrators/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await administratorQueries.getById(id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Администратор не найден' });
    }

    // Не позволяем удалять супер-админа
    if (admin.is_super_admin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Нельзя удалить супер-администратора' 
      });
    }

    await administratorQueries.delete(id);
    res.json({ 
      success: true, 
      message: 'Администратор успешно удален' 
    });
  } catch (error) {
    console.error('Ошибка при удалении администратора:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ============================================
 * API: CRM (воронка, касания, письма через EmailJS)
 * Реализация sendCrmEmailViaEmailJS: ./emailJsCrmSend.js
 * ============================================
 */

function getFrontendPublicBase() {
  return String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function buildPropertyPublicLink(propertyId) {
  return `${getFrontendPublicBase()}/property/${Number(propertyId)}`;
}

async function loadPropertyRowForReminder(propertyId, propertyTable) {
  const tbl = await auctionReminderQueries.normalizePropertyTable(propertyTable);
  if (tbl === 'properties_houses') return await houseQueries.getById(propertyId);
  if (tbl === 'properties_apartments') return await apartmentQueries.getById(propertyId);
  if (tbl === 'properties') return await propertyQueries.getById(propertyId);
  return await apartmentQueries.getById(propertyId);
}

/** Согласовано с фронтом (shouldShowCircularAuctionTimer): круговой этап — только после окончания преаукциона (auction_end_date). */
function propertyRowHasCircularTestTimer(row) {
  if (!row) return false;
  const v = row.test_timer_end_date;
  if (v == null || v === '') return false;
  if (typeof v === 'string' && v.trim() === '') return false;
  const preEndMs = parsePropertyDateMs(row.auction_end_date);
  if (preEndMs != null && preEndMs > Date.now()) return false;
  return true;
}

function parsePropertyDateMs(v) {
  if (v == null || v === '') return null;
  const d = new Date(v);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

const auctionReminderNoEmailLogged = new Set();

async function processOneAuctionReminderRow(row) {
  const user = await userQueries.getById(row.user_id);
  if (!user) {
    await auctionReminderQueries.markReminderSent(row.id);
    return;
  }
  const link = buildPropertyPublicLink(row.property_id);
  const title = row.property_title || 'Объект';
  const subject = `Напоминание: аукцион — ${title}`;
  const body = `Здравствуйте!\n\nНапоминание об аукционе по объекту: ${title}.\n\nСсылка на объект:\n${link}\n\nС уважением, Sellyourbrick`;

  const wantEmail = Number(row.notify_email) === 1;
  const wantWa = Number(row.notify_whatsapp) === 1;

  let emailOk = !wantEmail;
  let waOk = !wantWa;

  if (wantEmail) {
    const em = user.email && String(user.email).trim();
    if (!em) {
      emailOk = false;
      if (!auctionReminderNoEmailLogged.has(`r-${row.id}`)) {
        auctionReminderNoEmailLogged.add(`r-${row.id}`);
        console.warn(
          `[auction-reminder] Пользователь user_id=${row.user_id} без email в БД — письмо по расписанию (reminder id=${row.id}) не отправлено. Укажите email в профиле.`
        );
      }
    } else {
      try {
        await sendCrmEmailViaEmailJS(em, subject, body);
        emailOk = true;
      } catch (e) {
        console.error('[auction-reminder] EmailJS:', e.message);
      }
    }
  }

  if (wantWa) {
    const phone = user.phone_number && String(user.phone_number).trim();
    if (!phone) {
      waOk = false;
      if (!auctionReminderNoEmailLogged.has(`wa-r-${row.id}`)) {
        auctionReminderNoEmailLogged.add(`wa-r-${row.id}`);
        console.warn(
          `[auction-reminder] Пользователь user_id=${row.user_id} без телефона в БД — WhatsApp по расписанию (reminder id=${row.id}) не отправлен.`
        );
      }
    } else {
      const wa = await trySendWhatsAppDigits(user.phone_number, `${subject}\n\n${body}`);
      waOk = wa.ok;
      if (!wa.ok) console.warn('[auction-reminder] WhatsApp:', wa.error);
    }
  }

  const em = user.email && String(user.email).trim();
  const phone = user.phone_number && String(user.phone_number).trim();
  let markSent = false;
  if (wantEmail && wantWa) {
    if (em && emailOk && phone && waOk) markSent = true;
    else if (em && emailOk && !phone) markSent = true;
    else if (!em && phone && waOk) markSent = true;
  } else if (wantEmail) {
    markSent = Boolean(em && emailOk);
  } else if (wantWa) {
    markSent = Boolean(phone && waOk);
  }
  if (markSent) {
    await auctionReminderQueries.markReminderSent(row.id);
  }
}

async function processOneAuctionStartedRow(row) {
  if (Number(row.notify_email) !== 1) {
    await auctionReminderQueries.markStartedSent(row.id);
    return;
  }
  const user = await userQueries.getById(row.user_id);
  if (!user) {
    await auctionReminderQueries.markStartedSent(row.id);
    return;
  }
  const em = user.email && String(user.email).trim();
  if (!em) {
    if (!auctionReminderNoEmailLogged.has(`s-${row.id}`)) {
      auctionReminderNoEmailLogged.add(`s-${row.id}`);
      console.warn(
        `[auction-reminder] Пользователь user_id=${row.user_id} без email — письмо «аукцион начался» (reminder id=${row.id}) не отправлено.`
      );
    }
    return;
  }
  const link = buildPropertyPublicLink(row.property_id);
  const title = row.property_title || 'Объект';
  const subject = `Аукцион начался: ${title}`;
  const body = `Здравствуйте!\n\nАукцион по объекту «${title}» уже начался.\n\nОткрыть карточку:\n${link}\n\nSellyourbrick`;
  try {
    await sendCrmEmailViaEmailJS(em, subject, body);
    await auctionReminderQueries.markStartedSent(row.id);
  } catch (e) {
    console.error('[auction-reminder] start email:', e.message);
  }
}

/** Письмо при переходе объекта на круговой тест-таймер (после линейного преаукциона). */
async function processOneCircularPhaseStartedRow(row) {
  if (Number(row.notify_email) !== 1) {
    await auctionReminderQueries.markCircularStartedNotified(row.id);
    return;
  }
  const prop = await loadPropertyRowForReminder(row.property_id, row.property_table);
  if (!prop || !propertyRowHasCircularTestTimer(prop)) {
    return;
  }
  const endMs = parsePropertyDateMs(prop.test_timer_end_date);
  if (endMs != null && endMs <= Date.now()) {
    await auctionReminderQueries.markCircularStartedNotified(row.id);
    return;
  }
  const user = await userQueries.getById(row.user_id);
  if (!user) {
    await auctionReminderQueries.markCircularStartedNotified(row.id);
    return;
  }
  const em = user.email && String(user.email).trim();
  if (!em) {
    if (!auctionReminderNoEmailLogged.has(`c-${row.id}`)) {
      auctionReminderNoEmailLogged.add(`c-${row.id}`);
      console.warn(
        `[auction-reminder] Пользователь user_id=${row.user_id} без email — письмо о круговом таймере (reminder id=${row.id}) не отправлено.`
      );
    }
    return;
  }
  const link = buildPropertyPublicLink(row.property_id);
  const title = row.property_title || 'Объект';
  const subject = `Аукцион — круговой таймер: ${title}`;
  const body = `Здравствуйте!\n\nПо объекту «${title}» начался этап с круговым таймером аукциона.\n\nОткрыть карточку:\n${link}\n\nSellyourbrick`;
  try {
    await sendCrmEmailViaEmailJS(em, subject, body);
    await auctionReminderQueries.markCircularStartedNotified(row.id);
  } catch (e) {
    console.error('[auction-reminder] circular phase email:', e.message);
  }
}

let auctionReminderTickRunning = false;
async function tickAuctionReminders() {
  if (auctionReminderTickRunning) return;
  auctionReminderTickRunning = true;
  try {
    const nowIso = new Date().toISOString();
    const due = await auctionReminderQueries.listDueReminders(nowIso);
    for (const row of due) {
      await processOneAuctionReminderRow(row);
    }
    const dueStart = await auctionReminderQueries.listDueAuctionStarted(nowIso);
    for (const row of dueStart) {
      await processOneAuctionStartedRow(row);
    }
    const circularPending = await auctionReminderQueries.listPendingCircularStartedNotify();
    for (const row of circularPending) {
      await processOneCircularPhaseStartedRow(row);
    }
  } catch (e) {
    console.error('[auction-reminder] tick:', e);
  } finally {
    auctionReminderTickRunning = false;
  }
}

app.get('/api/admin/crm/board', async (req, res) => {
  try {
    const board = await crmQueries.getBoard();
    res.json({ success: true, data: board });
  } catch (error) {
    console.error('CRM board:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/crm/user-search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const rows = await crmQueries.searchUsers(q, 30);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('CRM user-search:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/crm/assistant-leads', async (req, res) => {
  try {
    const list = await assistantLeadQueries.getAll();
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('CRM assistant-leads:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/crm/leads/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const lead = await crmQueries.getLeadById(id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Лид не найден' });
    }
    let userSummary = null;
    if (lead.user_id) {
      const u = await userQueries.getById(lead.user_id);
      if (u) {
        const favCount = await crmQueries.getFavoriteCountForUser(lead.user_id);
        userSummary = {
          id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
          phone_number: u.phone_number,
          role: u.role,
          country: u.country,
          favorites_count: favCount,
        };
      }
    }
    const touchCount = await crmQueries.countTouchActivities(id);
    const activityCount = await crmQueries.countActivities(id);
    const scheduleSignals = await crmQueries.getLeadScheduleSignals(lead);
    res.json({
      success: true,
      data: { lead: { ...lead, ...scheduleSignals }, userSummary, touchCount, activityCount },
    });
  } catch (error) {
    console.error('CRM lead get:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/crm/leads', async (req, res) => {
  try {
    const body = req.body || {};
    const newId = await crmQueries.createLead(body);
    const lead = await crmQueries.getLeadById(newId);
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    console.error('CRM lead create:', error);
    if (String(error.message).includes('UNIQUE')) {
      return res.status(409).json({ success: false, error: 'Лид с таким пользователем или лидом помощника уже есть' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/admin/crm/leads/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await crmQueries.getLeadById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Лид не найден' });
    }
    await crmQueries.updateLead(id, req.body || {});
    const lead = await crmQueries.getLeadById(id);
    res.json({ success: true, data: lead });
  } catch (error) {
    console.error('CRM lead patch:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/crm/leads/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await crmQueries.getLeadById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Лид не найден' });
    }
    await crmQueries.deleteLead(id);
    res.json({ success: true, message: 'Удалено' });
  } catch (error) {
    console.error('CRM lead delete:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/crm/leads/:id/move', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { stageId, index } = req.body || {};
    const toStage = parseInt(stageId, 10);
    const toIndex = parseInt(index, 10);
    if (!Number.isFinite(toStage) || !Number.isFinite(toIndex)) {
      return res.status(400).json({ success: false, error: 'Нужны stageId и index' });
    }
    await crmQueries.moveLead(id, toStage, toIndex);
    const lead = await crmQueries.getLeadById(id);
    res.json({ success: true, data: lead });
  } catch (error) {
    console.error('CRM move:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/crm/leads/:id/activities', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const list = await crmQueries.listActivities(id);
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('CRM activities:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/crm/leads/:id/activities', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const lead = await crmQueries.getLeadById(id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Лид не найден' });
    }
    const { kind, title, body, createdBy } = req.body || {};
    if (!kind || !String(kind).trim()) {
      return res.status(400).json({ success: false, error: 'Укажите тип активности (kind)' });
    }
    await crmQueries.addActivity(id, {
      kind: String(kind).trim(),
      title: title != null ? String(title) : null,
      body: body != null ? String(body) : null,
      createdBy: createdBy != null ? String(createdBy) : null,
    });
    const list = await crmQueries.listActivities(id);
    res.status(201).json({ success: true, data: list[0] || null });
  } catch (error) {
    console.error('CRM activity add:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Отправка с сервера (нужен non-browser API или EMAILJS_PRIVATE_KEY). UI админки шлёт из браузера — см. crmClientEmail.js.
app.post('/api/admin/crm/leads/:id/email', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const lead = await crmQueries.getLeadById(id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Лид не найден' });
    }
    const { subject, body, createdBy } = req.body || {};
    const toEmail = lead.email && String(lead.email).trim();
    if (!toEmail) {
      return res.status(400).json({ success: false, error: 'У лида нет email' });
    }
    const subj = subject != null && String(subject).trim() ? String(subject).trim() : 'Сообщение от Sellyourbrick';
    const text = body != null ? String(body) : '';
    await sendCrmEmailViaEmailJS(toEmail, subj, text);
    await crmQueries.addActivity(id, {
      kind: 'email_sent',
      title: subj,
      body: text.slice(0, 4000),
      meta: { to: toEmail },
      createdBy: createdBy != null ? String(createdBy) : null,
    });
    res.json({ success: true, message: 'Письмо отправлено' });
  } catch (error) {
    console.error('CRM email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/crm/import-user', async (req, res) => {
  try {
    const { userId } = req.body || {};
    const uid = parseInt(userId, 10);
    if (!Number.isFinite(uid)) {
      return res.status(400).json({ success: false, error: 'Нужен userId' });
    }
    const existing = await crmQueries.findLeadByUserId(uid);
    if (existing) {
      return res.json({ success: true, data: existing, message: 'Уже в воронке' });
    }
    const u = await userQueries.getById(uid);
    if (!u) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email || `User #${u.id}`;
    const interests = [];
    if (u.country) interests.push(`Страна: ${u.country}`);
    if (u.role) interests.push(`Роль: ${u.role}`);
    const newId = await crmQueries.createLead({
      user_id: u.id,
      display_name: displayName,
      email: u.email || null,
      phone: u.phone_number || null,
      interests,
      source: 'user_import',
      temperature: 'warm',
    });
    const lead = await crmQueries.getLeadById(newId);
    await crmQueries.addActivity(newId, {
      kind: 'note',
      title: 'Импорт из пользователей',
      body: `Добавлен из базы пользователей ID ${u.id}`,
      createdBy: req.body?.createdBy || null,
    });
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    console.error('CRM import user:', error);
    if (String(error.message).includes('UNIQUE')) {
      return res.status(409).json({ success: false, error: 'Лид для этого пользователя уже существует' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/crm/import-assistant', async (req, res) => {
  try {
    const { assistantLeadId } = req.body || {};
    const aid = parseInt(assistantLeadId, 10);
    if (!Number.isFinite(aid)) {
      return res.status(400).json({ success: false, error: 'Нужен assistantLeadId' });
    }
    const existing = await crmQueries.findLeadByAssistantId(aid);
    if (existing) {
      return res.json({ success: true, data: existing, message: 'Уже в воронке' });
    }
    const al = await assistantLeadQueries.getById(aid);
    if (!al) {
      return res.status(404).json({ success: false, error: 'Лид помощника не найден' });
    }
    const displayName =
      [al.email, al.phone].filter(Boolean).join(' / ') || `Лид чата #${al.id}`;
    const interests = [];
    if (al.region) interests.push(`Регион: ${al.region}`);
    if (al.property_type) interests.push(`Тип: ${al.property_type}`);
    if (al.country) interests.push(`Страна: ${al.country}`);
    if (al.summary) interests.push(al.summary.slice(0, 200));
    const newId = await crmQueries.createLead({
      user_id: al.user_id || null,
      display_name: displayName,
      email: al.email || null,
      phone: al.phone || null,
      interests,
      source: 'assistant_import',
      assistant_lead_id: al.id,
      temperature: al.lead_type === 'hot' ? 'hot' : al.lead_type === 'warm' ? 'warm' : 'cold',
      internal_notes: al.summary ? `Сводка помощника: ${al.summary}` : null,
    });
    const lead = await crmQueries.getLeadById(newId);
    await crmQueries.addActivity(newId, {
      kind: 'note',
      title: 'Импорт из умного помощника',
      body: `assistant_lead id=${al.id}`,
      createdBy: req.body?.createdBy || null,
    });
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    console.error('CRM import assistant:', error);
    if (String(error.message).includes('UNIQUE')) {
      return res.status(409).json({ success: false, error: 'Этот лид помощника уже в CRM' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ============================================
 * API: Причины долга (для объявлений «Долги»)
 * ============================================
 */
app.get('/api/admin/debt-reasons', async (req, res) => {
  try {
    const list = await debtReasonQueries.getAll();
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Ошибка при получении причин долга:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/debt-reasons', async (req, res) => {
  try {
    const { title_ru, code, sort_order } = req.body || {};
    if (!title_ru || !String(title_ru).trim()) {
      return res.status(400).json({ success: false, error: 'Укажите название причины (title_ru)' });
    }
    const result = await debtReasonQueries.create({
      title_ru: String(title_ru).trim(),
      code: code ? String(code).trim() || null : null,
      sort_order: sort_order != null ? parseInt(sort_order, 10) : 0
    });
    const item = await debtReasonQueries.getById(result.id);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Ошибка при создании причины долга:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/debt-reasons/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await debtReasonQueries.getById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Причина долга не найдена' });
    }
    const { title_ru, code, sort_order } = req.body || {};
    await debtReasonQueries.update(id, {
      title_ru: title_ru != null ? String(title_ru).trim() : existing.title_ru,
      code: code !== undefined ? (code ? String(code).trim() || null : null) : existing.code,
      sort_order: sort_order !== undefined ? parseInt(sort_order, 10) : existing.sort_order
    });
    const item = await debtReasonQueries.getById(id);
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Ошибка при обновлении причины долга:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/debt-reasons/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await debtReasonQueries.getById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Причина долга не найдена' });
    }
    await debtReasonQueries.delete(id);
    res.json({ success: true, message: 'Причина долга удалена' });
  } catch (error) {
    console.error('Ошибка при удалении причины долга:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ============================================
 * API ENDPOINTS ДЛЯ НЕДВИЖИМОСТИ
 * ============================================
 */

/**
 * POST /api/properties - Создать новое объявление о недвижимости
 */
const debtDocFieldNames = [
  'debt_doc_cat1',
  'debt_doc_cat2',
  'debt_doc_cat3',
  'debt_doc_cat4',
  'debt_doc_cat5',
  'debt_doc_cat6'
];

/**
 * POST /api/properties/upload-photo — загрузить фото объявления до отправки формы.
 * Нужен, чтобы не слать десятки МБ base64 в одном поле photos (лимиты прокси на проде).
 */
app.post('/api/properties/upload-photo', async (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      console.error('POST /api/properties/upload-photo multer:', err);
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Файл слишком большой (макс. 10 МБ)'
          : err.message || 'Ошибка загрузки файла';
      return res.status(400).json({ success: false, error: msg });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл не передан' });
    }
    const url = `/uploads/${req.file.filename}`;
    return res.json({ success: true, data: { url } });
  });
});

app.post('/api/properties', upload.fields([
  { name: 'ownership_document', maxCount: 1 },
  { name: 'no_debts_document', maxCount: 1 },
  ...debtDocFieldNames.map(name => ({ name, maxCount: 10 }))
]), async (req, res) => {
  try {
    console.log('📥 Получен запрос на создание объявления');
    console.log('📋 Body:', req.body);
    console.log('📁 Files:', req.files);
    
    
    
    const {
      user_id,
      property_type,
      title,
      description,
      price,
      currency = 'USD',
      is_auction = 0,
      auction_start_date,
      auction_end_date,
      auction_starting_price,
      minimum_sale_price,
      is_share = 0,
      total_shares
    } = req.body;
    
    const isShare = (is_share === '1' || is_share === 1 || is_share === true);
    
    // Проверяем, что property_type валиден для новых таблиц
    if (!property_type || !['apartment', 'commercial', 'house', 'villa'].includes(property_type)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать корректный property_type: apartment, commercial, house или villa' 
      });
    }
    
    // Для долевого объекта: без аукциона и тест-драйва
    let normalizedIsAuction = 0;
    if (isShare) {
      normalizedIsAuction = 0;
    } else if (typeof is_auction === 'string') {
      normalizedIsAuction = (is_auction === '1' || is_auction === 'true') ? 1 : 0;
    } else if (typeof is_auction === 'boolean') {
      normalizedIsAuction = is_auction ? 1 : 0;
    } else {
      normalizedIsAuction = is_auction ? 1 : 0;
    }
    
    console.log('📋 Получен is_auction:', is_auction, 'is_share:', isShare, 'нормализован is_auction:', normalizedIsAuction);
    
    // Извлекаем feature поля из req.body
    const featureFields = {};
    for (let i = 1; i <= 26; i++) {
      const featureKey = `feature${i}`;
      featureFields[featureKey] = req.body[featureKey] || 0;
    }
    
    // Логируем feature поля для отладки
    const selectedFeatures = Object.entries(featureFields).filter(([key, value]) => value === '1' || value === 1 || value === true);
    if (selectedFeatures.length > 0) {
      console.log('📋 Получены feature поля:', selectedFeatures.map(([key]) => key).join(', '));
    }
    
    const {
      area,
      living_area,
      building_type,
      rooms,
      bedrooms,
      bathrooms,
      floor,
      total_floors,
      year_built,
      location,
      address,
      apartment,
      country,
      city,
      coordinates,
      balcony = 0,
      parking = 0,
      elevator = 0,
      land_area,
      garage = 0,
      pool = 0,
      garden = 0,
      commercial_type,
      business_hours,
      renovation,
      condition,
      heating,
      water_supply,
      sewerage,
      electricity = 0,
      internet = 0,
      security = 0,
      furniture = 0,
      photos,
      videos,
      additional_documents,
      additional_amenities,
      tz_amenities_json,
      tz_parameters_json,
      test_drive_data,
      test_drive = 0,
      is_debt,
      sale_type,
      debt_utilities,
      debt_mortgage_pledge,
      debt_property_taxes,
      debt_arrest,
      debt_inherited,
      debt_third_party,
      debt_other,
      debt_amount
    } = req.body;
    

    // Для долевого объекта и долгов тест-драйв недоступен
    let normalizedTestDrive = 0;
    const isDebt = is_debt === '1' || is_debt === 1 || is_debt === true || sale_type === 'debt';
    if (isShare || isDebt) {
      normalizedTestDrive = 0;
    } else if (typeof test_drive === 'string') {
      normalizedTestDrive = (test_drive === '1' || test_drive === 'true') ? 1 : 0;
    } else if (typeof test_drive === 'boolean') {
      normalizedTestDrive = test_drive ? 1 : 0;
    } else {
      normalizedTestDrive = test_drive ? 1 : 0;
    }
    console.log('🔍 POST /api/properties - test_drive:', {
      raw: test_drive,
      type: typeof test_drive,
      normalized: normalizedTestDrive
    })

    // Парсим JSON-строки для медиа
    let parsedPhotos = [];
    let parsedVideos = [];
    let parsedAdditionalDocuments = [];
    
    try {
      if (photos && typeof photos === 'string') {
        parsedPhotos = JSON.parse(photos);
      } else if (Array.isArray(photos)) {
        parsedPhotos = photos;
      }
      
      if (videos && typeof videos === 'string') {
        parsedVideos = JSON.parse(videos);
      } else if (Array.isArray(videos)) {
        parsedVideos = videos;
      }
      
      if (additional_documents && typeof additional_documents === 'string') {
        parsedAdditionalDocuments = JSON.parse(additional_documents);
      } else if (Array.isArray(additional_documents)) {
        parsedAdditionalDocuments = additional_documents;
      }
    } catch (parseError) {
      console.warn('⚠️ Ошибка парсинга JSON для медиа:', parseError.message);
    }

    const parseJsonObjectOrArraySafe = (value, fallback) => {
      if (value == null || value === '') return fallback
      if (typeof value === 'object') return value
      if (typeof value !== 'string') return fallback
      try {
        return JSON.parse(value)
      } catch {
        return fallback
      }
    }
    const parsedTzAmenities = parseJsonObjectOrArraySafe(tz_amenities_json, [])
    const parsedTzParameters = parseJsonObjectOrArraySafe(tz_parameters_json, {})

    parsedPhotos = normalizePhotosListInput(parsedPhotos);

    if (!user_id || !property_type || !title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать user_id, property_type и title' 
      });
    }

    // Обновляем данные пользователя из профиля, если они переданы
    // Это нужно для синхронизации данных профиля с данными пользователя при отправке объекта
    try {
      const user = await userQueries.getById(user_id);
      if (user) {
        // Обновляем данные пользователя, если они были переданы в запросе
        const updateData = {};
        if (req.body.first_name) updateData.first_name = req.body.first_name;
        if (req.body.last_name) updateData.last_name = req.body.last_name;
        if (req.body.email) updateData.email = req.body.email;
        if (req.body.phone_number) updateData.phone_number = req.body.phone_number;
        if (req.body.country) updateData.country = req.body.country;
        if (req.body.address) updateData.address = req.body.address;
        if (req.body.passport_series) updateData.passport_series = req.body.passport_series;
        if (req.body.passport_number) updateData.passport_number = req.body.passport_number;
        if (req.body.identification_number) updateData.identification_number = req.body.identification_number;
        
        if (Object.keys(updateData).length > 0) {
          await userQueries.update(user_id, updateData);
          console.log('✅ Данные пользователя обновлены при отправке объекта');
        }
      }
    } catch (userUpdateError) {
      console.warn('⚠️ Не удалось обновить данные пользователя:', userUpdateError.message);
    }

    // Обработка загруженных документов
    let ownershipDocumentPath = null;
    let noDebtsDocumentPath = null;

    if (req.files) {
      if (req.files['ownership_document'] && req.files['ownership_document'][0]) {
        ownershipDocumentPath = `/uploads/${req.files['ownership_document'][0].filename}`;
      }
      if (req.files['no_debts_document'] && req.files['no_debts_document'][0]) {
        noDebtsDocumentPath = `/uploads/${req.files['no_debts_document'][0].filename}`;
      }
    }

    // Используем location, если он указан (он уже содержит полный адрес)
    // Если location не указан, формируем его из отдельных полей
    let finalLocation = location || '';
    if (!finalLocation && (address || apartment || city || country)) {
      const locationParts = [];
      if (address) locationParts.push(address);
      if (city) locationParts.push(city);
      if (country) locationParts.push(country);
      if (locationParts.length > 0) {
        finalLocation = locationParts.join(', ');
      }
    }

    // Подготавливаем данные для сохранения
    const propertyData = {
      user_id: parseInt(user_id),
      property_type,
      title,
      description: description || null,
      // Для аукционов: price - это опциональная цена "Купить сейчас"
      // Если не указана или равна 0, устанавливаем null
      price: (price && price !== '0' && parseFloat(price) > 0) ? parseFloat(price) : null,
      currency: currency || 'USD',
      is_auction: normalizedIsAuction,
      auction_start_date: auction_start_date || null,
      auction_end_date: auction_end_date || null,
      auction_starting_price: auction_starting_price ? parseFloat(auction_starting_price) : null,
      minimum_sale_price:
        minimum_sale_price !== undefined &&
        minimum_sale_price !== null &&
        minimum_sale_price !== '' &&
        !Number.isNaN(parseFloat(String(minimum_sale_price))) &&
        parseFloat(String(minimum_sale_price)) > 0
          ? parseFloat(String(minimum_sale_price))
          : null,
      area: area ? parseFloat(area) : null,
      living_area: living_area ? parseFloat(living_area) : null,
      building_type: building_type || null,
      rooms: rooms ? parseInt(rooms) : null,
      bathrooms: bathrooms ? parseInt(bathrooms) : null,
      floor: floor ? parseInt(floor) : null,
      total_floors: total_floors ? parseInt(total_floors) : null,
      year_built: year_built ? parseInt(year_built) : null,
      location: finalLocation || null,
      address: address || null,
      apartment: apartment || null,
      country: country || null,
      city: city || null,
      coordinates: coordinates ? (typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates) : null,
      // ВАЖНО: Устанавливаем только если явно передано значение 1, true или '1'
      // Если не передано или передано как 0, '0', false - устанавливаем 0
      balcony: (balcony === 1 || balcony === true || balcony === '1') ? 1 : 0,
      parking: (parking === 1 || parking === true || parking === '1') ? 1 : 0,
      elevator: (elevator === 1 || elevator === true || elevator === '1') ? 1 : 0,
      electricity: (electricity === 1 || electricity === true || electricity === '1') ? 1 : 0,
      internet: (internet === 1 || internet === true || internet === '1') ? 1 : 0,
      security: (security === 1 || security === true || security === '1') ? 1 : 0,
      furniture: (furniture === 1 || furniture === true || furniture === '1') ? 1 : 0,
      // Feature поля - добавляем из извлеченных данных
      ...Object.fromEntries(
        Object.entries(featureFields).map(([key, value]) => [
          key,
          value === '1' || value === 1 || value === true ? 1 : 0
        ])
      ),
      commercial_type: commercial_type || null,
      business_hours: business_hours || null,
      renovation: renovation || null,
      condition: condition || null,
      heating: heating || null,
      water_supply: water_supply || null,
      sewerage: sewerage || null,
      additional_amenities: additional_amenities || null,
      tz_amenities_json: Array.isArray(parsedTzAmenities) ? parsedTzAmenities : [],
      tz_parameters_json:
        parsedTzParameters && typeof parsedTzParameters === 'object' ? parsedTzParameters : {},
      photos: parsedPhotos.length > 0 ? parsedPhotos : null,
      videos: parsedVideos.length > 0 ? parsedVideos : null,
      additional_documents: parsedAdditionalDocuments.length > 0 ? parsedAdditionalDocuments : null,
      ownership_document: ownershipDocumentPath,
      no_debts_document: noDebtsDocumentPath,
      test_drive: normalizedTestDrive,
      test_drive_data: test_drive_data ? (typeof test_drive_data === 'string' ? JSON.parse(test_drive_data) : test_drive_data) : null,
      moderation_status: 'pending',
      is_shared_ownership: isShare ? 1 : 0,
      total_shares: isShare && total_shares ? parseInt(total_shares, 10) : null,
      shares_sold: isShare ? 0 : null,
      sale_type: isDebt ? 'debt' : (isShare ? 'share' : 'auction'),
      is_debt: isDebt ? 1 : 0,
      has_debt: isDebt ? 1 : 0,
      // Детализация долгов
      debt_utilities: debt_utilities === '1' || debt_utilities === 1 || debt_utilities === true,
      debt_mortgage_pledge: debt_mortgage_pledge === '1' || debt_mortgage_pledge === 1 || debt_mortgage_pledge === true,
      debt_property_taxes: debt_property_taxes === '1' || debt_property_taxes === 1 || debt_property_taxes === true,
      debt_arrest: debt_arrest === '1' || debt_arrest === 1 || debt_arrest === true,
      debt_inherited: debt_inherited === '1' || debt_inherited === 1 || debt_inherited === true,
      debt_third_party: debt_third_party === '1' || debt_third_party === 1 || debt_third_party === true,
      debt_other: debt_other || null,
      debt_amount: debt_amount ? parseFloat(debt_amount) : null
    };

    // Добавляем поля для домов/вилл
    if (property_type === 'house' || property_type === 'villa') {
      propertyData.land_area = land_area ? parseFloat(land_area) : null;
      // Обрабатываем bedrooms: как в рабочем проекте, но с поддержкой значения 0
      // ВАЖНО: проверяем на undefined/null/пустую строку, но НЕ на truthiness, чтобы 0 сохранялся
      if (bedrooms !== undefined && bedrooms !== null && bedrooms !== '') {
        const parsedBedrooms = parseInt(bedrooms, 10);
        // Проверяем, что parseInt вернул валидное число (не NaN)
        if (!isNaN(parsedBedrooms) && isFinite(parsedBedrooms)) {
          propertyData.bedrooms = parsedBedrooms; // Сохраняем даже 0
        } else {
          propertyData.bedrooms = null;
        }
      } else {
        propertyData.bedrooms = null;
      }
      // Для домов/вилл используем total_floors как floors (количество этажей дома)
      propertyData.floors = total_floors ? parseInt(total_floors) : null;
      propertyData.pool = pool ? 1 : 0;
      propertyData.garden = garden ? 1 : 0;
      propertyData.garage = garage ? 1 : 0;
    }

    // Цена «Купить сейчас» + аукцион: стартовая ставка не больше 30% от buy now (в т.ч. для долгов на аукционе)
    if (!isShare && normalizedIsAuction === 1) {
      const bn = propertyData.price
      const st = propertyData.auction_starting_price
      if (bn && bn > 0 && st != null && !Number.isNaN(st) && st > 0 && st > bn * 0.3 + 1e-9) {
        return res.status(400).json({
          success: false,
          error: 'Стартовая ставка не может превышать 30% от цены «Купить сейчас».'
        })
      }
      const minS = propertyData.minimum_sale_price
      if (minS != null && minS > 0 && bn != null && bn > 0 && minS > bn * 0.9 + 1e-9) {
        return res.status(400).json({
          success: false,
          error: 'Минимальная цена продажи не может превышать 90% от цены «Купить сейчас».'
        })
      }
    }

    if (normalizedTestDrive === 1 && !propertyRowAllowsTestDriveListing(propertyData)) {
      return res.status(400).json({
        success: false,
        error:
          'Тест-драйв доступен только в формате «Аукцион + Продать сейчас»: укажите старт торгов и цену мгновенной покупки выше старта.',
      });
    }

    // Проверяем обязательные поля
    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать user_id' 
      });
    }
    
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать название объявления' 
      });
    }
    
    // Используем соответствующий query в зависимости от типа
    let result;
    let property;
    
    // Логируем propertyData перед сохранением
    console.log('🔍 POST /api/properties - propertyData перед сохранением:', {
      property_type: propertyData.property_type,
      user_id: propertyData.user_id,
      title: propertyData.title ? propertyData.title.substring(0, 50) + '...' : 'нет',
      has_photos: !!propertyData.photos,
      photos_count: propertyData.photos ? (Array.isArray(propertyData.photos) ? propertyData.photos.length : 0) : 0
    });
    
    if (property_type === 'house' || property_type === 'villa') {
      console.log('🔍 POST /api/properties - propertyData для дома/виллы:', {
        bedrooms: propertyData.bedrooms,
        bedroomsType: typeof propertyData.bedrooms,
        property_type: propertyData.property_type
      });
    }
    
    try {
      if (property_type === 'apartment' || property_type === 'commercial') {
        console.log('🔍 Создание квартиры/коммерческой недвижимости...');
        result = await apartmentQueries.create(propertyData);
        console.log('✅ Результат создания:', { lastInsertRowid: result.lastInsertRowid, changes: result.changes });
        
        if (!result || !result.lastInsertRowid) {
          console.error('❌ Ошибка: объект не был создан, result.lastInsertRowid отсутствует');
          return res.status(500).json({ 
            success: false, 
            error: 'Не удалось создать объявление. Ошибка при сохранении в базу данных.' 
          });
        }
        
        property = await apartmentQueries.getById(result.lastInsertRowid);
        if (!property) {
          console.error('❌ Ошибка: объект создан, но не найден при получении, ID:', result.lastInsertRowid);
          return res.status(500).json({ 
            success: false, 
            error: 'Объявление создано, но не найдено в базе данных. Обратитесь к администратору.' 
          });
        }
        console.log('✅ Квартира/коммерческая недвижимость создана с ID:', result.lastInsertRowid);
        console.log('📋 Полученный объект:', { id: property.id, title: property.title, property_type: property.property_type });
      } else if (property_type === 'house' || property_type === 'villa') {
        console.log('🔍 Создание дома/виллы...');
        result = await houseQueries.create(propertyData);
        console.log('✅ Результат создания:', { lastInsertRowid: result.lastInsertRowid, changes: result.changes });
        
        if (!result || !result.lastInsertRowid) {
          console.error('❌ Ошибка: объект не был создан, result.lastInsertRowid отсутствует');
          return res.status(500).json({ 
            success: false, 
            error: 'Не удалось создать объявление. Ошибка при сохранении в базу данных.' 
          });
        }
        
        property = await houseQueries.getById(result.lastInsertRowid);
        if (!property) {
          console.error('❌ Ошибка: объект создан, но не найден при получении, ID:', result.lastInsertRowid);
          return res.status(500).json({ 
            success: false, 
            error: 'Объявление создано, но не найдено в базе данных. Обратитесь к администратору.' 
          });
        }
        console.log('✅ Дом/вилла создана с ID:', result.lastInsertRowid);
        console.log('🔍 POST /api/properties - Создан дом/вилла, bedrooms в БД:', property.bedrooms, 'тип:', typeof property.bedrooms);
        console.log('📋 Полученный объект:', { id: property.id, title: property.title, property_type: property.property_type });
      } else {
        return res.status(400).json({ 
          success: false, 
          error: 'Неизвестный тип недвижимости' 
        });
      }
    } catch (createError) {
      console.error('❌ Ошибка при вызове create:', createError);
      console.error('❌ Тип ошибки:', createError.constructor.name);
      console.error('❌ Сообщение:', createError.message);
      console.error('❌ Stack:', createError.stack);
      
      throw createError; // Пробрасываем ошибку дальше
    }
    
    console.log('🔍 POST /api/properties - Сохранено test_drive в БД:', normalizedTestDrive, 'тип:', typeof normalizedTestDrive)

    const propertyId = result.lastInsertRowid;

    // Сохранение документов по долгу (6 категорий, в каждой — несколько файлов)
    if (isDebt && req.files) {
      const propertyType = property_type;
      for (const fieldName of debtDocFieldNames) {
        const docType = fieldName.replace('debt_doc_', '');
        const files = req.files[fieldName];
        if (files && Array.isArray(files)) {
          for (const file of files) {
            const filePath = `/uploads/${file.filename}`;
            try {
              await debtDocumentQueries.insert(propertyId, propertyType, docType, filePath, file.originalname || null);
            } catch (docErr) {
              console.warn('⚠️ Не удалось сохранить документ долга:', docType, docErr.message);
            }
          }
        }
      }
    }

    console.log('✅ Объявление успешно создано с ID:', propertyId);
    console.log('📋 Проверка property перед отправкой ответа:', {
      propertyExists: !!property,
      propertyId: property?.id,
      propertyTitle: property?.title,
      propertyType: property?.property_type,
      moderationStatus: property?.moderation_status
    });
    
    if (!property) {
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: property равен null или undefined после создания!');
      return res.status(500).json({ 
        success: false, 
        error: 'Объявление создано, но не удалось получить данные. Обратитесь к администратору.' 
      });
    }
    
    console.log('📋 Статус модерации из БД:', property.moderation_status);
    console.log('📋 Сохраненные данные в БД:', {
      property_type: property.property_type,
      rooms: property.rooms,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      living_area: property.living_area,
      land_area: property.land_area,
      floor: property.floor,
      floors: property.floors,
      total_floors: property.total_floors,
      year_built: property.year_built,
      building_type: property.building_type,
      amenities: property.amenities,
      amenities_type: typeof property.amenities,
      pool: property.pool,
      garden: property.garden,
      garage: property.garage,
      moderation_status: property.moderation_status,
      additional_amenities: property.additional_amenities,
      additional_amenities_type: typeof property.additional_amenities,
      feature1: property.feature1,
      feature2: property.feature2,
      feature3: property.feature3,
      building_type: property.building_type,
      balcony: property.balcony,
      parking: property.parking,
      elevator: property.elevator,
      price: property.price,
      auction_starting_price: property.auction_starting_price,
      test_drive: property.test_drive,
      test_drive_type: typeof property.test_drive,
    });
    
    // Проверяем количество объявлений на модерации
    let pendingCount = 0;
    try {
      const prisma = getPrisma();
      const [apartmentsPending, housesPending] = await Promise.all([
        prisma.properties_apartments.count({ where: { moderation_status: 'pending' } }),
        prisma.properties_houses.count({ where: { moderation_status: 'pending' } }),
      ]);
      pendingCount = apartmentsPending + housesPending;
    } catch (e) {
      console.warn('⚠️ Не удалось получить количество объявлений на модерации:', e.message);
    }
    console.log('📊 Всего объявлений на модерации:', pendingCount);

    // Убеждаемся, что property содержит все необходимые данные
    const responseData = {
      success: true,
      data: {
        id: property.id,
        user_id: property.user_id,
        property_type: property.property_type,
        title: property.title,
        description: property.description,
        price: property.price,
        currency: property.currency,
        is_auction: property.is_auction,
        moderation_status: property.moderation_status,
        created_at: property.created_at,
        ...property // Включаем все остальные поля
      },
      message: 'Объявление успешно отправлено на модерацию'
    };
    
    // Мгновенно обновляем кабинет продавца без ожидания polling/focus.
    try {
      broadcastUserCabinetEvent(property.user_id, {
        type: 'property_moderation',
        property_id: Number(property.id),
        moderation_status: 'pending',
        property_type: property.property_type
      });
      broadcastUserCabinetEvent(property.user_id, { type: 'notifications_refresh' });
    } catch (cabErr) {
      console.warn('[SSE] user cabinet (property submit pending):', cabErr?.message || cabErr);
    }
    
    console.log('📤 Отправка ответа клиенту:', {
      success: responseData.success,
      hasData: !!responseData.data,
      propertyId: responseData.data?.id,
      propertyTitle: responseData.data?.title,
      message: responseData.message
    });

    res.json(responseData);
  } catch (error) {
    console.error('❌ Ошибка при создании объявления:', error);
    console.error('❌ Тип ошибки:', error.constructor.name);
    console.error('❌ Сообщение:', error.message);
    console.error('❌ Stack:', error.stack);
    
    // Логируем дополнительные детали для ошибок схемы/таблиц БД
    if (error.message && error.message.includes('no such column')) {
      console.error('❌ Ошибка БД: отсутствует колонка в таблице');
      console.error('❌ Проверьте структуру таблицы properties_apartments или properties_houses');
    }
    
    if (error.message && error.message.includes('no such table')) {
      console.error('❌ Ошибка БД: отсутствует таблица');
      console.error('❌ Проверьте, что таблицы properties_apartments и properties_houses созданы');
    }
    
    // Отправляем более детальную ошибку
    const errorMessage = error.message || 'Внутренняя ошибка сервера';
    const errorDetails = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production' 
      ? {
          message: errorMessage,
          stack: error.stack,
          type: error.constructor.name
        }
      : undefined;
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: errorDetails
    });
  }
});

/**
 * POST /api/properties/bulk-import - Массовое добавление объектов из Excel/CSV
 */
app.post('/api/properties/bulk-import', uploadMemory.single('file'), async (req, res) => {
  try {
    const user_id = req.body.user_id ? parseInt(req.body.user_id, 10) : null;
    if (!user_id || isNaN(user_id)) {
      return res.status(400).json({ success: false, error: 'Необходимо указать user_id' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'Файл не загружен' });
    }

    const fileBuffer = req.file.buffer;
    const originalName = req.file.originalname || '';

    const { rows, errors: parseErrors } = parseBulkImportFile(fileBuffer, originalName);

    const found = rows.length + parseErrors.length;
    if (found === 0) {
      return res.json({
        success: true,
        found: 0,
        loaded: 0,
        failed: parseErrors.length,
        errors: parseErrors
      });
    }

    let loaded = 0;
    const errors = [...parseErrors];

    for (const row of rows) {
      try {
        const propertyData = rowToPropertyData(row, user_id);
        if (row.property_type === 'apartment' || row.property_type === 'commercial') {
          await apartmentQueries.create(propertyData);
        } else {
          await houseQueries.create(propertyData);
        }
        loaded++;
      } catch (err) {
        errors.push({
          row: row.rowIndex,
          message: err.message || 'Ошибка сохранения в базу'
        });
      }
    }

    const failed = errors.length;
    return res.json({
      success: true,
      found: rows.length,
      loaded,
      failed,
      errors: errors.slice(0, 50)
    });
  } catch (error) {
    console.error('❌ Ошибка bulk-import:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Ошибка при обработке файла'
    });
  }
});

/**
 * PUT /api/properties/:id/delete-request - Отправить запрос на удаление объявления
 * ВАЖНО: Этот маршрут должен быть ПЕРЕД /api/properties/:id, иначе он будет перехвачен
 */
app.put('/api/properties/:id/delete-request', async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать причину удаления' 
      });
    }

    const property = await prisma.properties.findUnique({ where: { id: Number(id) } });
    if (!property) {
      return res.status(404).json({ 
        success: false, 
        error: 'Объявление не найдено' 
      });
    }

    // Проверяем, не отправлен ли уже запрос на удаление
    const existingDeleteRequest = await prisma.properties.findFirst({
      where: {
        moderation_status: 'pending',
        rejection_reason: { startsWith: `DELETE:${id}:` },
      },
    });

    if (existingDeleteRequest) {
      return res.status(400).json({ 
        success: false, 
        error: 'Запрос на удаление уже отправлен и ожидает модерации' 
      });
    }

    // Создаем новую запись с запросом на удаление
    // Используем rejection_reason для хранения ID оригинального объекта и причины: DELETE:propertyId:reason
    const created = await prisma.properties.create({
      data: {
        user_id: property.user_id,
        property_type: property.property_type,
        title: property.title,
        description: property.description,
        price: property.price,
        currency: property.currency,
        is_auction: property.is_auction,
        auction_start_date: property.auction_start_date,
        auction_end_date: property.auction_end_date,
        auction_starting_price: property.auction_starting_price,
        area: property.area,
        rooms: property.rooms,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        floor: property.floor,
        total_floors: property.total_floors,
        year_built: property.year_built,
        location: property.location,
        balcony: property.balcony,
        parking: property.parking,
        elevator: property.elevator,
        land_area: property.land_area,
        garage: property.garage,
        pool: property.pool,
        garden: property.garden,
        commercial_type: property.commercial_type,
        business_hours: property.business_hours,
        renovation: property.renovation,
        condition: property.condition,
        heating: property.heating,
        water_supply: property.water_supply,
        sewerage: property.sewerage,
        electricity: property.electricity,
        internet: property.internet,
        security: property.security,
        furniture: property.furniture,
        photos: property.photos,
        videos: property.videos,
        additional_documents: property.additional_documents,
        ownership_document: property.ownership_document,
        no_debts_document: property.no_debts_document,
        test_drive: property.test_drive ?? 0,
        test_drive_data: property.test_drive_data,
        moderation_status: 'pending',
        rejection_reason: `DELETE:${id}:${reason.trim()}`,
      },
    });
    const newRequestId = created.id;

    console.log(`🗑️ Создан запрос на удаление. ID запроса: ${newRequestId}, ID оригинала: ${id}, Причина: ${reason.trim()}`);

    res.json({
      success: true,
      message: 'Запрос на удаление отправлен на модерацию',
      request_id: newRequestId
    });
  } catch (error) {
    console.error('❌ Ошибка при создании запроса на удаление:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Ошибка при создании запроса на удаление' 
    });
  }
});

/**
 * PUT /api/properties/:id - Обновить объявление (для редактирования)
 */
app.put('/api/properties/:id', upload.fields([
  { name: 'ownership_document', maxCount: 1 },
  { name: 'no_debts_document', maxCount: 1 },
  ...debtDocFieldNames.map(name => ({ name, maxCount: 10 }))
]), async (req, res) => {
  try {
    console.log('📥 Получен запрос на обновление объявления');
    console.log('📋 Body:', req.body);
    console.log('📁 Files:', req.files);
    
    const { id } = req.params;
    const isEditRaw = req.body.is_edit;
    const isEdit =
      isEditRaw === '1' ||
      isEditRaw === 1 ||
      isEditRaw === true ||
      String(isEditRaw || '').toLowerCase() === 'true';
    const originalPropertyId = req.body.original_property_id || id;
    const editTypeHint =
      req.query.property_type || req.body.property_type || null;

    // Проверяем существование оригинального объекта - используем propertyQueries для поиска в правильных таблицах
    let originalProperty = await propertyQueries.getById(originalPropertyId, editTypeHint);
    if (!originalProperty && editTypeHint) {
      originalProperty = await propertyQueries.getById(originalPropertyId);
    }
    if (!originalProperty) {
      for (const t of ['apartment', 'commercial', 'house', 'villa']) {
        originalProperty = await propertyQueries.getById(originalPropertyId, t);
        if (originalProperty) break;
      }
    }
    if (!originalProperty) {
      return res.status(404).json({
        success: false,
        error: 'Оригинальное объявление не найдено',
      });
    }

    const {
      user_id,
      property_type,
      title,
      description,
      price,
      currency = 'USD',
      is_auction = 0,
      auction_start_date,
      auction_end_date,
      auction_starting_price,
      minimum_sale_price
    } = req.body;
    
    // Нормализуем is_auction
    let normalizedIsAuction = 0;
    if (typeof is_auction === 'string') {
      normalizedIsAuction = (is_auction === '1' || is_auction === 'true') ? 1 : 0;
    } else if (typeof is_auction === 'boolean') {
      normalizedIsAuction = is_auction ? 1 : 0;
    } else {
      normalizedIsAuction = is_auction ? 1 : 0;
    }
    
    const {
      area,
      living_area,
      building_type,
      rooms,
      bedrooms,
      bathrooms,
      floor,
      total_floors,
      year_built,
      location,
      address,
      apartment,
      country,
      city,
      coordinates,
      balcony = 0,
      parking = 0,
      elevator = 0,
      land_area,
      garage = 0,
      pool = 0,
      garden = 0,
      commercial_type,
      business_hours,
      renovation,
      condition,
      heating,
      water_supply,
      sewerage,
      electricity = 0,
      internet = 0,
      security = 0,
      furniture = 0,
      photos,
      videos,
      additional_documents,
      additional_amenities,
      tz_amenities_json,
      tz_parameters_json,
      test_drive_data,
      test_drive = 0,
      is_debt,
      sale_type,
      debt_utilities,
      debt_mortgage_pledge,
      debt_property_taxes,
      debt_arrest,
      debt_inherited,
      debt_third_party,
      debt_other,
      debt_amount
    } = req.body;
    
    // Нормализуем test_drive для редактирования
    // Если объект долевой или с долгами — тест-драйв принудительно выключен
    const isShareEdit =
      originalProperty.is_shared_ownership === 1 ||
      originalProperty.is_shared_ownership === true;
    const isDebtEdit =
      originalProperty.is_debt === 1 ||
      originalProperty.is_debt === true ||
      originalProperty.sale_type === 'debt';

    let normalizedTestDriveEdit = undefined;
    if (isShareEdit || isDebtEdit) {
      normalizedTestDriveEdit = 0;
    } else if (test_drive !== undefined && test_drive !== null) {
      if (typeof test_drive === 'string') {
        normalizedTestDriveEdit = (test_drive === '1' || test_drive === 'true') ? 1 : 0;
      } else if (typeof test_drive === 'boolean') {
        normalizedTestDriveEdit = test_drive ? 1 : 0;
      } else {
        normalizedTestDriveEdit = test_drive ? 1 : 0;
      }
    }

    // Для уже идущего аукциона стартовую дату не меняем при редактировании:
    // аукцион должен продолжаться с исходной точки отсчета.
    const isOriginalAuction =
      originalProperty.is_auction === 1 ||
      originalProperty.is_auction === '1' ||
      originalProperty.is_auction === true;
    const lockedAuctionStartDateForEdit = isOriginalAuction
      ? (originalProperty.auction_start_date || null)
      : null;
    
    // Парсим JSON поля
    let parsedPhotos = [];
    let parsedVideos = [];
    let parsedAdditionalDocuments = [];
    
    try {
      if (photos && typeof photos === 'string') {
        parsedPhotos = JSON.parse(photos);
      } else if (Array.isArray(photos)) {
        parsedPhotos = photos;
      }
      
      if (videos && typeof videos === 'string') {
        parsedVideos = JSON.parse(videos);
      } else if (Array.isArray(videos)) {
        parsedVideos = videos;
      }
      
      if (additional_documents && typeof additional_documents === 'string') {
        parsedAdditionalDocuments = JSON.parse(additional_documents);
      } else if (Array.isArray(additional_documents)) {
        parsedAdditionalDocuments = additional_documents;
      }
    } catch (parseError) {
      console.warn('⚠️ Ошибка парсинга JSON для медиа:', parseError.message);
    }

    const parseJsonObjectOrArraySafe = (value, fallback) => {
      if (value == null || value === '') return fallback
      if (typeof value === 'object') return value
      if (typeof value !== 'string') return fallback
      try {
        return JSON.parse(value)
      } catch {
        return fallback
      }
    }
    const parsedTzAmenities = parseJsonObjectOrArraySafe(tz_amenities_json, [])
    const parsedTzParameters = parseJsonObjectOrArraySafe(tz_parameters_json, {})

    parsedPhotos = normalizePhotosListInput(parsedPhotos);
    
    // Обрабатываем координаты
    let coordinatesStr = null;
    if (coordinates) {
      try {
        coordinatesStr = typeof coordinates === 'string' ? coordinates : JSON.stringify(coordinates);
      } catch (e) {
        console.warn('⚠️ Ошибка обработки координат:', e);
      }
    }
    
    // Обрабатываем test_drive_data
    let testDriveDataStr = null;
    if (test_drive_data) {
      try {
        testDriveDataStr = typeof test_drive_data === 'string' 
          ? test_drive_data 
          : JSON.stringify(test_drive_data);
      } catch (e) {
        console.warn('⚠️ Ошибка обработки test_drive_data:', e);
      }
    }
    
    // Обрабатываем документы
    let ownershipDocumentPath = originalProperty.ownership_document;
    let noDebtsDocumentPath = originalProperty.no_debts_document;
    
    if (req.files) {
      if (req.files['ownership_document'] && req.files['ownership_document'][0]) {
        ownershipDocumentPath = `/uploads/${req.files['ownership_document'][0].filename}`;
      }
      if (req.files['no_debts_document'] && req.files['no_debts_document'][0]) {
        noDebtsDocumentPath = `/uploads/${req.files['no_debts_document'][0].filename}`;
      }
    }

    // Документы по долгу: обновляем у оригинального объекта (6 категорий, несколько файлов в каждой)
    if (isDebtEdit && req.files) {
      try {
        await debtDocumentQueries.deleteByProperty(originalPropertyId, originalProperty.property_type);
        for (const fieldName of debtDocFieldNames) {
          const docType = fieldName.replace('debt_doc_', '');
          const files = req.files[fieldName];
          if (files && Array.isArray(files)) {
            for (const file of files) {
              await debtDocumentQueries.insert(originalPropertyId, originalProperty.property_type, docType, `/uploads/${file.filename}`, file.originalname || null);
            }
          }
        }
      } catch (docErr) {
        console.warn('⚠️ Ошибка сохранения документов долга при обновлении:', docErr.message);
      }
    }
    
    // Формируем location
    let finalLocation = location || '';
    if (!finalLocation && (address || apartment || city || country)) {
      const locationParts = [];
      if (address) locationParts.push(address);
      if (city) locationParts.push(city);
      if (country) locationParts.push(country);
      if (locationParts.length > 0) {
        finalLocation = locationParts.join(', ');
      }
    }
    
    const parseStoredJsonArraySafe = (value) => {
      if (Array.isArray(value)) return value;
      if (value === null || value === undefined) return [];
      if (typeof value !== 'string') return [];
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const stringifyTestDriveDataForLegacy = (value) => {
      if (value == null || value === '') return null;
      if (typeof value === 'string') return value;
      try {
        return JSON.stringify(value);
      } catch {
        return null;
      }
    };

    // Если это редактирование, создаем новую запись с пометкой
    if (isEdit) {
      const prisma = getPrisma();

      const existingEditRequest = await prisma.properties.findFirst({
        where: {
          moderation_status: 'pending',
          rejection_reason: { startsWith: `EDIT:${originalPropertyId}` },
        },
      });
      if (existingEditRequest) {
        return res.status(400).json({
          success: false,
          error: 'Изменения уже отправлены на модерацию. Дождитесь решения модератора.',
        });
      }

      // Создаем новую запись с данными изменений
      // Используем rejection_reason для хранения original_property_id
      const normalizedUserId = (() => {
        const fromRequest = parseInt(String(user_id ?? '').trim(), 10);
        if (Number.isFinite(fromRequest) && fromRequest > 0) return fromRequest;
        const fromOriginal = parseInt(String(originalProperty.user_id ?? '').trim(), 10);
        if (Number.isFinite(fromOriginal) && fromOriginal > 0) return fromOriginal;
        return null;
      })();

      if (!normalizedUserId) {
        return res.status(400).json({
          success: false,
          error: 'Некорректный user_id для редактирования объявления'
        });
      }

      const values = [
        normalizedUserId,
        property_type || originalProperty.property_type,
        title || originalProperty.title,
        description !== undefined ? description : originalProperty.description,
        price ? parseFloat(price) : originalProperty.price,
        currency || originalProperty.currency,
        normalizedIsAuction,
        lockedAuctionStartDateForEdit ?? (auction_start_date || originalProperty.auction_start_date),
        auction_end_date || originalProperty.auction_end_date,
        auction_starting_price ? parseFloat(auction_starting_price) : originalProperty.auction_starting_price,
        minimum_sale_price !== undefined &&
        minimum_sale_price !== null &&
        minimum_sale_price !== '' &&
        !Number.isNaN(parseFloat(String(minimum_sale_price))) &&
        parseFloat(String(minimum_sale_price)) > 0
          ? parseFloat(String(minimum_sale_price))
          : (originalProperty.minimum_sale_price != null &&
              !Number.isNaN(parseFloat(String(originalProperty.minimum_sale_price)))
              ? parseFloat(String(originalProperty.minimum_sale_price))
              : null),
        area ? parseFloat(area) : originalProperty.area,
        living_area ? parseFloat(living_area) : originalProperty.living_area,
        building_type || originalProperty.building_type,
        rooms ? parseInt(rooms) : originalProperty.rooms,
        // Важно: проверяем на undefined/null/пустую строку, а не на truthiness, чтобы 0 сохранялся как 0
        (() => {
          if (bedrooms !== undefined && bedrooms !== null && bedrooms !== '') {
            const parsedBedrooms = parseInt(bedrooms, 10);
            // Проверяем, что parseInt вернул валидное число (не NaN)
            return (!isNaN(parsedBedrooms) && isFinite(parsedBedrooms)) ? parsedBedrooms : originalProperty.bedrooms;
          }
          return originalProperty.bedrooms;
        })(),
        bathrooms ? parseInt(bathrooms) : originalProperty.bathrooms,
        floor ? parseInt(floor) : originalProperty.floor,
        // Для домов/вилл используем floors, для квартир/апартаментов - total_floors
        total_floors ? parseInt(total_floors) : ((originalProperty.property_type === 'house' || originalProperty.property_type === 'villa') 
          ? (originalProperty.floors || originalProperty.total_floors) 
          : originalProperty.total_floors),
        year_built ? parseInt(year_built) : originalProperty.year_built,
        finalLocation || originalProperty.location,
        balcony === '1' || balcony === 1 || (typeof balcony === 'boolean' && balcony) ? 1 : 0,
        parking === '1' || parking === 1 || (typeof parking === 'boolean' && parking) ? 1 : 0,
        elevator === '1' || elevator === 1 || (typeof elevator === 'boolean' && elevator) ? 1 : 0,
        land_area ? parseFloat(land_area) : originalProperty.land_area,
        garage === '1' || garage === 1 || (typeof garage === 'boolean' && garage) ? 1 : 0,
        pool === '1' || pool === 1 || (typeof pool === 'boolean' && pool) ? 1 : 0,
        garden === '1' || garden === 1 || (typeof garden === 'boolean' && garden) ? 1 : 0,
        commercial_type || originalProperty.commercial_type,
        business_hours || originalProperty.business_hours,
        renovation || originalProperty.renovation,
        condition || originalProperty.condition,
        heating || originalProperty.heating,
        water_supply || originalProperty.water_supply,
        sewerage || originalProperty.sewerage,
        electricity === '1' || electricity === 1 || (typeof electricity === 'boolean' && electricity) ? 1 : 0,
        internet === '1' || internet === 1 || (typeof internet === 'boolean' && internet) ? 1 : 0,
        security === '1' || security === 1 || (typeof security === 'boolean' && security) ? 1 : 0,
        furniture === '1' || furniture === 1 || (typeof furniture === 'boolean' && furniture) ? 1 : 0,
        JSON.stringify(parsedPhotos.length > 0 ? parsedPhotos : parseStoredJsonArraySafe(originalProperty.photos)),
        JSON.stringify(parsedVideos.length > 0 ? parsedVideos : parseStoredJsonArraySafe(originalProperty.videos)),
        JSON.stringify(parsedAdditionalDocuments.length > 0 ? parsedAdditionalDocuments : parseStoredJsonArraySafe(originalProperty.additional_documents)),
        additional_amenities || originalProperty.additional_amenities,
        JSON.stringify(
          Array.isArray(parsedTzAmenities)
            ? parsedTzAmenities
            : parseJsonObjectOrArraySafe(originalProperty.tz_amenities_json, [])
        ),
        JSON.stringify(
          parsedTzParameters && typeof parsedTzParameters === 'object'
            ? parsedTzParameters
            : parseJsonObjectOrArraySafe(originalProperty.tz_parameters_json, {})
        ),
        ownershipDocumentPath,
        noDebtsDocumentPath,
        normalizedTestDriveEdit !== undefined ? normalizedTestDriveEdit : (originalProperty.test_drive !== undefined && originalProperty.test_drive !== null ? originalProperty.test_drive : 0),
        stringifyTestDriveDataForLegacy(testDriveDataStr || originalProperty.test_drive_data),
        'pending', // Статус модерации для изменений
        `EDIT:${originalPropertyId}` // Сохраняем ID оригинального объекта в rejection_reason
      ];
      
      // Редактирование: блок цен на фронте заблокирован — правила 30%/90% только для новых публикаций (POST).
      const normalizeMoneyField = (v) => {
        if (v === undefined || v === null || String(v).trim() === '') return null;
        const n = parseFloat(String(v).replace(/,/g, ''));
        return Number.isFinite(n) && n > 0 ? n : null;
      };
      const effectiveBuyNow =
        normalizeMoneyField(price) ?? normalizeMoneyField(originalProperty.price);
      const effectiveStarting =
        normalizeMoneyField(auction_starting_price) ??
        normalizeMoneyField(originalProperty.auction_starting_price);

      const candidateTestDrive =
        normalizedTestDriveEdit !== undefined
          ? normalizedTestDriveEdit
          : (originalProperty.test_drive !== undefined && originalProperty.test_drive !== null
              ? originalProperty.test_drive
              : 0);
      const testDriveOn =
        candidateTestDrive === 1 ||
        candidateTestDrive === true ||
        candidateTestDrive === '1';
      const tdListingRow = {
        sale_type: originalProperty.sale_type,
        is_debt: originalProperty.is_debt,
        has_debt: originalProperty.has_debt,
        is_shared_ownership: originalProperty.is_shared_ownership,
        is_auction: normalizedIsAuction,
        price: effectiveBuyNow,
        auction_starting_price: effectiveStarting,
      };
      if (testDriveOn && !propertyRowAllowsTestDriveListing(tdListingRow)) {
        return res.status(400).json({
          success: false,
          error:
            'Тест-драйв доступен только в формате «Аукцион + Продать сейчас»: цена мгновенной покупки должна быть выше стартовой ставки.',
        });
      }

      const created = await prisma.properties.create({
        data: {
          user_id: values[0],
          property_type: values[1],
          title: values[2],
          description: values[3],
          price: values[4],
          currency: values[5],
          is_auction: values[6],
          auction_start_date: values[7],
          auction_end_date: values[8],
          auction_starting_price: values[9],
          minimum_sale_price: values[10],
          area: values[11],
          living_area: values[12],
          building_type: values[13],
          rooms: values[14] ?? null,
          bedrooms: values[15] ?? null,
          bathrooms: values[16] ?? null,
          floor: values[17] ?? null,
          total_floors: values[18] ?? null,
          year_built: values[19] ?? null,
          location: values[20],
          balcony: values[21],
          parking: values[22],
          elevator: values[23],
          land_area: values[24] ?? null,
          garage: values[25],
          pool: values[26],
          garden: values[27],
          commercial_type: values[28],
          business_hours: values[29],
          renovation: values[30],
          condition: values[31],
          heating: values[32],
          water_supply: values[33],
          sewerage: values[34],
          electricity: values[35],
          internet: values[36],
          security: values[37],
          furniture: values[38],
          photos: values[39],
          videos: values[40],
          additional_documents: values[41],
          additional_amenities: values[42],
          tz_amenities_json: values[43],
          tz_parameters_json: values[44],
          ownership_document: values[45],
          no_debts_document: values[46],
          test_drive: values[47],
          test_drive_data: values[48],
          moderation_status: values[49],
          rejection_reason: values[50],
        },
      });
      const newPropertyId = created.id;
      
      console.log(`✅ Создана новая запись для редактирования. ID новой записи: ${newPropertyId}, ID оригинала: ${originalPropertyId}`);
      
      // Получаем созданную запись
      const newProperty = await prisma.properties.findUnique({ where: { id: Number(newPropertyId) } });
      
      // Мгновенно обновляем кабинет продавца: изменения ушли на модерацию.
      try {
        const ownerId = newProperty?.user_id ?? originalProperty?.user_id;
        if (ownerId) {
          broadcastUserCabinetEvent(ownerId, {
            type: 'property_moderation',
            property_id: Number(originalPropertyId),
            moderation_status: 'pending',
            property_type: newProperty?.property_type || originalProperty?.property_type
          });
          broadcastUserCabinetEvent(ownerId, { type: 'notifications_refresh' });
        }
      } catch (cabErr) {
        console.warn('[SSE] user cabinet (property edit pending):', cabErr?.message || cabErr);
      }
      
      res.json({
        success: true,
        data: newProperty,
        message: 'Изменения отправлены на модерацию',
        is_edit: true,
        original_property_id: originalPropertyId
      });
    } else {
      // Обычное обновление (если не режим редактирования)
      return res.status(400).json({
        success: false,
        error: 'Используйте POST для создания нового объявления'
      });
    }
  } catch (error) {
    console.error('❌ Ошибка при обновлении объявления:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка при обновлении объявления'
    });
  }
});

/**
 * GET /api/properties/pending - Получить все объявления на модерации
 * ВАЖНО: Этот маршрут должен быть ПЕРЕД /api/properties/:id, иначе "pending" будет интерпретироваться как ID
 */
app.get('/api/properties/pending', async (req, res) => {
  try {
    console.log('📥 Запрос объявлений на модерации');
    
    // Используем функцию из propertyQueries, которая работает с новыми таблицами
    const properties = await propertyQueries.getPending();

    console.log(`✅ Найдено объявлений на модерации: ${properties.length}`);
    if (properties.length > 0) {
      console.log('📋 ID объявлений:', properties.map(p => p.id).join(', '));
      console.log('📋 Статусы:', properties.map(p => p.moderation_status).join(', '));
    }

    // Парсим JSON поля (если еще не распарсены)
    const formattedProperties = properties.map(prop => {
      const formatted = { ...prop };
      if (formatted.photos && typeof formatted.photos === 'string') {
        try {
          formatted.photos = JSON.parse(formatted.photos);
        } catch (e) {
          formatted.photos = [];
        }
      } else if (!formatted.photos) {
        formatted.photos = [];
      }
      if (formatted.videos && typeof formatted.videos === 'string') {
        try {
          formatted.videos = JSON.parse(formatted.videos);
        } catch (e) {
          formatted.videos = [];
        }
      } else if (!formatted.videos) {
        formatted.videos = [];
      }
      
      // Парсим amenities (JSON массив удобств)
      let amenitiesArray = [];
      if (formatted.amenities && typeof formatted.amenities === 'string') {
        try {
          amenitiesArray = JSON.parse(formatted.amenities);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга amenities для property ID', formatted.id, ':', e.message);
          amenitiesArray = [];
        }
      } else if (Array.isArray(formatted.amenities)) {
        // Уже массив, оставляем как есть
        amenitiesArray = formatted.amenities;
      } else if (!formatted.amenities) {
        amenitiesArray = [];
      }
      
      // Сохраняем массив amenities
      formatted.amenities = amenitiesArray;
      
      // Преобразуем массив amenities в отдельные булевы поля для фронтенда
      formatted.balcony = amenitiesArray.includes('balcony') || formatted.balcony === 1 || formatted.balcony === true;
      formatted.parking = amenitiesArray.includes('parking') || formatted.parking === 1 || formatted.parking === true;
      formatted.elevator = amenitiesArray.includes('elevator') || formatted.elevator === 1 || formatted.elevator === true;
      formatted.electricity = amenitiesArray.includes('electricity') || formatted.electricity === 1 || formatted.electricity === true;
      formatted.internet = amenitiesArray.includes('internet') || formatted.internet === 1 || formatted.internet === true;
      formatted.security = amenitiesArray.includes('security') || formatted.security === 1 || formatted.security === true;
      formatted.furniture = amenitiesArray.includes('furniture') || formatted.furniture === 1 || formatted.furniture === true;
      
      // Обрабатываем feature поля (feature1, feature2, ...)
      for (let i = 1; i <= 26; i++) {
        const featureKey = `feature${i}`;
        formatted[featureKey] = amenitiesArray.includes(featureKey) || formatted[featureKey] === 1 || formatted[featureKey] === true;
      }
      
      // Для домов/вилл маппим floors в total_floors и добавляем удобства
      if (formatted.property_type === 'house' || formatted.property_type === 'villa') {
        if (formatted.floors !== undefined && formatted.floors !== null) {
          formatted.total_floors = formatted.floors;
        }
        // Добавляем удобства для домов/вилл из amenities массива
        formatted.pool = amenitiesArray.includes('pool') || formatted.pool === 1 || formatted.pool === true;
        formatted.garden = amenitiesArray.includes('garden') || formatted.garden === 1 || formatted.garden === true;
        formatted.garage = amenitiesArray.includes('garage') || formatted.garage === 1 || formatted.garage === true;
        // Убеждаемся, что land_area передается
        formatted.land_area = formatted.land_area || null;
      }
      
      // additional_amenities - это текстовое поле
      if (formatted.additional_amenities === undefined) {
        formatted.additional_amenities = null;
      }
      if (formatted.additional_documents && typeof formatted.additional_documents === 'string') {
        try {
          formatted.additional_documents = JSON.parse(formatted.additional_documents);
        } catch (e) {
          formatted.additional_documents = [];
        }
      } else if (!formatted.additional_documents) {
        formatted.additional_documents = [];
      }
      if (formatted.test_drive_data && typeof formatted.test_drive_data === 'string') {
        try {
          formatted.test_drive_data = JSON.parse(formatted.test_drive_data);
        } catch (e) {
          formatted.test_drive_data = null;
        }
      }
      formatted.name = formatted.title || formatted.name || '';
      applyListingPhotosToFormatted(formatted);
      applyFormattedPropertyAmenities(formatted);
      return formatted;
    });

    res.json({ success: true, data: formattedProperties });
  } catch (error) {
    console.error('Ошибка при получении объявлений на модерации:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/properties/approved - Получить одобренные объявления без аукциона
 * ВАЖНО: Этот маршрут должен быть ПЕРЕД /api/properties/:id, иначе он будет перехвачен
 */
app.get('/api/properties/approved', async (req, res) => {
  try {
    const { type } = req.query; // Опциональный фильтр по типу
    
    // Используем функцию из propertyQueries, которая работает с новыми таблицами
    const properties = await propertyQueries.getApproved(type || null);

    if (VERBOSE_HTTP) {
      console.log(`✅ Получено одобренных объявлений: ${properties.length}, фильтр type=${type || 'null'}`);
    }
    
    // Преобразуем данные в формат для фронтенда (возвращаем ВСЕ поля)
    const formattedProperties = properties.map(prop => {
      const formatted = { ...prop };
      
      // Парсим JSON поля безопасно
      if (formatted.photos && typeof formatted.photos === 'string') {
        try {
          formatted.photos = JSON.parse(formatted.photos);
        } catch (e) {
          formatted.photos = [];
        }
      } else if (!formatted.photos) {
        formatted.photos = [];
      }
      
      if (formatted.videos && typeof formatted.videos === 'string') {
        try {
          formatted.videos = JSON.parse(formatted.videos);
        } catch (e) {
          formatted.videos = [];
        }
      } else if (!formatted.videos) {
        formatted.videos = [];
      }
      
      // Парсим amenities (JSON массив удобств)
      // Проверяем, нужно ли парсить (если это строка, значит еще не распарсено)
      let amenitiesArray = [];
      if (formatted.amenities && typeof formatted.amenities === 'string') {
        try {
          amenitiesArray = JSON.parse(formatted.amenities);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга amenities для property ID', formatted.id, ':', e.message);
          amenitiesArray = [];
        }
      } else if (Array.isArray(formatted.amenities)) {
        // Уже массив, оставляем как есть
        amenitiesArray = formatted.amenities;
      } else if (!formatted.amenities) {
        amenitiesArray = [];
      }
      
      // Сохраняем массив amenities
      formatted.amenities = amenitiesArray;
      
      // Преобразуем массив amenities в отдельные булевы поля для фронтенда
      // (так как фронтенд ожидает отдельные поля, а не массив)
      formatted.balcony = amenitiesArray.includes('balcony') || formatted.balcony === 1 || formatted.balcony === true;
      formatted.parking = amenitiesArray.includes('parking') || formatted.parking === 1 || formatted.parking === true;
      formatted.elevator = amenitiesArray.includes('elevator') || formatted.elevator === 1 || formatted.elevator === true;
      formatted.electricity = amenitiesArray.includes('electricity') || formatted.electricity === 1 || formatted.electricity === true;
      formatted.internet = amenitiesArray.includes('internet') || formatted.internet === 1 || formatted.internet === true;
      formatted.security = amenitiesArray.includes('security') || formatted.security === 1 || formatted.security === true;
      formatted.furniture = amenitiesArray.includes('furniture') || formatted.furniture === 1 || formatted.furniture === true;
      
      // Обрабатываем feature поля (feature1, feature2, ...)
      for (let i = 1; i <= 26; i++) {
        const featureKey = `feature${i}`;
        formatted[featureKey] = amenitiesArray.includes(featureKey) || formatted[featureKey] === 1 || formatted[featureKey] === true;
      }
      
      // additional_amenities - это текстовое поле, которое пользователь вводит сам
      // Убеждаемся, что оно всегда возвращается (даже если null или пустое)
      // Не парсим как JSON, это просто текст
      if (formatted.additional_amenities === undefined || formatted.additional_amenities === null) {
        // Если undefined или null, оставляем null (не пустую строку, чтобы фронтенд мог проверить)
        formatted.additional_amenities = formatted.additional_amenities || null;
      } else if (typeof formatted.additional_amenities === 'string' && formatted.additional_amenities.trim() === '') {
        // Если пустая строка, оставляем как есть (может быть важно для фронтенда)
        formatted.additional_amenities = formatted.additional_amenities;
      }
      // Если это непустая строка, оставляем как есть
      
      if (formatted.coordinates && typeof formatted.coordinates === 'string') {
        try {
          if (formatted.coordinates.startsWith('[') || formatted.coordinates.startsWith('{')) {
            formatted.coordinates = JSON.parse(formatted.coordinates);
          } else {
            formatted.coordinates = formatted.coordinates.split(',').map(Number);
          }
        } catch (e) {
          formatted.coordinates = null;
        }
      }
      
      if (formatted.additional_documents && typeof formatted.additional_documents === 'string') {
        try {
          formatted.additional_documents = JSON.parse(formatted.additional_documents);
        } catch (e) {
          formatted.additional_documents = [];
        }
      } else if (!formatted.additional_documents) {
        formatted.additional_documents = [];
      }
      
      if (formatted.test_drive_data && typeof formatted.test_drive_data === 'string') {
        try {
          formatted.test_drive_data = JSON.parse(formatted.test_drive_data);
        } catch (e) {
          formatted.test_drive_data = null;
        }
      }
      
      // Добавляем дополнительные поля для обратной совместимости
      formatted.name = formatted.title;
      applyListingPhotosToFormatted(formatted);
      formatted.owner = {
        firstName: formatted.first_name || '',
        lastName: formatted.last_name || '',
        email: formatted.email || ''
      };
      // Для домов/вилл используем bedrooms, для квартир/апартаментов - rooms или bedrooms
      if (formatted.property_type === 'house' || formatted.property_type === 'villa') {
        formatted.beds = formatted.bedrooms || 0;
        // Для домов/вилл маппим floors в total_floors для совместимости с фронтендом
        if (formatted.floors !== undefined && formatted.floors !== null) {
          formatted.total_floors = formatted.floors;
        }
        // Добавляем удобства для домов/вилл из amenities массива
        if (Array.isArray(formatted.amenities)) {
          formatted.pool = formatted.amenities.includes('pool') || formatted.pool === 1 || formatted.pool === true;
          formatted.garden = formatted.amenities.includes('garden') || formatted.garden === 1 || formatted.garden === true;
          formatted.garage = formatted.amenities.includes('garage') || formatted.garage === 1 || formatted.garage === true;
        }
        // Убеждаемся, что land_area передается
        formatted.land_area = formatted.land_area || null;
      } else {
        // Для квартир/апартаментов используем rooms или bedrooms
        formatted.beds = formatted.bedrooms || formatted.rooms || 0;
      }
      
      formatted.baths = formatted.bathrooms || 0;
      formatted.sqft = formatted.area || 0;
      formatted.hasSamolyot = false;
      formatted.isAuction = false;
      formatted.currentBid = null;
      formatted.endTime = null;
      
      // Устанавливаем tag для правильного отображения на фронтенде
      formatted.tag = formatted.property_type === 'apartment' ? 'apartment' : 
                      formatted.property_type === 'villa' ? 'villa' : 
                      formatted.property_type === 'house' ? 'house' : 
                      formatted.property_type === 'commercial' ? 'apartment' : 'apartment';
      
      return formatted;
    });
    
    // Подстановка переводов по языку (lang из футера) — один батч-запрос вместо N findUnique
    const lang = req.query.lang && String(req.query.lang).trim().toLowerCase();
    if (lang && formattedProperties.length > 0) {
      try {
        await mergePropertyTranslations(formattedProperties, lang);
      } catch (e) {
        console.warn('GET /api/properties/approved - подстановка переводов:', e.message);
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=20, stale-while-revalidate=120');
    res.json({
      success: true,
      data: formattedProperties
    });
  } catch (error) {
    console.error('Ошибка при получении одобренных объявлений:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/properties/debts - Получить одобренные объекты-долги (включая аукционные долги)
 * ВАЖНО: Этот маршрут должен быть ПЕРЕД /api/properties/:id, иначе он будет перехвачен
 */
app.get('/api/properties/debts', async (req, res) => {
  try {
    const { type } = req.query;
    const properties = await propertyQueries.getDebts(type || null);

    // Приводим к формату, который ожидают страницы (как и /approved)
    const formattedProperties = properties.map((prop) => {
      const formatted = { ...prop };

      if (formatted.photos && typeof formatted.photos === 'string') {
        try { formatted.photos = JSON.parse(formatted.photos); } catch { formatted.photos = []; }
      } else if (!formatted.photos) {
        formatted.photos = [];
      }

      if (formatted.videos && typeof formatted.videos === 'string') {
        try { formatted.videos = JSON.parse(formatted.videos); } catch { formatted.videos = []; }
      } else if (!formatted.videos) {
        formatted.videos = [];
      }

      if (formatted.additional_documents && typeof formatted.additional_documents === 'string') {
        try { formatted.additional_documents = JSON.parse(formatted.additional_documents); } catch { formatted.additional_documents = []; }
      } else if (!formatted.additional_documents) {
        formatted.additional_documents = [];
      }

      if (formatted.amenities && typeof formatted.amenities === 'string') {
        try { formatted.amenities = JSON.parse(formatted.amenities); } catch { formatted.amenities = []; }
      } else if (!formatted.amenities) {
        formatted.amenities = [];
      }

      // Обратная совместимость
      formatted.name = formatted.title;
      applyListingPhotosToFormatted(formatted);

      return formatted;
    });

    res.setHeader('Cache-Control', 'public, max-age=20, stale-while-revalidate=120');
    res.json({ success: true, data: formattedProperties });
  } catch (error) {
    console.error('Ошибка при получении объектов-долгов:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/properties/search-options — страны/регионы и диапазон цен по реальным объявлениям
 */
app.get('/api/properties/search-options', async (req, res) => {
  try {
    const [approved, auctions, debts, shares] = await Promise.all([
      propertyQueries.getApproved(),
      propertyQueries.getAuctions(),
      propertyQueries.getDebts(),
      propertyQueries.getShares(10000, 0),
    ]);
    const data = await buildPropertySearchOptionsWithBids([
      ...approved,
      ...auctions,
      ...debts,
      ...shares,
    ]);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.json({ success: true, data });
  } catch (error) {
    console.error('Ошибка search-options:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Форматирует один объект аукциона в формат API (для SSE broadcast и повторного использования).
 */
async function formatOneAuctionPropertyForApi(prop) {
  const formatted = { ...prop };
  if (formatted.photos && typeof formatted.photos === 'string') {
    try { formatted.photos = JSON.parse(formatted.photos); } catch (e) { formatted.photos = []; }
  } else if (!formatted.photos) formatted.photos = [];
  if (formatted.videos && typeof formatted.videos === 'string') {
    try { formatted.videos = JSON.parse(formatted.videos); } catch (e) { formatted.videos = []; }
  } else if (!formatted.videos) formatted.videos = [];
  let amenitiesArray = [];
  if (formatted.amenities && typeof formatted.amenities === 'string') {
    try { amenitiesArray = JSON.parse(formatted.amenities); } catch (e) { amenitiesArray = []; }
  } else if (Array.isArray(formatted.amenities)) amenitiesArray = formatted.amenities;
  formatted.amenities = amenitiesArray;
  formatted.balcony = amenitiesArray.includes('balcony') || formatted.balcony === 1 || formatted.balcony === true;
  formatted.parking = amenitiesArray.includes('parking') || formatted.parking === 1 || formatted.parking === true;
  formatted.elevator = amenitiesArray.includes('elevator') || formatted.elevator === 1 || formatted.elevator === true;
  formatted.electricity = amenitiesArray.includes('electricity') || formatted.electricity === 1 || formatted.electricity === true;
  formatted.internet = amenitiesArray.includes('internet') || formatted.internet === 1 || formatted.internet === true;
  formatted.security = amenitiesArray.includes('security') || formatted.security === 1 || formatted.security === true;
  formatted.furniture = amenitiesArray.includes('furniture') || formatted.furniture === 1 || formatted.furniture === true;
  for (let i = 1; i <= 26; i++) {
    const featureKey = `feature${i}`;
    formatted[featureKey] = amenitiesArray.includes(featureKey) || formatted[featureKey] === 1 || formatted[featureKey] === true;
  }
  if (formatted.additional_amenities === undefined || formatted.additional_amenities === null) formatted.additional_amenities = formatted.additional_amenities || null;
  if (formatted.coordinates && typeof formatted.coordinates === 'string') {
    try {
      if (formatted.coordinates.startsWith('[') || formatted.coordinates.startsWith('{')) formatted.coordinates = JSON.parse(formatted.coordinates);
      else formatted.coordinates = formatted.coordinates.split(',').map(Number);
    } catch (e) { formatted.coordinates = null; }
  }
  if (formatted.additional_documents && typeof formatted.additional_documents === 'string') {
    try { formatted.additional_documents = JSON.parse(formatted.additional_documents); } catch (e) { formatted.additional_documents = []; }
  } else if (!formatted.additional_documents) formatted.additional_documents = [];
  if (formatted.test_drive_data && typeof formatted.test_drive_data === 'string') {
    try { formatted.test_drive_data = JSON.parse(formatted.test_drive_data); } catch (e) { formatted.test_drive_data = null; }
  }
  formatted.name = formatted.title;
  applyListingPhotosToFormatted(formatted);
  formatted.owner = { firstName: formatted.first_name || '', lastName: formatted.last_name || '', email: formatted.email || '' };
  if (formatted.property_type === 'house' || formatted.property_type === 'villa') {
    formatted.beds = formatted.bedrooms || 0;
    formatted.rooms = formatted.bedrooms || 0;
  } else {
    formatted.beds = formatted.bedrooms || formatted.rooms || 0;
    formatted.rooms = formatted.bedrooms || formatted.rooms || 0;
  }
  formatted.baths = formatted.bathrooms || 0;
  formatted.sqft = formatted.area || 0;
  formatted.hasSamolyot = false;
  formatted.isAuction = true;
  formatted.currentBid = formatted.auction_starting_price || formatted.price || 0;
  formatted.endTime = formatted.test_timer_end_date || formatted.auction_end_date || null;
  formatted.originalPrice = formatted.price || null;
  formatted.auctionStartingPrice = formatted.auction_starting_price || null;
  formatted.tag = formatted.property_type === 'apartment' ? 'apartment' : formatted.property_type === 'villa' ? 'villa' : formatted.property_type === 'house' ? 'house' : formatted.property_type === 'commercial' ? 'apartment' : 'apartment';
  if (formatted.property_type === 'house' || formatted.property_type === 'villa') {
    if (formatted.floors !== undefined && formatted.floors !== null) formatted.total_floors = formatted.floors;
    if (Array.isArray(formatted.amenities)) {
      formatted.pool = formatted.amenities.includes('pool') || formatted.pool === 1 || formatted.pool === true;
      formatted.garden = formatted.amenities.includes('garden') || formatted.garden === 1 || formatted.garden === true;
      formatted.garage = formatted.amenities.includes('garage') || formatted.garage === 1 || formatted.garage === true;
    }
    formatted.land_area = formatted.land_area || null;
  }
  try {
    const reservationInfo = await propertyQueries.isReserved(formatted.id);
    formatted.is_reserved = reservationInfo.isReserved || false;
    formatted.reserved_until = reservationInfo.reservedUntil || null;
    formatted.reserved_by = reservationInfo.reservedBy || null;
  } catch (e) {
    formatted.is_reserved = false;
    formatted.reserved_until = null;
    formatted.reserved_by = null;
  }
  return formatted;
}

/** id уникален только внутри таблицы квартир/домов — нельзя схлопывать строки только по числовому id. */
function auctionListRowDedupeKey(p) {
  if (!p || p.id == null) return `unknown:${Math.random().toString(36).slice(2)}`;
  const idPart = String(p.id).trim();
  const st = String(p.source_table || '').toLowerCase();
  if (st.includes('house')) return `houses:${idPart}`;
  if (st.includes('apartment') || st === 'apt') return `apartments:${idPart}`;
  const pt = String(p.property_type || '').toLowerCase();
  if (pt === 'house' || pt === 'villa') return `houses:${idPart}`;
  if (pt === 'apartment' || pt === 'commercial') return `apartments:${idPart}`;
  return `id:${idPart}`;
}

/**
 * GET /api/properties/auctions - Получить одобренные объявления с аукционом
 * ВАЖНО: Этот маршрут должен быть ПЕРЕД /api/properties/:id, иначе он будет перехвачен
 */
app.get('/api/properties/auctions', async (req, res) => {
  try {
    const { type } = req.query; // Опциональный фильтр по типу
    const viewerRaw = req.query.viewer_user_id;
    const viewerId = viewerRaw != null && String(viewerRaw).trim() !== '' ? Number(viewerRaw) : NaN;
    const includePrivateClubListings =
      Number.isFinite(viewerId) &&
      viewerId >= 1 &&
      (await userQueries.hasPrivateClubVipAccess(viewerId));
    const hidePrivateClubOnly = !includePrivateClubListings;

    // Используем функцию из propertyQueries, которая работает с новыми таблицами
    let properties = await propertyQueries.getAuctions(type || null, {
      hidePrivateClubOnly,
      viewerUserId: Number.isFinite(viewerId) && viewerId >= 1 ? viewerId : null,
    });

    if (VERBOSE_HTTP) {
      console.log(`✅ Получено аукционных объявлений: ${properties.length}`);
    }
    
    const prisma = getPrisma();
    const timerWhereBase = {
      moderation_status: 'approved',
      test_timer_end_date: { not: null },
      NOT: { test_timer_end_date: '' },
      AND: [
        { OR: [{ sale_type: null }, { sale_type: { not: 'debt' } }] },
        { OR: [{ is_debt: null }, { is_debt: 0 }] },
        { OR: [{ has_debt: null }, { has_debt: 0 }] },
      ],
    };
    if (hidePrivateClubOnly) {
      if (Number.isFinite(viewerId) && viewerId >= 1) {
        timerWhereBase.AND.push({
          OR: [{ private_club_only: null }, { private_club_only: 0 }, { user_id: viewerId }],
        });
      } else {
        timerWhereBase.AND.push({
          OR: [{ private_club_only: null }, { private_club_only: 0 }],
        });
      }
    }
    const timerWhereApartments = { ...timerWhereBase };
    const timerWhereHouses = { ...timerWhereBase };
    if (type) {
      timerWhereApartments.property_type = String(type);
      timerWhereHouses.property_type = String(type);
    }
    const userSelect = {
      users: {
        select: {
          first_name: true,
          last_name: true,
          email: true,
          phone_number: true,
          role: true,
        },
      },
    };
    const [apartmentsWithTestTimer, housesWithTestTimer] = await Promise.all([
      prisma.properties_apartments.findMany({
        where: timerWhereApartments,
        include: userSelect,
        orderBy: { test_timer_end_date: 'asc' },
      }),
      prisma.properties_houses.findMany({
        where: timerWhereHouses,
        include: userSelect,
        orderBy: { test_timer_end_date: 'asc' },
      }),
    ]);
    
    const apartmentsWithUser = apartmentsWithTestTimer.map((p) => ({
      ...p,
      source_table:
        p.source_table != null && String(p.source_table).trim() !== ''
          ? p.source_table
          : 'apartments',
      first_name: p.users?.first_name || null,
      last_name: p.users?.last_name || null,
      email: p.users?.email || null,
      phone_number: p.users?.phone_number || null,
      role: p.users?.role || null,
    }));
    const housesWithUser = housesWithTestTimer.map((p) => ({
      ...p,
      source_table:
        p.source_table != null && String(p.source_table).trim() !== ''
          ? p.source_table
          : 'houses',
      first_name: p.users?.first_name || null,
      last_name: p.users?.last_name || null,
      email: p.users?.email || null,
      phone_number: p.users?.phone_number || null,
      role: p.users?.role || null,
    }));
    // Объединяем аукционы и тестовые таймеры
    const allProperties = [...properties, ...apartmentsWithUser, ...housesWithUser];
    
    // Удаляем дубликаты одной и той же строки из разных выборок, не смешивая разные таблицы с общим numeric id.
    properties = Array.from(new Map(allProperties.map((pr) => [auctionListRowDedupeKey(pr), pr])).values()).sort(
      (a, b) => {
      const rank = (p) =>
        p?.private_club_only === 1 || p?.private_club_only === true || p?.private_club_only === '1' ? 1 : 0
      const d = rank(b) - rank(a)
      if (d !== 0) return d
      const aDate = a.test_timer_end_date || a.auction_end_date || '';
      const bDate = b.test_timer_end_date || b.auction_end_date || '';
      return new Date(aDate) - new Date(bDate);
    });
    
    // Преобразуем данные в формат для фронтенда (возвращаем ВСЕ поля); резервы — пакетом после map
    const formattedProperties = properties.map((prop) => {
      const formatted = { ...prop };
      
      // Парсим JSON поля безопасно
      if (formatted.photos && typeof formatted.photos === 'string') {
        try {
          formatted.photos = JSON.parse(formatted.photos);
        } catch (e) {
          formatted.photos = [];
        }
      } else if (!formatted.photos) {
        formatted.photos = [];
      }
      
      if (formatted.videos && typeof formatted.videos === 'string') {
        try {
          formatted.videos = JSON.parse(formatted.videos);
        } catch (e) {
          formatted.videos = [];
        }
      } else if (!formatted.videos) {
        formatted.videos = [];
      }
      
      // Парсим amenities (JSON массив удобств)
      // Проверяем, нужно ли парсить (если это строка, значит еще не распарсено)
      let amenitiesArray = [];
      if (formatted.amenities && typeof formatted.amenities === 'string') {
        try {
          amenitiesArray = JSON.parse(formatted.amenities);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга amenities для property ID', formatted.id, ':', e.message);
          amenitiesArray = [];
        }
      } else if (Array.isArray(formatted.amenities)) {
        // Уже массив, оставляем как есть
        amenitiesArray = formatted.amenities;
      } else if (!formatted.amenities) {
        amenitiesArray = [];
      }
      
      // Сохраняем массив amenities
      formatted.amenities = amenitiesArray;
      
      // Преобразуем массив amenities в отдельные булевы поля для фронтенда
      // (так как фронтенд ожидает отдельные поля, а не массив)
      formatted.balcony = amenitiesArray.includes('balcony') || formatted.balcony === 1 || formatted.balcony === true;
      formatted.parking = amenitiesArray.includes('parking') || formatted.parking === 1 || formatted.parking === true;
      formatted.elevator = amenitiesArray.includes('elevator') || formatted.elevator === 1 || formatted.elevator === true;
      formatted.electricity = amenitiesArray.includes('electricity') || formatted.electricity === 1 || formatted.electricity === true;
      formatted.internet = amenitiesArray.includes('internet') || formatted.internet === 1 || formatted.internet === true;
      formatted.security = amenitiesArray.includes('security') || formatted.security === 1 || formatted.security === true;
      formatted.furniture = amenitiesArray.includes('furniture') || formatted.furniture === 1 || formatted.furniture === true;
      
      // Обрабатываем feature поля (feature1, feature2, ...)
      for (let i = 1; i <= 26; i++) {
        const featureKey = `feature${i}`;
        formatted[featureKey] = amenitiesArray.includes(featureKey) || formatted[featureKey] === 1 || formatted[featureKey] === true;
      }
      
      // additional_amenities - это текстовое поле, которое пользователь вводит сам
      // Убеждаемся, что оно всегда возвращается (даже если null или пустое)
      // Не парсим как JSON, это просто текст
      if (formatted.additional_amenities === undefined || formatted.additional_amenities === null) {
        // Если undefined или null, оставляем null (не пустую строку, чтобы фронтенд мог проверить)
        formatted.additional_amenities = formatted.additional_amenities || null;
      } else if (typeof formatted.additional_amenities === 'string' && formatted.additional_amenities.trim() === '') {
        // Если пустая строка, оставляем как есть (может быть важно для фронтенда)
        formatted.additional_amenities = formatted.additional_amenities;
      }
      // Если это непустая строка, оставляем как есть
      
      if (formatted.coordinates && typeof formatted.coordinates === 'string') {
        try {
          if (formatted.coordinates.startsWith('[') || formatted.coordinates.startsWith('{')) {
            formatted.coordinates = JSON.parse(formatted.coordinates);
          } else {
            formatted.coordinates = formatted.coordinates.split(',').map(Number);
          }
        } catch (e) {
          formatted.coordinates = null;
        }
      }
      
      if (formatted.additional_documents && typeof formatted.additional_documents === 'string') {
        try {
          formatted.additional_documents = JSON.parse(formatted.additional_documents);
        } catch (e) {
          formatted.additional_documents = [];
        }
      } else if (!formatted.additional_documents) {
        formatted.additional_documents = [];
      }
      
      if (formatted.test_drive_data && typeof formatted.test_drive_data === 'string') {
        try {
          formatted.test_drive_data = JSON.parse(formatted.test_drive_data);
        } catch (e) {
          formatted.test_drive_data = null;
        }
      }
      
      // Добавляем дополнительные поля для обратной совместимости
      formatted.name = formatted.title;
      applyListingPhotosToFormatted(formatted);
      formatted.owner = {
        firstName: formatted.first_name || '',
        lastName: formatted.last_name || '',
        email: formatted.email || ''
      };
      // Для домов/вилл используем bedrooms, для квартир/апартаментов - rooms или bedrooms
      if (formatted.property_type === 'house' || formatted.property_type === 'villa') {
        formatted.beds = formatted.bedrooms || 0;
        formatted.rooms = formatted.bedrooms || 0; // Для совместимости
      } else {
        formatted.beds = formatted.bedrooms || formatted.rooms || 0;
        formatted.rooms = formatted.bedrooms || formatted.rooms || 0;
      }
      
      formatted.baths = formatted.bathrooms || 0;
      formatted.sqft = formatted.area || 0;
      formatted.hasSamolyot = false;
      formatted.isAuction = true;
      formatted.currentBid = formatted.auction_starting_price || formatted.price || 0;
      formatted.endTime = formatted.test_timer_end_date || formatted.auction_end_date || null;
      formatted.originalPrice = formatted.price || null;
      formatted.auctionStartingPrice = formatted.auction_starting_price || null;
      formatted.tag = formatted.property_type === 'apartment' ? 'apartment' : 
                      formatted.property_type === 'villa' ? 'villa' : 
                      formatted.property_type === 'house' ? 'house' : 
                      formatted.property_type === 'commercial' ? 'apartment' : 'apartment';
      
      // Для домов/вилл маппим floors в total_floors для совместимости с фронтендом
      // и добавляем удобства pool, garden, garage
      if (formatted.property_type === 'house' || formatted.property_type === 'villa') {
        if (formatted.floors !== undefined && formatted.floors !== null) {
          formatted.total_floors = formatted.floors;
        }
        // Добавляем удобства для домов/вилл из amenities массива
        if (Array.isArray(formatted.amenities)) {
          formatted.pool = formatted.amenities.includes('pool') || formatted.pool === 1 || formatted.pool === true;
          formatted.garden = formatted.amenities.includes('garden') || formatted.garden === 1 || formatted.garden === true;
          formatted.garage = formatted.amenities.includes('garage') || formatted.garage === 1 || formatted.garage === true;
        }
        // Убеждаемся, что land_area передается
        formatted.land_area = formatted.land_area || null;
      }

      return formatted;
    });

    try {
      await mergeReservationFields(formattedProperties);
    } catch (reservationError) {
      console.warn('GET /api/properties/auctions - пакетная загрузка резервов:', reservationError);
      for (const f of formattedProperties) {
        f.is_reserved = false;
        f.reserved_until = null;
        f.reserved_by = null;
      }
    }

    if (VERBOSE_HTTP && formattedProperties.length > 0) {
      console.log('📋 Отформатированные данные аукциона (первое объявление):', {
        id: formattedProperties[0].id,
        title: formattedProperties[0].title,
        amenities: formattedProperties[0].amenities,
      });
    }

    try {
      formattedProperties = await enrichListingPropertiesWithMaxBids(prisma, formattedProperties);
    } catch (bidEnrichErr) {
      console.warn('GET /api/properties/auctions — max bids:', bidEnrichErr?.message || bidEnrichErr);
    }

    const lang = req.query.lang && String(req.query.lang).trim().toLowerCase();
    if (lang && formattedProperties.length > 0) {
      try {
        await mergePropertyTranslations(formattedProperties, lang);
      } catch (e) {
        console.warn('GET /api/properties/auctions - подстановка переводов:', e.message);
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=120');
    res.json({
      success: true,
      data: formattedProperties
    });
  } catch (error) {
    console.error('Ошибка при получении аукционных объявлений:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/properties/test-timers - Получить все объявления с тестовыми таймерами
 * ВАЖНО: Этот маршрут должен быть ПЕРЕД /api/properties/:id, иначе он будет перехвачен
 */
app.get('/api/properties/test-timers', async (req, res) => {
  try {
    if (VERBOSE_HTTP) console.log('📥 GET /api/properties/test-timers - Запрос получен');
    const prisma = getPrisma();
    const [apartmentsRows, housesRows] = await Promise.all([
      prisma.properties_apartments.findMany({
        where: {
          test_timer_end_date: { not: null },
          NOT: { test_timer_end_date: '' },
        },
        include: { users: true },
        orderBy: { test_timer_end_date: 'asc' },
      }),
      prisma.properties_houses.findMany({
        where: {
          test_timer_end_date: { not: null },
          NOT: { test_timer_end_date: '' },
        },
        include: { users: true },
        orderBy: { test_timer_end_date: 'asc' },
      }),
    ]);
    const properties = [
      ...apartmentsRows.map((p) => ({
        ...p,
        first_name: p.users?.first_name || null,
        last_name: p.users?.last_name || null,
        email: p.users?.email || null,
        phone_number: p.users?.phone_number || null,
      })),
      ...housesRows.map((p) => ({
        ...p,
        first_name: p.users?.first_name || null,
        last_name: p.users?.last_name || null,
        email: p.users?.email || null,
        phone_number: p.users?.phone_number || null,
      })),
    ];
    
    // Преобразуем данные в формат для фронтенда
    const formattedProperties = properties.map(prop => {
      // Парсим JSON поля
      let photos = [];
      let videos = [];
      
      if (prop.photos) {
        try {
          photos = typeof prop.photos === 'string' ? JSON.parse(prop.photos) : prop.photos;
        } catch (e) {
          photos = [];
        }
      }
      
      if (prop.videos) {
        try {
          videos = typeof prop.videos === 'string' ? JSON.parse(prop.videos) : prop.videos;
        } catch (e) {
          videos = [];
        }
      }
      
      // Определяем property_type в зависимости от таблицы
      let propertyType = prop.property_type;
      if (!propertyType) {
        // Если property_type не указан, определяем по таблице
        // Если есть поле floors (характерно для домов/вилл), это дом или вилла
        if (prop.floors !== undefined || prop.land_area !== undefined) {
          propertyType = prop.property_type || 'house';
        } else {
          propertyType = prop.property_type || 'apartment';
        }
      }
      
      const photosNorm = normalizePhotosListInput(photos);
      return {
        id: prop.id,
        name: prop.title || prop.name || '',
        title: prop.title || prop.name || '',
        location: prop.location || '',
        price: prop.price || 0,
        coordinates: prop.coordinates ? (
          typeof prop.coordinates === 'string' 
            ? (prop.coordinates.startsWith('[') || prop.coordinates.startsWith('{') 
                ? JSON.parse(prop.coordinates) 
                : prop.coordinates.split(',').map(Number))
            : prop.coordinates
        ) : null,
        owner: {
          firstName: prop.first_name || '',
          lastName: prop.last_name || '',
          email: prop.email || ''
        },
        image:
          photosNorm[0] ||
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
        images: photosNorm,
        photos: photosNorm,
        videos: videos || [],
        hasSamolyot: false,
        isAuction: true,
        currentBid: prop.auction_starting_price || prop.price || 0,
        endTime: prop.test_timer_end_date || null,
        test_timer_end_date: prop.test_timer_end_date || null,
        beds: prop.bedrooms || prop.rooms || prop.beds || 0,
        baths: prop.bathrooms || 0,
        sqft: prop.area || prop.sqft || 0,
        area: prop.area || prop.sqft || 0,
        rooms: prop.bedrooms || prop.rooms || prop.beds || 0,
        bedrooms: prop.bedrooms || prop.rooms || prop.beds || 0,
        description: prop.description || '',
        property_type: propertyType,
        currency: prop.currency || 'USD',
        originalPrice: prop.price || null,
        auctionStartingPrice: prop.auction_starting_price || null,
        // Дополнительные поля для домов/вилл
        floors: prop.floors || prop.total_floors || null,
        total_floors: prop.total_floors || prop.floors || null,
        land_area: prop.land_area || null
      };
    });

    res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=120');
    res.json({
      success: true,
      data: formattedProperties
    });
  } catch (error) {
    console.error('Ошибка при получении объявлений с тестовыми таймерами:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/properties/:id/test-timer - Установить тестовый таймер для объявления
 * ВАЖНО: Этот маршрут должен быть ПЕРЕД /api/properties/:id, иначе он будет перехвачен
 */
console.log('📝 Регистрирую маршрут: POST /api/properties/:id/test-timer');
app.post('/api/properties/:id/test-timer', async (req, res) => {
  console.log('🔵🔵🔵 POST /api/properties/:id/test-timer - МАРШРУТ ВЫЗВАН!');
  console.log('🔵 URL:', req.url);
  console.log('🔵 Original URL:', req.originalUrl);
  console.log('🔵 Path:', req.path);
  console.log('🔵 Method:', req.method);
  console.log('🔵 Params:', req.params);
  console.log('🔵 Body:', req.body);
  console.log('🔵 POST /api/properties/:id/test-timer - Маршрут вызван!');
  console.log('🔵 URL:', req.url);
  console.log('🔵 Method:', req.method);
  console.log('🔵 Params:', req.params);
  console.log('🔵 Body:', req.body);
  
  try {
    const { id } = req.params;
    const { test_timer_end_date, test_timer_duration } = req.body;

    console.log('📥 POST /api/properties/:id/test-timer - Запрос:', { id, test_timer_end_date, test_timer_duration });

    if (!test_timer_end_date) {
      return res.status(400).json({ success: false, error: 'Не указана дата окончания таймера' });
    }

    const property = await propertyQueries.getById(id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объявление не найдено' });
    }

    const prisma = getPrisma();
    const sourceTable =
      property.source_table ||
      (property.property_type === 'house' || property.property_type === 'villa'
        ? 'properties_houses'
        : 'properties_apartments');

    if (sourceTable === 'properties_houses') {
      await prisma.properties_houses.update({
        where: { id: Number(id) },
        data: {
          test_timer_end_date: String(test_timer_end_date),
          test_timer_duration:
            test_timer_duration !== undefined && test_timer_duration !== null
              ? Number(test_timer_duration)
              : null,
          updated_at: new Date().toISOString(),
        },
      });
    } else {
      await prisma.properties_apartments.update({
        where: { id: Number(id) },
        data: {
          test_timer_end_date: String(test_timer_end_date),
          test_timer_duration:
            test_timer_duration !== undefined && test_timer_duration !== null
              ? Number(test_timer_duration)
              : null,
          updated_at: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      message: 'Тестовый таймер успешно установлен'
    });
    broadcastAuctionSseEvent({
      type: 'test_timer_update',
      property: {
        id: Number(id),
        property_type: property.property_type ?? null,
        test_timer_end_date,
        test_timer_duration:
          test_timer_duration !== undefined && test_timer_duration !== null
            ? test_timer_duration
            : null,
      },
    });
  } catch (error) {
    console.error('❌ Ошибка при установке тестового таймера:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Не удалось сохранить таймер',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * DELETE /api/properties/:id/test-timer - Удалить тестовый таймер для объявления
 */
app.delete('/api/properties/:id/test-timer', async (req, res) => {
  try {
    const { id } = req.params;
    const property = await propertyQueries.getById(id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объявление не найдено' });
    }
    const prisma = getPrisma();
    const sourceTable =
      property.source_table ||
      (property.property_type === 'house' || property.property_type === 'villa'
        ? 'properties_houses'
        : 'properties_apartments');
    if (sourceTable === 'properties_houses') {
      await prisma.properties_houses.update({
        where: { id: Number(id) },
        data: {
          test_timer_end_date: null,
          test_timer_duration: null,
          updated_at: new Date().toISOString(),
        },
      });
    } else {
      await prisma.properties_apartments.update({
        where: { id: Number(id) },
        data: {
          test_timer_end_date: null,
          test_timer_duration: null,
          updated_at: new Date().toISOString(),
        },
      });
    }
    res.json({
      success: true,
      message: 'Тестовый таймер успешно удален'
    });
    broadcastAuctionSseEvent({
      type: 'test_timer_update',
      property: {
        id: Number(id),
        test_timer_end_date: null,
        test_timer_duration: null,
      },
    });
  } catch (error) {
    console.error('Ошибка при удалении тестового таймера:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/properties/shares - Получить одобренные объекты долевой собственности
 * ВАЖНО: Должен быть ПЕРЕД /api/properties/:id
 */
app.get('/api/properties/shares', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const properties = await propertyQueries.getShares(limit, offset);
    // Нормализуем для карточек: id, property_type, title, location, image (первое фото), price, total_shares, shares_sold, area, rooms
    const list = properties.map((p) => {
      const photosRaw =
        (p.photos &&
          (Array.isArray(p.photos)
            ? p.photos
            : typeof p.photos === 'string'
              ? (() => {
                  try {
                    return JSON.parse(p.photos);
                  } catch (e) {
                    return [];
                  }
                })()
            : [])) || [];
      const photosNorm = normalizePhotosListInput(photosRaw);
      const totalShares = p.total_shares != null ? Number(p.total_shares) : 0;
      const sharesSold = p.shares_sold != null ? Number(p.shares_sold) : 0;
      const price = p.price != null ? Number(p.price) : 0;
      const img =
        photosNorm[0] ||
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80';
      return {
        ...p,
        photos: photosNorm,
        images: photosNorm,
        id: p.id,
        property_type: p.property_type,
        shareId: `${p.property_type}-${p.id}`,
        title: p.title,
        location: p.location || '',
        description: p.description || '',
        image: img,
        totalPrice: price,
        pricePerShare: totalShares > 0 ? price / totalShares : 0,
        totalShares,
        sharesSold,
        myShares: 0,
        area: p.area,
        rooms: p.rooms,
        bedrooms: p.bedrooms,
      };
    });
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('GET /api/properties/shares error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/properties/:id/translate - Перевести объявление на все языки сайта (MyMemory API) и сохранить в БД
 */
app.post('/api/properties/:id/translate', async (req, res) => {
  const sendError = (status, message) => {
    try { res.status(status).json({ success: false, error: message }); } catch (_) {}
  };
  try {
    const { id } = req.params;
    const propertyTable = req.body?.property_table || req.query?.property_table || null;
    const requestedPropertyType = req.query.property_type || null;
    const property = await propertyQueries.getById(id, requestedPropertyType);
    if (!property) {
      return sendError(404, 'Объявление не найдено');
    }
    const table = propertyTable || property.source_table || 'properties_apartments';
    const translations = await translatePropertyToAllLanguages(property).catch((err) => {
      console.error('POST /api/properties/:id/translate translate error:', err);
      throw err;
    });
    const prisma = getPrisma();
    await prisma.property_translations.deleteMany({
      where: { property_id: Number(id), property_table: String(table) },
    });
    for (const [langCode, data] of Object.entries(translations)) {
      await prisma.property_translations.create({
        data: {
          property_id: Number(id),
          property_table: String(table),
          lang_code: String(langCode),
          title: data.title || '',
          description: data.description || '',
          additional_amenities: data.additional_amenities || '',
          location: data.location || '',
          created_at: new Date().toISOString(),
        },
      });
    }
    console.log(`✅ Переводы сохранены для property_id=${id}, table=${table}, языков: ${Object.keys(translations).length}`);
    return res.json({ success: true, message: 'Перевод готов', translations: Object.keys(translations) });
  } catch (err) {
    console.error('POST /api/properties/:id/translate error:', err);
    return sendError(500, err.message || 'Ошибка перевода');
  }
});

/**
 * GET /api/properties/:id/translations - Получить все сохранённые переводы объявления (для админки)
 */
app.get('/api/properties/:id/translations', async (req, res) => {
  const { id } = req.params;
  const propertyTable = req.query.property_table || null;
  try {
    const property = await propertyQueries.getById(id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объявление не найдено' });
    }
    const table = propertyTable || property.source_table || 'properties_apartments';
    const rows = await getPrisma().property_translations.findMany({
      where: { property_id: Number(id), property_table: String(table) },
      select: { lang_code: true, title: true, description: true, additional_amenities: true, location: true, created_at: true },
      orderBy: { lang_code: 'asc' },
    });
    const byLang = {};
    rows.forEach((r) => {
      byLang[r.lang_code] = {
        title: r.title,
        description: r.description,
        additional_amenities: r.additional_amenities,
        location: r.location,
        created_at: r.created_at,
      };
    });
    return res.json({ success: true, data: byLang });
  } catch (err) {
    console.error('GET /api/properties/:id/translations error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Тест-драйв: пересечение диапазонов дат (YYYY-MM-DD)
 */
function testDriveRangesOverlap(aStart, aEnd, bStart, bEnd) {
  return !(aEnd < bStart || bEnd < aStart);
}

function parseTestDrivePricingFromProperty(property) {
  let td = property?.test_drive_data || null;
  if (typeof td === 'string') {
    try {
      td = JSON.parse(td);
    } catch {
      td = null;
    }
  }
  return {
    daily_price: Number(td?.price_per_day) || 0,
    insurance_deposit: Number(td?.insurance_deposit) || 0,
  };
}

function mapAmenityCodeToRuLabel(code) {
  const m = {
    balcony: 'Балкон',
    parking: 'Парковка',
    elevator: 'Лифт',
    electricity: 'Электричество',
    internet: 'Интернет',
    security: 'Охрана',
    furniture: 'Мебель',
    pool: 'Бассейн',
    garden: 'Сад',
    garage: 'Гараж',
  };
  if (m[code]) return m[code];
  if (/^feature\d+$/i.test(code)) return code.replace(/^feature/i, 'Удобство #');
  return String(code);
}

function parseJsonSafe(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * GET /api/properties/:id/test-drive/eligibility — депозит для UI (тест-драйв только при «аукцион + продать сейчас»)
 */
app.get('/api/properties/:id/test-drive/eligibility', async (req, res) => {
  try {
    const propertyId = parseInt(req.params.id, 10);
    const userId = req.query.user_id ? parseInt(req.query.user_id, 10) : null;
    const propertyTable = req.query.property_table || null;
    if (!propertyId || Number.isNaN(propertyId)) {
      return res.status(400).json({ success: false, error: 'Некорректный id объекта' });
    }
    const property = await propertyQueries.getById(String(propertyId), null);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объект не найден' });
    }
    const table = property.source_table || propertyTable || 'properties_apartments';
    const td =
      property.test_drive === 1 ||
      property.test_drive === true ||
      property.test_drive === '1';
    const listingOk = propertyRowAllowsTestDriveListing(property);
    if (!td || !listingOk) {
      return res.json({
        success: true,
        data: {
          test_drive_enabled: false,
          has_deposit: false,
          has_bid: false,
          can_request: false,
          property_table: table,
        },
      });
    }
    let hasDeposit = false;
    if (userId && !Number.isNaN(userId)) {
      const user = await userQueries.getById(userId);
      if (user) {
        const dep = user.deposit_amount != null ? parseFloat(user.deposit_amount) : 0;
        hasDeposit = dep > 0;
      }
    }
    return res.json({
      success: true,
      data: {
        test_drive_enabled: true,
        property_table: table,
        has_deposit: hasDeposit,
        has_bid: false,
        can_request: !!hasDeposit,
      },
    });
  } catch (error) {
    console.error('GET test-drive/eligibility:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/properties/:id/test-drive/bookings — занятые даты (pending + approved)
 */
app.get('/api/properties/:id/test-drive/bookings', async (req, res) => {
  try {
    const propertyId = parseInt(req.params.id, 10);
    if (!propertyId || Number.isNaN(propertyId)) {
      return res.status(400).json({ success: false, error: 'Некорректный id объекта' });
    }
    const prop = await propertyQueries.getById(String(propertyId), null);
    const propertyTable =
      prop?.source_table || req.query.property_table || 'properties_apartments';
    await testDriveBookingQueries.ensureTable();
    const rows = await testDriveBookingQueries.listActiveForProperty(propertyId, propertyTable);
    const queryUserIdRaw = req.query.user_id;
    const queryUserId =
      queryUserIdRaw != null && String(queryUserIdRaw).trim() !== ''
        ? parseInt(String(queryUserIdRaw).trim(), 10)
        : NaN;
    const hasViewerId = !Number.isNaN(queryUserId);

    const bookedDaySet = new Set();
    const myBookedDaySet = new Set();
    for (const row of rows) {
      const start = new Date(row.start_date + 'T12:00:00');
      const end = new Date(row.end_date + 'T12:00:00');
      const cur = new Date(start);
      const rowUserId =
        row.user_id != null ? parseInt(String(row.user_id), 10) : NaN;
      while (cur <= end) {
        const ymd = cur.toISOString().slice(0, 10);
        bookedDaySet.add(ymd);
        if (hasViewerId && !Number.isNaN(rowUserId) && rowUserId === queryUserId) {
          myBookedDaySet.add(ymd);
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    const booked_dates = [...bookedDaySet].sort();
    const my_booked_dates = hasViewerId ? [...myBookedDaySet].sort() : [];
    return res.json({
      success: true,
      data: {
        booked_dates,
        my_booked_dates,
        bookings: rows.map((r) => ({
          id: r.id,
          user_id: r.user_id,
          start_date: r.start_date,
          end_date: r.end_date,
          status: r.status,
        })),
      },
    });
  } catch (error) {
    console.error('GET test-drive/bookings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/properties/:id/test-drive/quote — расчет суммы по выбранному диапазону
 */
app.get('/api/properties/:id/test-drive/quote', async (req, res) => {
  try {
    const propertyId = parseInt(req.params.id, 10);
    const { start_date, end_date } = req.query || {};
    if (!propertyId || Number.isNaN(propertyId)) {
      return res.status(400).json({ success: false, error: 'Некорректный id объекта' });
    }
    if (!start_date || !end_date || typeof start_date !== 'string' || typeof end_date !== 'string') {
      return res.status(400).json({ success: false, error: 'Укажите start_date и end_date' });
    }
    const property = await propertyQueries.getById(String(propertyId), null);
    if (!property) return res.status(404).json({ success: false, error: 'Объект не найден' });
    const td =
      property.test_drive === 1 || property.test_drive === true || property.test_drive === '1';
    if (!td) {
      return res.status(400).json({ success: false, error: 'Тест-драйв для этого объекта недоступен' });
    }
    if (!propertyRowAllowsTestDriveListing(property)) {
      return res.status(400).json({ success: false, error: 'Тест-драйв для этого объекта недоступен' });
    }
    const s = new Date(start_date + 'T12:00:00');
    const e = new Date(end_date + 'T12:00:00');
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) {
      return res.status(400).json({ success: false, error: 'Некорректный диапазон дат' });
    }
    const dayCount = Math.round((e - s) / (24 * 60 * 60 * 1000)) + 1;
    if (dayCount < 5 || dayCount > 21) {
      return res.status(400).json({ success: false, error: 'Выберите от 5 до 21 дня подряд' });
    }
    const pricing = parseTestDrivePricingFromProperty(property);
    if (!(pricing.daily_price > 0)) {
      return res.status(400).json({ success: false, error: 'Продавец не настроил цену за сутки' });
    }
    const stayTotal = Number((pricing.daily_price * dayCount).toFixed(2));
    const deposit = Number((pricing.insurance_deposit || 0).toFixed(2));
    return res.json({
      success: true,
      data: {
        day_count: dayCount,
        daily_price: pricing.daily_price,
        insurance_deposit: pricing.insurance_deposit,
        stay_total: stayTotal,
        total_amount: Number((stayTotal + deposit).toFixed(2)),
        currency: (property.currency || 'USD').toUpperCase(),
      },
    });
  } catch (error) {
    console.error('GET test-drive/quote:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/properties/:id/test-drive/request — заявка на даты (после выполнения условий)
 */
app.post('/api/properties/:id/test-drive/request', async (req, res) => {
  try {
    const propertyId = parseInt(req.params.id, 10);
    const { user_id, start_date, end_date, property_table } = req.body || {};
    const userId = parseInt(user_id, 10);
    if (!propertyId || Number.isNaN(propertyId) || !userId || Number.isNaN(userId)) {
      return res.status(400).json({ success: false, error: 'Нужны корректные property id и user_id' });
    }
    if (!start_date || !end_date || typeof start_date !== 'string' || typeof end_date !== 'string') {
      return res.status(400).json({ success: false, error: 'Укажите start_date и end_date (YYYY-MM-DD)' });
    }
    const property = await propertyQueries.getById(String(propertyId), null);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объект не найден' });
    }
    const table = property.source_table || property_table || 'properties_apartments';
    const td =
      property.test_drive === 1 ||
      property.test_drive === true ||
      property.test_drive === '1';
    if (!td) {
      return res.status(400).json({ success: false, error: 'Тест-драйв для этого объекта недоступен' });
    }
    if (!propertyRowAllowsTestDriveListing(property)) {
      return res.status(400).json({ success: false, error: 'Тест-драйв для этого объекта недоступен' });
    }
    const user = await userQueries.getById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    const dep = user.deposit_amount != null ? parseFloat(user.deposit_amount) : 0;
    if (dep <= 0) {
      return res.status(400).json({ success: false, error: 'Необходим депозит' });
    }
    if (await testDriveBookingQueries.countPendingForUserProperty(userId, propertyId, table) > 0) {
      return res.status(400).json({ success: false, error: 'У вас уже есть активная заявка на этот объект' });
    }
    const s = new Date(start_date + 'T12:00:00');
    const e = new Date(end_date + 'T12:00:00');
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) {
      return res.status(400).json({ success: false, error: 'Некорректный диапазон дат' });
    }
    const dayCount = Math.round((e - s) / (24 * 60 * 60 * 1000)) + 1;
    if (dayCount < 5 || dayCount > 21) {
      return res.status(400).json({ success: false, error: 'Выберите от 5 до 21 дня подряд' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (s < today) {
      return res.status(400).json({ success: false, error: 'Нельзя выбрать прошедшие даты' });
    }
    const existing = await testDriveBookingQueries.listActiveForProperty(propertyId, table);
    for (const ex of existing) {
      if (testDriveRangesOverlap(start_date, end_date, ex.start_date, ex.end_date)) {
        return res.status(409).json({ success: false, error: 'Часть выбранных дат уже занята' });
      }
    }
    const insertResult = await testDriveBookingQueries.create({
      property_id: propertyId,
      property_table: table,
      user_id: userId,
      start_date,
      end_date,
      status: 'pending',
    });
    const bookingId = insertResult.lastInsertRowid;
    const ownerId = property.user_id;
    const title = 'Запрос на тест-драйв';
    const buyerName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || `Пользователь #${userId}`;
    const propTitle = property.title || `Объект #${propertyId}`;
    const message = `${buyerName} хочет забронировать тест-драйв объекта «${propTitle}» с ${start_date} по ${end_date}. Подтвердите или отклоните в уведомлениях.`;
    const notifData = {
      booking_id: bookingId,
      property_id: propertyId,
      property_table: table,
      buyer_id: userId,
      start_date,
      end_date,
    };
    const notifRun = await notificationQueries.create({
      user_id: ownerId,
      type: 'test_drive_request',
      title,
      message,
      data: notifData,
      is_read: 0,
      view_count: 0,
    });
    const ownerNotificationId = notifRun.lastInsertRowid;
    if (ownerNotificationId) {
      await testDriveBookingQueries.updateOwnerNotificationId(bookingId, ownerNotificationId);
    }
    try {
      broadcastUserCabinetEvent(ownerId, { type: 'notifications_refresh' });
    } catch (e) {
      console.warn('SSE notifications_refresh (test-drive):', e?.message || e);
    }
    return res.json({ success: true, data: { booking_id: bookingId, status: 'pending' } });
  } catch (error) {
    console.error('POST test-drive/request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/test-drive-bookings/:bookingId/respond — владелец: подтвердить / отклонить
 */
app.put('/api/test-drive-bookings/:bookingId/respond', async (req, res) => {
  try {
    await testDriveBookingQueries.ensureTable();
    const bookingId = parseInt(req.params.bookingId, 10);
    const { user_id, action, owner_comment } = req.body || {};
    const ownerId = parseInt(user_id, 10);
    if (!bookingId || Number.isNaN(bookingId) || !ownerId || Number.isNaN(ownerId)) {
      return res.status(400).json({ success: false, error: 'Нужны bookingId и user_id владельца' });
    }
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ success: false, error: 'action: approve или reject' });
    }
    const booking = await testDriveBookingQueries.getById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Заявка не найдена' });
    }
    if (booking.status !== 'pending' && booking.status !== 'paid') {
      return res.status(400).json({ success: false, error: 'Заявка уже обработана' });
    }
    const property = await propertyQueries.getById(String(booking.property_id), null);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объект не найден' });
    }
    const propertyOwnerId = parseInt(String(property.user_id), 10);
    if (Number.isNaN(propertyOwnerId) || propertyOwnerId !== ownerId) {
      return res.status(403).json({ success: false, error: 'Только владелец может ответить' });
    }
    const buyerUserId = parseInt(String(booking.user_id), 10);
    if (Number.isNaN(buyerUserId) || buyerUserId <= 0) {
      return res.status(500).json({ success: false, error: 'Некорректный user_id в заявке' });
    }
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    if (action === 'approve') {
      const ownerComment = String(owner_comment || '').trim();
      if (!ownerComment) {
        return res.status(400).json({
          success: false,
          error: 'Добавьте комментарий для покупателя: заезд, ключи и инструкции',
        });
      }
      await testDriveBookingQueries.approveWithOwnerComment(bookingId, ownerComment);
      try {
        await testDriveBookingQueries.ensureSurveyBroadcastTokenIfMissing(bookingId);
        await testDriveBookingQueries.ensureExitFeedbackTokenIfMissing(bookingId);
      } catch (e) {
        console.warn('[test-drive] ensure survey token after approve:', e?.message || e);
      }
    } else {
      await testDriveBookingQueries.updateStatus(bookingId, newStatus);
    }
    const propTitle = property.title || `Объект #${booking.property_id}`;
    if (action === 'approve') {
      const ins = await notificationQueries.create({
        user_id: buyerUserId,
        type: 'test_drive_result',
        title: 'Тест-драйв подтверждён',
        message: `Владелец подтвердил тест-драйв объекта «${propTitle}» с ${booking.start_date} по ${booking.end_date}.`,
        data: {
          booking_id: bookingId,
          property_id: booking.property_id,
          property_table: booking.property_table,
          start_date: booking.start_date,
          end_date: booking.end_date,
          owner_comment: String(owner_comment || '').trim(),
          check_in_enabled: 1,
        },
        is_read: 0,
        view_count: 0,
      });
      console.log('✅ Уведомление покупателю (тест-драйв подтверждён):', {
        notificationId: ins?.lastInsertRowid,
        buyerUserId,
      });
      try {
        broadcastUserCabinetEvent(buyerUserId, { type: 'notifications_refresh' });
      } catch {
        /* ignore */
      }
    } else {
      const ins = await notificationQueries.create({
        user_id: buyerUserId,
        type: 'test_drive_result',
        title: 'Тест-драйв отклонён',
        message: `Владелец отклонил заявку на тест-драйв объекта «${propTitle}» с ${booking.start_date} по ${booking.end_date}. Вы можете выбрать другие даты.`,
        data: {
          booking_id: bookingId,
          property_id: booking.property_id,
          property_table: booking.property_table,
        },
        is_read: 0,
        view_count: 0,
      });
      console.log('✅ Уведомление покупателю (тест-драйв отклонён):', {
        notificationId: ins?.lastInsertRowid,
        buyerUserId,
      });
      try {
        broadcastUserCabinetEvent(buyerUserId, { type: 'notifications_refresh' });
      } catch {
        /* ignore */
      }
    }
    if (booking.owner_notification_id) {
      try {
        await notificationQueries.delete(booking.owner_notification_id);
      } catch (e) {
        console.warn('delete owner notification:', e.message);
      }
    }
    return res.json({ success: true, data: { booking_id: bookingId, status: newStatus } });
  } catch (error) {
    console.error('PUT test-drive respond:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

function firstPhotoUrlFromPropertyPhotosField(photosField) {
  if (photosField == null || photosField === '') return null;
  let list = photosField;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(list) || list.length === 0) return null;
  const first = list[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && first.url != null) return String(first.url);
  return null;
}

async function enrichTestDriveBookingWithPropertyTitle(row) {
  const prisma = getPrisma();
  const table = row.property_table || 'properties_apartments';
  let title = null;
  let property_cover_url = null;
  try {
    if (table === 'properties_houses') {
      const p = await prisma.properties_houses.findUnique({
        where: { id: Number(row.property_id) },
        select: { title: true, photos: true },
      });
      title = p?.title;
      property_cover_url = firstPhotoUrlFromPropertyPhotosField(p?.photos);
    } else if (table === 'properties_apartments') {
      const p = await prisma.properties_apartments.findUnique({
        where: { id: Number(row.property_id) },
        select: { title: true, photos: true },
      });
      title = p?.title;
      property_cover_url = firstPhotoUrlFromPropertyPhotosField(p?.photos);
    } else {
      const p = await prisma.properties.findUnique({
        where: { id: Number(row.property_id) },
        select: { title: true, photos: true },
      });
      title = p?.title;
      property_cover_url = firstPhotoUrlFromPropertyPhotosField(p?.photos);
    }
  } catch (e) {
    /* ignore */
  }
  return {
    ...row,
    property_title: title || `Объект #${row.property_id}`,
    property_cover_url,
  };
}

function mergeTestDriveBookingsWithPaymentRows(userId, enrichedRows) {
  return stripeSubscriptionQueries.listTestDriveBookingPaymentsByUserId(userId, 120).then((pays) => {
    const byBid = new Map();
    for (const p of pays) {
      try {
        const j = JSON.parse(p.billing_reason || '{}');
        const bid = Number(j.booking_id);
        if (!Number.isFinite(bid) || byBid.has(bid)) continue;
        byBid.set(bid, { p, j });
      } catch {
        /* ignore */
      }
    }
    return enrichedRows.map((row) => {
      const hit = byBid.get(Number(row.id));
      if (!hit) {
        return {
          ...row,
          paid_amount_cents: null,
          paid_currency: null,
          insurance_deposit_amount: null,
        };
      }
      const insRaw = hit.j.insurance_deposit;
      const ins =
        insRaw != null && insRaw !== '' && !Number.isNaN(Number(insRaw)) ? Number(insRaw) : null;
      return {
        ...row,
        paid_amount_cents: hit.p.amount_cents,
        paid_currency: hit.p.currency,
        insurance_deposit_amount: ins,
      };
    });
  });
}

/** Платежи по заявкам для кабинета продавца (несколько покупателей). */
async function mergeTestDriveOwnerBookingsWithPayments(enrichedRows) {
  const buyerIds = [
    ...new Set(
      enrichedRows
        .map((r) => Number(r.user_id))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];
  if (!buyerIds.length) {
    return enrichedRows.map((row) => ({
      ...row,
      paid_amount_cents: null,
      paid_currency: null,
      insurance_deposit_amount: null,
    }));
  }
  const payLists = await Promise.all(
    buyerIds.map((uid) => stripeSubscriptionQueries.listTestDriveBookingPaymentsByUserId(uid, 200))
  );
  const byBid = new Map();
  for (const pays of payLists) {
    for (const p of pays) {
      try {
        const j = JSON.parse(p.billing_reason || '{}');
        const bid = Number(j.booking_id);
        if (!Number.isFinite(bid) || byBid.has(bid)) continue;
        byBid.set(bid, { p, j });
      } catch {
        /* ignore */
      }
    }
  }
  return enrichedRows.map((row) => {
    const hit = byBid.get(Number(row.id));
    if (!hit) {
      return {
        ...row,
        paid_amount_cents: null,
        paid_currency: null,
        insurance_deposit_amount: null,
      };
    }
    const insRaw = hit.j.insurance_deposit;
    const ins =
      insRaw != null && insRaw !== '' && !Number.isNaN(Number(insRaw)) ? Number(insRaw) : null;
    return {
      ...row,
      paid_amount_cents: hit.p.amount_cents,
      paid_currency: hit.p.currency,
      insurance_deposit_amount: ins,
    };
  });
}

/**
 * GET /api/admin/test-drive/properties — объекты с включённым тест-драйвом и/или с бронями + счётчик
 */
app.get('/api/admin/test-drive/properties', async (req, res) => {
  try {
    await testDriveBookingQueries.ensureTable();
    const prisma = getPrisma();
    const grouped = await prisma.test_drive_bookings.groupBy({
      by: ['property_id', 'property_table'],
      _count: { _all: true },
    });
    const countByKey = new Map();
    const aptIdsBk = new Set();
    const houseIdsBk = new Set();
    for (const g of grouped) {
      const key = `${g.property_table}:${g.property_id}`;
      countByKey.set(key, g._count._all);
      if (g.property_table === 'properties_houses') houseIdsBk.add(Number(g.property_id));
      else aptIdsBk.add(Number(g.property_id));
    }
    const aptIn = Array.from(aptIdsBk).filter((n) => Number.isFinite(n));
    const houseIn = Array.from(houseIdsBk).filter((n) => Number.isFinite(n));
    const aptWhere =
      aptIn.length > 0
        ? { OR: [{ test_drive: 1 }, { id: { in: aptIn } }] }
        : { test_drive: 1 };
    const houseWhere =
      houseIn.length > 0
        ? { OR: [{ test_drive: 1 }, { id: { in: houseIn } }] }
        : { test_drive: 1 };
    const [apartments, houses] = await Promise.all([
      prisma.properties_apartments.findMany({
        where: aptWhere,
        select: {
          id: true,
          title: true,
          photos: true,
          user_id: true,
          location: true,
          city: true,
          test_drive: true,
          moderation_status: true,
        },
      }),
      prisma.properties_houses.findMany({
        where: houseWhere,
        select: {
          id: true,
          title: true,
          photos: true,
          user_id: true,
          location: true,
          city: true,
          test_drive: true,
          moderation_status: true,
        },
      }),
    ]);
    const rows = [];
    for (const a of apartments) {
      const pt = 'properties_apartments';
      const key = `${pt}:${a.id}`;
      rows.push({
        property_id: a.id,
        property_table: pt,
        title: a.title,
        cover_url: firstPhotoUrlFromPropertyPhotosField(a.photos),
        owner_user_id: a.user_id,
        location_line: [a.city, a.location].filter(Boolean).join(', ') || '—',
        test_drive: a.test_drive,
        moderation_status: a.moderation_status,
        booking_count: countByKey.get(key) || 0,
      });
    }
    for (const h of houses) {
      const pt = 'properties_houses';
      const key = `${pt}:${h.id}`;
      rows.push({
        property_id: h.id,
        property_table: pt,
        title: h.title,
        cover_url: firstPhotoUrlFromPropertyPhotosField(h.photos),
        owner_user_id: h.user_id,
        location_line: [h.city, h.location].filter(Boolean).join(', ') || '—',
        test_drive: h.test_drive,
        moderation_status: h.moderation_status,
        booking_count: countByKey.get(key) || 0,
      });
    }
    rows.sort((x, y) => {
      const c = (y.booking_count || 0) - (x.booking_count || 0);
      if (c !== 0) return c;
      return String(x.title || '').localeCompare(String(y.title || ''), 'ru');
    });
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('GET /api/admin/test-drive/properties:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/test-drive/property-bookings?property_id=&property_table=
 * Список броней по объекту с данными покупателя (для админки).
 */
app.get('/api/admin/test-drive/property-bookings', async (req, res) => {
  try {
    await testDriveBookingQueries.ensureTable();
    const propertyId = parseInt(String(req.query.property_id || ''), 10);
    const rawTable = String(req.query.property_table || 'properties_apartments').trim();
    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      return res.status(400).json({ success: false, error: 'Укажите корректный property_id' });
    }
    const allowed = ['properties_apartments', 'properties_houses'];
    const propertyTable = allowed.includes(rawTable) ? rawTable : 'properties_apartments';
    const prisma = getPrisma();
    const rows = await prisma.$queryRaw`
      SELECT
        t.id,
        t.property_id,
        t.property_table,
        t.user_id,
        t.start_date,
        t.end_date,
        t.status,
        t.cancelled_by,
        t.cancellation_reason_code,
        t.cancellation_reason,
        t.cancelled_at,
        t.owner_comment,
        t.check_in_enabled,
        t.check_in_report,
        t.check_in_status,
        t.buyer_contact_channel,
        t.survey_token,
        t.survey_whatsapp_status,
        t.survey_whatsapp_sent_at,
        t.survey_scheduled_at,
        t.exit_feedback_token,
        t.exit_feedback_whatsapp_status,
        t.exit_feedback_whatsapp_sent_at,
        t.exit_feedback_scheduled_at,
        t.exit_feedback_report,
        t.created_at,
        u.first_name AS buyer_first_name,
        u.last_name AS buyer_last_name,
        u.email AS buyer_email,
        u.phone_number AS buyer_phone,
        u.role AS buyer_role
      FROM test_drive_bookings t
      INNER JOIN users u ON u.id = t.user_id
      WHERE t.property_id = ${propertyId} AND t.property_table = ${propertyTable}
      ORDER BY t.start_date ASC NULLS LAST, t.id ASC
    `;
    const data = (Array.isArray(rows) ? rows : []).map((row) => ({
      id: row.id,
      property_id: row.property_id,
      property_table: row.property_table,
      user_id: row.user_id,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
      cancelled_by: row.cancelled_by ?? null,
      cancellation_reason_code: row.cancellation_reason_code ?? null,
      cancellation_reason: row.cancellation_reason ?? null,
      cancelled_at: row.cancelled_at instanceof Date ? row.cancelled_at.toISOString() : row.cancelled_at,
      owner_comment: row.owner_comment ?? null,
      check_in_enabled: row.check_in_enabled ?? null,
      check_in_report: row.check_in_report ?? null,
      check_in_status: row.check_in_status ?? null,
      buyer_contact_channel: row.buyer_contact_channel ?? null,
      survey_token: row.survey_token ?? null,
      survey_whatsapp_status: row.survey_whatsapp_status ?? null,
      survey_whatsapp_sent_at:
        row.survey_whatsapp_sent_at instanceof Date
          ? row.survey_whatsapp_sent_at.toISOString()
          : row.survey_whatsapp_sent_at,
      survey_scheduled_at:
        row.survey_scheduled_at instanceof Date ? row.survey_scheduled_at.toISOString() : row.survey_scheduled_at,
      exit_feedback_token: row.exit_feedback_token ?? null,
      exit_feedback_whatsapp_status: row.exit_feedback_whatsapp_status ?? null,
      exit_feedback_whatsapp_sent_at:
        row.exit_feedback_whatsapp_sent_at instanceof Date
          ? row.exit_feedback_whatsapp_sent_at.toISOString()
          : row.exit_feedback_whatsapp_sent_at,
      exit_feedback_scheduled_at:
        row.exit_feedback_scheduled_at instanceof Date
          ? row.exit_feedback_scheduled_at.toISOString()
          : row.exit_feedback_scheduled_at,
      exit_feedback_report: row.exit_feedback_report ?? null,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      buyer: {
        id: row.user_id,
        first_name: row.buyer_first_name,
        last_name: row.buyer_last_name,
        email: row.buyer_email,
        phone_number: row.buyer_phone,
        role: row.buyer_role,
      },
    }));
    for (let i = 0; i < data.length; i += 1) {
      const st = String(data[i].status || '').toLowerCase();
      if (st !== 'paid' && st !== 'approved') continue;
      try {
        const ens = await testDriveBookingQueries.ensureExitFeedbackTokenIfMissing(data[i].id);
        if (ens?.ok && ens.existed === false) {
          const fresh = await testDriveBookingQueries.getById(data[i].id);
          if (fresh) {
            data[i].exit_feedback_token = fresh.exit_feedback_token ?? null;
            data[i].exit_feedback_whatsapp_status = fresh.exit_feedback_whatsapp_status ?? null;
            data[i].exit_feedback_whatsapp_sent_at =
              fresh.exit_feedback_whatsapp_sent_at instanceof Date
                ? fresh.exit_feedback_whatsapp_sent_at.toISOString()
                : fresh.exit_feedback_whatsapp_sent_at ?? null;
            data[i].exit_feedback_scheduled_at =
              fresh.exit_feedback_scheduled_at instanceof Date
                ? fresh.exit_feedback_scheduled_at.toISOString()
                : fresh.exit_feedback_scheduled_at ?? null;
          }
        }
      } catch {
        /* ignore ensure errors */
      }
    }
    return res.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/admin/test-drive/property-bookings:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/test-drive/cancellations-badge — отменённые брони (для счётчика «непросмотрено» в админке)
 */
app.get('/api/admin/test-drive/cancellations-badge', async (req, res) => {
  try {
    await testDriveBookingQueries.ensureTable();
    const prisma = getPrisma();
    const sql = `
      SELECT property_id, property_table, cancelled_at, created_at
      FROM test_drive_bookings
      WHERE LOWER(TRIM(COALESCE(status, ''))) = 'cancelled'
      ORDER BY id DESC
      LIMIT 5000
    `;
    const rows = await prisma.$queryRawUnsafe(sql);
    const data = (Array.isArray(rows) ? rows : []).map((row) => ({
      property_id: row.property_id,
      property_table: row.property_table,
      cancelled_at:
        row.cancelled_at instanceof Date ? row.cancelled_at.toISOString() : row.cancelled_at ?? null,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at ?? null,
    }));
    const cntRows = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) AS c
      FROM test_drive_bookings
      WHERE LOWER(TRIM(COALESCE(status, ''))) = 'cancelled'
    `);
    const rawC = Array.isArray(cntRows) && cntRows[0] != null ? cntRows[0].c : data.length;
    const totalCancelled =
      typeof rawC === 'bigint' ? Number(rawC) : Number(rawC == null ? data.length : rawC);
    return res.json({ success: true, data, meta: { total_cancelled: totalCancelled } });
  } catch (error) {
    console.error('GET /api/admin/test-drive/cancellations-badge:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/test-drive/broadcasts — карточки рассылки опроса WhatsApp (после оплаты)
 */
app.get('/api/admin/test-drive/broadcasts', async (req, res) => {
  try {
    await testDriveBookingQueries.ensureTable();
    const rows = await testDriveBookingQueries.listSurveyBroadcastBookings(350);
    const data = await Promise.all(
      rows.map(async (b) => enrichTestDriveBookingWithPropertyTitle(b))
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/admin/test-drive/broadcasts:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/test-drive/broadcasts/:bookingId/send — отправить сообщение WhatsApp сейчас
 */
app.post('/api/admin/test-drive/broadcasts/:bookingId/send', async (req, res) => {
  try {
    await testDriveBookingQueries.ensureTable();
    const bookingId = parseInt(req.params.bookingId, 10);
    if (!Number.isFinite(bookingId) || bookingId <= 0) {
      return res.status(400).json({ success: false, error: 'Некорректный bookingId' });
    }
    const result = await sendTestDriveSurveyWhatsAppForBooking(bookingId, { manual: true });
    if (!result.ok && result.error === 'no_phone') {
      return res.status(400).json({
        success: false,
        error: 'У пользователя не указан телефон в профиле',
      });
    }
    if (!result.ok && result.error === 'wa_failed') {
      return res.status(503).json({
        success: false,
        error: 'Не удалось отправить WhatsApp (клиент не готов или ошибка сети)',
      });
    }
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error || 'send_failed' });
    }
    return res.json({ success: true, data: { sent: true, already: Boolean(result.already) } });
  } catch (error) {
    console.error('POST /api/admin/test-drive/broadcasts/send:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/test-drive/exit-feedback-broadcasts/:bookingId/send — WA «после выезда» сейчас
 */
app.post('/api/admin/test-drive/exit-feedback-broadcasts/:bookingId/send', async (req, res) => {
  try {
    await testDriveBookingQueries.ensureTable();
    const bookingId = parseInt(req.params.bookingId, 10);
    if (!Number.isFinite(bookingId) || bookingId <= 0) {
      return res.status(400).json({ success: false, error: 'Некорректный bookingId' });
    }
    const row = await testDriveBookingQueries.getById(bookingId);
    if (row && !String(row.exit_feedback_token || '').trim()) {
      await testDriveBookingQueries.ensureExitFeedbackTokenIfMissing(bookingId);
    }
    const result = await sendTestDriveExitFeedbackWhatsAppForBooking(bookingId, { manual: true });
    if (!result.ok && result.error === 'no_phone') {
      return res.status(400).json({
        success: false,
        error: 'У пользователя не указан телефон в профиле',
      });
    }
    if (!result.ok && result.error === 'wa_failed') {
      return res.status(503).json({
        success: false,
        error: 'Не удалось отправить WhatsApp (клиент не готов или ошибка сети)',
      });
    }
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error || 'send_failed' });
    }
    return res.json({ success: true, data: { sent: true, already: Boolean(result.already) } });
  } catch (error) {
    console.error('POST /api/admin/test-drive/exit-feedback-broadcasts/send:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/test-drive/survey-financial — опросы тест-драйва для финконтроля (Stripe + ответы)
 */
app.get('/api/admin/test-drive/survey-financial', async (req, res) => {
  try {
    await testDriveBookingQueries.ensureTable();
    const pays = await stripeSubscriptionQueries.listAllPaymentsWithUsers(2500);
    const list = Array.isArray(pays) ? pays : [];
    const td = list.filter((p) => String(p.plan_key || '') === 'test_drive_booking');
    const rows = [];
    for (const p of td) {
      let bid = null;
      try {
        const j = JSON.parse(p.billing_reason || '{}');
        bid = Number(j.booking_id);
      } catch {
        /* ignore */
      }
      if (!Number.isFinite(bid)) continue;
      const booking = await testDriveBookingQueries.getById(bid);
      if (!booking) continue;
      let summary = '—';
      try {
        const rep = parseJsonSafe(booking.check_in_report, null);
        if (rep && typeof rep === 'object') {
          if (Number(rep.survey_version) === 2 || String(rep.first_impression || '').trim()) {
            const fi = {
              better: 'лучше ожиданий',
              as_photos: 'как на фото',
              slightly_off: 'немного не совпало',
            }[String(rep.first_impression)];
            const cm = { great: 'комфортно', mostly_but_missing: 'не хватало мелочей' }[String(rep.comfort)];
            const pi = {
              great_value: 'цена/качество отлично',
              fair: 'цена адекватна',
              expensive: 'дороговато',
            }[String(rep.price_impression)];
            const pur = {
              definitely_yes: 'покупка: да',
              rather_yes: 'покупка: скорее да',
              rather_no: 'покупка: скорее нет',
            }[String(rep.purchase_intent)];
            const hi = Array.isArray(rep.highlights) ? rep.highlights.filter(Boolean).join(', ') : '';
            const parts = [
              fi ? `Первое впечатление: ${fi}` : '',
              cm ? `Комфорт: ${cm}` : '',
              hi ? `Запомнилось: ${hi}` : '',
              pi ? `Цена: ${pi}` : '',
              pur ? pur : '',
            ].filter(Boolean);
            summary = parts.length ? parts.join(' · ') : '—';
          } else {
            const expLabel =
              rep.property_expectations &&
              {
                exceeded: 'превзошёл ожидания',
                matched: 'совпал с ожиданиями',
                partially: 'частично',
                below: 'ниже ожиданий',
              }[String(rep.property_expectations)];
            const parts = [
              expLabel ? `Объект (ожидания): ${expLabel}` : '',
              rep.property_feedback
                ? `Отзыв: ${String(rep.property_feedback).slice(0, 200)}${String(rep.property_feedback).length > 200 ? '…' : ''}`
                : '',
              rep.amenities_ok ? `Удобства: ${rep.amenities_ok}` : '',
              rep.defects_state ? `Дефекты: ${rep.defects_state}` : '',
              rep.price_acceptable
                ? `Цена за объект: ${
                    {
                      yes: 'приемлема',
                      no: 'не приемлема',
                    }[String(rep.price_acceptable).toLowerCase()] || rep.price_acceptable
                  }`
                : rep.listing_info_clear
                  ? `Объявление/цена (старый вопрос): ${
                      {
                        yes: 'понятно',
                        no: 'неясно',
                      }[String(rep.listing_info_clear).toLowerCase()] || rep.listing_info_clear
                    }`
                  : rep.ready_to_stay
                    ? `Проживание (старый опрос): ${
                        {
                          yes: 'устраивает',
                          no: 'есть замечания',
                        }[String(rep.ready_to_stay).toLowerCase()] || rep.ready_to_stay
                      }`
                    : '',
            ].filter(Boolean);
            summary = parts.length ? parts.join(' · ') : '—';
          }
        }
      } catch {
        /* ignore */
      }
      rows.push({
        booking_id: bid,
        property_id: booking.property_id,
        property_table: booking.property_table,
        survey_whatsapp_status: booking.survey_whatsapp_status || null,
        survey_whatsapp_sent_at: booking.survey_whatsapp_sent_at || null,
        survey_completed: Boolean(booking.check_in_report && String(booking.check_in_report).trim() && String(booking.check_in_report).trim() !== '{}'),
        answers_summary: summary,
        paid_at: p.paid_at,
        amount_cents: p.amount_cents,
        currency: p.currency,
        user_id: p.user_id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email || p.customer_email,
      });
    }
    rows.sort((a, b) => {
      const ta = a.paid_at ? Date.parse(a.paid_at) : 0;
      const tb = b.paid_at ? Date.parse(b.paid_at) : 0;
      return tb - ta;
    });
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('GET /api/admin/test-drive/survey-financial:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/test-drive-bookings/user/:userId — бронирования тест-драйва пользователя
 */
app.get('/api/test-drive-bookings/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({ success: false, error: 'Некорректный userId' });
    }
    await testDriveBookingQueries.ensureTable();
    const rows = await testDriveBookingQueries.listByUserId(userId);
    const enriched = await Promise.all(rows.map(enrichTestDriveBookingWithPropertyTitle));
    const data = await mergeTestDriveBookingsWithPaymentRows(userId, enriched);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('GET test-drive-bookings/user:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/test-drive-bookings/:bookingId/cancel-by-buyer — отмена брони покупателем (до 50% возврат при оплате онлайн).
 */
app.put('/api/test-drive-bookings/:bookingId/cancel-by-buyer', async (req, res) => {
  try {
    await testDriveBookingQueries.ensureTable();
    const bookingId = parseInt(req.params.bookingId, 10);
    const userId = parseInt(String(req.body?.user_id || ''), 10);
    if (!Number.isFinite(bookingId) || !Number.isFinite(userId)) {
      return res.status(400).json({ success: false, error: 'Некорректные bookingId или user_id' });
    }
    const parsed = parseTestDriveBuyerCancelBody(req.body || {});
    if (!parsed.ok) {
      const errMap = {
        invalid_reason_code: 'Выберите причину из списка',
        reason_text_too_short: 'Опишите причину не короче 5 символов',
      };
      return res.status(400).json({
        success: false,
        error: errMap[parsed.error] || parsed.error,
        error_code: parsed.error,
      });
    }

    const booking = await testDriveBookingQueries.getById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Бронь не найдена' });
    }
    if (Number(booking.user_id) !== userId) {
      return res.status(403).json({ success: false, error: 'Можно отменить только свою бронь' });
    }
    const st = String(booking.status || '').toLowerCase();
    if (st === 'rejected') {
      return res.status(400).json({ success: false, error: 'Эта заявка уже отклонена' });
    }
    if (!['pending', 'approved', 'paid'].includes(st)) {
      return res.status(400).json({ success: false, error: 'Бронь нельзя отменить в текущем статусе' });
    }

    const paymentRow = await stripeSubscriptionQueries.findTestDrivePaymentByBookingId(userId, bookingId);
    if (paymentRow && Number(paymentRow.amount_cents) > 0) {
      const ref = await refundHalfTestDriveBookingPayment(paymentRow);
      if (!ref.ok) {
        return res.status(502).json({
          success: false,
          error:
            ref.error === 'stripe_not_configured'
              ? 'Платёжная система временно недоступна — попробуйте позже'
              : 'Не удалось оформить возврат средств. Обратитесь в поддержку или попробуйте позже.',
          error_code: ref.error,
          message: ref.message,
        });
      }
    }

    const property = await propertyQueries.getById(String(booking.property_id), null);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объект не найден' });
    }
    const ownerId = parseInt(String(property.user_id), 10);
    const propTitle = property.title || `Объект #${booking.property_id}`;
    const reasonLabelRu = {
      dates_changed: 'Изменились даты поездки',
      found_alternative: 'Нашёл другой объект',
      property_not_fit: 'Объект не подошёл',
      price_concern: 'Вопрос по цене / условиям',
      personal: 'Личные обстоятельства',
      other: parsed.reasonDetail,
    };
    const reasonLine = reasonLabelRu[parsed.reasonCode] || parsed.reasonCode;

    if (booking.owner_notification_id) {
      try {
        await notificationQueries.delete(booking.owner_notification_id);
      } catch {
        /* ignore */
      }
    }

    await getPrisma().$executeRaw`
      UPDATE test_drive_bookings
      SET status = 'cancelled',
          cancelled_by = 'buyer',
          cancellation_reason_code = ${parsed.reasonCode || null},
          cancellation_reason = ${reasonLine || null},
          cancelled_at = NOW()
      WHERE id = ${bookingId}
    `;

    if (Number.isFinite(ownerId) && ownerId > 0) {
      await notificationQueries.create({
        user_id: ownerId,
        type: 'test_drive_buyer_cancelled',
        title: 'Покупатель отменил бронь тест-драйва',
        message: `Покупатель отменил бронь объекта «${propTitle}» с ${booking.start_date} по ${booking.end_date}. Причина: ${reasonLine}.`,
        data: {
          booking_id: bookingId,
          property_id: booking.property_id,
          property_table: booking.property_table,
          buyer_id: userId,
          reason_code: parsed.reasonCode,
          reason_detail: parsed.reasonDetail || null,
        },
        is_read: 0,
        view_count: 0,
      });
      try {
        broadcastUserCabinetEvent(ownerId, { type: 'notifications_refresh' });
      } catch {
        /* ignore */
      }
    }
    try {
      broadcastUserCabinetEvent(userId, { type: 'notifications_refresh' });
    } catch {
      /* ignore */
    }

    return res.json({ success: true, data: { booking_id: bookingId, cancelled: true } });
  } catch (error) {
    console.error('PUT test-drive-bookings cancel-by-buyer:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/test-drive-bookings/:bookingId/detail — детали заселения для покупателя
 */
app.get('/api/test-drive-bookings/:bookingId/detail', async (req, res) => {
  try {
    await testDriveBookingQueries.ensureTable();
    const bookingId = parseInt(req.params.bookingId, 10);
    const userId = parseInt(String(req.query.user_id || ''), 10);
    if (!Number.isFinite(bookingId) || !Number.isFinite(userId)) {
      return res.status(400).json({ success: false, error: 'Некорректные bookingId/user_id' });
    }
    const booking = await testDriveBookingQueries.getById(bookingId);
    if (!booking) return res.status(404).json({ success: false, error: 'Бронь не найдена' });
    if (Number(booking.user_id) !== userId) {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }
    const property = await propertyQueries.getById(String(booking.property_id), null);
    if (!property) return res.status(404).json({ success: false, error: 'Объект не найден' });
    let amenitiesRaw = [];
    if (Array.isArray(property.amenities)) amenitiesRaw = property.amenities;
    else if (typeof property.amenities === 'string') {
      try {
        const parsed = JSON.parse(property.amenities);
        amenitiesRaw = Array.isArray(parsed) ? parsed : [];
      } catch {
        amenitiesRaw = [];
      }
    }
    const amenities = amenitiesRaw.map(mapAmenityCodeToRuLabel);
    let buyerFirst = '';
    let buyerLast = '';
    try {
      const bu = await userQueries.getById(userId);
      if (bu) {
        buyerFirst = bu.first_name || '';
        buyerLast = bu.last_name || '';
      }
    } catch {
      /* ignore */
    }
    return res.json({
      success: true,
      data: {
        booking: {
          id: booking.id,
          property_id: booking.property_id,
          property_table: booking.property_table,
          start_date: booking.start_date,
          end_date: booking.end_date,
          status: booking.status,
          owner_comment: booking.owner_comment || '',
          check_in_status: booking.check_in_status || 'pending_checkin',
          check_in_report: parseJsonSafe(booking.check_in_report, null),
          survey_token: booking.survey_token || null,
        },
        buyer: {
          first_name: buyerFirst,
          last_name: buyerLast,
        },
        property: {
          id: property.id,
          title: property.title || `Объект #${property.id}`,
          location: property.location || '',
          amenities,
        },
      },
    });
  } catch (error) {
    console.error('GET test-drive-bookings/:bookingId/detail:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/test-drive-survey/:token/detail — публичная страница опроса по секретной ссылке
 */
app.get('/api/test-drive-survey/:token/detail', async (req, res) => {
  try {
    await testDriveBookingQueries.ensureTable();
    const token = String(req.params.token || '').trim();
    const booking = await testDriveBookingQueries.getBySurveyToken(token);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Ссылка недействительна или устарела' });
    }
    const st = String(booking.status || '').toLowerCase();
    if (st === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Бронирование отменено' });
    }
    if (!['paid', 'approved'].includes(st)) {
      return res.status(400).json({ success: false, error: 'Опрос пока недоступен' });
    }
    const property = await propertyQueries.getById(String(booking.property_id), null);
    if (!property) return res.status(404).json({ success: false, error: 'Объект не найден' });
    let amenitiesRaw = [];
    if (Array.isArray(property.amenities)) amenitiesRaw = property.amenities;
    else if (typeof property.amenities === 'string') {
      try {
        const parsed = JSON.parse(property.amenities);
        amenitiesRaw = Array.isArray(parsed) ? parsed : [];
      } catch {
        amenitiesRaw = [];
      }
    }
    const amenities = amenitiesRaw.map(mapAmenityCodeToRuLabel);
    const buyer = await userQueries.getById(booking.user_id);
    return res.json({
      success: true,
      data: {
        booking: {
          id: booking.id,
          property_id: booking.property_id,
          property_table: booking.property_table,
          start_date: booking.start_date,
          end_date: booking.end_date,
          status: booking.status,
          owner_comment: booking.owner_comment || '',
          check_in_status: booking.check_in_status || 'pending_checkin',
          check_in_report: parseJsonSafe(booking.check_in_report, null),
        },
        buyer: {
          first_name: buyer?.first_name || '',
          last_name: buyer?.last_name || '',
        },
        property: {
          id: property.id,
          title: property.title || `Объект #${property.id}`,
          location: property.location || '',
          amenities,
        },
      },
    });
  } catch (error) {
    console.error('GET test-drive-survey/:token/detail:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/** Новые отчёты: price_acceptable; ранее listing_info_clear; ещё раньше ready_to_stay. */
function testDriveCheckInSurveyPositive(report) {
  if (!report || typeof report !== 'object') return false;
  if (Number(report.survey_version) === 2 || String(report.first_impression || '').trim()) {
    const fi = String(report.first_impression ?? '').trim().toLowerCase();
    const cm = String(report.comfort ?? '').trim().toLowerCase();
    const pi = String(report.price_impression ?? '').trim().toLowerCase();
    if (fi === 'slightly_off') return false;
    if (cm === 'mostly_but_missing') return false;
    if (pi === 'expensive') return false;
    return true;
  }
  const pa = String(report.price_acceptable ?? '').trim().toLowerCase();
  if (pa === 'yes' || pa === 'no') return pa === 'yes';
  const li = String(report.listing_info_clear ?? '').trim().toLowerCase();
  if (li === 'yes' || li === 'no') return li === 'yes';
  return String(report.ready_to_stay ?? '').trim().toLowerCase() === 'yes';
}

/**
 * PUT /api/test-drive-survey/:token/report — отправка опроса по ссылке (без входа в аккаунт)
 */
app.put('/api/test-drive-survey/:token/report', async (req, res) => {
  try {
    await testDriveBookingQueries.ensureTable();
    const token = String(req.params.token || '').trim();
    const report = req.body?.report || null;
    const booking = await testDriveBookingQueries.getBySurveyToken(token);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Ссылка недействительна' });
    }
    if (!report || typeof report !== 'object') {
      return res.status(400).json({ success: false, error: 'report обязателен' });
    }
    const st = String(booking.status || '').toLowerCase();
    if (st === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Бронирование отменено' });
    }
    if (!['paid', 'approved'].includes(st)) {
      return res.status(400).json({ success: false, error: 'Опрос недоступен' });
    }
    const ready = testDriveCheckInSurveyPositive(report);
    const checkInStatus = ready ? 'checked_in' : 'issues_reported';
    await testDriveBookingQueries.saveCheckInReport(
      booking.id,
      JSON.stringify(report),
      checkInStatus
    );
    return res.json({ success: true, data: { booking_id: booking.id, check_in_status: checkInStatus } });
  } catch (error) {
    console.error('PUT test-drive-survey/:token/report:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/test-drive-feedback/:token/detail — оценка после проживания (публичная ссылка)
 */
app.get('/api/test-drive-feedback/:token/detail', async (req, res) => {
  try {
    await testDriveBookingQueries.ensureTable();
    const token = String(req.params.token || '').trim();
    const booking = await testDriveBookingQueries.getByExitFeedbackToken(token);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Ссылка недействительна или устарела' });
    }
    const st = String(booking.status || '').toLowerCase();
    if (st === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Бронирование отменено' });
    }
    if (!['paid', 'approved'].includes(st)) {
      return res.status(400).json({ success: false, error: 'Оценка пока недоступна' });
    }
    const property = await propertyQueries.getById(String(booking.property_id), null);
    if (!property) return res.status(404).json({ success: false, error: 'Объект не найден' });
    const buyer = await userQueries.getById(booking.user_id);
    const prev = parseJsonSafe(booking.exit_feedback_report, null);
    return res.json({
      success: true,
      data: {
        booking: {
          id: booking.id,
          start_date: booking.start_date,
          end_date: booking.end_date,
          status: booking.status,
        },
        buyer: {
          first_name: buyer?.first_name || '',
          last_name: buyer?.last_name || '',
        },
        property: {
          id: property.id,
          title: property.title || `Объект #${property.id}`,
          location: property.location || '',
        },
        already_submitted: Boolean(prev && prev.submitted_at && Number(prev.rating) >= 1),
      },
    });
  } catch (error) {
    console.error('GET test-drive-feedback/:token/detail:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/test-drive-feedback/:token/report — сохранить оценку и текст после проживания
 */
app.put('/api/test-drive-feedback/:token/report', async (req, res) => {
  try {
    await testDriveBookingQueries.ensureTable();
    const token = String(req.params.token || '').trim();
    const report = req.body?.report || null;
    const booking = await testDriveBookingQueries.getByExitFeedbackToken(token);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Ссылка недействительна' });
    }
    if (!report || typeof report !== 'object') {
      return res.status(400).json({ success: false, error: 'report обязателен' });
    }
    const st = String(booking.status || '').toLowerCase();
    if (st === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Бронирование отменено' });
    }
    if (!['paid', 'approved'].includes(st)) {
      return res.status(400).json({ success: false, error: 'Оценка недоступна' });
    }
    const prev = parseJsonSafe(booking.exit_feedback_report, null);
    if (prev && prev.submitted_at) {
      return res.status(409).json({ success: false, error: 'Ответ уже отправлен' });
    }
    const rating = Number(report.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Укажите оценку от 1 до 5' });
    }
    const comment = String(report.comment || '').trim();
    if (comment.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Опишите впечатление не короче 10 символов',
      });
    }
    const payload = {
      rating: Math.round(rating),
      comment,
      submitted_at: new Date().toISOString(),
    };
    await testDriveBookingQueries.saveExitFeedbackReport(booking.id, JSON.stringify(payload));
    return res.json({ success: true, data: { booking_id: booking.id } });
  } catch (error) {
    console.error('PUT test-drive-feedback/:token/report:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/test-drive-bookings/:bookingId/check-in-report — отчет о заселении покупателя
 */
app.put('/api/test-drive-bookings/:bookingId/check-in-report', async (req, res) => {
  try {
    await testDriveBookingQueries.ensureTable();
    const bookingId = parseInt(req.params.bookingId, 10);
    const userId = parseInt(String(req.body?.user_id || ''), 10);
    const report = req.body?.report || null;
    if (!Number.isFinite(bookingId) || !Number.isFinite(userId)) {
      return res.status(400).json({ success: false, error: 'Некорректные bookingId/user_id' });
    }
    if (!report || typeof report !== 'object') {
      return res.status(400).json({ success: false, error: 'report обязателен' });
    }
    const booking = await testDriveBookingQueries.getById(bookingId);
    if (!booking) return res.status(404).json({ success: false, error: 'Бронь не найдена' });
    if (Number(booking.user_id) !== userId) {
      return res.status(403).json({ success: false, error: 'Доступ запрещен' });
    }
    const bookingStatus = String(booking.status || '').toLowerCase();
    if (!['approved', 'paid'].includes(bookingStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Опрос доступен только для оплаченной или подтверждённой брони',
      });
    }
    const ready = testDriveCheckInSurveyPositive(report);
    const checkInStatus = ready ? 'checked_in' : 'issues_reported';
    await testDriveBookingQueries.saveCheckInReport(
      bookingId,
      JSON.stringify(report),
      checkInStatus
    );
    return res.json({ success: true, data: { booking_id: bookingId, check_in_status: checkInStatus } });
  } catch (error) {
    console.error('PUT test-drive-bookings/:bookingId/check-in-report:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/test-drive-bookings/owner/:ownerUserId — заявки на тест-драйв по объектам продавца
 */
app.get('/api/test-drive-bookings/owner/:ownerUserId', async (req, res) => {
  try {
    const ownerUserId = parseInt(req.params.ownerUserId, 10);
    if (!ownerUserId || Number.isNaN(ownerUserId)) {
      return res.status(400).json({ success: false, error: 'Некорректный ownerUserId' });
    }
    await testDriveBookingQueries.ensureTable();
    const rows = await testDriveBookingQueries.listByOwnerUserId(ownerUserId);
    const prisma = getPrisma();
    const data = await Promise.all(
      rows.map(async (row) => {
        const withTitle = await enrichTestDriveBookingWithPropertyTitle(row);
        let buyer_display = null;
        try {
          const u = await prisma.users.findUnique({
            where: { id: Number(row.user_id) },
            select: { first_name: true, last_name: true, email: true },
          });
          if (u) {
            buyer_display =
              [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email || null;
          }
        } catch {
          /* ignore */
        }
        return { ...withTitle, buyer_display };
      })
    );
    const merged = await mergeTestDriveOwnerBookingsWithPayments(data);
    return res.json({ success: true, data: merged });
  } catch (error) {
    console.error('GET test-drive-bookings/owner:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/properties/:id - Получить объявление по ID
 * ВАЖНО: Этот маршрут должен быть ПОСЛЕ всех специфичных маршрутов
 */
app.get('/api/properties/:id', async (req, res) => {
  const { id } = req.params;
  
  // Специальный маршрут для UI калькулятора (нельзя полагаться на порядок роутов:
  // GET /api/properties/:id перехватывает calculator-options как "id").
  if (id === 'calculator-options') {
    return res.json({
      success: true,
      data: {
        cities: SPAIN_CITIES,
        districtsByCity: DISTRICTS_BY_CITY
      }
    });
  }

  // Игнорируем специальные пути, которые должны обрабатываться другими маршрутами
  if (id === 'test-timers' || id === 'pending' || id === 'approved' || id === 'auctions' || id === 'user' || id === 'shares' || id === 'search-options') {
    console.log('⚠️ GET /api/properties/:id - Игнорируем специальный путь:', id);
    return res.status(404).json({ success: false, error: 'Маршрут не найден' });
  }
  
  try {
    const requestedPropertyType = req.query.property_type || null; // apartment | commercial | house | villa — для однозначного поиска доли
    console.log(`🔍 GET /api/properties/:id - Поиск объекта с ID=${id}, property_type=${requestedPropertyType || 'любой'}`);
    const property = await propertyQueries.getById(id, requestedPropertyType);
    
    if (!property) {
      console.log(`❌ GET /api/properties/:id - Объект с ID=${id} не найден`);
      return res.status(404).json({ success: false, error: 'Объявление не найдено' });
    }
    
    console.log(`✅ GET /api/properties/:id - Объект найден:`, {
      id: property.id,
      property_type: property.property_type,
      source_table: property.source_table || 'unknown',
      title: property.title
    });
    
    // Получаем информацию о пользователе
    const user = await userQueries.getById(property.user_id);
    if (user) {
      property.first_name = user.first_name;
      property.last_name = user.last_name;
      property.email = user.email;
      property.phone_number = user.phone_number;
      property.role = user.role;
    }
    
    const hasTestTimerDurationField = typeof property.test_timer_duration !== 'undefined';

    // Логируем данные из базы для отладки
    console.log('📥 GET /api/properties/:id - Данные из БД:', {
      id: property.id,
      property_type: property.property_type,
      source_table: property.source_table || 'unknown',
      rooms: property.rooms,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      living_area: property.living_area,
      land_area: property.land_area,
      floor: property.floor,
      floors: property.floors,
      total_floors: property.total_floors,
      year_built: property.year_built,
      building_type: property.building_type,
      balcony: property.balcony,
      parking: property.parking,
      elevator: property.elevator,
      pool: property.pool,
      garden: property.garden,
      garage: property.garage,
      price: property.price,
      auction_starting_price: property.auction_starting_price,
      test_drive: property.test_drive,
      moderation_status: property.moderation_status,
    });
    
    console.log('🔍 GET /api/properties/:id - test_drive из БД:', {
      test_drive: property.test_drive,
      test_drive_type: typeof property.test_drive,
      test_drive_raw: property.test_drive
    });

    // Парсим JSON поля (если они еще не распарсены)
    const formatted = { ...property };
    
    // Проверяем, нужно ли парсить (если это строка, значит еще не распарсено)
    if (formatted.photos && typeof formatted.photos === 'string') {
      try {
        formatted.photos = JSON.parse(formatted.photos);
      } catch (e) {
        formatted.photos = [];
      }
    } else if (!formatted.photos) {
      formatted.photos = [];
    }
    
    if (formatted.videos && typeof formatted.videos === 'string') {
      try {
        formatted.videos = JSON.parse(formatted.videos);
      } catch (e) {
        formatted.videos = [];
      }
    } else if (!formatted.videos) {
      formatted.videos = [];
    }
    
    if (formatted.additional_documents && typeof formatted.additional_documents === 'string') {
      try {
        formatted.additional_documents = JSON.parse(formatted.additional_documents);
      } catch (e) {
        formatted.additional_documents = [];
      }
    } else if (!formatted.additional_documents) {
      formatted.additional_documents = [];
    }
    
    if (formatted.test_drive_data && typeof formatted.test_drive_data === 'string') {
      try {
        formatted.test_drive_data = JSON.parse(formatted.test_drive_data);
      } catch (e) {
        formatted.test_drive_data = null;
      }
    }
    
    // Парсим amenities (JSON массив удобств)
    let amenitiesArray = [];
    if (formatted.amenities && typeof formatted.amenities === 'string') {
      try {
        amenitiesArray = JSON.parse(formatted.amenities);
      } catch (e) {
        console.warn('⚠️ Ошибка парсинга amenities для property ID', formatted.id, ':', e.message);
        amenitiesArray = [];
      }
    } else if (Array.isArray(formatted.amenities)) {
      // Уже массив, оставляем как есть
      amenitiesArray = formatted.amenities;
    } else if (!formatted.amenities) {
      amenitiesArray = [];
    }
    
    // Сохраняем массив amenities
    formatted.amenities = amenitiesArray;
    
    // Преобразуем массив amenities в отдельные булевы поля для фронтенда
    // (так как фронтенд ожидает отдельные поля, а не массив)
    formatted.balcony = amenitiesArray.includes('balcony') || formatted.balcony === 1 || formatted.balcony === true;
    formatted.parking = amenitiesArray.includes('parking') || formatted.parking === 1 || formatted.parking === true;
    formatted.elevator = amenitiesArray.includes('elevator') || formatted.elevator === 1 || formatted.elevator === true;
    formatted.electricity = amenitiesArray.includes('electricity') || formatted.electricity === 1 || formatted.electricity === true;
    formatted.internet = amenitiesArray.includes('internet') || formatted.internet === 1 || formatted.internet === true;
    formatted.security = amenitiesArray.includes('security') || formatted.security === 1 || formatted.security === true;
    formatted.furniture = amenitiesArray.includes('furniture') || formatted.furniture === 1 || formatted.furniture === true;
    
    // Обрабатываем feature поля (feature1, feature2, ...)
    for (let i = 1; i <= 26; i++) {
      const featureKey = `feature${i}`;
      formatted[featureKey] = amenitiesArray.includes(featureKey) || formatted[featureKey] === 1 || formatted[featureKey] === true;
    }
    
    // Для домов/вилл маппим floors в total_floors для совместимости с фронтендом
    // и добавляем удобства pool, garden, garage
    if (formatted.property_type === 'house' || formatted.property_type === 'villa') {
      if (formatted.floors !== undefined && formatted.floors !== null) {
        formatted.total_floors = formatted.floors;
      }
      // Добавляем удобства для домов/вилл
      formatted.pool = amenitiesArray.includes('pool') || formatted.pool === 1 || formatted.pool === true;
      formatted.garden = amenitiesArray.includes('garden') || formatted.garden === 1 || formatted.garden === true;
      formatted.garage = amenitiesArray.includes('garage') || formatted.garage === 1 || formatted.garage === true;
    }
    
    // additional_amenities - это текстовое поле, которое пользователь вводит сам
    // Убеждаемся, что оно всегда возвращается (даже если null или пустое)
    if (formatted.additional_amenities === undefined) {
      formatted.additional_amenities = null;
    }
    
    // Обрабатываем координаты
    if (formatted.coordinates) {
      try {
        if (typeof formatted.coordinates === 'string') {
          // Проверяем, это JSON строка или строка с запятой
          if (formatted.coordinates.startsWith('[') || formatted.coordinates.startsWith('{')) {
            const parsed = JSON.parse(formatted.coordinates);
            if (Array.isArray(parsed) && parsed.length >= 2) {
              formatted.coordinates = [parseFloat(parsed[0]), parseFloat(parsed[1])];
            } else {
              formatted.coordinates = null;
            }
          } else {
            // Строка вида "lat,lng"
            const parts = formatted.coordinates.split(',');
            if (parts.length >= 2) {
              formatted.coordinates = [parseFloat(parts[0]), parseFloat(parts[1])];
            } else {
              formatted.coordinates = null;
            }
          }
        } else if (Array.isArray(formatted.coordinates) && formatted.coordinates.length >= 2) {
          // Уже массив, просто убеждаемся что это числа
          formatted.coordinates = [parseFloat(formatted.coordinates[0]), parseFloat(formatted.coordinates[1])];
        }
      } catch (e) {
        console.warn('Ошибка парсинга coordinates:', e);
        formatted.coordinates = null;
      }
    }

    // Если есть тестовый таймер, используем его для endTime
    if (formatted.test_timer_end_date) {
      formatted.endTime = formatted.test_timer_end_date;
      formatted.isAuction = true;
    } else if (formatted.auction_end_date && formatted.is_auction) {
      formatted.endTime = formatted.auction_end_date;
      formatted.isAuction = true;
    }

    // Убеждаемся, что test_timer_duration возвращается (если поле существует)
    if (hasTestTimerDurationField && formatted.test_timer_duration !== undefined) {
      formatted.test_timer_duration = formatted.test_timer_duration || null;
    }
    
    // Проверяем резервацию объекта
    console.log(`🔍 GET /api/properties/:id - Проверка резервации для объекта ID=${id}`);
    const reservationInfo = await propertyQueries.isReserved(id);
    console.log(`🔍 GET /api/properties/:id - Результат проверки резервации:`, reservationInfo);
    
    formatted.is_reserved = reservationInfo.isReserved || false;
    formatted.reserved_until = reservationInfo.reservedUntil || null;
    formatted.reserved_by = reservationInfo.reservedBy || null;
    formatted.reservation_time_remaining = reservationInfo.timeRemaining || null;

    // Подстановка перевода по языку (lang из футера сайта)
    const lang = req.query.lang && String(req.query.lang).trim().toLowerCase();
    if (lang && ['ru', 'en', 'de', 'es', 'fr', 'sv'].includes(lang)) {
      try {
        const table = property.source_table || 'properties_apartments';
        const tr = await getPrisma().property_translations.findUnique({
          where: {
            property_id_property_table_lang_code: {
              property_id: Number(id),
              property_table: String(table),
              lang_code: String(lang),
            },
          },
          select: { title: true, description: true, additional_amenities: true, location: true },
        });
        if (tr) {
          if (tr.title) formatted.title = tr.title;
          if (tr.description) formatted.description = tr.description;
          if (tr.additional_amenities != null) formatted.additional_amenities = tr.additional_amenities;
          if (tr.location != null) formatted.location = tr.location;
        }
      } catch (e) {
        console.warn('GET /api/properties/:id - подстановка перевода:', e.message);
      }
    }

    // Документы по долгу (необходимые документы при продаже долга)
    if (formatted.is_debt === 1 || formatted.sale_type === 'debt' || formatted.has_debt === 1) {
      try {
        formatted.debt_documents = await debtDocumentQueries.getByProperty(formatted.id, formatted.property_type);
      } catch (e) {
        formatted.debt_documents = [];
      }
    } else {
      formatted.debt_documents = [];
    }
    
    console.log('🔍 GET /api/properties/:id - Отправляем formatted с резервацией:', {
      test_drive: formatted.test_drive,
      test_drive_type: typeof formatted.test_drive,
      test_timer_end_date: formatted.test_timer_end_date,
      test_timer_duration: formatted.test_timer_duration,
      endTime: formatted.endTime,
      is_reserved: formatted.is_reserved,
      reserved_until: formatted.reserved_until,
      reserved_by: formatted.reserved_by,
      reservation_time_remaining: formatted.reservation_time_remaining
    });
    const forModeration =
      req.query.for_moderation === '1' ||
      req.query.for_moderation === 1 ||
      req.query.for_moderation === 'true';
    const pcOnly =
      formatted.private_club_only === 1 ||
      formatted.private_club_only === true ||
      formatted.private_club_only === '1';
    if (pcOnly && String(formatted.moderation_status || '').toLowerCase() === 'approved' && !forModeration) {
      const viewerRaw = req.query.viewer_user_id;
      const viewerId =
        viewerRaw != null && String(viewerRaw).trim() !== '' ? Number(viewerRaw) : NaN;
      const ownerId = Number(formatted.user_id);
      const isOwner =
        Number.isFinite(viewerId) && Number.isFinite(ownerId) && viewerId === ownerId;
      const vipOk =
        Number.isFinite(viewerId) &&
        viewerId >= 1 &&
        (await userQueries.hasPrivateClubVipAccess(viewerId));
      if (!isOwner && !vipOk) {
        return res.status(403).json({
          success: false,
          error: 'Объект доступен только участникам VIP',
          code: 'PRIVATE_CLUB_ONLY',
        });
      }
    }

    formatted.name = formatted.title || formatted.name || '';
    applyListingPhotosToFormatted(formatted);
    applyFormattedPropertyAmenities(formatted);
    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Ошибка при получении объявления:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/properties/user/:userId - Получить все объявления пользователя
 */
app.get('/api/properties/user/:userId', async (req, res) => {
  try {
    const prisma = getPrisma();
    const { userId } = req.params;
    console.log('📥 Запрос объявлений пользователя:', userId);
    
    // Получаем информацию о пользователе
    const user = await userQueries.getById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    // Используем функцию из propertyQueries, которая работает с новыми таблицами
    const properties = await propertyQueries.getByUserId(userId);
    
    console.log(`✅ Найдено объявлений пользователя: ${properties.length}`);
    if (properties.length > 0) {
      console.log('📋 ID объявлений:', properties.map(p => p.id).join(', '));
      console.log('📋 Типы объявлений:', properties.map(p => p.property_type).join(', '));
      console.log('📋 Статусы модерации:', properties.map(p => p.moderation_status).join(', '));
    } else {
      console.log('⚠️ Объявления не найдены для пользователя:', userId);
    }

    // Ищем pending-запросы на редактирование (legacy поток: таблица properties, rejection_reason=EDIT:<id>)
    const pendingEditRows = await prisma.properties.findMany({
      where: {
        user_id: Number(userId),
        moderation_status: 'pending',
        rejection_reason: { startsWith: 'EDIT:' },
      },
      select: { id: true, rejection_reason: true, created_at: true },
      orderBy: { created_at: 'desc' },
    });
    const pendingEditByOriginalId = new Map();
    for (const row of pendingEditRows) {
      const match = String(row.rejection_reason || '').match(/^EDIT:(\d+)$/);
      if (!match) continue;
      const originalId = Number(match[1]);
      if (!Number.isFinite(originalId)) continue;
      if (!pendingEditByOriginalId.has(originalId)) {
        pendingEditByOriginalId.set(originalId, {
          request_id: row.id,
          request_created_at: row.created_at,
        });
      }
    }

    // Добавляем информацию о пользователе к каждому объекту и парсим JSON поля
    let formattedProperties = properties.map(prop => {
      const formatted = { ...prop };
      
      // Добавляем информацию о пользователе
      formatted.first_name = user.first_name;
      formatted.last_name = user.last_name;
      formatted.email = user.email;
      formatted.phone_number = user.phone_number;
      formatted.role = user.role;
      const pendingEditMeta = pendingEditByOriginalId.get(Number(formatted.id)) || null;
      formatted.has_pending_edit = !!pendingEditMeta;
      formatted.pending_edit_request_id = pendingEditMeta?.request_id || null;
      formatted.pending_edit_requested_at = pendingEditMeta?.request_created_at || null;
      
      // Парсим JSON поля безопасно
      if (formatted.photos && typeof formatted.photos === 'string') {
        try {
          formatted.photos = JSON.parse(formatted.photos);
        } catch (e) {
          formatted.photos = [];
        }
      } else if (!formatted.photos) {
        formatted.photos = [];
      }
      if (formatted.videos && typeof formatted.videos === 'string') {
        try {
          formatted.videos = JSON.parse(formatted.videos);
        } catch (e) {
          formatted.videos = [];
        }
      } else if (!formatted.videos) {
        formatted.videos = [];
      }
      if (formatted.additional_documents && typeof formatted.additional_documents === 'string') {
        try {
          formatted.additional_documents = JSON.parse(formatted.additional_documents);
        } catch (e) {
          formatted.additional_documents = [];
        }
      } else if (!formatted.additional_documents) {
        formatted.additional_documents = [];
      }
      if (formatted.test_drive_data && typeof formatted.test_drive_data === 'string') {
        try {
          formatted.test_drive_data = JSON.parse(formatted.test_drive_data);
        } catch (e) {
          formatted.test_drive_data = null;
        }
      }
      if (formatted.amenities && typeof formatted.amenities === 'string') {
        try {
          formatted.amenities = JSON.parse(formatted.amenities);
        } catch (e) {
          formatted.amenities = [];
        }
      } else if (!formatted.amenities) {
        formatted.amenities = [];
      }
      if (formatted.coordinates && typeof formatted.coordinates === 'string') {
        try {
          formatted.coordinates = JSON.parse(formatted.coordinates);
        } catch (e) {
          formatted.coordinates = null;
        }
      }
      
      // Для домов/вилл маппим floors в total_floors и добавляем удобства
      if (formatted.property_type === 'house' || formatted.property_type === 'villa') {
        if (formatted.floors !== undefined && formatted.floors !== null) {
          formatted.total_floors = formatted.floors;
        }
        // Добавляем удобства для домов/вилл из amenities массива
        if (Array.isArray(formatted.amenities)) {
          formatted.pool = formatted.amenities.includes('pool') || formatted.pool === 1 || formatted.pool === true;
          formatted.garden = formatted.amenities.includes('garden') || formatted.garden === 1 || formatted.garden === true;
          formatted.garage = formatted.amenities.includes('garage') || formatted.garage === 1 || formatted.garage === true;
        }
        // Убеждаемся, что land_area передается
        formatted.land_area = formatted.land_area || null;
        // Убеждаемся, что bedrooms передается для домов/вилл (сохраняем 0 как валидное значение)
        formatted.bedrooms = (formatted.bedrooms !== undefined && formatted.bedrooms !== null && formatted.bedrooms !== '') ? formatted.bedrooms : null;
      }

      formatted.name = formatted.title || formatted.name || '';
      applyListingPhotosToFormatted(formatted);
      
      return formatted;
    });

    const idTableConditions = [];
    const seenPair = new Set();
    for (const p of formattedProperties) {
      const id = Number(p.id);
      if (!Number.isFinite(id)) continue;
      const table = engagementTableFromPropertyRow(p);
      const k = `${id}\0${table}`;
      if (seenPair.has(k)) continue;
      seenPair.add(k);
      idTableConditions.push({ property_id: id, property_table: table });
    }

    if (idTableConditions.length > 0) {
      try {
        const [favGroups, bidCountGroups] = await Promise.all([
          prisma.property_favorites.groupBy({
            by: ['property_id', 'property_table'],
            where: { OR: idTableConditions },
            _count: { _all: true },
          }),
          prisma.bids.groupBy({
            by: ['property_id', 'property_table'],
            where: { OR: idTableConditions },
            _count: { _all: true },
          }),
        ]);
        const toCountMap = (rows) =>
          new Map(rows.map((r) => [`${r.property_id}\0${r.property_table}`, r._count._all]));
        const likesMap = toCountMap(favGroups);
        const bidsCountMap = toCountMap(bidCountGroups);

        let nullBidByPropertyId = new Map();
        const aptIds = formattedProperties
          .filter((p) => engagementTableFromPropertyRow(p) === 'properties_apartments')
          .map((p) => Number(p.id))
          .filter((id) => Number.isFinite(id));
        if (aptIds.length > 0) {
          const nullRows = await prisma.bids.groupBy({
            by: ['property_id'],
            where: { property_id: { in: aptIds }, property_table: null },
            _count: { _all: true },
          });
          nullBidByPropertyId = new Map(nullRows.map((r) => [r.property_id, r._count._all]));
        }

        formattedProperties = formattedProperties.map((p) => {
          const id = Number(p.id);
          const table = engagementTableFromPropertyRow(p);
          const key = `${id}\0${table}`;
          let bids = bidsCountMap.get(key) ?? 0;
          if (table === 'properties_apartments') {
            bids += nullBidByPropertyId.get(id) ?? 0;
          }
          return {
            ...p,
            likes_count: likesMap.get(key) ?? 0,
            bids_count: bids,
          };
        });
      } catch (aggErr) {
        console.warn('GET /api/properties/user — лайки/кол-во ставок:', aggErr?.message || aggErr);
        formattedProperties = formattedProperties.map((p) => ({
          ...p,
          likes_count: 0,
          bids_count: 0,
        }));
      }
    } else {
      formattedProperties = formattedProperties.map((p) => ({
        ...p,
        likes_count: 0,
        bids_count: 0,
      }));
    }

    const isAuctionRow = (p) =>
      p.is_auction === 1 ||
      p.is_auction === true ||
      p.is_auction === '1' ||
      p.is_auction === 'true';

    const auctionPropertyIds = formattedProperties
      .filter(isAuctionRow)
      .map((p) => Number(p.id))
      .filter((id) => Number.isFinite(id));

    try {
      formattedProperties = await enrichListingPropertiesWithMaxBids(prisma, formattedProperties);
    } catch (bidAggErr) {
      console.warn('GET /api/properties/user — агрегация ставок:', bidAggErr?.message || bidAggErr);
    }

    res.json({ success: true, data: formattedProperties });
  } catch (error) {
    console.error('Ошибка при получении объявлений пользователя:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/owner/:userId/my-sales — продажи продавца по разделам (аукцион после кругового таймера, доли, долги, купить сейчас).
 */
app.get('/api/owner/:userId/my-sales', async (req, res) => {
  try {
    const prisma = getPrisma();
    await testDriveBookingQueries.ensureTable();
    const uid = parseInt(String(req.params.userId).trim(), 10);
    if (!uid || Number.isNaN(uid)) {
      return res.status(400).json({ success: false, error: 'Некорректный user_id' });
    }

    const parsePhotosField = (raw) => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') {
        try {
          const p = JSON.parse(raw);
          return Array.isArray(p) ? p : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    const firstCover = (photosField) => {
      const arr = parsePhotosField(photosField);
      const first = arr[0];
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object' && first.url) return String(first.url);
      return null;
    };

    const isDebtRow = (p) =>
      p &&
      (p.sale_type === 'debt' ||
        p.is_debt === 1 ||
        p.is_debt === true ||
        p.has_debt === 1 ||
        p.has_debt === true);

    const isShareRow = (p) =>
      p &&
      (p.is_share === 1 ||
        p.is_share === true ||
        p.sale_type === 'share' ||
        p.is_shared_ownership === 1 ||
        p.is_shared_ownership === true ||
        p.is_shared === 1 ||
        p.is_shared === true);

    const hadCircularAuctionRow = (p) => {
      if (!p) return false;
      const dur = Number(p.test_timer_duration);
      if (Number.isFinite(dur) && dur > 0) return true;
      const end = p.test_timer_end_date;
      return end != null && String(end).trim() !== '';
    };

    const isAuctionRow = (p) =>
      p &&
      (p.is_auction === 1 || p.is_auction === true || p.is_auction === '1' || p.is_auction === 'true');

    const [apartments, houses] = await Promise.all([
      prisma.properties_apartments.findMany({ where: { user_id: uid } }),
      prisma.properties_houses.findMany({ where: { user_id: uid } }),
    ]);

    const attachMeta = (row, sourceTable) => {
      const photos = parsePhotosField(row.photos);
      const tbl =
        row.property_type === 'house' || row.property_type === 'villa'
          ? 'properties_houses'
          : 'properties_apartments';
      return {
        ...row,
        source_table: sourceTable,
        property_table: tbl,
        photos,
        cover_url: firstCover(row.photos),
      };
    };

    const ownerProps = [
      ...apartments.map((r) => attachMeta(r, 'apartments')),
      ...houses.map((r) => attachMeta(r, 'houses')),
    ];

    const propByKey = new Map();
    for (const p of ownerProps) {
      propByKey.set(`${p.property_table}:${Number(p.id)}`, p);
    }

    const aptIds = apartments.map((p) => Number(p.id)).filter(Number.isFinite);
    const houseIds = houses.map((p) => Number(p.id)).filter(Number.isFinite);
    const orWinner = [];
    if (aptIds.length) {
      orWinner.push({ property_id: { in: aptIds }, property_table: 'properties_apartments' });
    }
    if (houseIds.length) {
      orWinner.push({ property_id: { in: houseIds }, property_table: 'properties_houses' });
    }

    let winners = [];
    if (orWinner.length) {
      winners = await prisma.auction_winners.findMany({
        where: { OR: orWinner },
        orderBy: { won_at: 'desc' },
      });
    }

    const winnerDedup = [];
    const seenWinner = new Set();
    for (const w of winners) {
      const tbl = w.property_table === 'properties_houses' ? 'properties_houses' : 'properties_apartments';
      const k = `${tbl}:${Number(w.property_id)}`;
      if (seenWinner.has(k)) continue;
      seenWinner.add(k);
      winnerDedup.push({ ...w, property_table: tbl });
    }

    const winnerKeySet = new Set(winnerDedup.map((w) => `${w.property_table}:${Number(w.property_id)}`));

    const auction = [];
    const debts = [];

    for (const w of winnerDedup) {
      const p = propByKey.get(`${w.property_table}:${Number(w.property_id)}`);
      if (!p) continue;
      const debt = isDebtRow(p);
      const base = {
        id: p.id,
        property_type: p.property_type,
        property_table: w.property_table,
        source_table: p.source_table,
        title: p.title || '',
        location: p.location || '',
        currency: w.currency || p.currency || 'USD',
        sale_amount: Number(w.winning_bid_amount) || 0,
        sold_at: w.won_at,
        photos: p.photos,
        cover_url: p.cover_url,
      };
      if (debt) {
        debts.push(base);
        continue;
      }
      if (isAuctionRow(p) && hadCircularAuctionRow(p)) {
        auction.push(base);
      }
    }

    const shareCandidates = ownerProps.filter((p) => {
      if (!isShareRow(p)) return false;
      const sold = Number(p.shares_sold) || 0;
      return sold > 0;
    });
    const sharePropIds = shareCandidates.map((p) => Number(p.id)).filter(Number.isFinite);
    let allSharePurchases = [];
    if (sharePropIds.length) {
      allSharePurchases = await prisma.property_shares.findMany({
        where: { property_id: { in: sharePropIds }, status: 'completed' },
      });
    }
    const purchasesByPropertyId = new Map();
    for (const r of allSharePurchases) {
      const pid = Number(r.property_id);
      if (!Number.isFinite(pid)) continue;
      if (!purchasesByPropertyId.has(pid)) purchasesByPropertyId.set(pid, []);
      purchasesByPropertyId.get(pid).push(r);
    }

    const shares = [];
    for (const p of shareCandidates) {
      const sold = Number(p.shares_sold) || 0;
      const total = Number(p.total_shares) || 0;
      const shareRows = purchasesByPropertyId.get(Number(p.id)) || [];
      const relevant = shareRows.filter((r) => {
        const pt = String(r.property_type || '').toLowerCase();
        const ppt = String(p.property_type || '').toLowerCase();
        return pt === ppt || (ppt === 'commercial' && pt === 'apartment');
      });
      const sumTotal = relevant.reduce((s, r) => s + (Number(r.total_price) || 0), 0);
      const amount = sumTotal > 0 ? sumTotal : 0;
      const pct = total > 0 ? Math.min(100, (sold / total) * 100) : null;
      const purchaseTimes = relevant
        .map((r) => (r.purchase_date ? new Date(r.purchase_date).getTime() : NaN))
        .filter((t) => Number.isFinite(t));
      const sold_at =
        purchaseTimes.length > 0 ? new Date(Math.max(...purchaseTimes)).toISOString() : null;
      shares.push({
        id: p.id,
        property_type: p.property_type,
        property_table: p.property_table,
        source_table: p.source_table,
        title: p.title || '',
        location: p.location || '',
        currency: p.currency || 'USD',
        sale_amount: amount,
        percent_sold: pct,
        shares_sold: sold,
        total_shares: total,
        sold_at,
        photos: p.photos,
        cover_url: p.cover_url,
      });
    }

    const buy_now = [];
    for (const p of ownerProps) {
      const bn =
        p.buy_now_completed_at != null && String(p.buy_now_completed_at).trim() !== '';
      if (!bn) continue;
      if (isShareRow(p)) continue;
      const k = `${p.property_table}:${Number(p.id)}`;
      if (winnerKeySet.has(k)) continue;
      const debt = isDebtRow(p);
      const amount = Number(p.price) || 0;
      const row = {
        id: p.id,
        property_type: p.property_type,
        property_table: p.property_table,
        source_table: p.source_table,
        title: p.title || '',
        location: p.location || '',
        currency: p.currency || 'USD',
        sale_amount: amount,
        sold_at: p.buy_now_completed_at,
        photos: p.photos,
        cover_url: p.cover_url,
      };
      if (debt) {
        const exists = debts.find((d) => Number(d.id) === Number(p.id) && d.property_table === p.property_table);
        if (!exists) debts.push(row);
      } else {
        buy_now.push(row);
      }
    }

    const tdPayments = await prisma.stripe_payments.findMany({
      where: { plan_key: 'test_drive_booking', status: 'paid' },
      orderBy: { paid_at: 'desc' },
      take: 2000,
    });
    const test_drive = [];
    for (const pay of tdPayments) {
      let billing = {};
      try {
        billing = JSON.parse(pay.billing_reason || '{}');
      } catch {
        billing = {};
      }
      const ownerId = Number(billing.owner_user_id);
      if (!Number.isFinite(ownerId) || ownerId !== uid) continue;
      const table = String(billing.property_table || 'properties_apartments');
      const pid = Number(billing.property_id);
      if (!Number.isFinite(pid)) continue;
      const prop = propByKey.get(`${table}:${pid}`);
      if (!prop) continue;
      const bookingId = Number(billing.booking_id);
      if (!Number.isFinite(bookingId)) continue;
      const booking = await testDriveBookingQueries.getById(bookingId);
      if (!booking) continue;
      test_drive.push({
        id: pid,
        booking_id: bookingId,
        buyer_user_id: Number(booking.user_id),
        booking_status: booking.status || null,
        start_date: booking.start_date || null,
        end_date: booking.end_date || null,
        owner_comment: booking.owner_comment || null,
        check_in_status: booking.check_in_status || null,
        property_type: prop.property_type,
        property_table: table,
        source_table: prop.source_table,
        title: prop.title || '',
        location: prop.location || '',
        currency: (pay.currency || prop.currency || 'USD').toString().toUpperCase(),
        sale_amount: Number(pay.amount_cents || 0) / 100,
        sold_at: pay.paid_at || pay.created_at || null,
        photos: prop.photos,
        cover_url: prop.cover_url,
      });
    }

    res.json({
      success: true,
      data: {
        auction,
        shares,
        debts,
        buy_now,
        test_drive,
      },
    });
  } catch (error) {
    console.error('GET /api/owner/:userId/my-sales:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/owner/:userId/sale-celebrations — свежие события продажи для поздравления в кабинете продавца.
 */
app.get('/api/owner/:userId/sale-celebrations', async (req, res) => {
  try {
    const prisma = getPrisma();
    const uid = parseInt(String(req.params.userId).trim(), 10);
    if (!uid || Number.isNaN(uid)) {
      return res.status(400).json({ success: false, error: 'Некорректный user_id' });
    }
    const items = await buildOwnerSaleCelebrations(prisma, uid);
    res.json({ success: true, data: { items } });
  } catch (error) {
    console.error('GET /api/owner/:userId/sale-celebrations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/test-drive-bookings/:bookingId/cancel-by-owner — продавец снимает бронь с причиной
 */
app.put('/api/test-drive-bookings/:bookingId/cancel-by-owner', async (req, res) => {
  try {
    await testDriveBookingQueries.ensureTable();
    const bookingId = parseInt(req.params.bookingId, 10);
    const ownerId = parseInt(String(req.body?.user_id || ''), 10);
    const reason = String(req.body?.reason || '').trim();
    if (!Number.isFinite(bookingId) || !Number.isFinite(ownerId)) {
      return res.status(400).json({ success: false, error: 'Некорректные bookingId/user_id' });
    }
    if (!reason) {
      return res.status(400).json({ success: false, error: 'Укажите причину снятия брони' });
    }
    const booking = await testDriveBookingQueries.getById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Бронь не найдена' });
    }
    const st = String(booking.status || '').toLowerCase();
    if (!['pending', 'approved', 'paid'].includes(st)) {
      return res.status(400).json({ success: false, error: 'Бронь нельзя снять в текущем статусе' });
    }
    const property = await propertyQueries.getById(String(booking.property_id), null);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объект не найден' });
    }
    const propertyOwnerId = parseInt(String(property.user_id), 10);
    if (!Number.isFinite(propertyOwnerId) || propertyOwnerId !== ownerId) {
      return res.status(403).json({ success: false, error: 'Только владелец может снять бронь' });
    }
    const buyerUserId = parseInt(String(booking.user_id), 10);
    if (!Number.isFinite(buyerUserId)) {
      return res.status(500).json({ success: false, error: 'Некорректный покупатель в брони' });
    }

    await getPrisma().$executeRaw`
      UPDATE test_drive_bookings
      SET status = 'cancelled',
          cancelled_by = 'owner',
          cancellation_reason_code = 'owner_reason',
          cancellation_reason = ${reason},
          cancelled_at = NOW()
      WHERE id = ${bookingId}
    `;
    if (booking.owner_notification_id) {
      try {
        await notificationQueries.delete(booking.owner_notification_id);
      } catch {
        /* ignore */
      }
    }
    await notificationQueries.create({
      user_id: buyerUserId,
      type: 'test_drive_cancelled',
      title: 'Бронь тест-драйва снята',
      message: `Продавец снял бронь тест-драйва по объекту «${
        property.title || `Объект #${booking.property_id}`
      }». Причина: ${reason}`,
      data: {
        booking_id: bookingId,
        property_id: booking.property_id,
        property_table: booking.property_table,
        reason,
      },
      is_read: 0,
      view_count: 0,
    });
    try {
      broadcastUserCabinetEvent(buyerUserId, { type: 'notifications_refresh' });
    } catch {
      /* ignore */
    }
    return res.json({ success: true, data: { booking_id: bookingId, cancelled: true } });
  } catch (error) {
    console.error('PUT test-drive-bookings cancel-by-owner:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/properties/:id/approve - Одобрить объявление
 */
app.put('/api/properties/:id/approve', async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const {
      reviewed_by,
      property_type: requestedPropertyType,
      debt_severity,
      private_club_only: privateClubOnlyBody,
    } = req.body;
    const privateClubOnly =
      privateClubOnlyBody === true || privateClubOnlyBody === 1 || privateClubOnlyBody === '1';

    const nid = Number(id);
    let property = null;
    let resolvedByCrossTableLookup = false;

    // Запросы на редактирование/удаление хранятся в legacy `properties` с rejection_reason EDIT:/DELETE:
    // их нужно загружать в первую очередь, иначе при совпадении id с квартирой/домом одобряется не та запись.
    const legacyPendingRow = Number.isFinite(nid)
      ? await prisma.properties.findUnique({ where: { id: nid } })
      : null;
    const legacyModerationRequest =
      legacyPendingRow &&
      (String(legacyPendingRow.rejection_reason || '').startsWith('EDIT:') ||
        String(legacyPendingRow.rejection_reason || '').startsWith('DELETE:'));

    if (legacyModerationRequest) {
      property = { ...legacyPendingRow, source_table: legacyPendingRow.source_table || 'properties' };
      console.log(
        `📋 Одобрение: legacy moderation id=${id}, rejection_reason=${legacyPendingRow.rejection_reason}`
      );
    } else if (requestedPropertyType) {
    // ВАЖНО: Если property_type передан в запросе, используем его для получения правильного объекта
    // Это предотвращает получение объекта из неправильной таблицы при дубликатах ID
      console.log(`🔍 Одобрение: получен property_type=${requestedPropertyType} из запроса, используем для поиска`);
      property = await propertyQueries.getById(id, requestedPropertyType);
      if (!property) {
        // Fallback для legacy-записей в таблице properties (edit/delete запросы из старого потока)
        const legacyProperty = await prisma.properties.findUnique({ where: { id: Number(id) } });
        if (legacyProperty && legacyProperty.property_type === requestedPropertyType) {
          property = { ...legacyProperty, source_table: 'properties' };
        }
      }
      if (!property) {
        console.error(`❌ Одобрение: объект ID=${id} не найден с типом ${requestedPropertyType} в правильной таблице!`);
        // Безопасный fallback: проверяем обе таблицы и продолжаем ТОЛЬКО если объект найден ровно в одной.
        // Это покрывает кейс, когда фронт отправил неверный property_type.
        try {
          const apartmentCandidate = await propertyQueries.getById(id, 'apartment');
          const houseCandidate = await propertyQueries.getById(id, 'house');
          const found = [apartmentCandidate, houseCandidate].filter(Boolean);

          if (found.length === 1) {
            resolvedByCrossTableLookup = true;
            property = found[0];
            console.warn(
              `⚠️ Одобрение: property_type из запроса (${requestedPropertyType}) оказался неверным. ` +
              `Объект найден через cross-table lookup: фактический тип=${property.property_type}, source=${property.source_table || 'unknown'}`
            );
          } else if (found.length > 1) {
            console.error(
              `❌ Одобрение: обнаружен конфликт ID=${id} — найдено в обеих таблицах. ` +
              `Нужен корректный property_type в запросе.`
            );
            return res.status(409).json({
              success: false,
              error: `Конфликт: объявление с ID ${id} найдено в обеих таблицах. Укажите корректный property_type.`
            });
          } else {
            // Нигде не найдено
            return res.status(404).json({
              success: false,
              error: `Объявление с ID ${id} и типом ${requestedPropertyType} не найдено в правильной таблице`
            });
          }
        } catch (fallbackError) {
          console.error('❌ Одобрение: ошибка cross-table lookup:', fallbackError);
          return res.status(404).json({
            success: false,
            error: `Объявление с ID ${id} и типом ${requestedPropertyType} не найдено в правильной таблице`
          });
        }
      }
    } else {
      property = await propertyQueries.getById(id);
    }
    
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объявление не найдено' });
    }
    
    // Если передан тип: он должен совпадать с записью, кроме пары apartment/commercial (одна таблица).
    // Исключение: если мы безопасно разрешили объект cross-table lookup (тип из запроса был неверным),
    // то не блокируем одобрение (иначе админка "залипнет" на ошибке).
    if (
      !legacyModerationRequest &&
      requestedPropertyType &&
      property.property_type !== requestedPropertyType &&
      !resolvedByCrossTableLookup
    ) {
      const bothApartmentTable =
        (requestedPropertyType === 'apartment' || requestedPropertyType === 'commercial') &&
        (property.property_type === 'apartment' || property.property_type === 'commercial');
      if (!bothApartmentTable) {
        console.error(`❌ Одобрение: Запрошен тип ${requestedPropertyType}, но получен ${property.property_type}`);
        console.error(`   Source table: ${property.source_table || 'unknown'}`);
        return res.status(400).json({
          success: false,
          error: `Несоответствие типов: запрошен ${requestedPropertyType}, но найден ${property.property_type}. Объект не может быть одобрен.`
        });
      }
    }
    
    console.log(`✅ Одобрение объявления ID: ${id}, Тип: ${property.property_type}, Аукцион: ${property.is_auction}, Source: ${property.source_table || 'unknown'}`);

    // Проверяем тип запроса (редактирование или удаление)
    const isEdit = property.rejection_reason && property.rejection_reason.startsWith('EDIT:');
    const isDelete = property.rejection_reason && property.rejection_reason.startsWith('DELETE:');
    let originalPropertyId = null;
    let deleteReason = null;
    
    if (isDelete) {
      // Извлекаем ID оригинального объекта и причину удаления
      // Формат: DELETE:propertyId:reason
      const deleteMatch = property.rejection_reason.match(/^DELETE:(\d+):(.+)$/);
      if (deleteMatch) {
        originalPropertyId = deleteMatch[1];
        deleteReason = deleteMatch[2];
        console.log(`🗑️ Это запрос на удаление. ID оригинала: ${originalPropertyId}, Причина: ${deleteReason}`);
      } else {
        // Старый формат без причины (для обратной совместимости)
        originalPropertyId = property.rejection_reason.replace('DELETE:', '');
        console.log(`🗑️ Это запрос на удаление (старый формат). ID оригинала: ${originalPropertyId}`);
      }
      
      // Проверяем существование оригинального объекта (в любой актуальной таблице)
      const originalProperty = await propertyQueries.getById(originalPropertyId);
      if (!originalProperty) {
        return res.status(404).json({ 
          success: false, 
          error: 'Оригинальное объявление не найдено' 
        });
      }
      
      // Удаляем оригинальное объявление
      await propertyQueries.delete(originalPropertyId);
      console.log(`✅ Оригинальное объявление ID ${originalPropertyId} удалено`);
      
      // Удаляем запись с запросом на удаление
      await prisma.properties.delete({ where: { id: Number(id) } });
      console.log(`🗑️ Запись с запросом на удаление ID ${id} удалена`);
      
      // Создаем уведомление для пользователя
      try {
        await notificationQueries.create({
          user_id: property.user_id,
          type: 'property_deleted',
          title: 'Объявление удалено',
          message: `Ваш запрос на удаление объявления "${property.title}" одобрен. Объявление удалено с площадки.`,
          data: JSON.stringify({ property_id: originalPropertyId })
        });
      } catch (notifError) {
        console.warn('Не удалось создать уведомление:', notifError);
      }
      
      res.json({ 
        success: true, 
        message: 'Объявление удалено',
        deleted_property_id: originalPropertyId
      });
      return;
    } else if (isEdit) {
      const editIdMatch = String(property.rejection_reason || '').match(/^EDIT:(\d+)$/);
      if (!editIdMatch) {
        return res.status(400).json({
          success: false,
          error: 'Некорректный формат запроса на редактирование (ожидается EDIT:<id>)',
        });
      }
      originalPropertyId = editIdMatch[1];
      console.log(`📝 Это редактирование. ID оригинала: ${originalPropertyId}`);

      const originalProperty = await resolveOriginalPropertyForEdit(
        propertyQueries,
        originalPropertyId,
        property.property_type || requestedPropertyType || null
      );
      if (!originalProperty) {
        return res.status(404).json({
          success: false,
          error: 'Оригинальное объявление не найдено',
        });
      }

      const { commonUpdateData, apartmentOnlyUpdateData, houseOnlyUpdateData } =
        buildEditApprovalUpdateData({
          original: originalProperty,
          pending: property,
          privateClubOnly,
        });

      console.log(`⏰ Одобрение редактирования: таймер test_timer_end_date сохранён (${originalProperty.test_timer_end_date || 'нет'})`);

      const editTypeHint =
        property.property_type ||
        requestedPropertyType ||
        originalProperty.property_type ||
        null;
      const editTargetTable = await resolveEditApprovalTargetTable(
        prisma,
        originalPropertyId,
        editTypeHint,
        originalProperty
      );
      if (editTargetTable === 'conflict') {
        return res.status(409).json({
          success: false,
          error: `Конфликт ID ${originalPropertyId}: объект найден и в квартирах, и в домах. Укажите property_type в запросе одобрения.`,
        });
      }

      let appliedPropertyTable = 'properties';
      try {
        if (editTargetTable === 'house') {
          appliedPropertyTable = 'properties_houses';
          await prisma.properties_houses.update({
            where: { id: Number(originalPropertyId) },
            data: {
              ...commonUpdateData,
              ...houseOnlyUpdateData,
            },
          });
        } else if (editTargetTable === 'apartment') {
          appliedPropertyTable = 'properties_apartments';
          await prisma.properties_apartments.update({
            where: { id: Number(originalPropertyId) },
            data: {
              ...commonUpdateData,
              ...apartmentOnlyUpdateData,
            },
          });
        } else {
          appliedPropertyTable = 'properties';
          const { floors: legacyFloors, ...legacyHousePatch } = houseOnlyUpdateData;
          await prisma.properties.update({
            where: { id: Number(originalPropertyId) },
            data: {
              ...commonUpdateData,
              ...legacyHousePatch,
              total_floors: legacyFloors ?? property.total_floors ?? null,
            },
          });
        }
      } catch (updateErr) {
        console.error('❌ Одобрение редактирования: ошибка Prisma update:', updateErr);
        return res.status(500).json({
          success: false,
          error: updateErr.message || 'Не удалось применить изменения к объявлению',
        });
      }

      try {
        await prisma.property_translations.deleteMany({
          where: {
            property_id: Number(originalPropertyId),
            property_table: appliedPropertyTable,
          },
        });
        console.log(
          `🌐 Переводы сброшены для property_id=${originalPropertyId}, table=${appliedPropertyTable}`
        );
      } catch (trErr) {
        console.warn('⚠️ Не удалось сбросить переводы после одобрения редактирования:', trErr?.message || trErr);
      }
      
      console.log(`✅ Оригинальный объект ID ${originalPropertyId} обновлен (${editTargetTable})`);
      console.log(`   Статус модерации: approved, rejection_reason: очищен`);
      
      // Удаляем запись с изменениями после применения (чтобы избежать дубликатов)
      await prisma.properties.delete({ where: { id: Number(id) } });
      console.log(`🗑️ Запись с изменениями ID ${id} удалена (дубликат предотвращен)`);
      
      const verifyType =
        property.property_type ||
        originalProperty.property_type ||
        requestedPropertyType ||
        null;
      const updatedOriginal = await propertyQueries.getById(originalPropertyId, verifyType);
      if (!updatedOriginal) {
        return res.status(500).json({
          success: false,
          error: 'Оригинальное объявление не найдено после применения изменений'
        });
      }
      console.log(`✅ Проверка обновленного объекта:`, {
        id: updatedOriginal.id,
        title: updatedOriginal.title,
        moderation_status: updatedOriginal.moderation_status,
        is_auction: updatedOriginal.is_auction,
        auction_dates: updatedOriginal.is_auction ? `${updatedOriginal.auction_start_date} - ${updatedOriginal.auction_end_date}` : 'N/A'
      });
      
      // Создаем уведомление для пользователя
      try {
        await notificationQueries.create({
          user_id: property.user_id,
          type: 'property_approved',
          title: 'Изменения в объекте одобрены',
          message: `Изменения в объекте "${property.title}" одобрены и применены к опубликованному объявлению`,
          data: JSON.stringify({ property_id: originalPropertyId })
        });
      } catch (notifError) {
        console.warn('Не удалось создать уведомление:', notifError);
      }

      // Кабинет владельца: после одобрения редактирования обновляем карточку без F5
      try {
        const ownerId = updatedOriginal?.user_id ?? property.user_id;
        if (ownerId) {
          broadcastUserCabinetEvent(ownerId, {
            type: 'property_moderation',
            property_id: Number(originalPropertyId),
            moderation_status: 'approved',
            property_type: updatedOriginal?.property_type || property.property_type
          });
        }
      } catch (cabErr) {
        console.warn('[SSE] user cabinet (property edit approve):', cabErr.message);
      }

      // Для аукционных объектов пинаем канал аукциона, чтобы карточки/списки обновились без F5
      try {
        const isApprovedAuction =
          updatedOriginal?.is_auction === 1 ||
          updatedOriginal?.is_auction === '1' ||
          updatedOriginal?.is_auction === true;
        if (isApprovedAuction) {
          broadcastAuctionSseEvent({
            type: 'test_timer_update',
            property: { id: Number(originalPropertyId) }
          });
        }
      } catch (auctionPushErr) {
        console.warn('[SSE] auction (property edit approve):', auctionPushErr.message);
      }
      
      res.json({
        success: true,
        message: 'Изменения одобрены и применены к оригинальному объекту',
        original_property_id: originalPropertyId,
        data: updatedOriginal,
      });
    } else {
      // Обычное одобрение нового объявления
      console.log('🔍 Одобрение нового объявления:', {
        id: id,
        property_type: property.property_type,
        current_moderation_status: property.moderation_status,
        is_auction: property.is_auction,
        source_table: property.source_table || 'unknown'
      });
      
      // Используем функцию из propertyQueries, которая работает с новыми таблицами
      console.log(`🔄 Вызов updateModerationStatus для ID=${id}, status=approved, тип=${property.property_type}`);
      const result = await propertyQueries.updateModerationStatus(
        id,
        'approved',
        reviewed_by,
        null,
        null,
        property.property_type
      );
      
      console.log(`📊 Результат updateModerationStatus:`, {
        changes: result?.changes || 0,
        lastInsertRowid: result?.lastInsertRowid,
        hasResult: !!result
      });
      
      if (!result) {
        console.error(`❌ Одобрение: updateModerationStatus вернул null/undefined для ID=${id}`);
        return res.status(500).json({ success: false, error: 'Ошибка при обновлении статуса модерации' });
      }
      
      if (result.changes === 0) {
        console.warn(`⚠️ Одобрение: объект ID=${id} не был обновлен (changes=0). Проверяем текущий статус...`);
        // Проверяем текущий статус объекта с указанием правильного типа
        const propertyTypeForCheck = requestedPropertyType || property.property_type;
        const currentProperty = await propertyQueries.getById(id, propertyTypeForCheck);
        if (currentProperty) {
          console.log(`📊 Текущий статус объекта ID=${id}:`, currentProperty.moderation_status);
          if (currentProperty.moderation_status === 'approved') {
            console.log(`✅ Объект ID=${id} уже одобрен, пропускаем обновление`);
            // Объект уже одобрен, продолжаем как обычно
          } else {
            console.error(`❌ Объект ID=${id} не был обновлен, текущий статус: ${currentProperty.moderation_status}`);
            return res.status(500).json({ 
              success: false, 
              error: `Объявление не было обновлено. Текущий статус: ${currentProperty.moderation_status}` 
            });
          }
        } else {
          console.error(`❌ Объект ID=${id} не найден после попытки обновления`);
          return res.status(404).json({ success: false, error: 'Объявление не найдено после обновления' });
        }
      } else {
        console.log(`✅ Одобрение: статус обновлен, changes=${result.changes}`);
      }

      // Если передан debt_severity — считаем объект "долгом" и фиксируем признаки долга в БД.
      // Это нужно, чтобы объект корректно попадал на страницу "Долги" и не попадал в обычные списки/аукционы.
      if (debt_severity) {
        try {
          const prisma = getPrisma();
          const isHouse = property.property_type === 'house' || property.property_type === 'villa';
          if (isHouse) {
            await prisma.properties_houses.update({
              where: { id: Number(id) },
              data: {
                debt_severity,
                sale_type: 'debt',
                is_debt: 1,
                has_debt: 1,
                updated_at: new Date().toISOString(),
              },
            });
          } else {
            await prisma.properties_apartments.update({
              where: { id: Number(id) },
              data: {
                debt_severity,
                sale_type: 'debt',
                is_debt: 1,
                has_debt: 1,
                updated_at: new Date().toISOString(),
              },
            });
          }
          console.log(`✅ debt: обновлены флаги долга для ID=${id}, debt_severity=${debt_severity}`);
        } catch (e) {
          console.warn('⚠️ debt: не удалось обновить флаги долга:', e.message);
        }
      }

      // «Только закрытый клуб» — лот в аукционе видят только VIP (и владелец в кабинете).
      try {
        const prismaPc = getPrisma();
        const pcVal = privateClubOnly ? 1 : 0;
        const isHouseRow = property.property_type === 'house' || property.property_type === 'villa';
        if (isHouseRow) {
          await prismaPc.properties_houses.update({
            where: { id: Number(id) },
            data: { private_club_only: pcVal, updated_at: new Date().toISOString() },
          });
        } else if (property.property_type === 'apartment' || property.property_type === 'commercial') {
          await prismaPc.properties_apartments.update({
            where: { id: Number(id) },
            data: { private_club_only: pcVal, updated_at: new Date().toISOString() },
          });
        } else if (property.source_table === 'properties') {
          await prismaPc.properties.update({
            where: { id: Number(id) },
            data: { private_club_only: pcVal, updated_at: new Date() },
          });
        }
      } catch (pcErr) {
        console.warn('private_club_only (approve):', pcErr?.message || pcErr);
      }
      
      // После updateModerationStatus читаем из той же таблицы, что и одобряли (не из типа запроса клиента).
      const propertyTypeForRetrieval = property.property_type;
      console.log(`🔍 Получение обновленного объекта ID=${id} с типом=${propertyTypeForRetrieval}`);
      const updatedProperty = await propertyQueries.getById(id, propertyTypeForRetrieval);
      
      // Если не нашли с указанием типа, пробуем без типа (но это не должно происходить)
      if (!updatedProperty) {
        console.warn(`⚠️ Не удалось получить объект с типом, пробуем без типа`);
        const fallbackProperty = await propertyQueries.getById(id);
        if (fallbackProperty && fallbackProperty.property_type !== propertyTypeForRetrieval) {
          console.error(`❌ КРИТИЧЕСКАЯ ОШИБКА: получен объект с неправильным типом! Запрошен ${propertyTypeForRetrieval}, получен ${fallbackProperty.property_type}`);
          return res.status(500).json({ 
            success: false, 
            error: `Получен объект с неправильным типом: запрошен ${propertyTypeForRetrieval}, получен ${fallbackProperty.property_type}` 
          });
        }
        return res.status(404).json({ success: false, error: 'Объявление не найдено после обновления' });
      }
      
      // Запускаем таймер для отслеживания ставок (событийная модель)
      if (updatedProperty && updatedProperty.moderation_status === 'approved') {
        console.log(`⏰ Запуск таймера для отслеживания ставок на объекте ${id}`);
        startPropertyTimer(parseInt(id));
      }
      if (!updatedProperty) {
        console.error(`❌ Одобрение: объект ID=${id} не найден после обновления`);
        return res.status(404).json({ success: false, error: 'Объявление не найдено после обновления' });
      }
      console.log(`✅ Объявление обновлено:`, {
        id: updatedProperty.id,
        title: updatedProperty.title,
        property_type: updatedProperty.property_type,
        moderation_status: updatedProperty.moderation_status,
        is_auction: updatedProperty.is_auction,
        is_auction_type: typeof updatedProperty.is_auction,
        source_table: updatedProperty.source_table || 'unknown'
      });
      
      // Проверяем, что объявление попадает в список одобренных или аукционных
      // Для аукционных объектов проверяем getAuctions, для обычных - getApproved
      let isInList = false;
      let listName = '';
      
      if (updatedProperty.is_auction === 1 || updatedProperty.is_auction === '1' || updatedProperty.is_auction === true) {
        isInList = passesAuctionFilters(updatedProperty);
        listName = 'аукционных';
        if (VERBOSE_HTTP) {
          console.log(`📋 Проверка публикации (аукцион): объявление ${id} ${isInList ? 'проходит фильтр' : 'не проходит фильтр'} списка ${listName}`);
        }
      } else {
        isInList = passesApprovedFilters(updatedProperty);
        listName = 'одобренных';
        if (VERBOSE_HTTP) {
          console.log(`📋 Проверка публикации: объявление ${id} ${isInList ? 'проходит фильтр' : 'не проходит фильтр'} списка ${listName}`);
        }
      }
      
      if (!isInList) {
        console.warn(`⚠️ Объект ${id} одобрен, но не попал в список ${listName}`);
      }
      console.log('🔍 Одобрение нового объявления - test_drive после одобрения:', {
        test_drive: updatedProperty.test_drive,
        test_drive_type: typeof updatedProperty.test_drive
      });

      // Создаем уведомление для пользователя
      try {
        await notificationQueries.create({
          user_id: property.user_id,
          type: 'property_approved',
          title: 'Ваш объект прошел верификацию',
          message: `Ваш объект "${property.title}" прошел верификацию, в скором времени он будет опубликован на платформе`,
          data: JSON.stringify({ property_id: id })
        });
      } catch (notifError) {
        console.warn('Не удалось создать уведомление:', notifError);
      }

      // Push по SSE подписчикам страницы аукциона — новый объект появится без перезагрузки
      const isAuction = updatedProperty.is_auction === 1 || updatedProperty.is_auction === '1' || updatedProperty.is_auction === true;
      if (isAuction) {
        try {
          if (VERBOSE_HTTP) {
            console.log(`[SSE] 📤 Аукционный объект ID=${id} одобрен — рассылаем подписчикам страницы аукциона`);
          }
          const formatted = await formatOneAuctionPropertyForApi(updatedProperty);
          broadcastAuctionNewObjects([formatted]);
        } catch (broadcastErr) {
          console.warn('Не удалось отправить SSE обновление аукциона:', broadcastErr);
        }
      }

      // Кабинет владельца: список объявлений обновится без перезагрузки
      try {
        const ownerId = updatedProperty.user_id ?? property.user_id;
        if (ownerId) {
          broadcastUserCabinetEvent(ownerId, {
            type: 'property_moderation',
            property_id: parseInt(id, 10),
            moderation_status: 'approved',
            property_type: updatedProperty.property_type
          });
        }
      } catch (cabErr) {
        console.warn('[SSE] user cabinet (property):', cabErr.message);
      }

      // Финальная проверка: тип записи совпадает с тем объектом, который одобряли
      if (updatedProperty.property_type !== property.property_type) {
        console.error(
          `❌ КРИТИЧЕСКАЯ ОШИБКА перед отправкой ответа! Ожидали тип ${property.property_type}, получили ${updatedProperty.property_type}`
        );
        console.error(`   Source table: ${updatedProperty.source_table || 'unknown'}`);
        return res.status(500).json({
          success: false,
          error: `Получен объект с неправильным типом: ожидался ${property.property_type}, получен ${updatedProperty.property_type}`,
        });
      }
      
      console.log(`✅ Отправка ответа об одобрении: ID=${updatedProperty.id}, type=${updatedProperty.property_type}, source=${updatedProperty.source_table || 'unknown'}`);
      
      res.json({ 
        success: true, 
        message: 'Объявление одобрено',
        data: {
          id: updatedProperty.id,
          title: updatedProperty.title,
          property_type: updatedProperty.property_type,
          moderation_status: updatedProperty.moderation_status,
          is_auction: updatedProperty.is_auction
        }
      });
    }
  } catch (error) {
    console.error('Ошибка при одобрении объявления:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/properties/:id/toggle-auction - Переключить статус аукциона (для тестирования)
 */
app.put('/api/properties/:id/toggle-auction', async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = getPrisma();
    const property = await prisma.properties.findUnique({ where: { id: Number(id) } });
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объявление не найдено' });
    }

    // Переключаем статус аукциона
    const newAuctionStatus = property.is_auction === 1 ? 0 : 1;
    await prisma.properties.update({
      where: { id: Number(id) },
      data: {
        is_auction: newAuctionStatus,
        updated_at: new Date().toISOString(),
      },
    });

    console.log(`✅ Статус аукциона изменен для объявления ID ${id}: ${property.is_auction} -> ${newAuctionStatus}`);

    res.json({ 
      success: true, 
      message: `Статус аукциона изменен на ${newAuctionStatus === 1 ? 'с аукционом' : 'без аукциона'}`,
      data: { is_auction: newAuctionStatus }
    });
  } catch (error) {
    console.error('Ошибка при изменении статуса аукциона:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/properties/:id/reject - Отклонить объявление
 */
app.put('/api/properties/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewed_by, rejection_reason } = req.body;
    const property = await propertyQueries.getById(id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объявление не найдено' });
    }
    await propertyQueries.updateModerationStatus(
      id,
      'rejected',
      reviewed_by || 'admin',
      rejection_reason || null
    );

    // Создаем уведомление для пользователя
    try {
      await notificationQueries.create({
        user_id: property.user_id,
        type: 'property_rejected',
        title: 'Объявление отклонено',
        message: `Ваше объявление "${property.title}" было отклонено.${rejection_reason ? ' Причина: ' + rejection_reason : ''}`,
        data: JSON.stringify({ property_id: id, rejection_reason })
      });
    } catch (notifError) {
      console.warn('Не удалось создать уведомление:', notifError);
    }

    try {
      const pNew = await propertyQueries.getById(id);
      if (pNew && pNew.user_id) {
        broadcastUserCabinetEvent(pNew.user_id, {
          type: 'property_moderation',
          property_id: parseInt(id, 10),
          moderation_status: 'rejected'
        });
      }
    } catch (cabErr) {
      console.warn('[SSE] user cabinet (property reject):', cabErr.message);
    }

    res.json({ 
      success: true, 
      message: 'Объявление отклонено' 
    });
  } catch (error) {
    console.error('Ошибка при отклонении объявления:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/properties/:id - Удалить объявление (только для админа)
 */
app.delete('/api/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const property = await propertyQueries.getById(id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объявление не найдено' });
    }

    // Удаляем объявление
    await propertyQueries.delete(id);

    res.json({ 
      success: true, 
      message: 'Объявление успешно удалено' 
    });
  } catch (error) {
    console.error('Ошибка при удалении объявления:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Обработка ошибок БД
// ========== РОУТЫ ДЛЯ КАРТЫ И ДЕПОЗИТА ==========

/**
 * POST /api/users/:id/card - Сохранить карту пользователя
 */
app.post('/api/users/:id/card', async (req, res) => {
  try {
    const userId = req.params.id;
    const { cardNumber, cardCvv, cardType } = req.body;
    
    console.log('📝 Сохранение карты для пользователя:', userId, {
      cardNumber: cardNumber ? cardNumber.slice(0, 4) + '****' : 'не указан',
      cardCvv: cardCvv ? '***' : 'не указан',
      cardType: cardType || 'не указан'
    });
    
    if (!cardNumber || !cardCvv || !cardType) {
      console.warn('❌ Недостаточно данных для сохранения карты:', { cardNumber: !!cardNumber, cardCvv: !!cardCvv, cardType: !!cardType });
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать номер карты, CVV и тип карты' 
      });
    }
    
    const prisma = getPrisma();
    
    // Простое шифрование (в production использовать более безопасный метод)
    const encrypt = (text) => {
      try {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key-change-in-production', 'salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
      } catch (encryptError) {
        console.error('❌ Ошибка шифрования:', encryptError);
        throw new Error('Ошибка при шифровании данных карты');
      }
    };
    
    let encryptedCardNumber, encryptedCvv;
    try {
      encryptedCardNumber = encrypt(cardNumber);
      encryptedCvv = encrypt(cardCvv);
      console.log('✅ Данные зашифрованы');
    } catch (encryptError) {
      console.error('❌ Ошибка шифрования:', encryptError);
      return res.status(500).json({ 
        success: false, 
        error: 'Ошибка при шифровании данных карты: ' + encryptError.message 
      });
    }
    
    // Проверяем, существует ли пользователь
    const user = await userQueries.getById(userId);
    if (!user) {
      console.warn('❌ Пользователь не найден:', userId);
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    try {
      await prisma.users.update({
        where: { id: Number(userId) },
        data: {
          has_card: 1,
          card_number: encryptedCardNumber,
          card_cvv: encryptedCvv,
          card_type: cardType,
          updated_at: new Date().toISOString(),
        },
      });
    } catch (dbError) {
      console.error('❌ Ошибка при обновлении БД:', dbError);
      return res.status(500).json({ 
        success: false, 
        error: 'Ошибка при сохранении в базу данных: ' + dbError.message 
      });
    }
    
    const updatedUser = await userQueries.getById(userId);
    
    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        hasCard: updatedUser.has_card === 1,
        cardType: updatedUser.card_type,
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при сохранении карты:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ success: false, error: error.message || 'Внутренняя ошибка сервера' });
  }
});

/**
 * GET /api/users/:id/deposit - Получить депозит пользователя
 */
app.get('/api/users/:id/deposit', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await userQueries.getById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    const depositAmount = (user.deposit_amount !== undefined && user.deposit_amount !== null) ? parseFloat(user.deposit_amount) : 0;
    res.json({
      success: true,
      data: {
        depositAmount,
        minAuctionDepositEur: AUCTION_DEPOSIT_MIN_EUR,
        canParticipateInAuction: isAuctionDepositSufficient(depositAmount),
        hasCard: user.has_card === 1,
        cardType: user.card_type || null
      }
    });
  } catch (error) {
    console.error('Ошибка при получении депозита:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users/:id/deposit/top-up - Пополнить депозит на 3000 евро
 */
app.post('/api/users/:id/deposit/top-up', async (req, res) => {
  try {
    const userId = req.params.id;
    const prisma = getPrisma();
    
    const user = await userQueries.getById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    if (user.has_card !== 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо сначала добавить карту' 
      });
    }
    
    const currentDeposit = (user.deposit_amount !== undefined && user.deposit_amount !== null) ? parseFloat(user.deposit_amount) : 0;
    const newDeposit = currentDeposit + 3000;
    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: Number(userId) },
        data: { deposit_amount: newDeposit, updated_at: new Date() },
      });
      await tx.transactions.create({
        data: {
          user_id: Number(userId),
          type: 'deposit',
          amount: 3000,
          description: 'Пополнение депозита',
        },
      });
    });
    
    res.json({
      success: true,
      data: {
        depositAmount: newDeposit,
        added: 3000
      }
    });
  } catch (error) {
    console.error('Ошибка при пополнении депозита:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users/:id/deposit/withdraw - Вывести средства из депозита
 */
app.post('/api/users/:id/deposit/withdraw', async (req, res) => {
  try {
    const userId = req.params.id;
    const { amount } = req.body;
    const prisma = getPrisma();
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать сумму для вывода' 
      });
    }
    
    const user = await userQueries.getById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    const currentDeposit = (user.deposit_amount !== undefined && user.deposit_amount !== null) ? parseFloat(user.deposit_amount) : 0;
    if (currentDeposit < amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Недостаточно средств на депозите' 
      });
    }
    
    const newDeposit = currentDeposit - amount;

    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { id: Number(userId) },
        data: { deposit_amount: newDeposit, updated_at: new Date() },
      });
      await tx.transactions.create({
        data: {
          user_id: Number(userId),
          type: 'withdrawal',
          amount: -Number(amount),
          description: 'Вывод средств',
        },
      });
    });
    
    res.json({
      success: true,
      data: {
        depositAmount: newDeposit,
        withdrawn: amount
      }
    });
  } catch (error) {
    console.error('Ошибка при выводе средств:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/:id/transactions - Получить транзакции пользователя
 */
app.get('/api/users/:id/transactions', async (req, res) => {
  try {
    const userId = req.params.id;
    const prisma = getPrisma();
    const transactions = await prisma.transactions.findMany({
      where: { user_id: Number(userId) },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
    
    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Ошибка при получении транзакций:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/:id/analytics - Получить аналитику пользователя
 */
app.get('/api/users/:id/analytics', async (req, res) => {
  try {
    const userId = req.params.id;
    const prisma = getPrisma();
    
    const user = await userQueries.getById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    const depositStats = await prisma.transactions.aggregate({
      where: { user_id: Number(userId), type: 'deposit' },
      _sum: { amount: true },
    });
    const withdrawalStats = await prisma.transactions.aggregate({
      where: { user_id: Number(userId), type: 'withdrawal' },
      _sum: { amount: true },
    });
    const totalDeposit = Number(depositStats?._sum?.amount || 0);
    const totalWithdrawal = Math.abs(Number(withdrawalStats?._sum?.amount || 0));
    
    res.json({
      success: true,
      data: {
        currentDeposit: (user.deposit_amount !== undefined && user.deposit_amount !== null) ? parseFloat(user.deposit_amount) : 0,
        totalDeposit,
        totalWithdrawal,
        hasCard: user.has_card === 1
      }
    });
  } catch (error) {
    console.error('Ошибка при получении аналитики:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bids - Создать ставку
 * Логика:
 * 1. Проверяем, что у пользователя есть депозит
 * 2. Проверка на несколько объектов отключена - пользователь может делать ставки в нескольких объектах
 * 3. Проверяем, что ставка не меньше минимальной суммы
 * 4. Если ставка больше текущей - обновляем минимальную ставку (текущая ставка - цена)
 */
app.post('/api/bids', async (req, res) => {
  try {
    const { user_id, property_id, bid_amount, property_table, property_type } = req.body;
    const prisma = getPrisma();
    
    console.log('📝 Создание ставки - полученные данные:', { 
      user_id, 
      property_id, 
      bid_amount,
      property_table,
      property_type,
      user_id_type: typeof user_id,
      property_id_type: typeof property_id,
      bid_amount_type: typeof bid_amount,
      body: req.body
    });
    
    // Проверяем наличие всех обязательных полей
    if (!user_id) {
      console.error('❌ Отсутствует user_id');
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать user_id' 
      });
    }
    
    if (!property_id) {
      console.error('❌ Отсутствует property_id');
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать property_id' 
      });
    }
    
    if (!bid_amount && bid_amount !== 0) {
      console.error('❌ Отсутствует bid_amount');
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать bid_amount' 
      });
    }
    
    // Проверяем типы данных
    const userIdNum = parseInt(user_id);
    const propertyIdNum = parseInt(property_id);
    const bidAmountNum = parseFloat(bid_amount);
    
    if (isNaN(userIdNum) || userIdNum <= 0) {
      console.error('❌ Некорректный user_id:', user_id);
      return res.status(400).json({ 
        success: false, 
        error: `Некорректный user_id: ${user_id}` 
      });
    }
    
    if (isNaN(propertyIdNum) || propertyIdNum <= 0) {
      console.error('❌ Некорректный property_id:', property_id);
      return res.status(400).json({ 
        success: false, 
        error: `Некорректный property_id: ${property_id}` 
      });
    }
    
    if (isNaN(bidAmountNum) || bidAmountNum <= 0) {
      console.error('❌ Некорректный bid_amount:', bid_amount);
      return res.status(400).json({ 
        success: false, 
        error: `Некорректный bid_amount: ${bid_amount}` 
      });
    }
    
    console.log('✅ Валидация пройдена:', { userIdNum, propertyIdNum, bidAmountNum });
    
    // Проверяем, существует ли пользователь
    const user = await userQueries.getById(userIdNum);
    if (!user) {
      console.error(`❌ Пользователь с ID ${userIdNum} не найден в БД`);
      return res.status(404).json({ success: false, error: `Пользователь с ID ${userIdNum} не найден` });
    }
    console.log('✅ Пользователь найден:', { id: user.id, name: `${user.first_name} ${user.last_name}` });
    
    const { property, tableName } = await loadPropertyForBid(propertyIdNum, {
      property_table,
      property_type,
    });

    if (!property || !tableName) {
      console.error(
        `❌ Объект недвижимости с ID ${propertyIdNum} не найден (table=${property_table ?? 'auto'}, type=${property_type ?? 'auto'})`
      );
      return res.status(404).json({ success: false, error: `Объект недвижимости с ID ${propertyIdNum} не найден` });
    }

    console.log('✅ Объект найден:', {
      id: property.id,
      title: property.title,
      is_auction: property.is_auction,
      table: tableName,
      property_type: property.property_type,
    });
    
    // Проверяем, что у пользователя есть депозит (только для аукционов)
    // Для обычных объектов депозит не требуется
    const isAuction = property.is_auction === 1;
    if (isAuction) {
      // Проверяем, что у пользователя заполнена страна
      if (!user.country || user.country.trim() === '') {
        console.error(`❌ У пользователя ${userIdNum} не заполнена страна`);
        return res.status(400).json({ 
          success: false, 
          error: 'Для участия в аукционе необходимо указать страну в профиле. Пожалуйста, заполните страну в настройках профиля.' 
        });
      }
      
      const depositAmount = (user.deposit_amount !== undefined && user.deposit_amount !== null) ? parseFloat(user.deposit_amount) : 0;
      if (!isAuctionDepositSufficient(depositAmount)) {
        return res.status(400).json({ 
          success: false,
          code: 'INSUFFICIENT_AUCTION_DEPOSIT',
          error: `Для участия в аукционе необходим депозит не менее ${AUCTION_DEPOSIT_MIN_EUR} €. Пожалуйста, пополните депозит.`,
        });
      }

      // Покупатели с депозитом: ставки только после одобрения верификации админом (is_verified)
      const roleNorm = String(user.role || 'buyer').toLowerCase();
      const skipKycForBid =
        roleNorm === 'seller' || roleNorm === 'owner' || roleNorm === 'admin';
      if (!skipKycForBid) {
        const isVerified = user.is_verified === 1 || user.is_verified === true;
        if (!isVerified) {
          return res.status(403).json({
            success: false,
            code: 'VERIFICATION_PENDING',
            error:
              'Верификация профиля на рассмотрении у администратора. После одобрения вы сможете делать ставки на аукционе. Следить за статусом можно в уведомлениях и в разделе «Профиль».',
          });
        }
      }
    }
    
    // Разрешаем ставки для всех объектов (как аукционных, так и обычных)
    // Проверка отключена: пользователь может делать ставки в нескольких объектах
    // const existingBids = await getPrisma().bids.findFirst({
    //   SELECT property_id FROM bids 
    //   WHERE user_id = ? AND property_id != ?
    //   LIMIT 1
    // `).get(userIdNum, propertyIdNum);
    // 
    // if (existingBids) {
    //   console.error(`❌ Пользователь ${userIdNum} уже сделал ставку в объекте ${existingBids.property_id}`);
    //   return res.status(400).json({ 
    //     success: false, 
    //     error: 'Вы уже сделали ставку в другом объекте. Вы можете сделать ставку только в одном объекте.' 
    //   });
    // }
    console.log('✅ Пользователь может сделать ставку в этом объекте (проверка на несколько объектов отключена)');
    
    // Получаем текущую максимальную ставку для этого объекта
    // Для аукционов используем auction_starting_price, для обычных объектов - price
    const basePrice = property.is_auction === 1 
      ? (property.auction_starting_price || property.price || 0)
      : (property.price || 0);
    const bidWhere = buildBidWhereForProperty(propertyIdNum, tableName);
    let currentMaxBid = basePrice;
    const maxBid = await prisma.bids.aggregate({
      where: bidWhere,
      _max: { bid_amount: true },
    });
    if (maxBid?._max?.bid_amount) currentMaxBid = maxBid._max.bid_amount;
    
    // Минимальный шаг как на клиенте (getAuctionMinBidStep)
    const minBidStep = getAuctionMinBidStep(currentMaxBid);
    const minimumBid = currentMaxBid + minBidStep;
    
    console.log(`💰 Ставки: текущая максимальная=${currentMaxBid}, минимальная=${minimumBid}, предложенная=${bidAmountNum}, шаг=${minBidStep}`);
    
    // Проверяем, что ставка не меньше минимальной
    if (bidAmountNum < minimumBid) {
      console.error(`❌ Ставка ${bidAmountNum} меньше минимальной ${minimumBid}`);
      return res.status(400).json({ 
        success: false, 
        error: `Ставка должна быть не меньше ${minimumBid.toFixed(2)} (текущая ставка + ${minBidStep})` 
      });
    }
    console.log('✅ Ставка прошла проверку минимальной суммы');
    
    // Находим предыдущего максимального ставщика (лидера ДО создания новой ставки)
    let previousHighestBidder = null;
    try {
      // Находим максимальную ставку среди всех ставок для этого объекта (ДО создания новой ставки)
      const maxBidResult = await prisma.bids.findFirst({
        where: bidWhere,
        orderBy: [{ bid_amount: 'desc' }, { created_at: 'desc' }],
        select: { user_id: true, bid_amount: true },
      });
      
      console.log(`🔍 Поиск предыдущего лидера для property_id=${propertyIdNum}, userIdNum=${userIdNum}`);
      console.log(`🔍 Результат запроса максимальной ставки:`, maxBidResult);
      
      // Если есть максимальная ставка и она принадлежит другому пользователю
      if (maxBidResult && maxBidResult.user_id && maxBidResult.user_id !== userIdNum) {
        previousHighestBidder = {
          user_id: maxBidResult.user_id,
          bid_amount: maxBidResult.bid_amount
        };
        console.log(`📋 ✅ Найден предыдущий лидер (максимальный ставщик): user_id=${previousHighestBidder.user_id}, bid_amount=${previousHighestBidder.bid_amount}`);
      } else if (maxBidResult && maxBidResult.user_id === userIdNum) {
        console.log('📋 Текущий пользователь уже является лидером, уведомление не требуется');
      } else {
        console.log('📋 Предыдущих ставок не найдено (это первая ставка или ставок нет)');
      }
    } catch (prevBidError) {
      console.error('❌ Ошибка при поиске предыдущего ставщика:', prevBidError);
      console.error('❌ Stack trace:', prevBidError.stack);
    }
    
    const createdBid = await prisma.bids.create({
      data: {
        user_id: userIdNum,
        property_id: propertyIdNum,
        property_table: tableName,
        bid_amount: bidAmountNum,
      },
    });
    const result = { changes: 1, lastInsertRowid: createdBid.id };
    const bidId = createdBid.id;
    
    console.log(`✅ Ставка создана с ID: ${bidId}, user_id: ${user_id}, property_id: ${property_id}, amount: ${bidAmountNum}`);
    console.log(`📊 Результат INSERT: changes=${result.changes}, lastInsertRowid=${bidId}`);
    
    cancelPropertyTimer(propertyIdNum);

    const newMinimumBid = bidAmountNum + getAuctionMinBidStep(bidAmountNum);

    /** Тестовый круговой таймер: продлеваем на сервере сразу после ставки (как в POST /test-timer),
     * чтобы все клиенты получили новое время через SSE без задержки и гонки «ставка → отдельный POST». */
    let extendedTestTimer = null;
    try {
      const ttDur = property.test_timer_duration != null ? Number(property.test_timer_duration) : NaN;
      const hasTestTimerRow =
        property.test_timer_end_date &&
        String(property.test_timer_end_date).trim() !== '' &&
        Number.isFinite(ttDur) &&
        ttDur > 0 &&
        (tableName === 'properties_apartments' || tableName === 'properties_houses');
      const isAuctionForTimer =
        property.is_auction === 1 ||
        property.is_auction === true ||
        property.is_auction === '1';
      if (isAuctionForTimer && hasTestTimerRow) {
        const newEndDate = new Date(Date.now() + ttDur);
        const iso = newEndDate.toISOString();
        const updatedAt = new Date().toISOString();
        if (tableName === 'properties_apartments') {
          await prisma.properties_apartments.update({
            where: { id: propertyIdNum },
            data: {
              test_timer_end_date: iso,
              test_timer_duration: ttDur,
              updated_at: updatedAt,
            },
          });
        } else {
          await prisma.properties_houses.update({
            where: { id: propertyIdNum },
            data: {
              test_timer_end_date: iso,
              test_timer_duration: ttDur,
              updated_at: updatedAt,
            },
          });
        }
        extendedTestTimer = { test_timer_end_date: iso, test_timer_duration: ttDur };
      }
    } catch (timerExtErr) {
      console.warn('⚠️ Продление тестового таймера после ставки не выполнено:', timerExtErr.message);
    }

    res.json({
      success: true,
      data: {
        bid_id: result.lastInsertRowid,
        bid_amount: parseFloat(bid_amount),
        minimum_bid: newMinimumBid,
        ...(extendedTestTimer ? extendedTestTimer : {}),
      },
    });

    // Тяжёлые побочные эффекты — после ответа клиенту (быстрее «Отправка…» → успех).
    setImmediate(() => {
      void (async () => {
        try {
          if (
            previousHighestBidder &&
            previousHighestBidder.user_id !== userIdNum &&
            bidAmountNum > previousHighestBidder.bid_amount
          ) {
            const propertyTitle = property.title || 'объект';
            const currency = property.currency || 'USD';
            const formattedNewBid = new Intl.NumberFormat('ru-RU', {
              style: 'currency',
              currency,
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(bidAmountNum);
            await notificationQueries.create({
              user_id: previousHighestBidder.user_id,
              type: 'bid_outbid',
              title: 'Вашу ставку перебили',
              message: `Ваша ставка на объект "${propertyTitle}" была перебита. Новая максимальная ставка: ${formattedNewBid}. Вы можете сделать новую ставку, чтобы вернуться в игру!`,
              data: JSON.stringify({
                property_id: propertyIdNum,
                property_title: propertyTitle,
                new_bid_amount: bidAmountNum,
                previous_bid_amount: previousHighestBidder.bid_amount,
              }),
              is_read: 0,
              view_count: 0,
            });
          }
        } catch (notifError) {
          console.warn('Уведомление о перебитой ставке (фон):', notifError?.message || notifError);
        }

        try {
          const updatedAt = new Date().toISOString();
          if (tableName === 'properties_apartments') {
            await prisma.properties_apartments.update({
              where: { id: propertyIdNum },
              data: { auction_minimum_bid: newMinimumBid, updated_at: updatedAt },
            });
          } else if (tableName === 'properties_houses') {
            await prisma.properties_houses.update({
              where: { id: propertyIdNum },
              data: { auction_minimum_bid: newMinimumBid, updated_at: updatedAt },
            });
          } else {
            await prisma.properties.update({
              where: { id: propertyIdNum },
              data: { auction_minimum_bid: newMinimumBid, updated_at: updatedAt },
            });
          }
        } catch (updateError) {
          console.warn('auction_minimum_bid (фон):', updateError.message);
        }

        if (extendedTestTimer) {
          broadcastAuctionSseEvent({
            type: 'test_timer_update',
            property: {
              id: propertyIdNum,
              property_type: property.property_type ?? null,
              test_timer_end_date: extendedTestTimer.test_timer_end_date,
              test_timer_duration: extendedTestTimer.test_timer_duration,
            },
          });
        }

        broadcastPropertyBidEvent(propertyIdNum, {
          type: 'bid_placed',
          property_id: propertyIdNum,
          bid_amount: bidAmountNum,
          minimum_bid: newMinimumBid,
          ...(extendedTestTimer || {}),
        });

        if (property?.user_id) {
          void notifyOwnerPropertyEngagement(prisma, property, tableName);
        }

        try {
          const basePrice =
            property.auction_starting_price != null
              ? Number(property.auction_starting_price)
              : Number(property.price) || 0;
          const autoBids = await evaluateBidCeilings(prisma, {
            propertyId: propertyIdNum,
            propertyTable: tableName,
            property,
            basePrice,
            onAutoBidPlaced: async ({ bidAmount, currentMax }) => {
              const newMinimumBid = bidAmount + getAuctionMinBidStep(bidAmount);
              broadcastPropertyBidEvent(propertyIdNum, {
                type: 'bid_placed',
                property_id: propertyIdNum,
                bid_amount: bidAmount,
                minimum_bid: newMinimumBid,
                from_ceiling: true,
              });
              try {
                const updatedAt = new Date().toISOString();
                if (tableName === 'properties_apartments') {
                  await prisma.properties_apartments.update({
                    where: { id: propertyIdNum },
                    data: { auction_minimum_bid: newMinimumBid, updated_at: updatedAt },
                  });
                } else if (tableName === 'properties_houses') {
                  await prisma.properties_houses.update({
                    where: { id: propertyIdNum },
                    data: { auction_minimum_bid: newMinimumBid, updated_at: updatedAt },
                  });
                } else {
                  await prisma.properties.update({
                    where: { id: propertyIdNum },
                    data: { auction_minimum_bid: newMinimumBid, updated_at: updatedAt },
                  });
                }
              } catch (minErr) {
                console.warn('auction_minimum_bid (ceiling auto-bid):', minErr?.message || minErr);
              }
            },
          });
          if (autoBids.length > 0) {
            console.log(`🎯 Авто-ставки по потолку: ${autoBids.length} для property ${propertyIdNum}`);
          }
        } catch (ceilingErr) {
          console.warn('evaluateBidCeilings (фон):', ceilingErr?.message || ceilingErr);
        }
      })();
    });
  } catch (error) {
    console.error('❌ Ошибка при создании ставки:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Внутренняя ошибка сервера' 
    });
  }
});

/**
 * GET /api/bids/ceiling — потолок цены пользователя для лота
 */
app.get('/api/bids/ceiling', async (req, res) => {
  try {
    const userId = parseInt(String(req.query.user_id ?? ''), 10);
    const propertyId = parseInt(String(req.query.property_id ?? ''), 10);
    const propertyTable =
      normalizeBidPropertyTableQuery(req.query.property_table) || 'properties_apartments';

    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ success: false, error: 'user_id обязателен' });
    }
    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      return res.status(400).json({ success: false, error: 'property_id обязателен' });
    }

    const prisma = getPrisma();
    const row = await getBidCeiling(prisma, {
      userId,
      propertyId,
      propertyTable,
    });

    if (!row || row.is_active !== 1) {
      return res.json({ success: true, data: null });
    }

    res.json({
      success: true,
      data: {
        max_amount: row.max_amount,
        activated_at: row.activated_at,
        updated_at: row.updated_at,
      },
    });
  } catch (error) {
    console.error('GET /api/bids/ceiling:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/bids/ceiling — установить / обновить потолок цены
 */
app.put('/api/bids/ceiling', async (req, res) => {
  try {
    const { user_id, property_id, property_table, property_type, max_amount } = req.body ?? {};
    const userIdNum = parseInt(user_id, 10);
    const propertyIdNum = parseInt(property_id, 10);
    const maxAmountNum = parseFloat(max_amount);

    if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
      return res.status(400).json({ success: false, error: 'Некорректный user_id' });
    }
    if (!Number.isFinite(propertyIdNum) || propertyIdNum <= 0) {
      return res.status(400).json({ success: false, error: 'Некорректный property_id' });
    }
    if (!Number.isFinite(maxAmountNum) || maxAmountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Некорректный max_amount' });
    }

    const prisma = getPrisma();
    const user = await userQueries.getById(userIdNum);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    const { property, tableName } = await loadPropertyForBid(propertyIdNum, {
      property_table,
      property_type,
    });
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объект не найден' });
    }

    const basePrice =
      property.auction_starting_price != null
        ? Number(property.auction_starting_price)
        : Number(property.price) || 0;
    const bidWhere = buildBidWhereForProperty(propertyIdNum, tableName);
    const maxAgg = await prisma.bids.aggregate({
      where: bidWhere,
      _max: { bid_amount: true },
    });
    const currentMaxBid =
      maxAgg?._max?.bid_amount != null
        ? Math.max(basePrice, Number(maxAgg._max.bid_amount))
        : basePrice;

    const row = await upsertBidCeiling(prisma, {
      userId: userIdNum,
      propertyId: propertyIdNum,
      propertyTable: tableName,
      maxAmount: maxAmountNum,
      currentMaxBid,
      basePrice,
    });

    setImmediate(() => {
      void evaluateBidCeilings(prisma, {
        propertyId: propertyIdNum,
        propertyTable: tableName,
        property,
        basePrice,
        onAutoBidPlaced: async ({ bidAmount }) => {
          const newMinimumBid = bidAmount + getAuctionMinBidStep(bidAmount);
          broadcastPropertyBidEvent(propertyIdNum, {
            type: 'bid_placed',
            property_id: propertyIdNum,
            bid_amount: bidAmount,
            minimum_bid: newMinimumBid,
            from_ceiling: true,
          });
        },
      }).catch((err) => console.warn('evaluateBidCeilings after PUT:', err?.message || err));
    });

    res.json({
      success: true,
      data: {
        max_amount: row.max_amount,
        updated_at: row.updated_at,
      },
    });
  } catch (error) {
    if (error.message === 'MAX_BELOW_MINIMUM') {
      return res.status(400).json({
        success: false,
        error: 'MAX_BELOW_MINIMUM',
        minimum: error.minimum,
        step: error.step,
      });
    }
    console.error('PUT /api/bids/ceiling:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/bids/ceiling — отменить потолок цены
 */
app.delete('/api/bids/ceiling', async (req, res) => {
  try {
    const userIdNum = parseInt(req.body?.user_id ?? req.query?.user_id, 10);
    const propertyIdNum = parseInt(req.body?.property_id ?? req.query?.property_id, 10);
    const propertyTable =
      normalizeBidPropertyTableQuery(req.body?.property_table ?? req.query?.property_table) ||
      'properties_apartments';

    if (!Number.isFinite(userIdNum) || !Number.isFinite(propertyIdNum)) {
      return res.status(400).json({ success: false, error: 'user_id и property_id обязательны' });
    }

    const prisma = getPrisma();
    await deactivateBidCeiling(prisma, {
      userId: userIdNum,
      propertyId: propertyIdNum,
      propertyTable,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/bids/ceiling:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/bids/max-amounts — макс. ставка по лотам.
 * Body: { items: [{ id, property_table }] } — ключи ответа: "properties_apartments:5"
 * Legacy: { ids: number[] } — только id (может смешать квартиру и дом с одним id).
 */
app.post('/api/bids/max-amounts', async (req, res) => {
  try {
    const prisma = getPrisma();
    const rawItems = req.body?.items;
    const data = {};

    if (Array.isArray(rawItems) && rawItems.length > 0) {
      const orWhere = [];
      const seen = new Set();
      for (const item of rawItems.slice(0, 400)) {
        const id = Number(item?.id);
        if (!Number.isFinite(id)) continue;
        const table = normalizeBidPropertyTableQuery(item?.property_table) || 'properties_apartments';
        const sk = `${table}:${id}`;
        if (seen.has(sk)) continue;
        seen.add(sk);
        orWhere.push(buildBidWhereForProperty(id, table));
      }
      if (orWhere.length > 0) {
        const bids = await prisma.bids.findMany({
          where: { OR: orWhere },
          select: { property_id: true, property_table: true, bid_amount: true },
        });
        for (const b of bids) {
          const amount = Number(b.bid_amount);
          if (!Number.isFinite(amount)) continue;
          const ck = bidAmountCompositeKey(b.property_id, b.property_table);
          if (data[ck] == null || amount > data[ck]) data[ck] = amount;
        }
      }
      return res.json({ success: true, data });
    }

    const raw = req.body?.ids;
    const ids = Array.isArray(raw) ? raw.map((x) => Number(x)).filter((n) => Number.isFinite(n)) : [];
    const unique = [...new Set(ids)].slice(0, 300);
    if (unique.length === 0) {
      return res.json({ success: true, data: {} });
    }
    const grouped = await prisma.bids.groupBy({
      by: ['property_id'],
      where: { property_id: { in: unique } },
      _max: { bid_amount: true },
    });
    for (const row of grouped) {
      const max = row._max.bid_amount;
      if (max != null && Number.isFinite(Number(max))) {
        data[String(row.property_id)] = Number(max);
      }
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('POST /api/bids/max-amounts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bids/property/:id - Получить историю ставок для объекта
 */
app.get('/api/bids/property/:id', async (req, res) => {
  try {
    const propertyId = req.params.id;
    const prisma = getPrisma();
    const pid = Number(propertyId);
    let propertyTable = normalizeBidPropertyTableQuery(
      req.query.property_table ?? req.query.table ?? req.query.source_table
    );
    if (!propertyTable) {
      const ptRaw = req.query.property_type != null ? String(req.query.property_type).trim().toLowerCase() : '';
      if (ptRaw === 'house' || ptRaw === 'villa') propertyTable = 'properties_houses';
      else if (ptRaw === 'apartment' || ptRaw === 'commercial') propertyTable = 'properties_apartments';
      else {
        const [apt, house, legacy] = await Promise.all([
          prisma.properties_apartments.findUnique({ where: { id: pid }, select: { id: true } }),
          prisma.properties_houses.findUnique({ where: { id: pid }, select: { id: true } }),
          prisma.properties.findUnique({ where: { id: pid }, select: { id: true } }),
        ]);
        const hits = [apt && 'properties_apartments', house && 'properties_houses', legacy && 'properties'].filter(Boolean);
        if (hits.length === 1) propertyTable = hits[0];
        else if (hits.length > 1) {
          return res.status(400).json({
            success: false,
            error: 'Укажите property_table или property_type — id объекта неоднозначен',
          });
        } else propertyTable = 'properties_apartments';
      }
    }
    const bidWhere = buildBidWhereForProperty(pid, propertyTable);

    console.log(`📊 Запрос истории ставок для объекта ${propertyId} (${propertyTable})`);

    const bids = await prisma.bids.findMany({
      where: bidWhere,
      orderBy: [{ bid_amount: 'desc' }, { created_at: 'desc' }],
      include: { users: { select: { user_id_number: true, country: true } } },
    });
    const mapped = bids.map((b) => ({
      id: b.id,
      user_id: b.user_id,
      property_id: b.property_id,
      bid_amount: b.bid_amount,
      created_at: b.created_at,
      user_id_number: b.users?.user_id_number || null,
      bidder_country: b.users?.country || null,
    }));
    
    console.log(`✅ Найдено ${mapped.length} ставок для объекта ${propertyId}`);
    
    res.json({ success: true, data: mapped });
  } catch (error) {
    console.error('❌ Ошибка при получении истории ставок:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/auctions/:propertyId/bids — история ставок для админки с данными участников.
 * Query: source_table=properties_apartments | properties_houses | apartments | houses
 * (если не указан — все ставки с данным property_id, как публичный эндпоинт).
 */
app.get('/api/admin/auctions/:propertyId/bids', async (req, res) => {
  try {
    const propertyId = Number(req.params.propertyId);
    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      return res.status(400).json({ success: false, error: 'Некорректный propertyId' });
    }
    let table = req.query.source_table != null ? String(req.query.source_table).trim() : '';
    if (table === 'apartments') table = 'properties_apartments';
    if (table === 'houses') table = 'properties_houses';
    const prisma = getPrisma();
    const where = { property_id: propertyId };
    if (table === 'properties_apartments' || table === 'properties_houses') {
      where.OR = [{ property_table: table }, { property_table: null }];
    }
    const bids = await prisma.bids.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
            country: true,
            role: true,
            user_id_number: true,
            telegram_username: true,
            telegram_id: true,
          },
        },
      },
    });
    const data = bids.map((b) => ({
      id: b.id,
      user_id: b.user_id,
      property_id: b.property_id,
      property_table: b.property_table ?? null,
      bid_amount: b.bid_amount,
      created_at: b.created_at,
      user: b.users
        ? {
            id: b.users.id,
            first_name: b.users.first_name,
            last_name: b.users.last_name,
            email: b.users.email,
            phone_number: b.users.phone_number,
            country: b.users.country,
            role: b.users.role,
            user_id_number: b.users.user_id_number,
            telegram_username: b.users.telegram_username,
            telegram_id: b.users.telegram_id,
          }
        : null,
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/admin/auctions/:propertyId/bids:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bids/user/:id - Получить ставки пользователя (оптимизировано: batch по property_table)
 */
app.get('/api/bids/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const prisma = getPrisma();
    
    if (!schemaCache.properties && !schemaCache.properties_apartments && !schemaCache.properties_houses) {
      return res.json({ success: true, data: [] });
    }
    
    const bids = await prisma.bids.findMany({
      where: { user_id: Number(userId) },
      orderBy: { created_at: 'desc' },
    });
    
    if (bids.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    const hasPropertyTable = bids[0].hasOwnProperty('property_table');
    const propertyMap = new Map();
    
    if (hasPropertyTable) {
      const byTable = { properties_apartments: [], properties_houses: [], properties: [] };
      for (const bid of bids) {
        const tbl = bid.property_table || 'properties';
        if (!byTable[tbl]) byTable[tbl] = [];
        byTable[tbl].push(bid.property_id);
      }
      const unique = (arr) => [...new Set(arr)];
      if (schemaCache.properties_apartments && byTable.properties_apartments.length) {
        const ids = unique(byTable.properties_apartments);
        const placeholders = ids.map(() => '?').join(',');
        try {
          const rows = await prisma.properties_apartments.findMany({ where: { id: { in: ids } } });
          for (const p of rows) propertyMap.set(`properties_apartments:${p.id}`, p);
        } catch (_) {}
      }
      if (schemaCache.properties_houses && byTable.properties_houses.length) {
        const ids = unique(byTable.properties_houses);
        const placeholders = ids.map(() => '?').join(',');
        try {
          const rows = await prisma.properties_houses.findMany({ where: { id: { in: ids } } });
          for (const p of rows) propertyMap.set(`properties_houses:${p.id}`, p);
        } catch (_) {}
      }
      if (schemaCache.properties && byTable.properties.length) {
        const ids = unique(byTable.properties);
        const placeholders = ids.map(() => '?').join(',');
        try {
          const rows = await prisma.properties.findMany({ where: { id: { in: ids } } });
          for (const p of rows) propertyMap.set(`properties:${p.id}`, p);
        } catch (_) {}
      }
    } else {
      const allIds = [...new Set(bids.map(b => b.property_id))];
      for (const pid of allIds) {
        let p = null;
        if (schemaCache.properties_apartments) {
          try { p = await prisma.properties_apartments.findUnique({ where: { id: pid } }); if (p) { p.source_table = 'properties_apartments'; } } catch (_) {}
        }
        if (!p && schemaCache.properties_houses) {
          try { p = await prisma.properties_houses.findUnique({ where: { id: pid } }); if (p) { p.source_table = 'properties_houses'; } } catch (_) {}
        }
        if (!p && schemaCache.properties) {
          try { p = await prisma.properties.findUnique({ where: { id: pid } }); if (p) { p.source_table = 'properties'; } } catch (_) {}
        }
        if (p) propertyMap.set(`${p.source_table}:${pid}`, p);
      }
    }
    
    const formatProp = (property) => {
      if (!property) {
        return {
          title: null,
          location: null,
          price: null,
          auction_starting_price: null,
          auction_minimum_bid: null,
          photos: [],
          is_auction: 0,
          auction_end_date: null,
          test_timer_end_date: null,
          test_timer_duration: null,
          buy_now_winner_user_id: null,
          buy_now_completed_at: null,
          currency: 'USD',
          area: null,
          sqft: null,
          bedrooms: null,
          rooms: null,
          bathrooms: null,
        };
      }
      let photos = property.photos;
      if (photos && typeof photos === 'string') {
        try { photos = JSON.parse(photos); } catch (_) { photos = []; }
      }
      if (!Array.isArray(photos)) photos = [];
      photos = normalizePhotosListInput(photos);
      const area = property.area ?? property.living_area ?? property.sqft ?? null;
      const bedrooms = property.bedrooms ?? property.rooms ?? null;
      const bathrooms = property.bathrooms ?? property.baths ?? null;
      return {
        title: property.title || null,
        location: property.location || property.address || null,
        price: property.price ?? null,
        auction_starting_price: property.auction_starting_price ?? null,
        auction_minimum_bid: property.auction_minimum_bid ?? null,
        photos,
        is_auction: property.is_auction || 0,
        auction_end_date: property.auction_end_date || null,
        test_timer_end_date: property.test_timer_end_date || null,
        test_timer_duration: property.test_timer_duration ?? null,
        buy_now_winner_user_id: property.buy_now_winner_user_id ?? null,
        buy_now_completed_at: property.buy_now_completed_at || null,
        currency: property.currency || 'USD',
        area,
        sqft: area,
        bedrooms,
        rooms: bedrooms,
        bathrooms,
      };
    };
    
    const formattedBids = bids.map(bid => {
      let key;
      if (hasPropertyTable) {
        const tbl = bid.property_table || 'properties';
        key = `${tbl}:${bid.property_id}`;
      } else {
        key = propertyMap.has(`properties_apartments:${bid.property_id}`) ? `properties_apartments:${bid.property_id}` : propertyMap.has(`properties_houses:${bid.property_id}`) ? `properties_houses:${bid.property_id}` : `properties:${bid.property_id}`;
      }
      const property = propertyMap.get(key);
      const fp = formatProp(property);
      return {
        ...bid,
        title: fp.title,
        location: fp.location,
        price: fp.price,
        auction_starting_price: fp.auction_starting_price,
        auction_minimum_bid: fp.auction_minimum_bid,
        photos: fp.photos,
        is_auction: fp.is_auction,
        auction_end_date: fp.auction_end_date,
        test_timer_end_date: fp.test_timer_end_date,
        test_timer_duration: fp.test_timer_duration,
        buy_now_winner_user_id: fp.buy_now_winner_user_id,
        buy_now_completed_at: fp.buy_now_completed_at,
        currency: fp.currency
      };
    });
    
    res.json({ success: true, data: formattedBids });
  } catch (error) {
    console.error('Ошибка при получении ставок пользователя:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bids/user/:userId/property/:propertyId - Получить историю ставок пользователя по конкретному объекту
 */
app.get('/api/bids/user/:userId/property/:propertyId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const propertyId = req.params.propertyId;
    const prisma = getPrisma();
    
    console.log(`📊 Запрос истории ставок пользователя ${userId} по объекту ${propertyId}`);
    
    const pid = Number(propertyId);
    let propertyTable = normalizeBidPropertyTableQuery(
      req.query.property_table ?? req.query.table ?? req.query.source_table
    );
    const pLegacy = await prisma.properties.findUnique({ where: { id: pid } });
    const pApt = await prisma.properties_apartments.findUnique({ where: { id: pid } });
    const pHouse = await prisma.properties_houses.findUnique({ where: { id: pid } });
    if (!propertyTable) {
      if (pApt) propertyTable = 'properties_apartments';
      else if (pHouse) propertyTable = 'properties_houses';
      else if (pLegacy) propertyTable = 'properties';
      else propertyTable = 'properties_apartments';
    }
    const bidWhere = {
      ...buildBidWhereForProperty(pid, propertyTable),
      user_id: Number(userId),
    };
    const bids = await prisma.bids.findMany({
      where: bidWhere,
      orderBy: { created_at: 'desc' },
    });
    const pAny = pLegacy || pApt || pHouse;
    
    // Парсим JSON поля
    const formattedBids = bids.map(bid => {
      const formatted = { ...bid, ...(pAny || {}) };
      if (formatted.photos) {
        try {
          formatted.photos = JSON.parse(formatted.photos);
        } catch (e) {
          formatted.photos = [];
        }
      } else {
        formatted.photos = [];
      }
      return formatted;
    });
    
    console.log(`✅ Найдено ${formattedBids.length} ставок пользователя ${userId} по объекту ${propertyId}`);
    
    res.json({ success: true, data: formattedBids });
  } catch (error) {
    console.error('❌ Ошибка при получении истории ставок пользователя по объекту:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ========== РОУТЫ ДЛЯ ВЫИГРАННЫХ ОБЪЕКТОВ НА АУКЦИОНЕ ==========
 * Таблица auction_winners — схема через Prisma (миграции).
 */

function parseDateMsAuction(v) {
  if (v == null || v === '') return null;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Согласовано с фронтом: src/utils/auctionReminderBounds.js — getEffectiveAuctionEndTime */
function effectiveAuctionEndTimeForServer(property) {
  if (!property) return null;
  const bnw =
    property.buy_now_winner_user_id != null &&
    property.buy_now_completed_at != null &&
    String(property.buy_now_completed_at).trim() !== '';
  if (bnw) return null;
  const testDur = property.test_timer_duration != null && Number(property.test_timer_duration) > 0;
  const hasTest =
    property.test_timer_end_date != null &&
    (typeof property.test_timer_end_date !== 'string' || property.test_timer_end_date.trim() !== '');
  if (testDur && hasTest) {
    return property.test_timer_end_date ?? null;
  }
  const preEndMs = parseDateMsAuction(property.auction_end_date);
  const now = Date.now();
  if (preEndMs != null && preEndMs > now) {
    return property.auction_end_date ?? null;
  }
  if (hasTest) {
    return property.test_timer_end_date ?? null;
  }
  const fallback = property.endTime ?? property.auction_end_date ?? null;
  return fallback != null && fallback !== '' ? fallback : null;
}

function propertyTableFromSourceTable(sourceTable) {
  if (sourceTable === 'properties_apartments') return 'properties_apartments';
  if (sourceTable === 'properties_houses') return 'properties_houses';
  return 'properties';
}

/**
 * Создаёт запись победителя и уведомления (общая логика с POST /api/auction-winners).
 */
async function insertAuctionWinnerRow(prisma, row) {
  const user_id = Number(row.user_id);
  const property_id = Number(row.property_id);
  const property_table = String(row.property_table);
  const winning_bid_amount = Number(row.winning_bid_amount);
  const currency = row.currency || 'USD';
  const auction_end_date = row.auction_end_date;

  const depositAmount = Math.round(winning_bid_amount * 0.1 * 100) / 100;
  const wonDate = new Date(auction_end_date);
  const depositDueDate = new Date(wonDate.getTime() + 3 * 24 * 60 * 60 * 1000);

  const createdWinner = await prisma.auction_winners.create({
    data: {
      user_id,
      property_id,
      property_table,
      winning_bid_amount,
      currency,
      auction_end_date,
      deposit_amount: depositAmount,
      deposit_due_date: depositDueDate.toISOString(),
      status: 'pending_deposit',
      won_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });

  try {
    const propertyTableSafe = ['properties', 'properties_apartments', 'properties_houses'].includes(property_table)
      ? property_table
      : 'properties';
    const propertyRow =
      propertyTableSafe === 'properties_apartments'
        ? await prisma.properties_apartments.findUnique({ where: { id: property_id }, select: { id: true, title: true } })
        : propertyTableSafe === 'properties_houses'
          ? await prisma.properties_houses.findUnique({ where: { id: property_id }, select: { id: true, title: true } })
          : await prisma.properties.findUnique({ where: { id: property_id }, select: { id: true, title: true } });
    const propertyTitle = propertyRow?.title || 'объект';

    await notificationQueries.create({
      user_id,
      type: 'auction_won',
      title: 'Вы победили в аукционе',
      message: `Поздравляем! Вы победили в аукционе по объекту "${propertyTitle}".`,
      data: {
        property_id,
        winner_id: createdWinner.id,
      },
      is_read: 0,
      view_count: 0,
    });

    await notificationQueries.create({
      user_id,
      type: 'payment_deadline',
      title: 'Срок оплаты депозита',
      message: `Оплатите депозит до ${depositDueDate.toLocaleString('ru-RU')}, чтобы сохранить право на покупку "${propertyTitle}".`,
      data: {
        property_id,
        winner_id: createdWinner.id,
        deposit_due_date: depositDueDate.toISOString(),
      },
      is_read: 0,
      view_count: 0,
    });

    const losingBidders = await prisma.bids.findMany({
      where: { property_id, user_id: { not: user_id } },
      distinct: ['user_id'],
      select: { user_id: true },
    });

    for (const bidder of losingBidders) {
      await notificationQueries.create({
        user_id: bidder.user_id,
        type: 'auction_lost',
        title: 'Аукцион завершен',
        message: `Аукцион по объекту "${propertyTitle}" завершен. Победил другой участник.`,
        data: {
          property_id,
        },
        is_read: 0,
        view_count: 0,
      });
    }
  } catch (auctionNotifError) {
    console.error('❌ Ошибка создания high-priority уведомлений по аукциону:', auctionNotifError);
  }

  return { createdWinner, depositAmount, depositDueDate };
}

/**
 * Идемпотентно: если аукцион завершён и есть ставки, создаёт запись победителя по макс. ставке.
 * Раньше запись появлялась только при открытой странице объекта (клиентский POST).
 */
async function ensureAuctionWinnerForPropertyId(propertyId) {
  const prisma = getPrisma();
  const pid = Number(propertyId);
  if (!Number.isFinite(pid)) {
    return { ok: false, reason: 'bad_id' };
  }

  const anyRow = await prisma.auction_winners.findFirst({
    where: { property_id: pid },
    orderBy: { id: 'desc' },
    select: { id: true },
  });
  if (anyRow) {
    return { ok: true, created: false, reason: 'already_exists' };
  }

  const property = await propertyQueries.getById(pid, null);
  if (!property) {
    return { ok: false, reason: 'property_not_found' };
  }

  const end = effectiveAuctionEndTimeForServer(property);
  if (!end) {
    return { ok: false, reason: 'no_auction_end' };
  }
  if (new Date(end).getTime() > Date.now()) {
    return { ok: false, reason: 'auction_not_ended' };
  }

  const bids = await prisma.bids.findMany({
    where: { property_id: pid },
    orderBy: [{ bid_amount: 'desc' }, { created_at: 'desc' }],
  });
  if (!bids.length) {
    return { ok: false, reason: 'no_bids' };
  }

  const top = bids[0];
  let propertyTable =
    top.property_table && String(top.property_table).trim() !== ''
      ? String(top.property_table).trim()
      : null;
  if (!propertyTable || !['properties', 'properties_apartments', 'properties_houses'].includes(propertyTable)) {
    propertyTable = propertyTableFromSourceTable(property.source_table || 'properties');
  }

  await insertAuctionWinnerRow(prisma, {
    user_id: top.user_id,
    property_id: pid,
    property_table: propertyTable,
    winning_bid_amount: top.bid_amount,
    currency: property.currency || 'USD',
    auction_end_date: end,
  });

  console.log('✅ ensureAuctionWinnerForPropertyId: создана запись для объекта', pid);
  return { ok: true, created: true };
}

/**
 * POST /api/auction-winners - Сохранить победителя аукциона
 * Вызывается когда таймер аукциона закончился
 */
app.post('/api/auction-winners', async (req, res) => {
  try {
    const { user_id, property_id, property_table, winning_bid_amount, currency, auction_end_date } = req.body;
    const prisma = getPrisma();
    
    console.log('🏆 Сохранение победителя аукциона:', { user_id, property_id, property_table, winning_bid_amount });
    
    // Валидация
    if (!user_id || !property_id || !property_table || !winning_bid_amount || !auction_end_date) {
      return res.status(400).json({
        success: false,
        error: 'Необходимо указать: user_id, property_id, property_table, winning_bid_amount, auction_end_date'
      });
    }
    
    // Проверяем, не был ли уже сохранен победитель для этого объекта
    const existing = await prisma.auction_winners.findFirst({
      where: { property_id: Number(property_id), property_table: String(property_table) },
      select: { id: true },
    });
    
    if (existing) {
      console.log('⚠️ Победитель для этого объекта уже сохранен');
      return res.status(409).json({
        success: false,
        error: 'Победитель для этого объекта уже зарегистрирован'
      });
    }
    
    const { createdWinner, depositAmount, depositDueDate } = await insertAuctionWinnerRow(prisma, {
      user_id,
      property_id,
      property_table,
      winning_bid_amount,
      currency,
      auction_end_date,
    });
    
    console.log('✅ Победитель сохранен:', {
      id: createdWinner.id,
      deposit_amount: depositAmount,
      deposit_due_date: depositDueDate.toISOString()
    });
    
    res.json({
      success: true,
      data: {
        id: createdWinner.id,
        deposit_amount: depositAmount,
        deposit_due_date: depositDueDate.toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при сохранении победителя:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auction-winners/ensure/:propertyId — серверная синхронизация победителя (для отладки и страницы объекта)
 */
app.post('/api/auction-winners/ensure/:propertyId', async (req, res) => {
  try {
    const propertyId = parseInt(req.params.propertyId, 10);
    if (Number.isNaN(propertyId)) {
      return res.status(400).json({ success: false, error: 'Некорректный property_id' });
    }
    const result = await ensureAuctionWinnerForPropertyId(propertyId);
    if (!result.ok && result.reason === 'property_not_found') {
      return res.status(404).json({ success: false, error: result.reason, details: result });
    }
    return res.json({ success: result.ok, details: result });
  } catch (error) {
    console.error('❌ ensure auction winner:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/auction-winners/property/:propertyId — победитель по объекту (для карточек и страницы аукциона)
 */
app.get('/api/auction-winners/property/:propertyId', async (req, res) => {
  try {
    const propertyId = parseInt(req.params.propertyId, 10);
    if (Number.isNaN(propertyId)) {
      return res.status(400).json({ success: false, error: 'Некорректный property_id' });
    }
    const row = await getPrisma().auction_winners.findFirst({
      where: { property_id: propertyId },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        user_id: true,
        property_id: true,
        property_table: true,
        winning_bid_amount: true,
        currency: true,
        auction_end_date: true,
        status: true,
        won_at: true,
      },
    });
    res.json({ success: true, data: row || null });
  } catch (error) {
    console.error('❌ Ошибка при получении победителя по объекту:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/auction-winners/user/:id - Получить выигранные объекты пользователя
 */
app.get('/api/auction-winners/user/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный user_id'
      });
    }
    
    const prisma = getPrisma();
    
    console.log(`📊 Запрос выигранных объектов для пользователя ${userId}`);

    // Записи в auction_winners раньше создавались только в браузере (страница объекта).
    // Дописываем отсутствующие строки для объектов, где пользователь участвовал в торгах.
    try {
      const distinctProps = await prisma.bids.groupBy({
        by: ['property_id'],
        where: { user_id: userId },
      });
      for (const row of distinctProps) {
        const pid = row.property_id;
        const exists = await prisma.auction_winners.findFirst({
          where: { property_id: pid },
          select: { id: true },
        });
        if (!exists) {
          await ensureAuctionWinnerForPropertyId(pid);
        }
      }
    } catch (backfillErr) {
      console.warn('⚠️ auction-winners backfill (личный кабинет):', backfillErr?.message || backfillErr);
    }
    
    const winners = await prisma.auction_winners.findMany({
      where: { user_id: userId },
      orderBy: { won_at: 'desc' },
    });
    
    if (winners.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    const propertyById = new Map();
    const byTable = { properties_apartments: [], properties_houses: [], properties: [] };
    for (const w of winners) {
      const t = w.property_table || 'properties';
      if (!byTable[t]) byTable[t] = [];
      byTable[t].push(w.property_id);
    }
    const uniq = (arr) => [...new Set(arr)];
    try {
      if (byTable.properties_apartments.length) {
        const ids = uniq(byTable.properties_apartments);
        const ph = ids.map(() => '?').join(',');
        const rows = await prisma.properties_apartments.findMany({ where: { id: { in: ids } } });
        for (const p of rows) propertyById.set(`properties_apartments:${p.id}`, p);
      }
      if (byTable.properties_houses.length) {
        const ids = uniq(byTable.properties_houses);
        const ph = ids.map(() => '?').join(',');
        const rows = await prisma.properties_houses.findMany({ where: { id: { in: ids } } });
        for (const p of rows) propertyById.set(`properties_houses:${p.id}`, p);
      }
      if (byTable.properties.length) {
        const ids = uniq(byTable.properties);
        const ph = ids.map(() => '?').join(',');
        const rows = await prisma.properties.findMany({ where: { id: { in: ids } } });
        for (const p of rows) propertyById.set(`properties:${p.id}`, p);
      }
    } catch (e) {
      console.warn('⚠️ Ошибка batch-загрузки объектов для auction_winners:', e.message);
    }
    
    const winnersWithDetails = winners.map(winner => {
      const t = winner.property_table || 'properties';
      let property = propertyById.get(`${t}:${winner.property_id}`) || null;
      if (property && property.photos) {
        try { property = { ...property, photos: JSON.parse(property.photos) }; } catch (_) { property = { ...property, photos: [] }; }
      } else if (property) {
        property = { ...property, photos: [] };
      }
      return { ...winner, property: property || null };
    });
    
    console.log(`✅ Найдено ${winnersWithDetails.length} выигранных объектов для пользователя ${userId}`);
    
    res.json({ success: true, data: winnersWithDetails });
  } catch (error) {
    console.error('❌ Ошибка при получении выигранных объектов:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auction-winners/:id/pay-deposit - Оплатить депозит
 */
app.post('/api/auction-winners/:id/pay-deposit', async (req, res) => {
  try {
    const winnerId = parseInt(req.params.id);
    const prisma = getPrisma();
    
    console.log(`💳 Оплата депозита для выигранного объекта ${winnerId}`);
    
    // Получаем информацию о выигранном объекте
    const winner = await prisma.auction_winners.findUnique({ where: { id: winnerId } });
    
    if (!winner) {
      return res.status(404).json({
        success: false,
        error: 'Выигранный объект не найден'
      });
    }
    
    if (winner.deposit_paid === 1) {
      return res.status(400).json({
        success: false,
        error: 'Депозит уже оплачен'
      });
    }
    
    // Проверяем, не истек ли срок оплаты
    const now = new Date();
    const dueDate = new Date(winner.deposit_due_date);
    
    if (now > dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Срок оплаты депозита истек'
      });
    }
    
    // Обновляем статус оплаты
    await prisma.auction_winners.update({
      where: { id: winnerId },
      data: {
        deposit_paid: 1,
        deposit_paid_at: new Date().toISOString(),
        status: 'deposit_paid',
        updated_at: new Date().toISOString(),
      },
    });
    
    console.log(`✅ Депозит оплачен для выигранного объекта ${winnerId}`);
    
    res.json({
      success: true,
      data: {
        id: winnerId,
        deposit_paid: true,
        deposit_paid_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при оплате депозита:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err);
  
  // Специальная обработка ошибок базы данных
  if (err.message?.includes('locked') || 
      err.message?.includes('SQLITE_BUSY') || 
      err.message?.includes('SQLITE_LOCKED') ||
      err.code?.includes('SQLITE_BUSY') ||
      err.code?.includes('SQLITE_LOCKED')) {
    console.error('⚠️ Ошибка блокировки БД:', err.message);
    return res.status(503).json({ 
      success: false, 
      error: 'База данных временно недоступна. Попробуйте позже.',
      retryable: true
    });
  }
  
  // Ошибки целостности данных
  if (err.message?.includes('UNIQUE constraint') || 
      err.message?.includes('FOREIGN KEY constraint')) {
    return res.status(409).json({ 
      success: false, 
      error: err.message || 'Нарушение целостности данных'
    });
  }
  
  // Общие ошибки
  res.status(500).json({ 
    success: false, 
    error: 'Внутренняя ошибка сервера',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Запуск сервера
// Health check endpoint для проверки доступности сервера
app.get('/api/users/health', async (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

// ========== РОУТЫ ДЛЯ ПАРСИНГА НЕДВИЖИМОСТИ ==========

/**
 * GET /api/properties/calculator-options — города и районы для калькулятора цены
 */
app.get('/api/properties/calculator-options', async (req, res) => {
  res.json({
    success: true,
    data: {
      cities: SPAIN_CITIES,
      districtsByCity: DISTRICTS_BY_CITY
    }
  });
});

function normalizeDistrictText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveCalculatorCity(rawCity = '') {
  const cityNorm = normalizeDistrictText(rawCity);
  if (!cityNorm) return null;
  return (
    SPAIN_CITIES.find((c) => normalizeDistrictText(c.value) === cityNorm) ||
    SPAIN_CITIES.find((c) => normalizeDistrictText(c.label) === cityNorm) ||
    SPAIN_CITIES.find((c) => normalizeDistrictText(c.value).includes(cityNorm)) ||
    SPAIN_CITIES.find((c) => normalizeDistrictText(c.label).includes(cityNorm)) ||
    null
  );
}

function detectDistrictByAddress({ cityValue, addressText, nominatimAddress }) {
  const nom =
    nominatimAddress != null && typeof nominatimAddress === 'object' ? nominatimAddress : {};
  const districtOptions = getDistrictOptions(cityValue);
  if (!Array.isArray(districtOptions) || districtOptions.length <= 1) {
    return districtOptions?.[0] || { value: 'all', label: 'Весь город' };
  }

  const candidates = [
    nom.suburb,
    nom.city_district,
    nom.district,
    nom.neighbourhood,
    nom.quarter,
    nom.borough,
    nom.residential,
    nom.county,
    addressText
  ]
    .filter(Boolean)
    .map((item) => normalizeDistrictText(item))
    .filter(Boolean);

  const haystack = candidates.join(' ');
  if (!haystack) return districtOptions[0];

  let best = districtOptions[0];
  let bestScore = -1;

  for (const option of districtOptions) {
    if (option.value === 'all') continue;
    const keywords = Array.isArray(option.keywords) ? option.keywords : [];
    if (!keywords.length) continue;
    const score = keywords.reduce((acc, kw) => {
      const normalizedKw = normalizeDistrictText(kw);
      if (!normalizedKw) return acc;
      return haystack.includes(normalizedKw) ? acc + normalizedKw.length : acc;
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      best = option;
    }
  }

  return bestScore > 0 ? best : districtOptions[0];
}

/**
 * POST /api/properties/detect-district
 * Определяет район по адресу объекта через Nominatim + локальный словарь районов.
 */
app.post('/api/properties/detect-district', async (req, res) => {
  const { address, city, country } = req.body || {};

  if (!address || !city) {
    return res.status(400).json({
      success: false,
      error: 'Необходимо передать address и city'
    });
  }

  const cityCfg = resolveCalculatorCity(city);
  if (!cityCfg) {
    return res.json({
      success: true,
      data: {
        city: String(city || ''),
        district: 'all',
        districtLabel: 'Весь город',
        source: 'fallback_city_not_found',
        nominatimAddress: null
      }
    });
  }

  const query = `${String(address || '').trim()}, ${cityCfg.label || cityCfg.value}, ${String(country || 'Spain').trim()}`;
  let nominatimAddress = null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&accept-language=es&q=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      timeout: 9000,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'newsellyourbrick/1.0 district-detector'
      }
    });
    const hit = Array.isArray(response.data) ? response.data[0] : null;
    nominatimAddress = hit?.address || null;
  } catch (err) {
    console.warn('⚠️ detect-district Nominatim error:', err.message);
  }

  const districtRecord = detectDistrictByAddress({
    cityValue: cityCfg.value,
    addressText: address,
    nominatimAddress
  });

  return res.json({
    success: true,
    data: {
      city: cityCfg.value,
      district: districtRecord?.value || 'all',
      districtLabel: districtRecord?.label || 'Весь город',
      source: nominatimAddress ? 'nominatim+keywords' : 'keywords_only',
      nominatimAddress
    }
  });
});

/**
 * POST /api/properties/calculate-price - Парсинг похожих объектов с испанских сайтов недвижимости
 * Принимает параметры недвижимости и возвращает рекомендуемую цену и похожие объекты
 */
app.post('/api/properties/calculate-price', async (req, res) => {
    const { area, rooms, city, country, street, propertyType, district, maxPrice, minPrice } = req.body;
    const pt = propertyType || 'apartment';
    const noRoomsType = pt === 'land' || pt === 'commercial';

    // Валидация обязательных полей
    if (!area || !city) {
        return res.status(400).json({
            success: false,
            error: 'Необходимо указать площадь (area) и город (city)'
        });
    }
    if (!noRoomsType && rooms !== 'studio' && (rooms === undefined || rooms === null || rooms === '')) {
        return res.status(400).json({
            success: false,
            error: 'Укажите количество комнат или выберите тип «Земля»'
        });
    }

    console.log('🔍 Начало парсинга недвижимости с параметрами:', {
      area,
      rooms,
      city,
      country: country || 'не указана',
      street: street || 'не указана',
      district: district || 'all',
      propertyType: pt,
      maxPrice: maxPrice || 'не указано',
      minPrice: minPrice || 'не указано'
    });

    try {
      const result = await calculatePropertyPrice({
        area,
        rooms: noRoomsType ? null : rooms,
        city,
        country,
        street,
        propertyType: pt,
        district: district || 'all',
        maxPrice,
        minPrice
      });

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ Ошибка при расчете:', error);
      
      // Возвращаем пустой результат при ошибке
      return res.json({
        success: true,
        data: {
          recommendedPrice: null,
          similarProperties: [],
          searchParams: {
            area: parseInt(area) || null,
            rooms: noRoomsType ? null : (rooms === 'studio' ? 'studio' : (parseInt(rooms) || null)),
            city: (city || '').toLowerCase(),
            district: district || 'all',
            propertyType: pt,
            searchLevel: 'error',
            sources: []
          },
          note: `Произошла ошибка при поиске объектов. Попробуйте позже или измените параметры поиска.`
        }
      });
    }
});

// Обработчик для необработанных маршрутов (для диагностики)
app.use((req, res, next) => {
  if (req.path.includes('test-timer')) {
    console.log('⚠️ Необработанный запрос к test-timer:', {
      method: req.method,
      path: req.path,
      url: req.url,
      originalUrl: req.originalUrl
    });
  }
  next();
});

// Обработчик для необработанных маршрутов (для диагностики)
app.use((req, res, next) => {
  if (req.path.includes('test-timer')) {
    console.log('⚠️ Необработанный запрос к test-timer:', {
      method: req.method,
      path: req.path,
      url: req.url,
      originalUrl: req.originalUrl
    });
  }
  next();
});

// Обработчик 404 для всех остальных маршрутов
// ВАЖНО: В production этот обработчик должен быть ПОСЛЕ раздачи статики
// Поэтому он будет зарегистрирован позже, после настройки статики
if (process.env.NODE_ENV !== 'production') {
  // В development регистрируем сразу
  app.use((req, res) => {
    if (req.path.includes('test-timer')) {
      console.error('❌ 404 для test-timer маршрута:', {
        method: req.method,
        path: req.path,
        url: req.url
      });
    }
    res.status(404).json({ 
      success: false, 
      error: 'Маршрут не найден',
      method: req.method,
      path: req.path,
      url: req.url
    });
  });
}

// Проверяем зарегистрированные маршруты перед запуском
const registeredRoutes = [];
app._router?.stack?.forEach((middleware) => {
  if (middleware.route) {
    registeredRoutes.push(`${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
  }
});

// ========== СОБЫТИЙНАЯ СИСТЕМА ОТСЛЕЖИВАНИЯ ОБЪЕКТОВ БЕЗ СТАВОК ==========

/**
 * Отправляет уведомления владельцу объекта о том, что за 45 дней не было ставок
 * @param {number} propertyId - ID объекта
 * @param {object} property - Данные объекта
 */
async function sendNoBidsNotification(propertyId, property) {
  try {
    console.log(`📧 Отправка уведомления для объекта ${propertyId}...`);
    
    // Проверяем, не отправляли ли уже уведомление
    if (notifiedProperties.has(propertyId)) {
      console.log(`⏭️ Уведомление для объекта ${propertyId} уже отправлено, пропускаем`);
      return;
    }
    
    // Получаем данные владельца
    const owner = await userQueries.getById(property.user_id);
    if (!owner) {
      console.warn(`⚠️ Владелец с ID ${property.user_id} не найден для объекта ${propertyId}`);
      return;
    }
    
    const propertyTitle = property.title || 'ваш объект';
    const messageText = `За 45 дней с момента выставления вашего объекта "${propertyTitle}" не произошло ставок и взаимодействия с объявлением, предлагаем вам снизить цену в личном кабинете с помощью функции редактирования, с уважением команда sellyourbrick.`;
    
    // 1. Создаем уведомление в ЛК
    try {
      await notificationQueries.create({
        user_id: property.user_id,
        type: 'no_bids_45_days', // Тип оставляем как есть для совместимости
        title: 'Рекомендация по снижению цены',
        message: messageText,
        data: JSON.stringify({
          property_id: propertyId,
          property_title: propertyTitle
        }),
        is_read: 0,
        view_count: 0
      });
      console.log(`✅ Уведомление в ЛК создано для пользователя ${property.user_id}, объект ${propertyId}`);
    } catch (notifError) {
      console.error(`❌ Ошибка создания уведомления в ЛК:`, notifError);
    }
    
    // 2. Отправляем email (если есть email)
    if (owner.email) {
      try {
        const emailJsConfig = {
          serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID || process.env.EMAILJS_SERVICE_ID || '',
          templateId: process.env.REACT_APP_EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID || '',
          publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY || process.env.EMAILJS_PUBLIC_KEY || ''
        };
        
        if (emailJsConfig.serviceId && emailJsConfig.templateId && emailJsConfig.publicKey) {
          const emailMessage = `Здравствуйте, ${owner.name || owner.first_name || 'Уважаемый пользователь'}!\n\n${messageText}`;
          
          const emailData = {
            service_id: emailJsConfig.serviceId,
            template_id: emailJsConfig.templateId,
            user_id: emailJsConfig.publicKey,
            template_params: {
              to_email: owner.email,
              email: owner.email,
              message: emailMessage,
              subject: 'Рекомендация по снижению цены - Sellyourbrick'
            }
          };
          
          const emailResponse = await axios.post('https://api.emailjs.com/api/v1.0/email/send', emailData, {
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (emailResponse.status === 200) {
            console.log(`✅ Email отправлен владельцу ${owner.email}, объект ${propertyId}`);
          } else {
            console.warn(`⚠️ Email не отправлен, статус: ${emailResponse.status}`);
          }
        } else {
          console.warn(`⚠️ EmailJS не настроен, пропускаем отправку email`);
        }
      } catch (emailError) {
        console.error(`❌ Ошибка отправки email:`, emailError.message);
      }
    } else {
      console.log(`ℹ️ Email владельца не указан, пропускаем отправку email`);
    }
    
    // 3. Отправляем WhatsApp (если есть номер телефона и клиент готов)
    if (owner.phone_number && waClientReady) {
      try {
        const digits = String(owner.phone_number).replace(/\D/g, '');
        if (digits) {
          const chatId = `${digits}@c.us`;
          const whatsappMessage = `Здравствуйте, ${owner.name || owner.first_name || 'Уважаемый пользователь'}!\n\n${messageText}`;
          
          await waClient.sendMessage(chatId, whatsappMessage);
          console.log(`✅ WhatsApp сообщение отправлено владельцу ${owner.phone_number}, объект ${propertyId}`);
        }
      } catch (whatsappError) {
        console.error(`❌ Ошибка отправки WhatsApp:`, whatsappError.message);
      }
    } else {
      if (!owner.phone_number) {
        console.log(`ℹ️ Номер телефона владельца не указан, пропускаем отправку WhatsApp`);
      } else if (!waClientReady) {
        console.log(`ℹ️ WhatsApp клиент не готов, пропускаем отправку WhatsApp`);
      }
    }
    
    // Помечаем объект как уведомленный
    notifiedProperties.add(propertyId);
    console.log(`✅ Уведомления отправлены для объекта ${propertyId} (${propertyTitle})`);
    
  } catch (error) {
    console.error(`❌ Ошибка при отправке уведомления для объекта ${propertyId}:`, error);
  }
}

/**
 * Запускает таймер для объекта (45 дней)
 * Если за это время не будет ставок, отправит уведомление
 * @param {number} propertyId - ID объекта
 */
async function startPropertyTimer(propertyId) {
  // Отменяем предыдущий таймер, если он был
  cancelPropertyTimer(propertyId);
  const property = await propertyQueries.getById(propertyId);
  
  if (!property) {
    console.warn(`⚠️ Объект ${propertyId} не найден для запуска таймера`);
    return;
  }
  
  // Проверяем, что объект одобрен
  if (property.moderation_status !== 'approved') {
    console.log(`ℹ️ Объект ${propertyId} еще не одобрен, таймер не запускается`);
    return;
  }
  
  // Проверяем, не отправляли ли уже уведомление
  if (notifiedProperties.has(propertyId)) {
    console.log(`ℹ️ Уведомление для объекта ${propertyId} уже отправлено, таймер не запускается`);
    return;
  }
  
  // Запускаем таймер на 45 дней
  const timerDuration = 45 * 24 * 60 * 60 * 1000; // 45 дней в миллисекундах
  
  console.log(`⏰ Запуск таймера для объекта ${propertyId} (${property.title || 'без названия'}) на 45 дней`);
  
  const timeoutId = setTimeout(async () => {
    // Проверяем, есть ли ставки для этого объекта
    const bidsCount = await getPrisma().bids.count({
      where: { property_id: Number(propertyId) },
    });
    if (bidsCount > 0) {
      console.log(`✅ Объект ${propertyId} имеет ставки, уведомление не отправляется`);
      propertyTimers.delete(propertyId);
      return;
    }
    
    // Если ставок нет - отправляем уведомление
    await sendNoBidsNotification(propertyId, property);
    propertyTimers.delete(propertyId);
  }, timerDuration);
  
  propertyTimers.set(propertyId, timeoutId);
  console.log(`✅ Таймер установлен для объекта ${propertyId}`);
}

/**
 * Отменяет таймер для объекта (вызывается при создании ставки)
 * @param {number} propertyId - ID объекта
 */
function cancelPropertyTimer(propertyId) {
  const timeoutId = propertyTimers.get(propertyId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    propertyTimers.delete(propertyId);
    console.log(`🛑 Таймер отменен для объекта ${propertyId} (появилась ставка)`);
  }
}

// ========== КОНЕЦ СОБЫТИЙНОЙ СИСТЕМЫ ==========

/**
 * Старая функция для обратной совместимости (используется только для endpoint)
 * @deprecated Используйте событийную модель вместо этого
 */
async function checkPropertiesWithoutBids() {
  try {
    console.log('🔍 Начинаю проверку объектов без ставок за 5 минут (тестовый режим)...');
    const prisma = getPrisma();
    
    // Вычисляем время 5 минут назад (для тестирования)
    const now = new Date();
    const minutesAgo5 = new Date(now);
    minutesAgo5.setMinutes(minutesAgo5.getMinutes() - 5);
    
    console.log(`📅 Проверяю объекты, выставленные до ${minutesAgo5.toISOString()}`);
    
    const [apartments, houses] = await Promise.all([
      prisma.properties_apartments.findMany({
        where: { moderation_status: 'approved' },
        select: { id: true, user_id: true, title: true, auction_start_date: true, created_at: true, property_type: true },
      }),
      prisma.properties_houses.findMany({
        where: { moderation_status: 'approved' },
        select: { id: true, user_id: true, title: true, auction_start_date: true, created_at: true, property_type: true },
      }),
    ]);
    const propertiesToCheck = [...apartments, ...houses];
    
    console.log(`📊 Найдено объектов для проверки: ${propertiesToCheck.length}`);
    
    let notificationsSent = 0;
    let errorsCount = 0;
    
    for (const property of propertiesToCheck) {
      try {
        // Определяем дату начала отсчета (auction_start_date или created_at)
        const startDateStr = property.auction_start_date || property.created_at;
        if (!startDateStr) continue;
        
        const startDate = new Date(startDateStr);
        // Вычисляем разницу в минутах (для тестирования)
        const minutesSinceStart = Math.floor((now - startDate) / (1000 * 60));
        
        // Проверяем, прошло ли 5 минут (для тестирования)
        if (minutesSinceStart < 5) {
          continue; // Еще не прошло 5 минут
        }
        
        // Проверяем, есть ли ставки для этого объекта
        const bidsCount = await prisma.bids.count({ where: { property_id: Number(property.id) } });
        if (bidsCount > 0) {
          continue; // Есть ставки, пропускаем
        }
        
        // Проверяем, не отправляли ли уже уведомление (по типу уведомления в БД)
        // Ищем уведомления с типом 'no_bids_45_days' для этого пользователя и объекта
        const existingNotifications = await prisma.notifications.findMany({
          where: {
            user_id: Number(property.user_id),
            type: 'no_bids_45_days',
          },
          select: { id: true, data: true },
        });
        
        let alreadyNotified = false;
        for (const notif of existingNotifications) {
          try {
            if (notif.data) {
              const notifData = JSON.parse(notif.data);
              if (notifData.property_id === property.id) {
                alreadyNotified = true;
                break;
              }
            }
          } catch (parseError) {
            // Если не удалось распарсить JSON, проверяем строку
            if (notif.data && notif.data.includes(`"property_id":${property.id}`)) {
              alreadyNotified = true;
              break;
            }
          }
        }
        
        if (alreadyNotified) {
          console.log(`⏭️ Уведомление для объекта ${property.id} уже отправлено, пропускаем`);
          continue;
        }
        
        // Получаем данные владельца
        const owner = await userQueries.getById(property.user_id);
        if (!owner) {
          console.warn(`⚠️ Владелец с ID ${property.user_id} не найден для объекта ${property.id}`);
          continue;
        }
        
        const propertyTitle = property.title || 'ваш объект';
        // Для тестирования используем текст про 5 минут, в production заменить на 45 дней
        const messageText = `За 5 минут с момента выставления вашего объекта "${propertyTitle}" не произошло ставок и взаимодействия с объявлением, предлагаем вам снизить цену в личном кабинете с помощью функции редактирования, с уважением команда sellyourbrick.`;
        
        // 1. Создаем уведомление в ЛК
        try {
          await notificationQueries.create({
            user_id: property.user_id,
            type: 'no_bids_45_days', // Тип оставляем как есть для совместимости
            title: 'Рекомендация по снижению цены',
            message: messageText,
            data: JSON.stringify({
              property_id: property.id,
              property_title: propertyTitle,
              minutes_since_start: minutesSinceStart // Для теста используем минуты
            }),
            is_read: 0,
            view_count: 0
          });
          console.log(`✅ Уведомление в ЛК создано для пользователя ${property.user_id}, объект ${property.id}`);
        } catch (notifError) {
          console.error(`❌ Ошибка создания уведомления в ЛК:`, notifError);
        }
        
        // 2. Отправляем email (если есть email)
        if (owner.email) {
          try {
            // Используем EmailJS API напрямую
            const emailJsConfig = {
              serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID || process.env.EMAILJS_SERVICE_ID || '',
              templateId: process.env.REACT_APP_EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID || '',
              publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY || process.env.EMAILJS_PUBLIC_KEY || ''
            };
            
            if (emailJsConfig.serviceId && emailJsConfig.templateId && emailJsConfig.publicKey) {
              const emailMessage = `Здравствуйте, ${owner.name || owner.first_name || 'Уважаемый пользователь'}!\n\n${messageText}`;
              
              const emailData = {
                service_id: emailJsConfig.serviceId,
                template_id: emailJsConfig.templateId,
                user_id: emailJsConfig.publicKey,
                template_params: {
                  to_email: owner.email,
                  email: owner.email,
                  message: emailMessage,
                  subject: 'Рекомендация по снижению цены - Sellyourbrick'
                }
              };
              
              // Отправляем через EmailJS API
              const emailResponse = await axios.post('https://api.emailjs.com/api/v1.0/email/send', emailData, {
                headers: { 'Content-Type': 'application/json' }
              });
              
              if (emailResponse.status === 200) {
                console.log(`✅ Email отправлен владельцу ${owner.email}, объект ${property.id}`);
              } else {
                console.warn(`⚠️ Email не отправлен, статус: ${emailResponse.status}`);
              }
            } else {
              console.warn(`⚠️ EmailJS не настроен, пропускаем отправку email`);
            }
          } catch (emailError) {
            console.error(`❌ Ошибка отправки email:`, emailError.message);
          }
        } else {
          console.log(`ℹ️ Email владельца не указан, пропускаем отправку email`);
        }
        
        // 3. Отправляем WhatsApp (если есть номер телефона и клиент готов)
        if (owner.phone_number && waClientReady) {
          try {
            const digits = String(owner.phone_number).replace(/\D/g, '');
            if (digits) {
              const chatId = `${digits}@c.us`;
              const whatsappMessage = `Здравствуйте, ${owner.name || owner.first_name || 'Уважаемый пользователь'}!\n\n${messageText}`;
              
              await waClient.sendMessage(chatId, whatsappMessage);
              console.log(`✅ WhatsApp сообщение отправлено владельцу ${owner.phone_number}, объект ${property.id}`);
            }
          } catch (whatsappError) {
            console.error(`❌ Ошибка отправки WhatsApp:`, whatsappError.message);
          }
        } else {
          if (!owner.phone_number) {
            console.log(`ℹ️ Номер телефона владельца не указан, пропускаем отправку WhatsApp`);
          } else if (!waClientReady) {
            console.log(`ℹ️ WhatsApp клиент не готов, пропускаем отправку WhatsApp`);
          }
        }
        
        notificationsSent++;
        console.log(`✅ Уведомления отправлены для объекта ${property.id} (${propertyTitle})`);
        
      } catch (propertyError) {
        errorsCount++;
        console.error(`❌ Ошибка при обработке объекта ${property.id}:`, propertyError);
      }
    }
    
    console.log(`✅ Проверка завершена. Уведомлений отправлено: ${notificationsSent}, ошибок: ${errorsCount}`);
    return { notificationsSent, errorsCount };
    
  } catch (error) {
    console.error('❌ Критическая ошибка при проверке объектов без ставок:', error);
    return { notificationsSent: 0, errorsCount: 1 };
  }
}

// ========== КОНЕЦ ФУНКЦИИ ПРОВЕРКИ ОБЪЕКТОВ ==========

// Раздача статики из dist для продакшена (если папка существует)
// ВАЖНО: Это должно быть ПОСЛЕ всех API маршрутов, но ПЕРЕД запуском сервера
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', 'dist');
  const distExists = fs.existsSync(distPath);
  
  console.log(`📦 Проверка dist папки: ${distPath}`);
  console.log(`📦 Dist существует: ${distExists}`);
  
  if (distExists) {
    // Проверяем содержимое dist
    try {
      const distContents = fs.readdirSync(distPath);
      console.log(`📦 Содержимое dist: ${distContents.join(', ')}`);
    } catch (e) {
      console.warn(`⚠️ Не удалось прочитать содержимое dist: ${e.message}`);
    }
    
    console.log('📦 Production режим: раздача статики из dist');

    const sendSpaIndex = (res, indexPath) => {
      // Свежий index.html — иначе после деплоя в кэше остаются ссылки на старые чанки → 404/MIME-ошибки
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.sendFile(indexPath);
    };
    
    // Явно обрабатываем корневой маршрут - отдаем index.html
    app.get('/', (req, res) => {
      const indexPath = join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        sendSpaIndex(res, indexPath);
      } else {
        console.error(`❌ index.html не найден по пути: ${indexPath}`);
        res.status(404).send('index.html not found');
      }
    });
    
    // Раздаем статические файлы из dist (JS, CSS, изображения и т.д.)
    // Это должно быть ДО обработчика всех маршрутов
    app.use(express.static(distPath, {
      // Не кэшируем index.html, но кэшируем остальные файлы
      setHeaders: (res, path) => {
        if (path.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
      },
      // Если файл не найден, передаем управление следующему обработчику
      fallthrough: true
    }));

    // express.static с fallthrough: отсутствующий /assets/*.js иначе доходит до app.get('*') и получает
    // index.html → «MIME type text/html» и Failed to fetch dynamically imported module.
    app.use((req, res, next) => {
      const p = req.path || '';
      if (
        p.startsWith('/assets/') ||
        /\.(?:js|mjs|css|map|woff2?|ttf|eot)$/i.test(p)
      ) {
        return res.status(404).type('text/plain; charset=utf-8').send('Not found');
      }
      next();
    });
  } else {
    console.warn('⚠️ Production режим, но папка dist не найдена. Запустите npm run build перед деплоем.');
    console.warn(`⚠️ Ожидаемый путь: ${distPath}`);
  }
  
  // Регистрируем обработчик для SPA routing ПОСЛЕ раздачи статики в production
  // Этот обработчик отдает index.html для всех маршрутов, которые не являются статическими файлами
  app.get('*', (req, res) => {
    // Пропускаем API маршруты, uploads и health - для них возвращаем 404 JSON
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/health')) {
      return res.status(404).json({ 
        success: false, 
        error: 'Маршрут не найден',
        method: req.method,
        path: req.path,
        url: req.url
      });
    }

    // PDF/документы: не отдаём index.html (иначе HEAD/fetch видит text/html и условия «не открываются»)
    if (/\.pdf$/i.test(req.path)) {
      const docPath = join(distPath, req.path.replace(/^\//, ''));
      if (fs.existsSync(docPath)) {
        return res.sendFile(docPath);
      }
      return res.status(404).type('text/plain; charset=utf-8').send('Not found');
    }
    
    // Для всех остальных маршрутов отдаем index.html (SPA routing)
    const indexPath = join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.sendFile(indexPath);
    } else {
      console.error(`❌ index.html не найден по пути: ${indexPath}`);
      res.status(404).send('index.html not found');
    }
  });
}

// Запуск сервера с обработкой ошибок
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 API доступен по адресу: http://0.0.0.0:${PORT}/api`);
  console.log(`🌐 Railway PORT: ${process.env.PORT || 'не установлен'}`);
  console.log(`🔧 SERVER_PORT: ${process.env.SERVER_PORT || 'не установлен, используется 3000'}`);
  console.log(`✅ Маршрут POST /api/properties/:id/test-timer зарегистрирован`);
  console.log(`✅ Маршрут GET /api/properties/test-timers зарегистрирован`);
  console.log(`✅ Маршрут DELETE /api/properties/:id/test-timer зарегистрирован`);
  
  // Выводим все маршруты, связанные с test-timer
  const testTimerRoutes = registeredRoutes.filter(r => r.includes('test-timer'));
  if (testTimerRoutes.length > 0) {
    console.log(`📋 Зарегистрированные test-timer маршруты:`, testTimerRoutes);
  } else {
    console.warn(`⚠️ ВНИМАНИЕ: Маршруты test-timer не найдены в списке зарегистрированных!`);
  }
  
  console.log('✅ Событийная система отслеживания объектов без ставок активирована');

  const ejPrivBoot = String(
    process.env.EMAILJS_PRIVATE_KEY ||
      process.env.EMAILJS_ACCESS_TOKEN ||
      process.env.EMAILJS_PRIVATE_API_KEY ||
      ''
  ).trim();
  const ejPubBoot =
    process.env.EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY || process.env.REACT_APP_EMAILJS_PUBLIC_KEY;
  const ejSidBoot =
    process.env.EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID || process.env.REACT_APP_EMAILJS_SERVICE_ID;
  if (ejPubBoot && ejSidBoot && !ejPrivBoot) {
    console.warn(
      '⚠️ EmailJS: нет EMAILJS_PRIVATE_KEY — если в дашборде не включён «Allow API for non-browser», письма с сервера (CRM, напоминания) дадут 403. См. .env.example.'
    );
  }

  setInterval(() => {
    tickAuctionReminders().catch((e) => console.error('[auction-reminder]', e));
  }, 60 * 1000);
  setInterval(() => {
    (async () => {
      try {
        await testDriveBookingQueries.ensureTable();
        const ids = await testDriveBookingQueries.listDueSurveyWhatsApp(25);
        for (const bid of ids) {
          await sendTestDriveSurveyWhatsAppForBooking(bid, { manual: false });
        }
        const idsExit = await testDriveBookingQueries.listDueExitFeedbackWhatsApp(25);
        for (const bid of idsExit) {
          await sendTestDriveExitFeedbackWhatsAppForBooking(bid, { manual: false });
        }
      } catch (e) {
        console.warn('[test-drive-survey-wa]', e?.message || e);
      }
    })();
  }, 5 * 60 * 1000);
  setTimeout(() => {
    tickAuctionReminders().catch((e) => console.error('[auction-reminder]', e));
  }, 15 * 1000);
});

// Обработка ошибок при запуске сервера
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Порт ${PORT} уже занят. Проверьте, не запущен ли другой процесс на этом порту.`);
    console.error(`💡 Попробуйте изменить SERVER_PORT в переменных окружения.`);
  } else {
    console.error(`❌ Ошибка при запуске сервера:`, error);
  }
  process.exit(1);
});

// Graceful shutdown
// Обработка ошибок при запуске
process.on('uncaughtException', (error) => {
  console.error('❌ Необработанная ошибка:', error);
  void closeDatabase().finally(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанное отклонение промиса:', reason);
  void closeDatabase().finally(() => process.exit(1));
});

process.on('SIGINT', () => {
  console.log('\n🛑 Остановка сервера...');
  void closeDatabase().finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Остановка сервера...');
  void closeDatabase().finally(() => process.exit(0));
});

// Обработчик для необработанных маршрутов (для диагностики)
app.use((req, res, next) => {
  if (req.path.includes('test-timer')) {
    console.log('⚠️ Необработанный запрос к test-timer:', {
      method: req.method,
      path: req.path,
      url: req.url,
      originalUrl: req.originalUrl
    });
  }
  next();
});
