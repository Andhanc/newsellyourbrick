ALTER TABLE property_translations
ADD COLUMN IF NOT EXISTS extra_json TEXT;
