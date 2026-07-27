/**
 * Диапазон потолка: текущая цена аукциона и максимум участия пользователя.
 */
export function getCeilingRange(currentBid, ceiling) {
  const current = Number(currentBid) || 0
  const max = Number(ceiling) || 0
  const headroom = Math.max(0, max - current)
  const headroomPct = max > current ? Math.round((headroom / (max - current)) * 100) : 0

  return { current, max, headroom, headroomPct }
}

export function getCeilingPreviewAmount(maxAmountInput, minCeiling, parseMoneyInputValue) {
  const parsed = parseMoneyInputValue(maxAmountInput)
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return minCeiling
}
