#!/usr/bin/env node
/**
 * Idempotent Maestro demo seed: buyer + seller accounts, catalog objects,
 * deposit/VIP, favorites, bonuses, test-drive booking, reservation payment.
 *
 *   node scripts/seed-maestro-demo.mjs
 */
import { createHash } from 'node:crypto'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { getPrisma, closePrisma } from '../server/database/prismaClient.js'

config()

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PASSWORD = 'MaestroDemo2026!'
const HASH = createHash('sha256').update(PASSWORD).digest('hex')
const PHOTO = JSON.stringify(['/images/mobile-discover/welcome-summer.png'])
const NOW = new Date()
const AUCTION_END = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

const BUYER = {
  email: 'maestro-buyer@sellyourbrick.test',
  first_name: 'Maestro',
  last_name: 'Buyer',
  role: 'buyer',
  phone_number: '+19990002001',
  country: 'Spain',
  address: 'Barcelona, Maestro Demo St 1',
  passport_number: 'MD1234567',
  identification_number: 'MAESTRO-BUYER-2026',
  user_id_number: '92001',
  deposit_amount: 250_000,
}

const SELLER = {
  email: 'maestro-seller@sellyourbrick.test',
  first_name: 'Maestro',
  last_name: 'Seller',
  role: 'seller',
  phone_number: '+19990002002',
  country: 'Spain',
  address: 'Madrid, Maestro Demo Ave 2',
  passport_number: 'MD7654321',
  identification_number: 'MAESTRO-SELLER-2026',
  user_id_number: '92002',
  deposit_amount: 0,
}

async function upsertUser(prisma, spec) {
  const existing = await prisma.users.findFirst({
    where: { email: spec.email, role: spec.role },
  })
  const vipUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  const data = {
    first_name: spec.first_name,
    last_name: spec.last_name,
    email: spec.email,
    password: HASH,
    role: spec.role,
    phone_number: spec.phone_number,
    country: spec.country,
    address: spec.address,
    passport_number: spec.passport_number,
    identification_number: spec.identification_number,
    user_id_number: spec.user_id_number,
    passport_photo: '/favicon.svg',
    is_verified: 1,
    is_blocked: 0,
    is_online: 0,
    has_card: 1,
    deposit_amount: spec.deposit_amount,
    updated_at: NOW,
    ...(spec.role === 'buyer'
      ? { vip_until: vipUntil, vip_granted_at: NOW }
      : {}),
  }

  if (existing) {
    // Keep phone unique if taken by another row
    const phoneOwner = await prisma.users.findFirst({
      where: { phone_number: spec.phone_number },
      select: { id: true },
    })
    if (phoneOwner && phoneOwner.id !== existing.id) {
      data.phone_number = `${spec.phone_number}${existing.id}`
    }
    const updated = await prisma.users.update({ where: { id: existing.id }, data })
    return { user: updated, created: false }
  }

  const phoneOwner = await prisma.users.findFirst({ where: { phone_number: spec.phone_number } })
  if (phoneOwner) data.phone_number = `${spec.phone_number}${Date.now() % 10000}`

  const created = await prisma.users.create({
    data: { ...data, created_at: NOW },
  })
  return { user: created, created: true }
}

async function ensurePassportDoc(prisma, userId) {
  const existing = await prisma.documents.findFirst({
    where: { user_id: userId, document_type: 'passport' },
  })
  const payload = {
    document_photo: '/favicon.svg',
    is_reviewed: 1,
    verification_status: 'approved',
    reviewed_by: 'maestro-demo-seed',
    reviewed_at: NOW,
    rejection_reason: null,
  }
  if (existing) {
    await prisma.documents.update({ where: { id: existing.id }, data: payload })
    return existing.id
  }
  const row = await prisma.documents.create({
    data: { user_id: userId, document_type: 'passport', ...payload },
  })
  return row.id
}

async function upsertHouse(prisma, sellerId, spec) {
  const existing = await prisma.properties_houses.findFirst({
    where: { slug: spec.slug },
  })
  const base = {
    user_id: sellerId,
    property_type: 'house',
    title: spec.title,
    description: spec.description,
    price: spec.price,
    currency: 'EUR',
    is_auction: spec.is_auction ?? 0,
    auction_start_date: spec.auction_start_date ?? null,
    auction_end_date: spec.auction_end_date ?? null,
    auction_starting_price: spec.auction_starting_price ?? null,
    minimum_sale_price: spec.minimum_sale_price ?? spec.price,
    area: 120,
    living_area: 95,
    land_area: 200,
    bedrooms: 3,
    bathrooms: 2,
    floors: 2,
    year_built: 2018,
    location: spec.location,
    address: spec.address,
    country: 'Spain',
    city: spec.city,
    coordinates: spec.coordinates || '41.3874,2.1686',
    photos: PHOTO,
    moderation_status: 'approved',
    reviewed_by: 'maestro-demo-seed',
    reviewed_at: NOW.toISOString(),
    test_drive: spec.test_drive ?? 0,
    is_debt: spec.is_debt ?? 0,
    has_debt: spec.has_debt ?? 0,
    debt_amount: spec.debt_amount ?? null,
    debt_utilities: spec.debt_utilities ?? 0,
    is_shared_ownership: spec.is_shared_ownership ?? 0,
    total_shares: spec.total_shares ?? null,
    shares_sold: spec.shares_sold ?? 0,
    sale_type: spec.sale_type ?? null,
    private_club_only: spec.private_club_only ?? 0,
    slug: spec.slug,
    updated_at: NOW.toISOString(),
  }

  if (existing) {
    const updated = await prisma.properties_houses.update({
      where: { id: existing.id },
      data: base,
    })
    return { property: updated, created: false }
  }

  const created = await prisma.properties_houses.create({
    data: { ...base, created_at: NOW.toISOString() },
  })
  return { property: created, created: true }
}

