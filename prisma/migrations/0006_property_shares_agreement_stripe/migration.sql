-- AlterTable
ALTER TABLE "property_shares" ADD COLUMN IF NOT EXISTS "agreement_signature" TEXT;
ALTER TABLE "property_shares" ADD COLUMN IF NOT EXISTS "policy_version" TEXT DEFAULT 'share_policy_test_v1';
ALTER TABLE "property_shares" ADD COLUMN IF NOT EXISTS "stripe_checkout_session_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "property_shares_stripe_session_key" ON "property_shares"("stripe_checkout_session_id");
