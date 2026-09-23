/** Lightweight subscription/VIP helpers — safe to import from listing pages. */

export function normalizeSubscriptionPlanVisual(sub) {
  if (!sub) return 'starter'
  const raw = sub.plan_key
  if (raw == null || String(raw).trim() === '') return 'starter'
  const k = String(raw).toLowerCase()
  if (k === 'starter' || k === 'free') return 'starter'
  if (k === 'vip') return 'vip'
  return 'pro'
}

const SUBSCRIPTION_UI_INACTIVE_STATUSES = new Set([
  'canceled',
  'unpaid',
  'incomplete_expired',
  'incomplete',
])

export function effectivePurchasedTier(sub) {
  if (!sub) return 'starter'
  const st = String(sub.status || '').toLowerCase()
  if (SUBSCRIPTION_UI_INACTIVE_STATUSES.has(st)) return 'starter'
  return normalizeSubscriptionPlanVisual(sub)
}

export function userHasVipAccess({ subscription, vipClub }) {
  if (vipClub && typeof vipClub === 'object' && vipClub.active) return true
  return effectivePurchasedTier(subscription) === 'vip'
}

export function effectiveDisplayTier(subscription, vipClub) {
  if (userHasVipAccess({ subscription, vipClub })) return 'vip'
  return effectivePurchasedTier(subscription)
}
