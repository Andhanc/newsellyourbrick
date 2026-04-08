ALTER TABLE "properties_apartments" ADD COLUMN IF NOT EXISTS "buy_now_winner_user_id" INTEGER;
ALTER TABLE "properties_apartments" ADD COLUMN IF NOT EXISTS "buy_now_completed_at" TEXT;

ALTER TABLE "properties_houses" ADD COLUMN IF NOT EXISTS "buy_now_winner_user_id" INTEGER;
ALTER TABLE "properties_houses" ADD COLUMN IF NOT EXISTS "buy_now_completed_at" TEXT;
