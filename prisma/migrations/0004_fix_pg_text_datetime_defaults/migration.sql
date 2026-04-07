-- Fix legacy SQLite-like defaults ('datetime(''now'')') in a type-safe way.
-- For text columns keep text default; for timestamp columns use CURRENT_TIMESTAMP.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT * FROM (
      VALUES
        ('assistant_leads', 'created_at'),
        ('assistant_leads', 'updated_at'),
        ('auction_winners', 'won_at'),
        ('auction_winners', 'created_at'),
        ('auction_winners', 'updated_at'),
        ('auction_reminders', 'created_at'),
        ('auction_reminders', 'updated_at'),
        ('crm_activities', 'created_at'),
        ('crm_leads', 'created_at'),
        ('crm_leads', 'updated_at'),
        ('properties', 'created_at'),
        ('properties', 'updated_at'),
        ('properties_houses', 'created_at'),
        ('properties_houses', 'updated_at'),
        ('purchase_requests', 'created_at'),
        ('purchase_requests', 'updated_at'),
        ('stripe_payments', 'created_at'),
        ('stripe_subscription_state', 'updated_at'),
        ('stripe_wallet_deposit_credits', 'created_at')
    ) AS t(table_name, column_name)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = rec.table_name
        AND c.column_name = rec.column_name
    ) THEN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = rec.table_name
          AND c.column_name = rec.column_name
          AND c.data_type IN ('character varying', 'text', 'character')
      ) THEN
        EXECUTE format(
          'ALTER TABLE %I ALTER COLUMN %I SET DEFAULT (now() AT TIME ZONE ''utc'')::text',
          rec.table_name, rec.column_name
        );
        EXECUTE format(
          'UPDATE %I SET %I = (now() AT TIME ZONE ''utc'')::text WHERE %I = ''datetime(''''now'''')''',
          rec.table_name, rec.column_name, rec.column_name
        );
      ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = rec.table_name
          AND c.column_name = rec.column_name
          AND c.data_type LIKE 'timestamp%'
      ) THEN
        EXECUTE format(
          'ALTER TABLE %I ALTER COLUMN %I SET DEFAULT CURRENT_TIMESTAMP',
          rec.table_name, rec.column_name
        );
      END IF;
    END IF;
  END LOOP;
END $$;
