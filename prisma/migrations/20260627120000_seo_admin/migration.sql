-- SEO admin panel: overrides, redirects, templates, history
ALTER TABLE "administrators" ADD COLUMN IF NOT EXISTS "can_access_seo" INTEGER DEFAULT 0;
ALTER TABLE "administrators" ADD COLUMN IF NOT EXISTS "seo_role" TEXT;

CREATE TABLE IF NOT EXISTS "seo_page_overrides" (
  "id" SERIAL PRIMARY KEY,
  "path" TEXT NOT NULL UNIQUE,
  "page_type" TEXT,
  "title" TEXT,
  "meta_description" TEXT,
  "h1" TEXT,
  "canonical_path" TEXT,
  "robots_index" INTEGER DEFAULT 1,
  "target_keywords" TEXT,
  "seo_notes" TEXT,
  "og_title" TEXT,
  "og_description" TEXT,
  "og_image" TEXT,
  "twitter_card" TEXT DEFAULT 'summary_large_image',
  "sitemap_include" INTEGER DEFAULT 1,
  "sitemap_priority" DOUBLE PRECISION,
  "sitemap_changefreq" TEXT,
  "sitemap_lastmod" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updated_by" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_seo_page_overrides_type" ON "seo_page_overrides"("page_type");
CREATE INDEX IF NOT EXISTS "idx_seo_page_overrides_updated" ON "seo_page_overrides"("updated_at");

CREATE TABLE IF NOT EXISTS "seo_redirects" (
  "id" SERIAL PRIMARY KEY,
  "from_path" TEXT NOT NULL UNIQUE,
  "to_path" TEXT NOT NULL,
  "status_code" INTEGER NOT NULL DEFAULT 301,
  "is_active" INTEGER DEFAULT 1,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_seo_redirects_active" ON "seo_redirects"("is_active");

CREATE TABLE IF NOT EXISTS "seo_templates" (
  "id" SERIAL PRIMARY KEY,
  "page_type" TEXT NOT NULL UNIQUE,
  "title_template" TEXT,
  "description_template" TEXT,
  "h1_template" TEXT,
  "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updated_by" TEXT
);

CREATE TABLE IF NOT EXISTS "seo_page_history" (
  "id" SERIAL PRIMARY KEY,
  "path" TEXT NOT NULL,
  "snapshot" TEXT NOT NULL,
  "changed_by" TEXT,
  "changed_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "action" TEXT DEFAULT 'update'
);

CREATE INDEX IF NOT EXISTS "idx_seo_page_history_path" ON "seo_page_history"("path", "changed_at");

INSERT INTO "seo_templates" ("page_type", "title_template", "description_template", "h1_template")
VALUES
  ('property', '{type} в {city}, {area} м², {price} | Sellyourbrick', '{name} — {type} в {city}. Площадь {area} м². Цена {price}.', '{name}'),
  ('news', '{title} | Sellyourbrick', '{excerpt}', '{title}'),
  ('catalog', 'Купить {type} в {city}, {country} | Sellyourbrick', 'Недвижимость в {city}, {country}. {type}.', 'Недвижимость в {city}'),
  ('static', '{title} | Sellyourbrick', '{description}', '{title}')
ON CONFLICT ("page_type") DO NOTHING;
