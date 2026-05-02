-- Минимальная цена продажи (отдельно от «Продать сейчас» и стартовой ставки).
-- Выполните на PostgreSQL после обновления Prisma schema, если не используете prisma migrate.

ALTER TABLE properties_apartments ADD COLUMN IF NOT EXISTS minimum_sale_price REAL;
ALTER TABLE properties_houses ADD COLUMN IF NOT EXISTS minimum_sale_price REAL;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS minimum_sale_price REAL;
