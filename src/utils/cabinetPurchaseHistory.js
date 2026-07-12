const PURCHASE_IMAGE_PLACEHOLDER =
  '/images/external/photo-1560448204-e02f11c3d0e2-d2beb47285.jpg'

export function finiteMoney(value, fallback = null) {
  if (value == null || value === '') return fallback
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function resolvePurchaseLocation(row = {}) {
  const explicit = String(row.property_location || '').trim()
  if (explicit) return explicit
  const cityCountry = [row.property_city, row.property_country]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ')
  if (cityCountry) return cityCountry
  return String(row.property_address || '').trim()
}

function normalizeImageSrc(raw) {
  if (!raw || typeof raw !== 'string') return PURCHASE_IMAGE_PLACEHOLDER
  const value = raw.trim()
  if (!value) return PURCHASE_IMAGE_PLACEHOLDER
  if (/^(https?:|data:|\/)/i.test(value)) return value
  return `/${value.replace(/^\/+/, '')}`
}

export function mapReservationPurchase(row = {}) {
  const billing = row.billing && typeof row.billing === 'object' ? row.billing : {}
  const stripePaid = Math.max(0, finiteMoney(row.amount_cents, 0) / 100)
  const walletPaid = Math.max(
    0,
    finiteMoney(billing.wallet_applied_major, finiteMoney(billing.wallet_eur_applied, 0)),
  )
  const paidAmount = Math.max(
    0,
    finiteMoney(billing.total_paid_toward_price, stripePaid + walletPaid),
  )
  const totalAmount = Math.max(
    0,
    finiteMoney(billing.minimum_sale_price, finiteMoney(row.property_price, 0)),
  )
  const derivedRemaining = Math.max(0, totalAmount - paidAmount)
  const remainingAmount = Math.max(
    0,
    finiteMoney(billing.remaining_to_full_purchase, derivedRemaining),
  )
  const paymentPercent =
    totalAmount > 0 ? Math.min(100, Math.max(0, (paidAmount / totalAmount) * 100)) : 0

  return {
    propertyId: billing.property_id ?? row.property_id ?? null,
    propertyType: billing.property_type || row.property_type || null,
    title: String(row.property_title || `Объект #${billing.property_id ?? '—'}`).trim(),
    location: resolvePurchaseLocation(row),
    imageSrc: normalizeImageSrc(row.property_image),
    paidAmount,
    totalAmount,
    remainingAmount,
    currency: String(row.currency || billing.currency || 'EUR').toUpperCase(),
    paymentPercent,
    purchaseDateRaw: row.paid_at || row.created_at || null,
    policyVersion: billing.policy_version || row.agreement_policy_version || null,
    purchaseChannel: 'buy_now',
  }
}
