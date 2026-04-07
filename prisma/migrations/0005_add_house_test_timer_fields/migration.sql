ALTER TABLE "properties_houses"
  ADD COLUMN IF NOT EXISTS "test_timer_end_date" TEXT,
  ADD COLUMN IF NOT EXISTS "test_timer_duration" INTEGER;
