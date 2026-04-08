/**
 * Покупки долей (property_shares) + атомарное обновление shares_sold на объекте.
 */
import { getPrisma } from './prismaClient.js';
import { propertyQueries } from './module2PropertyPrisma.js';

function firstPropertyPhotoUrl(property) {
  if (!property) return null;
  const photos = property.photos;
  const list = Array.isArray(photos) ? photos : [];
  const first = list[0];
  if (first == null) return null;
  if (typeof first === 'string') return first;
  if (typeof first === 'object' && first.url) return String(first.url);
  return null;
}

async function tryIncrementSharesSold(tx, propertyId, propertyType, delta) {
  const id = Number(propertyId);
  const d = Number(delta);
  if (!Number.isFinite(id) || !Number.isFinite(d) || d <= 0) return false;

  if (propertyType === 'apartment' || propertyType === 'commercial') {
    const n = await tx.$executeRaw`
      UPDATE "properties_apartments"
      SET "shares_sold" = COALESCE("shares_sold", 0) + ${d}
      WHERE "id" = ${id}
        AND COALESCE("total_shares", 0) > 0
        AND COALESCE("shares_sold", 0) + ${d} <= COALESCE("total_shares", 0)
    `;
    return n > 0;
  }
  if (propertyType === 'house' || propertyType === 'villa') {
    const n = await tx.$executeRaw`
      UPDATE "properties_houses"
      SET "shares_sold" = COALESCE("shares_sold", 0) + ${d}
      WHERE "id" = ${id}
        AND COALESCE("total_shares", 0) > 0
        AND COALESCE("shares_sold", 0) + ${d} <= COALESCE("total_shares", 0)
    `;
    return n > 0;
  }
  return false;
}

const SIGNATURE_DATA_MAX_CHARS = 900_000;

