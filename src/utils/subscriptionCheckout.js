const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

/**
 * Редирект на Stripe Checkout для подписки Pro.
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function startProSubscriptionCheckout({ userId, customerEmail } = {}) {
  const res = await fetch(`${API_BASE}/billing/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: 'pro',
      userId: userId != null ? String(userId) : undefined,
      customerEmail: customerEmail || undefined,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: data.error || 'Не удалось создать сессию оплаты' }
  }
  if (data.url) {
    window.location.href = data.url
    return { ok: true }
  }
  return { ok: false, error: 'Сервер не вернул ссылку на оплату' }
}
