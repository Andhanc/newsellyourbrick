/**
 * Если в .env указан только origin бэкенда без /api (например http://localhost:3000),
 * запросы на /billing/... уходили в никуда — добавляем /api.
 */
function normalizeBillingApiBase() {
  let base = String(import.meta.env.VITE_API_BASE_URL ?? '/api').trim()
  if (!base) base = '/api'
  if (!/^https?:\/\//i.test(base)) {
    return base.replace(/\/+$/, '') || '/api'
  }
  const noTrailing = base.replace(/\/+$/, '')
  if (/\/api$/i.test(noTrailing)) return noTrailing
  return `${noTrailing}/api`
}

const API_BASE = normalizeBillingApiBase()

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

/**
 * Резерв 10% (Stripe Checkout, сумма считается на сервере по объекту).
 */
export async function startPropertyReservationCheckout({
  userId,
  propertyId,
  propertyType,
  customerEmail,
  returnPath,
  useDeposit,
  signingIntentId,
} = {}) {
  const res = await fetch(`${API_BASE}/billing/create-property-reservation-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userId != null ? String(userId) : undefined,
      propertyId: propertyId != null ? String(propertyId) : undefined,
      propertyType: propertyType || undefined,
      customerEmail: customerEmail || undefined,
      returnPath: returnPath || undefined,
      useDeposit: useDeposit === true,
      signingIntentId: signingIntentId || undefined,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: data.error || 'Не удалось создать оплату резерва' }
  }
  if (data.url) {
    window.location.href = data.url
    return { ok: true }
  }
  return { ok: false, error: 'Сервер не вернул ссылку на оплату' }
}

export async function confirmPropertyReservationSession(sessionId, userId) {
  const res = await fetch(`${API_BASE}/billing/confirm-property-reservation`, {
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

/** Stripe Checkout: оплата публикации объявления (фикс. сумма в EUR на сервере). */
export async function startListingPublicationCheckout({
  userId,
  customerEmail,
  returnPath,
} = {}) {
  try {
    const res = await fetch(`${API_BASE}/billing/create-listing-publication-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId != null ? String(userId) : undefined,
        customerEmail: customerEmail || undefined,
        returnPath: returnPath || undefined,
      }),
    })
    const data = await res.json().catch(() => ({}))
    const errText = data.error || data.message || 'Не удалось создать оплату публикации'
    if (!res.ok) {
      return { ok: false, error: errText }
    }
    const checkoutUrl =
      typeof data.url === 'string'
        ? data.url
        : typeof data?.data?.url === 'string'
          ? data.data.url
          : ''
    if (checkoutUrl && /^https?:\/\//i.test(checkoutUrl)) {
      window.location.assign(checkoutUrl)
      return { ok: true }
    }
    return { ok: false, error: 'Сервер не вернул ссылку на оплату (проверьте STRIPE_SECRET_KEY и логи API).' }
  } catch (e) {
    const msg = String(e?.message || '')
    const isNetwork =
      e?.name === 'TypeError' && (msg.includes('fetch') || msg.includes('Failed') || msg.includes('Network'))
    return {
      ok: false,
      error: isNetwork
        ? 'Нет связи с сервером. Запустите API (npm run server) или проверьте VITE_API_BASE_URL (нужен путь …/api).'
        : msg || 'Ошибка сети',
    }
  }
}

export async function confirmListingPublicationFeeSession(sessionId, userId) {
  try {
    const res = await fetch(`${API_BASE}/billing/confirm-listing-publication-fee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, userId: String(userId) }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, error: data.error || data.message || 'confirm_failed' }
    }
    return { ok: true, data: data.data }
  } catch (e) {
    const msg = String(e?.message || '')
    const isNetwork =
      e?.name === 'TypeError' && (msg.includes('fetch') || msg.includes('Failed') || msg.includes('Network'))
    return {
      ok: false,
      error: isNetwork ? 'Нет связи с сервером при подтверждении оплаты.' : msg || 'confirm_failed',
    }
  }
}
