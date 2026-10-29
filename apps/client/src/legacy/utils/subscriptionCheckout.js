/**
 * If VITE_API_BASE_URL is only the backend origin without /api
 * (e.g. http://localhost:3000), billing calls would miss the API prefix.
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

/** Stable error codes for client-side billing fallbacks (map via translateBillingError). */
export const BILLING_ERROR = {
  TIMEOUT: 'billing_timeout',
  NETWORK_UNREACHABLE: 'billing_networkUnreachable',
  NETWORK: 'billing_networkError',
  CHECKOUT_SESSION_FAILED: 'billing_checkoutSessionFailed',
  CHECKOUT_URL_MISSING: 'billing_checkoutUrlMissing',
  RESERVATION_CHECKOUT_FAILED: 'billing_reservationCheckoutFailed',
  LISTING_CHECKOUT_FAILED: 'billing_listingCheckoutFailed',
  LISTING_URL_MISSING: 'billing_listingUrlMissing',
  CONFIRM_NETWORK_UNREACHABLE: 'billing_confirmNetworkUnreachable',
}

const BILLING_ERROR_I18N = {
  [BILLING_ERROR.TIMEOUT]: 'billing_timeout',
  [BILLING_ERROR.NETWORK_UNREACHABLE]: 'billing_networkUnreachable',
  [BILLING_ERROR.NETWORK]: 'billing_networkError',
  [BILLING_ERROR.CHECKOUT_SESSION_FAILED]: 'billing_checkoutSessionFailed',
  [BILLING_ERROR.CHECKOUT_URL_MISSING]: 'billing_checkoutUrlMissing',
  [BILLING_ERROR.RESERVATION_CHECKOUT_FAILED]: 'billing_reservationCheckoutFailed',
  [BILLING_ERROR.LISTING_CHECKOUT_FAILED]: 'billing_listingCheckoutFailed',
  [BILLING_ERROR.LISTING_URL_MISSING]: 'billing_listingUrlMissing',
  [BILLING_ERROR.CONFIRM_NETWORK_UNREACHABLE]: 'billing_confirmNetworkUnreachable',
}

/**
 * @param {string|null|undefined} error
 * @param {(key: string, options?: object) => string} t
 * @param {string} [fallbackKey]
 */
export function translateBillingError(error, t, fallbackKey = 'billing_networkError') {
  if (!error) return typeof t === 'function' ? t(fallbackKey) : fallbackKey
  const key = BILLING_ERROR_I18N[error]
  if (key && typeof t === 'function') return t(key)
  return String(error)
}

function billingFetchErrorMessage(error) {
  const msg = String(error?.message || '')
  if (error?.name === 'AbortError' || msg.includes('abort')) {
    return BILLING_ERROR.TIMEOUT
  }
  const isNetwork =
    error?.name === 'TypeError' && (msg.includes('fetch') || msg.includes('Failed') || msg.includes('Network'))
  return isNetwork ? BILLING_ERROR.NETWORK_UNREACHABLE : msg || BILLING_ERROR.NETWORK
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
 * Navigate to hosted Stripe Checkout via assign() so Back does not reopen Stripe.
 * @returns {boolean} true if redirect started
 */
export function navigateToStripeCheckout(checkoutUrl) {
  const u = String(checkoutUrl || '').trim()
  if (!/^https?:\/\//i.test(u)) return false
  window.location.assign(u)
  return true
}

/** After Stripe return — sync session into DB */
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
 * Deposit wallet checkout; balance credited via webhook / confirm.
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
    return { ok: false, error: data.error || BILLING_ERROR.CHECKOUT_SESSION_FAILED }
  }
  if (data.url) {
    navigateToStripeCheckout(data.url)
    return { ok: true }
  }
  return { ok: false, error: BILLING_ERROR.CHECKOUT_URL_MISSING }
}

/** After Deposit Checkout return — credit balance if webhook has not run yet. */
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
    return { ok: false, error: data.error || BILLING_ERROR.CHECKOUT_SESSION_FAILED }
  }
  if (data.url) {
    navigateToStripeCheckout(data.url)
    return { ok: true }
  }
  return { ok: false, error: BILLING_ERROR.CHECKOUT_URL_MISSING }
}

/** Stripe Checkout: VIP subscription (needs STRIPE_PRICE_ID_VIP on the server). */
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
    return { ok: false, error: data.error || BILLING_ERROR.CHECKOUT_SESSION_FAILED }
  }
  if (data.url) {
    navigateToStripeCheckout(data.url)
    return { ok: true }
  }
  return { ok: false, error: BILLING_ERROR.CHECKOUT_URL_MISSING }
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
      checkout_purpose: 'owner_subscription',
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: data.error || BILLING_ERROR.CHECKOUT_SESSION_FAILED }
  }
  if (data.url) {
    navigateToStripeCheckout(data.url)
    return { ok: true }
  }
  return { ok: false, error: BILLING_ERROR.CHECKOUT_URL_MISSING }
}

/**
 * 10% reservation (Stripe Checkout; amount computed on the server).
 */
export async function startPropertyReservationCheckout({
  userId,
  propertyId,
  propertyType,
  customerEmail,
  returnPath,
  useDeposit,
  signingIntentId,
  purchaseVariant,
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
        purchaseVariant: purchaseVariant || undefined,
      }),
    })
    if (!res.ok) {
      return { ok: false, error: data.error || BILLING_ERROR.RESERVATION_CHECKOUT_FAILED }
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
    return { ok: false, error: BILLING_ERROR.CHECKOUT_URL_MISSING }
  } catch (e) {
    return { ok: false, error: e?.message || BILLING_ERROR.NETWORK }
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

/** Stripe Checkout: listing publication fee (fixed EUR amount on the server). */
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
    const errText = data.error || data.message || BILLING_ERROR.LISTING_CHECKOUT_FAILED
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
    return { ok: false, error: BILLING_ERROR.LISTING_URL_MISSING }
  } catch (e) {
    const msg = String(e?.message || '')
    const isNetwork =
      e?.name === 'TypeError' && (msg.includes('fetch') || msg.includes('Failed') || msg.includes('Network'))
    return {
      ok: false,
      error: isNetwork ? BILLING_ERROR.NETWORK_UNREACHABLE : msg || BILLING_ERROR.NETWORK,
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
      error: isNetwork ? BILLING_ERROR.CONFIRM_NETWORK_UNREACHABLE : msg || 'confirm_failed',
    }
  }
}
