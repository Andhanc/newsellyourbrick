export const BUYER_TIER_RANK = {
  starter: 0,
  pro: 1,
  vip: 2,
}

/** Минимальный тариф покупателя для функции. Starter-фичи в карту не входят — они всегда открыты. */
export const BUYER_FEATURE_MIN_TIER = {
  calculator: 'pro',
  analytics: 'pro',
  yieldCalc: 'pro',
  personalManager: 'vip',
  documents: 'vip',
  privateClubLots: 'vip',
  auctionPriority: 'vip',
  vipManager: 'vip',
}

export function buyerTierRank(tier) {
  return BUYER_TIER_RANK[tier] ?? 0
}

export function buyerTierAllows(tier, minTier) {
  return buyerTierRank(tier) >= buyerTierRank(minTier)
}

export function canAccessBuyerFeature(tier, feature) {
  const minTier = BUYER_FEATURE_MIN_TIER[feature]
  if (!minTier) return true
  return buyerTierAllows(tier, minTier)
}

export function requiredPlanLabel(feature) {
  const minTier = BUYER_FEATURE_MIN_TIER[feature]
  if (minTier === 'vip') return 'VIP'
  if (minTier === 'pro') return 'Pro'
  return 'Starter'
}

function planKeyTier(sub) {
  if (!sub || typeof sub !== 'object') return 'starter'
  const st = String(sub.status || '').toLowerCase()
  if (['canceled', 'unpaid', 'incomplete_expired', 'incomplete'].includes(st)) return 'starter'
  const raw = sub.plan_key
  if (raw == null || String(raw).trim() === '') return 'starter'
  const k = String(raw).toLowerCase()
  if (k === 'starter' || k === 'free') return 'starter'
  if (k === 'vip') return 'vip'
  return 'pro'
}

/** Доступ к инвестиционному калькулятору / умной панели: Pro, VIP или активный VIP-клуб. */
export function subscriptionUnlocksCalculator(sub, vipClub) {
  if (vipClub && typeof vipClub === 'object' && vipClub.active) return true
  return canAccessBuyerFeature(planKeyTier(sub), 'calculator')
}
