-- Минимальная цена продажи (отдельно от «Продать сейчас» и стартовой ставки).
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "minimum_sale_price" DOUBLE PRECISION;
ALTER TABLE "properties_apartments" ADD COLUMN IF NOT EXISTS "minimum_sale_price" DOUBLE PRECISION;
ALTER TABLE "properties_houses" ADD COLUMN IF NOT EXISTS "minimum_sale_price" DOUBLE PRECISION;
