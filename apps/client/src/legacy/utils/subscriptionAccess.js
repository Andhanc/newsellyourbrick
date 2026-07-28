/** Доступ к инвестиционному калькулятору / умной панели: активная подписка Pro или VIP */
export function subscriptionUnlocksCalculator(sub) {
  if (!sub || typeof sub !== 'object') return false
  const plan = String(sub.plan_key || '').toLowerCase()
  if (plan !== 'pro' && plan !== 'vip') return false
  const st = String(sub.status || '').toLowerCase()
  return st === 'active' || st === 'trialing'
}
