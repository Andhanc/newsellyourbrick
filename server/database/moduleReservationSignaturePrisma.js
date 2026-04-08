/**
 * Намерения подписи для резерва 10% («Купить сейчас») до завершения Stripe Checkout.
 */
import { getPrisma } from './prismaClient.js';

const SIGNATURE_DATA_MAX_CHARS = 900_000;

export const reservationSignatureQueries = {
  createIntent: async ({ buyerId, propertyId, propertyType, useWallet, signatureData }) => {
    const prisma = getPrisma();
    const data = String(signatureData);
    if (data.length < 50 || data.length > SIGNATURE_DATA_MAX_CHARS) {
      throw new Error('invalid_signature_payload');
    }
    return prisma.property_reservation_signature_intents.create({
      data: {
        buyer_id: Number(buyerId),
        property_id: Number(propertyId),
        property_type: String(propertyType || '').slice(0, 32),
        use_wallet_snapshot: useWallet ? 1 : 0,
        signature_data: data,
      },
    });
  },

  assertIntentReadyForCheckout: async (intentId, buyerId, propertyId, propertyType, useWallet) => {
    const prisma = getPrisma();
    const maxAgeMs = 30 * 60 * 1000;
    const row = await prisma.property_reservation_signature_intents.findFirst({
      where: { id: String(intentId) },
    });
    if (!row) return { ok: false, error: 'intent_not_found' };
    if (row.consumed_at != null) return { ok: false, error: 'intent_consumed' };
    if (row.stripe_session_id != null) return { ok: false, error: 'intent_checkout_already_started' };
    if (Number(row.buyer_id) !== Number(buyerId)) return { ok: false, error: 'intent_user_mismatch' };
    if (Number(row.property_id) !== Number(propertyId)) return { ok: false, error: 'intent_property_mismatch' };
    if (String(row.property_type || '') !== String(propertyType || '')) {
      return { ok: false, error: 'intent_property_type_mismatch' };
    }
    const walletRow = row.use_wallet_snapshot === 1;
    if (walletRow !== !!useWallet) return { ok: false, error: 'intent_wallet_mismatch' };
    const created = row.created_at ? new Date(row.created_at).getTime() : 0;
    if (Date.now() - created > maxAgeMs) return { ok: false, error: 'intent_expired' };
    return { ok: true, row };
  },

  attachStripeSessionToIntent: async (intentId, stripeSessionId) => {
    const prisma = getPrisma();
    const updated = await prisma.property_reservation_signature_intents.updateMany({
      where: {
        id: String(intentId),
        consumed_at: null,
        stripe_session_id: null,
      },
      data: { stripe_session_id: String(stripeSessionId) },
    });
    return updated.count === 1;
  },

  /**
   * После оплаты: проверить намерение и вернуть подпись (до записи в stripe_payments).
   */
  takeSignatureForPaidSession: async ({
    intentId,
    sessionId,
    buyerId,
    propertyId,
    useWallet,
    propertyType,
  }) => {
    const prisma = getPrisma();
    const row = await prisma.property_reservation_signature_intents.findFirst({
      where: {
        id: String(intentId),
        stripe_session_id: String(sessionId),
        buyer_id: Number(buyerId),
        property_id: Number(propertyId),
        consumed_at: null,
      },
    });
    if (!row) return { ok: false, error: 'reservation_intent_invalid' };
    const walletRow = row.use_wallet_snapshot === 1;
    if (walletRow !== !!useWallet) return { ok: false, error: 'reservation_intent_wallet_mismatch' };
    if (String(row.property_type || '') !== String(propertyType || '')) {
      return { ok: false, error: 'reservation_intent_type_mismatch' };
    }
    return { ok: true, signature: row.signature_data };
  },

  consumeIntent: async (intentId) => {
    await getPrisma().property_reservation_signature_intents.update({
      where: { id: String(intentId) },
      data: { consumed_at: new Date() },
    });
  },
};
