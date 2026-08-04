-- Phase E3: WhatsApp OTP auth — provider + merge audit on customers
-- Idempotent. Run after 028 + 029 (or via APPLY_ALL / APPLY_WHATSAPP_AUTH.sql).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customers'
  ) THEN
    ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS provider TEXT;

    ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

    ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS merge_meta JSONB DEFAULT '{}'::jsonb;

    -- Backfill provider from known signals (best-effort)
    UPDATE customers
    SET provider = 'guest'
    WHERE provider IS NULL
      AND (auth_user_id IS NULL OR is_guest = true);

    UPDATE customers
    SET provider = 'whatsapp'
    WHERE provider IS NULL
      AND phone IS NOT NULL
      AND (
        email IS NULL
        OR email LIKE '%@customers.nadeendesigns.local'
      );

    CREATE INDEX IF NOT EXISTS idx_customers_provider ON customers (provider);
    CREATE INDEX IF NOT EXISTS idx_customers_last_login_at
      ON customers (last_login_at DESC NULLS LAST);
  END IF;
END $$;
