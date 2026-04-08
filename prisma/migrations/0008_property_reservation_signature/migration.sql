-- CreateTable
CREATE TABLE IF NOT EXISTS "property_reservation_signature_intents" (
    "id" TEXT NOT NULL,
    "buyer_id" INTEGER NOT NULL,
    "property_id" INTEGER NOT NULL,
    "property_type" TEXT NOT NULL,
    "use_wallet_snapshot" INTEGER NOT NULL,
    "signature_data" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumed_at" TIMESTAMP(3),
    "stripe_session_id" TEXT,

    CONSTRAINT "property_reservation_signature_intents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "reservation_sig_intent_stripe_session_key" ON "property_reservation_signature_intents"("stripe_session_id");

CREATE INDEX IF NOT EXISTS "idx_reservation_sig_intent_buyer" ON "property_reservation_signature_intents"("buyer_id", "created_at");

ALTER TABLE "property_reservation_signature_intents" ADD CONSTRAINT "property_reservation_signature_intents_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "stripe_payments" ADD COLUMN IF NOT EXISTS "agreement_signature" TEXT;
ALTER TABLE "stripe_payments" ADD COLUMN IF NOT EXISTS "agreement_policy_version" TEXT;
