/**
 * Мост отправки WhatsApp: server.js регистрирует клиент, остальные модули шлют текст.
 * Так stripeBilling не импортирует server.js.
 */
let sendDigitsImpl = async () => ({ ok: false, error: 'not_registered' });
let managerDigitsImpl = () => '';

export function registerWhatsAppDigitsSender(fn) {
  if (typeof fn === 'function') sendDigitsImpl = fn;
}

export async function sendWhatsAppDigits(rawPhoneDigits, messageText) {
  return sendDigitsImpl(rawPhoneDigits, messageText);
}

/** Номер сессии из админки (QR / pairing), чтобы stripeBilling не импортировал server.js. */
export function registerWhatsAppManagerDigitsGetter(fn) {
  if (typeof fn === 'function') managerDigitsImpl = fn;
}

/** Международный номер без +: 8–15 цифр. LID WhatsApp отбрасываем. */
export function normalizeWhatsAppChatDigits(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return '';
  return digits;
}

/**
 * Номер менеджера для wa.me: сначала подключённая в админке сессия,
 * иначе WHATSAPP_MANAGER_NUMBER из env.
 */
export function getWhatsAppManagerDigits() {
  try {
    const fromSession = normalizeWhatsAppChatDigits(managerDigitsImpl());
    if (fromSession) return fromSession;
  } catch {
    /* ignore */
  }
  return normalizeWhatsAppChatDigits(process.env.WHATSAPP_MANAGER_NUMBER || '');
}

export function buildWhatsAppChatUrl(digits, prefillText) {
  const d = normalizeWhatsAppChatDigits(digits);
  if (!d) return '';
  const base = `https://wa.me/${d}`;
  const text = String(prefillText || '').trim();
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}
