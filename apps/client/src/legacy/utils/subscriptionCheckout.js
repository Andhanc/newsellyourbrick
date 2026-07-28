/**
 * Если в .env указан только origin бэкенда без /api (например http://localhost:3000),
 * запросы на /billing/... уходили в никуда — добавляем /api.
 */
function normalizeBillingApiBase() {
  let base = String(import.meta.env?.VITE_API_BASE_URL ?? '/api').trim()
  if (!base) base = '/api'
  if (!/^https?:\/\//i.test(base)) {
    return base.replace(/\/+$/, '') || '/api'
  }
  const noTrailing = base.replace(/\/+$/, '')
  if (/\/api$/i.test(noTrailing)) return noTrailing
  return `${noTrailing}/api`
}

const API_BASE = normalizeBillingApiBase()
const DEFAULT_FETCH_TIMEOUT_MS = 45000

function billingFetchErrorMessage(error) {
  const msg = String(error?.message || '')
  if (error?.name === 'AbortError' || msg.includes('abort')) {
    return 'Превышено время ожидания ответа сервера. Проверьте, что API запущен, и попробуйте снова.'
  }
  const isNetwork =
    error?.name === 'TypeError' && (msg.includes('fetch') || msg.includes('Failed') || msg.includes('Network'))
  return isNetwork
    ? 'Нет связи с сервером. Запустите API (npm run server) или проверьте VITE_API_BASE_URL.'
    : msg || 'Ошибка сети'
}

async function fetchBillingJson(path, options = {}, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
    })
    const data = await res.json().catch(() => ({}))
    return { res, data }
  } catch (error) {
    throw new Error(billingFetchErrorMessage(error))
  } finally {
    window.clearTimeout(timer)
  }
}

/**
 * Переход на hosted Stripe Checkout.
 * Используем assign(), а не href/assign history quirks: иначе в истории остаётся checkout.stripe.com
 * и кнопка «Назад» после оплаты снова открывает Stripe.
 * @returns {boolean} true если редирект инициирован
 */
export function navigateToStripeCheckout(checkoutUrl) {
  const u = String(checkoutUrl || '').trim()
  if (!/^https?:\/\//i.test(u)) return false
  window.location.assign(u)
  return true
}

/** После возврата с Stripe — синхронизировать сессию в БД */
export async function confirmCheckoutSession(sessionId, userId) {
  const resolvedUserId =
    userId != null && String(userId).trim()
      ? String(userId).trim()
      : typeof window !== 'undefined'
        ? window.localStorage.getItem('userId')
        : ''
  const res = await fetch(`${API_BASE}/billing/confirm-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      userId: resolvedUserId || undefined,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: data.error || 'confirm_failed' }
  return { ok: true, data: data.data || null }
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
    navigateToStripeCheckout(data.url)
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

export async function startProSubscriptionCheckout({ userId, customerEmail, billingCycle = 'monthly' } = {}) {
  const normalizedBillingCycle = billingCycle === 'yearly' ? 'yearly' : 'monthly'
  const res = await fetch(`${API_BASE}/billing/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: 'pro',
      billingCycle: normalizedBillingCycle,
      userId: userId != null ? String(userId) : undefined,
      customerEmail: customerEmail || undefined,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: data.error || 'Не удалось создать сессию оплаты' }
  }
  if (data.url) {
    navigateToStripeCheckout(data.url)
    return { ok: true }
  }
  return { ok: false, error: 'Сервер не вернул ссылку на оплату' }
}

/** Stripe Checkout: подписка VIP (нужны STRIPE_PRICE_ID_VIP в .env на сервере). */
export async function startVipSubscriptionCheckout({ userId, customerEmail, billingCycle = 'monthly' } = {}) {
  const normalizedBillingCycle = billingCycle === 'yearly' ? 'yearly' : 'monthly'
  const res = await fetch(`${API_BASE}/billing/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: 'vip',
      billingCycle: normalizedBillingCycle,
      userId: userId != null ? String(userId) : undefined,
      customerEmail: customerEmail || undefined,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: data.error || 'Не удалось создать сессию оплаты' }
  }
  if (data.url) {
    navigateToStripeCheckout(data.url)
    return { ok: true }
  }
  return { ok: false, error: 'Сервер не вернул ссылку на оплату' }
}

export async function startOwnerSubscriptionCheckout({
  plan,
  userId,
  customerEmail,
  billingCycle = 'monthly',
  returnPath,
} = {}) {
  const normalizedBillingCycle = billingCycle === 'yearly' ? 'yearly' : 'monthly'
  const normalizedPlan = String(plan || '').toLowerCase()
  const res = await fetch(`${API_BASE}/billing/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan: normalizedPlan,
      billingCycle: normalizedBillingCycle,
      userId: userId != null ? String(userId) : undefined,
      customerEmail: customerEmail || undefined,
      returnPath: returnPath || undefined,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: data.error || 'Не удалось создать сессию оплаты' }
  }
  if (data.url) {
    navigateToStripeCheckout(data.url)
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
  try {
    const { res, data } = await fetchBillingJson('/billing/create-property-reservation-checkout', {
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
    if (!res.ok) {
      return { ok: false, error: data.error || 'Не удалось создать оплату резерва' }
    }
    const checkoutUrl =
      typeof data.url === 'string'
        ? data.url
        : typeof data?.data?.url === 'string'
          ? data.data.url
          : ''
    if (checkoutUrl && /^https?:\/\//i.test(checkoutUrl)) {
      const redirected = navigateToStripeCheckout(checkoutUrl)
      return { ok: true, redirected }
    }
    return { ok: false, error: 'Сервер не вернул ссылку на оплату' }
  } catch (e) {
    return { ok: false, error: e?.message || 'Ошибка сети' }
  }
}

export async function confirmPropertyReservationSession(sessionId, userId) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 45000)
  try {
    const body = { session_id: sessionId }
    if (userId != null && /^\d+$/.test(String(userId))) {
      body.userId = String(userId)
    }
    const res = await fetch(`${API_BASE}/billing/confirm-property-reservation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, error: data.error || 'confirm_failed' }
    }
    return { ok: true, data: data.data }
  } catch (error) {
    return { ok: false, error: error?.message || 'confirm_failed' }
  } finally {
    window.clearTimeout(timer)
  }
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
      navigateToStripeCheckout(checkoutUrl)
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
