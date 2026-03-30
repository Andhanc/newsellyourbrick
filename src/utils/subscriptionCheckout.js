const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

/** После возврата с Stripe — синхронизировать сессию в БД */
export async function confirmCheckoutSession(sessionId) {
  const res = await fetch(`${API_BASE}/billing/confirm-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: data.error || 'confirm_failed' }
  return { ok: true }
}

/**
 * Редирект на Stripe Checkout для подписки Pro.
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
/**
 * Checkout подписки «Deposit» (кошелёк): после успешной оплаты баланс зачисляется через webhook / confirm.
 */
export async function startDepositWalletCheckout({ userId, customerEmail } = {}) {
  const res = await fetch(`${API_BASE}/billing/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: 'deposit',
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

/** После редиректа с Checkout Deposit — зачислить баланс, если webhook ещё не обработал. */
export async function confirmWalletDepositSession(sessionId, userId) {
  const res = await fetch(`${API_BASE}/billing/confirm-wallet-deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, userId: String(userId) }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: data.error || 'confirm_failed' }
  }
  return { ok: true, data: data.data }
}

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
