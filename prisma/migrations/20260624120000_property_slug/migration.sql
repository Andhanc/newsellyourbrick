-- SEO: человекочитаемые URL объектов
ALTER TABLE "properties_apartments" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "properties_houses" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "slug" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "properties_apartments_slug_key" ON "properties_apartments"("slug") WHERE "slug" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "properties_houses_slug_key" ON "properties_houses"("slug") WHERE "slug" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "properties_slug_key" ON "properties"("slug") WHERE "slug" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_apartments_slug" ON "properties_apartments"("slug");
CREATE INDEX IF NOT EXISTS "idx_houses_slug" ON "properties_houses"("slug");
