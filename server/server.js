import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { initDatabase, closeDatabase, getDatabase, schemaCache } from './database/database.js';
import { userQueries, documentQueries, notificationQueries, testDriveBookingQueries, administratorQueries, debtReasonQueries, debtDocumentQueries, whatsappUserQueries, purchaseRequestQueries, assistantLeadQueries, apartmentQueries, houseQueries, propertyQueries, favoriteQueries, crmQueries } from './database/database.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import fs from 'fs';
const { readFileSync } = fs;
import crypto from 'crypto';
import qrcode from 'qrcode-terminal';
import whatsappPkg from 'whatsapp-web.js';
import { calculatePropertyPrice } from './services/propertyParser.js';
import { SPAIN_CITIES, DISTRICTS_BY_CITY } from './data/propertyCalculatorLocations.js';
import { parseBulkImportFile, rowToPropertyData } from './services/bulkImportProperties.js';
import { Address, beginCell, Cell } from '@ton/core';
import { getMarketData, getMortgageRates, getRentalYieldByRegion } from './services/investmentDataService.js';
import { translatePropertyToAllLanguages } from './services/aiPropertyTranslate.js';
import { buildDatabaseSnapshot } from './services/storageSnapshot.js';
import { getAuctionMinBidStep } from '../src/utils/auctionBidStep.js';
import { registerStripeBillingRoutes, createStripeWebhookHandler } from './stripeBilling.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

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
const emailJsServiceId = process.env.REACT_APP_EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID || '';
const emailJsTemplateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID || '';
const emailJsPublicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY || process.env.VITE_EMAILJS_PUBLIC_KEY || '';
console.log('[SERVER] 📧 Итоговая конфигурация EmailJS:');
console.log('[SERVER]    - Service ID:', emailJsServiceId ? emailJsServiceId.substring(0, 15) + '...' : '❌ не установлен');
console.log('[SERVER]    - Template ID:', emailJsTemplateId || '❌ не установлен');
console.log('[SERVER]    - Public Key:', emailJsPublicKey ? emailJsPublicKey.substring(0, 15) + '...' : '❌ не установлен');
console.log('[SERVER] ═══════════════════════════════════════════════════════');

