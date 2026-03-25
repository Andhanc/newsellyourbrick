import Stripe from 'stripe';

/**
 * Stripe Checkout для подписки Pro (mode: subscription).
 * Переменные: STRIPE_SECRET_KEY, STRIPE_PRICE_ID_PRO, опционально FRONTEND_URL.
 */
export function registerStripeBillingRoutes(app) {
  const secret = (process.env.STRIPE_SECRET_KEY || '').trim();
  const priceIdPro = (process.env.STRIPE_PRICE_ID_PRO || '').trim();
  const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

  const stripe = secret ? new Stripe(secret) : null;

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

  if (stripe && priceIdPro) {
    console.log('[Stripe] Подписка Pro: Checkout включён (STRIPE_PRICE_ID_PRO задан)');
  } else {
    console.log(
      '[Stripe] Checkout Pro отключён: укажите STRIPE_SECRET_KEY и STRIPE_PRICE_ID_PRO в .env'
    );
  }
}
