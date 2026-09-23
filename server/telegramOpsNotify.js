/**
 * Ops-алерты в Telegram для команды SellYourBrick.
 * Бот не отвечает клиентам — только push в TELEGRAM_CHAT_ID / TELEGRAM_ALERT_CHAT_IDS.
 * @see docs/TELEGRAM_OPS_ALERTS.md
 */
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HTTP_TIMEOUT_MS = 15000;

/** Env читаем в рантайме: ESM-import идёт до dotenv.config() в server.js. */
function getToken() {
  return String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
}

function isOpsEnabled() {
  const raw = String(process.env.TELEGRAM_OPS_ENABLED || '').trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'off') return false;
  return true;
}

function getKnownChatsPath() {
  return (
    process.env.TELEGRAM_KNOWN_CHATS_PATH ||
    path.join(__dirname, 'data', 'telegram-known-chats.json')
  );
}

function getDedupMs() {
  return Math.max(5000, parseInt(process.env.TELEGRAM_OPS_DEDUP_MS, 10) || 60000);
}

function getBidMinAmount() {
  const n = parseFloat(process.env.TELEGRAM_OPS_BID_MIN_AMOUNT || '0');
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getNotifyAllBids() {
  const raw = String(process.env.TELEGRAM_OPS_NOTIFY_ALL_BIDS || '1').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off';
}

const runtimeAlertChatIds = new Set();
const recentAlertKeys = new Map();

let telegramApiOk = false;
let authFailureLogged = false;
let botUsername = '';
let updatesStarted = false;
let pollOffset = 0;
let pollRunning = false;

function getEnvAlertChatIds() {
  return (process.env.TELEGRAM_ALERT_CHAT_IDS || process.env.TELEGRAM_CHAT_ID || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatMoney(amount, currency) {
  const n = Number(amount);
  const cur = String(currency || 'EUR').toUpperCase();
  if (!Number.isFinite(n)) return `— ${cur}`;
  return `${n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${cur}`;
}

function displayName(userOrName) {
  if (!userOrName) return '—';
  if (typeof userOrName === 'string') return userOrName.trim() || '—';
  const parts = [userOrName.first_name, userOrName.last_name, userOrName.name]
    .map((p) => (p != null ? String(p).trim() : ''))
    .filter(Boolean);
  if (parts.length) return parts.slice(0, 2).join(' ');
  if (userOrName.email) return String(userOrName.email);
  if (userOrName.phone_number) return String(userOrName.phone_number);
  return '—';
}

function previewText(text, max = 800) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '—';
  if (raw.length <= max) return raw;
  return `${raw.slice(0, Math.max(1, max - 1))}…`;
}

function formatOpsDateTime(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  const valid = Number.isNaN(date.getTime()) ? new Date() : date;
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(valid);
}

function liveChatClientLabel(data = {}) {
  const name = displayName({
    first_name: data.clientFirstName || data.client_first_name,
    last_name: data.clientLastName || data.client_last_name,
    name: data.clientName || data.name,
    email: data.clientEmail || data.client_email,
    phone_number: data.clientPhone || data.client_phone,
  });
  if (name && name !== '—') return name;
  const lead = data.leadEmail || data.lead_email;
  if (lead) return String(lead).trim();
  return 'гость';
}

function liveChatFromLabel(data = {}) {
  const who = liveChatClientLabel(data);
  const userId = data.userId ?? data.user_id;
  const hasUser = userId != null && String(userId).trim() !== '' && Number(userId) > 0;
  if (hasUser && who && who !== 'гость') return `${who} (#${userId})`;
  if (hasUser) return `пользователь #${userId}`;
  return who || 'гость';
}

function ensureDataDir() {
  const dir = path.dirname(getKnownChatsPath());
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadKnownAlertChatEntries() {
  ensureDataDir();
  const chatsPath = getKnownChatsPath();
  if (!fs.existsSync(chatsPath)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(chatsPath, 'utf8'));
    return Array.isArray(raw.chats) ? raw.chats : [];
  } catch {
    return [];
  }
}

function loadKnownAlertChats() {
  return loadKnownAlertChatEntries()
    .map((c) => String(c.id))
    .filter(Boolean);
}

function saveKnownAlertChats(entries) {
  ensureDataDir();
  fs.writeFileSync(
    getKnownChatsPath(),
    JSON.stringify({ chats: entries, updatedAt: new Date().toISOString() }, null, 2),
    'utf8',
  );
}

export function registerAlertChat(chatId, meta = {}) {
  const id = String(chatId || '').trim();
  if (!id) return;
  runtimeAlertChatIds.add(id);
  const entries = loadKnownAlertChatEntries();
  if (entries.some((e) => String(e.id) === id)) return;
  entries.push({
    id,
    type: meta.type || 'unknown',
    title: meta.title || '',
    registeredAt: new Date().toISOString(),
  });
  saveKnownAlertChats(entries);
  console.log(`📱 Telegram ops: chat ${id} зарегистрирован для алертов`);
}

function getEffectiveAlertChatIds() {
  return [
    ...new Set([...getEnvAlertChatIds(), ...loadKnownAlertChats(), ...runtimeAlertChatIds]),
  ].filter(Boolean);
}

export function isConfigured() {
  if (!getToken() || !isOpsEnabled()) return false;
  return getEffectiveAlertChatIds().length > 0 || getEnvAlertChatIds().length > 0;
}

function shouldDedup(key) {
  if (!key) return false;
  const now = Date.now();
  const dedupMs = getDedupMs();
  const prev = recentAlertKeys.get(key);
  if (prev && now - prev < dedupMs) return true;
  recentAlertKeys.set(key, now);
  if (recentAlertKeys.size > 2000) {
    const cutoff = now - dedupMs;
    for (const [k, at] of recentAlertKeys) {
      if (at < cutoff) recentAlertKeys.delete(k);
    }
  }
  return false;
}

function disableTelegramApi(reason) {
  telegramApiOk = false;
  if (!authFailureLogged) {
    authFailureLogged = true;
    console.error(`❌ Telegram ops отключён: ${reason}`);
  }
}

async function validateTelegramToken() {
  const TOKEN = getToken();
  if (!TOKEN || !isOpsEnabled()) return false;
  try {
    const { data } = await axios.get(`https://api.telegram.org/bot${TOKEN}/getMe`, {
      timeout: HTTP_TIMEOUT_MS,
      validateStatus: () => true,
    });
    if (data.ok && data.result) {
      telegramApiOk = true;
      authFailureLogged = false;
      botUsername = data.result.username ? `@${data.result.username}` : 'bot';
      for (const chatId of getEnvAlertChatIds()) {
        runtimeAlertChatIds.add(chatId);
      }
      for (const chatId of loadKnownAlertChats()) {
        runtimeAlertChatIds.add(chatId);
      }
      const ids = getEffectiveAlertChatIds();
      console.log(
        `📱 Telegram ops OK: ${botUsername} → ${ids.length ? ids.join(', ') : '(ожидание /whoami)'}`,
      );
      return true;
    }
    if (data.error_code === 401) {
      disableTelegramApi('неверный TELEGRAM_BOT_TOKEN (401)');
      return false;
    }
    disableTelegramApi(data.description || 'getMe failed');
    return false;
  } catch (err) {
    console.warn('telegram ops getMe:', err.message);
    return false;
  }
}

async function ensureTelegramApi() {
  if (!getToken() || !isOpsEnabled()) return false;
  if (telegramApiOk) return true;
  return validateTelegramToken();
}

async function postTelegramMessage(chatId, text, options = {}) {
  const TOKEN = getToken();
  const payload = {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  };
  if (options.parseMode !== false) {
    payload.parse_mode = options.parseMode || 'HTML';
  }
  try {
    await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, payload, {
      timeout: HTTP_TIMEOUT_MS,
    });
  } catch (err) {
    if (options.parseMode !== false && err.response?.status === 400) {
      await axios.post(
        `https://api.telegram.org/bot${TOKEN}/sendMessage`,
        { chat_id: chatId, text, disable_web_page_preview: true },
        { timeout: HTTP_TIMEOUT_MS },
      );
      return;
    }
    throw err;
  }
}

/**
 * Отправить HTML-алерт во все настроенные чаты.
 * @param {string} htmlText
 * @param {{ dedupKey?: string }} [options]
 */
export async function sendOpsAlert(htmlText, options = {}) {
  if (!getToken() || !isOpsEnabled()) return false;
  if (options.dedupKey && shouldDedup(options.dedupKey)) return false;
  if (!(await ensureTelegramApi())) return false;

  let chatIds = getEffectiveAlertChatIds();
  if (!chatIds.length) {
    console.warn('telegram ops: нет TELEGRAM_CHAT_ID — напишите боту /whoami в группе');
    return false;
  }

  let sent = 0;
  for (const chatId of chatIds) {
    try {
      await postTelegramMessage(chatId, htmlText);
      sent += 1;
      runtimeAlertChatIds.add(chatId);
    } catch (err) {
      const detail = err.response?.data?.description || err.message;
      console.warn(`telegram ops → ${chatId}: ${detail}`);
      if (err.response?.status === 401) {
        disableTelegramApi('sendMessage 401');
        break;
      }
    }
  }
  return sent > 0;
}

/** Fire-and-forget обёртка: не блокирует API-ответ. */
export function fireOpsAlert(promiseOrFn) {
  setImmediate(() => {
    void Promise.resolve()
      .then(() => (typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn))
      .catch((err) => console.warn('telegram ops:', err?.message || err));
  });
}

export function buildKycPendingMessage(data = {}) {
  const userId = data.userId ?? data.user_id ?? '—';
  const name = escapeHtml(displayName(data.user || data.name || data.userName));
  const role = escapeHtml(data.role || data.user?.role || 'buyer');
  const docType = escapeHtml(data.documentType || data.document_type || '—');
  const docId = data.documentId ?? data.document_id;
  return [
    '🛡 <b>KYC на проверке</b>',
    `Пользователь #${escapeHtml(userId)} · ${name}`,
    `Роль: ${role}`,
    `Документ: ${docType}${docId != null ? ` (#${escapeHtml(docId)})` : ''}`,
    'Админка → Модерация',
  ].join('\n');
}

export function buildPropertyPendingMessage(data = {}) {
  const propertyId = data.propertyId ?? data.id ?? '—';
  const title = escapeHtml(data.title || data.propertyTitle || 'без названия');
  const type = escapeHtml(data.propertyType || data.property_type || '—');
  const isAuction =
    data.isAuction === 1 ||
    data.isAuction === true ||
    data.is_auction === 1 ||
    data.is_auction === true;
  const userId = data.userId ?? data.user_id ?? '—';
  return [
    '🏠 <b>Объект на модерации</b>',
    `#${escapeHtml(propertyId)} «${title}»`,
    `Тип: ${type} · Аукцион: ${isAuction ? 'да' : 'нет'}`,
    `Продавец: #${escapeHtml(userId)}`,
    'Админка → Модерация → Объекты',
  ].join('\n');
}

export function buildPurchaseRequestMessage(data = {}) {
  const requestId = data.requestId ?? data.id ?? '—';
  const title = escapeHtml(data.propertyTitle || data.title || '—');
  const amount = formatMoney(data.amount ?? data.propertyPrice, data.currency || data.propertyCurrency);
  const buyer = escapeHtml(data.buyerName || displayName(data.buyer) || '—');
  const phone = escapeHtml(data.buyerPhone || data.phone || '—');
  const status = escapeHtml(data.status || 'pending');
  return [
    `🛒 <b>Запрос на покупку</b> #${escapeHtml(requestId)}`,
    `«${title}»`,
    `Цена: ${escapeHtml(amount)}`,
    `Покупатель: ${buyer} · ${phone}`,
    `Статус: ${status}`,
    'Админка → Запросы на покупку',
  ].join('\n');
}

export function buildReservationPaidMessage(data = {}) {
  const requestId = data.purchaseRequestId ?? data.requestId ?? '—';
  const propertyId = data.propertyId ?? '—';
  const buyerId = data.buyerId ?? '—';
  const sellerId = data.sellerId ?? '—';
  const title = data.propertyTitle ? ` «${escapeHtml(data.propertyTitle)}»` : '';
  return [
    '💳 <b>Резерв оплачен — нужна финализация</b>',
    `Заявка #${escapeHtml(requestId)} · объект #${escapeHtml(propertyId)}${title}`,
    `Покупатель #${escapeHtml(buyerId)} · продавец #${escapeHtml(sellerId)}`,
    'Админка → Запросы на покупку → завершить сделку',
  ].join('\n');
}

export function buildBidMessage(data = {}) {
  const propertyId = data.propertyId ?? data.property_id ?? '—';
  const title = escapeHtml(data.title || data.propertyTitle || '—');
  const amount = formatMoney(data.amount ?? data.bid_amount, data.currency || 'EUR');
  const userId = data.userId ?? data.user_id ?? '—';
  const name = data.userName || data.bidderName || displayName(data.user);
  const who =
    name && name !== '—'
      ? `#${escapeHtml(userId)} · ${escapeHtml(name)}`
      : `#${escapeHtml(userId)}`;
  return [
    '🔨 <b>Ставка</b>',
    `Лот #${escapeHtml(propertyId)} «${title}»`,
    `Сумма: ${escapeHtml(amount)}`,
    `Участник: ${who}`,
  ].join('\n');
}

export function buildAuctionWonMessage(data = {}) {
  const propertyId = data.propertyId ?? '—';
  const title = escapeHtml(data.title || data.propertyTitle || '—');
  const amount = formatMoney(data.amount ?? data.winning_bid_amount, data.currency || 'EUR');
  const userId = data.userId ?? data.user_id ?? '—';
  const due = data.depositDueDate
    ? escapeHtml(
        typeof data.depositDueDate === 'string'
          ? data.depositDueDate
          : new Date(data.depositDueDate).toISOString(),
      )
    : '—';
  return [
    '🏆 <b>Победа в аукционе</b>',
    `Лот #${escapeHtml(propertyId)} «${title}»`,
    `Ставка: ${escapeHtml(amount)} · победитель #${escapeHtml(userId)}`,
    `Депозит до: ${due}`,
  ].join('\n');
}

export async function notifyKycPending(data) {
  return sendOpsAlert(buildKycPendingMessage(data), {
    dedupKey: `kyc:${data?.documentId ?? data?.document_id ?? ''}:${data?.userId ?? data?.user_id ?? ''}`,
  });
}

export async function notifyPropertyPending(data) {
  return sendOpsAlert(buildPropertyPendingMessage(data), {
    dedupKey: `property-pending:${data?.propertyId ?? data?.id ?? ''}`,
  });
}

export async function notifyPurchaseRequest(data) {
  return sendOpsAlert(buildPurchaseRequestMessage(data), {
    dedupKey: `purchase:${data?.requestId ?? data?.id ?? ''}`,
  });
}

export async function notifyReservationPaid(data) {
  return sendOpsAlert(buildReservationPaidMessage(data), {
    dedupKey: `reservation-paid:${data?.purchaseRequestId ?? data?.requestId ?? ''}:${data?.propertyId ?? ''}`,
  });
}

export async function notifyBid(data) {
  if (!getNotifyAllBids()) return false;
  const amount = Number(data?.amount ?? data?.bid_amount);
  const bidMin = getBidMinAmount();
  if (bidMin > 0 && Number.isFinite(amount) && amount < bidMin) {
    return false;
  }
  return sendOpsAlert(buildBidMessage(data), {
    dedupKey: `bid:${data?.bidId ?? data?.bid_id ?? ''}:${data?.propertyId ?? ''}:${amount}`,
  });
}

export async function notifyAuctionWon(data) {
  return sendOpsAlert(buildAuctionWonMessage(data), {
    dedupKey: `auction-won:${data?.propertyId ?? ''}:${data?.userId ?? ''}`,
  });
}

export function buildLiveChatMessage(data = {}) {
  const from = escapeHtml(liveChatFromLabel(data));
  const when = escapeHtml(
    formatOpsDateTime(data.createdAt || data.created_at || data.when || Date.now()),
  );
  const preview = escapeHtml(previewText(data.text || data.body || data.preview));
  const email = data.clientEmail || data.client_email || data.leadEmail || data.lead_email;
  const phone = data.clientPhone || data.client_phone;
  const lines = [
    '💬 <b>Новое сообщение в поддержку</b>',
    '',
    `От: ${from}`,
  ];
  if (email) lines.push(`Email: ${escapeHtml(email)}`);
  if (phone) lines.push(`Телефон: ${escapeHtml(phone)}`);
  lines.push(`Когда: ${when}`);
  lines.push('');
  lines.push(`Сообщение: ${preview}`);
  return lines.join('\n');
}

export async function notifyLiveChat(data) {
  const sessionId = data?.sessionId ?? data?.session_id ?? '';
  const messageId = data?.messageId ?? data?.message_id ?? data?.id ?? '';
  return sendOpsAlert(buildLiveChatMessage(data), {
    dedupKey: `live-chat:${sessionId}:${messageId}`,
  });
}

async function replyToChat(chatId, text) {
  try {
    await postTelegramMessage(chatId, text);
  } catch (err) {
    console.warn('telegram ops reply:', err.message);
  }
}

async function handleBotCommand(msg) {
  const text = String(msg.text || '').trim();
  if (!text.startsWith('/')) return;
  const [cmdRaw] = text.split(/\s+/);
  const cmd = cmdRaw.split('@')[0].toLowerCase();
  const chat = msg.chat || {};
  const chatId = String(chat.id);

  if (cmd === '/start' || cmd === '/help') {
    await replyToChat(
      chatId,
      [
        'SellYourBrick ops-бот',
        '',
        'Шлёт в этот чат алерты: KYC, объекты на модерации, Buy Now, ставки, чат поддержки.',
        '',
        'Команды:',
        '/whoami — показать chat id и зарегистрировать чат',
        '/status — статус ops-алертов',
      ].join('\n'),
    );
    registerAlertChat(chatId, {
      type: chat.type,
      title: chat.title || chat.first_name || '',
    });
    return;
  }

  if (cmd === '/whoami') {
    registerAlertChat(chatId, {
      type: chat.type,
      title: chat.title || chat.first_name || '',
    });
    await replyToChat(
      chatId,
      [
        `chat.id = <code>${escapeHtml(chatId)}</code>`,
        `type = ${escapeHtml(chat.type || '—')}`,
        '',
        'Чат зарегистрирован для алертов.',
        'Можно также прописать в .env:',
        `TELEGRAM_CHAT_ID=${escapeHtml(chatId)}`,
      ].join('\n'),
    );
    return;
  }

  if (cmd === '/status') {
    const ids = getEffectiveAlertChatIds();
    const uptimeSec = Math.floor(process.uptime());
    const TOKEN = getToken();
    await replyToChat(
      chatId,
      [
        '<b>Ops status</b>',
        `alerts: ${isOpsEnabled() && TOKEN ? 'on' : 'off'}`,
        `bot: ${escapeHtml(botUsername || '—')}`,
        `chats: ${ids.length ? escapeHtml(ids.join(', ')) : 'none'}`,
        `uptime: ${uptimeSec}s`,
        `bid min: ${getBidMinAmount() || 0}`,
        `notify all bids: ${getNotifyAllBids() ? 'yes' : 'no'}`,
      ].join('\n'),
    );
  }
}

/**
 * Long-poll команд (/whoami, /status). Алерты от него не зависят.
 */
export function startOpsBotCommands() {
  const TOKEN = getToken();
  if (!TOKEN || !isOpsEnabled() || updatesStarted) return;
  updatesStarted = true;

  const poll = async () => {
    if (pollRunning) return;
    pollRunning = true;
    try {
      if (!(await ensureTelegramApi())) return;
      const token = getToken();
      const { data } = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`, {
        params: {
          offset: pollOffset,
          timeout: 25,
          allowed_updates: ['message', 'my_chat_member'],
        },
        timeout: 35000,
        validateStatus: () => true,
      });
      if (!data.ok) {
        if (data.error_code === 401) disableTelegramApi('getUpdates 401');
        return;
      }
      for (const update of data.result || []) {
        pollOffset = Math.max(pollOffset, (update.update_id || 0) + 1);
        const chat = update.message?.chat || update.my_chat_member?.chat;
        if (chat?.id) {
          registerAlertChat(chat.id, {
            type: chat.type,
            title: chat.title || chat.first_name || '',
          });
        }
        if (update.message?.text) {
          await handleBotCommand(update.message);
        }
      }
    } catch (err) {
      console.warn('telegram ops poll:', err.message);
    } finally {
      pollRunning = false;
    }
  };

  void poll();
  setInterval(() => {
    void poll();
  }, 3000);
  console.log('📱 Telegram ops: long-poll команд запущен (/whoami, /status)');
}

export function getOpsStatus() {
  return {
    tokenPresent: Boolean(getToken()),
    enabled: isOpsEnabled(),
    configured: isConfigured(),
    apiOk: telegramApiOk,
    botUsername,
    chatIds: getEffectiveAlertChatIds(),
    bidMinAmount: getBidMinAmount(),
    notifyAllBids: getNotifyAllBids(),
  };
}
