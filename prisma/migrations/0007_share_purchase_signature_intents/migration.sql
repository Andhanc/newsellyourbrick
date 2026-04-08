-- CreateTable
CREATE TABLE IF NOT EXISTS "share_purchase_signature_intents" (
    "id" TEXT NOT NULL,
    "buyer_id" INTEGER NOT NULL,
    "property_id" INTEGER NOT NULL,
    "property_type" TEXT NOT NULL,
    "shares_count" INTEGER NOT NULL,
    "signature_data" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumed_at" TIMESTAMP(3),
    "stripe_session_id" TEXT,

    CONSTRAINT "share_purchase_signature_intents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "share_sig_intent_stripe_session_key" ON "share_purchase_signature_intents"("stripe_session_id");

CREATE INDEX IF NOT EXISTS "idx_share_sig_intent_buyer" ON "share_purchase_signature_intents"("buyer_id", "created_at");

ALTER TABLE "share_purchase_signature_intents" ADD CONSTRAINT "share_purchase_signature_intents_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
