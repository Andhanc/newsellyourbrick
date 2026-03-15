-- Добавление property_table в bids для оптимизации (один запрос вместо трёх при выборке ставок)
-- Backfill выполняется в database.js при инициализации

ALTER TABLE bids ADD COLUMN property_table TEXT;

CREATE INDEX IF NOT EXISTS idx_bids_property_id_table ON bids(property_id, property_table);
