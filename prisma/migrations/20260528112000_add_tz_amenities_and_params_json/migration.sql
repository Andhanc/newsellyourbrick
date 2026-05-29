-- Add canonical TZ amenities/parameters JSON payloads.
ALTER TABLE "properties"
ADD COLUMN IF NOT EXISTS "tz_amenities_json" TEXT,
ADD COLUMN IF NOT EXISTS "tz_parameters_json" TEXT;

ALTER TABLE "properties_apartments"
ADD COLUMN IF NOT EXISTS "tz_amenities_json" TEXT,
ADD COLUMN IF NOT EXISTS "tz_parameters_json" TEXT;

ALTER TABLE "properties_houses"
ADD COLUMN IF NOT EXISTS "tz_amenities_json" TEXT,
ADD COLUMN IF NOT EXISTS "tz_parameters_json" TEXT;
