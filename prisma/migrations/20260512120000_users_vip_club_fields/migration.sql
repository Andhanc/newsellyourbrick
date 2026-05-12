-- Закрытый клуб: срок VIP и дата выдачи (промокод / Stripe VIP)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "vip_until" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "vip_granted_at" TIMESTAMP(3);
