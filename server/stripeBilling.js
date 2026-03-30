import Stripe from 'stripe';
import { stripeSubscriptionQueries, getDatabase } from './database/database.js';

/**
 * Stripe Checkout + webhook + синхронизация подписки Pro.
 * STRIPE_SECRET_KEY, STRIPE_PRICE_ID_PRO, FRONTEND_URL;
 * STRIPE_PRICE_ID_DEPOSIT — price_... или prod_... (для prod подставится активная recurring-цена);
 * опционально STRIPE_WEBHOOK_SECRET для POST /api/webhooks/stripe
 */

function getStripe() {
  const secret = (process.env.STRIPE_SECRET_KEY || '').trim();
  return secret ? new Stripe(secret) : null;
}

function isoFromUnix(sec) {
  if (sec == null) return null;
  return new Date(sec * 1000).toISOString();
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

function ensureWalletDepositCreditsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stripe_wallet_deposit_credits (
      dedupe_key TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      amount_eur REAL NOT NULL,
      stripe_invoice_id TEXT,
      stripe_checkout_session_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_stripe_wallet_deposit_user ON stripe_wallet_deposit_credits(user_id);
  `);
}

/**
 * Идемпотентное зачисление депозита по оплаченному инвойсу подписки Deposit (metadata checkout_purpose=wallet_deposit).
 */
export function creditWalletDepositFromPaidInvoice(invoice, subscription) {
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

  const db = getDatabase();
  ensureWalletDepositCreditsTable(db);

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
    const run = db.transaction(() => {
      const ins = db.prepare(`
        INSERT OR IGNORE INTO stripe_wallet_deposit_credits (dedupe_key, user_id, amount_eur, stripe_invoice_id, stripe_checkout_session_id)
        VALUES (?, ?, ?, ?, ?)
      `);
      const r = ins.run(dedupeKey, userId, amountEur, invoice.id, null);
      const isNewCredit = r.changes > 0;

      if (isNewCredit) {
        const user = db.prepare('SELECT deposit_amount FROM users WHERE id = ?').get(userId);
        if (!user) {
          throw new Error('user_not_found');
        }
        const cur = user.deposit_amount != null ? parseFloat(user.deposit_amount) : 0;
        db.prepare('UPDATE users SET deposit_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
          cur + amountEur,
          userId
        );
        try {
          db.prepare(
            `INSERT INTO transactions (user_id, type, amount, description, created_at) VALUES (?, 'deposit', ?, ?, CURRENT_TIMESTAMP)`
          ).run(userId, amountEur, 'Пополнение депозита (Stripe)');
        } catch (e) {
          console.warn('[Stripe] transactions insert:', e.message);
        }
      }

      stripeSubscriptionQueries.insertPayment({
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

      if (!isNewCredit) {
        return { already: true };
      }
      return { credited: true, amountEur };
    });
    const out = run();
    return { ok: true, ...out };
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
  return creditWalletDepositFromPaidInvoice(inv, sub);
}

/**
 * Сохраняет подписку и первый платёж из Checkout Session (idempotent).
 */
export async function syncCheckoutSessionToDatabase(stripe, sessionId) {
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

  const uid = parseInt(session.metadata?.app_user_id || '', 10);
  if (!Number.isFinite(uid)) {
    return { ok: false, error: 'no_app_user_id' };
  }

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

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

  stripeSubscriptionQueries.upsertState({
    user_id: uid,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    plan_key: 'pro',
    status: sub.status,
    current_period_start: isoFromUnix(sub.current_period_start),
    current_period_end: isoFromUnix(sub.current_period_end),
    cancel_at_period_end: !!sub.cancel_at_period_end,
  });

  const amount = session.amount_total ?? 0;
  const currency = (session.currency || 'eur').toLowerCase();
  const dedupeKey = invoiceId || `cs_${session.id}`;
  const paidAt = session.status === 'complete' ? new Date().toISOString() : new Date().toISOString();

  stripeSubscriptionQueries.insertPayment({
    dedupe_key: dedupeKey,
    user_id: uid,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_invoice_id: invoiceId || null,
    stripe_checkout_session_id: session.id,
    amount_cents: amount,
    currency,
    status: 'paid',
    plan_key: 'pro',
    billing_reason: 'subscription_create',
    paid_at: paidAt,
    period_start: isoFromUnix(sub.current_period_start),
    period_end: isoFromUnix(sub.current_period_end),
    customer_email: session.customer_details?.email || session.customer_email || null,
  });

  return { ok: true };
}

async function persistInvoicePaid(stripe, invoice) {
  if (invoice.status !== 'paid' || !invoice.amount_paid) return;
  const invoiceId = invoice.id;
  const subscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  if (sub.metadata?.checkout_purpose === 'wallet_deposit') {
    const r = creditWalletDepositFromPaidInvoice(invoice, sub);
    if (r.ok && r.credited) {
      console.log(
        `[Stripe] Депозит зачислён (invoice.paid): user ${sub.metadata?.app_user_id}, +${r.amountEur} EUR`
      );
    }
    return;
  }

  let userId = stripeSubscriptionQueries.getUserIdBySubscriptionId(subscriptionId);
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

  if (!userId) {
    userId = parseInt(sub.metadata?.app_user_id || '', 10);
    if (!Number.isFinite(userId)) {
      console.warn('[Stripe] invoice.paid: не найден user_id для', subscriptionId);
      return;
    }
    stripeSubscriptionQueries.upsertState({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan_key: 'pro',
      status: sub.status,
      current_period_start: isoFromUnix(sub.current_period_start),
      current_period_end: isoFromUnix(sub.current_period_end),
      cancel_at_period_end: !!sub.cancel_at_period_end,
    });
  }

  stripeSubscriptionQueries.insertPayment({
    dedupe_key: invoiceId,
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_invoice_id: invoiceId,
    stripe_checkout_session_id: null,
    amount_cents: invoice.amount_paid,
    currency: (invoice.currency || 'eur').toLowerCase(),
    status: 'paid',
    plan_key: 'pro',
    billing_reason: invoice.billing_reason || null,
    paid_at: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : new Date().toISOString(),
    period_start: isoFromUnix(invoice.period_start),
    period_end: isoFromUnix(invoice.period_end),
    customer_email: invoice.customer_email || null,
  });
}

async function handleSubscriptionUpdated(subscription) {
  if (subscription.metadata?.checkout_purpose === 'wallet_deposit') {
    return;
  }
  const subId = subscription.id;
  let userId = stripeSubscriptionQueries.getUserIdBySubscriptionId(subId);
  if (!userId) {
    userId = parseInt(subscription.metadata?.app_user_id || '', 10);
  }
  if (!Number.isFinite(userId)) return;

  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

  stripeSubscriptionQueries.upsertState({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subId,
    plan_key: 'pro',
    status: subscription.status,
    current_period_start: isoFromUnix(subscription.current_period_start),
    current_period_end: isoFromUnix(subscription.current_period_end),
    cancel_at_period_end: !!subscription.cancel_at_period_end,
  });
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

export function registerStripeBillingRoutes(app) {
  const stripe = getStripe();
  const priceIdPro = (process.env.STRIPE_PRICE_ID_PRO || '').trim();
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
      const plan = String(req.body?.plan || '').toLowerCase();
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

      if (plan !== 'pro') {
        return res.status(400).json({
          success: false,
          error: 'Неизвестный план. Доступны: pro, deposit',
        });
      }
      if (!priceIdPro) {
        return res.status(503).json({
          success: false,
          error: 'Не задан STRIPE_PRICE_ID_PRO (ID цены из Stripe → продукт Pro)',
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceIdPro, quantity: 1 }],
        success_url: `${frontendBase}/subscriptions?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendBase}/subscriptions?checkout=canceled`,
        metadata: userId ? { app_user_id: userId } : {},
        subscription_data: userId ? { metadata: { app_user_id: userId } } : undefined,
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
      const result = await syncCheckoutSessionToDatabase(stripe, sessionId);
      if (!result.ok) {
        return res.status(400).json({ success: false, error: result.error || 'sync_failed' });
      }
      return res.json({ success: true });
    } catch (err) {
      console.error('[Stripe] confirm-session:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Ошибка' });
    }
  });

  /** Профиль: текущая подписка + платежи */
  app.get('/api/users/:userId/subscription-billing', (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      if (!Number.isFinite(userId)) {
        return res.status(400).json({ success: false, error: 'Некорректный userId' });
      }
      const state = stripeSubscriptionQueries.getStateByUserId(userId);
      const payments = stripeSubscriptionQueries.listPaymentsByUserId(userId, 50);
      return res.json({
        success: true,
        data: {
          subscription: state,
          payments,
        },
      });
    } catch (err) {
      console.error('[Stripe] subscription-billing:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  /** Админка: все платежи */
  app.get('/api/admin/stripe-payments', (req, res) => {
    try {
      const rows = stripeSubscriptionQueries.listAllPaymentsWithUsers(2000);
      const total = stripeSubscriptionQueries.countPayments();
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
    console.log('[Stripe] Подписка Pro: Checkout включён (STRIPE_PRICE_ID_PRO задан)');
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
