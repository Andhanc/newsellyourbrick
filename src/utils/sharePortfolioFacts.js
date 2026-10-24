function readParameters(property) {
  const raw = property?.tz_parameters_json
  if (!raw) return null
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function isShareListing(property) {
  const saleType = String(property?.sale_type || '').trim().toLowerCase()
  return (
    saleType === 'share' ||
    saleType === 'shares' ||
    property?.is_shared_ownership === 1 ||
    property?.is_shared_ownership === true ||
    property?.is_share === 1 ||
    property?.is_share === true
  )
}

/**
 * Пакет из нескольких квартир в одном долевом объявлении.
 * Обычная доля одной квартиры сюда не попадает.
 */
export function getSharePortfolioFacts(property) {
  if (!isShareListing(property)) return null
  const params = readParameters(property)
  const units = Number(params?.portfolio_units)
  if (!Number.isFinite(units) || units <= 1) return null

  const min = Number(params?.floor_min)
  const max = Number(params?.floor_max)
  const floorsLabel =
    Number.isFinite(min) && Number.isFinite(max)
      ? min === max
        ? String(min)
        : `${min}–${max}`
      : null

  return { units, floorsLabel }
}
