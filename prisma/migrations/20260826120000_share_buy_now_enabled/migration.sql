ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "buy_now_enabled" INTEGER DEFAULT 0;
ALTER TABLE "properties_apartments" ADD COLUMN IF NOT EXISTS "buy_now_enabled" INTEGER DEFAULT 0;
ALTER TABLE "properties_houses" ADD COLUMN IF NOT EXISTS "buy_now_enabled" INTEGER DEFAULT 0;