async function ensureFavorite(prisma, userId, propertyId) {
  const existing = await prisma.property_favorites.findFirst({
    where: {
      user_id: userId,
      property_id: propertyId,
      property_table: 'properties_houses',
    },
  })
  if (existing) return existing
  try {
    return await prisma.property_favorites.create({
      data: {
        user_id: userId,
        property_id: propertyId,
        property_table: 'properties_houses',
      },
    })
  } catch {
    return existing
  }
}

async function ensureBonus(prisma, userId, taskId, promo) {
  const existing = await prisma.bonus_task_submissions.findFirst({
    where: { user_id: userId, task_id: taskId },
  })
  if (existing) {
    return prisma.bonus_task_submissions.update({
      where: { id: existing.id },
      data: {
        link: 'https://instagram.com/p/maestro-demo',
        status: 'approved',
        promo_code: promo,
        reviewed_at: NOW,
      },
    })
  }
  return prisma.bonus_task_submissions.create({
    data: {
      user_id: userId,
      task_id: taskId,
      link: 'https://instagram.com/p/maestro-demo',
      status: 'approved',
      promo_code: promo,
      created_at: NOW,
      reviewed_at: NOW,
    },
  })
}

async function ensureBooking(prisma, buyerId, propertyId) {
  const start = '2026-10-01'
  const end = '2026-10-07'
  const existing = await prisma.test_drive_bookings.findFirst({
    where: {
      user_id: buyerId,
      property_id: propertyId,
      property_table: 'properties_houses',
      start_date: start,
      end_date: end,
    },
  })
  if (existing) return existing
  return prisma.test_drive_bookings.create({
    data: {
      user_id: buyerId,
      property_id: propertyId,
      property_table: 'properties_houses',
      start_date: start,
      end_date: end,
      status: 'confirmed',
      buyer_contact_channel: 'email',
    },
  })
}

async function ensureReservation(prisma, buyerId, property) {
  const dedupe = `maestro-demo-reservation-${buyerId}-${property.id}`
  const total = Number(property.minimum_sale_price ?? property.price)
  const paid = Math.round(total * 0.1)
  const billingReason = JSON.stringify({
    type: 'property_reservation',
    minimum_sale_price: total,
    ten_percent: paid,
    paid_stripe_cents: paid * 100,
    wallet_eur_applied: 0,
    currency: 'eur',
    property_id: property.id,
    property_type: property.property_type,
    policy_version: 'maestro_demo_v1',
    total_paid_toward_price: paid,
    remaining_to_full_purchase: total - paid,
  })
  return prisma.stripe_payments.upsert({
    where: { dedupe_key: dedupe },
    create: {
      dedupe_key: dedupe,
      user_id: buyerId,
      amount_cents: paid * 100,
      currency: 'eur',
      status: 'paid',
      plan_key: 'property_reservation',
      billing_reason: billingReason,
      agreement_policy_version: 'maestro_demo_v1',
      paid_at: NOW.toISOString(),
      customer_email: BUYER.email,
    },
    update: {
      user_id: buyerId,
      amount_cents: paid * 100,
      status: 'paid',
      billing_reason: billingReason,
    },
  })
}