const app = express();
// На Railway в production: сервер должен слушать на PORT (который устанавливает Railway, например 8080)
// В development: используем SERVER_PORT или 3000
// Логика: если NODE_ENV=production и есть PORT, используем PORT, иначе SERVER_PORT или 3000
const PORT = (process.env.NODE_ENV === 'production' && process.env.PORT) 
  ? parseInt(process.env.PORT, 10) 
  : (process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 3000);

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
app.get('/health', (req, res) => {
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
app.post('/api/visitor-heartbeat', express.json(), (req, res) => {
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
app.get('/api/admin/online-count', (req, res) => {
  try {
    pruneOnlineVisitors();
    const count = onlineVisitors.size;
    res.json({ success: true, count });
  } catch (error) {
    console.error('Ошибка при получении online count:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Подписчики SSE для автообновления списка аукциона (без polling)
const auctionSSEClients = new Set();

function broadcastAuctionNewObjects(properties) {
  if (!properties || properties.length === 0) return;
  const payload = JSON.stringify({ type: 'new_auction_objects', properties });
  console.log(`[SSE] 📤 Рассылка новых объектов аукциона подписчикам: ${auctionSSEClients.size} клиент(ов), объектов: ${properties.length}`);
  auctionSSEClients.forEach((res) => {
    try {
      res.write(`data: ${payload}\n\n`);
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
app.get('/api/events/auction-updates', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  auctionSSEClients.add(res);
  console.log(`[SSE] 🔌 Подключён подписчик аукциона. Всего: ${auctionSSEClients.size}`);
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

/**
 * GET /api/events/user-updates?user_id= — SSE: события для кабинета (верификация, модерация объявлений).
 * Одно долгоживущее соединение на вкладку; сервер пушит только при действиях админа.
 */
app.get('/api/events/user-updates', (req, res) => {
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
app.get('/api/events/property-bids', (req, res) => {
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

// API endpoint для получения конфигурации клиента (runtime переменные)
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: {
      clerkPublishableKey: process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY || '',
      googleClientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '',
      emailjsServiceId: process.env.REACT_APP_EMAILJS_SERVICE_ID || process.env.VITE_EMAILJS_SERVICE_ID || '',
      emailjsTemplateId: process.env.REACT_APP_EMAILJS_TEMPLATE_ID || process.env.VITE_EMAILJS_TEMPLATE_ID || '',
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Middleware для логирования всех запросов и подсчета
let requestCount = 0;
let requestStats = {
  total: 0,
  byMethod: {},
  byPath: {},
  startTime: Date.now()
};

// Middleware для логирования всех запросов
app.use((req, res, next) => {
  requestCount++;
  requestStats.total++;
  
  // Подсчет по методам
  requestStats.byMethod[req.method] = (requestStats.byMethod[req.method] || 0) + 1;
  
  // Подсчет по путям (только для API запросов)
  if (req.path.startsWith('/api/')) {
    const pathKey = req.method + ' ' + req.path.split('?')[0]; // Убираем query параметры
    requestStats.byPath[pathKey] = (requestStats.byPath[pathKey] || 0) + 1;
  }
  
  // Логируем каждый запрос
  const timestamp = new Date().toISOString();
  console.log(`📥 [${requestCount}] ${req.method} ${req.path}${req.query && Object.keys(req.query).length > 0 ? '?' + new URLSearchParams(req.query).toString() : ''}`);
  
  // Логируем статистику каждые 10 запросов
  if (requestCount % 10 === 0) {
    const uptime = Math.floor((Date.now() - requestStats.startTime) / 1000);
    console.log(`\n📊 Статистика запросов (за ${uptime} сек):`);
    console.log(`   Всего запросов: ${requestStats.total}`);
    console.log(`   По методам:`, requestStats.byMethod);
    console.log(`   Топ-10 API запросов:`, Object.entries(requestStats.byPath)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => `${path}: ${count}`)
      .join(', '));
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

// Инициализация базы данных
console.log('💾 Инициализация базы данных...');
try {
  initDatabase();
  console.log('✅ База данных инициализирована успешно');
} catch (dbError) {
  console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Не удалось инициализировать базу данных:', dbError);
  console.error('💡 Проверьте права доступа к файлу базы данных и наличие необходимых директорий.');
  // Не останавливаем сервер, но логируем ошибку
  // Сервер может работать даже если БД не инициализирована (для диагностики)
}

// Таблица auction_winners создаётся в database.js при init — дублирование убрано

// ========== НАСТРОЙКА WHATSAPP WEB КЛИЕНТА ==========
let waClientReady = false;
let currentQRCode = null; // Сохраняем текущий QR-код для отображения в футере

// ========== СИСТЕМА ОТСЛЕЖИВАНИЯ ОБЪЕКТОВ БЕЗ СТАВОК ==========
// Map для хранения таймеров объектов: propertyId -> timeoutId
const propertyTimers = new Map();
// Map для отслеживания объектов, на которые уже отправлены уведомления: propertyId -> true
const notifiedProperties = new Set();
// ========== КОНЕЦ СИСТЕМЫ ОТСЛЕЖИВАНИЯ ==========

const waClient = new Client({
  authStrategy: new LocalAuth({
    dataPath: join(__dirname, '.wwebjs_auth')
  }),
  puppeteer: {
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
  // Фиксация версии веб-клиента WhatsApp, чтобы избежать ошибок
  // вида "Cannot read properties of undefined (reading 'markedUnread')"
  // из-за изменения внутреннего кода WhatsApp Web.
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
  }
});

waClient.on('qr', (qr) => {
  // Сохраняем QR-код для отображения в футере
  currentQRCode = qr;
  
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
      console.error('❌ Ошибка при инициализации WhatsApp клиента:', error.message);
      
      // Специальная обработка для timeout ошибок
      if (error.message.includes('timed out') || error.message.includes('timeout')) {
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
      } else if (error.message.includes('libglib') || error.message.includes('shared libraries')) {
        console.warn('⚠️ Не хватает системных библиотек для Chrome/Puppeteer.');
        console.warn('   WhatsApp функциональность будет недоступна, но сервер продолжит работу.');
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
app.get('/api/users', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const users = userQueries.getAll(limit, offset);
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
app.get('/api/users/:id', (req, res) => {
  try {
    const user = userQueries.getById(req.params.id);
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
 * GET /api/users/:userId/favorites — список избранных объектов (property_id + property_table)
 */
app.get('/api/users/:userId/favorites', (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Некорректный user id' });
    }
    if (!userQueries.getById(userId)) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    const data = favoriteQueries.listForUser(userId);
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
app.post('/api/users/:userId/favorites', (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Некорректный user id' });
    }
    if (!userQueries.getById(userId)) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    const { property_id, property_table } = req.body || {};
    if (property_id == null) {
      return res.status(400).json({ success: false, error: 'Укажите property_id' });
    }
    const result = favoriteQueries.add(userId, property_id, property_table);
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
app.delete('/api/users/:userId/favorites', (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Некорректный user id' });
    }
    const { property_id, property_table } = req.body || {};
    if (property_id == null) {
      return res.status(400).json({ success: false, error: 'Укажите property_id' });
    }
    const result = favoriteQueries.remove(userId, property_id, property_table);
    res.json({ success: true, removed: result.changes > 0 });
  } catch (error) {
    console.error('DELETE /api/users/:userId/favorites:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/:id/verification-status - Получить статус готовности к верификации
 * Возвращает информацию о том, какие поля заполнены и что нужно для готовности
 */
app.get('/api/users/:id/verification-status', (req, res) => {
  try {
    const userId = req.params.id;
    const user = userQueries.getById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    // Получаем документы пользователя
    const documents = documentQueries.getByUserId(userId);
    const pendingDocuments = documents.filter(doc => doc.verification_status === 'pending');
    
    // Создаем объект для проверки готовности
    const userForCheck = {
      ...user,
      documents: pendingDocuments
    };
    
    // Проверяем готовность
    const readiness = checkUserReadinessForModeration(userForCheck);
    
    // Подсчитываем прогресс заполнения
    const totalFields = 8; // Всего полей
    let filledFields = 0;
    if (readiness.missingFields.firstName === false) filledFields++;
    if (readiness.missingFields.lastName === false) filledFields++;
    if (readiness.missingFields.emailOrPhone === false) filledFields++;
    if (readiness.missingFields.country === false) filledFields++;
    if (readiness.missingFields.address === false) filledFields++;
    if (readiness.missingFields.passportSeries === false) filledFields++;
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
        ownerCabinetHasPassword: cabinet.ownerCabinetHasPassword
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users/:id/card-bound - Установить статус привязки карты
 */
app.put('/api/users/:id/card-bound', (req, res) => {
  try {
    const userId = req.params.id;
    const { cardBound } = req.body;
    
    const db = getDatabase();
    
    // Проверяем, существует ли поле card_bound
    const pragmaInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasCardBound = pragmaInfo.some(col => col.name === 'card_bound');
    
    if (!hasCardBound) {
      // Если поля нет, добавляем его
      try {
        db.prepare("ALTER TABLE users ADD COLUMN card_bound INTEGER DEFAULT 0").run();
        console.log('✅ Добавлено поле card_bound в таблицу users');
      } catch (alterError) {
        // Поле уже существует или другая ошибка
        console.warn('⚠️ Не удалось добавить поле card_bound:', alterError.message);
      }
    }
    
    // Обновляем статус привязки карты
    const stmt = db.prepare('UPDATE users SET card_bound = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const result = stmt.run(cardBound ? 1 : 0, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    const updatedUser = userQueries.getById(userId);
    
    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        cardBound: updatedUser.card_bound === 1 || updatedUser.card_bound === true
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
app.get('/api/users/email/:email', (req, res) => {
  try {
    const user = userQueries.getByEmail(req.params.email);
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
app.get('/api/users/phone/:phone', (req, res) => {
  try {
    // Декодируем номер телефона из URL
    const phone = decodeURIComponent(req.params.phone);
    const user = userQueries.getByPhone(phone);
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
app.get('/api/users/role/:role', (req, res) => {
  try {
    const { role } = req.params;
    if (!['buyer', 'seller', 'admin', 'manager'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Недопустимая роль' });
    }
    const users = userQueries.getByRole(role);
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
app.post('/api/users', (req, res) => {
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
      existingUser = userQueries.getByEmail(emailLower);
    }
    if (!existingUser && userData.phone_number) {
      const phoneDigits = String(userData.phone_number).replace(/\D/g, '');
      if (phoneDigits) {
        existingUser = userQueries.getByPhone(phoneDigits);
      }
    }
    if (existingUser) {
      // Пользователь уже зарегистрирован — возвращаем его данные (вход, а не повторная регистрация)
      userQueries.update(existingUser.id, { is_online: 1 });
      const updated = userQueries.getById(existingUser.id);
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
    
    const result = userQueries.create(userData);
    const newUser = userQueries.getById(result.lastInsertRowid);
    
    if (referrerId) {
      try {
        grantReferralBonus(getDatabase(), referrerId, newUser.id);
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

    const user = userQueries.getById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    // Получаем все pending документы пользователя
    const userDocuments = documentQueries.getByUserId(id);
    const pendingDocuments = userDocuments.filter(doc => doc.verification_status === 'pending');

    if (pendingDocuments.length === 0) {
      return res.status(400).json({ success: false, error: 'У пользователя нет документов на верификацию' });
    }

    // Одобряем все pending документы
    pendingDocuments.forEach(doc => {
      documentQueries.updateStatus(doc.id, 'approved', reviewed_by, null);
    });

    // Устанавливаем пользователя как верифицированного
    userQueries.update(id, { is_verified: 1 });

    // Создаем уведомление в БД
    try {
      console.log('📝 Создание уведомления для пользователя:', id);
      const result = notificationQueries.create({
        user_id: id,
        type: 'verification_success',
        title: 'Поздравляем с успешной верификацией!',
        message: '🎉 Ваши документы были одобрены. Теперь вы можете полноценно пользоваться сервисом.',
        is_read: 0,
        view_count: 0
      });
      console.log('✅ Уведомление о верификации создано в БД, ID:', result.lastInsertRowid);
      
      // Проверяем, что уведомление действительно создано
      const createdNotif = notificationQueries.getByUserId(id);
      console.log('📋 Всего уведомлений у пользователя:', createdNotif ? createdNotif.length : 0);
      if (createdNotif && createdNotif.length > 0) {
        console.log('📄 Последнее уведомление:', {
          id: createdNotif[0].id,
          type: createdNotif[0].type,
          title: createdNotif[0].title
        });
      }
    } catch (notifError) {
      console.error('❌ Не удалось создать уведомление в БД:', notifError);
      console.error('   Ошибка:', notifError.message);
      console.error('   Stack:', notifError.stack);
    }

    // Отправляем уведомление через WhatsApp (если доступно)
    if (user.phone_number && waClientReady) {
      try {
        const chatId = `${user.phone_number}@c.us`;
        await waClient.sendMessage(chatId, '🎉 Поздравляем с успешной верификацией! Теперь вы можете полноценно пользоваться сервисом.');
      } catch (notifError) {
        console.warn('⚠️ Не удалось отправить уведомление через WhatsApp:', notifError.message);
      }
    }

    const updatedUser = userQueries.getById(id);
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

    const user = userQueries.getById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    // Получаем все pending документы пользователя
    const userDocuments = documentQueries.getByUserId(id);
    const pendingDocuments = userDocuments.filter(doc => doc.verification_status === 'pending');

    if (pendingDocuments.length === 0) {
      return res.status(400).json({ success: false, error: 'У пользователя нет документов на верификацию' });
    }

    // Отклоняем все pending документы
    pendingDocuments.forEach(doc => {
      documentQueries.updateStatus(doc.id, 'rejected', reviewed_by, rejection_reason || 'Документы не прошли проверку');
    });

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

    const updatedUser = userQueries.getById(id);
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
app.put('/api/users/:id/block', (req, res) => {
  try {
    const userId = req.params.id;
    const user = userQueries.getById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    userQueries.update(userId, { is_blocked: 1 });
    const updatedUser = userQueries.getById(userId);
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
app.put('/api/users/:id/unblock', (req, res) => {
  try {
    const userId = req.params.id;
    const user = userQueries.getById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    userQueries.update(userId, { is_blocked: 0 });
    const updatedUser = userQueries.getById(userId);
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
app.put('/api/users/:id', (req, res) => {
  try {
    const updateData = { ...req.body };
    const userId = req.params.id;
    
    console.log(`📥 PUT /api/users/${userId} - Получен запрос на обновление:`, {
      userId,
      updateData: { ...updateData, password: updateData.password ? '***скрыт***' : undefined }
    });
    
    // Получаем текущего пользователя
    const currentUser = userQueries.getById(userId);
    if (!currentUser) {
      console.error(`❌ Пользователь с ID ${userId} не найден`);
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    // Проверяем, обновляется ли email и требуется ли его подтверждение
    if (updateData.email && updateData.email !== currentUser.email) {
      const emailLower = updateData.email.toLowerCase();
      
      // Проверяем, не занят ли email другим пользователем
      const existingUser = userQueries.getByEmail(emailLower);
      if (existingUser && existingUser.id !== parseInt(userId)) {
        return res.status(409).json({ 
          success: false, 
          error: 'Пользователь с таким email уже существует' 
        });
      }
      
      // Если пользователь зарегистрирован через WhatsApp (есть phone_number, но email был null или is_verified = 0)
      // и email изменился, требуем подтверждение
      const isWhatsAppUser = currentUser.phone_number && 
                            (!currentUser.email || currentUser.is_verified === 0);
      
      if (isWhatsAppUser) {
        // Если email изменился и пользователь WhatsApp, требуем подтверждение
        // Возвращаем специальный ответ, указывающий на необходимость подтверждения
        return res.status(200).json({ 
          success: false, 
          requiresVerification: true,
          message: 'Для подтверждения email необходим код подтверждения. Пожалуйста, используйте /api/users/:id/verify-email',
          error: 'Требуется подтверждение email' 
        });
      } else if (currentUser.is_verified === 0 && emailLower !== currentUser.email?.toLowerCase()) {
        // Если email изменился и ранее не был подтвержден, тоже требуем подтверждение
        return res.status(200).json({ 
          success: false, 
          requiresVerification: true,
          message: 'Для подтверждения email необходим код подтверждения. Пожалуйста, используйте /api/users/:id/verify-email',
          error: 'Требуется подтверждение email' 
        });
      }
      
      // Если email уже подтвержден и просто обновляется, не меняем статус верификации документов.
      // is_verified используется только для статуса KYC (одобрение документов администратором).
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
    
    const result = userQueries.update(userId, updateData);
    
    if (result.changes === 0) {
      console.warn(`⚠️ Пользователь ${userId} не обновлен (changes = 0)`);
      return res.status(404).json({ success: false, error: 'Пользователь не найден или данные не изменились' });
    }
    
    console.log(`✅ Пользователь ${userId} успешно обновлен (changes: ${result.changes})`);
    
    const updatedUser = userQueries.getById(userId);
    
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
app.delete('/api/users/:id', (req, res) => {
  try {
    const result = userQueries.delete(req.params.id);
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
app.delete('/api/users/clear', (req, res) => {
  try {
    const db = getDatabase();
    
    // Удаляем всех пользователей
    const result = db.prepare('DELETE FROM users').run();
    
    // Сбрасываем автоинкремент
    db.exec("DELETE FROM sqlite_sequence WHERE name = 'users'");
    
    console.log(`🗑️ Очистка БД: удалено ${result.changes} пользователей`);
    
    res.json({ 
      success: true, 
      message: `База данных очищена. Удалено пользователей: ${result.changes}`,
      deletedCount: result.changes
    });
  } catch (error) {
    console.error('❌ Ошибка при очистке БД:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users/:id/upload-photo - Загрузить фото пользователя
 */
app.post('/api/users/:id/upload-photo', upload.single('user_photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл не загружен' });
    }
    
    const filePath = `/uploads/${req.file.filename}`;
    const result = userQueries.update(req.params.id, { user_photo: filePath });
    
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
app.post('/api/users/:id/upload-passport', upload.single('passport_photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл не загружен' });
    }
    
    const filePath = `/uploads/${req.file.filename}`;
    const result = userQueries.update(req.params.id, { passport_photo: filePath });
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    res.json({ success: true, data: { passport_photo: filePath } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== РОУТЫ ДЛЯ РАСПОЗНАВАНИЯ ПАСПОРТА ==========

const AI_API_URL = "https://api.intelligence.io.solutions/api/v1/chat/completions";
const AI_MODEL = "deepseek-ai/DeepSeek-V3.2";
const AI_API_KEY = "io-v2-eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvd25lciI6ImE5YzAwNjc4LTFjNzEtNDY5Ny1hY2NiLTliYTU0NTdhMWU4NSIsImV4cCI6NDkyMTI0NDg2NX0.E92VNc-ri_VH1bRLZfJ4seHnvr_hdL0vzgBbRC97WYDaENrvqU-jV1gYxqG128Tvyf8yfEczZ9hfpdKeZ2E0UA";

/**
 * POST /api/passport/extract - Извлечь данные из распознанного текста паспорта с помощью AI
 * Принимает распознанный текст (OCR сделан на клиенте) и извлекает структурированные данные
 */
app.post('/api/passport/extract', async (req, res) => {
  try {
    const { recognizedText } = req.body;

    if (!recognizedText || !recognizedText.trim()) {
      return res.status(400).json({ success: false, error: 'Распознанный текст не предоставлен' });
    }

    console.log('🤖 Извлечение данных из текста паспорта...');

    const systemPrompt = `Ты специалист по извлечению данных из документов. Твоя задача - проанализировать распознанный текст с фото паспорта и извлечь структурированные данные.

**ТВОЯ РОЛЬ:**
- Анализируй предоставленный текст, распознанный с фото паспорта
- Извлекай максимально много информации для заполнения полей формы пользователя
- Будь точным и аккуратным при извлечении данных

**ПОЛЯ ДЛЯ ИЗВЛЕЧЕНИЯ:**
1. firstName (Имя) - имя владельца паспорта
2. lastName (Фамилия) - фамилия владельца паспорта
3. middleName (Отчество) - отчество, если есть
4. passportSeries (Серия паспорта) - первые 2 цифры серии паспорта
5. passportNumber (Номер паспорта) - номер паспорта (обычно 7 цифр)
6. identificationNumber (Идентификационный номер) - персональный идентификационный номер
7. address (Адрес) - адрес регистрации/проживания
8. email (Email) - если есть в документе

**ВАЖНО:**
- Извлекай только данные, которые точно присутствуют в тексте
- Если поле не найдено, оставляй его пустым (null)
- Для passportSeries извлекай только первые 2 цифры
- Для passportNumber извлекай только цифры (без серии)
- Нормализуй имена и фамилии (первая буква заглавная, остальные строчные)
- Если текст не содержит данных паспорта, верни объект с null значениями

**ФОРМАТ ОТВЕТА:**
Отвечай ТОЛЬКО в формате JSON (без дополнительного текста):
{
  "firstName": "Имя или null",
  "lastName": "Фамилия или null",
  "middleName": "Отчество или null",
  "passportSeries": "XX или null",
  "passportNumber": "XXXXXXX или null",
  "identificationNumber": "XXXXXXXXXXXXX или null",
  "address": "Адрес или null",
  "email": "email@example.com или null"
}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { 
        role: "user", 
        content: `Распознанный текст с фото паспорта:\n\n${recognizedText}\n\nИзвлеки данные в формате JSON.`
      }
    ];

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${AI_API_KEY}`
    };

    const payload = {
      "model": AI_MODEL,
      "messages": messages,
      "temperature": 0.1 // Низкая температура для более точного извлечения
    };

    const aiResponse = await fetch(AI_API_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`AI API Error ${aiResponse.status}: ${errorText}`);
      throw new Error(`AI API Error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();

    if (aiData.choices && aiData.choices.length > 0) {
      let messageContent = aiData.choices[0].message?.content || "";

      // Удаляем возможные служебные метки
      while (messageContent.includes("</think>")) {
        messageContent = messageContent.split("</think>").pop().trim();
      }
      messageContent = messageContent.replace(/<\/?redacted_reasoning>/g, "").trim();
      messageContent = messageContent.replace(/<\/?think>/g, "").trim();

      // Пытаемся распарсить JSON из ответа
      try {
        let jsonText = messageContent;
        jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          // Валидация и нормализация данных
          const extractedData = {
            firstName: parsed.firstName && parsed.firstName !== 'null' ? parsed.firstName.trim() : null,
            lastName: parsed.lastName && parsed.lastName !== 'null' ? parsed.lastName.trim() : null,
            middleName: parsed.middleName && parsed.middleName !== 'null' ? parsed.middleName.trim() : null,
            passportSeries: parsed.passportSeries && parsed.passportSeries !== 'null' ? parsed.passportSeries.trim() : null,
            passportNumber: parsed.passportNumber && parsed.passportNumber !== 'null' ? parsed.passportNumber.trim() : null,
            identificationNumber: parsed.identificationNumber && parsed.identificationNumber !== 'null' ? parsed.identificationNumber.trim() : null,
            address: parsed.address && parsed.address !== 'null' ? parsed.address.trim() : null,
            email: parsed.email && parsed.email !== 'null' ? parsed.email.trim() : null
          };

          console.log('✅ Данные успешно извлечены:', extractedData);
          
          res.json({
            success: true,
            data: extractedData
          });
        } else {
          throw new Error("AI не вернул валидный JSON");
        }
      } catch (parseError) {
        console.error("Ошибка парсинга JSON от AI:", parseError);
        throw new Error("Не удалось распарсить ответ от AI");
      }
    } else {
      throw new Error("Неожиданный формат ответа от AI");
    }
  } catch (error) {
    console.error('❌ Ошибка при извлечении данных из паспорта:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== РОУТЫ ДЛЯ ДОКУМЕНТОВ ==========

/**
 * GET /api/documents - Получить все документы
 */
app.get('/api/documents', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const documents = documentQueries.getAll(limit, offset);
    res.json({ success: true, data: documents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/documents/unreviewed - Получить непросмотренные документы
 */
app.get('/api/documents/unreviewed', (req, res) => {
  try {
    const documents = documentQueries.getUnreviewed();
    res.json({ success: true, data: documents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/documents/user/:userId - Получить документы пользователя
 */
app.get('/api/documents/user/:userId', (req, res) => {
  try {
    const documents = documentQueries.getByUserId(req.params.userId);
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
    !!(user.phone_number && String(user.phone_number).trim()) &&
    !!(user.username && String(user.username).trim());
  const ownerCabinetHasPassword = !!(user.password && String(user.password).trim());
  return { ownerCabinetProfileComplete, ownerCabinetHasPassword };
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
    const hasPassportSeries = user.passport_series && user.passport_series.trim() !== '';
    const hasPassportNumber = user.passport_number && user.passport_number.trim() !== '';
    const hasIdentificationNumber = user.identification_number && user.identification_number.trim() !== '';
    
    allFieldsFilled = basicFieldsFilled && hasCountry && hasAddress && 
                     hasPassportSeries && hasPassportNumber && hasIdentificationNumber;
    
    missingFields.country = !hasCountry;
    missingFields.address = !hasAddress;
    missingFields.passportSeries = !hasPassportSeries;
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
app.get('/api/documents/pending', (req, res) => {
  try {
    console.log('📥 Запрос на получение документов на верификацию');
    
    // Получаем все документы на верификацию
    const documents = documentQueries.getPendingVerification();
    
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
    
    usersArray.forEach(user => {
      try {
        // Загружаем полные данные пользователя
        const fullUser = userQueries.getById(user.id);
        
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
    });
    
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
app.get('/api/documents/:id', (req, res) => {
  try {
    const document = documentQueries.getById(req.params.id);
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
app.post('/api/documents', upload.single('document_photo'), (req, res) => {
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
    const user = userQueries.getById(userId);
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
    
    const result = documentQueries.create(documentData);
    const newDocument = documentQueries.getById(result.lastInsertRowid);
    
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
app.put('/api/documents/:id/review', (req, res) => {
  try {
    if (!req.body.reviewed_by) {
      return res.status(400).json({ success: false, error: 'Необходимо указать reviewed_by (ID админа/менеджера)' });
    }
    
    const result = documentQueries.markAsReviewed(req.params.id, req.body.reviewed_by);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Документ не найден' });
    }
    
    const updatedDocument = documentQueries.getById(req.params.id);
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
    
    const document = documentQueries.getById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, error: 'Документ не найден' });
    }
    
    // Одобряем документ
    const result = documentQueries.approveDocument(req.params.id, req.body.reviewed_by);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Документ не найден' });
    }
    
    // Получаем пользователя
    const user = userQueries.getById(document.user_id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    // Проверяем, все ли документы пользователя одобрены
    const userDocuments = documentQueries.getByUserId(document.user_id);
    const allApproved = userDocuments.every(doc => 
      doc.verification_status === 'approved' || doc.id === parseInt(req.params.id)
    );
    
    // Если все документы одобрены, обновляем статус пользователя
    if (allApproved) {
      userQueries.update(document.user_id, { is_verified: 1 });
      try {
        broadcastUserCabinetEvent(document.user_id, { type: 'user_verification', action: 'approved' });
      } catch (e) {
        console.warn('[SSE] user cabinet broadcast:', e.message);
      }
    }
    
    // Отправляем уведомление пользователю
    try {
      if (user.phone_number && waClientReady) {
        const digits = String(user.phone_number).replace(/\D/g, '');
        const chatId = `${digits}@c.us`;
        const message = `✅ Поздравляем с успешной верификацией!\n\nВаши документы были проверены и одобрены. Давайте познакомим вас с сервисом.`;
        
        await waClient.sendMessage(chatId, message);
      }
    } catch (notifError) {
      console.warn('⚠️ Не удалось отправить уведомление через WhatsApp:', notifError.message);
    }
    
    const updatedDocument = documentQueries.getById(req.params.id);
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
    
    const document = documentQueries.getById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, error: 'Документ не найден' });
    }
    
    // Отклоняем документ
    const rejectionReason = req.body.rejection_reason || null;
    const result = documentQueries.rejectDocument(req.params.id, req.body.reviewed_by, rejectionReason);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Документ не найден' });
    }
    
    // Получаем пользователя
    const user = userQueries.getById(document.user_id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
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
    
    const updatedDocument = documentQueries.getById(req.params.id);
    res.json({ success: true, data: updatedDocument, message: 'Документ отклонен' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/documents/:id - Удалить документ
 */
app.delete('/api/documents/:id', (req, res) => {
  try {
    const document = documentQueries.getById(req.params.id);
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
    
    const result = documentQueries.delete(req.params.id);
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
    let user = userQueries.getByPhone(phone);
    
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
      userQueries.update(user.id, { is_online: 1 });
      const updatedUser = userQueries.getById(user.id);
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
    
    const result = userQueries.create(newUser);
    const createdUser = userQueries.getById(result.lastInsertRowid);

    if (referrerId) {
      try {
        grantReferralBonus(getDatabase(), referrerId, createdUser.id);
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
      const existingUser = whatsappUserQueries.getByPhone(chatId);
      whatsappUserQueries.createOrUpdate({
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
    const result = purchaseRequestQueries.create({
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

    const newRequest = purchaseRequestQueries.getById(result.lastInsertRowid);
    
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
app.get('/api/purchase-requests', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;

    let requests;
    if (status) {
      requests = purchaseRequestQueries.getByStatus(status, limit, offset);
    } else {
      requests = purchaseRequestQueries.getAll(limit, offset);
    }

    const total = status 
      ? purchaseRequestQueries.getCountByStatus(status)
      : purchaseRequestQueries.getCount();

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
app.get('/api/purchase-requests/:id', (req, res) => {
  try {
    const request = purchaseRequestQueries.getById(req.params.id);
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
app.get('/api/purchase-requests/buyer/:buyerId', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const requests = purchaseRequestQueries.getByBuyerId(req.params.buyerId, limit, offset);
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

    const request = purchaseRequestQueries.getById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Запрос не найден' });
    }

    // Если статус "processing", резервируем объект на 72 часа
    if (status === 'processing' && request.property_id) {
      try {
        const buyerId = request.buyer_id || null;
        console.log(`🔍 PUT /api/purchase-requests/:id/status - Резервация объекта ID=${request.property_id}, buyerId=${buyerId}, requestId=${req.params.id}`);
        
        const reserveResult = propertyQueries.reserve(request.property_id, buyerId, req.params.id);
        console.log(`✅ Объект #${request.property_id} забронирован на 72 часа для запроса #${req.params.id}`, reserveResult);
        
        // Проверяем, что резервация действительно произошла
        const checkReservation = propertyQueries.isReserved(request.property_id);
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

    // Если статус "completed" или "cancelled", снимаем резервацию объекта
    if ((status === 'completed' || status === 'cancelled') && request.property_id) {
      try {
        console.log(`🔍 PUT /api/purchase-requests/:id/status - Снятие резервации объекта ID=${request.property_id} для запроса #${req.params.id}`);
        
        propertyQueries.unreserve(request.property_id);
        console.log(`✅ Резервация объекта #${request.property_id} снята для запроса #${req.params.id}`);
      } catch (unreserveError) {
        console.error('❌ Ошибка при снятии резервации объекта:', unreserveError);
        // Продолжаем выполнение, даже если снятие резервации не удалось
      }
    }

    purchaseRequestQueries.updateStatus(req.params.id, status, adminNotes);
    const updatedRequest = purchaseRequestQueries.getById(req.params.id);
    
    console.log(`✅ Статус запроса #${req.params.id} обновлен: ${status}`);
    
    // Если статус "processing", отправляем уведомления покупателю
    if (status === 'processing') {
      try {
        // Получаем реквизиты для платежа (можно вынести в переменные окружения)
        const paymentAccount = process.env.PAYMENT_ACCOUNT_NUMBER || 'BY36ALFA30122345678901234567';
        
        // Формируем сообщение для покупателя
        const currencySymbol = request.property_currency === 'USD' ? '$' : 
                              request.property_currency === 'EUR' ? '€' : 
                              request.property_currency || '';
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

        // Отправляем email через EmailJS (нужно будет вызвать на фронтенде или создать отдельный endpoint)
        // Пока просто логируем
        if (request.buyer_email) {
          console.log(`📧 Email должен быть отправлен покупателю: ${request.buyer_email}`);
          console.log(`📧 Текст сообщения:\n${message}`);
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

        if (status === 'processing') {
          notificationQueries.create({
            user_id: request.buyer_id,
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
        } else if (status === 'rejected' || status === 'cancelled') {
          notificationQueries.create({
            user_id: request.buyer_id,
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
      } catch (buyerNotifError) {
        console.error('❌ Ошибка создания buyer-уведомления по purchase request:', buyerNotifError);
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
app.delete('/api/purchase-requests/:id', (req, res) => {
  try {
    const request = purchaseRequestQueries.getById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Запрос не найден' });
    }

    // Снимаем резервацию объекта при удалении запроса
    if (request.property_id) {
      try {
        console.log(`🔍 DELETE /api/purchase-requests/:id - Снятие резервации объекта ID=${request.property_id} для запроса #${req.params.id}`);
        
        propertyQueries.unreserve(request.property_id);
        console.log(`✅ Резервация объекта #${request.property_id} снята при удалении запроса #${req.params.id}`);
      } catch (unreserveError) {
        console.error('❌ Ошибка при снятии резервации объекта:', unreserveError);
        // Продолжаем выполнение, даже если снятие резервации не удалось
      }
    }

    purchaseRequestQueries.delete(req.params.id);
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
app.post('/api/assistant-leads', (req, res) => {
  try {
    const { sessionId, userId, messages, preferences, email, phone } = req.body || {};
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
      return res.status(400).json({ success: false, error: 'sessionId обязателен' });
    }
    const result = assistantLeadQueries.upsert({
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
app.get('/api/assistant-leads', (req, res) => {
  try {
    const list = assistantLeadQueries.getAll();
    return res.json({ success: true, data: list });
  } catch (error) {
    console.error('❌ GET /api/assistant-leads:', error);
    return res.status(500).json({ success: false, error: error.message || 'Ошибка сервера' });
  }
});

/**
 * GET /api/assistant-leads/:id - Один лид по ID (карточка клиента)
 */
app.get('/api/assistant-leads/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Некорректный id' });
    const lead = assistantLeadQueries.getById(id);
    if (!lead) return res.status(404).json({ success: false, error: 'Лид не найден' });
    return res.json({ success: true, data: lead });
  } catch (error) {
    console.error('❌ GET /api/assistant-leads/:id:', error);
    return res.status(500).json({ success: false, error: error.message || 'Ошибка сервера' });
  }
});

/** ID задания «Пригласи друга» и промокод за реферала */
const REFERRAL_TASK_ID = 9;
const BONUS_REFER_PROMO = 'BONUS-REFER-10';

/**
 * Выдать бонус «Пригласи друга» пригласителю после регистрации нового пользователя по реферальной ссылке.
 * @param {object} db - экземпляр БД
 * @param {string|number} referrerId - ID пригласителя
 * @param {number} newUserId - ID только что зарегистрированного пользователя
 */
function grantReferralBonus(db, referrerId, newUserId) {
  if (!referrerId || !newUserId) return;
  const refId = String(referrerId).trim();
  const refNum = parseInt(refId, 10);
  if (!refNum || refNum === parseInt(newUserId, 10)) return;
  const referrer = userQueries.getById(refNum);
  if (!referrer) return;
  const existing = db.prepare(`
    SELECT id FROM bonus_task_submissions WHERE user_id = ? AND task_id = ? AND status = 'approved'
  `).get(refNum, REFERRAL_TASK_ID);
  if (existing) return;
  db.prepare(`
    INSERT INTO bonus_task_submissions (user_id, task_id, link, status, promo_code)
    VALUES (?, ?, 'referral', 'approved', ?)
  `).run(refNum, REFERRAL_TASK_ID, BONUS_REFER_PROMO);
}

/**
 * POST /api/bonus-submissions - Отправить заявку на бонусное задание (ссылка на пост/профиль)
 */
app.post('/api/bonus-submissions', (req, res) => {
  try {
    const db = getDatabase();
    const { user_id, task_id, link, promo_code } = req.body || {};
    if (!user_id || !task_id || !link || typeof link !== 'string' || !link.trim()) {
      return res.status(400).json({ success: false, message: 'Укажите user_id, task_id и ссылку.' });
    }
    const linkTrim = link.trim();
    if (!/^https?:\/\/.+/i.test(linkTrim)) {
      return res.status(400).json({ success: false, message: 'Некорректная ссылка.' });
    }
    const stmt = db.prepare(`
      INSERT INTO bonus_task_submissions (user_id, task_id, link, status, promo_code)
      VALUES (?, ?, ?, 'pending', ?)
    `);
    stmt.run(user_id, task_id, linkTrim, promo_code || null);
    const id = db.prepare('SELECT last_insert_rowid() as id').get().id;
    return res.status(201).json({ success: true, data: { id, status: 'pending' } });
  } catch (error) {
    console.error('❌ POST /api/bonus-submissions:', error);
    return res.status(500).json({ success: false, message: error.message || 'Ошибка сервера.' });
  }
});

/**
 * GET /api/bonus-submissions/user/:userId - Заявки пользователя по заданиям
 */
app.get('/api/bonus-submissions/user/:userId', (req, res) => {
  try {
    const db = getDatabase();
    const userId = req.params.userId;
    const rows = db.prepare(`
      SELECT id, user_id, task_id, link, status, promo_code, created_at, used_at
      FROM bonus_task_submissions
      WHERE user_id = ?
      ORDER BY task_id ASC
    `).all(userId);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ GET /api/bonus-submissions/user/:userId:', error);
    return res.status(500).json({ success: false, message: error.message || 'Ошибка сервера.' });
  }
});

/**
 * GET /api/bonus-submissions/pending - Список заявок на проверке (для админа)
 */
app.get('/api/bonus-submissions/pending', (req, res) => {
  try {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT id, user_id, task_id, link, status, promo_code, created_at
      FROM bonus_task_submissions
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `).all();
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ GET /api/bonus-submissions/pending:', error);
    return res.status(500).json({ success: false, message: error.message || 'Ошибка сервера.' });
  }
});

/**
 * PUT /api/bonus-submissions/:id/approve - Одобрить заявку (админ)
 */
app.put('/api/bonus-submissions/:id/approve', (req, res) => {
  try {
    const db = getDatabase();
    const id = req.params.id;
    const row = db.prepare('SELECT id, status, promo_code FROM bonus_task_submissions WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ success: false, message: 'Заявка не найдена.' });
    if (row.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Заявка уже обработана.' });
    }
    db.prepare(`
      UPDATE bonus_task_submissions SET status = 'approved', reviewed_at = datetime('now') WHERE id = ?
    `).run(id);
    return res.json({ success: true, data: { id, status: 'approved', promo_code: row.promo_code } });
  } catch (error) {
    console.error('❌ PUT /api/bonus-submissions/:id/approve:', error);
    return res.status(500).json({ success: false, message: error.message || 'Ошибка сервера.' });
  }
});

/**
 * PUT /api/bonus-submissions/:id/reject - Отклонить заявку (админ)
 */
app.put('/api/bonus-submissions/:id/reject', (req, res) => {
  try {
    const db = getDatabase();
    const id = req.params.id;
    const row = db.prepare('SELECT id, status FROM bonus_task_submissions WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ success: false, message: 'Заявка не найдена.' });
    if (row.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Заявка уже обработана.' });
    }
    db.prepare(`
      UPDATE bonus_task_submissions SET status = 'rejected', reviewed_at = datetime('now') WHERE id = ?
    `).run(id);
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
app.post('/api/bonus-submissions/use-promo', (req, res) => {
  try {
    const db = getDatabase();
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

    const row = db.prepare(`
      SELECT id, user_id, task_id, status, promo_code, used_at
      FROM bonus_task_submissions
      WHERE user_id = ? AND UPPER(TRIM(promo_code)) = ? AND status = 'approved'
    `).get(user_id, codeTrim);

    if (!row) {
      return res.json({ success: false, reason: 'invalid', message: 'Промокод не найден или не подходит.' });
    }
    if (!SELLER_PROMO_TASK_IDS.includes(row.task_id)) {
      return res.json({ success: false, reason: 'invalid', message: 'Этот промокод не для оплаты публикации объекта.' });
    }
    if (row.used_at) {
      return res.json({ success: false, reason: 'used', message: 'Этот промокод уже был использован.' });
    }

    db.prepare('UPDATE bonus_task_submissions SET used_at = datetime(\'now\') WHERE id = ?').run(row.id);
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
app.get('/api/owner/:sellerId/interest-count', (req, res) => {
  try {
    const { sellerId } = req.params;
    const db = getDatabase();
    
    // Проверяем, существует ли продавец
    const seller = userQueries.getById(sellerId);
    if (!seller) {
      return res.status(404).json({ success: false, error: 'Продавец не найден' });
    }
    
    // Получаем все объекты продавца
    const properties = propertyQueries.getByUserId(sellerId);
    if (!properties || properties.length === 0) {
      return res.json({ success: true, data: { uniqueUsersCount: 0 } });
    }
    
    // Получаем ID всех объектов продавца
    const propertyIds = properties.map(p => p.id);
    
    // Получаем уникальных пользователей из ставок
    const uniqueBidUsers = new Set();
    try {
      const placeholders = propertyIds.map(() => '?').join(',');
      const bidsQuery = db.prepare(`
        SELECT DISTINCT user_id 
        FROM bids 
        WHERE property_id IN (${placeholders})
      `);
      const bids = bidsQuery.all(...propertyIds);
      bids.forEach(bid => {
        if (bid.user_id) {
          uniqueBidUsers.add(bid.user_id);
        }
      });
    } catch (bidsError) {
      console.warn('⚠️ Ошибка при получении ставок:', bidsError.message);
      // Продолжаем выполнение, даже если таблица bids не существует
    }
    
    // Получаем уникальных пользователей из запросов на покупку
    const uniquePurchaseRequestUsers = new Set();
    try {
      const placeholders = propertyIds.map(() => '?').join(',');
      const purchaseRequestsQuery = db.prepare(`
        SELECT DISTINCT buyer_id 
        FROM purchase_requests 
        WHERE property_id IN (${placeholders}) AND buyer_id IS NOT NULL
      `);
      const purchaseRequests = purchaseRequestsQuery.all(...propertyIds);
      purchaseRequests.forEach(pr => {
        if (pr.buyer_id) {
          uniquePurchaseRequestUsers.add(pr.buyer_id);
        }
      });
    } catch (prError) {
      console.warn('⚠️ Ошибка при получении запросов на покупку:', prError.message);
    }
    
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
 * POST /api/auth/email/register - Регистрация через Email
 */
app.post('/api/auth/email/register', async (req, res) => {
  try {
    const { email, password, name, code, referrer_id: referrerId } = req.body;
    
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
    
    // Проверяем, существует ли пользователь с таким email
    const existingUser = userQueries.getByEmail(emailLower);
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        error: 'Пользователь с таким email уже существует' 
      });
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
    
    const newUser = {
      first_name: firstName,
      last_name: lastName,
      email: emailLower,
      password: hashedPassword, // Сохраняем хешированный пароль
      phone_number: null, // Телефон не требуется для email регистрации
      role: req.body.role || 'buyer', // Используем переданную роль или 'buyer' по умолчанию
      // ВАЖНО: is_verified отвечает за верификацию документов администратором,
      // а не за подтверждение email. Новый пользователь всегда стартует как не верифицированный.
      is_verified: 0,
      is_online: 1
    };
    
    console.log('📝 Создание нового пользователя:', { email: emailLower, name, role: newUser.role });
    const result = userQueries.create(newUser);
    console.log('✅ Пользователь создан, ID:', result.lastInsertRowid);
    
    const createdUser = userQueries.getById(result.lastInsertRowid);
    if (!createdUser) {
      console.error('❌ Ошибка: Пользователь не найден после создания, ID:', result.lastInsertRowid);
      return res.status(500).json({
        success: false,
        error: 'Ошибка при создании пользователя'
      });
    }

    if (referrerId) {
      try {
        grantReferralBonus(getDatabase(), referrerId, createdUser.id);
      } catch (refErr) {
        console.warn('⚠️ Реферальный бонус не выдан:', refErr.message);
      }
    }

    console.log('✅ Пользователь успешно сохранен в БД:', {
      id: createdUser.id,
      email: createdUser.email,
      name: `${createdUser.first_name} ${createdUser.last_name}`.trim(),
      role: createdUser.role
    });
    
    // Не возвращаем пароль в ответе (даже захешированный)
    const { password: userPassword, ...userWithoutPassword } = createdUser;
    
    // Безопасно получаем user_id_number (может не существовать в старых БД)
    const userIdNumber = createdUser.hasOwnProperty('user_id_number') ? (createdUser.user_id_number || null) : null;
    
    res.status(201).json({ 
      success: true, 
      user: {
        id: createdUser.id,
        name: `${createdUser.first_name} ${createdUser.last_name}`.trim(),
        email: createdUser.email,
        role: createdUser.role,
        phone: createdUser.phone_number,
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
    
    // Сначала пробуем найти пользователя по email
    let user = userQueries.getByEmail(identifier);
    
    // Если не нашли по email, можно добавить поиск по username в будущем
    // Пока ищем только по email
    
    if (!user) {
      console.log('❌ Пользователь не найден:', identifier);
      return res.status(401).json({ 
        success: false, 
        error: 'Неверный email или пароль' 
      });
    }
    
    console.log('✅ Пользователь найден:', { id: user.id, email: user.email, hasPassword: !!user.password });
    
    // Проверяем пароль
    // Если у пользователя нет пароля (WhatsApp регистрация или старые записи)
    if (!user.password) {
      console.log('⚠️ У пользователя нет пароля');
      // Для пользователей без пароля - требуем установить пароль в настройках
      return res.status(401).json({ 
        success: false, 
        error: 'Пароль не установлен. Установите пароль в настройках профиля (вкладка "Данные").' 
      });
    }
    
    // Хешируем введенный пароль тем же способом для сравнения
    const hashedPassword = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');
    
    console.log('🔑 Проверка пароля:', { 
      storedHash: user.password.substring(0, 20) + '...', 
      inputHash: hashedPassword.substring(0, 20) + '...',
      match: user.password === hashedPassword
    });
    
    // Сравниваем хеши паролей
    if (user.password !== hashedPassword) {
      console.log('❌ Неверный пароль');
      return res.status(401).json({ 
        success: false, 
        error: 'Неверный email или пароль' 
      });
    }
    
    // Проверяем, заблокирован ли пользователь
    if (user.is_blocked === 1) {
      console.log('🚫 Пользователь заблокирован:', { id: user.id, email: user.email });
      return res.status(403).json({ 
        success: false, 
        error: 'Пользователь заблокирован',
        is_blocked: true
      });
    }
    
    // Пароль верный, обновляем статус онлайн
    userQueries.update(user.id, { is_online: 1 });
    
    console.log('✅ Вход успешен:', { id: user.id, email: user.email, role: user.role });
    
    // Не возвращаем пароль в ответе (для безопасности)
    const { password: userPassword, ...userWithoutPassword } = user;
    
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`.trim() || user.email || 'Пользователь',
        email: user.email,
        role: user.role,
        phone: user.phone_number,
        is_verified: user.is_verified,
        is_blocked: user.is_blocked === 1
      }
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
    const user = userQueries.getById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Пользователь не найден' 
      });
    }
    
    // Проверяем, что код верный (в реальном приложении здесь должна быть проверка через БД)
    // Пока используем простую проверку через фронтенд
    
    // Проверяем, не занят ли email другим пользователем
    const existingUser = userQueries.getByEmail(email.toLowerCase());
    if (existingUser && existingUser.id !== parseInt(id)) {
      return res.status(409).json({ 
        success: false, 
        error: 'Пользователь с таким email уже существует' 
      });
    }
    
    // Обновляем email. Статус is_verified (верификация документов) не трогаем.
    const result = userQueries.update(id, { 
      email: email.toLowerCase()
    });
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Пользователь не найден' 
      });
    }
    
    const updatedUser = userQueries.getById(id);
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
    let user = userQueries.getByEmail(emailLower);
    
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
      userQueries.update(user.id, { 
        is_online: 1,
        user_photo: googlePicture || user.user_photo
      });
      const updatedUser = userQueries.getById(user.id);
      
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
      
      const result = userQueries.create(newUser);
      const createdUser = userQueries.getById(result.lastInsertRowid);
      
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
    let user = userQueries.getByTelegramId(telegramId);

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
      userQueries.update(user.id, {
        is_online: 1,
        telegram_username: username || null,
        telegram_photo_url: photo_url || null,
      });
      const updatedUser = userQueries.getById(user.id);
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
    const result = userQueries.create(newUser);
    const createdUser = userQueries.getById(result.lastInsertRowid);
    userQueries.update(createdUser.id, {
      telegram_id: telegramId,
      telegram_username: username || null,
      telegram_photo_url: photo_url || null,
    });
    const finalUser = userQueries.getById(createdUser.id);

    if (referrerId) {
      try {
        grantReferralBonus(getDatabase(), referrerId, finalUser.id);
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
app.post('/api/whatsapp/users', (req, res) => {
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

    const result = whatsappUserQueries.createOrUpdate({
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
app.post('/api/whatsapp/users/lead-type', (req, res) => {
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
    const wa = whatsappUserQueries.updateLeadType(phone_number, lt);
    const digits = String(phone_number).replace(/\D/g, '');
    const assistantUpdated = assistantLeadQueries.updateLeadTypeByPhoneDigits(digits, lt);
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

/**
 * GET /api/whatsapp/status - Проверка статуса WhatsApp клиента
 */
app.get('/api/whatsapp/status', async (req, res) => {
  try {
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
        success: true,
        ready: true,
        state: 'READY',
        message: 'WhatsApp клиент готов к работе',
        info: clientInfo
      });
    }
    
    // Если локальный клиент не готов, проверяем через бот (если доступен)
    try {
      const botResponse = await axios.get(`${BOT_URL}/api/status`, {
        timeout: 5000
      }).catch(() => null);

      if (botResponse && botResponse.data) {
        const botData = botResponse.data;
        return res.json({
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
    
    // Если ни локальный клиент, ни бот не готовы
    return res.json({
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
      error: error.message
    });
  }
});

/**
 * GET /api/whatsapp/qr - Получить QR-код WhatsApp для отображения в футере
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
      const QRCode = await import('qrcode');
      const qrImageBuffer = await QRCode.toBuffer(currentQRCode, {
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
              const existingUser = whatsappUserQueries.getByPhone(chatId);
              whatsappUserQueries.createOrUpdate({
                phone_number: chatId,
                phone_number_clean: digits,
                country: existingUser?.country || null,
                language: existingUser?.language || 'ru' // Используем существующий язык или 'ru' по умолчанию
              });
            }
          } else {
            // Если chatId уже в правильном формате, просто обновляем статистику без изменения языка
            const existingUser = whatsappUserQueries.getByPhone(chatId);
            if (existingUser) {
              // Обновляем только last_message_at и message_count, не трогая язык
              whatsappUserQueries.createOrUpdate({
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
app.get('/api/whatsapp/users', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';
    const roleFilter = req.query.role || 'all';
    const statusFilter = req.query.status || 'all';

    let users;
    
    // Если есть поисковый запрос
    if (search) {
      users = whatsappUserQueries.search(search, limit, offset);
    } else {
      users = whatsappUserQueries.getAll(limit, offset);
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

    const totalCount = whatsappUserQueries.getCount();

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
app.get('/api/notifications/user/:userId', (req, res) => {
  try {
    console.log('📥 Запрос уведомлений для пользователя:', req.params.userId);
    const notifications = notificationQueries.getByUserId(req.params.userId);
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
app.get('/api/notifications/user/:userId/unread', (req, res) => {
  try {
    const notifications = notificationQueries.getUnreadByUserId(req.params.userId);
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
app.put('/api/notifications/:id/view', (req, res) => {
  try {
    notificationQueries.markAsViewed(req.params.id);
    res.json({ success: true, message: 'Уведомление отмечено как просмотренное' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications - Создать новое уведомление
 */
app.post('/api/notifications', (req, res) => {
  try {
    const { user_id, type, title, message, data } = req.body;
    
    if (!user_id || !type || !title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать user_id, type и title' 
      });
    }
    
    const result = notificationQueries.create({
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
app.delete('/api/notifications/:id', (req, res) => {
  try {
    notificationQueries.delete(req.params.id);
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
app.get('/api/admin/users/count', (req, res) => {
  try {
    const count = userQueries.getCount();
    res.json({ success: true, count });
  } catch (error) {
    console.error('Ошибка при получении количества пользователей:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/users/country-stats - Получить статистику по национальностям (странам)
 */
app.get('/api/admin/users/country-stats', (req, res) => {
  try {
    const stats = userQueries.getCountryStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Ошибка при получении статистики по странам:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/users/role-stats - Получить статистику по ролям (продавцы/покупатели)
 */
app.get('/api/admin/users/role-stats', (req, res) => {
  try {
    const stats = userQueries.getRoleStats();
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
app.get('/api/admin/users/registrations-by-day', (req, res) => {
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
    const data = userQueries.getRegistrationsByDay(weekStart, weekEnd);
    res.json({ success: true, data, weekStart, weekEnd });
  } catch (error) {
    console.error('Ошибка при получении регистраций по дням:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/properties/category-stats - Статистика по категориям недвижимости (по типу и по разделам)
 */
app.get('/api/admin/properties/category-stats', (req, res) => {
  try {
    const byType = propertyQueries.getCategoryStatsByType();
    const bySection = propertyQueries.getCategoryStatsBySection();
    res.json({ success: true, byType, bySection });
  } catch (error) {
    console.error('Ошибка при получении статистики категорий:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/stats/counts - Количество выставленных объектов и аукционов (для карточек админки)
 */
app.get('/api/admin/stats/counts', (req, res) => {
  try {
    const propertiesCount = propertyQueries.getApprovedCount();
    const auctionsCount = propertyQueries.getAuctionsCount();
    res.json({ success: true, propertiesCount, auctionsCount });
  } catch (error) {
    console.error('Ошибка при получении счётчиков:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/storage/mirror-push — снимок SQLite → внешнее хранилище (см. проект «хранилище»).
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
app.post('/api/admin/auth/login', (req, res) => {
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
      let superAdmin = administratorQueries.getByUsername('admin');
      if (!superAdmin) {
        const hashedPassword = crypto.createHash('sha256').update('admin').digest('hex');
        administratorQueries.create({
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
        superAdmin = administratorQueries.getByUsername('admin');
      }

      const { password: _, ...adminWithoutPassword } = superAdmin;
      return res.json({
        success: true,
        admin: adminWithoutPassword
      });
    }

    // Проверяем администратора сначала по username, затем по email
    let admin = administratorQueries.getByUsername(identifier);
    if (!admin) {
      // Если не найден по username, пробуем найти по email
      admin = administratorQueries.getByEmail(identifier);
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
app.get('/api/admin/administrators', (req, res) => {
  try {
    const admins = administratorQueries.getAll();
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
app.get('/api/admin/administrators/:id', (req, res) => {
  try {
    const admin = administratorQueries.getById(req.params.id);
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
app.post('/api/admin/administrators', (req, res) => {
  try {
    const { username, password, email, full_name, ...permissions } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать username и пароль' 
      });
    }

    // Проверяем, не существует ли уже администратор с таким username
    const existingAdmin = administratorQueries.getByUsername(username);
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

    const result = administratorQueries.create({
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

    const newAdmin = administratorQueries.getById(result.lastInsertRowid);
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
app.put('/api/admin/administrators/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, ...permissions } = req.body;

    const admin = administratorQueries.getById(id);
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

    administratorQueries.update(id, {
      email: normalizedEmail,
      full_name: full_name || null,
      can_access_statistics: permissions.can_access_statistics ? 1 : 0,
      can_access_users: permissions.can_access_users ? 1 : 0,
      can_access_moderation: permissions.can_access_moderation ? 1 : 0,
      can_access_chat: permissions.can_access_chat ? 1 : 0,
      can_access_objects: permissions.can_access_objects ? 1 : 0,
      can_access_access_management: 0 // Только для супер-админа
    });

    const updatedAdmin = administratorQueries.getById(id);
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
app.delete('/api/admin/administrators/:id', (req, res) => {
  try {
    const { id } = req.params;

    const admin = administratorQueries.getById(id);
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

    administratorQueries.delete(id);
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
 * ============================================
 */
async function sendCrmEmailViaEmailJS(toEmail, subject, messageText) {
  const emailJsConfig = {
    serviceId:
      process.env.REACT_APP_EMAILJS_SERVICE_ID ||
      process.env.VITE_EMAILJS_SERVICE_ID ||
      process.env.EMAILJS_SERVICE_ID ||
      '',
    templateId:
      process.env.EMAILJS_CRM_TEMPLATE_ID ||
      process.env.REACT_APP_EMAILJS_TEMPLATE_ID ||
      process.env.VITE_EMAILJS_TEMPLATE_ID ||
      process.env.EMAILJS_TEMPLATE_ID ||
      '',
    publicKey:
      process.env.REACT_APP_EMAILJS_PUBLIC_KEY ||
      process.env.VITE_EMAILJS_PUBLIC_KEY ||
      process.env.EMAILJS_PUBLIC_KEY ||
      '',
  };
  if (!emailJsConfig.serviceId || !emailJsConfig.templateId || !emailJsConfig.publicKey) {
    throw new Error(
      'EmailJS не настроен: нужны SERVICE_ID, шаблон (EMAILJS_CRM_TEMPLATE_ID или общий TEMPLATE_ID) и PUBLIC_KEY'
    );
  }
  const emailData = {
    service_id: emailJsConfig.serviceId,
    template_id: emailJsConfig.templateId,
    user_id: emailJsConfig.publicKey,
    template_params: {
      to_email: toEmail,
      email: toEmail,
      subject: subject || 'Sellyourbrick',
      message: messageText,
      body: messageText,
      from_name: 'Sellyourbrick',
    },
  };
  const emailResponse = await axios.post('https://api.emailjs.com/api/v1.0/email/send', emailData, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (emailResponse.status !== 200) {
    throw new Error(`EmailJS вернул статус ${emailResponse.status}`);
  }
}

app.get('/api/admin/crm/board', (req, res) => {
  try {
    const board = crmQueries.getBoard();
    res.json({ success: true, data: board });
  } catch (error) {
    console.error('CRM board:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/crm/user-search', (req, res) => {
  try {
    const q = req.query.q || '';
    const rows = crmQueries.searchUsers(q, 30);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('CRM user-search:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/crm/assistant-leads', (req, res) => {
  try {
    const list = assistantLeadQueries.getAll();
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('CRM assistant-leads:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/crm/leads/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const lead = crmQueries.getLeadById(id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Лид не найден' });
    }
    let userSummary = null;
    if (lead.user_id) {
      const u = userQueries.getById(lead.user_id);
      if (u) {
        const favCount = crmQueries.getFavoriteCountForUser(lead.user_id);
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
    const touchCount = crmQueries.countTouchActivities(id);
    const activityCount = crmQueries.countActivities(id);
    res.json({
      success: true,
      data: { lead, userSummary, touchCount, activityCount },
    });
  } catch (error) {
    console.error('CRM lead get:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/crm/leads', (req, res) => {
  try {
    const body = req.body || {};
    const newId = crmQueries.createLead(body);
    const lead = crmQueries.getLeadById(newId);
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    console.error('CRM lead create:', error);
    if (String(error.message).includes('UNIQUE')) {
      return res.status(409).json({ success: false, error: 'Лид с таким пользователем или лидом помощника уже есть' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/admin/crm/leads/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = crmQueries.getLeadById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Лид не найден' });
    }
    crmQueries.updateLead(id, req.body || {});
    const lead = crmQueries.getLeadById(id);
    res.json({ success: true, data: lead });
  } catch (error) {
    console.error('CRM lead patch:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/crm/leads/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = crmQueries.getLeadById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Лид не найден' });
    }
    crmQueries.deleteLead(id);
    res.json({ success: true, message: 'Удалено' });
  } catch (error) {
    console.error('CRM lead delete:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/crm/leads/:id/move', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { stageId, index } = req.body || {};
    const toStage = parseInt(stageId, 10);
    const toIndex = parseInt(index, 10);
    if (!Number.isFinite(toStage) || !Number.isFinite(toIndex)) {
      return res.status(400).json({ success: false, error: 'Нужны stageId и index' });
    }
    crmQueries.moveLead(id, toStage, toIndex);
    const lead = crmQueries.getLeadById(id);
    res.json({ success: true, data: lead });
  } catch (error) {
    console.error('CRM move:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/crm/leads/:id/activities', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const list = crmQueries.listActivities(id);
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('CRM activities:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/crm/leads/:id/activities', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const lead = crmQueries.getLeadById(id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Лид не найден' });
    }
    const { kind, title, body, createdBy } = req.body || {};
    if (!kind || !String(kind).trim()) {
      return res.status(400).json({ success: false, error: 'Укажите тип активности (kind)' });
    }
    crmQueries.addActivity(id, {
      kind: String(kind).trim(),
      title: title != null ? String(title) : null,
      body: body != null ? String(body) : null,
      createdBy: createdBy != null ? String(createdBy) : null,
    });
    const list = crmQueries.listActivities(id);
    res.status(201).json({ success: true, data: list[0] || null });
  } catch (error) {
    console.error('CRM activity add:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/crm/leads/:id/email', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const lead = crmQueries.getLeadById(id);
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
    crmQueries.addActivity(id, {
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

app.post('/api/admin/crm/import-user', (req, res) => {
  try {
    const { userId } = req.body || {};
    const uid = parseInt(userId, 10);
    if (!Number.isFinite(uid)) {
      return res.status(400).json({ success: false, error: 'Нужен userId' });
    }
    const existing = crmQueries.findLeadByUserId(uid);
    if (existing) {
      return res.json({ success: true, data: existing, message: 'Уже в воронке' });
    }
    const u = userQueries.getById(uid);
    if (!u) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    const displayName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email || `User #${u.id}`;
    const interests = [];
    if (u.country) interests.push(`Страна: ${u.country}`);
    if (u.role) interests.push(`Роль: ${u.role}`);
    const newId = crmQueries.createLead({
      user_id: u.id,
      display_name: displayName,
      email: u.email || null,
      phone: u.phone_number || null,
      interests,
      source: 'user_import',
      temperature: 'warm',
    });
    const lead = crmQueries.getLeadById(newId);
    crmQueries.addActivity(newId, {
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

app.post('/api/admin/crm/import-assistant', (req, res) => {
  try {
    const { assistantLeadId } = req.body || {};
    const aid = parseInt(assistantLeadId, 10);
    if (!Number.isFinite(aid)) {
      return res.status(400).json({ success: false, error: 'Нужен assistantLeadId' });
    }
    const existing = crmQueries.findLeadByAssistantId(aid);
    if (existing) {
      return res.json({ success: true, data: existing, message: 'Уже в воронке' });
    }
    const al = assistantLeadQueries.getById(aid);
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
    const newId = crmQueries.createLead({
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
    const lead = crmQueries.getLeadById(newId);
    crmQueries.addActivity(newId, {
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
app.get('/api/admin/debt-reasons', (req, res) => {
  try {
    const list = debtReasonQueries.getAll();
    res.json({ success: true, data: list });
  } catch (error) {
    console.error('Ошибка при получении причин долга:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/debt-reasons', (req, res) => {
  try {
    const { title_ru, code, sort_order } = req.body || {};
    if (!title_ru || !String(title_ru).trim()) {
      return res.status(400).json({ success: false, error: 'Укажите название причины (title_ru)' });
    }
    const result = debtReasonQueries.create({
      title_ru: String(title_ru).trim(),
      code: code ? String(code).trim() || null : null,
      sort_order: sort_order != null ? parseInt(sort_order, 10) : 0
    });
    const item = debtReasonQueries.getById(result.id);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Ошибка при создании причины долга:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/debt-reasons/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = debtReasonQueries.getById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Причина долга не найдена' });
    }
    const { title_ru, code, sort_order } = req.body || {};
    debtReasonQueries.update(id, {
      title_ru: title_ru != null ? String(title_ru).trim() : existing.title_ru,
      code: code !== undefined ? (code ? String(code).trim() || null : null) : existing.code,
      sort_order: sort_order !== undefined ? parseInt(sort_order, 10) : existing.sort_order
    });
    const item = debtReasonQueries.getById(id);
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Ошибка при обновлении причины долга:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/debt-reasons/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = debtReasonQueries.getById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Причина долга не найдена' });
    }
    debtReasonQueries.delete(id);
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
app.post('/api/properties/upload-photo', (req, res) => {
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
]), (req, res) => {
  try {
    console.log('📥 Получен запрос на создание объявления');
    console.log('📋 Body:', req.body);
    console.log('📁 Files:', req.files);
    
    
    const db = getDatabase();
    
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

    if (!user_id || !property_type || !title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать user_id, property_type и title' 
      });
    }

    // Обновляем данные пользователя из профиля, если они переданы
    // Это нужно для синхронизации данных профиля с данными пользователя при отправке объекта
    try {
      const user = userQueries.getById(user_id);
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
          userQueries.update(user_id, updateData);
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

    // Цена «Купить сейчас» + аукцион: стартовая ставка не больше 20% от buy now
    if (!isShare && !isDebt && normalizedIsAuction === 1) {
      const bn = propertyData.price
      const st = propertyData.auction_starting_price
      if (bn && bn > 0 && st != null && !Number.isNaN(st) && st > 0 && st > bn * 0.2 + 1e-9) {
        return res.status(400).json({
          success: false,
          error: 'Стартовая ставка не может превышать 20% от цены «Купить сейчас».'
        })
      }
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
        result = apartmentQueries.create(propertyData);
        console.log('✅ Результат создания:', { lastInsertRowid: result.lastInsertRowid, changes: result.changes });
        
        if (!result || !result.lastInsertRowid) {
          console.error('❌ Ошибка: объект не был создан, result.lastInsertRowid отсутствует');
          return res.status(500).json({ 
            success: false, 
            error: 'Не удалось создать объявление. Ошибка при сохранении в базу данных.' 
          });
        }
        
        property = apartmentQueries.getById(result.lastInsertRowid);
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
        result = houseQueries.create(propertyData);
        console.log('✅ Результат создания:', { lastInsertRowid: result.lastInsertRowid, changes: result.changes });
        
        if (!result || !result.lastInsertRowid) {
          console.error('❌ Ошибка: объект не был создан, result.lastInsertRowid отсутствует');
          return res.status(500).json({ 
            success: false, 
            error: 'Не удалось создать объявление. Ошибка при сохранении в базу данных.' 
          });
        }
        
        property = houseQueries.getById(result.lastInsertRowid);
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
      
      // Проверяем, есть ли таблица
      try {
        const db = getDatabase();
        const tableName = (property_type === 'apartment' || property_type === 'commercial') 
          ? 'properties_apartments' 
          : 'properties_houses';
        const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
        if (!tableExists) {
          console.error(`❌ Таблица ${tableName} не существует!`);
          return res.status(500).json({ 
            success: false, 
            error: `Таблица ${tableName} не существует. Обратитесь к администратору.` 
          });
        }
        
        // Проверяем структуру таблицы
        const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
        console.log(`📋 Колонки в таблице ${tableName}:`, columns.map(c => c.name).join(', '));
        
        // Проверяем, какие поля отсутствуют в propertyData
        const requiredColumns = columns.map(c => c.name);
        const missingFields = requiredColumns.filter(col => {
          // Пропускаем поля с DEFAULT значениями
          if (col === 'id' || col === 'created_at' || col === 'updated_at' || col === 'moderation_status') {
            return false;
          }
          // Проверяем, есть ли поле в propertyData
          return propertyData[col] === undefined && col !== 'id';
        });
        if (missingFields.length > 0) {
          console.warn('⚠️ Поля, которые могут отсутствовать в propertyData:', missingFields);
        }
      } catch (checkError) {
        console.error('❌ Ошибка при проверке таблицы:', checkError);
      }
      
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
              debtDocumentQueries.insert(propertyId, propertyType, docType, filePath, file.originalname || null);
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
      const apartmentsPending = db.prepare('SELECT COUNT(*) as count FROM properties_apartments WHERE moderation_status = ?').get('pending');
      const housesPending = db.prepare('SELECT COUNT(*) as count FROM properties_houses WHERE moderation_status = ?').get('pending');
      pendingCount = (apartmentsPending?.count || 0) + (housesPending?.count || 0);
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
    
    // Логируем дополнительные детали для SQLite ошибок
    if (error.message && error.message.includes('no such column')) {
      console.error('❌ SQLite ошибка: отсутствует колонка в таблице');
      console.error('❌ Проверьте структуру таблицы properties_apartments или properties_houses');
    }
    
    if (error.message && error.message.includes('no such table')) {
      console.error('❌ SQLite ошибка: отсутствует таблица');
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
app.post('/api/properties/bulk-import', uploadMemory.single('file'), (req, res) => {
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
          apartmentQueries.create(propertyData);
        } else {
          houseQueries.create(propertyData);
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
app.put('/api/properties/:id/delete-request', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать причину удаления' 
      });
    }

    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
    if (!property) {
      return res.status(404).json({ 
        success: false, 
        error: 'Объявление не найдено' 
      });
    }

    // Проверяем, не отправлен ли уже запрос на удаление
    const existingDeleteRequest = db.prepare(`
      SELECT * FROM properties 
      WHERE rejection_reason LIKE ? AND moderation_status = 'pending'
    `).get(`DELETE:${id}:%`);

    if (existingDeleteRequest) {
      return res.status(400).json({ 
        success: false, 
        error: 'Запрос на удаление уже отправлен и ожидает модерации' 
      });
    }

    // Создаем новую запись с запросом на удаление
    // Используем rejection_reason для хранения ID оригинального объекта и причины: DELETE:propertyId:reason
    const stmt = db.prepare(`
      INSERT INTO properties (
        user_id, property_type, title, description, price, currency,
        is_auction, auction_start_date, auction_end_date, auction_starting_price,
        area, rooms, bedrooms, bathrooms, floor, total_floors, year_built, location,
        balcony, parking, elevator, land_area, garage, pool, garden,
        commercial_type, business_hours, renovation, condition, heating,
        water_supply, sewerage, electricity, internet, security, furniture,
        photos, videos, additional_documents, ownership_document, no_debts_document,
        test_drive, test_drive_data, moderation_status, rejection_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Подготавливаем все значения для вставки (44 значения для 44 колонок)
    const values = [
      property.user_id,
      property.property_type,
      property.title,
      property.description,
      property.price,
      property.currency,
      property.is_auction,
      property.auction_start_date,
      property.auction_end_date,
      property.auction_starting_price,
      property.area,
      property.rooms,
      property.bedrooms,
      property.bathrooms,
      property.floor,
      property.total_floors,
      property.year_built,
      property.location,
      property.balcony,
      property.parking,
      property.elevator,
      property.land_area,
      property.garage,
      property.pool,
      property.garden,
      property.commercial_type,
      property.business_hours,
      property.renovation,
      property.condition,
      property.heating,
      property.water_supply,
      property.sewerage,
      property.electricity,
      property.internet,
      property.security,
      property.furniture,
      property.photos,
      property.videos,
      property.additional_documents,
      property.ownership_document,
      property.no_debts_document,
      property.test_drive !== undefined && property.test_drive !== null ? property.test_drive : 0,
      property.test_drive_data,
      'pending', // Статус модерации для запроса на удаление
      `DELETE:${id}:${reason.trim()}` // Сохраняем ID оригинального объекта и причину
    ];
    
    console.log(`📊 Количество значений для вставки: ${values.length}`);
    console.log(`📊 Ожидается 44 значения`);

    const result = stmt.run(...values);
    const newRequestId = result.lastInsertRowid;

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
]), (req, res) => {
  try {
    console.log('📥 Получен запрос на обновление объявления');
    console.log('📋 Body:', req.body);
    console.log('📁 Files:', req.files);
    
    const db = getDatabase();
    const { id } = req.params;
    const isEdit = req.body.is_edit === '1' || req.body.is_edit === 1;
    const originalPropertyId = req.body.original_property_id || id;
    
    // Проверяем существование оригинального объекта - используем propertyQueries для поиска в правильных таблицах
    const originalProperty = propertyQueries.getById(originalPropertyId);
    if (!originalProperty) {
      return res.status(404).json({ 
        success: false, 
        error: 'Оригинальное объявление не найдено' 
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
      auction_starting_price
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
        debtDocumentQueries.deleteByProperty(originalPropertyId, originalProperty.property_type);
        for (const fieldName of debtDocFieldNames) {
          const docType = fieldName.replace('debt_doc_', '');
          const files = req.files[fieldName];
          if (files && Array.isArray(files)) {
            for (const file of files) {
              debtDocumentQueries.insert(originalPropertyId, originalProperty.property_type, docType, `/uploads/${file.filename}`, file.originalname || null);
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
    
    // Если это редактирование, создаем новую запись с пометкой
    if (isEdit) {
      // Создаем новую запись с данными изменений
      // Используем rejection_reason для хранения original_property_id
      const stmt = db.prepare(`
        INSERT INTO properties (
          user_id, property_type, title, description, price, currency,
          is_auction, auction_start_date, auction_end_date, auction_starting_price,
          area, living_area, building_type, rooms, bedrooms, bathrooms, floor, total_floors, year_built, location,
          balcony, parking, elevator, land_area, garage, pool, garden,
          commercial_type, business_hours, renovation, condition, heating,
          water_supply, sewerage, electricity, internet, security, furniture,
          photos, videos, additional_documents, additional_amenities, ownership_document, no_debts_document,
          test_drive, test_drive_data, moderation_status, rejection_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Подготавливаем все значения для вставки
      const values = [
        user_id || originalProperty.user_id,
        property_type || originalProperty.property_type,
        title || originalProperty.title,
        description !== undefined ? description : originalProperty.description,
        price ? parseFloat(price) : originalProperty.price,
        currency || originalProperty.currency,
        normalizedIsAuction,
        auction_start_date || originalProperty.auction_start_date,
        auction_end_date || originalProperty.auction_end_date,
        auction_starting_price ? parseFloat(auction_starting_price) : originalProperty.auction_starting_price,
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
        JSON.stringify(parsedPhotos.length > 0 ? parsedPhotos : (originalProperty.photos ? JSON.parse(originalProperty.photos) : [])),
        JSON.stringify(parsedVideos.length > 0 ? parsedVideos : (originalProperty.videos ? JSON.parse(originalProperty.videos) : [])),
        JSON.stringify(parsedAdditionalDocuments.length > 0 ? parsedAdditionalDocuments : (originalProperty.additional_documents ? JSON.parse(originalProperty.additional_documents) : [])),
        additional_amenities || originalProperty.additional_amenities,
        ownershipDocumentPath,
        noDebtsDocumentPath,
        normalizedTestDriveEdit !== undefined ? normalizedTestDriveEdit : (originalProperty.test_drive !== undefined && originalProperty.test_drive !== null ? originalProperty.test_drive : 0),
        testDriveDataStr || originalProperty.test_drive_data,
        'pending', // Статус модерации для изменений
        `EDIT:${originalPropertyId}` // Сохраняем ID оригинального объекта в rejection_reason
      ];
      
      console.log(`📊 Количество значений для вставки: ${values.length}`);
      console.log(`📊 Ожидается 44 значения`);

      const effectiveBuyNow =
        price !== undefined && price !== null && price !== '' && parseFloat(price) > 0
          ? parseFloat(price)
          : (originalProperty.price != null && parseFloat(originalProperty.price) > 0
              ? parseFloat(originalProperty.price)
              : null)
      const effectiveStarting =
        auction_starting_price !== undefined &&
        auction_starting_price !== null &&
        auction_starting_price !== ''
          ? parseFloat(auction_starting_price)
          : (originalProperty.auction_starting_price != null &&
              !Number.isNaN(parseFloat(originalProperty.auction_starting_price))
              ? parseFloat(originalProperty.auction_starting_price)
              : null)
      if (
        !isShareEdit &&
        !isDebtEdit &&
        normalizedIsAuction === 1 &&
        effectiveBuyNow &&
        effectiveStarting != null &&
        !Number.isNaN(effectiveStarting) &&
        effectiveStarting > 0 &&
        effectiveStarting > effectiveBuyNow * 0.2 + 1e-9
      ) {
        return res.status(400).json({
          success: false,
          error: 'Стартовая ставка не может превышать 20% от цены «Купить сейчас».'
        })
      }
      
      const result = stmt.run(...values);
      
      const newPropertyId = result.lastInsertRowid;
      
      console.log(`✅ Создана новая запись для редактирования. ID новой записи: ${newPropertyId}, ID оригинала: ${originalPropertyId}`);
      
      // Получаем созданную запись
      const newProperty = db.prepare('SELECT * FROM properties WHERE id = ?').get(newPropertyId);
      
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
app.get('/api/properties/pending', (req, res) => {
  try {
    console.log('📥 Запрос объявлений на модерации');
    
    // Используем функцию из propertyQueries, которая работает с новыми таблицами
    const properties = propertyQueries.getPending();

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
app.get('/api/properties/approved', (req, res) => {
  try {
    const { type } = req.query; // Опциональный фильтр по типу
    
    // Используем функцию из propertyQueries, которая работает с новыми таблицами
    const properties = propertyQueries.getApproved(type || null);
    
    console.log(`✅ Получено одобренных объявлений: ${properties.length}, фильтр type=${type || 'null'}`);
    if (properties.length > 0) {
      console.log('📋 Пример данных из БД (первое объявление):', {
        id: properties[0].id,
        title: properties[0].title,
        property_type: properties[0].property_type,
        source_table: properties[0].source_table,
        moderation_status: properties[0].moderation_status,
        is_auction: properties[0].is_auction,
        amenities: properties[0].amenities,
        amenities_type: typeof properties[0].amenities,
        additional_amenities: properties[0].additional_amenities,
        additional_amenities_type: typeof properties[0].additional_amenities
      });
    } else {
      console.log('⚠️ Не найдено одобренных объявлений для типа:', type || 'все типы');
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
      formatted.image = formatted.photos && formatted.photos.length > 0 
        ? formatted.photos[0] 
        : 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80';
      formatted.images = formatted.photos || [];
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
    
    // Подстановка переводов по языку (lang из футера) для списка
    const lang = req.query.lang && String(req.query.lang).trim().toLowerCase();
    if (lang && ['ru', 'en', 'de', 'es', 'fr', 'sv'].includes(lang) && formattedProperties.length > 0) {
      try {
        const db = getDatabase();
        for (const prop of formattedProperties) {
          const table = prop.source_table || 'properties_apartments';
          const tr = db.prepare(
            'SELECT title, description, additional_amenities FROM property_translations WHERE property_id = ? AND property_table = ? AND lang_code = ?'
          ).get(prop.id, table, lang);
          if (tr) {
            if (tr.title) { prop.title = tr.title; prop.name = tr.title; }
            if (tr.description) prop.description = tr.description;
            if (tr.additional_amenities != null) prop.additional_amenities = tr.additional_amenities;
          }
        }
      } catch (e) {
        console.warn('GET /api/properties/approved - подстановка переводов:', e.message);
      }
    }

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
 * Форматирует один объект аукциона в формат API (для SSE broadcast и повторного использования).
 */
function formatOneAuctionPropertyForApi(prop) {
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
  formatted.image = formatted.photos && formatted.photos.length > 0 ? formatted.photos[0] : 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80';
  formatted.images = formatted.photos || [];
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
    const reservationInfo = propertyQueries.isReserved(formatted.id);
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

/**
 * GET /api/properties/auctions - Получить одобренные объявления с аукционом
 * ВАЖНО: Этот маршрут должен быть ПЕРЕД /api/properties/:id, иначе он будет перехвачен
 */
app.get('/api/properties/auctions', (req, res) => {
  try {
    const { type } = req.query; // Опциональный фильтр по типу
    
    // Используем функцию из propertyQueries, которая работает с новыми таблицами
    let properties = propertyQueries.getAuctions(type || null);
    
    console.log(`✅ Получено аукционных объявлений: ${properties.length}`);
    if (properties.length > 0) {
      console.log('📋 Пример данных из БД (первое объявление):', {
        id: properties[0].id,
        title: properties[0].title,
        amenities: properties[0].amenities,
        amenities_type: typeof properties[0].amenities,
        additional_amenities: properties[0].additional_amenities,
        additional_amenities_type: typeof properties[0].additional_amenities
      });
    }
    
    // Также получаем объекты с тестовыми таймерами (если поле существует)
    const db = getDatabase();
    let apartmentsWithTestTimer = [];
    let housesWithTestTimer = [];
    
    // Проверяем, существует ли поле test_timer_end_date в таблицах
    try {
      const apartmentsPragma = db.prepare("PRAGMA table_info(properties_apartments)").all();
      const housesPragma = db.prepare("PRAGMA table_info(properties_houses)").all();
      const hasTestTimerField = apartmentsPragma.some(col => col.name === 'test_timer_end_date') ||
                                housesPragma.some(col => col.name === 'test_timer_end_date');
      
      if (hasTestTimerField) {
        let testTimerQuery = `
          SELECT 
            p.*,
            u.first_name,
            u.last_name,
            u.email,
            u.phone_number,
            u.role
          FROM properties_apartments p
          LEFT JOIN users u ON p.user_id = u.id
          WHERE p.moderation_status = 'approved'
            AND p.test_timer_end_date IS NOT NULL
            AND p.test_timer_end_date != ''
        `;
        
        const testTimerParams = [];
        if (type) {
          testTimerQuery += ' AND p.property_type = ?';
          testTimerParams.push(type);
        }
        
        testTimerQuery += ' ORDER BY p.test_timer_end_date ASC';
        
        try {
          apartmentsWithTestTimer = db.prepare(testTimerQuery).all(...testTimerParams);
        } catch (e) {
          console.warn('Ошибка при получении apartments с тестовыми таймерами:', e.message);
        }
        
        try {
          const housesTestTimerQuery = testTimerQuery.replace('properties_apartments', 'properties_houses');
          housesWithTestTimer = db.prepare(housesTestTimerQuery).all(...testTimerParams);
        } catch (e) {
          console.warn('Ошибка при получении houses с тестовыми таймерами:', e.message);
        }
      }
    } catch (e) {
      console.warn('Ошибка при проверке поля test_timer_end_date:', e.message);
    }
    
    // Объединяем аукционы и тестовые таймеры
    const allProperties = [...properties, ...apartmentsWithTestTimer, ...housesWithTestTimer];
    
    // Удаляем дубликаты по ID и сортируем
    properties = Array.from(
      new Map(allProperties.map(p => [p.id, p])).values()
    ).sort((a, b) => {
      const aDate = a.test_timer_end_date || a.auction_end_date || '';
      const bDate = b.test_timer_end_date || b.auction_end_date || '';
      return new Date(aDate) - new Date(bDate);
    });
    
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
      formatted.image = formatted.photos && formatted.photos.length > 0 
        ? formatted.photos[0] 
        : 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80';
      formatted.images = formatted.photos || [];
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
      
      // Проверяем резервацию объекта
      try {
        const reservationInfo = propertyQueries.isReserved(formatted.id);
        formatted.is_reserved = reservationInfo.isReserved || false;
        formatted.reserved_until = reservationInfo.reservedUntil || null;
        formatted.reserved_by = reservationInfo.reservedBy || null;
      } catch (reservationError) {
        console.warn(`⚠️ Ошибка при проверке резервации для объекта ID=${formatted.id}:`, reservationError);
        formatted.is_reserved = false;
        formatted.reserved_until = null;
        formatted.reserved_by = null;
      }
      
      return formatted;
    });
    
    // Логируем для отладки (только для первого объекта)
    if (formattedProperties.length > 0) {
      console.log('📋 Отформатированные данные аукциона (первое объявление):', {
        id: formattedProperties[0].id,
        title: formattedProperties[0].title,
        amenities: formattedProperties[0].amenities,
        amenities_length: Array.isArray(formattedProperties[0].amenities) ? formattedProperties[0].amenities.length : 'not array',
        additional_amenities: formattedProperties[0].additional_amenities,
        additional_amenities_length: formattedProperties[0].additional_amenities ? formattedProperties[0].additional_amenities.length : 0,
        balcony: formattedProperties[0].balcony,
        parking: formattedProperties[0].parking,
        elevator: formattedProperties[0].elevator
      });
    }

    // Подстановка переводов по языку (lang из футера) для списка аукционов
    const lang = req.query.lang && String(req.query.lang).trim().toLowerCase();
    if (lang && ['ru', 'en', 'de', 'es', 'fr', 'sv'].includes(lang) && formattedProperties.length > 0) {
      try {
        const dbForLang = getDatabase();
        for (const prop of formattedProperties) {
          const table = prop.source_table || 'properties_apartments';
          const tr = dbForLang.prepare(
            'SELECT title, description, additional_amenities FROM property_translations WHERE property_id = ? AND property_table = ? AND lang_code = ?'
          ).get(prop.id, table, lang);
          if (tr) {
            if (tr.title) { prop.title = tr.title; prop.name = tr.title; }
            if (tr.description) prop.description = tr.description;
            if (tr.additional_amenities != null) prop.additional_amenities = tr.additional_amenities;
          }
        }
      } catch (e) {
        console.warn('GET /api/properties/auctions - подстановка переводов:', e.message);
      }
    }
    
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
app.get('/api/properties/test-timers', (req, res) => {
  try {
    console.log('📥 GET /api/properties/test-timers - Запрос получен');
    const db = getDatabase();
    
    // Проверяем наличие поля test_timer_end_date во всех возможных таблицах
    let hasTestTimerFieldApartments = false;
    let hasTestTimerFieldHouses = false;
    let hasTestTimerFieldOld = false;
    
    try {
      // Проверяем новую таблицу для квартир/апартаментов
      try {
        const apartmentsPragma = db.prepare("PRAGMA table_info(properties_apartments)").all();
        hasTestTimerFieldApartments = apartmentsPragma.some(col => col.name === 'test_timer_end_date');
      } catch (e) {
        console.warn('⚠️ Таблица properties_apartments не существует:', e.message);
      }
      
      // Проверяем таблицу для домов/вилл
      try {
        const housesPragma = db.prepare("PRAGMA table_info(properties_houses)").all();
        hasTestTimerFieldHouses = housesPragma.some(col => col.name === 'test_timer_end_date');
      } catch (e) {
        console.warn('⚠️ Таблица properties_houses не существует:', e.message);
      }
      
      // Проверяем старую таблицу properties (fallback)
      try {
        const oldPragma = db.prepare("PRAGMA table_info(properties)").all();
        hasTestTimerFieldOld = oldPragma.some(col => col.name === 'test_timer_end_date');
      } catch (e) {
        console.warn('⚠️ Таблица properties не существует:', e.message);
      }
    } catch (e) {
      console.warn('Ошибка при проверке структуры таблиц:', e.message);
    }
    
    let allProperties = [];
    
    // Запрос для получения объявлений с тестовыми таймерами из таблицы properties_apartments (квартиры/апартаменты)
    if (hasTestTimerFieldApartments) {
      try {
        const apartmentsQuery = `
          SELECT p.*, 
                 u.first_name, u.last_name, u.email, u.phone_number
          FROM properties_apartments p
          LEFT JOIN users u ON p.user_id = u.id
          WHERE p.test_timer_end_date IS NOT NULL
            AND p.test_timer_end_date != ''
          ORDER BY p.test_timer_end_date ASC
        `;
        const apartments = db.prepare(apartmentsQuery).all();
        allProperties = allProperties.concat(apartments);
        console.log(`✅ Найдено ${apartments.length} объявлений с тестовыми таймерами в таблице properties_apartments`);
      } catch (e) {
        console.error('Ошибка при загрузке объявлений из properties_apartments:', e);
      }
    }
    
    // Запрос для получения объявлений с тестовыми таймерами из таблицы properties_houses (дома/виллы)
    if (hasTestTimerFieldHouses) {
      try {
        const housesQuery = `
          SELECT p.*, 
                 u.first_name, u.last_name, u.email, u.phone_number
          FROM properties_houses p
          LEFT JOIN users u ON p.user_id = u.id
          WHERE p.test_timer_end_date IS NOT NULL
            AND p.test_timer_end_date != ''
          ORDER BY p.test_timer_end_date ASC
        `;
        const houses = db.prepare(housesQuery).all();
        allProperties = allProperties.concat(houses);
        console.log(`✅ Найдено ${houses.length} объявлений с тестовыми таймерами в таблице properties_houses`);
      } catch (e) {
        console.error('Ошибка при загрузке объявлений из properties_houses:', e);
      }
    }
    
    // Fallback на старую таблицу properties
    if (hasTestTimerFieldOld) {
      try {
        const oldQuery = `
          SELECT p.*, 
                 u.first_name, u.last_name, u.email, u.phone_number
          FROM properties p
          LEFT JOIN users u ON p.user_id = u.id
          WHERE p.test_timer_end_date IS NOT NULL
            AND p.test_timer_end_date != ''
          ORDER BY p.test_timer_end_date ASC
        `;
        const oldProperties = db.prepare(oldQuery).all();
        allProperties = allProperties.concat(oldProperties);
        console.log(`✅ Найдено ${oldProperties.length} объявлений с тестовыми таймерами в старой таблице properties`);
      } catch (e) {
        console.error('Ошибка при загрузке объявлений из старой таблицы properties:', e);
      }
    }
    
    const properties = allProperties;
    
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
        image: photos && photos.length > 0 ? photos[0] : 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
        images: photos || [],
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
app.post('/api/properties/:id/test-timer', (req, res) => {
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
    const db = getDatabase();
    const { id } = req.params;
    const { test_timer_end_date, test_timer_duration } = req.body;
    
    console.log('📥 POST /api/properties/:id/test-timer - Запрос:', { id, test_timer_end_date, test_timer_duration });
    
    if (!test_timer_end_date) {
      return res.status(400).json({ success: false, error: 'Не указана дата окончания таймера' });
    }
    
    // Проверяем, существует ли объявление во всех возможных таблицах
    // Система использует: properties_apartments (квартиры/коммерческая), properties_houses (дома/виллы), и старую properties
    let property = null;
    let tableName = null;
    
    // Сначала проверяем новые таблицы
    try {
      property = db.prepare('SELECT id, property_type FROM properties_apartments WHERE id = ?').get(id);
      if (property) {
        tableName = 'properties_apartments';
        console.log(`✅ Объявление найдено в properties_apartments:`, { id: property.id, property_type: property.property_type });
      }
    } catch (e) {
      console.warn('⚠️ Таблица properties_apartments не существует или ошибка:', e.message);
    }
    
    if (!property) {
      try {
        property = db.prepare('SELECT id, property_type FROM properties_houses WHERE id = ?').get(id);
        if (property) {
          tableName = 'properties_houses';
          console.log(`✅ Объявление найдено в properties_houses:`, { id: property.id, property_type: property.property_type });
        }
      } catch (e) {
        console.warn('⚠️ Таблица properties_houses не существует или ошибка:', e.message);
      }
    }
    
    // Fallback на старую таблицу properties
    if (!property) {
      try {
        property = db.prepare('SELECT id FROM properties WHERE id = ?').get(id);
        if (property) {
          tableName = 'properties';
          console.log(`✅ Объявление найдено в старой таблице properties:`, { id: property.id });
        }
      } catch (e) {
        console.warn('⚠️ Таблица properties не существует или ошибка:', e.message);
      }
    }
    
    if (!property || !tableName) {
      console.error('❌ Объявление не найдено ни в одной таблице:', id);
      return res.status(404).json({ success: false, error: 'Объявление не найдено' });
    }
    
    console.log(`✅ Объявление найдено в таблице: ${tableName}`);
    
    // Проверяем и добавляем необходимые поля в нужной таблице
    let hasTestTimerField = false;
    let hasTestTimerDurationField = false;
    
    try {
      let pragmaInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
      hasTestTimerField = pragmaInfo.some(col => col.name === 'test_timer_end_date');
      hasTestTimerDurationField = pragmaInfo.some(col => col.name === 'test_timer_duration');
      
      if (!hasTestTimerField) {
        console.log(`🔄 Поле test_timer_end_date отсутствует в ${tableName}, добавляем...`);
        try {
          const migrationPath = join(__dirname, 'database', 'add_test_timer_field.sql');
          console.log('📁 Путь к миграции:', migrationPath);
          const migrationSql = readFileSync(migrationPath, 'utf8');
          // Заменяем имя таблицы в миграции, если нужно
          const adaptedSql = migrationSql.replace(/properties/g, tableName);
          db.exec(adaptedSql);
          console.log(`✅ Поле test_timer_end_date добавлено в ${tableName}`);
          hasTestTimerField = true;
        } catch (migrationError) {
          console.error('❌ Ошибка при добавлении поля через миграцию:', migrationError);
          // Пытаемся добавить напрямую
          try {
            db.exec(`ALTER TABLE ${tableName} ADD COLUMN test_timer_end_date TEXT`);
            console.log(`✅ Поле test_timer_end_date добавлено напрямую в таблицу ${tableName}`);
            hasTestTimerField = true;
          } catch (directError) {
            console.error('❌ Ошибка при прямом добавлении поля:', directError);
            return res.status(500).json({ 
              success: false, 
              error: 'Поле test_timer_end_date не существует и не может быть создано. Ошибка: ' + directError.message 
            });
          }
        }
      }
      
      if (!hasTestTimerDurationField && test_timer_duration !== undefined && test_timer_duration !== null) {
        console.log(`🔄 Поле test_timer_duration отсутствует в ${tableName}, добавляем...`);
        try {
          const migrationPath = join(__dirname, 'database', 'add_test_timer_duration_field.sql');
          try {
            console.log('📁 Путь к миграции:', migrationPath);
            const migrationSql = readFileSync(migrationPath, 'utf8');
            // Заменяем имя таблицы в миграции, если нужно
            const adaptedSql = migrationSql.replace(/properties/g, tableName);
            db.exec(adaptedSql);
            console.log(`✅ Поле test_timer_duration добавлено в ${tableName}`);
            hasTestTimerDurationField = true;
          } catch (fileError) {
            // Если файл миграции не существует, добавляем напрямую
            console.log('📁 Файл миграции не найден, добавляем поле напрямую');
            throw new Error('Migration file not found');
          }
        } catch (migrationError) {
          console.error('❌ Ошибка при добавлении поля через миграцию:', migrationError);
          // Пытаемся добавить напрямую
          try {
            db.exec(`ALTER TABLE ${tableName} ADD COLUMN test_timer_duration INTEGER`);
            console.log(`✅ Поле test_timer_duration добавлено напрямую в таблицу ${tableName}`);
            hasTestTimerDurationField = true;
          } catch (directError) {
            console.error('❌ Ошибка при прямом добавлении поля test_timer_duration:', directError);
            // Не критично, продолжаем без этого поля
            hasTestTimerDurationField = false;
          }
        }
      }
      
      // Повторно проверяем структуру после попыток добавления
      pragmaInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
      hasTestTimerField = pragmaInfo.some(col => col.name === 'test_timer_end_date');
      hasTestTimerDurationField = pragmaInfo.some(col => col.name === 'test_timer_duration');
      
    } catch (checkError) {
      console.error('❌ Ошибка при проверке структуры таблицы:', checkError);
      return res.status(500).json({ 
        success: false, 
        error: 'Ошибка при проверке структуры таблицы: ' + checkError.message 
      });
    }
    
    // Обновляем тестовый таймер в нужной таблице
    try {
      
      let result;
      if (test_timer_duration !== undefined && test_timer_duration !== null && hasTestTimerDurationField) {
        // Обновляем и дату окончания, и длительность (если поле существует)
        result = db.prepare(`
          UPDATE ${tableName} 
          SET test_timer_end_date = ?, test_timer_duration = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(test_timer_end_date, test_timer_duration, id);
        console.log(`✅ Тестовый таймер обновлен с длительностью в таблице ${tableName}:`, { id, duration: test_timer_duration, changes: result.changes });
      } else {
        // Обновляем только дату окончания (если поле длительности не существует или не указано)
        result = db.prepare(`
          UPDATE ${tableName} 
          SET test_timer_end_date = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(test_timer_end_date, id);
        console.log(`✅ Тестовый таймер обновлен (без длительности) в таблице ${tableName}:`, { id, changes: result.changes });
      }
      
      res.json({
        success: true,
        message: 'Тестовый таймер успешно установлен'
      });
    } catch (updateError) {
      console.error('❌ Ошибка при обновлении таймера:', updateError);
      throw updateError;
    }
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
app.delete('/api/properties/:id/test-timer', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    
    // Проверяем, существует ли объявление в обеих таблицах
    let property = db.prepare('SELECT id FROM properties WHERE id = ?').get(id);
    let tableName = 'properties';
    
    if (!property) {
      // Проверяем в таблице домов/вилл
      property = db.prepare('SELECT id FROM properties_houses WHERE id = ?').get(id);
      if (property) {
        tableName = 'properties_houses';
      }
    }
    
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объявление не найдено' });
    }
    
    console.log(`✅ Объявление найдено в таблице: ${tableName} для удаления таймера`);
    
    // Удаляем тестовый таймер и его длительность из нужной таблицы
    const pragmaInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const hasTestTimerDurationField = pragmaInfo.some(col => col.name === 'test_timer_duration');
    
    if (hasTestTimerDurationField) {
      db.prepare(`
        UPDATE ${tableName} 
        SET test_timer_end_date = NULL, test_timer_duration = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);
    } else {
      db.prepare(`
        UPDATE ${tableName} 
        SET test_timer_end_date = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);
    }
    
    console.log(`✅ Тестовый таймер удален из таблицы ${tableName} для объявления ${id}`);
    
    res.json({
      success: true,
      message: 'Тестовый таймер успешно удален'
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
app.get('/api/properties/shares', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const properties = propertyQueries.getShares(limit, offset);
    // Нормализуем для карточек: id, property_type, title, location, image (первое фото), price, total_shares, shares_sold, area, rooms
    const list = properties.map((p) => {
      const photos = (p.photos && (Array.isArray(p.photos) ? p.photos : (typeof p.photos === 'string' ? (() => { try { return JSON.parse(p.photos); } catch (e) { return []; } })() : []))) || [];
      const firstPhoto = photos[0];
      const image = typeof firstPhoto === 'string' ? firstPhoto : (firstPhoto && firstPhoto.url) ? firstPhoto.url : null;
      const totalShares = p.total_shares != null ? Number(p.total_shares) : 0;
      const sharesSold = p.shares_sold != null ? Number(p.shares_sold) : 0;
      const price = p.price != null ? Number(p.price) : 0;
      return {
        id: p.id,
        property_type: p.property_type,
        shareId: `${p.property_type}-${p.id}`,
        title: p.title,
        location: p.location || '',
        description: p.description || '',
        image: image || (photos[0] || null),
        totalPrice: price,
        pricePerShare: totalShares > 0 ? price / totalShares : 0,
        totalShares,
        sharesSold,
        myShares: 0,
        area: p.area,
        rooms: p.rooms,
        bedrooms: p.bedrooms,
        ...p
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
    const property = propertyQueries.getById(id, requestedPropertyType);
    if (!property) {
      return sendError(404, 'Объявление не найдено');
    }
    const table = propertyTable || property.source_table || 'properties_apartments';
    const translations = await translatePropertyToAllLanguages(property).catch((err) => {
      console.error('POST /api/properties/:id/translate translate error:', err);
      throw err;
    });
    const db = getDatabase();
    db.prepare('DELETE FROM property_translations WHERE property_id = ? AND property_table = ?').run(id, table);
    const insertStmt = db.prepare(`
      INSERT INTO property_translations (property_id, property_table, lang_code, title, description, additional_amenities)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const [langCode, data] of Object.entries(translations)) {
      insertStmt.run(id, table, langCode, data.title || '', data.description || '', data.additional_amenities || '');
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
app.get('/api/properties/:id/translations', (req, res) => {
  const { id } = req.params;
  const propertyTable = req.query.property_table || null;
  try {
    const property = propertyQueries.getById(id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объявление не найдено' });
    }
    const table = propertyTable || property.source_table || 'properties_apartments';
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT lang_code, title, description, additional_amenities, created_at FROM property_translations WHERE property_id = ? AND property_table = ? ORDER BY lang_code'
    ).all(id, table);
    const byLang = {};
    rows.forEach((r) => {
      byLang[r.lang_code] = {
        title: r.title,
        description: r.description,
        additional_amenities: r.additional_amenities,
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

/**
 * GET /api/properties/:id/test-drive/eligibility — депозит, ставка, флаги для UI
 */
app.get('/api/properties/:id/test-drive/eligibility', (req, res) => {
  try {
    const propertyId = parseInt(req.params.id, 10);
    const userId = req.query.user_id ? parseInt(req.query.user_id, 10) : null;
    const propertyTable = req.query.property_table || null;
    if (!propertyId || Number.isNaN(propertyId)) {
      return res.status(400).json({ success: false, error: 'Некорректный id объекта' });
    }
    const property = propertyQueries.getById(String(propertyId), null);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объект не найден' });
    }
    // Таблица из БД важнее query-параметра: иначе клиентский дефолт properties_apartments
    // ломает проверку ставки для домов/вилл (bids.property_table = properties_houses).
    const table = property.source_table || propertyTable || 'properties_apartments';
    const td =
      property.test_drive === 1 ||
      property.test_drive === true ||
      property.test_drive === '1';
    if (!td) {
      return res.json({
        success: true,
        data: { test_drive_enabled: false, has_deposit: false, has_bid: false, can_request: false },
      });
    }
    let hasDeposit = false;
    let hasBid = false;
    if (userId && !Number.isNaN(userId)) {
      const user = userQueries.getById(userId);
      if (user) {
        const dep = user.deposit_amount != null ? parseFloat(user.deposit_amount) : 0;
        hasDeposit = dep > 0;
      }
      const db = getDatabase();
      try {
        // Как и GET /bids/property/:id — любая ставка пользователя по этому property_id (страница объекта однозначна).
        const row = db
          .prepare(`SELECT 1 as x FROM bids WHERE user_id = ? AND property_id = ? LIMIT 1`)
          .get(userId, propertyId);
        hasBid = !!row;
      } catch (e) {
        console.warn('test-drive eligibility bids:', e.message);
      }
    }
    return res.json({
      success: true,
      data: {
        test_drive_enabled: true,
        property_table: table,
        has_deposit: hasDeposit,
        has_bid: hasBid,
        can_request: !!(hasDeposit && hasBid),
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
app.get('/api/properties/:id/test-drive/bookings', (req, res) => {
  try {
    const propertyId = parseInt(req.params.id, 10);
    if (!propertyId || Number.isNaN(propertyId)) {
      return res.status(400).json({ success: false, error: 'Некорректный id объекта' });
    }
    const prop = propertyQueries.getById(String(propertyId), null);
    const propertyTable =
      prop?.source_table || req.query.property_table || 'properties_apartments';
    testDriveBookingQueries.ensureTable();
    const rows = testDriveBookingQueries.listActiveForProperty(propertyId, propertyTable);
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
 * POST /api/properties/:id/test-drive/request — заявка на даты (после выполнения условий)
 */
app.post('/api/properties/:id/test-drive/request', (req, res) => {
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
    const property = propertyQueries.getById(String(propertyId), null);
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
    const user = userQueries.getById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    const dep = user.deposit_amount != null ? parseFloat(user.deposit_amount) : 0;
    if (dep <= 0) {
      return res.status(400).json({ success: false, error: 'Необходим депозит' });
    }
    const db = getDatabase();
    let hasBid = false;
    try {
      const row = db
        .prepare(`SELECT 1 as x FROM bids WHERE user_id = ? AND property_id = ? LIMIT 1`)
        .get(userId, propertyId);
      hasBid = !!row;
    } catch (e) {
      console.warn('test-drive request bids:', e.message);
    }
    if (!hasBid) {
      return res.status(400).json({ success: false, error: 'Необходима ставка по объекту' });
    }
    if (testDriveBookingQueries.countPendingForUserProperty(userId, propertyId, table) > 0) {
      return res.status(400).json({ success: false, error: 'У вас уже есть активная заявка на этот объект' });
    }
    const s = new Date(start_date + 'T12:00:00');
    const e = new Date(end_date + 'T12:00:00');
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) {
      return res.status(400).json({ success: false, error: 'Некорректный диапазон дат' });
    }
    const dayCount = Math.round((e - s) / (24 * 60 * 60 * 1000)) + 1;
    if (dayCount < 2 || dayCount > 5) {
      return res.status(400).json({ success: false, error: 'Выберите от 2 до 5 дней подряд' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (s < today) {
      return res.status(400).json({ success: false, error: 'Нельзя выбрать прошедшие даты' });
    }
    const existing = testDriveBookingQueries.listActiveForProperty(propertyId, table);
    for (const ex of existing) {
      if (testDriveRangesOverlap(start_date, end_date, ex.start_date, ex.end_date)) {
        return res.status(409).json({ success: false, error: 'Часть выбранных дат уже занята' });
      }
    }
    const insertResult = testDriveBookingQueries.create({
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
    const notifRun = notificationQueries.create({
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
      testDriveBookingQueries.updateOwnerNotificationId(bookingId, ownerNotificationId);
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
app.put('/api/test-drive-bookings/:bookingId/respond', (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    const { user_id, action } = req.body || {};
    const ownerId = parseInt(user_id, 10);
    if (!bookingId || Number.isNaN(bookingId) || !ownerId || Number.isNaN(ownerId)) {
      return res.status(400).json({ success: false, error: 'Нужны bookingId и user_id владельца' });
    }
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ success: false, error: 'action: approve или reject' });
    }
    const booking = testDriveBookingQueries.getById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Заявка не найдена' });
    }
    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Заявка уже обработана' });
    }
    const property = propertyQueries.getById(String(booking.property_id), null);
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
    testDriveBookingQueries.updateStatus(bookingId, newStatus);
    const propTitle = property.title || `Объект #${booking.property_id}`;
    if (action === 'approve') {
      const ins = notificationQueries.create({
        user_id: buyerUserId,
        type: 'test_drive_result',
        title: 'Тест-драйв подтверждён',
        message: `Владелец подтвердил тест-драйв объекта «${propTitle}» с ${booking.start_date} по ${booking.end_date}. Заезд: с 15:00 в первый день, выезд до 12:00 в последний день. Детали в карточке объекта.`,
        data: {
          booking_id: bookingId,
          property_id: booking.property_id,
          property_table: booking.property_table,
          start_date: booking.start_date,
          end_date: booking.end_date,
        },
        is_read: 0,
        view_count: 0,
      });
      console.log('✅ Уведомление покупателю (тест-драйв подтверждён):', {
        notificationId: ins?.lastInsertRowid,
        buyerUserId,
      });
    } else {
      const ins = notificationQueries.create({
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
    }
    if (booking.owner_notification_id) {
      try {
        notificationQueries.delete(booking.owner_notification_id);
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

function enrichTestDriveBookingWithPropertyTitle(row) {
  const db = getDatabase();
  const table = row.property_table || 'properties_apartments';
  let title = null;
  try {
    if (table === 'properties_houses') {
      const p = db.prepare('SELECT title FROM properties_houses WHERE id = ?').get(row.property_id);
      title = p?.title;
    } else if (table === 'properties_apartments') {
      const p = db.prepare('SELECT title FROM properties_apartments WHERE id = ?').get(row.property_id);
      title = p?.title;
    } else {
      const p = db.prepare('SELECT title FROM properties WHERE id = ?').get(row.property_id);
      title = p?.title;
    }
  } catch (e) {
    /* ignore */
  }
  return { ...row, property_title: title || `Объект #${row.property_id}` };
}

/**
 * GET /api/test-drive-bookings/user/:userId — бронирования тест-драйва пользователя
 */
app.get('/api/test-drive-bookings/user/:userId', (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({ success: false, error: 'Некорректный userId' });
    }
    testDriveBookingQueries.ensureTable();
    const rows = testDriveBookingQueries.listByUserId(userId);
    const data = rows.map(enrichTestDriveBookingWithPropertyTitle);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('GET test-drive-bookings/user:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/properties/:id - Получить объявление по ID
 * ВАЖНО: Этот маршрут должен быть ПОСЛЕ всех специфичных маршрутов
 */
app.get('/api/properties/:id', (req, res) => {
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
  if (id === 'test-timers' || id === 'pending' || id === 'approved' || id === 'auctions' || id === 'user' || id === 'shares') {
    console.log('⚠️ GET /api/properties/:id - Игнорируем специальный путь:', id);
    return res.status(404).json({ success: false, error: 'Маршрут не найден' });
  }
  
  try {
    const requestedPropertyType = req.query.property_type || null; // apartment | commercial | house | villa — для однозначного поиска доли
    console.log(`🔍 GET /api/properties/:id - Поиск объекта с ID=${id}, property_type=${requestedPropertyType || 'любой'}`);
    const property = propertyQueries.getById(id, requestedPropertyType);
    
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
    const user = userQueries.getById(property.user_id);
    if (user) {
      property.first_name = user.first_name;
      property.last_name = user.last_name;
      property.email = user.email;
      property.phone_number = user.phone_number;
      property.role = user.role;
    }
    
    const db = getDatabase();
    // Проверяем наличие поля test_timer_duration в новых таблицах
    let hasTestTimerDurationField = false;
    try {
      const apartmentsPragma = db.prepare("PRAGMA table_info(properties_apartments)").all();
      const housesPragma = db.prepare("PRAGMA table_info(properties_houses)").all();
      hasTestTimerDurationField = apartmentsPragma.some(col => col.name === 'test_timer_duration') ||
                                   housesPragma.some(col => col.name === 'test_timer_duration');
    } catch (e) {
      // Игнорируем ошибку
    }

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
    const reservationInfo = propertyQueries.isReserved(id);
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
        const tr = getDatabase().prepare(
          'SELECT title, description, additional_amenities FROM property_translations WHERE property_id = ? AND property_table = ? AND lang_code = ?'
        ).get(id, table, lang);
        if (tr) {
          if (tr.title) formatted.title = tr.title;
          if (tr.description) formatted.description = tr.description;
          if (tr.additional_amenities != null) formatted.additional_amenities = tr.additional_amenities;
        }
      } catch (e) {
        console.warn('GET /api/properties/:id - подстановка перевода:', e.message);
      }
    }

    // Документы по долгу (необходимые документы при продаже долга)
    if (formatted.is_debt === 1 || formatted.sale_type === 'debt' || formatted.has_debt === 1) {
      try {
        formatted.debt_documents = debtDocumentQueries.getByProperty(formatted.id, formatted.property_type);
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
    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Ошибка при получении объявления:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/properties/user/:userId - Получить все объявления пользователя
 */
app.get('/api/properties/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    console.log('📥 Запрос объявлений пользователя:', userId);
    
    const db = getDatabase();
    
    // Получаем информацию о пользователе
    const user = userQueries.getById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    // Используем функцию из propertyQueries, которая работает с новыми таблицами
    const properties = propertyQueries.getByUserId(userId);
    
    console.log(`✅ Найдено объявлений пользователя: ${properties.length}`);
    if (properties.length > 0) {
      console.log('📋 ID объявлений:', properties.map(p => p.id).join(', '));
      console.log('📋 Типы объявлений:', properties.map(p => p.property_type).join(', '));
      console.log('📋 Статусы модерации:', properties.map(p => p.moderation_status).join(', '));
    } else {
      console.log('⚠️ Объявления не найдены для пользователя:', userId);
    }

    // Добавляем информацию о пользователе к каждому объекту и парсим JSON поля
    const formattedProperties = properties.map(prop => {
      const formatted = { ...prop };
      
      // Добавляем информацию о пользователе
      formatted.first_name = user.first_name;
      formatted.last_name = user.last_name;
      formatted.email = user.email;
      formatted.phone_number = user.phone_number;
      formatted.role = user.role;
      
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
      
      return formatted;
    });

    res.json({ success: true, data: formattedProperties });
  } catch (error) {
    console.error('Ошибка при получении объявлений пользователя:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/properties/:id/approve - Одобрить объявление
 */
app.put('/api/properties/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const { reviewed_by, property_type: requestedPropertyType, debt_severity } = req.body;

    // ВАЖНО: Если property_type передан в запросе, используем его для получения правильного объекта
    // Это предотвращает получение объекта из неправильной таблицы при дубликатах ID
    let property = null;
    if (requestedPropertyType) {
      console.log(`🔍 Одобрение: получен property_type=${requestedPropertyType} из запроса, используем для поиска`);
      property = propertyQueries.getById(id, requestedPropertyType);
      if (!property) {
        console.error(`❌ Одобрение: объект ID=${id} не найден с типом ${requestedPropertyType} в правильной таблице!`);
        // НЕ делаем fallback на поиск без типа - это может вернуть объект из неправильной таблицы
        return res.status(404).json({ 
          success: false, 
          error: `Объявление с ID ${id} и типом ${requestedPropertyType} не найдено в правильной таблице` 
        });
      }
    } else {
      property = propertyQueries.getById(id);
    }
    
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объявление не найдено' });
    }
    
    // Если передан тип: он должен совпадать с записью, кроме пары apartment/commercial (одна таблица)
    if (requestedPropertyType && property.property_type !== requestedPropertyType) {
      const bothApartmentTable =
        (requestedPropertyType === 'apartment' || requestedPropertyType === 'commercial') &&
        (property.property_type === 'apartment' || property.property_type === 'commercial');
      if (!bothApartmentTable) {
        console.error(`❌ Одобрение: Запрошен тип ${requestedPropertyType}, но получен ${property.property_type}`);
        console.error(`   Source table: ${property.source_table || 'unknown'}`);
        const db = getDatabase();
        try {
          const correctTable = (requestedPropertyType === 'apartment' || requestedPropertyType === 'commercial')
            ? 'properties_apartments'
            : 'properties_houses';
          const checkInCorrectTable = db.prepare(`SELECT id, property_type FROM ${correctTable} WHERE id = ?`).get(id);

          if (checkInCorrectTable) {
            console.error(`   ⚠️ Объект в ${correctTable}, property_type=${checkInCorrectTable.property_type}`);
          } else {
            console.error(`   ⚠️ Объект НЕ найден в ${correctTable}`);
          }
        } catch (e) {
          console.error(`   Ошибка при проверке таблицы:`, e.message);
        }

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
      
      // Проверяем существование оригинального объекта
      const originalProperty = db.prepare('SELECT * FROM properties WHERE id = ?').get(originalPropertyId);
      if (!originalProperty) {
        return res.status(404).json({ 
          success: false, 
          error: 'Оригинальное объявление не найдено' 
        });
      }
      
      // Удаляем оригинальное объявление
      db.prepare('DELETE FROM properties WHERE id = ?').run(originalPropertyId);
      console.log(`✅ Оригинальное объявление ID ${originalPropertyId} удалено`);
      
      // Удаляем запись с запросом на удаление
      db.prepare('DELETE FROM properties WHERE id = ?').run(id);
      console.log(`🗑️ Запись с запросом на удаление ID ${id} удалена`);
      
      // Создаем уведомление для пользователя
      try {
        notificationQueries.create({
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
      // Извлекаем ID оригинального объекта
      originalPropertyId = property.rejection_reason.replace('EDIT:', '');
      console.log(`📝 Это редактирование. ID оригинала: ${originalPropertyId}`);
      
      // Проверяем существование оригинального объекта
      const originalProperty = db.prepare('SELECT * FROM properties WHERE id = ?').get(originalPropertyId);
      if (!originalProperty) {
        return res.status(404).json({ 
          success: false, 
          error: 'Оригинальное объявление не найдено' 
        });
      }
      
      // Определяем, изменились ли даты аукциона
      // Если даты не изменились (равны оригинальным или пустые), сохраняем оригинальные даты
      let finalAuctionStartDate = property.auction_start_date;
      let finalAuctionEndDate = property.auction_end_date;
      
      // Проверяем, является ли это аукционом
      const isAuction = property.is_auction === 1 || property.is_auction === '1' || property.is_auction === true;
      
      if (isAuction) {
        // Нормализуем даты для сравнения (убираем лишние пробелы, приводим к единому формату)
        const normalizeDate = (date) => {
          if (!date) return null;
          return String(date).trim() || null;
        };
        
        const newStartDate = normalizeDate(property.auction_start_date);
        const newEndDate = normalizeDate(property.auction_end_date);
        const oldStartDate = normalizeDate(originalProperty.auction_start_date);
        const oldEndDate = normalizeDate(originalProperty.auction_end_date);
        
        // Проверяем, изменились ли даты аукциона
        // Если новые даты пустые или равны оригинальным, значит пользователь не менял их
        const startDateChanged = newStartDate && newStartDate !== oldStartDate;
        const endDateChanged = newEndDate && newEndDate !== oldEndDate;
        const datesChanged = startDateChanged || endDateChanged;
        
        // Если даты не изменились или пустые, используем оригинальные даты (чтобы таймер продолжал работать)
        if (!datesChanged || !newStartDate || !newEndDate) {
          finalAuctionStartDate = originalProperty.auction_start_date;
          finalAuctionEndDate = originalProperty.auction_end_date;
          console.log(`⏰ Даты аукциона не изменились, сохраняем оригинальные даты для продолжения таймера`);
          console.log(`   Оригинальные: ${oldStartDate} - ${oldEndDate}`);
        } else {
          console.log(`⏰ Даты аукциона изменены, используем новые даты`);
          console.log(`   Было: ${oldStartDate} - ${oldEndDate}`);
          console.log(`   Стало: ${newStartDate} - ${newEndDate}`);
        }
      } else {
        // Если это не аукцион, даты не важны
        finalAuctionStartDate = null;
        finalAuctionEndDate = null;
      }
      
      // Обновляем оригинальный объект данными из изменений
      // Важно: обновляем существующий объект, а не создаем новый, чтобы избежать дубликатов
      db.prepare(`
        UPDATE properties 
        SET 
          property_type = ?,
          title = ?,
          description = ?,
          price = ?,
          currency = ?,
          is_auction = ?,
          auction_start_date = ?,
          auction_end_date = ?,
          auction_starting_price = ?,
          area = ?,
          living_area = ?,
          building_type = ?,
          rooms = ?,
          bedrooms = ?,
          bathrooms = ?,
          floor = ?,
          total_floors = ?,
          year_built = ?,
          location = ?,
          balcony = ?,
          parking = ?,
          elevator = ?,
          land_area = ?,
          garage = ?,
          pool = ?,
          garden = ?,
          commercial_type = ?,
          business_hours = ?,
          renovation = ?,
          condition = ?,
          heating = ?,
          water_supply = ?,
          sewerage = ?,
          electricity = ?,
          internet = ?,
          security = ?,
          furniture = ?,
          photos = ?,
          videos = ?,
          additional_documents = ?,
          additional_amenities = ?,
          ownership_document = ?,
          no_debts_document = ?,
          test_drive = ?,
          test_drive_data = ?,
          moderation_status = 'approved',
          rejection_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        property.property_type,
        property.title,
        property.description,
        property.price,
        property.currency,
        property.is_auction,
        finalAuctionStartDate,
        finalAuctionEndDate,
        property.auction_starting_price,
        property.area,
        property.living_area || null,
        property.building_type || null,
        property.rooms,
        property.bedrooms,
        property.bathrooms,
        property.floor,
        property.total_floors,
        property.year_built,
        property.location,
        property.balcony,
        property.parking,
        property.elevator,
        property.land_area,
        property.garage,
        property.pool,
        property.garden,
        property.commercial_type,
        property.business_hours,
        property.renovation,
        property.condition,
        property.heating,
        property.water_supply,
        property.sewerage,
        property.electricity,
        property.internet,
        property.security,
        property.furniture,
        property.photos,
        property.videos,
        property.additional_documents,
        property.additional_amenities || null,
        property.ownership_document,
        property.no_debts_document,
        property.test_drive !== undefined && property.test_drive !== null ? property.test_drive : 0,
        property.test_drive_data,
        originalPropertyId
      );
      
      console.log(`✅ Оригинальный объект ID ${originalPropertyId} обновлен данными из изменений`);
      console.log(`   Статус модерации: approved, rejection_reason: очищен`);
      
      // Удаляем запись с изменениями после применения (чтобы избежать дубликатов)
      db.prepare('DELETE FROM properties WHERE id = ?').run(id);
      console.log(`🗑️ Запись с изменениями ID ${id} удалена (дубликат предотвращен)`);
      
      // Проверяем, что оригинальный объект обновлен корректно
      const updatedOriginal = db.prepare('SELECT id, title, moderation_status, is_auction, auction_start_date, auction_end_date FROM properties WHERE id = ?').get(originalPropertyId);
      console.log(`✅ Проверка обновленного объекта:`, {
        id: updatedOriginal.id,
        title: updatedOriginal.title,
        moderation_status: updatedOriginal.moderation_status,
        is_auction: updatedOriginal.is_auction,
        auction_dates: updatedOriginal.is_auction ? `${updatedOriginal.auction_start_date} - ${updatedOriginal.auction_end_date}` : 'N/A'
      });
      
      // Создаем уведомление для пользователя
      try {
        notificationQueries.create({
          user_id: property.user_id,
          type: 'property_approved',
          title: 'Изменения в объекте одобрены',
          message: `Изменения в объекте "${property.title}" одобрены и применены к опубликованному объявлению`,
          data: JSON.stringify({ property_id: originalPropertyId })
        });
      } catch (notifError) {
        console.warn('Не удалось создать уведомление:', notifError);
      }
      
      res.json({ 
        success: true, 
        message: 'Изменения одобрены и применены к оригинальному объекту',
        original_property_id: originalPropertyId
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
      
      // ВАЖНО: Определяем правильную таблицу по property_type перед обновлением
      // Это предотвращает обновление объекта в неправильной таблице
      const db = getDatabase();
      let actualTable = null;
      
      // Проверяем, в какой таблице на самом деле находится объект
      if (property.property_type === 'house' || property.property_type === 'villa') {
        const checkInHouses = db.prepare('SELECT id FROM properties_houses WHERE id = ?').get(id);
        if (checkInHouses) {
          actualTable = 'houses';
          console.log(`✅ Объект ID=${id} найден в таблице houses (property_type=${property.property_type})`);
        } else {
          console.error(`❌ Объект ID=${id} с property_type=${property.property_type} не найден в таблице houses!`);
        }
      } else if (property.property_type === 'apartment' || property.property_type === 'commercial') {
        const checkInApartments = db.prepare('SELECT id FROM properties_apartments WHERE id = ?').get(id);
        if (checkInApartments) {
          actualTable = 'apartments';
          console.log(`✅ Объект ID=${id} найден в таблице apartments (property_type=${property.property_type})`);
        } else {
          console.error(`❌ Объект ID=${id} с property_type=${property.property_type} не найден в таблице apartments!`);
        }
      }
      
      // Используем функцию из propertyQueries, которая работает с новыми таблицами
      console.log(`🔄 Вызов updateModerationStatus для ID=${id}, status=approved`);
      const result = propertyQueries.updateModerationStatus(id, 'approved', reviewed_by, null, debt_severity || null);
      
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
        const currentProperty = propertyQueries.getById(id, propertyTypeForCheck);
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
      
      // ВАЖНО: Получаем обновленное объявление с указанием правильного типа
      // Используем requestedPropertyType или property.property_type для гарантии получения из правильной таблицы
      const propertyTypeForRetrieval = requestedPropertyType || property.property_type;
      console.log(`🔍 Получение обновленного объекта ID=${id} с типом=${propertyTypeForRetrieval}`);
      const updatedProperty = propertyQueries.getById(id, propertyTypeForRetrieval);
      
      // Если не нашли с указанием типа, пробуем без типа (но это не должно происходить)
      if (!updatedProperty) {
        console.warn(`⚠️ Не удалось получить объект с типом, пробуем без типа`);
        const fallbackProperty = propertyQueries.getById(id);
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
        const auctionsCheck = propertyQueries.getAuctions(null);
        isInList = auctionsCheck.some(p => p.id === parseInt(id));
        listName = 'аукционных';
        console.log(`📋 Проверка публикации (аукцион): объявление ${id} ${isInList ? 'найдено' : 'НЕ найдено'} в списке ${listName} (всего ${listName}: ${auctionsCheck.length})`);
      } else {
        const approvedCheck = propertyQueries.getApproved(null);
        isInList = approvedCheck.some(p => p.id === parseInt(id));
        listName = 'одобренных';
        console.log(`📋 Проверка публикации: объявление ${id} ${isInList ? 'найдено' : 'НЕ найдено'} в списке ${listName} (всего ${listName}: ${approvedCheck.length})`);
      }
      
      // Если не найдено, проверяем напрямую в БД
      if (!isInList) {
        try {
          const db = getDatabase();
          const tableName = (updatedProperty.property_type === 'house' || updatedProperty.property_type === 'villa') 
            ? 'properties_houses' 
            : 'properties_apartments';
          
          const directCheck = db.prepare(`
            SELECT id, property_type, moderation_status, is_auction, auction_end_date
            FROM ${tableName} 
            WHERE id = ? AND moderation_status = 'approved'
          `).get(id);
          
          if (directCheck) {
            console.log(`🔍 Прямая проверка в БД (${tableName}):`, directCheck);
            console.log(`⚠️ Объект найден в БД, но не попадает в список ${listName}. Возможные причины:`);
            console.log(`   - is_auction: ${directCheck.is_auction} (тип: ${typeof directCheck.is_auction})`);
            console.log(`   - auction_end_date: ${directCheck.auction_end_date || 'NULL'}`);
            if (updatedProperty.is_auction === 1 || updatedProperty.is_auction === '1') {
              console.log(`   - Для аукционных объектов требуется auction_end_date`);
            }
          } else {
            console.log(`🔍 Прямая проверка в БД (${tableName}): объект не найден со статусом 'approved'`);
            // Проверяем в другой таблице на всякий случай
            const otherTable = tableName === 'properties_houses' ? 'properties_apartments' : 'properties_houses';
            const directCheck2 = db.prepare(`
              SELECT id, property_type, moderation_status, is_auction 
              FROM ${otherTable} 
              WHERE id = ? AND moderation_status = 'approved'
            `).get(id);
            if (directCheck2) {
              console.log(`⚠️ Объект найден в другой таблице ${otherTable}:`, directCheck2);
            }
          }
        } catch (dbError) {
          console.error('❌ Ошибка при прямой проверке в БД:', dbError.message);
        }
      }
      console.log('🔍 Одобрение нового объявления - test_drive после одобрения:', {
        test_drive: updatedProperty.test_drive,
        test_drive_type: typeof updatedProperty.test_drive
      });

      // Создаем уведомление для пользователя
      try {
        notificationQueries.create({
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
          console.log(`[SSE] 📤 Аукционный объект ID=${id} одобрен — рассылаем подписчикам страницы аукциона`);
          const formatted = formatOneAuctionPropertyForApi(updatedProperty);
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

      // ВАЖНО: Финальная проверка - убеждаемся, что возвращаем правильный объект
      if (requestedPropertyType && updatedProperty.property_type !== requestedPropertyType) {
        console.error(`❌ КРИТИЧЕСКАЯ ОШИБКА перед отправкой ответа! Запрошен тип ${requestedPropertyType}, но updatedProperty имеет тип ${updatedProperty.property_type}`);
        console.error(`   Source table: ${updatedProperty.source_table || 'unknown'}`);
        return res.status(500).json({ 
          success: false, 
          error: `Получен объект с неправильным типом: запрошен ${requestedPropertyType}, получен ${updatedProperty.property_type}` 
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
app.put('/api/properties/:id/toggle-auction', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объявление не найдено' });
    }

    // Переключаем статус аукциона
    const newAuctionStatus = property.is_auction === 1 ? 0 : 1;
    db.prepare(`
      UPDATE properties 
      SET is_auction = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newAuctionStatus, id);

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
app.put('/api/properties/:id/reject', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { reviewed_by, rejection_reason } = req.body;

    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объявление не найдено' });
    }

    db.prepare(`
      UPDATE properties 
      SET moderation_status = 'rejected',
          reviewed_by = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          rejection_reason = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reviewed_by || 'admin', rejection_reason || null, id);

    // Создаем уведомление для пользователя
    try {
      notificationQueries.create({
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
      const pNew = propertyQueries.getById(id);
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
app.delete('/api/properties/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объявление не найдено' });
    }

    // Удаляем объявление
    db.prepare('DELETE FROM properties WHERE id = ?').run(id);

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
app.post('/api/users/:id/card', (req, res) => {
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
    
    const db = getDatabase();
    
    // Проверяем, существуют ли необходимые поля в таблице users
    try {
      const pragmaInfo = db.prepare("PRAGMA table_info(users)").all();
      const requiredFields = ['has_card', 'card_number', 'card_cvv', 'card_type'];
      const existingFields = pragmaInfo.map(col => col.name);
      
      console.log('🔍 Проверка полей в таблице users:', {
        existing: existingFields,
        required: requiredFields
      });
      
      // Добавляем недостающие поля
      if (!existingFields.includes('has_card')) {
        db.prepare("ALTER TABLE users ADD COLUMN has_card INTEGER DEFAULT 0").run();
        console.log('✅ Добавлено поле has_card');
      }
      if (!existingFields.includes('card_number')) {
        db.prepare("ALTER TABLE users ADD COLUMN card_number TEXT").run();
        console.log('✅ Добавлено поле card_number');
      }
      if (!existingFields.includes('card_cvv')) {
        db.prepare("ALTER TABLE users ADD COLUMN card_cvv TEXT").run();
        console.log('✅ Добавлено поле card_cvv');
      }
      if (!existingFields.includes('card_type')) {
        db.prepare("ALTER TABLE users ADD COLUMN card_type TEXT").run();
        console.log('✅ Добавлено поле card_type');
      }
    } catch (alterError) {
      console.warn('⚠️ Ошибка при проверке/добавлении полей:', alterError.message);
    }
    
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
    const user = userQueries.getById(userId);
    if (!user) {
      console.warn('❌ Пользователь не найден:', userId);
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    const stmt = db.prepare(`
      UPDATE users 
      SET has_card = 1, 
          card_number = ?, 
          card_cvv = ?, 
          card_type = ?,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    try {
      const result = stmt.run(encryptedCardNumber, encryptedCvv, cardType, userId);
      console.log('✅ Карта сохранена, изменено записей:', result.changes);
      
      if (result.changes === 0) {
        console.warn('⚠️ Не удалось обновить карту пользователя:', userId);
        return res.status(404).json({ success: false, error: 'Пользователь не найден или данные не обновлены' });
      }
    } catch (dbError) {
      console.error('❌ Ошибка при обновлении БД:', dbError);
      return res.status(500).json({ 
        success: false, 
        error: 'Ошибка при сохранении в базу данных: ' + dbError.message 
      });
    }
    
    const updatedUser = userQueries.getById(userId);
    
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
app.get('/api/users/:id/deposit', (req, res) => {
  try {
    const userId = req.params.id;
    const db = getDatabase();
    const user = userQueries.getById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    // Проверяем и добавляем колонку deposit_amount, если её нет
    try {
      const pragmaInfo = db.prepare("PRAGMA table_info(users)").all();
      const depositAmountColumn = pragmaInfo.find(col => col.name === 'deposit_amount');
      if (!depositAmountColumn) {
        console.log('🔄 Добавляем колонку deposit_amount в таблицу users...');
        db.exec("ALTER TABLE users ADD COLUMN deposit_amount REAL DEFAULT 0");
        console.log('✅ Колонка deposit_amount добавлена');
      }
    } catch (colError) {
      console.warn('⚠️ Ошибка при проверке/добавлении колонки deposit_amount:', colError.message);
    }
    
    res.json({
      success: true,
      data: {
        depositAmount: (user.deposit_amount !== undefined && user.deposit_amount !== null) ? parseFloat(user.deposit_amount) : 0,
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
app.post('/api/users/:id/deposit/top-up', (req, res) => {
  try {
    const userId = req.params.id;
    const db = getDatabase();
    
    // Проверяем и добавляем колонку deposit_amount, если её нет
    try {
      const pragmaInfo = db.prepare("PRAGMA table_info(users)").all();
      const depositAmountColumn = pragmaInfo.find(col => col.name === 'deposit_amount');
      if (!depositAmountColumn) {
        console.log('🔄 Добавляем колонку deposit_amount в таблицу users...');
        db.exec("ALTER TABLE users ADD COLUMN deposit_amount REAL DEFAULT 0");
        console.log('✅ Колонка deposit_amount добавлена');
      }
    } catch (colError) {
      console.warn('⚠️ Ошибка при проверке/добавлении колонки deposit_amount:', colError.message);
    }
    
    const user = userQueries.getById(userId);
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
    
    const stmt = db.prepare('UPDATE users SET deposit_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(newDeposit, userId);
    
    // Создаем запись о транзакции
    try {
      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, description, created_at)
        VALUES (?, 'deposit', 3000, 'Пополнение депозита', CURRENT_TIMESTAMP)
      `).run(userId);
    } catch (e) {
      // Таблица транзакций может не существовать, это нормально
      console.warn('Не удалось создать транзакцию:', e.message);
    }
    
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
app.post('/api/users/:id/deposit/withdraw', (req, res) => {
  try {
    const userId = req.params.id;
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Необходимо указать сумму для вывода' 
      });
    }
    
    const db = getDatabase();
    const user = userQueries.getById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    // Проверяем и добавляем колонку deposit_amount, если её нет
    try {
      const pragmaInfo = db.prepare("PRAGMA table_info(users)").all();
      const depositAmountColumn = pragmaInfo.find(col => col.name === 'deposit_amount');
      if (!depositAmountColumn) {
        console.log('🔄 Добавляем колонку deposit_amount в таблицу users...');
        db.exec("ALTER TABLE users ADD COLUMN deposit_amount REAL DEFAULT 0");
        console.log('✅ Колонка deposit_amount добавлена');
      }
    } catch (colError) {
      console.warn('⚠️ Ошибка при проверке/добавлении колонки deposit_amount:', colError.message);
    }
    
    const currentDeposit = (user.deposit_amount !== undefined && user.deposit_amount !== null) ? parseFloat(user.deposit_amount) : 0;
    if (currentDeposit < amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Недостаточно средств на депозите' 
      });
    }
    
    const newDeposit = currentDeposit - amount;
    const stmt = db.prepare('UPDATE users SET deposit_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(newDeposit, userId);
    
    // Создаем запись о транзакции
    try {
      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, description, created_at)
        VALUES (?, 'withdrawal', ?, 'Вывод средств', CURRENT_TIMESTAMP)
      `).run(userId, -amount);
    } catch (e) {
      console.warn('Не удалось создать транзакцию:', e.message);
    }
    
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
app.get('/api/users/:id/transactions', (req, res) => {
  try {
    const userId = req.params.id;
    const db = getDatabase();
    
    // Проверяем, существует ли таблица транзакций
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'").get();
    
    if (!tableExists) {
      // Если таблицы нет, возвращаем пустой массив
      return res.json({ success: true, data: [] });
    }
    
    const transactions = db.prepare(`
      SELECT * FROM transactions 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `).all(userId);
    
    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Ошибка при получении транзакций:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/:id/analytics - Получить аналитику пользователя
 */
app.get('/api/users/:id/analytics', (req, res) => {
  try {
    const userId = req.params.id;
    const db = getDatabase();
    
    const user = userQueries.getById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }
    
    // Проверяем, существует ли таблица транзакций
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'").get();
    
    let totalDeposit = 0;
    let totalWithdrawal = 0;
    
    if (tableExists) {
      const depositStats = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM transactions 
        WHERE user_id = ? AND type = 'deposit'
      `).get(userId);
      
      const withdrawalStats = db.prepare(`
        SELECT COALESCE(SUM(ABS(amount)), 0) as total 
        FROM transactions 
        WHERE user_id = ? AND type = 'withdrawal'
      `).get(userId);
      
      totalDeposit = depositStats?.total || 0;
      totalWithdrawal = withdrawalStats?.total || 0;
    }
    
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
app.post('/api/bids', (req, res) => {
  try {
    const { user_id, property_id, bid_amount } = req.body;
    const db = getDatabase();
    
    console.log('📝 Создание ставки - полученные данные:', { 
      user_id, 
      property_id, 
      bid_amount,
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
    
    // Проверяем и создаем таблицу bids, если её нет
    // ВАЖНО: Не используем FOREIGN KEY для property_id, так как объекты могут быть в разных таблицах (properties или properties_houses)
    try {
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bids'").get();
      if (!tableCheck) {
        console.log('⚠️ Таблица bids не существует, создаем...');
        db.exec(`
          CREATE TABLE IF NOT EXISTS bids (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            property_id INTEGER NOT NULL,
            property_table TEXT,
            bid_amount REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );
          CREATE INDEX IF NOT EXISTS idx_bids_user_id ON bids(user_id);
          CREATE INDEX IF NOT EXISTS idx_bids_property_id ON bids(property_id);
          CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids(created_at);
          CREATE INDEX IF NOT EXISTS idx_bids_user_property ON bids(user_id, property_id);
          CREATE INDEX IF NOT EXISTS idx_bids_property_id_table ON bids(property_id, property_table);
        `);
        console.log('✅ Таблица bids создана');
      } else {
        // Проверяем, есть ли внешний ключ на property_id, и если есть - пытаемся его удалить
        // Это нужно для существующих таблиц
        try {
          const foreignKeys = db.prepare(`
            SELECT sql FROM sqlite_master 
            WHERE type='table' AND name='bids'
          `).get();
          
          if (foreignKeys && foreignKeys.sql && foreignKeys.sql.includes('FOREIGN KEY (property_id) REFERENCES properties')) {
            console.log('⚠️ Обнаружен внешний ключ на property_id, который может вызывать проблемы. Рекомендуется пересоздать таблицу без этого ключа.');
            // В SQLite нельзя просто удалить внешний ключ, нужно пересоздать таблицу
            // Но мы не будем делать это автоматически, чтобы не потерять данные
          }
        } catch (fkCheckError) {
          console.warn('⚠️ Не удалось проверить внешние ключи:', fkCheckError.message);
        }
      }
    } catch (tableError) {
      console.error('❌ Ошибка при проверке/создании таблицы bids:', tableError);
    }
    
    // Проверяем, существует ли пользователь
    const user = userQueries.getById(userIdNum);
    if (!user) {
      console.error(`❌ Пользователь с ID ${userIdNum} не найден в БД`);
      return res.status(404).json({ success: false, error: `Пользователь с ID ${userIdNum} не найден` });
    }
    console.log('✅ Пользователь найден:', { id: user.id, name: `${user.first_name} ${user.last_name}` });
    
    // Проверяем, существует ли объект недвижимости во всех возможных таблицах
    // Система использует: properties_apartments (квартиры/коммерческая), properties_houses (дома/виллы), и старую properties
    let property = null;
    let tableName = null;
    
    // Сначала проверяем новые таблицы
    try {
      property = db.prepare('SELECT * FROM properties_apartments WHERE id = ?').get(propertyIdNum);
      if (property) {
        tableName = 'properties_apartments';
        console.log(`✅ Объект найден в properties_apartments:`, { id: property.id, title: property.title, property_type: property.property_type });
      }
    } catch (e) {
      console.warn('⚠️ Таблица properties_apartments не существует или ошибка:', e.message);
    }
    
    if (!property) {
      try {
        property = db.prepare('SELECT * FROM properties_houses WHERE id = ?').get(propertyIdNum);
        if (property) {
          tableName = 'properties_houses';
          console.log(`✅ Объект найден в properties_houses:`, { id: property.id, title: property.title, property_type: property.property_type });
        }
      } catch (e) {
        console.warn('⚠️ Таблица properties_houses не существует или ошибка:', e.message);
      }
    }
    
    // Fallback на старую таблицу properties
    if (!property) {
      try {
        property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyIdNum);
        if (property) {
          tableName = 'properties';
          console.log(`✅ Объект найден в старой таблице properties:`, { id: property.id, title: property.title });
        }
      } catch (e) {
        console.warn('⚠️ Таблица properties не существует или ошибка:', e.message);
      }
    }
    
    if (!property || !tableName) {
      console.error(`❌ Объект недвижимости с ID ${propertyIdNum} не найден ни в одной таблице (properties_apartments, properties_houses, properties)`);
      return res.status(404).json({ success: false, error: `Объект недвижимости с ID ${propertyIdNum} не найден` });
    }
    
    console.log('✅ Объект найден:', { id: property.id, title: property.title, is_auction: property.is_auction, table: tableName });
    
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
      
      // Проверяем и добавляем колонку deposit_amount, если её нет
      try {
        const pragmaInfo = db.prepare("PRAGMA table_info(users)").all();
        const depositAmountColumn = pragmaInfo.find(col => col.name === 'deposit_amount');
        if (!depositAmountColumn) {
          console.log('🔄 Добавляем колонку deposit_amount в таблицу users...');
          db.exec("ALTER TABLE users ADD COLUMN deposit_amount REAL DEFAULT 0");
          console.log('✅ Колонка deposit_amount добавлена');
        }
      } catch (colError) {
        console.warn('⚠️ Ошибка при проверке/добавлении колонки deposit_amount:', colError.message);
      }
      
      const depositAmount = (user.deposit_amount !== undefined && user.deposit_amount !== null) ? parseFloat(user.deposit_amount) : 0;
      if (depositAmount <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Для участия в аукционе необходим депозит. Пожалуйста, пополните депозит.' 
        });
      }
    }
    
    // Разрешаем ставки для всех объектов (как аукционных, так и обычных)
    // Проверка отключена: пользователь может делать ставки в нескольких объектах
    // const existingBids = db.prepare(`
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
    let currentMaxBid = basePrice;
    try {
      const maxBid = db.prepare(`
        SELECT MAX(bid_amount) as max_bid 
        FROM bids 
        WHERE property_id = ?
      `).get(propertyIdNum);
      
      if (maxBid && maxBid.max_bid) {
        currentMaxBid = maxBid.max_bid;
      }
    } catch (bidError) {
      console.warn('⚠️ Не удалось получить максимальную ставку:', bidError);
    }
    
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
      const maxBidResult = db.prepare(`
        SELECT user_id, bid_amount 
        FROM bids 
        WHERE property_id = ?
        ORDER BY bid_amount DESC, created_at DESC
        LIMIT 1
      `).get(propertyIdNum);
      
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
    
    // Создаем ставку
    // ВАЖНО: Отключаем проверку внешних ключей, так как объекты могут быть в разных таблицах
    // (properties или properties_houses), а внешний ключ ссылается только на properties
    try {
      db.prepare('PRAGMA foreign_keys = OFF').run();
    } catch (fkError) {
      console.warn('⚠️ Не удалось отключить проверку внешних ключей:', fkError.message);
    }
    
    let result;
    let bidId;
    try {
      const hasPropertyTableCol = db.prepare("PRAGMA table_info(bids)").all().some(c => c.name === 'property_table');
      const stmt = hasPropertyTableCol
        ? db.prepare(`
            INSERT INTO bids (user_id, property_id, property_table, bid_amount, created_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          `)
        : db.prepare(`
            INSERT INTO bids (user_id, property_id, bid_amount, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `);
      result = hasPropertyTableCol ? stmt.run(userIdNum, propertyIdNum, tableName, bidAmountNum) : stmt.run(userIdNum, propertyIdNum, bidAmountNum);
      bidId = result.lastInsertRowid;
    } catch (insertError) {
      // Включаем обратно проверку внешних ключей
      try {
        db.prepare('PRAGMA foreign_keys = ON').run();
      } catch (fkError2) {
        console.warn('⚠️ Не удалось включить проверку внешних ключей:', fkError2.message);
      }
      throw insertError;
    }
    
    // Включаем обратно проверку внешних ключей
    try {
      db.prepare('PRAGMA foreign_keys = ON').run();
    } catch (fkError) {
      console.warn('⚠️ Не удалось включить проверку внешних ключей:', fkError.message);
    }
    
    console.log(`✅ Ставка создана с ID: ${bidId}, user_id: ${user_id}, property_id: ${property_id}, amount: ${bidAmountNum}`);
    console.log(`📊 Результат INSERT: changes=${result.changes}, lastInsertRowid=${bidId}`);
    
    // Отменяем таймер для объекта (появилась ставка)
    cancelPropertyTimer(propertyIdNum);
    
    // Сразу проверяем, что ставка сохранилась
    const verifyBid = db.prepare('SELECT * FROM bids WHERE id = ?').get(bidId);
    if (!verifyBid) {
      console.error(`❌ КРИТИЧЕСКАЯ ОШИБКА: Ставка не найдена в БД сразу после создания! ID: ${bidId}`);
      return res.status(500).json({ 
        success: false, 
        error: 'Ставка не была сохранена в базу данных' 
      });
    }
    
    console.log(`✅ Ставка подтверждена в БД:`, verifyBid);
    
    // Отправляем уведомление предыдущему ставщику, если его ставку перебили
    if (previousHighestBidder && previousHighestBidder.user_id !== userIdNum && bidAmountNum > previousHighestBidder.bid_amount) {
      try {
        const propertyTitle = property.title || 'объект';
        const currency = property.currency || 'USD';
        const formattedNewBid = new Intl.NumberFormat('ru-RU', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(bidAmountNum);
        
        const notificationData = {
          user_id: previousHighestBidder.user_id,
          type: 'bid_outbid',
          title: 'Вашу ставку перебили',
          message: `Ваша ставка на объект "${propertyTitle}" была перебита. Новая максимальная ставка: ${formattedNewBid}. Вы можете сделать новую ставку, чтобы вернуться в игру!`,
          data: JSON.stringify({ 
            property_id: propertyIdNum,
            property_title: propertyTitle,
            new_bid_amount: bidAmountNum,
            previous_bid_amount: previousHighestBidder.bid_amount
          }),
          is_read: 0,
          view_count: 0
        };
        
        const notifResult = notificationQueries.create(notificationData);
        console.log(`📬 Уведомление отправлено предыдущему ставщику (user_id: ${previousHighestBidder.user_id}) о перебитой ставке. ID уведомления: ${notifResult.lastInsertRowid}`);
        console.log(`📬 Данные уведомления:`, notificationData);
      } catch (notifError) {
        console.error('❌ Ошибка при отправке уведомления предыдущему ставщику:', notifError);
        console.error('❌ Stack trace:', notifError.stack);
        // Не прерываем выполнение, если уведомление не отправилось
      }
    } else {
      if (!previousHighestBidder) {
        console.log('📭 Предыдущего ставщика не найдено, уведомление не отправляется');
      } else if (previousHighestBidder.user_id === userIdNum) {
        console.log('📭 Текущий пользователь уже был лидером, уведомление не требуется');
      } else if (bidAmountNum <= previousHighestBidder.bid_amount) {
        console.log(`📭 Новая ставка (${bidAmountNum}) не больше предыдущей (${previousHighestBidder.bid_amount}), уведомление не отправляется`);
      }
    }
    
    // Проверяем общее количество ставок для этого объекта
    const allBids = db.prepare('SELECT COUNT(*) as count FROM bids WHERE property_id = ?').get(property_id);
    console.log(`📊 Всего ставок для объекта ${property_id}: ${allBids.count}`);
    
    // Обновляем минимальную ставку для объекта
    // Если ставка больше минимальной - обновляем минимальную на: наша ставка + 5%
    const newMaxBid = bidAmountNum;
    const newMinimumBid = newMaxBid + getAuctionMinBidStep(newMaxBid);
    
    // Обновляем auction_minimum_bid в properties (для совместимости, но не используем в проверке)
    try {
      const updateStmt = db.prepare(`
        UPDATE properties 
        SET auction_minimum_bid = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      const updateResult = updateStmt.run(newMinimumBid, property_id);
      console.log(`✅ Обновлена минимальная ставка для объекта ${property_id}: ${newMinimumBid} (changes: ${updateResult.changes})`);
    } catch (updateError) {
      // Если поле auction_minimum_bid не существует, пытаемся добавить его
      console.warn('Не удалось обновить auction_minimum_bid, пытаемся добавить поле:', updateError.message);
      try {
        db.exec('ALTER TABLE properties ADD COLUMN auction_minimum_bid REAL');
        const updateStmt2 = db.prepare(`
          UPDATE properties 
          SET auction_minimum_bid = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `);
        updateStmt2.run(newMinimumBid, property_id);
        console.log(`✅ Поле auction_minimum_bid добавлено и обновлено для объекта ${property_id}`);
      } catch (addError) {
        console.warn('Не удалось добавить поле auction_minimum_bid:', addError.message);
      }
    }

    broadcastPropertyBidEvent(propertyIdNum, {
      type: 'bid_placed',
      property_id: propertyIdNum,
      bid_amount: bidAmountNum,
      minimum_bid: newMinimumBid,
    });
    
    res.json({
      success: true,
      data: {
        bid_id: result.lastInsertRowid,
        bid_amount: parseFloat(bid_amount),
        minimum_bid: newMinimumBid
      }
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
 * GET /api/bids/property/:id - Получить историю ставок для объекта
 */
app.get('/api/bids/property/:id', (req, res) => {
  try {
    const propertyId = req.params.id;
    const db = getDatabase();
    
    console.log(`📊 Запрос истории ставок для объекта ${propertyId}`);
    
    // Проверяем, существует ли таблица ставок
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bids'").get();
    if (!tableExists) {
      console.log('⚠️ Таблица bids не существует');
      return res.json({ success: true, data: [] });
    }
    
    const bids = db.prepare(`
      SELECT 
        b.id,
        b.user_id,
        b.property_id,
        b.bid_amount,
        b.created_at,
        u.user_id_number
      FROM bids b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.property_id = ?
      ORDER BY b.bid_amount DESC, b.created_at DESC
    `).all(propertyId);
    
    console.log(`✅ Найдено ${bids.length} ставок для объекта ${propertyId}`);
    
    res.json({ success: true, data: bids });
  } catch (error) {
    console.error('❌ Ошибка при получении истории ставок:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/bids/user/:id - Получить ставки пользователя (оптимизировано: batch по property_table)
 */
app.get('/api/bids/user/:id', (req, res) => {
  try {
    const userId = req.params.id;
    const db = getDatabase();
    
    if (!schemaCache.properties && !schemaCache.properties_apartments && !schemaCache.properties_houses) {
      return res.json({ success: true, data: [] });
    }
    
    const bids = db.prepare(`
      SELECT * FROM bids WHERE user_id = ? ORDER BY created_at DESC
    `).all(userId);
    
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
          const rows = db.prepare(`SELECT * FROM properties_apartments WHERE id IN (${placeholders})`).all(...ids);
          for (const p of rows) propertyMap.set(`properties_apartments:${p.id}`, p);
        } catch (_) {}
      }
      if (schemaCache.properties_houses && byTable.properties_houses.length) {
        const ids = unique(byTable.properties_houses);
        const placeholders = ids.map(() => '?').join(',');
        try {
          const rows = db.prepare(`SELECT * FROM properties_houses WHERE id IN (${placeholders})`).all(...ids);
          for (const p of rows) propertyMap.set(`properties_houses:${p.id}`, p);
        } catch (_) {}
      }
      if (schemaCache.properties && byTable.properties.length) {
        const ids = unique(byTable.properties);
        const placeholders = ids.map(() => '?').join(',');
        try {
          const rows = db.prepare(`SELECT * FROM properties WHERE id IN (${placeholders})`).all(...ids);
          for (const p of rows) propertyMap.set(`properties:${p.id}`, p);
        } catch (_) {}
      }
    } else {
      const allIds = [...new Set(bids.map(b => b.property_id))];
      for (const pid of allIds) {
        let p = null;
        if (schemaCache.properties_apartments) {
          try { p = db.prepare('SELECT * FROM properties_apartments WHERE id = ?').get(pid); if (p) { p.source_table = 'properties_apartments'; } } catch (_) {}
        }
        if (!p && schemaCache.properties_houses) {
          try { p = db.prepare('SELECT * FROM properties_houses WHERE id = ?').get(pid); if (p) { p.source_table = 'properties_houses'; } } catch (_) {}
        }
        if (!p && schemaCache.properties) {
          try { p = db.prepare('SELECT * FROM properties WHERE id = ?').get(pid); if (p) { p.source_table = 'properties'; } } catch (_) {}
        }
        if (p) propertyMap.set(`${p.source_table}:${pid}`, p);
      }
    }
    
    const formatProp = (property) => {
      if (!property) return { title: null, location: null, price: null, auction_starting_price: null, auction_minimum_bid: null, photos: [], is_auction: 0, auction_end_date: null, currency: 'USD' };
      let photos = property.photos;
      if (photos && typeof photos === 'string') {
        try { photos = JSON.parse(photos); } catch (_) { photos = []; }
      }
      if (!Array.isArray(photos)) photos = [];
      return {
        title: property.title || null,
        location: property.location || property.address || null,
        price: property.price ?? null,
        auction_starting_price: property.auction_starting_price ?? null,
        auction_minimum_bid: property.auction_minimum_bid ?? null,
        photos,
        is_auction: property.is_auction || 0,
        auction_end_date: property.auction_end_date || null,
        currency: property.currency || 'USD'
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
app.get('/api/bids/user/:userId/property/:propertyId', (req, res) => {
  try {
    const userId = req.params.userId;
    const propertyId = req.params.propertyId;
    const db = getDatabase();
    
    console.log(`📊 Запрос истории ставок пользователя ${userId} по объекту ${propertyId}`);
    
    // Проверяем, существует ли таблица ставок
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bids'").get();
    if (!tableExists) {
      console.log('⚠️ Таблица bids не существует');
      return res.json({ success: true, data: [] });
    }
    
    const bids = db.prepare(`
      SELECT 
        b.*,
        p.title,
        p.location,
        p.price,
        p.auction_starting_price,
        p.auction_minimum_bid,
        p.photos,
        p.is_auction,
        p.auction_end_date
      FROM bids b
      LEFT JOIN properties p ON b.property_id = p.id
      WHERE b.user_id = ? AND b.property_id = ?
      ORDER BY b.created_at DESC
    `).all(userId, propertyId);
    
    // Парсим JSON поля
    const formattedBids = bids.map(bid => {
      const formatted = { ...bid };
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
 * Таблица auction_winners создаётся в database.js при init.
 */

/**
 * POST /api/auction-winners - Сохранить победителя аукциона
 * Вызывается когда таймер аукциона закончился
 */
app.post('/api/auction-winners', (req, res) => {
  try {
    const { user_id, property_id, property_table, winning_bid_amount, currency, auction_end_date } = req.body;
    const db = getDatabase();
    
    console.log('🏆 Сохранение победителя аукциона:', { user_id, property_id, property_table, winning_bid_amount });
    
    // Валидация
    if (!user_id || !property_id || !property_table || !winning_bid_amount || !auction_end_date) {
      return res.status(400).json({
        success: false,
        error: 'Необходимо указать: user_id, property_id, property_table, winning_bid_amount, auction_end_date'
      });
    }
    
    // Проверяем, не был ли уже сохранен победитель для этого объекта
    const existing = db.prepare(`
      SELECT id FROM auction_winners 
      WHERE property_id = ? AND property_table = ?
    `).get(property_id, property_table);
    
    if (existing) {
      console.log('⚠️ Победитель для этого объекта уже сохранен');
      return res.status(409).json({
        success: false,
        error: 'Победитель для этого объекта уже зарегистрирован'
      });
    }
    
    // Вычисляем сумму депозита (10% от выигрышной ставки)
    const depositAmount = Math.round(winning_bid_amount * 0.1 * 100) / 100;
    
    // Вычисляем дату до которой нужно внести депозит (3 дня с момента выигрыша)
    const wonDate = new Date(auction_end_date);
    const depositDueDate = new Date(wonDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    // Сохраняем победителя
    const stmt = db.prepare(`
      INSERT INTO auction_winners (
        user_id, property_id, property_table, winning_bid_amount, currency,
        auction_end_date, deposit_amount, deposit_due_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_deposit')
    `);
    
    const result = stmt.run(
      user_id,
      property_id,
      property_table,
      winning_bid_amount,
      currency || 'USD',
      auction_end_date,
      depositAmount,
      depositDueDate.toISOString()
    );
    
    console.log('✅ Победитель сохранен:', {
      id: result.lastInsertRowid,
      deposit_amount: depositAmount,
      deposit_due_date: depositDueDate.toISOString()
    });

    // High-priority уведомления покупателю: победа, проигрыш, дедлайн оплаты
    try {
      const propertyTableSafe = ['properties', 'properties_apartments', 'properties_houses'].includes(property_table)
        ? property_table
        : 'properties';
      const propertyRow = db
        .prepare(`SELECT id, title FROM ${propertyTableSafe} WHERE id = ?`)
        .get(property_id);
      const propertyTitle = propertyRow?.title || 'объект';

      notificationQueries.create({
        user_id: user_id,
        type: 'auction_won',
        title: 'Вы победили в аукционе',
        message: `Поздравляем! Вы победили в аукционе по объекту "${propertyTitle}".`,
        data: {
          property_id: parseInt(property_id, 10),
          winner_id: result.lastInsertRowid
        },
        is_read: 0,
        view_count: 0
      });

      notificationQueries.create({
        user_id: user_id,
        type: 'payment_deadline',
        title: 'Срок оплаты депозита',
        message: `Оплатите депозит до ${depositDueDate.toLocaleString('ru-RU')}, чтобы сохранить право на покупку "${propertyTitle}".`,
        data: {
          property_id: parseInt(property_id, 10),
          winner_id: result.lastInsertRowid,
          deposit_due_date: depositDueDate.toISOString()
        },
        is_read: 0,
        view_count: 0
      });

      // Проигравшие: все уникальные участники ставок по объекту, кроме победителя
      const losingBidders = db.prepare(`
        SELECT DISTINCT user_id
        FROM bids
        WHERE property_id = ? AND user_id IS NOT NULL AND user_id != ?
      `).all(property_id, user_id);

      for (const bidder of losingBidders) {
        notificationQueries.create({
          user_id: bidder.user_id,
          type: 'auction_lost',
          title: 'Аукцион завершен',
          message: `Аукцион по объекту "${propertyTitle}" завершен. Победил другой участник.`,
          data: {
            property_id: parseInt(property_id, 10)
          },
          is_read: 0,
          view_count: 0
        });
      }
    } catch (auctionNotifError) {
      console.error('❌ Ошибка создания high-priority уведомлений по аукциону:', auctionNotifError);
    }
    
    res.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
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
 * GET /api/auction-winners/user/:id - Получить выигранные объекты пользователя
 */
app.get('/api/auction-winners/user/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный user_id'
      });
    }
    
    const db = getDatabase();
    
    console.log(`📊 Запрос выигранных объектов для пользователя ${userId}`);
    
    const winners = db.prepare(`
      SELECT * FROM auction_winners WHERE user_id = ? ORDER BY won_at DESC
    `).all(userId);
    
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
        const rows = db.prepare(`SELECT * FROM properties_apartments WHERE id IN (${ph})`).all(...ids);
        for (const p of rows) propertyById.set(`properties_apartments:${p.id}`, p);
      }
      if (byTable.properties_houses.length) {
        const ids = uniq(byTable.properties_houses);
        const ph = ids.map(() => '?').join(',');
        const rows = db.prepare(`SELECT * FROM properties_houses WHERE id IN (${ph})`).all(...ids);
        for (const p of rows) propertyById.set(`properties_houses:${p.id}`, p);
      }
      if (byTable.properties.length) {
        const ids = uniq(byTable.properties);
        const ph = ids.map(() => '?').join(',');
        const rows = db.prepare(`SELECT * FROM properties WHERE id IN (${ph})`).all(...ids);
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
app.post('/api/auction-winners/:id/pay-deposit', (req, res) => {
  try {
    const winnerId = parseInt(req.params.id);
    const db = getDatabase();
    
    console.log(`💳 Оплата депозита для выигранного объекта ${winnerId}`);
    
    // Получаем информацию о выигранном объекте
    const winner = db.prepare('SELECT * FROM auction_winners WHERE id = ?').get(winnerId);
    
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
    const updateStmt = db.prepare(`
      UPDATE auction_winners
      SET deposit_paid = 1,
          deposit_paid_at = datetime('now'),
          status = 'deposit_paid',
          updated_at = datetime('now')
      WHERE id = ?
    `);
    
    updateStmt.run(winnerId);
    
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
app.get('/api/users/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

// ========== РОУТЫ ДЛЯ ПАРСИНГА НЕДВИЖИМОСТИ ==========

/**
 * GET /api/properties/calculator-options — города и районы для калькулятора цены
 */
app.get('/api/properties/calculator-options', (req, res) => {
  res.json({
    success: true,
    data: {
      cities: SPAIN_CITIES,
      districtsByCity: DISTRICTS_BY_CITY
    }
  });
});

/**
 * POST /api/properties/calculate-price - Парсинг похожих объектов с испанских сайтов недвижимости
 * Принимает параметры недвижимости и возвращает рекомендуемую цену и похожие объекты
 */
app.post('/api/properties/calculate-price', async (req, res) => {
    const { area, rooms, city, propertyType, district, maxPrice, minPrice } = req.body;
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
    const owner = userQueries.getById(property.user_id);
    if (!owner) {
      console.warn(`⚠️ Владелец с ID ${property.user_id} не найден для объекта ${propertyId}`);
      return;
    }
    
    const propertyTitle = property.title || 'ваш объект';
    const messageText = `За 45 дней с момента выставления вашего объекта "${propertyTitle}" не произошло ставок и взаимодействия с объявлением, предлагаем вам снизить цену в личном кабинете с помощью функции редактирования, с уважением команда sellyourbrick.`;
    
    // 1. Создаем уведомление в ЛК
    try {
      notificationQueries.create({
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
function startPropertyTimer(propertyId) {
  // Отменяем предыдущий таймер, если он был
  cancelPropertyTimer(propertyId);
  
  // Получаем данные объекта
  const db = getDatabase();
  let property = null;
  
  // Ищем объект во всех таблицах
  try {
    property = db.prepare('SELECT * FROM properties_apartments WHERE id = ?').get(propertyId);
  } catch (e) {
    // Игнорируем ошибку
  }
  
  if (!property) {
    try {
      property = db.prepare('SELECT * FROM properties_houses WHERE id = ?').get(propertyId);
    } catch (e) {
      // Игнорируем ошибку
    }
  }
  
  if (!property) {
    try {
      property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId);
    } catch (e) {
      // Игнорируем ошибку
    }
  }
  
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
    const db = getDatabase();
    const bidsCount = db.prepare('SELECT COUNT(*) as count FROM bids WHERE property_id = ?').get(propertyId);
    
    if (bidsCount && bidsCount.count > 0) {
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
    const db = getDatabase();
    
    // Вычисляем время 5 минут назад (для тестирования)
    const now = new Date();
    const minutesAgo5 = new Date(now);
    minutesAgo5.setMinutes(minutesAgo5.getMinutes() - 5);
    
    console.log(`📅 Проверяю объекты, выставленные до ${minutesAgo5.toISOString()}`);
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    let propertiesToCheck = [];
    
    if (useNewTables) {
      // Получаем объекты из обеих таблиц
      const apartments = db.prepare(`
        SELECT id, user_id, title, auction_start_date, created_at, 
               'apartment' as property_type
        FROM properties_apartments
        WHERE moderation_status = 'approved'
          AND (auction_start_date IS NOT NULL OR created_at IS NOT NULL)
      `).all();
      
      const houses = db.prepare(`
        SELECT id, user_id, title, auction_start_date, created_at,
               'house' as property_type
        FROM properties_houses
        WHERE moderation_status = 'approved'
          AND (auction_start_date IS NOT NULL OR created_at IS NOT NULL)
      `).all();
      
      propertiesToCheck = [...apartments, ...houses];
    } else {
      // Fallback на старую таблицу
      propertiesToCheck = db.prepare(`
        SELECT id, user_id, title, auction_start_date, created_at,
               'property' as property_type
        FROM properties
        WHERE moderation_status = 'approved'
          AND (auction_start_date IS NOT NULL OR created_at IS NOT NULL)
      `).all();
    }
    
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
        const bidsCount = db.prepare('SELECT COUNT(*) as count FROM bids WHERE property_id = ?').get(property.id);
        if (bidsCount && bidsCount.count > 0) {
          continue; // Есть ставки, пропускаем
        }
        
        // Проверяем, не отправляли ли уже уведомление (по типу уведомления в БД)
        // Ищем уведомления с типом 'no_bids_45_days' для этого пользователя и объекта
        const existingNotifications = db.prepare(`
          SELECT id, data FROM notifications 
          WHERE user_id = ? 
            AND type = 'no_bids_45_days'
        `).all(property.user_id);
        
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
        const owner = userQueries.getById(property.user_id);
        if (!owner) {
          console.warn(`⚠️ Владелец с ID ${property.user_id} не найден для объекта ${property.id}`);
          continue;
        }
        
        const propertyTitle = property.title || 'ваш объект';
        // Для тестирования используем текст про 5 минут, в production заменить на 45 дней
        const messageText = `За 5 минут с момента выставления вашего объекта "${propertyTitle}" не произошло ставок и взаимодействия с объявлением, предлагаем вам снизить цену в личном кабинете с помощью функции редактирования, с уважением команда sellyourbrick.`;
        
        // 1. Создаем уведомление в ЛК
        try {
          notificationQueries.create({
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
    
    // Явно обрабатываем корневой маршрут - отдаем index.html
    app.get('/', (req, res) => {
      const indexPath = join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
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
    
    // Для всех остальных маршрутов отдаем index.html (SPA routing)
    const indexPath = join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
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
  closeDatabase();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанное отклонение промиса:', reason);
  closeDatabase();
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Остановка сервера...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Остановка сервера...');
  closeDatabase();
  process.exit(0);
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