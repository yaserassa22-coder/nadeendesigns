-- Phase G: guest_customers — same as migrations/031_guest_customers.sql
-- Standalone recovery script. Prefer APPLY_ALL.sql section 34 on fresh setups.
-- Idempotent. Requires public.customers (APPLY_CUSTOMER_AUTH / 028).
-- After this file, also apply APPLY_GUEST_STOREFRONT_RLS.sql (= 032 / APPLY_ALL §35)
-- so guest cart works with the anon key (no SERVICE_ROLE required).

CREATE TABLE IF NOT EXISTS guest_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  language TEXT DEFAULT 'ar',
  country TEXT,
  device TEXT,
  converted_to_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_guest_customers_last_seen
  ON guest_customers (last_seen DESC);

CREATE INDEX IF NOT EXISTS idx_guest_customers_converted
  ON guest_customers (converted_to_customer_id)
  WHERE converted_to_customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS guest_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id TEXT NOT NULL UNIQUE REFERENCES guest_customers(guest_id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_carts_updated
  ON guest_carts (updated_at DESC);

CREATE TABLE IF NOT EXISTS recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  product_kind TEXT NOT NULL DEFAULT 'dress',
  product_id UUID NOT NULL,
  product_slug TEXT,
  product_title TEXT,
  product_image_url TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recently_viewed_owner_check CHECK (
    (guest_id IS NOT NULL AND customer_id IS NULL)
    OR (guest_id IS NULL AND customer_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_recently_viewed_guest
  ON recently_viewed (guest_id, viewed_at DESC)
  WHERE guest_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recently_viewed_customer
  ON recently_viewed (customer_id, viewed_at DESC)
  WHERE customer_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wishlist_items'
  ) THEN
    ALTER TABLE wishlist_items
      ALTER COLUMN customer_id DROP NOT NULL;

    ALTER TABLE wishlist_items
      ADD COLUMN IF NOT EXISTS guest_id TEXT;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'wishlist_items_customer_id_product_kind_product_id_key'
    ) THEN
      ALTER TABLE wishlist_items
        DROP CONSTRAINT wishlist_items_customer_id_product_kind_product_id_key;
    END IF;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlist_customer_product
  ON wishlist_items (customer_id, product_kind, product_id)
  WHERE customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlist_guest_product
  ON wishlist_items (guest_id, product_kind, product_id)
  WHERE guest_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wishlist_items_guest
  ON wishlist_items (guest_id, created_at DESC)
  WHERE guest_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'shop_orders'
  ) THEN
    ALTER TABLE shop_orders ADD COLUMN IF NOT EXISTS guest_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_shop_orders_guest_id
      ON shop_orders (guest_id) WHERE guest_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_bookings_guest_id
      ON bookings (guest_id) WHERE guest_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'saved_designs'
  ) THEN
    ALTER TABLE saved_designs
      ALTER COLUMN customer_id DROP NOT NULL;
    ALTER TABLE saved_designs ADD COLUMN IF NOT EXISTS guest_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_saved_designs_guest
      ON saved_designs (guest_id, updated_at DESC)
      WHERE guest_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customer_addresses'
  ) THEN
    ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS guest_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_customer_addresses_guest
      ON customer_addresses (guest_id)
      WHERE guest_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customer_reviews'
  ) THEN
    ALTER TABLE customer_reviews
      ALTER COLUMN customer_id DROP NOT NULL;
    ALTER TABLE customer_reviews ADD COLUMN IF NOT EXISTS guest_id TEXT;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customer_notifications'
  ) THEN
    ALTER TABLE customer_notifications ADD COLUMN IF NOT EXISTS guest_id TEXT;
  END IF;
END $$;

ALTER TABLE guest_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin all guest_customers" ON guest_customers;
CREATE POLICY "Admin all guest_customers" ON guest_customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'owner', 'staff')
    )
  );

DROP POLICY IF EXISTS "Admin all guest_carts" ON guest_carts;
CREATE POLICY "Admin all guest_carts" ON guest_carts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'owner', 'staff')
    )
  );

DROP POLICY IF EXISTS "Admin all recently_viewed" ON recently_viewed;
CREATE POLICY "Admin all recently_viewed" ON recently_viewed
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'owner', 'staff')
    )
  );

NOTIFY pgrst, 'reload schema';