async function main() {
  const prisma = getPrisma()
  const buyerUp = await upsertUser(prisma, BUYER)
  const sellerUp = await upsertUser(prisma, SELLER)
  await ensurePassportDoc(prisma, buyerUp.user.id)
  await ensurePassportDoc(prisma, sellerUp.user.id)

  const auction = await upsertHouse(prisma, sellerUp.user.id, {
    slug: 'maestro-demo-auction-villa',
    title: 'Maestro Demo Auction Villa',
    description: 'Demo auction property for Maestro E2E coverage.',
    price: 520_000,
    is_auction: 1,
    auction_start_date: '2026-09-01',
    auction_end_date: AUCTION_END,
    auction_starting_price: 380_000,
    minimum_sale_price: 480_000,
    location: 'Spain, Barcelona, Maestro Demo St 10',
    address: 'Maestro Demo St 10',
    city: 'Barcelona',
    test_drive: 1,
  })

  const buyNow = await upsertHouse(prisma, sellerUp.user.id, {
    slug: 'maestro-demo-buy-now-loft',
    title: 'Maestro Demo Buy Now Loft',
    description: 'Demo fixed-price loft for Maestro E2E.',
    price: 310_000,
    minimum_sale_price: 310_000,
    location: 'Spain, Valencia, Maestro Demo Blvd 5',
    address: 'Maestro Demo Blvd 5',
    city: 'Valencia',
    sale_type: 'buy_now',
    test_drive: 1,
  })

  const debt = await upsertHouse(prisma, sellerUp.user.id, {
    slug: 'maestro-demo-debt-townhouse',
    title: 'Maestro Demo Debt Townhouse',
    description: 'Demo debt listing for Maestro E2E.',
    price: 190_000,
    minimum_sale_price: 190_000,
    location: 'Spain, Malaga, Maestro Demo Rd 3',
    address: 'Maestro Demo Rd 3',
    city: 'Malaga',
    is_debt: 1,
    has_debt: 1,
    debt_amount: 24_500,
    debt_utilities: 1,
    sale_type: 'debt',
  })

  const share = await upsertHouse(prisma, sellerUp.user.id, {
    slug: 'maestro-demo-share-penthouse',
    title: 'Maestro Demo Share Penthouse',
    description: 'Demo co-investment listing for Maestro E2E.',
    price: 900_000,
    minimum_sale_price: 900_000,
    location: 'Spain, Madrid, Maestro Demo Plaza 1',
    address: 'Maestro Demo Plaza 1',
    city: 'Madrid',
    is_shared_ownership: 1,
    total_shares: 10,
    shares_sold: 2,
    sale_type: 'shares',
  })

  const vipLot = await upsertHouse(prisma, sellerUp.user.id, {
    slug: 'maestro-demo-vip-estate',
    title: 'Maestro Demo VIP Estate',
    description: 'Private club only demo lot.',
    price: 1_250_000,
    is_auction: 1,
    auction_start_date: '2026-09-01',
    auction_end_date: AUCTION_END,
    auction_starting_price: 900_000,
    minimum_sale_price: 1_100_000,
    location: 'Spain, Marbella, Maestro Demo Coast 7',
    address: 'Maestro Demo Coast 7',
    city: 'Marbella',
    private_club_only: 1,
  })

  await ensureFavorite(prisma, buyerUp.user.id, auction.property.id)
  await ensureFavorite(prisma, buyerUp.user.id, buyNow.property.id)
  await ensureBonus(prisma, buyerUp.user.id, 1, 'BONUS-INSTA-10')
  await ensureBonus(prisma, buyerUp.user.id, 2, 'BONUS-TIKTOK-10')
  await ensureBonus(prisma, sellerUp.user.id, 5, 'BONUS-SELLER-INSTA-10')
  const booking = await ensureBooking(prisma, buyerUp.user.id, buyNow.property.id)
  const payment = await ensureReservation(prisma, buyerUp.user.id, buyNow.property)

  const manifest = {
    password: PASSWORD,
    buyer: {
      id: buyerUp.user.id,
      email: BUYER.email,
      role: 'buyer',
      created: buyerUp.created,
      deposit: BUYER.deposit_amount,
    },
    seller: {
      id: sellerUp.user.id,
      email: SELLER.email,
      role: 'seller',
      created: sellerUp.created,
    },
    properties: {
      auction: { id: auction.property.id, slug: auction.property.slug, created: auction.created },
      buyNow: { id: buyNow.property.id, slug: buyNow.property.slug, created: buyNow.created },
      debt: { id: debt.property.id, slug: debt.property.slug, created: debt.created },
      share: { id: share.property.id, slug: share.property.slug, created: share.created },
      vip: { id: vipLot.property.id, slug: vipLot.property.slug, created: vipLot.created },
    },
    bookingId: booking.id,
    paymentId: payment.id,
  }

  const outDir = join(ROOT, 'maestro')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'demo-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  writeFileSync(
    join(outDir, 'demo.env.yaml'),
    [
      `APP_URL: ${process.env.MAESTRO_APP_URL || 'http://localhost:5173'}`,
      `BUYER_EMAIL: ${BUYER.email}`,
      `SELLER_EMAIL: ${SELLER.email}`,
      `DEMO_PASSWORD: ${PASSWORD}`,
      `BUYER_ID: "${buyerUp.user.id}"`,
      `SELLER_ID: "${sellerUp.user.id}"`,
      `AUCTION_SLUG: ${auction.property.slug}`,
      `BUY_NOW_SLUG: ${buyNow.property.slug}`,
      `DEBT_SLUG: ${debt.property.slug}`,
      `SHARE_SLUG: ${share.property.slug}`,
      `VIP_SLUG: ${vipLot.property.slug}`,
      '',
    ].join('\n'),
  )

  console.log(JSON.stringify({ ok: true, ...manifest }, null, 2))
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => closePrisma())
