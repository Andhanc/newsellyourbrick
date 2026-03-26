import Stripe from 'stripe';
import { stripeSubscriptionQueries } from './database/database.js';

/**
 * Stripe Checkout + webhook + синхронизация подписки Pro.
 * STRIPE_SECRET_KEY, STRIPE_PRICE_ID_PRO, FRONTEND_URL;
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

/**
 * Сохраняет подписку и первый платёж из Checkout Session (idempotent).
 */
export async function syncCheckoutSessionToDatabase(stripe, sessionId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription', 'line_items'],
  });
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

  let userId = stripeSubscriptionQueries.getUserIdBySubscriptionId(subscriptionId);
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

  if (!userId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
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
          if (session.mode === 'subscription') {
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
      if (plan !== 'pro') {
        return res.status(400).json({ success: false, error: 'Сейчас доступна только подписка Pro' });
      }
      if (!priceIdPro) {
        return res.status(503).json({
          success: false,
          error: 'Не задан STRIPE_PRICE_ID_PRO (ID цены из Stripe → продукт Pro)',
        });
      }

      const userId = req.body?.userId != null ? String(req.body.userId).slice(0, 128) : '';
      const customerEmail =
        typeof req.body?.customerEmail === 'string' ? req.body.customerEmail.trim().slice(0, 320) : '';

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
}
