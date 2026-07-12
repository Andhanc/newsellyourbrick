import Stripe from 'stripe';
import crypto from 'crypto';
import {
  stripeSubscriptionQueries,
  propertyQueries,
  purchaseRequestQueries,
  userQueries,
  sharePurchaseQueries,
  reservationSignatureQueries,
  notificationQueries,
  testDriveBookingQueries,
} from './database/database.js';
import { getPrisma } from './database/prismaClient.js';
import { propertyRowAllowsTestDriveListing } from './testDriveListingRules.js';

/**
 * Stripe Checkout + webhook + синхронизация подписки Pro.
 * STRIPE_SECRET_KEY, STRIPE_PRICE_ID_PRO, STRIPE_PRICE_ID_PRO_YEAR, FRONTEND_URL;
 * STRIPE_PRICE_ID_PRO — Price ID (price_...) с валютой EUR в Stripe Dashboard (Checkout берёт валюту из цены);
 * STRIPE_PRICE_ID_PRO_YEAR — Price ID (price_...) для годовой подписки Pro (обычно со скидкой);
 * STRIPE_PRICE_ID_VIP / STRIPE_PRICE_ID_VIP_YEAR — подписка VIP (закрытый клуб), EUR;
 * STRIPE_PRICE_ID_DEPOSIT — price_... или prod_... (для prod подставится активная recurring-цена);
 * опционально STRIPE_WEBHOOK_SECRET для POST /api/webhooks/stripe
 * опционально STRIPE_LISTING_PUBLICATION_FEE_EUR (по умолчанию 29) — оплата публикации объявления
 *
 * Резерв 10% (динамическая сумма): Checkout mode=payment + line_items[].price_data —
 * отдельный Product/Price в Dashboard под каждую сумму не нужен.
 */

function getStripe() {
  const secret = (process.env.STRIPE_SECRET_KEY || '').trim();
  return secret ? new Stripe(secret) : null;
}

/** Валюты без дробной части в Stripe (unit_amount = основные единицы). */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
]);

function majorToStripeMinor(amountMajor, currency) {
  const c = String(currency || 'usd').toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(c)) {
    return Math.max(1, Math.round(Number(amountMajor) || 0));
  }
  return Math.max(1, Math.round((Number(amountMajor) || 0) * 100));
}

/** Минимальная цена продажи: явное поле minimum_sale_price, иначе fallback на price (старые объявления). */
function computeMinimumSalePriceMajor(property) {
  const minExplicit = Number(property?.minimum_sale_price) || 0;
  if (Number.isFinite(minExplicit) && minExplicit > 0) return minExplicit;
  const price = Number(property?.price) || 0;
  return Number.isFinite(price) && price > 0 ? price : 0;
}

function parseTestDrivePricing(property) {
  if (!property) {
    return { dailyPrice: 0, insuranceDeposit: 0 };
  }
  let raw = property.test_drive_data;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  const dailyPrice = Number(raw?.price_per_day) || 0;
  const insuranceDeposit = Number(raw?.insurance_deposit) || 0;
  return { dailyPrice, insuranceDeposit };
}

