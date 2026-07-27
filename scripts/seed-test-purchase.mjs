/**
 * Тестовая покупка (резерв 10%) для проверки пост-покупочного флоу без Stripe.
 *
 * Usage:
 *   node scripts/seed-test-purchase.mjs
 *   USER_ID=37 PROPERTY_ID=19 node scripts/seed-test-purchase.mjs
 */
import 'dotenv/config'
import { getPrisma } from '../server/database/prismaClient.js'
import { propertyQueries } from '../server/database/database.js'

const prisma = getPrisma()

const userId = parseInt(process.env.USER_ID || process.argv[2] || '37', 10)
const propertyId = parseInt(process.env.PROPERTY_ID || process.argv[3] || '19', 10)

if (!Number.isFinite(userId) || !Number.isFinite(propertyId)) {
  console.error('Usage: USER_ID=37 PROPERTY_ID=19 node scripts/seed-test-purchase.mjs')
  process.exit(1)
}

const dedupeKey = `codex-test-purchase-user-${userId}-property-${propertyId}-v1`

try {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { id: true, user_id_number: true, email: true, first_name: true, last_name: true, role: true },
  })
  if (!user) {
    throw new Error(`User #${userId} not found`)
  }

  const property = await propertyQueries.getById(propertyId)
  if (!property) {
    throw new Error(`Property #${propertyId} not found`)
  }

  const total = Number(property.minimum_sale_price ?? property.price)
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error(`Property #${propertyId} has no valid price`)
  }

  const paid = Math.round(total * 0.1 * 100) / 100
  const remaining = Math.round((total - paid) * 100) / 100
  const propertyType = String(property.property_type || 'apartment').trim()

  const billingReason = JSON.stringify({
    type: 'property_reservation',
    minimum_sale_price: total,
    ten_percent: paid,
    paid_stripe_cents: Math.round(paid * 100),
    wallet_eur_applied: 0,
    wallet_applied_major: 0,
    currency: String(property.currency || 'eur').toLowerCase(),
    purchase_request_id: null,
    property_id: propertyId,
    property_type: propertyType,
    policy_version: 'reservation_policy_test_v1',
    total_paid_toward_price: paid,
    remaining_to_full_purchase: remaining,
  })

  const existing = await prisma.stripe_payments.findUnique({ where: { dedupe_key: dedupeKey } })
  const payment = await prisma.stripe_payments.upsert({
    where: { dedupe_key: dedupeKey },
    create: {
      dedupe_key: dedupeKey,
      user_id: user.id,
      amount_cents: Math.round(paid * 100),
      currency: String(property.currency || 'eur').toLowerCase(),
      status: 'paid',
      plan_key: 'property_reservation',
      billing_reason: billingReason,
      agreement_policy_version: 'reservation_policy_test_v1',
      paid_at: new Date().toISOString(),
      customer_email: user.email || null,
    },
    update: {
      user_id: user.id,
      amount_cents: Math.round(paid * 100),
      currency: String(property.currency || 'eur').toLowerCase(),
      status: 'paid',
      plan_key: 'property_reservation',
      billing_reason: billingReason,
      agreement_policy_version: 'reservation_policy_test_v1',
      paid_at: new Date().toISOString(),
      customer_email: user.email || null,
    },
  })

  const storedBilling = JSON.parse(payment.billing_reason || '{}')
  const valid =
    payment.user_id === userId &&
    payment.plan_key === 'property_reservation' &&
    storedBilling.property_id === propertyId &&
    storedBilling.total_paid_toward_price === paid

  if (!valid) throw new Error('Seeded purchase failed read-back verification')

  console.log(
    JSON.stringify(
      {
        result: existing ? 'updated' : 'created',
        paymentId: payment.id,
        userId: user.id,
        publicUserId: user.user_id_number,
        email: user.email,
        propertyId,
        propertyTitle: property.title,
        propertyType,
        paid,
        total,
        remaining,
        currency: String(property.currency || 'EUR').toUpperCase(),
        guideUrl: `/profile/purchased/${propertyId}`,
        profileUrl: '/profile',
        historyUrl: '/history',
      },
      null,
      2,
    ),
  )
} finally {
  await prisma.$disconnect()
}
