-- Phase G2: storefront RLS for guest cart/session without SERVICE_ROLE
-- Idempotent. Requires 031 (guest_customers / guest_carts / recently_viewed).
--
-- Root cause: createAdminClient() falls back to the anon key when
-- SUPABASE_SERVICE_ROLE_KEY is unset. 031 only granted admin policies, so
-- ensureGuestCustomer + guest_carts upsert failed under RLS → PUT 503.
--
-- Security model:
--   - Server validates HttpOnly guest_id cookie (UUID) before writes.
--   - Anon/authenticated may touch guest rows only when guest_id is a UUID.
--   - UUID entropy is the primary isolation (unguessable guest_id).
--   - Anon cannot set/claim converted_to_customer_id (merge still needs
--     service role or admin JWT for conversion marking).
--   - No PII columns required on guest_customers for cart durability.

-- UUID v1–v8 shape (matches app GUEST_UUID_RE; case-insensitive).
-- Kept as a reusable SQL fragment via CHECK + policy predicates.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'guest_customers'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'guest_customers_guest_id_uuid_check'
    ) THEN
      ALTER TABLE guest_customers
        ADD CONSTRAINT guest_customers_guest_id_uuid_check
        CHECK (
          guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        );
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'guest_carts'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'guest_carts_guest_id_uuid_check'
    ) THEN
      ALTER TABLE guest_carts
        ADD CONSTRAINT guest_carts_guest_id_uuid_check
        CHECK (
          guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        );
    END IF;
  END IF;
END $$;

-- =============================================================================
-- guest_customers — anon/authenticated storefront access
-- =============================================================================
ALTER TABLE guest_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Storefront select guest_customers" ON guest_customers;
CREATE POLICY "Storefront select guest_customers" ON guest_customers
  FOR SELECT
  USING (
    guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );

DROP POLICY IF EXISTS "Storefront insert guest_customers" ON guest_customers;
CREATE POLICY "Storefront insert guest_customers" ON guest_customers
  FOR INSERT
  WITH CHECK (
    guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND converted_to_customer_id IS NULL
  );

-- Metadata touch only; block anon from claiming conversion.
DROP POLICY IF EXISTS "Storefront update guest_customers" ON guest_customers;
CREATE POLICY "Storefront update guest_customers" ON guest_customers
  FOR UPDATE
  USING (converted_to_customer_id IS NULL)
  WITH CHECK (converted_to_customer_id IS NULL);

-- =============================================================================
-- guest_carts
-- =============================================================================
ALTER TABLE guest_carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Storefront select guest_carts" ON guest_carts;
CREATE POLICY "Storefront select guest_carts" ON guest_carts
  FOR SELECT
  USING (
    guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );

DROP POLICY IF EXISTS "Storefront insert guest_carts" ON guest_carts;
CREATE POLICY "Storefront insert guest_carts" ON guest_carts
  FOR INSERT
  WITH CHECK (
    guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND jsonb_typeof(items) = 'array'
  );

DROP POLICY IF EXISTS "Storefront update guest_carts" ON guest_carts;
CREATE POLICY "Storefront update guest_carts" ON guest_carts
  FOR UPDATE
  USING (
    guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  )
  WITH CHECK (
    guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND jsonb_typeof(items) = 'array'
  );

DROP POLICY IF EXISTS "Storefront delete guest_carts" ON guest_carts;
CREATE POLICY "Storefront delete guest_carts" ON guest_carts
  FOR DELETE
  USING (
    guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );

-- =============================================================================
-- recently_viewed (guest-owned rows only)
-- =============================================================================
ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Storefront select recently_viewed guest" ON recently_viewed;
CREATE POLICY "Storefront select recently_viewed guest" ON recently_viewed
  FOR SELECT
  USING (
    guest_id IS NOT NULL
    AND customer_id IS NULL
    AND guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );

DROP POLICY IF EXISTS "Storefront insert recently_viewed guest" ON recently_viewed;
CREATE POLICY "Storefront insert recently_viewed guest" ON recently_viewed
  FOR INSERT
  WITH CHECK (
    guest_id IS NOT NULL
    AND customer_id IS NULL
    AND guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );

DROP POLICY IF EXISTS "Storefront update recently_viewed guest" ON recently_viewed;
CREATE POLICY "Storefront update recently_viewed guest" ON recently_viewed
  FOR UPDATE
  USING (
    guest_id IS NOT NULL
    AND customer_id IS NULL
    AND guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  )
  WITH CHECK (
    guest_id IS NOT NULL
    AND customer_id IS NULL
    AND guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );

DROP POLICY IF EXISTS "Storefront delete recently_viewed guest" ON recently_viewed;
CREATE POLICY "Storefront delete recently_viewed guest" ON recently_viewed
  FOR DELETE
  USING (
    guest_id IS NOT NULL
    AND customer_id IS NULL
    AND guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );

-- =============================================================================
-- wishlist_items (guest-owned rows only; customer policies unchanged)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wishlist_items'
  ) THEN
    ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Storefront select wishlist guest" ON wishlist_items;
    CREATE POLICY "Storefront select wishlist guest" ON wishlist_items
      FOR SELECT
      USING (
        guest_id IS NOT NULL
        AND customer_id IS NULL
        AND guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      );

    DROP POLICY IF EXISTS "Storefront insert wishlist guest" ON wishlist_items;
    CREATE POLICY "Storefront insert wishlist guest" ON wishlist_items
      FOR INSERT
      WITH CHECK (
        guest_id IS NOT NULL
        AND customer_id IS NULL
        AND guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      );

    DROP POLICY IF EXISTS "Storefront update wishlist guest" ON wishlist_items;
    CREATE POLICY "Storefront update wishlist guest" ON wishlist_items
      FOR UPDATE
      USING (
        guest_id IS NOT NULL
        AND customer_id IS NULL
        AND guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      )
      WITH CHECK (
        guest_id IS NOT NULL
        AND customer_id IS NULL
        AND guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      );

    DROP POLICY IF EXISTS "Storefront delete wishlist guest" ON wishlist_items;
    CREATE POLICY "Storefront delete wishlist guest" ON wishlist_items
      FOR DELETE
      USING (
        guest_id IS NOT NULL
        AND customer_id IS NULL
        AND guest_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
