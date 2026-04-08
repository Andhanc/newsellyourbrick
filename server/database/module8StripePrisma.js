import prismaPkg from '@prisma/client';
import { getPrisma } from './prismaClient.js';

const { Prisma } = prismaPkg;

function toPlain(row) {
  if (!row) return null;
  return { ...row };
}

function normalizeRawRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (typeof v === 'bigint') out[k] = Number(v);
    else if (v instanceof Date) out[k] = v.toISOString();
  }
  return out;
}

export const stripeSubscriptionQueries = {
  hasPaymentByDedupeKey: async (dedupeKey) => {
        if (!dedupeKey) return false;
    const row = await getPrisma().stripe_payments.findUnique({
      where: { dedupe_key: String(dedupeKey) },
      select: { id: true },
    });
    return !!row;
  },

  upsertState: async (row) => {
        const prisma = getPrisma();
    const uid = Number(row.user_id);
    const data = {
      stripe_customer_id: row.stripe_customer_id || null,
      stripe_subscription_id: row.stripe_subscription_id || null,
      plan_key: row.plan_key || 'pro',
      status: row.status,
      current_period_start: row.current_period_start || null,
      current_period_end: row.current_period_end || null,
      cancel_at_period_end: row.cancel_at_period_end ? 1 : 0,
      updated_at: new Date().toISOString(),
    };
    const saved = await prisma.stripe_subscription_state.upsert({
      where: { user_id: uid },
      create: { user_id: uid, ...data },
      update: data,
    });
    return { changes: 1 };
  },

  getStateByUserId: async (userId) => {
        const uid = parseInt(userId, 10);
    if (!Number.isFinite(uid)) return null;
    return toPlain(
      await getPrisma().stripe_subscription_state.findUnique({ where: { user_id: uid } })
    );
  },

  getUserIdBySubscriptionId: async (subscriptionId) => {
        if (!subscriptionId) return null;
    const row = await getPrisma().stripe_subscription_state.findFirst({
      where: { stripe_subscription_id: subscriptionId },
      select: { user_id: true },
    });
    return row ? row.user_id : null;
  },

  insertPayment: async (row) => {
        const prisma = getPrisma();
    let created = null;
    try {
      created = await prisma.stripe_payments.create({
        data: {
          dedupe_key: row.dedupe_key,
          user_id: Number(row.user_id),
          stripe_customer_id: row.stripe_customer_id || null,
          stripe_subscription_id: row.stripe_subscription_id || null,
          stripe_invoice_id: row.stripe_invoice_id || null,
          stripe_checkout_session_id: row.stripe_checkout_session_id || null,
          amount_cents: Number(row.amount_cents),
          currency: (row.currency || 'eur').toLowerCase(),
          status: row.status || 'paid',
          plan_key: row.plan_key || 'pro',
          billing_reason: row.billing_reason || null,
          agreement_signature: row.agreement_signature != null ? String(row.agreement_signature) : null,
          agreement_policy_version:
            row.agreement_policy_version != null ? String(row.agreement_policy_version).slice(0, 128) : null,
          paid_at: row.paid_at,
          period_start: row.period_start || null,
          period_end: row.period_end || null,
          customer_email: row.customer_email || null,
        },
      });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== 'P2002') throw e;
      return { changes: 0 };
    }
    return { changes: 1, lastInsertRowid: created.id };
  },

  listPaymentsByUserId: async (userId, limit = 50) => {
        const uid = parseInt(userId, 10);
    if (!Number.isFinite(uid)) return [];
    const rows = await getPrisma().stripe_payments.findMany({
      where: { user_id: uid },
      orderBy: { paid_at: 'desc' },
      take: Math.min(limit, 200),
    });
    return rows.map(toPlain);
  },

  countPayments: async () => {
        return getPrisma().stripe_payments.count();
  },

  listAllPaymentsWithUsers: async (limit = 500) => {
        const prisma = getPrisma();
    const rows = await prisma.$queryRaw(
      Prisma.sql`
        SELECT p.*, u.first_name, u.last_name, u.email, u.phone_number
        FROM stripe_payments p
        LEFT JOIN users u ON p.user_id = u.id
        ORDER BY p.paid_at DESC
        LIMIT ${Math.min(limit, 2000)}
      `
    );
    return Array.isArray(rows) ? rows.map(normalizeRawRow) : rows;
  },

  listReservationPurchasesByUserId: async (userId, limit = 100) => {
        const uid = parseInt(userId, 10);
    if (!Number.isFinite(uid)) return [];
    const rows = await getPrisma().stripe_payments.findMany({
      where: { user_id: uid, plan_key: 'property_reservation' },
      orderBy: { paid_at: 'desc' },
      take: Math.min(limit, 200),
    });
    return rows.map(toPlain);
  },

  listAllReservationPurchasesWithUsers: async (limit = 500) => {
        const rows = await getPrisma().$queryRaw(
      Prisma.sql`
        SELECT p.*, u.first_name, u.last_name, u.email, u.phone_number
        FROM stripe_payments p
        LEFT JOIN users u ON u.id = p.user_id
        WHERE p.plan_key = 'property_reservation'
        ORDER BY p.paid_at DESC
        LIMIT ${Math.min(limit, 2000)}
      `
    );
    return Array.isArray(rows) ? rows.map(normalizeRawRow) : rows;
  },
};