function isValidYmd(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function calcDayCountInclusive(startYmd, endYmd) {
  const s = new Date(`${startYmd}T12:00:00`);
  const e = new Date(`${endYmd}T12:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return null;
  return Math.round((e - s) / (24 * 60 * 60 * 1000)) + 1;
}

const TEST_DRIVE_CONTACT_CHANNELS = new Set(['telegram', 'whatsapp', 'email']);

function normalizeTestDriveContactChannel(raw) {
  const v = String(raw || '')
    .trim()
    .toLowerCase();
  if (TEST_DRIVE_CONTACT_CHANNELS.has(v)) return v;
  return '';
}

const SHARE_PURCHASE_POLICY_VERSION = 'share_policy_test_v1';
const RESERVATION_POLICY_VERSION = 'buy_now_reservation_v1';
const FX_CACHE_TTL_MS = 10 * 60 * 1000;

const SIGNATURE_DATA_URL_MAX_CHARS = 750_000;
const AGREEMENT_SIGNATURE_STORE_MAX_CHARS = 900_000;

function firstReservationPropertyPhotoUrl(property) {
  if (!property) return null;
  const photos = property.photos;
  const list = Array.isArray(photos) ? photos : [];
  const first = list[0];
  if (first == null) return null;
  if (typeof first === 'string') return first;
  if (typeof first === 'object' && first.url) return String(first.url);
  return null;
}

function validateShareSignatureDataUrl(raw) {
  if (typeof raw !== 'string' || raw.length < 80) {
    return { ok: false, error: 'Подпись не передана' };
  }
  if (raw.length > SIGNATURE_DATA_URL_MAX_CHARS) {
    return { ok: false, error: 'Изображение подписи слишком большое' };
  }
  const lower = raw.slice(0, 40).toLowerCase();
  if (
    !lower.startsWith('data:image/png;base64,') &&
    !lower.startsWith('data:image/jpeg;base64,') &&
    !lower.startsWith('data:image/jpg;base64,')
  ) {
    return { ok: false, error: 'Подпись должна быть в формате PNG или JPEG (data URL)' };
  }
  const comma = raw.indexOf(',');
  if (comma < 12) return { ok: false, error: 'Некорректный формат подписи' };
  const b64 = raw.slice(comma + 1).replace(/\s/g, '');
  if (b64.length < 20) return { ok: false, error: 'Пустая подпись' };
  return { ok: true };
}

function isShareSaleProperty(property) {
  if (!property) return false;
  const st = property.sale_type != null ? String(property.sale_type).toLowerCase() : '';
  const iso = property.is_shared_ownership === 1 || property.is_shared_ownership === '1';
  return iso || st === 'share';
}

/**
 * После успешной оплаты долей: запись property_shares + shares_sold (идемпотентно по session.id).
 */
export async function processSharePurchasePaidSession(stripe, session) {
  if (!stripe || !session?.id) {
    return { ok: false, error: 'invalid_session' };
  }
  let sess = session;
  try {
    sess = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['payment_intent'],
    });
  } catch (e) {
    console.error('[Stripe] share purchase retrieve session:', e?.message || e);
    return { ok: false, error: 'retrieve_failed' };
  }

  if (sess.mode !== 'payment') {
    return { ok: false, error: 'not_payment_mode' };
  }
  if (sess.metadata?.checkout_purpose !== 'share_purchase') {
    return { ok: false, error: 'wrong_purpose' };
  }

  const piObj =
    sess.payment_intent && typeof sess.payment_intent === 'object' ? sess.payment_intent : null;
  const paidOk =
    sess.payment_status === 'paid' ||
    sess.payment_status === 'no_payment_required' ||
    piObj?.status === 'succeeded';
  if (!paidOk) {
    return { ok: false, error: 'not_paid' };
  }

  const userId = parseInt(sess.metadata?.app_user_id || '', 10);
  const propertyId = parseInt(sess.metadata?.property_id || '', 10);
  const propertyType = sess.metadata?.property_type != null ? String(sess.metadata.property_type).trim() : '';
  const sharesCount = parseInt(sess.metadata?.shares_count || '', 10);
  const expectedCents = parseInt(sess.metadata?.total_cents || '', 10);
  const useWalletDeposit = sess.metadata?.use_wallet_deposit === '1';
  const signingIntentId =
    sess.metadata?.signing_intent_id != null ? String(sess.metadata.signing_intent_id).trim() : '';
  const agreementSignatureLegacy =
    sess.metadata?.agreement_signature != null ? String(sess.metadata.agreement_signature) : '';
  const policyVersion =
    sess.metadata?.policy_version != null ? String(sess.metadata.policy_version) : SHARE_PURCHASE_POLICY_VERSION;
  const pricePerShareMajor = parseFloat(sess.metadata?.price_per_share_major || '');
  const totalPriceMajor = parseFloat(sess.metadata?.total_price_major || '');

  if (!Number.isFinite(userId) || !Number.isFinite(propertyId) || !propertyType) {
    return { ok: false, error: 'bad_metadata' };
  }
  if (!Number.isFinite(sharesCount) || sharesCount < 1) {
    return { ok: false, error: 'bad_shares_count' };
  }
  if (!signingIntentId && agreementSignatureLegacy.length < 2) {
    return { ok: false, error: 'bad_metadata' };
  }

  const existing = await sharePurchaseQueries.findByStripeSessionId(sess.id);
  if (existing) {
    return { ok: true, already: true };
  }

  if (Number.isFinite(expectedCents) && sess.amount_total != null) {
    const diff = Math.abs(sess.amount_total - expectedCents);
    const tol = Math.max(2, Math.round(expectedCents * 0.03));
    if (diff > tol) {
      console.warn('[Stripe] share purchase: amount differs from metadata', {
        amount_total: sess.amount_total,
        expectedCents,
        diff,
      });
    }
  }

  const property = await propertyQueries.getById(propertyId, propertyType);
  if (!property) {
    return { ok: false, error: 'property_not_found' };
  }
  if (!isShareSaleProperty(property)) {
    return { ok: false, error: 'not_share_property' };
  }

  const curNorm = normalizeStripeCurrency(property.currency || sess.currency || 'usd');
  if (!curNorm.ok) {
    return { ok: false, error: curNorm.error };
  }
  const currency = curNorm.currency;

  const totalShares = property.total_shares != null ? Number(property.total_shares) : 0;
  const sharesSold = property.shares_sold != null ? Number(property.shares_sold) : 0;
  if (!(totalShares > 0) || sharesSold + sharesCount > totalShares) {
    return { ok: false, error: 'no_inventory' };
  }

  const objectPrice = Number(property.price) || 0;
  const pricePerShareComputed = totalShares > 0 ? objectPrice / totalShares : 0;
  const totalComputed = pricePerShareComputed * sharesCount;

  if (!(pricePerShareComputed > 0) || !(totalComputed > 0)) {
    return { ok: false, error: 'invalid_pricing' };
  }

  const tolMajor = Math.max(0.01, totalComputed * 0.02);
  if (
    Number.isFinite(pricePerShareMajor) &&
    Math.abs(pricePerShareMajor - pricePerShareComputed) > tolMajor
  ) {
    console.warn('[Stripe] share purchase: price_per_share metadata mismatch', {
      pricePerShareMajor,
      pricePerShareComputed,
    });
  }
  if (Number.isFinite(totalPriceMajor) && Math.abs(totalPriceMajor - totalComputed) > tolMajor) {
    console.warn('[Stripe] share purchase: total_price metadata mismatch', {
      totalPriceMajor,
      totalComputed,
    });
  }

  try {
    if (useWalletDeposit) {
      await withdrawDepositWithLog(
        userId,
        WALLET_DEPOSIT_OFFSET_EUR,
        'Покупка долей: списание 3000 € с депозита'
      );
    }

    await sharePurchaseQueries.completePurchaseFromStripeSession({
      stripeSessionId: sess.id,
      signingIntentId: signingIntentId || null,
      buyerId: userId,
      propertyId,
      propertyType,
      sharesCount,
      pricePerShare: pricePerShareComputed,
      totalPrice: totalComputed,
      currency: currency.toUpperCase(),
      agreementSignature: signingIntentId ? '' : agreementSignatureLegacy,
      policyVersion,
    });
    return { ok: true };
  } catch (e) {
    const msg = e?.message || 'process_failed';
    console.error('[Stripe] processSharePurchasePaidSession:', msg);
    if (useWalletDeposit && msg !== 'insufficient_deposit') {
      try {
        const prisma = getPrisma();
        const u = await userQueries.getById(userId);
        const dep = u?.deposit_amount != null ? parseFloat(String(u.deposit_amount)) || 0 : 0;
        await prisma.users.update({
          where: { id: Number(userId) },
          data: { deposit_amount: dep + WALLET_DEPOSIT_OFFSET_EUR, updated_at: new Date() },
        });
      } catch (rollbackErr) {
        console.error('[Stripe] share purchase wallet rollback failed:', rollbackErr?.message || rollbackErr);
      }
    }
    if (msg === 'share_inventory_exhausted') {
      return { ok: false, error: 'share_inventory_exhausted' };
    }
    if (msg === 'insufficient_deposit') {
      return { ok: false, error: 'insufficient_deposit' };
    }
    return { ok: false, error: msg };
  }
}

/** Списание 3000 EUR с кошелька депозита при оплате резерва (только с EUR-объявлениями). */
const WALLET_DEPOSIT_OFFSET_EUR = 3000;
const fxRateCache = new Map();

function scheduledSurveyWhatsAppAtIso(startYmd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(startYmd || '').trim());
  if (!m) return new Date().toISOString();
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo, d, 9, 0, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + 3);
  return dt.toISOString();
}

function roundMoneyMajor(amount) {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

async function getEurToCurrencyRate(currency) {
  const target = String(currency || 'eur')
    .trim()
    .toLowerCase();
  if (!target || target === 'eur') return 1;

  const cached = fxRateCache.get(target);
  const now = Date.now();
  if (cached && cached.expiresAt > now && Number.isFinite(cached.rate) && cached.rate > 0) {
    return cached.rate;
  }

  const resp = await fetch('https://open.er-api.com/v6/latest/EUR');
  if (!resp.ok) {
    throw new Error('fx_rate_fetch_failed');
  }
  const payload = await resp.json();
  const rawRate = payload?.rates?.[target.toUpperCase()];
  const rate = Number(rawRate);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('fx_rate_invalid');
  }
  fxRateCache.set(target, { rate, expiresAt: now + FX_CACHE_TTL_MS });
  return rate;
}

async function convertEurToCurrencyMajor(amountEur, currency) {
  const rate = await getEurToCurrencyRate(currency);
  return { rate, amountMajor: roundMoneyMajor((Number(amountEur) || 0) * rate) };
}

async function convertCurrencyMajor(amount, fromCurrency, toCurrency) {
  const from = String(fromCurrency || 'eur')
    .trim()
    .toLowerCase();
  const to = String(toCurrency || 'eur')
    .trim()
    .toLowerCase();
  const amountNum = Number(amount) || 0;
  if (!from || !to) throw new Error('fx_currency_invalid');
  if (from === to) return { rate: 1, amountMajor: roundMoneyMajor(amountNum) };
  if (from === 'eur') {
    const rate = await getEurToCurrencyRate(to);
    return { rate, amountMajor: roundMoneyMajor(amountNum * rate) };
  }
  if (to === 'eur') {
    const eurToFromRate = await getEurToCurrencyRate(from);
    if (!Number.isFinite(eurToFromRate) || eurToFromRate <= 0) throw new Error('fx_rate_invalid');
    return { rate: 1 / eurToFromRate, amountMajor: roundMoneyMajor(amountNum / eurToFromRate) };
  }
  const eurToFromRate = await getEurToCurrencyRate(from);
  const eurToToRate = await getEurToCurrencyRate(to);
  if (!Number.isFinite(eurToFromRate) || eurToFromRate <= 0) throw new Error('fx_rate_invalid');
  if (!Number.isFinite(eurToToRate) || eurToToRate <= 0) throw new Error('fx_rate_invalid');
  const amountEur = amountNum / eurToFromRate;
  return { rate: eurToToRate / eurToFromRate, amountMajor: roundMoneyMajor(amountEur * eurToToRate) };
}

function normalizeStripeCurrency(raw) {
  const c = String(raw || 'usd')
    .trim()
    .toLowerCase();
  if (!c) return { ok: false, error: 'Пустая валюта объекта' };
  if (c === 'byn' || c === 'rub') {
    return {
      ok: false,
      error:
        'Для оплаты через Stripe укажите валюту объекта EUR или USD (BYN/RUB в Stripe не поддерживаются)',
    };
  }
  return { ok: true, currency: c };
}

function minStripeUnitAmount(currency) {
  const c = String(currency || '').toLowerCase();
  return ZERO_DECIMAL_CURRENCIES.has(c) ? 1 : 50;
}

const LISTING_PUBLICATION_FEE_MAJOR_EUR = (() => {
  const n = Number(String(process.env.STRIPE_LISTING_PUBLICATION_FEE_EUR || '29').trim());
  return Number.isFinite(n) && n > 0 ? n : 29;
})();

/**
 * Разовая оплата публикации объявления (фикс. EUR) — идемпотентная запись в stripe_payments.
 */
export async function processListingPublicationFeePaidSession(stripe, session) {
  if (!stripe || !session?.id) {
    return { ok: false, error: 'invalid_session' };
  }
  let sess = session;
  try {
    sess = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['payment_intent'],
    });
  } catch (e) {
    console.error('[Stripe] listing publication retrieve session:', e?.message || e);
    return { ok: false, error: 'retrieve_failed' };
  }

  if (sess.mode !== 'payment') {
    return { ok: false, error: 'not_payment_mode' };
  }
  if (sess.metadata?.checkout_purpose !== 'listing_publication_fee') {
    return { ok: false, error: 'wrong_purpose' };
  }
  const piObj =
    sess.payment_intent && typeof sess.payment_intent === 'object' ? sess.payment_intent : null;
  const paidOk =
    sess.payment_status === 'paid' ||
    sess.payment_status === 'no_payment_required' ||
    piObj?.status === 'succeeded';
  if (!paidOk) {
    return { ok: false, error: 'not_paid' };
  }

  const userId = parseInt(sess.metadata?.app_user_id || '', 10);
  const metaCents = parseInt(sess.metadata?.listing_fee_cents || '', 10);
  const feeCents = majorToStripeMinor(LISTING_PUBLICATION_FEE_MAJOR_EUR, 'eur');
  if (!Number.isFinite(userId) || userId < 1) {
    return { ok: false, error: 'bad_metadata' };
  }
  if (Number.isFinite(metaCents) && metaCents !== feeCents) {
    return { ok: false, error: 'bad_metadata' };
  }

  const existing = await stripeSubscriptionQueries.hasPaymentByDedupeKey(sess.id);
  if (existing) {
    return { ok: true, already: true };
  }

  if (sess.amount_total != null && Number.isFinite(feeCents)) {
    const diff = Math.abs(sess.amount_total - feeCents);
    const tol = Math.max(2, Math.round(feeCents * 0.03));
    if (diff > tol) {
      console.warn('[Stripe] listing publication: paid amount differs from expected fee', {
        amount_total: sess.amount_total,
        feeCents,
        diff,
      });
    }
  }

  const buyer = await userQueries.getById(userId);
  if (!buyer) {
    return { ok: false, error: 'user_not_found' };
  }

  const customerId =
    typeof sess.customer === 'string' ? sess.customer : sess.customer?.id || null;
  const stripeCents = sess.amount_total != null ? sess.amount_total : feeCents;

  const insertRes = await stripeSubscriptionQueries.insertPayment({
    dedupe_key: sess.id,
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: null,
    stripe_invoice_id: null,
    stripe_checkout_session_id: sess.id,
    amount_cents: stripeCents,
    currency: 'eur',
    status: 'paid',
    plan_key: 'listing_publication_fee',
    billing_reason: JSON.stringify({
      type: 'listing_publication_fee',
      fee_eur: LISTING_PUBLICATION_FEE_MAJOR_EUR,
    }),
    agreement_signature: null,
    agreement_policy_version: null,
    paid_at: new Date().toISOString(),
    period_start: null,
    period_end: null,
    customer_email: sess.customer_details?.email || sess.customer_email || buyer.email || null,
  });

  if (insertRes?.changes === 0) {
    return { ok: true, already: true };
  }
  return { ok: true };
}

/**
 * После успешной оплаты резерва 10%: запрос на покупку (processing) + бронь объекта + запись в stripe_payments.
 */
export async function processPropertyReservationPaidSession(stripe, session) {
  if (!stripe || !session?.id) {
    return { ok: false, error: 'invalid_session' };
  }
  let sess = session;
  try {
    sess = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['payment_intent'],
    });
  } catch (e) {
    console.error('[Stripe] retrieve checkout session:', e?.message || e);
    return { ok: false, error: 'retrieve_failed' };
  }

  if (sess.mode !== 'payment') {
    return { ok: false, error: 'not_payment_mode' };
  }
  if (sess.metadata?.checkout_purpose !== 'property_reservation_deposit') {
    return { ok: false, error: 'wrong_purpose' };
  }
  const piObj =
    sess.payment_intent && typeof sess.payment_intent === 'object' ? sess.payment_intent : null;
  const paidOk =
    sess.payment_status === 'paid' ||
    sess.payment_status === 'no_payment_required' ||
    piObj?.status === 'succeeded';
  if (!paidOk) {
    return { ok: false, error: 'not_paid' };
  }

  const userId = parseInt(sess.metadata?.app_user_id || '', 10);
  const propertyId = parseInt(sess.metadata?.property_id || '', 10);
  const expectedDepositCents = parseInt(sess.metadata?.deposit_cents || '', 10);
  if (!Number.isFinite(userId) || !Number.isFinite(propertyId)) {
    return { ok: false, error: 'bad_metadata' };
  }

  const existing = await stripeSubscriptionQueries.hasPaymentByDedupeKey(sess.id);
  if (existing) {
    return { ok: true, already: true };
  }

  if (Number.isFinite(expectedDepositCents) && sess.amount_total != null) {
    const diff = Math.abs(sess.amount_total - expectedDepositCents);
    const tol = Math.max(2, Math.round(expectedDepositCents * 0.03));
    if (diff > tol) {
      console.warn('[Stripe] property reservation: amount differs from metadata (trusting Stripe paid total)', {
        amount_total: sess.amount_total,
        expectedDepositCents,
        diff,
      });
    }
  }

  const property = await propertyQueries.getById(propertyId);
  if (!property) {
    return { ok: false, error: 'property_not_found' };
  }

  const useWallet = sess.metadata?.use_wallet_deposit === '1';
  const curLower = (sess.currency || property.currency || 'eur').toString().toLowerCase();

  const buyer = await userQueries.getById(userId);
  const buyerName = buyer
    ? `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim().slice(0, 200) ||
      `Покупатель #${userId}`
    : `Покупатель #${userId}`;
  const buyerEmail = buyer?.email || sess.customer_email || null;
  const buyerPhone = buyer?.phone_number || null;

  const sellerId = property.user_id != null ? property.user_id : null;
  let sellerName = null;
  let sellerEmail = null;
  let sellerPhone = null;
  if (sellerId) {
    const seller = await userQueries.getById(sellerId);
    if (seller) {
      sellerName = `${seller.first_name || ''} ${seller.last_name || ''}`.trim() || null;
      sellerEmail = seller.email || null;
      sellerPhone = seller.phone_number || null;
    }
  }

  const minSaleMajorBase = computeMinimumSalePriceMajor(property);
  if (!(minSaleMajorBase > 0)) {
    return { ok: false, error: 'invalid_minimum_price' };
  }
  const propertyCurrencyNorm = normalizeStripeCurrency(property.currency || curLower);
  const propertyCurrency = propertyCurrencyNorm.ok ? propertyCurrencyNorm.currency : curLower;
  let minSaleMajor = minSaleMajorBase;
  if (propertyCurrency !== curLower) {
    try {
      const converted = await convertCurrencyMajor(minSaleMajorBase, propertyCurrency, curLower);
      minSaleMajor = converted.amountMajor;
    } catch (e) {
      console.warn('[Stripe] reservation billing convert minSale:', e?.message || e);
    }
  }
  const tenPctMajor = roundMoneyMajor(minSaleMajor * 0.1);
  const walletEurApplied = useWallet ? WALLET_DEPOSIT_OFFSET_EUR : 0;
  const walletAppliedMajorRaw = Number.parseFloat(String(sess.metadata?.wallet_applied_major || ''));
  const walletAppliedMajor =
    useWallet && Number.isFinite(walletAppliedMajorRaw)
      ? Math.max(0, walletAppliedMajorRaw)
      : useWallet && curLower === 'eur'
        ? WALLET_DEPOSIT_OFFSET_EUR
        : 0;

  const signingIntentId =
    sess.metadata?.signing_intent_id != null ? String(sess.metadata.signing_intent_id).trim() : '';
  if (!signingIntentId || !/^[0-9a-f-]{36}$/i.test(signingIntentId)) {
    return { ok: false, error: 'missing_signing_intent' };
  }
  const propertyTypeForIntent =
    sess.metadata?.property_type != null
      ? String(sess.metadata.property_type).trim().slice(0, 32)
      : String(property.property_type || '').slice(0, 32);

  const sigTake = await reservationSignatureQueries.takeSignatureForPaidSession({
    intentId: signingIntentId,
    sessionId: sess.id,
    buyerId: userId,
    propertyId,
    useWallet,
    propertyType: propertyTypeForIntent,
  });
  if (!sigTake.ok) {
    console.error('[Stripe] reservation signing intent:', sigTake.error);
    return { ok: false, error: sigTake.error || 'reservation_intent_invalid' };
  }
  const agreementSignatureStored = String(sigTake.signature).slice(0, AGREEMENT_SIGNATURE_STORE_MAX_CHARS);

  const customerId =
    typeof sess.customer === 'string' ? sess.customer : sess.customer?.id || null;

  let createdRequestId;
  try {
    if (useWallet) {
      await withdrawDepositWithLog(
        userId,
        WALLET_DEPOSIT_OFFSET_EUR,
        'Резерв 10%: списание 3000 € с депозита'
      );
    }

    try {
      const createResult = await purchaseRequestQueries.create({
        buyerId: String(userId),
        buyerName,
        buyerEmail,
        buyerPhone,
        sellerId,
        sellerName,
        sellerEmail,
        sellerPhone,
        propertyId,
        propertyTitle: property.title || `Объект #${propertyId}`,
        propertyDescription: property.description || null,
        propertyPrice: minSaleMajor,
        propertyCurrency: (property.currency || 'USD').toString().toUpperCase(),
        propertyLocation: property.location || property.address || null,
        propertyType: property.property_type || null,
        propertyArea: property.area != null ? String(property.area) : null,
        requestDate: new Date().toISOString(),
        status: 'processing',
      });

      createdRequestId = createResult?.lastInsertRowid;
      if (!createdRequestId) {
        throw new Error('purchase_request_insert_failed');
      }
    } catch (createErr) {
      if (useWallet) {
        try {
          const prisma = getPrisma();
          const u = await userQueries.getById(userId);
          const dep = u?.deposit_amount != null ? parseFloat(String(u.deposit_amount)) || 0 : 0;
          await prisma.users.update({
            where: { id: Number(userId) },
            data: { deposit_amount: dep + WALLET_DEPOSIT_OFFSET_EUR, updated_at: new Date() },
          });
        } catch (rollbackErr) {
          console.error(
            '[Stripe] wallet rollback after failed purchase_request:',
            rollbackErr?.message || rollbackErr
          );
        }
      }
      throw createErr;
    }

    const stripeCents = sess.amount_total ?? expectedDepositCents;
    const totalPaidTowardPrice = stripeCents / 100 + walletAppliedMajor;
    const remainingToFull = Math.max(0, minSaleMajor - totalPaidTowardPrice);

    const billingPayload = {
      type: 'property_reservation',
      minimum_sale_price: minSaleMajor,
      ten_percent: tenPctMajor,
      paid_stripe_cents: stripeCents,
      wallet_eur_applied: walletEurApplied,
      wallet_applied_major: walletAppliedMajor,
      currency: curLower,
      purchase_request_id: createdRequestId,
      property_id: propertyId,
      property_type: property.property_type || null,
      policy_version: RESERVATION_POLICY_VERSION,
      total_paid_toward_price: totalPaidTowardPrice,
      remaining_to_full_purchase: remainingToFull,
    };

    await stripeSubscriptionQueries.insertPayment({
      dedupe_key: sess.id,
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: null,
      stripe_invoice_id: null,
      stripe_checkout_session_id: sess.id,
      amount_cents: stripeCents,
      currency: curLower,
      status: 'paid',
      plan_key: 'property_reservation',
      billing_reason: JSON.stringify(billingPayload),
      agreement_signature: agreementSignatureStored,
      agreement_policy_version: RESERVATION_POLICY_VERSION,
      paid_at: new Date().toISOString(),
      period_start: null,
      period_end: null,
      customer_email: sess.customer_details?.email || sess.customer_email || buyerEmail,
    });

    try {
      await reservationSignatureQueries.consumeIntent(signingIntentId);
    } catch (consumeErr) {
      console.warn('[Stripe] reservation consume intent:', consumeErr?.message || consumeErr);
    }

    await propertyQueries.reserve(propertyId, userId, createdRequestId);

    return { ok: true };
  } catch (e) {
    console.error('[Stripe] processPropertyReservationPaidSession:', e?.message || e);
    const msg = e?.message || 'process_failed';
    if (msg === 'insufficient_deposit') {
      return { ok: false, error: 'insufficient_deposit' };
    }
    return { ok: false, error: msg };
  }
}

export async function processTestDriveBookingPaidSession(stripe, session) {
  if (!stripe || !session?.id) {
    return { ok: false, error: 'invalid_session' };
  }
  let sess = session;
  try {
    sess = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['payment_intent'],
    });
  } catch (e) {
    console.error('[Stripe] test-drive retrieve checkout session:', e?.message || e);
    return { ok: false, error: 'retrieve_failed' };
  }

  if (sess.mode !== 'payment') return { ok: false, error: 'not_payment_mode' };
  if (sess.metadata?.checkout_purpose !== 'test_drive_booking') {
    return { ok: false, error: 'wrong_purpose' };
  }
  const piObj =
    sess.payment_intent && typeof sess.payment_intent === 'object' ? sess.payment_intent : null;
  const paidOk =
    sess.payment_status === 'paid' ||
    sess.payment_status === 'no_payment_required' ||
    piObj?.status === 'succeeded';
  if (!paidOk) return { ok: false, error: 'not_paid' };

  await testDriveBookingQueries.ensureTable();

  const userId = parseInt(sess.metadata?.app_user_id || '', 10);
  const propertyId = parseInt(sess.metadata?.property_id || '', 10);
  const startDate = String(sess.metadata?.start_date || '');
  const endDate = String(sess.metadata?.end_date || '');
  const propertyTable = String(sess.metadata?.property_table || 'properties_apartments');
  const dayCount = parseInt(sess.metadata?.days_count || '', 10);
  const dailyPrice = Number(sess.metadata?.daily_price || 0);
  const insuranceDeposit = Number(sess.metadata?.insurance_deposit || 0);
  const expectedTotalCents = parseInt(sess.metadata?.total_cents || '', 10);

  if (!Number.isFinite(userId) || !Number.isFinite(propertyId)) {
    return { ok: false, error: 'bad_metadata' };
  }
  if (!isValidYmd(startDate) || !isValidYmd(endDate)) {
    return { ok: false, error: 'bad_dates' };
  }
  if (!Number.isFinite(dayCount) || dayCount < 5 || dayCount > 21) {
    return { ok: false, error: 'bad_day_count' };
  }

  const existingPayment = await stripeSubscriptionQueries.hasPaymentByDedupeKey(sess.id);
  if (existingPayment) return { ok: true, already: true };

  const property = await propertyQueries.getById(propertyId, null);
  if (!property) return { ok: false, error: 'property_not_found' };
  const testDriveEnabled =
    property.test_drive === 1 || property.test_drive === true || property.test_drive === '1';
  if (!testDriveEnabled) return { ok: false, error: 'test_drive_disabled' };
  if (!propertyRowAllowsTestDriveListing(property)) return { ok: false, error: 'test_drive_disabled' };

  const tableResolved = property.source_table || propertyTable || 'properties_apartments';
  const quote = parseTestDrivePricing(property);
  const stayMajor = roundMoneyMajor((Number(quote.dailyPrice) || 0) * dayCount);
  const depMajor = roundMoneyMajor(Number(quote.insuranceDeposit) || 0);
  const totalMajorCombined = roundMoneyMajor(stayMajor + depMajor);
  if (!(stayMajor > 0)) return { ok: false, error: 'invalid_test_drive_price' };
  const curNorm = String(sess.currency || property.currency || 'usd').toLowerCase();
  const computedStayCents = majorToStripeMinor(stayMajor, curNorm);
  const computedDepCents = depMajor > 0 ? majorToStripeMinor(depMajor, curNorm) : 0;
  const computedTotalCents = computedStayCents + computedDepCents;
  if (Number.isFinite(expectedTotalCents) && Math.abs(expectedTotalCents - computedTotalCents) > 2) {
    console.warn('[Stripe] test-drive amount mismatch', {
      expectedTotalCents,
      computedTotalCents,
      sessionAmount: sess.amount_total,
    });
  }

  const existingForDates = await getPrisma().test_drive_bookings.findMany({
    where: {
      property_id: Number(propertyId),
      property_table: tableResolved,
      status: { in: ['pending', 'approved', 'paid'] },
    },
    select: { start_date: true, end_date: true },
  });
  const overlap = existingForDates.some((r) => !(endDate < r.start_date || r.end_date < startDate));
  if (overlap) {
    const sameExisting = await getPrisma().test_drive_bookings.findFirst({
      where: {
        property_id: Number(propertyId),
        property_table: tableResolved,
        user_id: Number(userId),
        start_date: startDate,
        end_date: endDate,
        status: { in: ['approved', 'paid'] },
      },
      select: { id: true },
    });
    if (sameExisting) {
      return { ok: true, already: true, bookingId: sameExisting.id };
    }
    return { ok: false, error: 'dates_unavailable' };
  }

  const existingMine = await getPrisma().test_drive_bookings.count({
    where: {
      user_id: Number(userId),
      property_id: Number(propertyId),
      property_table: tableResolved,
      status: { in: ['pending', 'approved', 'paid'] },
    },
  });
  if (existingMine > 0) {
    const sameMine = await getPrisma().test_drive_bookings.findFirst({
      where: {
        user_id: Number(userId),
        property_id: Number(propertyId),
        property_table: tableResolved,
        start_date: startDate,
        end_date: endDate,
        status: { in: ['approved', 'paid', 'pending'] },
      },
      select: { id: true },
    });
    if (sameMine) {
      return { ok: true, already: true, bookingId: sameMine.id };
    }
    return { ok: false, error: 'already_requested' };
  }

  const contactCh = normalizeTestDriveContactChannel(sess.metadata?.buyer_contact_channel);
  const bookingRow = await getPrisma().test_drive_bookings.create({
    data: {
      property_id: Number(propertyId),
      property_table: tableResolved,
      user_id: Number(userId),
      start_date: startDate,
      end_date: endDate,
      status: 'paid',
      ...(contactCh ? { buyer_contact_channel: contactCh } : {}),
    },
  });

  try {
    await testDriveBookingQueries.ensureTable();
    const surveyTok = crypto.randomBytes(24).toString('hex');
    const schedIso = scheduledSurveyWhatsAppAtIso(startDate);
    await testDriveBookingQueries.setSurveyBroadcastAfterPayment(bookingRow.id, surveyTok, schedIso);
    await testDriveBookingQueries.initializeExitFeedbackAfterPayment(bookingRow.id, endDate);
  } catch (e) {
    console.warn('[Stripe] test-drive survey token init:', e?.message || e);
  }

  const billingPayload = {
    type: 'test_drive_booking',
    booking_id: bookingRow.id,
    property_id: Number(propertyId),
    property_table: tableResolved,
    owner_user_id: Number(property.user_id),
    start_date: startDate,
    end_date: endDate,
    days_count: dayCount,
    daily_price: Number(dailyPrice) || quote.dailyPrice,
    insurance_deposit: Number(insuranceDeposit) || quote.insuranceDeposit || 0,
    stay_major: stayMajor,
    total_major: totalMajorCombined,
    buyer_contact_channel: normalizeTestDriveContactChannel(sess.metadata?.buyer_contact_channel),
    currency: String(sess.currency || property.currency || 'usd').toLowerCase(),
  };
  await stripeSubscriptionQueries.insertPayment({
    dedupe_key: sess.id,
    user_id: Number(userId),
    stripe_customer_id:
      typeof sess.customer === 'string' ? sess.customer : sess.customer?.id || null,
    stripe_subscription_id: null,
    stripe_invoice_id: null,
    stripe_checkout_session_id: sess.id,
    amount_cents: sess.amount_total ?? computedTotalCents,
    currency: String(sess.currency || property.currency || 'usd').toLowerCase(),
    status: 'paid',
    plan_key: 'test_drive_booking',
    billing_reason: JSON.stringify(billingPayload),
    paid_at: new Date().toISOString(),
    period_start: null,
    period_end: null,
    customer_email: sess.customer_details?.email || sess.customer_email || null,
  });

  try {
    const buyer = await userQueries.getById(userId);
    const buyerName =
      [buyer?.first_name, buyer?.last_name].filter(Boolean).join(' ') ||
      buyer?.email ||
      `Пользователь #${userId}`;
    const title = 'Запрос на тест-драйв';
    const prefCh = normalizeTestDriveContactChannel(sess.metadata?.buyer_contact_channel);
    const prefLabel =
      prefCh === 'telegram' ? 'Telegram' : prefCh === 'whatsapp' ? 'WhatsApp' : prefCh === 'email' ? 'почта' : '';
    const message = `${buyerName} оплатил тест-драйв объекта «${
      property.title || `Объект #${propertyId}`
    }» с ${startDate} по ${endDate}.${prefLabel ? ` Предпочтительная связь: ${prefLabel}.` : ''} Подтвердите и добавьте комментарий по заселению (ключи, время заезда).`;
    const notifRun = await notificationQueries.create({
      user_id: Number(property.user_id),
      type: 'test_drive_request',
      title,
      message,
      data: {
        booking_id: bookingRow.id,
        property_id: Number(propertyId),
        property_table: tableResolved,
        buyer_id: Number(userId),
        start_date: startDate,
        end_date: endDate,
        paid: true,
      },
      is_read: 0,
      view_count: 0,
    });
    const ownerNotificationId = notifRun?.lastInsertRowid;
    if (ownerNotificationId) {
      await getPrisma().test_drive_bookings.update({
        where: { id: Number(bookingRow.id) },
        data: { owner_notification_id: Number(ownerNotificationId) },
      });
    }
  } catch (e) {
    console.warn('[Stripe] test-drive owner notification:', e?.message || e);
  }

  return { ok: true, bookingId: bookingRow.id };
}

const TEST_DRIVE_BUYER_CANCEL_CODES = new Set([
  'dates_changed',
  'found_alternative',
  'property_not_fit',
  'price_concern',
  'personal',
  'other',
]);

export function parseTestDriveBuyerCancelBody(body) {
  const reasonCode = String(body?.reason_code || '').trim();
  const reasonText = String(body?.reason_text || '').trim();
  if (!TEST_DRIVE_BUYER_CANCEL_CODES.has(reasonCode)) {
    return { ok: false, error: 'invalid_reason_code' };
  }
  if (reasonCode === 'other') {
    if (reasonText.length < 5) return { ok: false, error: 'reason_text_too_short' };
    return { ok: true, reasonCode, reasonDetail: reasonText };
  }
  return { ok: true, reasonCode, reasonDetail: '' };
}

/**
 * Частичный возврат 50% суммы оплаты Checkout (тест-драйв).
 */
export async function refundHalfTestDriveBookingPayment(paymentRow) {
  if (!paymentRow || !paymentRow.stripe_checkout_session_id) {
    return { ok: true, skipped: true };
  }
  const storedCents = Number(paymentRow.amount_cents) || 0;
  if (!(storedCents > 0)) return { ok: true, skipped: true };

  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, error: 'stripe_not_configured' };
  }

  const sessId = String(paymentRow.stripe_checkout_session_id);
  try {
    const sess = await stripe.checkout.sessions.retrieve(sessId, { expand: ['payment_intent'] });
    const piRaw = sess.payment_intent;
    const pi = typeof piRaw === 'string' ? piRaw : piRaw?.id;
    if (!pi) return { ok: false, error: 'no_payment_intent' };

    const total = Number(sess.amount_total != null ? sess.amount_total : storedCents);
    const half = Math.max(1, Math.floor(total * 0.5));

    await stripe.refunds.create({
      payment_intent: pi,
      amount: half,
      reason: 'requested_by_customer',
      metadata: {
        checkout_session: sessId,
        refund_kind: 'test_drive_buyer_cancel_half',
      },
    });
    return { ok: true, refunded_cents: half, total_cents: total };
  } catch (e) {
    const msg = e?.message || String(e);
    console.error('[Stripe] refundHalfTestDriveBookingPayment:', msg);
    return { ok: false, error: 'refund_failed', message: msg };
  }
}

function isoFromUnix(sec) {
  if (sec == null) return null;
  return new Date(sec * 1000).toISOString();
}

/** Owner subscriptions from metadata, plus legacy Pro / VIP price IDs from .env. */
const OWNER_SUBSCRIPTION_PLANS = {
  standard: { name: 'Стандарт', monthlyUsd: 99 },
  pro: { name: 'Pro', monthlyUsd: 490 },
  institutional: { name: 'Институциональный', monthlyUsd: 1500 },
};

const OWNER_SUBSCRIPTION_PLAN_KEYS = new Set(Object.keys(OWNER_SUBSCRIPTION_PLANS));

function normalizeOwnerSubscriptionPlanKey(planKey) {
  const key = String(planKey || '').toLowerCase();
  return key === 'corporate' ? 'institutional' : key;
}

function isOwnerSubscriptionPlanKey(planKey) {
  return OWNER_SUBSCRIPTION_PLAN_KEYS.has(normalizeOwnerSubscriptionPlanKey(planKey));
}

function planKeyFromStripeSubscription(subscription) {
  const m = normalizeOwnerSubscriptionPlanKey(subscription?.metadata?.plan_key);
  if (m === 'vip' || m === 'pro' || isOwnerSubscriptionPlanKey(m)) return m;
  const priceIdPro = (process.env.STRIPE_PRICE_ID_PRO || '').trim();
  const priceIdProYear = (process.env.STRIPE_PRICE_ID_PRO_YEAR || '').trim();
  const priceIdVip = (process.env.STRIPE_PRICE_ID_VIP || '').trim();
  const priceIdVipYear = (process.env.STRIPE_PRICE_ID_VIP_YEAR || '').trim();
  const pid = subscription?.items?.data?.[0]?.price?.id;
  const p = String(pid || '');
  if (p && (p === priceIdVip || p === priceIdVipYear)) return 'vip';
  if (p && (p === priceIdPro || p === priceIdProYear)) return 'pro';
  return 'pro';
}

/** Для Checkout нужен Price ID; в .env можно указать prod_... — подставим первую активную recurring-цену. */
async function resolveDepositLinePriceId(stripe, configured) {
  const raw = (configured || '').trim();
  if (!raw) return null;
  if (raw.startsWith('price_')) return raw;
  if (raw.startsWith('prod_')) {
    const list = await stripe.prices.list({ product: raw, active: true, limit: 20 });
    const recurring = list.data.find((p) => p.recurring?.interval);
    return (recurring || list.data[0])?.id || null;
  }
  return raw;
}

async function withdrawDepositWithLog(userId, amountEur, description) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const u = await tx.users.findUnique({
      where: { id: Number(userId) },
      select: { id: true, deposit_amount: true },
    });
    const dep = u?.deposit_amount != null ? parseFloat(String(u.deposit_amount)) || 0 : 0;
    if (dep < amountEur) throw new Error('insufficient_deposit');
    await tx.users.update({
      where: { id: Number(userId) },
      data: { deposit_amount: dep - amountEur, updated_at: new Date() },
    });
    try {
      await tx.transactions.create({
        data: { user_id: Number(userId), type: 'withdraw', amount: amountEur, description },
      });
    } catch (txErr) {
      console.warn('[Stripe] transactions insert (wallet):', txErr?.message || txErr);
    }
    return { ok: true };
  });
}

/**
 * Идемпотентное зачисление депозита по оплаченному инвойсу подписки Deposit (metadata checkout_purpose=wallet_deposit).
 */
export async function creditWalletDepositFromPaidInvoice(invoice, subscription) {
  if (invoice.status !== 'paid' || !invoice.amount_paid) {
    return { ok: false, error: 'not_paid' };
  }
  if (subscription.metadata?.checkout_purpose !== 'wallet_deposit') {
    return { ok: false, error: 'not_wallet_deposit' };
  }
  const userId = parseInt(subscription.metadata?.app_user_id || '', 10);
  if (!Number.isFinite(userId)) {
    return { ok: false, error: 'no_app_user_id' };
  }

  const dedupeKey = invoice.id;
  const amountEur = invoice.amount_paid / 100;
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || null;
  const subscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id || null;
  const paidAt = invoice.status_transitions?.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
    : new Date().toISOString();

  try {
    const insertRes = await stripeSubscriptionQueries.insertPayment({
      dedupe_key: invoice.id,
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_invoice_id: invoice.id,
      stripe_checkout_session_id: null,
      amount_cents: invoice.amount_paid,
      currency: (invoice.currency || 'eur').toLowerCase(),
      status: 'paid',
      plan_key: 'deposit',
      billing_reason: invoice.billing_reason || 'wallet_deposit',
      paid_at: paidAt,
      period_start: isoFromUnix(invoice.period_start),
      period_end: isoFromUnix(invoice.period_end),
      customer_email: invoice.customer_email || null,
    });
    const isNewCredit = (insertRes?.changes || 0) > 0;
    if (!isNewCredit) {
      return { ok: true, already: true };
    }

    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      const user = await tx.users.findUnique({
        where: { id: Number(userId) },
        select: { id: true, deposit_amount: true },
      });
      if (!user) throw new Error('user_not_found');
      const cur = user.deposit_amount != null ? parseFloat(String(user.deposit_amount)) : 0;
      await tx.users.update({
        where: { id: Number(userId) },
        data: { deposit_amount: cur + amountEur, updated_at: new Date() },
      });
      try {
        await tx.transactions.create({
          data: {
            user_id: Number(userId),
            type: 'deposit',
            amount: amountEur,
            description: 'Пополнение депозита (Stripe)',
          },
        });
      } catch (e) {
        console.warn('[Stripe] transactions insert:', e.message);
      }
    });

    return { ok: true, credited: true, amountEur };
  } catch (e) {
    console.error('[Stripe] creditWalletDeposit:', e?.message || e);
    return { ok: false, error: e.message || 'credit_failed' };
  }
}

export async function confirmWalletDepositSession(stripe, sessionId, expectedUserId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['invoice'] });
  if (session.metadata?.checkout_purpose !== 'wallet_deposit') {
    return { ok: false, error: 'not_wallet_deposit_session' };
  }
  if (String(session.metadata?.app_user_id || '') !== String(expectedUserId)) {
    return { ok: false, error: 'user_mismatch' };
  }
  if (session.payment_status !== 'paid') {
    return { ok: false, error: 'not_paid' };
  }
  let inv = session.invoice;
  if (typeof inv === 'string') {
    inv = await stripe.invoices.retrieve(inv);
  }
  if (!inv || inv.status !== 'paid') {
    return { ok: false, error: 'invoice_not_ready' };
  }
  const subId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  if (!subId) {
    return { ok: false, error: 'no_subscription' };
  }
  const sub = await stripe.subscriptions.retrieve(subId);
  return await creditWalletDepositFromPaidInvoice(inv, sub);
}

/**
 * Сохраняет подписку и первый платёж из Checkout Session (idempotent).
 */
export async function syncCheckoutSessionToDatabase(stripe, sessionId, options = {}) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription', 'line_items'],
  });
  if (session.metadata?.checkout_purpose === 'wallet_deposit') {
    return { ok: false, error: 'wallet_deposit_session' };
  }
  if (session.mode !== 'subscription') {
    return { ok: false, error: 'not_subscription_mode' };
  }
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  if (!subscriptionId) {
    return { ok: false, error: 'no_subscription' };
  }

  const metadataUserId = parseInt(session.metadata?.app_user_id || '', 10);
  const expectedUserId = parseInt(String(options.expectedUserId || '').trim(), 10);
  if (
    Number.isFinite(metadataUserId) &&
    Number.isFinite(expectedUserId) &&
    metadataUserId !== expectedUserId
  ) {
    return { ok: false, error: 'user_mismatch' };
  }
  const uid = Number.isFinite(metadataUserId) ? metadataUserId : expectedUserId;
  if (!Number.isFinite(uid)) {
    return { ok: false, error: 'no_app_user_id' };
  }

  const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

  const sessionPlan = normalizeOwnerSubscriptionPlanKey(session.metadata?.plan_key);
  const planKey =
    sessionPlan === 'vip' || sessionPlan === 'pro' || isOwnerSubscriptionPlanKey(sessionPlan)
      ? sessionPlan
      : planKeyFromStripeSubscription(sub);

  let invoiceId = null;
  if (session.invoice) {
    invoiceId = typeof session.invoice === 'string' ? session.invoice : session.invoice.id;
  }
  if (!invoiceId) {
    const invList = await stripe.invoices.list({
      subscription: subscriptionId,
      limit: 5,
    });
    invoiceId = invList.data.find((i) => i.status === 'paid')?.id || invList.data[0]?.id || null;
  }

  await stripeSubscriptionQueries.upsertState({
    user_id: uid,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    plan_key: planKey,
    status: sub.status,
    current_period_start: isoFromUnix(sub.current_period_start),
    current_period_end: isoFromUnix(sub.current_period_end),
    cancel_at_period_end: !!sub.cancel_at_period_end,
  });

  if (planKey === 'vip') {
    const st = String(sub.status || '').toLowerCase();
    if (['active', 'trialing', 'past_due', 'paused'].includes(st)) {
      try {
        await userQueries.syncVipClubFromStripePeriodEnd(uid, isoFromUnix(sub.current_period_end));
      } catch (e) {
        console.warn('[Stripe] sync vip_until (checkout):', e?.message || e);
      }
    }
  }

  const amount = session.amount_total ?? 0;
  const currency = (session.currency || 'eur').toLowerCase();
  const dedupeKey = invoiceId || `cs_${session.id}`;
  const paidAt = session.status === 'complete' ? new Date().toISOString() : new Date().toISOString();

  await stripeSubscriptionQueries.insertPayment({
    dedupe_key: dedupeKey,
    user_id: uid,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_invoice_id: invoiceId || null,
    stripe_checkout_session_id: session.id,
    amount_cents: amount,
    currency,
    status: 'paid',
    plan_key: planKey,
    billing_reason: 'subscription_create',
    paid_at: paidAt,
    period_start: isoFromUnix(sub.current_period_start),
    period_end: isoFromUnix(sub.current_period_end),
    customer_email: session.customer_details?.email || session.customer_email || null,
  });

  return {
    ok: true,
    data: {
      user_id: uid,
      plan_key: planKey,
      status: sub.status,
      current_period_end: isoFromUnix(sub.current_period_end),
      stripe_subscription_id: subscriptionId,
    },
  };
}

async function persistInvoicePaid(stripe, invoice) {
  if (invoice.status !== 'paid' || !invoice.amount_paid) return;
  const invoiceId = invoice.id;
  const subscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;

  const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
  if (sub.metadata?.checkout_purpose === 'wallet_deposit') {
    const r = await creditWalletDepositFromPaidInvoice(invoice, sub);
    if (r.ok && r.credited) {
      console.log(
        `[Stripe] Депозит зачислён (invoice.paid): user ${sub.metadata?.app_user_id}, +${r.amountEur} EUR`
      );
    }
    return;
  }

  let userId = await stripeSubscriptionQueries.getUserIdBySubscriptionId(subscriptionId);
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

  const planKey = planKeyFromStripeSubscription(sub);

  if (!userId) {
    userId = parseInt(sub.metadata?.app_user_id || '', 10);
    if (!Number.isFinite(userId)) {
      console.warn('[Stripe] invoice.paid: не найден user_id для', subscriptionId);
      return;
    }
    await stripeSubscriptionQueries.upsertState({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan_key: planKey,
      status: sub.status,
      current_period_start: isoFromUnix(sub.current_period_start),
      current_period_end: isoFromUnix(sub.current_period_end),
      cancel_at_period_end: !!sub.cancel_at_period_end,
    });
  }

  await stripeSubscriptionQueries.insertPayment({
    dedupe_key: invoiceId,
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_invoice_id: invoiceId,
    stripe_checkout_session_id: null,
    amount_cents: invoice.amount_paid,
    currency: (invoice.currency || 'eur').toLowerCase(),
    status: 'paid',
    plan_key: planKey,
    billing_reason: invoice.billing_reason || null,
    paid_at: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : new Date().toISOString(),
    period_start: isoFromUnix(invoice.period_start),
    period_end: isoFromUnix(invoice.period_end),
    customer_email: invoice.customer_email || null,
  });

  if (planKey === 'vip' && Number.isFinite(userId)) {
    try {
      await userQueries.syncVipClubFromStripePeriodEnd(userId, isoFromUnix(sub.current_period_end));
    } catch (e) {
      console.warn('[Stripe] sync vip_until (invoice):', e?.message || e);
    }
  }
}

async function handleSubscriptionUpdated(subscription) {
  if (subscription.metadata?.checkout_purpose === 'wallet_deposit') {
    return;
  }
  const subId = subscription.id;
  let userId = await stripeSubscriptionQueries.getUserIdBySubscriptionId(subId);
  if (!userId) {
    userId = parseInt(subscription.metadata?.app_user_id || '', 10);
  }
  if (!Number.isFinite(userId)) return;

  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

  const planKey = planKeyFromStripeSubscription(subscription);

  await stripeSubscriptionQueries.upsertState({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subId,
    plan_key: planKey,
    status: subscription.status,
    current_period_start: isoFromUnix(subscription.current_period_start),
    current_period_end: isoFromUnix(subscription.current_period_end),
    cancel_at_period_end: !!subscription.cancel_at_period_end,
  });

  if (planKey === 'vip') {
    const st = String(subscription.status || '').toLowerCase();
    if (['active', 'trialing', 'past_due', 'paused'].includes(st)) {
      try {
        await userQueries.syncVipClubFromStripePeriodEnd(
          userId,
          isoFromUnix(subscription.current_period_end)
        );
      } catch (e) {
        console.warn('[Stripe] sync vip_until (subscription.updated):', e?.message || e);
      }
    }
  }
}

/**
 * Express handler для POST /api/webhooks/stripe (raw body).
 */
export function createStripeWebhookHandler() {
  const whSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();

  return async (req, res) => {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).send('Stripe not configured');
    }
    let event;
    try {
      const sig = req.headers['stripe-signature'];
      if (whSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, whSecret);
      } else {
        event = JSON.parse(req.body.toString('utf8'));
      }
    } catch (err) {
      console.error('[Stripe] webhook signature:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          if (session.mode === 'payment' && session.metadata?.checkout_purpose === 'property_reservation_deposit') {
            const full = await stripe.checkout.sessions.retrieve(session.id);
            await processPropertyReservationPaidSession(stripe, full);
            break;
          }
          if (session.mode === 'payment' && session.metadata?.checkout_purpose === 'share_purchase') {
            const full = await stripe.checkout.sessions.retrieve(session.id);
            await processSharePurchasePaidSession(stripe, full);
            break;
          }
          if (session.mode === 'payment' && session.metadata?.checkout_purpose === 'listing_publication_fee') {
            const full = await stripe.checkout.sessions.retrieve(session.id);
            await processListingPublicationFeePaidSession(stripe, full);
            break;
          }
          if (session.mode === 'payment' && session.metadata?.checkout_purpose === 'test_drive_booking') {
            const full = await stripe.checkout.sessions.retrieve(session.id);
            await processTestDriveBookingPaidSession(stripe, full);
            break;
          }
          if (session.mode === 'subscription' && session.metadata?.checkout_purpose !== 'wallet_deposit') {
            await syncCheckoutSessionToDatabase(stripe, session.id);
          }
          break;
        }
        case 'invoice.paid': {
          await persistInvoicePaid(stripe, event.data.object);
          break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          await handleSubscriptionUpdated(event.data.object);
          break;
        }
        default:
          break;
      }
    } catch (e) {
      console.error('[Stripe] webhook handler:', e?.message || e);
      return res.status(500).json({ received: false });
    }

    return res.json({ received: true });
  };
}

/** Не открывать повторный Checkout Pro, если в БД уже есть активная платная подписка (Pro/VIP). */
function userHasActivePaidCabinetSubscription(state) {
  if (!state) return false;
  const st = String(state.status || '').toLowerCase();
  if (!['active', 'trialing', 'past_due', 'paused'].includes(st)) return false;
  const pk = String(state.plan_key || '').toLowerCase();
  return pk === 'pro' || pk === 'vip';
}

/** Активная подписка именно VIP в Stripe (для повторного Checkout VIP). */
function userHasActiveStripeVipPlan(state) {
  if (!state) return false;
  const st = String(state.status || '').toLowerCase();
  if (!['active', 'trialing', 'past_due', 'paused'].includes(st)) return false;
  return String(state.plan_key || '').toLowerCase() === 'vip';
}

function userHasActiveOwnerSubscriptionPlan(state, planKey) {
  if (!state) return false;
  const st = String(state.status || '').toLowerCase();
  if (!['active', 'trialing', 'past_due', 'paused'].includes(st)) return false;
  return normalizeOwnerSubscriptionPlanKey(state.plan_key) === normalizeOwnerSubscriptionPlanKey(planKey);
}

export function registerStripeBillingRoutes(app) {
  const stripe = getStripe();
  const priceIdPro = (process.env.STRIPE_PRICE_ID_PRO || '').trim();
  const priceIdProYear = (process.env.STRIPE_PRICE_ID_PRO_YEAR || '').trim();
  const priceIdVip = (process.env.STRIPE_PRICE_ID_VIP || '').trim();
  const priceIdVipYear = (process.env.STRIPE_PRICE_ID_VIP_YEAR || '').trim();
  const priceIdDeposit = (process.env.STRIPE_PRICE_ID_DEPOSIT || '').trim();
  const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

  app.post('/api/billing/create-checkout-session', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({
          success: false,
          error: 'Платежи не настроены: задайте STRIPE_SECRET_KEY в .env',
        });
      }
      const plan = normalizeOwnerSubscriptionPlanKey(req.body?.plan);
      const billingCycle = String(req.body?.billingCycle || 'monthly').toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
      const userId = req.body?.userId != null ? String(req.body.userId).slice(0, 128) : '';
      const customerEmail =
        typeof req.body?.customerEmail === 'string' ? req.body.customerEmail.trim().slice(0, 320) : '';

      if (plan === 'deposit') {
        if (!priceIdDeposit) {
          return res.status(503).json({
            success: false,
            error:
              'Не задан STRIPE_PRICE_ID_DEPOSIT (в .env: price_... или prod_... продукта Deposit)',
          });
        }
        if (!userId || !/^\d+$/.test(userId)) {
          return res.status(400).json({
            success: false,
            error: 'Укажите числовой userId для привязки платежа к аккаунту',
          });
        }
        let depositPriceId;
        try {
          depositPriceId = await resolveDepositLinePriceId(stripe, priceIdDeposit);
        } catch (resolveErr) {
          console.error('[Stripe] resolve Deposit price:', resolveErr?.message || resolveErr);
          return res.status(503).json({
            success: false,
            error: resolveErr?.message || 'Не удалось получить цену продукта Deposit в Stripe',
          });
        }
        if (!depositPriceId) {
          return res.status(503).json({
            success: false,
            error:
              'STRIPE_PRICE_ID_DEPOSIT: нет активной цены у продукта или неверный ID (нужен price_... или prod_...)',
          });
        }
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [{ price: depositPriceId, quantity: 1 }],
          success_url: `${frontendBase}/wallet?deposit_checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${frontendBase}/wallet?deposit_checkout=canceled`,
          metadata: { app_user_id: userId, checkout_purpose: 'wallet_deposit' },
          subscription_data: {
            metadata: { app_user_id: userId, checkout_purpose: 'wallet_deposit' },
          },
          ...(customerEmail && customerEmail.includes('@') ? { customer_email: customerEmail } : {}),
        });
        return res.json({ success: true, url: session.url });
      }

      if (isOwnerSubscriptionPlanKey(plan)) {
        if (!userId || !/^\d+$/.test(userId)) {
          return res.status(400).json({
            success: false,
            error: 'Укажите числовой userId для привязки подписки к аккаунту',
          });
        }

        const sellerPlan = OWNER_SUBSCRIPTION_PLANS[plan];
        const unitAmount = majorToStripeMinor(
          billingCycle === 'yearly'
            ? sellerPlan.monthlyUsd * 0.8 * 12
            : sellerPlan.monthlyUsd,
          'usd'
        );
        const uidCheckout = parseInt(userId, 10);
        const existingSub = await stripeSubscriptionQueries.getStateByUserId(uidCheckout);
        if (userHasActiveOwnerSubscriptionPlan(existingSub, plan)) {
          return res.status(409).json({
            success: false,
            error: 'already_subscribed_owner_plan',
          });
        }

        const returnPath =
          typeof req.body?.returnPath === 'string' &&
          req.body.returnPath.startsWith('/') &&
          !req.body.returnPath.includes('..')
            ? req.body.returnPath.slice(0, 220)
            : '/owner-test/subscriptions';
        const joiner = returnPath.includes('?') ? '&' : '?';
        const successUrl = `${frontendBase}${returnPath}${joiner}subscription_checkout=success&session_id={CHECKOUT_SESSION_ID}&owner_plan=${plan}`;
        const cancelUrl = `${frontendBase}${returnPath}${joiner}subscription_checkout=canceled`;

        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: 'usd',
                unit_amount: unitAmount,
                recurring: { interval: billingCycle === 'yearly' ? 'year' : 'month' },
                product_data: {
                  name: `SellYourBrick ${sellerPlan.name}`,
                  description: `Подписка продавца: ${sellerPlan.name}.`.slice(0, 500),
                },
              },
            },
          ],
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            app_user_id: userId,
            billing_cycle: billingCycle,
            plan_key: plan,
            checkout_purpose: 'owner_subscription',
          },
          subscription_data: {
            metadata: {
              app_user_id: userId,
              billing_cycle: billingCycle,
              plan_key: plan,
              checkout_purpose: 'owner_subscription',
            },
          },
          ...(customerEmail && customerEmail.includes('@') ? { customer_email: customerEmail } : {}),
        });

        return res.json({ success: true, url: session.url });
      }

      if (plan !== 'pro' && plan !== 'vip') {
        return res.status(400).json({
          success: false,
          error: 'Неизвестный план. Доступны: standard, pro, institutional, vip, deposit',
        });
      }

      const isVip = plan === 'vip';
      const selectedPriceId = isVip
        ? billingCycle === 'yearly'
          ? priceIdVipYear
          : priceIdVip
        : billingCycle === 'yearly'
          ? priceIdProYear
          : priceIdPro;

      if (!selectedPriceId) {
        return res.status(503).json({
          success: false,
          error: isVip
            ? billingCycle === 'yearly'
              ? 'Не задан STRIPE_PRICE_ID_VIP_YEAR (ID годовой цены VIP из Stripe)'
              : 'Не задан STRIPE_PRICE_ID_VIP (ID месячной цены VIP из Stripe)'
            : billingCycle === 'yearly'
              ? 'Не задан STRIPE_PRICE_ID_PRO_YEAR (ID годовой цены Pro из Stripe)'
              : 'Не задан STRIPE_PRICE_ID_PRO (ID месячной цены Pro из Stripe)',
        });
      }

      let tierPrice;
      try {
        tierPrice = await stripe.prices.retrieve(selectedPriceId);
      } catch (priceErr) {
        console.error('[Stripe] retrieve subscription price:', priceErr?.message || priceErr);
        return res.status(503).json({
          success: false,
          error:
            priceErr?.message ||
            `Не удалось загрузить ${billingCycle === 'yearly' ? 'годовую' : 'месячную'} цену из Stripe.`,
        });
      }
      const tierCurrency = String(tierPrice?.currency || '').toLowerCase();
      if (tierCurrency !== 'eur') {
        return res.status(503).json({
          success: false,
          error: `Подписка ${isVip ? 'VIP' : 'Pro'} должна быть в EUR в Stripe (указанная цена в ${
            tierCurrency.toUpperCase() || '?'
          }). Создайте цену в евро и обновите ENV в .env.`,
        });
      }

      const uidCheckout = parseInt(userId, 10);
      if (Number.isFinite(uidCheckout)) {
        const existingSub = await stripeSubscriptionQueries.getStateByUserId(uidCheckout);
        if (isVip) {
          if (userHasActiveStripeVipPlan(existingSub)) {
            return res.status(409).json({
              success: false,
              error: 'already_subscribed_vip',
            });
          }
        } else if (userHasActivePaidCabinetSubscription(existingSub)) {
          return res.status(409).json({
            success: false,
            error: 'already_subscribed_pro',
          });
        }
      }

      const planKeyMeta = isVip ? 'vip' : 'pro';
      const checkoutReturnPath =
        typeof req.body?.returnPath === 'string' &&
        req.body.returnPath.startsWith('/') &&
        !req.body.returnPath.includes('..')
          ? req.body.returnPath.slice(0, 220)
          : '';
      const checkoutReturnJoiner = checkoutReturnPath.includes('?') ? '&' : '?';
      const checkoutSuccessUrl = checkoutReturnPath
        ? `${frontendBase}${checkoutReturnPath}${checkoutReturnJoiner}subscription_checkout=success&session_id={CHECKOUT_SESSION_ID}&owner_plan=${planKeyMeta}`
        : `${frontendBase}/profile?subscription_checkout=success&session_id={CHECKOUT_SESSION_ID}${isVip ? '&vip_club=1' : ''}`;
      const checkoutCancelUrl = checkoutReturnPath
        ? `${frontendBase}${checkoutReturnPath}${checkoutReturnJoiner}subscription_checkout=canceled`
        : `${frontendBase}/profile`;
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: selectedPriceId, quantity: 1 }],
        success_url: checkoutSuccessUrl,
        cancel_url: checkoutCancelUrl,
        metadata: userId
          ? { app_user_id: userId, billing_cycle: billingCycle, plan_key: planKeyMeta }
          : { billing_cycle: billingCycle, plan_key: planKeyMeta },
        subscription_data: userId
          ? { metadata: { app_user_id: userId, billing_cycle: billingCycle, plan_key: planKeyMeta } }
          : { metadata: { billing_cycle: billingCycle, plan_key: planKeyMeta } },
        ...(customerEmail && customerEmail.includes('@') ? { customer_email: customerEmail } : {}),
      });

      return res.json({ success: true, url: session.url });
    } catch (err) {
      console.error('[Stripe] create-checkout-session:', err?.message || err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Ошибка Stripe',
      });
    }
  });

  app.post('/api/billing/property-reservation-signature-intent', async (req, res) => {
    try {
      const userId = req.body?.userId != null ? parseInt(String(req.body.userId).trim(), 10) : NaN;
      const propertyId = req.body?.propertyId != null ? parseInt(String(req.body.propertyId).trim(), 10) : NaN;
      const propertyTypeRaw =
        req.body?.propertyType != null ? String(req.body.propertyType).trim().slice(0, 32) : '';
      const useWalletDeposit =
        req.body?.useDeposit === true ||
        req.body?.useDeposit === 'true' ||
        req.body?.useDeposit === 1 ||
        req.body?.useDeposit === '1';
      const signatureDataUrl =
        typeof req.body?.signatureDataUrl === 'string' ? req.body.signatureDataUrl.trim() : '';

      if (!Number.isFinite(userId) || !Number.isFinite(propertyId)) {
        return res.status(400).json({ success: false, error: 'Укажите userId и propertyId' });
      }

      const sigOk = validateShareSignatureDataUrl(signatureDataUrl);
      if (!sigOk.ok) {
        return res.status(400).json({ success: false, error: sigOk.error });
      }

      const property = await propertyQueries.getById(propertyId, propertyTypeRaw || null);
      if (!property) {
        return res.status(404).json({ success: false, error: 'Объявление не найдено' });
      }

      const propertyTypeNorm =
        property.property_type != null
          ? String(property.property_type).trim().slice(0, 32)
          : propertyTypeRaw;

      const row = await reservationSignatureQueries.createIntent({
        buyerId: userId,
        propertyId,
        propertyType: propertyTypeNorm,
        useWallet: useWalletDeposit,
        signatureData: signatureDataUrl,
      });
      return res.json({ success: true, signingIntentId: row.id });
    } catch (err) {
      if (err?.message === 'invalid_signature_payload') {
        return res.status(400).json({ success: false, error: 'Некорректные данные подписи' });
      }
      console.error('[Stripe] property-reservation-signature-intent:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка сервера' });
    }
  });

  app.post('/api/billing/create-property-reservation-checkout', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({
          success: false,
          error: 'Платежи не настроены: задайте STRIPE_SECRET_KEY в .env',
        });
      }
      const userIdRaw = req.body?.userId;
      const propertyIdRaw = req.body?.propertyId;
      const propertyType =
        req.body?.propertyType != null ? String(req.body.propertyType).trim().slice(0, 32) : null;
      const customerEmail =
        typeof req.body?.customerEmail === 'string' ? req.body.customerEmail.trim().slice(0, 320) : '';
      let returnPath =
        typeof req.body?.returnPath === 'string' && req.body.returnPath.startsWith('/')
          ? req.body.returnPath.split('?')[0].slice(0, 200)
          : null;
      if (returnPath && returnPath.includes('..')) {
        returnPath = null;
      }

      const userId = userIdRaw != null ? parseInt(String(userIdRaw).trim(), 10) : NaN;
      const propertyId = propertyIdRaw != null ? parseInt(String(propertyIdRaw).trim(), 10) : NaN;

      if (!Number.isFinite(userId) || !Number.isFinite(propertyId)) {
        return res.status(400).json({
          success: false,
          error: 'Укажите числовой userId и propertyId',
        });
      }

      const property = await propertyQueries.getById(propertyId, propertyType || null);
      if (!property) {
        return res.status(404).json({ success: false, error: 'Объявление не найдено' });
      }

      const resInfo = await propertyQueries.isReserved(propertyId);
      if (resInfo.isReserved && resInfo.reservedBy != null && Number(resInfo.reservedBy) !== userId) {
        return res.status(409).json({
          success: false,
          error: 'Объект уже зарезервирован другим покупателем',
        });
      }

      const minSaleMajor = computeMinimumSalePriceMajor(property);
      if (!(minSaleMajor > 0)) {
        return res.status(400).json({
          success: false,
          error: 'Укажите минимальную цену продажи объекта (поле price)',
        });
      }

      const curNorm = normalizeStripeCurrency(property.currency || 'usd');
      if (!curNorm.ok) {
        return res.status(400).json({ success: false, error: curNorm.error });
      }
      const currency = curNorm.currency;

      const useWalletDeposit =
        req.body?.useDeposit === true ||
        req.body?.useDeposit === 'true' ||
        req.body?.useDeposit === 1 ||
        req.body?.useDeposit === '1';

      const buyerRow = await userQueries.getById(userId);
      if (useWalletDeposit) {
        const dep = buyerRow != null ? parseFloat(buyerRow.deposit_amount) || 0 : 0;
        if (dep < WALLET_DEPOSIT_OFFSET_EUR) {
          return res.status(400).json({
            success: false,
            error: `На депозите недостаточно средств (нужно от ${WALLET_DEPOSIT_OFFSET_EUR} €)`,
          });
        }
      }

      const tenPctMajor = roundMoneyMajor(minSaleMajor * 0.1);
      let checkoutCurrency = currency;
      let tenPctMajorCheckout = tenPctMajor;
      let cardMajor = tenPctMajorCheckout;
      let walletAppliedMajor = 0;
      if (useWalletDeposit) {
        if (currency !== 'eur') {
          const convertedReserve = await convertCurrencyMajor(tenPctMajor, currency, 'eur');
          checkoutCurrency = 'eur';
          tenPctMajorCheckout = convertedReserve.amountMajor;
        }
        walletAppliedMajor = WALLET_DEPOSIT_OFFSET_EUR;
        cardMajor = tenPctMajorCheckout - walletAppliedMajor;
      }
      const minUnit = minStripeUnitAmount(checkoutCurrency);
      const unitAmount = majorToStripeMinor(cardMajor, checkoutCurrency);
      if (unitAmount < minUnit) {
        return res.status(400).json({
          success: false,
          error: useWalletDeposit
            ? `После вычета 3000 € с депозита сумма к оплате картой в EUR слишком мала. Увеличьте минимальную цену продажи или оплатите без депозита.`
            : `Сумма резерва слишком мала для Stripe (минимум ${minUnit} в минимальных единицах ${checkoutCurrency.toUpperCase()})`,
        });
      }

      const signingIntentId =
        typeof req.body?.signingIntentId === 'string' ? req.body.signingIntentId.trim().slice(0, 48) : '';
      if (!signingIntentId || !/^[0-9a-f-]{36}$/i.test(signingIntentId)) {
        return res.status(400).json({
          success: false,
          error:
            'Сначала сохраните подпись: откройте PDF, согласитесь с условиями и поставьте подпись в поле ниже.',
        });
      }

      const propertyTypeNorm =
        property.property_type != null
          ? String(property.property_type).trim().slice(0, 32)
          : propertyType != null
            ? String(propertyType).trim().slice(0, 32)
            : '';

      const intentReady = await reservationSignatureQueries.assertIntentReadyForCheckout(
        signingIntentId,
        userId,
        propertyId,
        propertyTypeNorm,
        useWalletDeposit
      );
      if (!intentReady.ok) {
        const map = {
          intent_not_found: 'Подпись не найдена — нарисуйте и подтвердите снова',
          intent_consumed: 'Эта подпись уже использована',
          intent_checkout_already_started: 'Оплата уже начата. Завершите в Stripe или начните с новой подписи',
          intent_user_mismatch: 'Несовпадение пользователя',
          intent_property_mismatch: 'Объект изменился — подпишите снова',
          intent_property_type_mismatch: 'Тип объекта изменился — подпишите снова',
          intent_wallet_mismatch: 'Изменился способ оплаты (депозит) — подпишите снова',
          intent_expired: 'Подпись устарела (30 мин) — нарисуйте заново',
        };
        return res.status(400).json({
          success: false,
          error: map[intentReady.error] || 'Недействительная подпись',
        });
      }

      const saleMinor = majorToStripeMinor(minSaleMajor, currency);
      const titleShort = (property.title || `Объект #${propertyId}`).slice(0, 100);
      const productDesc = useWalletDeposit
        ? `Резерв 10%: при использовании депозита оплата в EUR, 3000 EUR с депозита, остальное картой. Объект #${propertyId}`
        : `Резерв 10% от минимальной цены продажи. Объект #${propertyId}`;

      const basePath = returnPath || `/property/${propertyId}`;
      const successUrl = `${frontendBase}${basePath}?reservation_checkout=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${frontendBase}${basePath}?reservation_checkout=canceled`;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: checkoutCurrency,
              unit_amount: unitAmount,
              product_data: {
                name: `Резерв 10% — ${titleShort}`,
                description: productDesc.slice(0, 500),
              },
            },
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          app_user_id: String(userId),
          property_id: String(propertyId),
          property_type: propertyTypeNorm,
          checkout_purpose: 'property_reservation_deposit',
          deposit_cents: String(unitAmount),
          sale_price_cents: String(saleMinor),
          use_wallet_deposit: useWalletDeposit ? '1' : '0',
          property_currency: currency,
          checkout_currency: checkoutCurrency,
          min_sale_major: String(minSaleMajor),
          ten_pct_major: String(tenPctMajor),
          ten_pct_major_checkout: String(tenPctMajorCheckout),
          wallet_applied_major: String(walletAppliedMajor),
          signing_intent_id: signingIntentId,
          policy_version: RESERVATION_POLICY_VERSION,
        },
        ...(customerEmail && customerEmail.includes('@') ? { customer_email: customerEmail } : {}),
      });

      const attached = await reservationSignatureQueries.attachStripeSessionToIntent(signingIntentId, session.id);
      if (!attached) {
        try {
          await stripe.checkout.sessions.expire(session.id);
        } catch (expireErr) {
          console.warn('[Stripe] property reservation expire orphan session:', expireErr?.message || expireErr);
        }
        return res.status(409).json({
          success: false,
          error: 'Не удалось привязать подпись к оплате. Нарисуйте подпись ещё раз.',
        });
      }

      return res.json({ success: true, url: session.url });
    } catch (err) {
      console.error('[Stripe] create-property-reservation-checkout:', err?.message || err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Ошибка Stripe',
      });
    }
  });

  app.post('/api/billing/create-test-drive-checkout', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ success: false, error: 'Платежи не настроены' });
      }
      await testDriveBookingQueries.ensureTable();
      const userId = parseInt(String(req.body?.userId || '').trim(), 10);
      const propertyId = parseInt(String(req.body?.propertyId || '').trim(), 10);
      const propertyType =
        req.body?.propertyType != null ? String(req.body.propertyType).trim().slice(0, 32) : null;
      const startDate = String(req.body?.startDate || '');
      const endDate = String(req.body?.endDate || '');
      const propertyTable = String(req.body?.propertyTable || 'properties_apartments');
      const buyerContactChannel = normalizeTestDriveContactChannel(
        req.body?.contactChannel ?? req.body?.buyer_contact_channel
      );
      const customerEmail =
        typeof req.body?.customerEmail === 'string' ? req.body.customerEmail.trim().slice(0, 320) : '';
      const returnPath =
        typeof req.body?.returnPath === 'string' && req.body.returnPath.startsWith('/')
          ? req.body.returnPath.split('?')[0].slice(0, 200)
          : `/property/${propertyId}/test-drive`;

      if (!buyerContactChannel) {
        return res.status(400).json({
          success: false,
          error: 'Выберите способ связи: Telegram, WhatsApp или почта',
        });
      }
      if (!Number.isFinite(userId) || !Number.isFinite(propertyId)) {
        return res.status(400).json({ success: false, error: 'Укажите userId и propertyId' });
      }
      if (!isValidYmd(startDate) || !isValidYmd(endDate)) {
        return res.status(400).json({ success: false, error: 'Некорректные даты' });
      }
      const dayCount = calcDayCountInclusive(startDate, endDate);
      if (!Number.isFinite(dayCount) || dayCount < 5 || dayCount > 21) {
        return res.status(400).json({ success: false, error: 'Выберите от 5 до 21 дня подряд' });
      }
      const property = await propertyQueries.getById(propertyId, propertyType || null);
      if (!property) return res.status(404).json({ success: false, error: 'Объект не найден' });
      const testDriveEnabled =
        property.test_drive === 1 || property.test_drive === true || property.test_drive === '1';
      if (!testDriveEnabled) {
        return res.status(400).json({ success: false, error: 'Тест-драйв недоступен' });
      }
      if (!propertyRowAllowsTestDriveListing(property)) {
        return res.status(400).json({ success: false, error: 'Тест-драйв недоступен' });
      }
      const { dailyPrice, insuranceDeposit } = parseTestDrivePricing(property);
      if (!(dailyPrice > 0)) {
        return res.status(400).json({
          success: false,
          error: 'Продавец не настроил стоимость тест-драйва за сутки',
        });
      }
      const curNorm = normalizeStripeCurrency(property.currency || 'usd');
      if (!curNorm.ok) return res.status(400).json({ success: false, error: curNorm.error });
      const currency = curNorm.currency;
      const stayMajor = roundMoneyMajor(dailyPrice * dayCount);
      const depMajor = roundMoneyMajor(insuranceDeposit || 0);
      const stayCents = majorToStripeMinor(stayMajor, currency);
      const depCents = depMajor > 0 ? majorToStripeMinor(depMajor, currency) : 0;
      const minU = minStripeUnitAmount(currency);
      if (stayCents < minU) {
        return res.status(400).json({ success: false, error: 'Сумма слишком мала для Stripe' });
      }
      const titleShort = (property.title || `Объект #${propertyId}`).slice(0, 80);
      let lineItems;
      if (depCents > 0 && depCents < minU) {
        const combinedCents = stayCents + depCents;
        if (combinedCents < minU) {
          return res.status(400).json({ success: false, error: 'Сумма слишком мала для Stripe' });
        }
        lineItems = [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: combinedCents,
              product_data: {
                name: `Тест-драйв (${dayCount} дн.) + страховой депозит — ${titleShort}`,
                description:
                  `Проживание и депозит, ${startDate} — ${endDate}. Депозит при отсутствии нарушений возвращается на карту в течение недели после проживания.`.slice(
                    0,
                    500
                  ),
              },
            },
          },
        ];
      } else {
        lineItems = [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: stayCents,
              product_data: {
                name: `Тест-драйв: проживание (${dayCount} дн.) — ${titleShort}`,
                description: `Проживание ${startDate} — ${endDate}`.slice(0, 500),
              },
            },
          },
        ];
        if (depCents > 0) {
          lineItems.push({
            quantity: 1,
            price_data: {
              currency,
              unit_amount: depCents,
              product_data: {
                name: `Страховой депозит — ${titleShort}`,
                description:
                  'Депозит удерживается на время проживания; при отсутствии нарушений возвращается на карту в течение недели после выезда.'.slice(
                    0,
                    500
                  ),
              },
            },
          });
        }
      }
      const totalMajorOut = roundMoneyMajor(stayMajor + depMajor);
      const totalCentsOut = stayCents + depCents;
      const successUrl = `${frontendBase}${returnPath}?test_drive_checkout=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${frontendBase}${returnPath}?test_drive_checkout=canceled`;
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: lineItems,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          checkout_purpose: 'test_drive_booking',
          app_user_id: String(userId),
          property_id: String(propertyId),
          property_type: String(property.property_type || propertyType || ''),
          property_table: String(property.source_table || propertyTable || 'properties_apartments'),
          start_date: startDate,
          end_date: endDate,
          days_count: String(dayCount),
          daily_price: String(dailyPrice),
          insurance_deposit: String(insuranceDeposit || 0),
          stay_cents: String(stayCents),
          deposit_cents: String(depCents),
          total_cents: String(totalCentsOut),
          total_major: String(totalMajorOut),
          buyer_contact_channel: buyerContactChannel,
        },
        ...(customerEmail && customerEmail.includes('@') ? { customer_email: customerEmail } : {}),
      });
      return res.json({
        success: true,
        url: session.url,
        data: {
          daily_price: dailyPrice,
          insurance_deposit: insuranceDeposit || 0,
          day_count: dayCount,
          stay_major: stayMajor,
          total_major: totalMajorOut,
          currency: currency.toUpperCase(),
        },
      });
    } catch (err) {
      console.error('[Stripe] create-test-drive-checkout:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка Stripe' });
    }
  });

  app.post('/api/billing/confirm-test-drive-checkout', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ success: false, error: 'Stripe не настроен' });
      }
      const sessionId = typeof req.body?.session_id === 'string' ? req.body.session_id.trim() : '';
      const userId = String(req.body?.userId || '').trim();
      if (!sessionId || !sessionId.startsWith('cs_')) {
        return res.status(400).json({ success: false, error: 'Нужен session_id (cs_...)' });
      }
      if (!/^\d+$/.test(userId)) {
        return res.status(400).json({ success: false, error: 'Нужен числовой userId' });
      }
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      });
      if (String(session.metadata?.app_user_id || '') !== userId) {
        return res.status(403).json({ success: false, error: 'user_mismatch' });
      }
      const result = await processTestDriveBookingPaidSession(stripe, session);
      if (!result.ok) {
        console.warn('[Stripe] confirm-test-drive-checkout failed:', result.error, {
          sessionId,
          userId,
        });
        return res.status(400).json({ success: false, error: result.error || 'confirm_failed' });
      }
      return res.json({
        success: true,
        data: { already: !!result.already, booking_id: result.bookingId || null },
      });
    } catch (err) {
      console.error('[Stripe] confirm-test-drive-checkout:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка Stripe' });
    }
  });

  app.post('/api/billing/confirm-property-reservation', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ success: false, error: 'Stripe не настроен' });
      }
      const sessionId = typeof req.body?.session_id === 'string' ? req.body.session_id.trim() : '';
      const userIdRaw = req.body?.userId;
      const userId = userIdRaw != null ? String(userIdRaw).trim() : '';
      if (!sessionId || !sessionId.startsWith('cs_')) {
        return res.status(400).json({ success: false, error: 'Нужен session_id (cs_...)' });
      }
      if (!userId || !/^\d+$/.test(userId)) {
        return res.status(400).json({ success: false, error: 'Нужен числовой userId' });
      }
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      });
      if (String(session.metadata?.app_user_id || '') !== userId) {
        return res.status(403).json({ success: false, error: 'user_mismatch' });
      }
      let ready = session;
      let attempts = 0;
      const sessionPaidLike = (s) => {
        const pi = s.payment_intent && typeof s.payment_intent === 'object' ? s.payment_intent : null;
        return (
          s.payment_status === 'paid' ||
          s.payment_status === 'no_payment_required' ||
          pi?.status === 'succeeded'
        );
      };
      while (!sessionPaidLike(ready) && attempts < 15) {
        await new Promise((r) => setTimeout(r, 400));
        ready = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
        attempts += 1;
      }
      const result = await processPropertyReservationPaidSession(stripe, ready);
      if (!result.ok) {
        return res.status(400).json({ success: false, error: result.error || 'confirm_failed' });
      }
      const propertyId = parseInt(ready.metadata?.property_id || '', 10);
      const propertyType =
        ready.metadata?.property_type != null ? String(ready.metadata.property_type).trim() : '';
      return res.json({
        success: true,
        data: {
          already: !!result.already,
          propertyId: Number.isFinite(propertyId) ? propertyId : null,
          propertyType: propertyType || null,
        },
      });
    } catch (err) {
      console.error('[Stripe] confirm-property-reservation:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка' });
    }
  });

  app.post('/api/billing/create-listing-publication-checkout', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({
          success: false,
          error: 'Платежи не настроены: задайте STRIPE_SECRET_KEY в .env',
        });
      }
      const userIdRaw = req.body?.userId;
      const customerEmail =
        typeof req.body?.customerEmail === 'string' ? req.body.customerEmail.trim().slice(0, 320) : '';
      let returnPath =
        typeof req.body?.returnPath === 'string' && req.body.returnPath.startsWith('/')
          ? req.body.returnPath.split('?')[0].slice(0, 200)
          : '/owner/property/new';
      if (returnPath.includes('..')) {
        returnPath = '/owner/property/new';
      }

      const userId = userIdRaw != null ? parseInt(String(userIdRaw).trim(), 10) : NaN;
      if (!Number.isFinite(userId) || userId < 1) {
        return res.status(400).json({
          success: false,
          error: 'Укажите числовой userId',
        });
      }

      const buyer = await userQueries.getById(userId);
      if (!buyer) {
        return res.status(404).json({ success: false, error: 'Пользователь не найден' });
      }

      const currency = 'eur';
      const unitAmount = majorToStripeMinor(LISTING_PUBLICATION_FEE_MAJOR_EUR, currency);
      if (unitAmount < minStripeUnitAmount(currency)) {
        return res.status(400).json({
          success: false,
          error: 'Сумма публикации слишком мала для Stripe',
        });
      }

      const successUrl = `${frontendBase}${returnPath}?listing_fee_checkout=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${frontendBase}${returnPath}?listing_fee_checkout=canceled`;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: unitAmount,
              product_data: {
                name: `Размещение объявления на платформе`,
                description: `Оплата публикации объекта (${LISTING_PUBLICATION_FEE_MAJOR_EUR} €).`.slice(0, 500),
              },
            },
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          app_user_id: String(userId),
          checkout_purpose: 'listing_publication_fee',
          listing_fee_cents: String(unitAmount),
        },
        ...(customerEmail && customerEmail.includes('@') ? { customer_email: customerEmail } : {}),
      });

      return res.json({ success: true, url: session.url });
    } catch (err) {
      console.error('[Stripe] create-listing-publication-checkout:', err?.message || err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Ошибка Stripe',
      });
    }
  });

  app.post('/api/billing/confirm-listing-publication-fee', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ success: false, error: 'Stripe не настроен' });
      }
      const sessionId = typeof req.body?.session_id === 'string' ? req.body.session_id.trim() : '';
      const userIdRaw = req.body?.userId;
      const userId = userIdRaw != null ? String(userIdRaw).trim() : '';
      if (!sessionId || !sessionId.startsWith('cs_')) {
        return res.status(400).json({ success: false, error: 'Нужен session_id (cs_...)' });
      }
      if (!userId || !/^\d+$/.test(userId)) {
        return res.status(400).json({ success: false, error: 'Нужен числовой userId' });
      }
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      });
      if (String(session.metadata?.app_user_id || '') !== userId) {
        return res.status(403).json({ success: false, error: 'user_mismatch' });
      }
      let ready = session;
      let attempts = 0;
      const sessionPaidLike = (s) => {
        const pi = s.payment_intent && typeof s.payment_intent === 'object' ? s.payment_intent : null;
        return (
          s.payment_status === 'paid' ||
          s.payment_status === 'no_payment_required' ||
          pi?.status === 'succeeded'
        );
      };
      while (!sessionPaidLike(ready) && attempts < 15) {
        await new Promise((r) => setTimeout(r, 400));
        ready = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
        attempts += 1;
      }
      const result = await processListingPublicationFeePaidSession(stripe, ready);
      if (!result.ok) {
        return res.status(400).json({ success: false, error: result.error || 'confirm_failed' });
      }
      return res.json({ success: true, data: { already: !!result.already } });
    } catch (err) {
      console.error('[Stripe] confirm-listing-publication-fee:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка' });
    }
  });

  app.post('/api/billing/share-purchase-signature-intent', async (req, res) => {
    try {
      const userId = req.body?.userId != null ? parseInt(String(req.body.userId).trim(), 10) : NaN;
      const propertyId = req.body?.propertyId != null ? parseInt(String(req.body.propertyId).trim(), 10) : NaN;
      const propertyType =
        req.body?.propertyType != null ? String(req.body.propertyType).trim().slice(0, 32) : '';
      const sharesCount = req.body?.sharesCount != null ? parseInt(String(req.body.sharesCount).trim(), 10) : NaN;
      const signatureDataUrl =
        typeof req.body?.signatureDataUrl === 'string' ? req.body.signatureDataUrl.trim() : '';

      if (!Number.isFinite(userId) || !Number.isFinite(propertyId) || !propertyType) {
        return res.status(400).json({ success: false, error: 'Укажите userId, propertyId и propertyType' });
      }
      if (!Number.isFinite(sharesCount) || sharesCount < 1) {
        return res.status(400).json({ success: false, error: 'Укажите число долей' });
      }

      const sigOk = validateShareSignatureDataUrl(signatureDataUrl);
      if (!sigOk.ok) {
        return res.status(400).json({ success: false, error: sigOk.error });
      }

      const property = await propertyQueries.getById(propertyId, propertyType);
      if (!property) {
        return res.status(404).json({ success: false, error: 'Объект не найден' });
      }
      if (property.moderation_status && property.moderation_status !== 'approved') {
        return res.status(400).json({ success: false, error: 'Объект недоступен' });
      }
      if (!isShareSaleProperty(property)) {
        return res.status(400).json({ success: false, error: 'Это не долевой объект' });
      }

      const totalShares = property.total_shares != null ? Number(property.total_shares) : 0;
      const sharesSold = property.shares_sold != null ? Number(property.shares_sold) : 0;
      const available = Math.max(0, totalShares - sharesSold);
      if (available <= 0 || sharesCount > available) {
        return res.status(400).json({ success: false, error: 'Недостаточно свободных долей' });
      }

      const row = await sharePurchaseQueries.createSignatureIntent({
        buyerId: userId,
        propertyId,
        propertyType,
        sharesCount,
        signatureData: signatureDataUrl,
      });
      return res.json({ success: true, signingIntentId: row.id });
    } catch (err) {
      if (err?.message === 'invalid_signature_payload') {
        return res.status(400).json({ success: false, error: 'Некорректные данные подписи' });
      }
      console.error('[Stripe] share-purchase-signature-intent:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка сервера' });
    }
  });

  app.post('/api/billing/create-share-purchase-checkout', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({
          success: false,
          error: 'Платежи не настроены: задайте STRIPE_SECRET_KEY в .env',
        });
      }
      const userId = req.body?.userId != null ? parseInt(String(req.body.userId).trim(), 10) : NaN;
      const propertyId = req.body?.propertyId != null ? parseInt(String(req.body.propertyId).trim(), 10) : NaN;
      const propertyType =
        req.body?.propertyType != null ? String(req.body.propertyType).trim().slice(0, 32) : '';
      const sharesCount = req.body?.sharesCount != null ? parseInt(String(req.body.sharesCount).trim(), 10) : NaN;
      const signingIntentId =
        typeof req.body?.signingIntentId === 'string' ? req.body.signingIntentId.trim().slice(0, 48) : '';
      const useWalletDeposit = req.body?.useDeposit === true;
      const customerEmail =
        typeof req.body?.customerEmail === 'string' ? req.body.customerEmail.trim().slice(0, 320) : '';
      let returnPath =
        typeof req.body?.returnPath === 'string' && req.body.returnPath.startsWith('/')
          ? req.body.returnPath.split('?')[0].slice(0, 200)
          : null;
      if (returnPath && returnPath.includes('..')) {
        returnPath = null;
      }

      if (!Number.isFinite(userId) || !Number.isFinite(propertyId) || !propertyType) {
        return res.status(400).json({ success: false, error: 'Укажите userId, propertyId и propertyType' });
      }
      if (!Number.isFinite(sharesCount) || sharesCount < 1) {
        return res.status(400).json({ success: false, error: 'Укажите число долей' });
      }
      if (!signingIntentId || !/^[0-9a-f-]{36}$/i.test(signingIntentId)) {
        return res.status(400).json({
          success: false,
          error: 'Сначала сохраните нарисованную подпись (обновите страницу и попробуйте снова)',
        });
      }

      const intentReady = await sharePurchaseQueries.assertIntentReadyForCheckout(
        signingIntentId,
        userId,
        propertyId,
        propertyType,
        sharesCount
      );
      if (!intentReady.ok) {
        const map = {
          intent_not_found: 'Подпись не найдена — нарисуйте и подтвердите снова',
          intent_consumed: 'Эта подпись уже использована',
          intent_checkout_already_started: 'Оплата уже начата. Завершите в Stripe или начните с новой подписи',
          intent_user_mismatch: 'Несовпадение пользователя',
          intent_property_mismatch: 'Объект или тип изменились — подпишите снова',
          intent_shares_mismatch: 'Количество долей изменилось — подпишите снова',
          intent_expired: 'Подпись устарела (30 мин) — нарисуйте заново',
        };
        return res.status(400).json({
          success: false,
          error: map[intentReady.error] || 'Недействительная подпись',
        });
      }

      const property = await propertyQueries.getById(propertyId, propertyType);
      if (!property) {
        return res.status(404).json({ success: false, error: 'Объект не найден' });
      }
      if (property.moderation_status && property.moderation_status !== 'approved') {
        return res.status(400).json({ success: false, error: 'Объект недоступен для покупки' });
      }
      if (!isShareSaleProperty(property)) {
        return res.status(400).json({ success: false, error: 'Это не долевой объект' });
      }

      const totalShares = property.total_shares != null ? Number(property.total_shares) : 0;
      const sharesSold = property.shares_sold != null ? Number(property.shares_sold) : 0;
      const available = Math.max(0, totalShares - sharesSold);
      if (available <= 0 || sharesCount > available) {
        return res.status(400).json({ success: false, error: 'Недостаточно свободных долей' });
      }

      const curNorm = normalizeStripeCurrency(property.currency || 'usd');
      if (!curNorm.ok) {
        return res.status(400).json({ success: false, error: curNorm.error });
      }
      const currency = curNorm.currency;
      const objectPrice = Number(property.price) || 0;
      if (!(objectPrice > 0) || !(totalShares > 0)) {
        return res.status(400).json({ success: false, error: 'Некорректная цена или число долей объекта' });
      }
      const pricePerShare = objectPrice / totalShares;
      const totalPrice = pricePerShare * sharesCount;
      let walletEurApplied = 0;
      let walletAppliedMajor = 0;
      let fxRateEurToCurrency = currency === 'eur' ? 1 : null;
      if (useWalletDeposit) {
        if (currency === 'eur') {
          walletAppliedMajor = WALLET_DEPOSIT_OFFSET_EUR;
        } else {
          const converted = await convertEurToCurrencyMajor(WALLET_DEPOSIT_OFFSET_EUR, currency);
          walletAppliedMajor = converted.amountMajor;
          fxRateEurToCurrency = converted.rate;
        }
        if (totalPrice <= walletAppliedMajor) {
          return res.status(400).json({
            success: false,
            error: 'Сумма покупки должна быть выше эквивалента 3000 € для списания депозита',
          });
        }
        const buyer = await userQueries.getById(userId);
        const depositAmount = buyer?.deposit_amount != null ? parseFloat(String(buyer.deposit_amount)) || 0 : 0;
        if (depositAmount < WALLET_DEPOSIT_OFFSET_EUR) {
          return res.status(400).json({ success: false, error: 'Недостаточно депозита для списания 3000 €' });
        }
        walletEurApplied = WALLET_DEPOSIT_OFFSET_EUR;
      }
      const stripeTotalMajor = Math.max(0, totalPrice - walletAppliedMajor);
      const unitAmount = majorToStripeMinor(stripeTotalMajor, currency);
      const minUnit = minStripeUnitAmount(currency);
      if (unitAmount < minUnit) {
        return res.status(400).json({
          success: false,
          error: `Сумма слишком мала для оплаты картой (минимум Stripe для ${currency.toUpperCase()})`,
        });
      }

      const titleShort = (property.title || `Объект #${propertyId}`).slice(0, 80);
      const basePath = returnPath || `/shares/${propertyType}-${propertyId}`;
      const successUrl = `${frontendBase}${basePath}?share_checkout=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${frontendBase}${basePath}?share_checkout=canceled`;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: unitAmount,
              product_data: {
                name: `Доли (${sharesCount} шт.) — ${titleShort}`,
                description: `Покупка долей в долевой недвижимости. Объект #${propertyId}, тип ${propertyType}.`.slice(
                  0,
                  500
                ),
              },
            },
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          app_user_id: String(userId),
          property_id: String(propertyId),
          property_type: propertyType,
          shares_count: String(sharesCount),
          checkout_purpose: 'share_purchase',
          signing_intent_id: signingIntentId,
          agreement_signature: '[drawn]',
          policy_version: SHARE_PURCHASE_POLICY_VERSION,
          price_per_share_major: String(pricePerShare),
          total_price_major: String(totalPrice),
          stripe_total_major: String(stripeTotalMajor),
          wallet_applied_major: String(walletAppliedMajor),
          fx_rate_eur_to_currency: fxRateEurToCurrency != null ? String(fxRateEurToCurrency) : '',
          wallet_eur_applied: String(walletEurApplied),
          use_wallet_deposit: useWalletDeposit ? '1' : '0',
          total_cents: String(unitAmount),
        },
        ...(customerEmail && customerEmail.includes('@') ? { customer_email: customerEmail } : {}),
      });

      const attached = await sharePurchaseQueries.attachStripeSessionToIntent(signingIntentId, session.id);
      if (!attached) {
        try {
          await stripe.checkout.sessions.expire(session.id);
        } catch (expireErr) {
          console.warn('[Stripe] share purchase expire orphan session:', expireErr?.message || expireErr);
        }
        return res.status(409).json({
          success: false,
          error: 'Не удалось привязать подпись к оплате. Нарисуйте подпись ещё раз.',
        });
      }

      return res.json({ success: true, url: session.url });
    } catch (err) {
      console.error('[Stripe] create-share-purchase-checkout:', err?.message || err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Ошибка Stripe',
      });
    }
  });

  app.post('/api/billing/confirm-share-purchase', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ success: false, error: 'Stripe не настроен' });
      }
      const sessionId = typeof req.body?.session_id === 'string' ? req.body.session_id.trim() : '';
      const userIdRaw = req.body?.userId;
      const userId = userIdRaw != null ? String(userIdRaw).trim() : '';
      if (!sessionId || !sessionId.startsWith('cs_')) {
        return res.status(400).json({ success: false, error: 'Нужен session_id (cs_...)' });
      }
      if (!userId || !/^\d+$/.test(userId)) {
        return res.status(400).json({ success: false, error: 'Нужен числовой userId' });
      }
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      });
      if (String(session.metadata?.app_user_id || '') !== userId) {
        return res.status(403).json({ success: false, error: 'user_mismatch' });
      }
      if (session.metadata?.checkout_purpose !== 'share_purchase') {
        return res.status(400).json({ success: false, error: 'wrong_session_type' });
      }
      let ready = session;
      let attempts = 0;
      const sessionPaidLike = (s) => {
        const pi = s.payment_intent && typeof s.payment_intent === 'object' ? s.payment_intent : null;
        return (
          s.payment_status === 'paid' ||
          s.payment_status === 'no_payment_required' ||
          pi?.status === 'succeeded'
        );
      };
      while (!sessionPaidLike(ready) && attempts < 15) {
        await new Promise((r) => setTimeout(r, 400));
        ready = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
        attempts += 1;
      }
      const result = await processSharePurchasePaidSession(stripe, ready);
      if (!result.ok) {
        return res.status(400).json({ success: false, error: result.error || 'confirm_failed' });
      }
      const propertyId = parseInt(ready.metadata?.property_id || '', 10);
      const propertyType =
        ready.metadata?.property_type != null ? String(ready.metadata.property_type).trim() : '';
      return res.json({
        success: true,
        data: {
          already: !!result.already,
          propertyId: Number.isFinite(propertyId) ? propertyId : null,
          propertyType: propertyType || null,
        },
      });
    } catch (err) {
      console.error('[Stripe] confirm-share-purchase:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка' });
    }
  });

  /** Профиль / админка: покупки долей пользователя */
  app.get('/api/users/:userId/share-purchases', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      if (!Number.isFinite(userId)) {
        return res.status(400).json({ success: false, error: 'Некорректный userId' });
      }
      const user = await userQueries.getById(userId);
      const email = user?.email ? String(user.email).trim().toLowerCase() : '';
      let userIds = [userId];

      // Один и тот же человек может иметь buyer+seller на одном email.
      // В таком кейсе показываем покупки долей в обоих кабинетах.
      if (email) {
        const sameEmailUsers = await userQueries.getAllByEmail(email);
        const ids = sameEmailUsers
          .map((u) => Number(u.id))
          .filter((id) => Number.isFinite(id) && id > 0);
        if (ids.length > 0) {
          userIds = Array.from(new Set(ids));
        }
      }

      const allRows = await Promise.all(
        userIds.map((id) => sharePurchaseQueries.listByBuyerEnriched(id, 100))
      );
      const rows = allRows
        .flat()
        .filter(Boolean)
        .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());
      const dedupedRows = Array.from(new Map(rows.map((row) => [row.id, row])).values());
      return res.json({ success: true, data: dedupedRows });
    } catch (err) {
      console.error('[Stripe] share-purchases:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/billing/confirm-wallet-deposit', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ success: false, error: 'Stripe не настроен' });
      }
      const sessionId = typeof req.body?.session_id === 'string' ? req.body.session_id.trim() : '';
      const userIdRaw = req.body?.userId;
      const userId = userIdRaw != null ? String(userIdRaw).trim() : '';
      if (!sessionId || !sessionId.startsWith('cs_')) {
        return res.status(400).json({ success: false, error: 'Нужен session_id (cs_...)' });
      }
      if (!userId || !/^\d+$/.test(userId)) {
        return res.status(400).json({ success: false, error: 'Нужен числовой userId' });
      }
      const result = await confirmWalletDepositSession(stripe, sessionId, userId);
      if (!result.ok) {
        const status = result.error === 'user_mismatch' ? 403 : 400;
        return res.status(status).json({ success: false, error: result.error || 'confirm_failed' });
      }
      return res.json({
        success: true,
        data: {
          credited: !!result.credited,
          already: !!result.already,
          amountEur: result.amountEur ?? null,
        },
      });
    } catch (err) {
      console.error('[Stripe] confirm-wallet-deposit:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка' });
    }
  });

  /** После редиректа с Checkout — подтянуть сессию в БД (если webhook ещё не пришёл). */
  app.post('/api/billing/confirm-session', async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ success: false, error: 'Stripe не настроен' });
      }
      const sessionId = typeof req.body?.session_id === 'string' ? req.body.session_id.trim() : '';
      if (!sessionId || !sessionId.startsWith('cs_')) {
        return res.status(400).json({ success: false, error: 'Нужен session_id (cs_...)' });
      }
      const expectedUserId =
        req.body?.userId != null || req.body?.expectedUserId != null
          ? String(req.body?.userId ?? req.body?.expectedUserId).trim()
          : '';
      const result = await syncCheckoutSessionToDatabase(stripe, sessionId, { expectedUserId });
      if (!result.ok) {
        const status = result.error === 'user_mismatch' ? 403 : 400;
        return res.status(status).json({ success: false, error: result.error || 'sync_failed' });
      }
      return res.json({ success: true, data: result.data || null });
    } catch (err) {
      console.error('[Stripe] confirm-session:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка' });
    }
  });

  app.get('/api/billing/fx/eur-to/:currency', async (req, res) => {
    try {
      const currency = String(req.params.currency || '')
        .trim()
        .toLowerCase();
      if (!/^[a-z]{3}$/.test(currency)) {
        return res.status(400).json({ success: false, error: 'Некорректная валюта' });
      }
      const rate = await getEurToCurrencyRate(currency);
      const amount3000 = roundMoneyMajor(WALLET_DEPOSIT_OFFSET_EUR * rate);
      return res.json({
        success: true,
        data: {
          from: 'EUR',
          to: currency.toUpperCase(),
          rate,
          amount3000,
        },
      });
    } catch (err) {
      console.error('[Stripe] fx eur-to:', err?.message || err);
      return res.status(500).json({ success: false, error: 'Не удалось получить курс валют' });
    }
  });

  app.get('/api/billing/fx/convert', async (req, res) => {
    try {
      const from = String(req.query?.from || '')
        .trim()
        .toLowerCase();
      const to = String(req.query?.to || '')
        .trim()
        .toLowerCase();
      const amount = Number(req.query?.amount);
      if (!/^[a-z]{3}$/.test(from) || !/^[a-z]{3}$/.test(to)) {
        return res.status(400).json({ success: false, error: 'Некорректные валюты' });
      }
      if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({ success: false, error: 'Некорректная сумма' });
      }
      const converted = await convertCurrencyMajor(amount, from, to);
      return res.json({
        success: true,
        data: {
          from: from.toUpperCase(),
          to: to.toUpperCase(),
          rate: converted.rate,
          amount: converted.amountMajor,
        },
      });
    } catch (err) {
      console.error('[Stripe] fx convert:', err?.message || err);
      return res.status(500).json({ success: false, error: 'Не удалось конвертировать сумму' });
    }
  });

  /** Профиль: текущая подписка + платежи */
  app.get('/api/users/:userId/subscription-billing', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      if (!Number.isFinite(userId)) {
        return res.status(400).json({ success: false, error: 'Некорректный userId' });
      }
      const state = await stripeSubscriptionQueries.getStateByUserId(userId);
      const payments = await stripeSubscriptionQueries.listPaymentsByUserId(userId, 50);
      const userRow = await userQueries.getById(userId);
      const nowMs = Date.now();
      const untilMs = userRow?.vip_until ? new Date(userRow.vip_until).getTime() : 0;
      const vipClub = {
        active: Boolean(untilMs && untilMs > nowMs),
        until: userRow?.vip_until || null,
        grantedAt: userRow?.vip_granted_at || null,
      };
      return res.json({
        success: true,
        data: {
          subscription: state,
          payments,
          vipClub,
        },
      });
    } catch (err) {
      console.error('[Stripe] subscription-billing:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  /** Профиль: резервы 10% (мои покупки) */
  app.get('/api/users/:userId/reservation-purchases', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      if (!Number.isFinite(userId)) {
        return res.status(400).json({ success: false, error: 'Некорректный userId' });
      }
      const rows = await stripeSubscriptionQueries.listReservationPurchasesByUserId(userId, 100);
      const items = await Promise.all(
        rows.map(async (row) => {
          let billing = {};
          try {
            billing = JSON.parse(row.billing_reason || '{}');
          } catch {
            billing = {};
          }
          const pid = billing.property_id;
          let property_image = null;
          let property_title = null;
          let property_location = null;
          let property_address = null;
          let property_city = null;
          let property_country = null;
          let property_price = null;
          let property_type = null;
          let property_sale_type = null;
          let property_is_debt = null;
          let property_has_debt = null;
          if (pid != null) {
            try {
              const p = await propertyQueries.getById(pid, billing.property_type || null);
              if (p) {
                property_title = p.title || null;
                property_image = firstReservationPropertyPhotoUrl(p);
                property_location = p.location || null;
                property_address = p.address || null;
                property_city = p.city || null;
                property_country = p.country || null;
                property_price = p.minimum_sale_price ?? p.price ?? null;
                property_type = p.property_type || billing.property_type || null;
                property_sale_type = p.sale_type || null;
                property_is_debt = p.is_debt ?? null;
                property_has_debt = p.has_debt ?? null;
              }
            } catch {
              /* ignore */
            }
          }
          return {
            ...row,
            billing,
            property_image,
            property_title,
            property_location,
            property_address,
            property_city,
            property_country,
            property_price,
            property_type,
            property_sale_type,
            property_is_debt,
            property_has_debt,
          };
        })
      );
      return res.json({ success: true, data: items });
    } catch (err) {
      console.error('[Stripe] reservation-purchases:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  /** Админка: резервы 10% с данными покупателя */
  app.get('/api/admin/reservation-purchases', async (req, res) => {
    try {
      const rows = await stripeSubscriptionQueries.listAllReservationPurchasesWithUsers(500);
      const items = rows.map((row) => {
        let billing = {};
        try {
          billing = JSON.parse(row.billing_reason || '{}');
        } catch {
          billing = {};
        }
        return { ...row, billing };
      });
      return res.json({ success: true, data: items, totalCount: items.length });
    } catch (err) {
      console.error('[Stripe] admin reservation-purchases:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  /** Админка: все платежи */
  app.get('/api/admin/stripe-payments', async (req, res) => {
    try {
      const rows = await stripeSubscriptionQueries.listAllPaymentsWithUsers(2000);
      const total = await stripeSubscriptionQueries.countPayments();
      return res.json({
        success: true,
        data: {
          payments: rows,
          totalCount: total,
        },
      });
    } catch (err) {
      console.error('[Stripe] admin stripe-payments:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  if (stripe && priceIdPro) {
    console.log(
      '[Stripe] Подписка Pro: Checkout включён (STRIPE_PRICE_ID_PRO; в Checkout валюта = валюте этой цены в Dashboard — должна быть EUR)'
    );
    if (priceIdProYear) {
      console.log('[Stripe] Подписка Pro (год): Checkout включён (STRIPE_PRICE_ID_PRO_YEAR)');
    } else {
      console.log('[Stripe] Подписка Pro (год): отключена, задайте STRIPE_PRICE_ID_PRO_YEAR');
    }
  } else {
    console.log(
      '[Stripe] Checkout Pro отключён: укажите STRIPE_SECRET_KEY и STRIPE_PRICE_ID_PRO в .env'
    );
  }
  if (stripe && priceIdDeposit) {
    console.log(
      '[Stripe] Депозит (кошелёк): STRIPE_PRICE_ID_DEPOSIT задан (price_ или prod_)'
    );
  } else {
    console.log(
      '[Stripe] Депозит Checkout отключён: задайте STRIPE_PRICE_ID_DEPOSIT (price_ или prod_ продукта Deposit)'
    );
  }
}