export const sharePurchaseQueries = {
  createSignatureIntent: async ({ buyerId, propertyId, propertyType, sharesCount, signatureData }) => {
    const prisma = getPrisma();
    const data = String(signatureData);
    if (data.length < 50 || data.length > SIGNATURE_DATA_MAX_CHARS) {
      throw new Error('invalid_signature_payload');
    }
    return prisma.share_purchase_signature_intents.create({
      data: {
        buyer_id: Number(buyerId),
        property_id: Number(propertyId),
        property_type: String(propertyType),
        shares_count: Number(sharesCount),
        signature_data: data,
      },
    });
  },

  /**
   * Проверка намерения перед созданием Checkout (ещё без привязки к session id).
   */
  assertIntentReadyForCheckout: async (intentId, buyerId, propertyId, propertyType, sharesCount) => {
    const prisma = getPrisma();
    const maxAgeMs = 30 * 60 * 1000;
    const row = await prisma.share_purchase_signature_intents.findFirst({
      where: { id: String(intentId) },
    });
    if (!row) return { ok: false, error: 'intent_not_found' };
    if (row.consumed_at != null) return { ok: false, error: 'intent_consumed' };
    if (row.stripe_session_id != null) return { ok: false, error: 'intent_checkout_already_started' };
    if (Number(row.buyer_id) !== Number(buyerId)) return { ok: false, error: 'intent_user_mismatch' };
    if (Number(row.property_id) !== Number(propertyId) || String(row.property_type) !== String(propertyType)) {
      return { ok: false, error: 'intent_property_mismatch' };
    }
    if (Number(row.shares_count) !== Number(sharesCount)) return { ok: false, error: 'intent_shares_mismatch' };
    const created = row.created_at ? new Date(row.created_at).getTime() : 0;
    if (Date.now() - created > maxAgeMs) return { ok: false, error: 'intent_expired' };
    return { ok: true, row };
  },

  attachStripeSessionToIntent: async (intentId, stripeSessionId) => {
    const prisma = getPrisma();
    const updated = await prisma.share_purchase_signature_intents.updateMany({
      where: {
        id: String(intentId),
        consumed_at: null,
        stripe_session_id: null,
      },
      data: { stripe_session_id: String(stripeSessionId) },
    });
    return updated.count === 1;
  },

  findByStripeSessionId: async (sessionId) => {
    if (!sessionId) return null;
    const prisma = getPrisma();
    return prisma.property_shares.findFirst({
      where: { stripe_checkout_session_id: String(sessionId) },
    });
  },

  sumSharesForUserOnProperty: async (buyerId, propertyId, propertyType) => {
    const prisma = getPrisma();
    const agg = await prisma.property_shares.aggregate({
      where: {
        buyer_id: Number(buyerId),
        property_id: Number(propertyId),
        property_type: String(propertyType),
      },
      _sum: { shares_count: true },
    });
    return agg._sum.shares_count || 0;
  },

  listByBuyerEnriched: async (buyerId, limit = 100) => {
    const prisma = getPrisma();
    const rows = await prisma.property_shares.findMany({
      where: { buyer_id: Number(buyerId) },
      orderBy: { purchase_date: 'desc' },
      take: limit,
    });
    const enriched = await Promise.all(
      rows.map(async (r) => {
        let title = null;
        let location = null;
        let image = null;
        try {
          const p = await propertyQueries.getById(r.property_id, r.property_type);
          if (p) {
            title = p.title || null;
            location = p.location || p.address || null;
            image = firstPropertyPhotoUrl(p);
          }
        } catch {
          /* ignore */
        }
        return {
          ...r,
          property_title: title,
          property_location: location,
          property_image: image,
        };
      })
    );
    return enriched;
  },

  /**
   * Идемпотентно: при повторном webhook только возвращает существующую запись.
   */
  completePurchaseFromStripeSession: async (params) => {
    const {
      stripeSessionId,
      signingIntentId,
      buyerId,
      propertyId,
      propertyType,
      sharesCount,
      pricePerShare,
      totalPrice,
      currency,
      agreementSignature: agreementSignatureParam,
      policyVersion,
    } = params;

    const prisma = getPrisma();
    return prisma.$transaction(async (tx) => {
      const existing = await tx.property_shares.findFirst({
        where: { stripe_checkout_session_id: String(stripeSessionId) },
      });
      if (existing) {
        return { ok: true, duplicate: true, record: existing };
      }

      let agreementSignature = agreementSignatureParam != null ? String(agreementSignatureParam) : '';
      if (signingIntentId) {
        const intent = await tx.share_purchase_signature_intents.findFirst({
          where: {
            id: String(signingIntentId),
            buyer_id: Number(buyerId),
            property_id: Number(propertyId),
            property_type: String(propertyType),
            shares_count: Number(sharesCount),
            consumed_at: null,
            stripe_session_id: String(stripeSessionId),
          },
        });
        if (!intent) {
          throw new Error('invalid_signing_intent');
        }
        agreementSignature = intent.signature_data;
      }

      if (!agreementSignature || agreementSignature.length < 8) {
        throw new Error('missing_signature');
      }

      const okInc = await tryIncrementSharesSold(tx, propertyId, propertyType, sharesCount);
      if (!okInc) {
        throw new Error('share_inventory_exhausted');
      }

      const record = await tx.property_shares.create({
        data: {
          property_id: Number(propertyId),
          property_type: String(propertyType),
          buyer_id: Number(buyerId),
          shares_count: Number(sharesCount),
          price_per_share: Number(pricePerShare),
          total_price: Number(totalPrice),
          currency: (currency || 'USD').toString().slice(0, 8),
          status: 'completed',
          agreement_signature: agreementSignature.slice(0, SIGNATURE_DATA_MAX_CHARS),
          policy_version: policyVersion ? String(policyVersion).slice(0, 128) : 'share_policy_test_v1',
          stripe_checkout_session_id: String(stripeSessionId),
        },
      });

      if (signingIntentId) {
        await tx.share_purchase_signature_intents.update({
          where: { id: String(signingIntentId) },
          data: { consumed_at: new Date() },
        });
      }

      return { ok: true, duplicate: false, record };
    });
  },
};
