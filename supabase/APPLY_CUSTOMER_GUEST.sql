-- Phase E2: guest flag (idempotent) — same as migrations/029_customer_guest_flag.sql
-- Run AFTER APPLY_CUSTOMER_AUTH.sql / 028. Requires public.customers.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customers'
  ) THEN
    ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT false;

    UPDATE customers
    SET is_guest = true
    WHERE auth_user_id IS NULL AND is_guest = false;

    UPDATE customers
    SET is_guest = false
    WHERE auth_user_id IS NOT NULL AND is_guest = true;

    CREATE INDEX IF NOT EXISTS idx_customers_is_guest ON customers (is_guest);
  END IF;
END $$;

-- Link shop_orders.customer_id only when both shop_orders and customers exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'shop_orders'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customers'
  ) THEN
    ALTER TABLE shop_orders
      ADD COLUMN IF NOT EXISTS customer_id UUID;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'shop_orders_customer_id_fkey'
    ) THEN
      ALTER TABLE shop_orders
        ADD CONSTRAINT shop_orders_customer_id_fkey
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_shop_orders_customer_id ON shop_orders (customer_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
