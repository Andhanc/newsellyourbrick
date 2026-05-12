-- Лоты аукциона только для закрытого клуба (VIP)
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "private_club_only" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "properties_apartments" ADD COLUMN IF NOT EXISTS "private_club_only" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "properties_houses" ADD COLUMN IF NOT EXISTS "private_club_only" INTEGER NOT NULL DEFAULT 0;
