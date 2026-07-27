import 'dotenv/config'
import { getPrisma } from '../server/database/prismaClient.js'

const prisma = getPrisma()
const DEDUPE_KEY = 'codex-profile-real-property-39-user-5-v1'
const EXPECTED_TITLE = 'Пентхаус с тремя спальнями на продажу в Пальм-Мар'

function parsePhotos(raw) {
  if (Array.isArray(raw)) return raw
  if (!raw || typeof raw !== 'string') return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

try {
  const [user, property] = await Promise.all([
    prisma.users.findUnique({
      where: { id: 5 },
      select: { id: true, user_id_number: true, first_name: true, last_name: true },
    }),
    prisma.properties_houses.findUnique({
      where: { id: 39 },
      select: {
        id: true,
        title: true,
        property_type: true,
        price: true,
        minimum_sale_price: true,
        currency: true,
        moderation_status: true,
        photos: true,
      },
    }),
  ])

  if (!user || user.user_id_number !== '12627') {
    throw new Error('Expected buyer users.id=5 with public ID 12627')
  }
  if (!property || property.moderation_status !== 'approved') {
    throw new Error('Expected approved properties_houses.id=39')
  }

  const total = Number(property.minimum_sale_price ?? property.price)
  if (total !== 450_000 || String(property.currency).toUpperCase() !== 'EUR') {
    throw new Error('Real property #39 no longer has the expected €450,000 price')
  }
  if (String(property.title || '').trim() !== EXPECTED_TITLE || parsePhotos(property.photos).length === 0) {
    throw new Error('Real property #39 must keep its exact Palm-Mar title and at least one photo')
  }

  const paid = 45_000
  const remaining = total - paid
  const billingReason = JSON.stringify({
    type: 'property_reservation',
    minimum_sale_price: total,
    ten_percent: total * 0.1,
    paid_stripe_cents: paid * 100,
    wallet_eur_applied: 0,
    wallet_applied_major: 0,
    currency: 'eur',
    purchase_request_id: null,
    property_id: property.id,
    property_type: property.property_type,
    policy_version: 'reservation_policy_test_v1',
    total_paid_toward_price: paid,
    remaining_to_full_purchase: remaining,
  })

  const existing = await prisma.stripe_payments.findUnique({ where: { dedupe_key: DEDUPE_KEY } })
  const payment = await prisma.stripe_payments.upsert({
    where: { dedupe_key: DEDUPE_KEY },
    create: {
      dedupe_key: DEDUPE_KEY,
      user_id: user.id,
      amount_cents: paid * 100,
      currency: 'eur',
      status: 'paid',
      plan_key: 'property_reservation',
      billing_reason: billingReason,
      agreement_policy_version: 'reservation_policy_test_v1',
      paid_at: new Date().toISOString(),
      customer_email: null,
    },
    update: {
      user_id: user.id,
      amount_cents: paid * 100,
      currency: 'eur',
      status: 'paid',
      plan_key: 'property_reservation',
      billing_reason: billingReason,
      agreement_policy_version: 'reservation_policy_test_v1',
    },
  })

  const storedBilling = JSON.parse(payment.billing_reason || '{}')
  const valid =
    payment.dedupe_key === DEDUPE_KEY &&
    payment.user_id === 5 &&
    payment.plan_key === 'property_reservation' &&
    payment.amount_cents === 4_500_000 &&
    storedBilling.property_id === 39 &&
    storedBilling.minimum_sale_price === 450_000 &&
    storedBilling.total_paid_toward_price === 45_000 &&
    storedBilling.remaining_to_full_purchase === 405_000

  if (!valid) throw new Error('Seeded purchase did not pass read-back verification')

  console.log(
    JSON.stringify({
      result: existing ? 'already exists' : 'created',
      paymentId: payment.id,
      publicUserId: user.user_id_number,
      propertyId: property.id,
      propertyTitle: property.title,
      paid,
      total,
      remaining,
      currency: 'EUR',
    }),
  )
} finally {
  await prisma.$disconnect()
}
