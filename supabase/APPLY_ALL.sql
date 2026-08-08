- =============================================================================
-- APPLY_ALL.sql ? SINGLE-FILE master setup for NadEEN Designs
--
-- ONE FILE. Run once or repeatedly. No other APPLY_*.sql required.
-- Paste this entire file into Supabase ? SQL Editor ? Run.
-- Safe on fresh DB and existing DB (IF NOT EXISTS / DROP POLICY IF EXISTS /
-- ON CONFLICT / ADD COLUMN IF NOT EXISTS / guarded DO $$ blocks).
--
-- Standalone APPLY_*.sql files in this folder are optional single-purpose
-- recovery scripts only. This file already inlines all of them in order.
-- Do NOT \i / include other files ? everything below is self-contained.
--
-- ? CRITICAL ? dresses_category_check (and veils/bridal_robes category CHECKs):
--   NEVER re-ADD a hardcoded CHECK (category IN (...)). Categories are dynamic
--   (categories table + app validation). Re-adding fails with:
--     check constraint "dresses_category_check" ... is violated by some row
--   when existing products use free/dynamic slugs. This file only DROPs those
--   constraints (early + end) and never recreates them.
--
-- ? CRITICAL ? bookings_service_type_check:
--   NEVER re-ADD a hardcoded CHECK (service_type IN (...)). The allowed list grew
--   over time (nouf_dress / nouf_dresses, etc.); early incomplete ADD fails with:
--     check constraint "bookings_service_type_check" ... is violated by some row
--   Validation is app-level (Zod). This file only DROPs the constraint (early + end).
--
-- INLINED ORDER (migrations 001?029 + APPLY_* overlays):
--   00. Early drop of obsolete category + bookings_service_type CHECKs
--       (same as 025 / 026; before any legacy)
--   01. migrations/001_add_custom_design_category.sql
--   02. migrations/002_booking_delivery_and_service_types.sql
--   03. migrations/003_normalize_dress_styles_ar.sql
--   04. migrations/004_normalize_dress_colors_ar.sql
--   05. migrations/005_booking_personalization.sql
--   06. migrations/006_booking_gift_options.sql
--   07. migrations/007_veils_bridal_robes_orders.sql  (+ APPLY_SHOP_CHECKOUT)
--   08. migrations/008_add_nouf_dress_category.sql
--   09. migrations/009_ensure_shop_tables_and_rls.sql
--   10. migrations/010_nouf_dresses_independent_category.sql
--   11. migrations/011_order_notifications.sql
--   12. migrations/012_order_workflow_notifications.sql
--   13. migrations/013_booking_city.sql
--   14. migrations/014_booking_region.sql
--   15. migrations/015_bookings_form_sync.sql
--   16. APPLY_BOOKINGS_COMPLETE / APPLY_BOOKINGS_FIX / APPLY_BOOKINGS_ADMIN_RLS
--   17. APPLY_NOTIFICATIONS (workflow statuses + notification_logs)
--   18. M2: APPLY_CATEGORIES (= 016)
--   19. M1 spelling: APPLY_CATEGORIES_BERNUS_SPELLING + APPLY_RENAME_TO_BERNUS
--   20. M5: APPLY_SHOP_SHIPPING (= 017)
--   21. M6: APPLY_CUSTOMER_NOTIFICATIONS (= 018)
--   22. Notify prefs: APPLY_NOTIFICATION_PREFERENCES (= 019)
--   23. M9: APPLY_SHIPPING_REGIONS (= 020)  ? creates shipping_regions
--   24. M10: APPLY_SMART_SHIPPING (= 021) ? pending fees / tracking / estimates
--   25. Soft delete / archive / audit: APPLY_SOFT_DELETE_ARCHIVE (= 022)
--   26. Reports schedules: APPLY_REPORTS (= 023)
--   27. Smart appointments: APPLY_SMART_APPOINTMENTS (= 024)
--   28. Drop obsolete dresses_category_check: APPLY_DROP_CATEGORY_CHECK (= 025)
--   29. Drop obsolete bookings_service_type_check: APPLY_DROP_BOOKINGS_SERVICE_TYPE_CHECK (= 026)
--   30. Product category_id FK + product_kind/SEO: APPLY_PRODUCT_CATEGORY_ID (= 027)
--   31. Phase E customer auth: APPLY_CUSTOMER_AUTH (= 028)
--       *** customers + related tables created HERE ? precedes 029 ***
--   32. Phase E2 guest flag: APPLY_CUSTOMER_GUEST (= 029)
--   33. Phase E3 WhatsApp OTP provider: APPLY_WHATSAPP_AUTH (= 030)
--   34. Phase G guest customers: APPLY_GUEST_CUSTOMERS (= 031)
--       guest_id cookie identity, guest carts, guest wishlist, recently viewed
--   35. Phase G2 guest storefront RLS: APPLY_GUEST_STOREFRONT_RLS (= 032)
--       anon-key upserts for guest_customers / guest_carts (no SERVICE_ROLE required)
--   36. Sprint N1 luxury nav settings: APPLY_CATEGORY_NAVIGATION (= 033)
--       visible_in_navigation / show_on_homepage / featured_collection
--   37. Sprint S1 store settings: APPLY_STORE_SETTINGS (= 034)
--       settings.key = 'store' JSONB (payments inside JSON; secrets via env)
--   38. Sprint P1.1 product management core: APPLY_PRODUCT_MANAGEMENT_CORE (= 035)
--       dresses: name_en, short_description, slug, sku, sale_price, cost_price,
--       status (published|draft|hidden), tags[], collection_id ׳’ג‚¬ג€ dual-write ׳’ג€ ג€ is_available
--   39. Product commerce type: APPLY_PRODUCT_COMMERCE_TYPE (= 036)
--       dresses/veils/bridal_robes.product_type for storefront CTA
--   40. Product experience foundation: APPLY_PRODUCT_EXPERIENCE_FOUNDATION (= 037)
--       Sprint 2 enums + order_options / extra_services config columns
--       (ready_to_buy|rental|custom_design|accessory|service); never category-name CTAs
--   41. Product experience engine: APPLY_PRODUCT_EXPERIENCE_ENGINE (= 038)
--       store_services library + experience templates + experience_config JSONB
--   42. Storefront experience checkout-only: APPLY_STOREFRONT_EXPERIENCE_CHECKOUT_ONLY (= 039)
--       system templates: order_options/delivery/notes disabled on PDP
--   43. Enterprise experience engine: APPLY_ENTERPRISE_EXPERIENCE_ENGINE (= 040)
--       experience_features library + purchase_flows + features_config JSONB
--       wedding/nouf → rental_dress backfill
--
-- Prerequisite: core tables (dresses, bookings, profiles, settings) must already
-- exist from the main schema / earlier project setup. This file applies
-- incremental migrations on top (and creates shop/customer tables if missing).
--
-- NOTE: dresses.category is TEXT (slug / legacy_key). Hardcoded CHECK constraints
-- are obsolete after dynamic categories (016). APPLY_ALL drops the constraint and
-- never recreates it ? existing product rows are preserved.
-- NOTE: bookings.service_type is TEXT; hardcoded service_type CHECK is obsolete
-- (app Zod validation). APPLY_ALL drops it and never recreates it.
-- =============================================================================

-- #############################################################################
-- 00 ? Early drop obsolete category CHECKs (idempotent; preserves all rows)
-- Same logic as migrations/025_drop_dresses_category_check.sql
-- Run first so later UPDATEs never hit a leftover live-DB CHECK.
-- #############################################################################

DO $$
DECLARE
  r RECORD;
  t TEXT;
  tables TEXT[] := ARRAY['dresses', 'veils', 'bridal_robes'];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
      t,
      t || '_category_check'
    );

    FOR r IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class rel ON rel.oid = c.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = t
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%category%'
    LOOP
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', t, r.conname);
    END LOOP;
  END LOOP;
END $$;


-- #############################################################################
-- 00b ? Early drop obsolete bookings_service_type_check
-- Same logic as migrations/026_drop_bookings_service_type_check.sql
-- #############################################################################

DO $$
DECLARE
  r RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bookings'
  ) THEN
    NULL;
  ELSE
    ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;

    FOR r IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class rel ON rel.oid = c.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = 'bookings'
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%service_type%'
    LOOP
      EXECUTE format('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;
  END IF;
END $$;


-- #############################################################################
-- Migration 001 ? Custom design category
-- Source: supabase/migrations/001_add_custom_design_category.sql
-- #############################################################################

-- Add custom_design and keep robes (???? ????)
-- Delivery/service-type updates continue in section 002 below (inlined).
-- Hardcoded dresses_category_check removed: categories are dynamic (see 016 / 025).
-- Do NOT ADD CONSTRAINT dresses_category_check here (or anywhere in this file).

ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_category_check;



-- #############################################################################
-- Migration 002 ? Booking delivery & service types
-- Source: supabase/migrations/002_booking_delivery_and_service_types.sql
-- #############################################################################

-- Categories + booking delivery fields + expanded service types
-- Safe to run on existing databases

-- 1) Dress categories ? drop obsolete CHECK only (do not recreate hardcoded list)
ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_category_check;

-- 2) Booking service_type ? drop obsolete CHECK only (app Zod validates; see 026).
-- Do NOT ADD CONSTRAINT bookings_service_type_check here (or anywhere in this file).
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;

-- 3) Delivery fields
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS delivery_required BOOLEAN DEFAULT false;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS delivery_region TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS delivery_city TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS delivery_address TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS delivery_phone TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS delivery_status TEXT;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_delivery_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_delivery_status_check
  CHECK (
    delivery_status IS NULL
    OR delivery_status IN ('pending', 'preparing', 'out_for_delivery', 'delivered')
  );

CREATE INDEX IF NOT EXISTS idx_bookings_delivery ON bookings(delivery_required);



-- #############################################################################
-- Migration 003 ? Normalize dress styles (AR)
-- Source: supabase/migrations/003_normalize_dress_styles_ar.sql
-- #############################################################################

-- Normalize legacy style values to Arabic options
UPDATE dresses SET style = '????' WHERE style IN ('Classic Luxury', 'royal', 'Royal');
UPDATE dresses SET style = '???????' WHERE style IN ('classic', 'Classic', 'vintage', 'Vintage', '?intage');
UPDATE dresses SET style = '????' WHERE style IN ('modern', 'Modern', '????');
UPDATE dresses SET style = '????' WHERE style IN ('luxury', 'Luxury');
UPDATE dresses SET style = '????' WHERE style IN ('soft', 'Soft');
UPDATE dresses SET style = '????' WHERE style IN ('simple', 'Simple');
UPDATE dresses SET style = '?????' WHERE style IN ('?????', 'princess', 'Princess');
UPDATE dresses SET style = '????? ?????' WHERE style IN ('mermaid', 'Mermaid', '?ermaid');
UPDATE dresses SET style = '??? A (??? ??? A)' WHERE style IN ('A-Line', 'A Line', 'a-line');
UPDATE dresses SET style = '?????' WHERE style IN ('ballgown', 'Ballgown');
UPDATE dresses SET style = '??????' WHERE style IN ('sheath', 'Sheath');
UPDATE dresses SET style = '??????' WHERE style IN ('????', 'boho', 'Boho', 'Bohemian');
UPDATE dresses SET style = '?????? ????' WHERE style IN ('lace', 'Lace');
UPDATE dresses SET style = '????? ????' WHERE style IN ('satin', 'Satin');
UPDATE dresses SET style = '??? ????' WHERE style IN ('tulle', 'Tulle');
UPDATE dresses SET style = '????? ????' WHERE style IN ('custom', 'Custom');



-- #############################################################################
-- Migration 004 ? Normalize dress colors (AR)
-- Source: supabase/migrations/004_normalize_dress_colors_ar.sql
-- #############################################################################


-- Normalize legacy color values to Arabic options
UPDATE dresses SET color = '??? ????' WHERE color IN ('Off White', 'off white', 'off-white', 'OffWhite');
UPDATE dresses SET color = '????' WHERE color IN ('white', 'White');
UPDATE dresses SET color = '????' WHERE color IN ('ivory', 'Ivory');
UPDATE dresses SET color = '?????' WHERE color IN ('cream', 'Cream');
UPDATE dresses SET color = '???' WHERE color IN ('beige', 'Beige');
UPDATE dresses SET color = '??????' WHERE color IN ('champagne', 'Champagne', '?ampagne');
UPDATE dresses SET color = '????' WHERE color IN ('gold', 'Gold', 'golden');
UPDATE dresses SET color = '???' WHERE color IN ('silver', 'Silver');
UPDATE dresses SET color = '???? ????' WHERE color IN ('blush', 'Blush');
UPDATE dresses SET color = '????' WHERE color IN ('pink', 'Pink');
UPDATE dresses SET color = '???' WHERE color IN ('mauve', 'Mauve');
UPDATE dresses SET color = '??????' WHERE color IN ('purple', 'Purple');
UPDATE dresses SET color = '???? ?????' WHERE color IN ('sky blue', 'Sky Blue');
UPDATE dresses SET color = '???? ????' WHERE color IN ('royal blue', 'Royal Blue');
UPDATE dresses SET color = '????' WHERE color IN ('navy', 'Navy');
UPDATE dresses SET color = '???? ?????' WHERE color IN ('emerald', 'Emerald');
UPDATE dresses SET color = '???? ??????' WHERE color IN ('olive', 'Olive');
UPDATE dresses SET color = '????' WHERE color IN ('red', 'Red');
UPDATE dresses SET color = '????' WHERE color IN ('burgundy', 'Burgundy');
UPDATE dresses SET color = '???' WHERE color IN ('brown', 'Brown');
UPDATE dresses SET color = '????' WHERE color IN ('black', 'Black');
UPDATE dresses SET color = '?????' WHERE color IN ('gray', 'grey', 'Gray', 'Grey');



-- #############################################################################
-- Migration 005 ? Booking personalization
-- Source: supabase/migrations/005_booking_personalization.sql
-- #############################################################################

-- Structured personalization for veils & bridal robes (???? ????)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS personalization JSONB;

COMMENT ON COLUMN bookings.personalization IS
  'Optional veil/robe embroidery personalization payload';



-- #############################################################################
-- Migration 006 ? Booking gift options
-- Source: supabase/migrations/006_booking_gift_options.sql
-- #############################################################################

-- Optional premium gift wrapping & gift card for veils / bridal robes
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS gift_options JSONB;

COMMENT ON COLUMN bookings.gift_options IS
  'Optional gift wrapping and gift card payload for veils/robes';



-- #############################################################################
-- Migration 007 ? Veils, bridal robes, shop_orders (+ APPLY_SHOP_CHECKOUT)
-- Source: supabase/migrations/007_veils_bridal_robes_orders.sql
-- Reinforced again in section 009 (IF NOT EXISTS ? safe duplicate).
-- #############################################################################

-- Separate product tables for veils & bridal robes + shop orders

CREATE TABLE IF NOT EXISTS veils (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  images JSONB DEFAULT '[]'::jsonb,
  category TEXT NOT NULL DEFAULT 'classic',
  color TEXT,
  material TEXT,
  stock_quantity INT NOT NULL DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bridal_robes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  images JSONB DEFAULT '[]'::jsonb,
  color TEXT,
  size TEXT,
  material TEXT,
  stock_quantity INT NOT NULL DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  gift_options JSONB,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'under_review',
      'confirmed',
      'awaiting_payment',
      'payment_received',
      'in_production',
      'ready_for_pickup',
      'shipped',
      'delivered',
      'cancelled',
      'completed'
    )),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Migrate existing dresses rows into dedicated tables
INSERT INTO veils (
  id, name_ar, description_ar, price, images, category, color, material,
  stock_quantity, is_available, is_featured, created_at, updated_at
)
SELECT
  id,
  name_ar,
  description_ar,
  COALESCE(price, rental_price, 0),
  images,
  COALESCE(NULLIF(style, ''), 'classic'),
  color,
  NULL,
  CASE WHEN is_available THEN 5 ELSE 0 END,
  is_available,
  is_featured,
  created_at,
  updated_at
FROM dresses
WHERE category = 'veils'
ON CONFLICT (id) DO NOTHING;

INSERT INTO bridal_robes (
  id, name_ar, description_ar, price, images, color, size, material,
  stock_quantity, is_featured, is_available, created_at, updated_at
)
SELECT
  id,
  name_ar,
  description_ar,
  COALESCE(price, rental_price, 0),
  images,
  color,
  size,
  COALESCE(NULLIF(style, ''), NULL),
  CASE WHEN is_available THEN 5 ELSE 0 END,
  is_featured,
  is_available,
  created_at,
  updated_at
FROM dresses
WHERE category = 'robes'
ON CONFLICT (id) DO NOTHING;

DELETE FROM dresses WHERE category IN ('veils', 'robes');

-- Drop obsolete category CHECK (do not recreate ? dynamic categories; see 016 / 025)
ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_category_check;

ALTER TABLE veils ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridal_robes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read veils" ON veils;
CREATE POLICY "Public read veils" ON veils FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read bridal_robes" ON bridal_robes;
CREATE POLICY "Public read bridal_robes" ON bridal_robes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public insert shop_orders" ON shop_orders;
CREATE POLICY "Public insert shop_orders" ON shop_orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin all veils" ON veils;
CREATE POLICY "Admin all veils" ON veils FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admin all bridal_robes" ON bridal_robes;
CREATE POLICY "Admin all bridal_robes" ON bridal_robes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admin all shop_orders" ON shop_orders;
CREATE POLICY "Admin all shop_orders" ON shop_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE INDEX IF NOT EXISTS idx_veils_featured ON veils(is_featured);
CREATE INDEX IF NOT EXISTS idx_bridal_robes_featured ON bridal_robes(is_featured);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON shop_orders(status);

-- #############################################################################
-- Migration 008 ? Nouf dress category
-- Source: supabase/migrations/008_add_nouf_dress_category.sql
-- #############################################################################

-- Legacy: once added nouf_dress to dresses_category_check.
-- CHECK dropped permanently (dynamic categories); keep booking service_type widen.
ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_category_check;

-- Booking service_type CHECK obsolete (app Zod; see 026) ? drop only, never re-ADD.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;



-- #############################################################################
-- Migration 009 ? Ensure shop tables & RLS
-- Source: supabase/migrations/009_ensure_shop_tables_and_rls.sql
-- #############################################################################

-- Ensure shop product tables + orders exist (idempotent)
-- Fixes checkout failure: missing public.shop_orders

CREATE TABLE IF NOT EXISTS veils (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  images JSONB DEFAULT '[]'::jsonb,
  category TEXT NOT NULL DEFAULT 'classic',
  color TEXT,
  material TEXT,
  stock_quantity INT NOT NULL DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bridal_robes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  images JSONB DEFAULT '[]'::jsonb,
  color TEXT,
  size TEXT,
  material TEXT,
  stock_quantity INT NOT NULL DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  gift_options JSONB,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'under_review',
      'confirmed',
      'awaiting_payment',
      'payment_received',
      'in_production',
      'ready_for_pickup',
      'shipped',
      'delivered',
      'cancelled',
      'completed'
    )),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE veils ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridal_robes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read veils" ON veils;
CREATE POLICY "Public read veils" ON veils FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read bridal_robes" ON bridal_robes;
CREATE POLICY "Public read bridal_robes" ON bridal_robes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert shop_orders" ON shop_orders;
CREATE POLICY "Public insert shop_orders" ON shop_orders FOR INSERT WITH CHECK (true);

-- No public SELECT on shop_orders (checkout inserts without returning the row)
DROP POLICY IF EXISTS "Public read shop_orders after insert" ON shop_orders;

DROP POLICY IF EXISTS "Admin all veils" ON veils;
CREATE POLICY "Admin all veils" ON veils FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admin all bridal_robes" ON bridal_robes;
CREATE POLICY "Admin all bridal_robes" ON bridal_robes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admin all shop_orders" ON shop_orders;
CREATE POLICY "Admin all shop_orders" ON shop_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE INDEX IF NOT EXISTS idx_veils_featured ON veils(is_featured);
CREATE INDEX IF NOT EXISTS idx_bridal_robes_featured ON bridal_robes(is_featured);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON shop_orders(status);
CREATE INDEX IF NOT EXISTS idx_shop_orders_created ON shop_orders(created_at DESC);



-- #############################################################################
-- Migration 010 ? Nouf dresses independent category
-- Source: supabase/migrations/010_nouf_dresses_independent_category.sql
-- #############################################################################

-- Independent category: ?????? ??? (nouf_dresses)
-- Wedding dresses stay as: wedding
-- Safe to run multiple times.

ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_category_check;

-- Move legacy / misclassified Nouf products out of wedding
UPDATE dresses
SET category = 'nouf_dresses',
    updated_at = now()
WHERE category IN ('wedding', 'wedding_dress', 'nouf_dress')
  AND (
    category = 'nouf_dress'
    OR name_ar ILIKE '%???%'
    OR name_ar ILIKE '%nouf%'
    OR description_ar ILIKE '%???%'
  );

-- Normalize any remaining wedding_dress ? wedding
UPDATE dresses
SET category = 'wedding',
    updated_at = now()
WHERE category = 'wedding_dress';

-- Ensure nouf_dress (singular legacy) ? nouf_dresses
UPDATE dresses
SET category = 'nouf_dresses',
    updated_at = now()
WHERE category = 'nouf_dress';

-- Do NOT recreate dresses_category_check (dynamic categories; see migration 025)

-- Booking service_type CHECK obsolete (app Zod; see 026) ? drop only, never re-ADD.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;

UPDATE bookings
SET service_type = 'nouf_dresses'
WHERE service_type = 'nouf_dress';



-- #############################################################################
-- APPLY_NOUF_DRESSES_CATEGORY ? Nouf category overlay
-- Source: supabase/APPLY_NOUF_DRESSES_CATEGORY.sql
-- #############################################################################

-- =============================================================================
-- Nouf category data normalize + drop obsolete CHECK (no hardcoded re-add).
-- Safe to run multiple times. Preserves all dress rows.
-- =============================================================================

ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_category_check;

UPDATE dresses
SET category = 'nouf_dresses',
    updated_at = now()
WHERE category IN ('wedding', 'wedding_dress', 'nouf_dress')
  AND (
    category = 'nouf_dress'
    OR name_ar ILIKE '%???%'
    OR name_ar ILIKE '%nouf%'
    OR description_ar ILIKE '%???%'
  );

UPDATE dresses
SET category = 'wedding',
    updated_at = now()
WHERE category = 'wedding_dress';

UPDATE dresses
SET category = 'nouf_dresses',
    updated_at = now()
WHERE category = 'nouf_dress';

-- Booking service_type CHECK obsolete (app Zod; see 026) ? drop only, never re-ADD.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;

UPDATE bookings
SET service_type = 'nouf_dresses'
WHERE service_type = 'nouf_dress';



-- #############################################################################
-- Migration 011 ? Order notifications
-- Source: supabase/migrations/011_order_notifications.sql
-- #############################################################################

-- Expand shop order statuses + notification_logs
-- Safe to run multiple times.
-- NOTE: Do NOT re-ADD an incomplete status list here ? live DBs may already have
-- awaiting_payment / payment_received (full list applied in migration 012 below).

ALTER TABLE shop_orders DROP CONSTRAINT IF EXISTS shop_orders_status_check;

-- Normalize legacy completed ? delivered
UPDATE shop_orders SET status = 'delivered' WHERE status = 'completed';

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES shop_orders(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  order_status TEXT,
  recipient TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('sent', 'failed', 'pending_retry')),
  error_message TEXT,
  attempts INT NOT NULL DEFAULT 1,
  payload JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_order ON notification_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at DESC);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin all notification_logs" ON notification_logs;
CREATE POLICY "Admin all notification_logs" ON notification_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);



-- #############################################################################
-- Migration 012 ? Order workflow notifications
-- Source: supabase/migrations/012_order_workflow_notifications.sql
-- #############################################################################

-- Full order workflow + notification_logs enrichment
-- Safe to run multiple times.

ALTER TABLE shop_orders DROP CONSTRAINT IF EXISTS shop_orders_status_check;

UPDATE shop_orders SET status = 'delivered' WHERE status = 'completed';

ALTER TABLE shop_orders
  ADD CONSTRAINT shop_orders_status_check
  CHECK (
    status IN (
      'pending',
      'under_review',
      'confirmed',
      'awaiting_payment',
      'payment_received',
      'in_production',
      'ready_for_pickup',
      'shipped',
      'delivered',
      'cancelled',
      'completed'
    )
  );

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES shop_orders(id) ON DELETE SET NULL,
  customer_id TEXT,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  order_status TEXT,
  recipient TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('sent', 'failed', 'pending_retry')),
  delivery_result TEXT,
  error_message TEXT,
  attempts INT NOT NULL DEFAULT 1,
  payload JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS delivery_result TEXT;

CREATE INDEX IF NOT EXISTS idx_notification_logs_order ON notification_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at DESC);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin all notification_logs" ON notification_logs;
CREATE POLICY "Admin all notification_logs" ON notification_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);



-- #############################################################################
-- APPLY_NOTIFICATIONS ? Workflow statuses + notification_logs
-- Source: supabase/APPLY_NOTIFICATIONS.sql
-- #############################################################################

-- =============================================================================
-- RUN IN SUPABASE ? SQL Editor
-- Full order workflow statuses + notification_logs
-- Safe to run multiple times.
-- =============================================================================

ALTER TABLE shop_orders DROP CONSTRAINT IF EXISTS shop_orders_status_check;

UPDATE shop_orders SET status = 'delivered' WHERE status = 'completed';

ALTER TABLE shop_orders
  ADD CONSTRAINT shop_orders_status_check
  CHECK (
    status IN (
      'pending',
      'under_review',
      'confirmed',
      'awaiting_payment',
      'payment_received',
      'in_production',
      'ready_for_pickup',
      'shipped',
      'delivered',
      'cancelled',
      'completed'
    )
  );

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES shop_orders(id) ON DELETE SET NULL,
  customer_id TEXT,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  order_status TEXT,
  recipient TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('sent', 'failed', 'pending_retry')),
  delivery_result TEXT,
  error_message TEXT,
  attempts INT NOT NULL DEFAULT 1,
  payload JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS delivery_result TEXT;

CREATE INDEX IF NOT EXISTS idx_notification_logs_order ON notification_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_dedupe
  ON notification_logs(order_id, notification_type, channel, order_status, status);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin all notification_logs" ON notification_logs;
CREATE POLICY "Admin all notification_logs" ON notification_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Allow service role inserts (edge/API) via existing admin client; no public insert.



-- #############################################################################
-- Migration 013 ? Booking city
-- Source: supabase/migrations/013_booking_city.sql
-- #############################################################################

-- Add city column for booking form
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS city TEXT;
COMMENT ON COLUMN bookings.city IS 'Customer city (required on booking form)';



-- #############################################################################
-- Migration 014 ? Booking region
-- Source: supabase/migrations/014_booking_region.sql
-- #############################################################################

-- Align bookings with form: region column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS region TEXT;

COMMENT ON COLUMN bookings.region IS 'Delivery region (required when delivery_required = true)';
COMMENT ON COLUMN bookings.city IS 'Customer city';



-- #############################################################################
-- Migration 015 ? Bookings form sync
-- Source: supabase/migrations/015_bookings_form_sync.sql
-- #############################################################################

-- Sync bookings columns with booking form + POST /api/bookings payload
-- Safe to run multiple times.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS time TIME;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dress_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_required BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_region TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_city TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_status TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS personalization JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gift_options JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Booking service_type CHECK obsolete (app Zod; see 026) ? drop only, never re-ADD.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (
    status IS NULL
    OR status IN ('pending', 'confirmed', 'cancelled', 'completed')
  );

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_delivery_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_delivery_status_check
  CHECK (
    delivery_status IS NULL
    OR delivery_status IN ('pending', 'preparing', 'out_for_delivery', 'delivered')
  );

NOTIFY pgrst, 'reload schema';



-- #############################################################################
-- APPLY_BOOKINGS_COMPLETE ? Full bookings column sync
-- Source: supabase/APPLY_BOOKINGS_COMPLETE.sql
-- #############################################################################

-- =============================================================================
-- RUN ONCE IN SUPABASE ? SQL Editor
-- Syncs bookings table with every field submitted by the booking form / API.
-- Safe to run multiple times (IF NOT EXISTS).
-- =============================================================================

-- Core contact + appointment
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS time TIME;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dress_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT;

-- Location
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS region TEXT;

-- Delivery
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_required BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_region TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_city TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_status TEXT;

-- JSON extras from form (personalization / gift)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS personalization JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gift_options JSONB;

-- Workflow
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Service types: drop obsolete CHECK only (app Zod; see 026). Never re-ADD.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;

-- Status check
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (
    status IS NULL
    OR status IN ('pending', 'confirmed', 'cancelled', 'completed')
  );

-- Delivery status check
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_delivery_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_delivery_status_check
  CHECK (
    delivery_status IS NULL
    OR delivery_status IN ('pending', 'preparing', 'out_for_delivery', 'delivered')
  );

-- Optional FK (only if dresses table exists and dress_id has no FK yet)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dresses'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND constraint_name = 'bookings_dress_id_fkey'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_dress_id_fkey
      FOREIGN KEY (dress_id) REFERENCES dresses(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN bookings.city IS 'Customer city (booking form)';
COMMENT ON COLUMN bookings.region IS 'Delivery region (required when delivery_required)';
COMMENT ON COLUMN bookings.delivery_address IS 'Delivery address (required when delivery_required)';
COMMENT ON COLUMN bookings.personalization IS 'Optional veil/robe embroidery JSON';
COMMENT ON COLUMN bookings.gift_options IS 'Optional gift wrapping JSON';

-- Reload PostgREST schema cache (fixes "Could not find the column" after ALTER)
NOTIFY pgrst, 'reload schema';



-- #############################################################################
-- APPLY_BOOKINGS_FIX ? Bookings fixes
-- Source: supabase/APPLY_BOOKINGS_FIX.sql
-- #############################################################################

-- =============================================================================
-- RUN IN SUPABASE ? SQL Editor
-- Booking form fixes: city column + service_type constraint
-- Safe to run multiple times.
-- =============================================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS region TEXT;

-- Booking service_type CHECK obsolete (app Zod; see 026) ? drop only, never re-ADD.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_delivery_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_delivery_status_check
  CHECK (
    delivery_status IS NULL
    OR delivery_status IN ('pending', 'preparing', 'out_for_delivery', 'delivered')
  );

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS personalization JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gift_options JSONB;

COMMENT ON COLUMN bookings.city IS 'Customer city (required on booking form)';



-- #############################################################################
-- APPLY_BOOKINGS_ADMIN_RLS ? Bookings admin RLS
-- Source: supabase/APPLY_BOOKINGS_ADMIN_RLS.sql
-- #############################################################################

-- =============================================================================
-- RUN IN SUPABASE ? SQL Editor (does NOT change table columns)
-- Ensures authenticated admins can SELECT / UPDATE / DELETE all bookings.
-- Public INSERT remains allowed for the booking form.
-- =============================================================================

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Keep public insert for the website form
DROP POLICY IF EXISTS "Public insert bookings" ON bookings;
CREATE POLICY "Public insert bookings" ON bookings
  FOR INSERT
  WITH CHECK (true);

-- Admin full access (read + write) via profiles.role = 'admin'
DROP POLICY IF EXISTS "Admin all bookings" ON bookings;
CREATE POLICY "Admin all bookings" ON bookings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Optional: explicit SELECT policy (some projects prefer this clarity)
DROP POLICY IF EXISTS "Admin select bookings" ON bookings;
CREATE POLICY "Admin select bookings" ON bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';



-- #############################################################################
-- M2 / Migration 016 ? Dynamic categories
-- Source: supabase/APPLY_CATEGORIES.sql
-- #############################################################################

-- Apply in Supabase SQL Editor if migrations are not run automatically.
-- Same as migrations/016_categories.sql

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  slug TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  icon_url TEXT,
  cover_image_url TEXT,
  description_ar TEXT NOT NULL DEFAULT '',
  href TEXT,
  legacy_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT categories_slug_unique UNIQUE (slug),
  CONSTRAINT categories_no_self_parent CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_visible ON categories(is_visible);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_legacy_key
  ON categories(legacy_key) WHERE legacy_key IS NOT NULL;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read categories" ON categories;
CREATE POLICY "Public read categories" ON categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin all categories" ON categories;
CREATE POLICY "Admin all categories" ON categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

INSERT INTO categories (id, name_ar, slug, parent_id, sort_order, is_visible, description_ar, href, legacy_key)
VALUES
  ('a1000000-0000-4000-8000-000000000001', '?????? ??????', 'wedding-dresses', NULL, 10, true, '', '/wedding-dresses', 'wedding'),
  ('a1000000-0000-4000-8000-000000000002', '?????? ???????', 'rental-dresses', NULL, 20, true, '', '/rental-dresses', 'rental'),
  ('a1000000-0000-4000-8000-000000000003', '????? ????? ???', 'custom-design', NULL, 30, true, '', '/custom-design', 'custom_design'),
  ('a1000000-0000-4000-8000-000000000004', '?????? ???', 'nouf-dresses', NULL, 40, true, '', '/nouf-dresses', 'nouf_dresses'),
  ('a1000000-0000-4000-8000-000000000005', '????????? ??????', 'bridal-accessories', NULL, 50, true, '???? ?????? ????? ??????', NULL, 'bridal_accessories'),
  ('a1000000-0000-4000-8000-000000000006', '???? ??????', 'veils', 'a1000000-0000-4000-8000-000000000005', 10, true, '', '/veils', 'veils'),
  ('a1000000-0000-4000-8000-000000000007', '???? ??????', 'robes', 'a1000000-0000-4000-8000-000000000005', 20, true, '', '/robes', 'bridal_robes')
ON CONFLICT (slug) DO NOTHING;



-- #############################################################################
-- M1 ? Categories ???? spelling fix
-- Source: supabase/APPLY_CATEGORIES_BERNUS_SPELLING.sql
-- #############################################################################

-- Fix category labels to official spelling: ???? ??????
-- Safe / idempotent.

UPDATE categories
SET
  name_ar = REPLACE(name_ar, '????', '????'),
  description_ar = REPLACE(description_ar, '????', '????'),
  updated_at = now()
WHERE name_ar LIKE '%????%' OR description_ar LIKE '%????%';

-- Optional: product text (already mostly ???? in live data)
UPDATE bridal_robes
SET
  name_ar = REPLACE(name_ar, '????', '????'),
  description_ar = REPLACE(description_ar, '????', '????'),
  updated_at = now()
WHERE name_ar LIKE '%????%' OR description_ar LIKE '%????%';

SELECT slug, name_ar, description_ar
FROM categories
WHERE slug IN ('robes', 'bridal-accessories')
ORDER BY slug;



-- #############################################################################
-- M1 ? Rename ???? ? ???? across catalog
-- Source: supabase/APPLY_RENAME_TO_BERNUS.sql
-- #############################################################################

-- Official naming: ???? ?????? (not ???? ??????)
-- Run in Supabase SQL Editor. Idempotent via REPLACE.

-- Product catalog
UPDATE bridal_robes
SET
  name_ar = REPLACE(name_ar, '????', '????'),
  description_ar = REPLACE(description_ar, '????', '????'),
  color = CASE WHEN color IS NULL THEN NULL ELSE REPLACE(color, '????', '????') END,
  material = CASE WHEN material IS NULL THEN NULL ELSE REPLACE(material, '????', '????') END,
  size = CASE WHEN size IS NULL THEN NULL ELSE REPLACE(size, '????', '????') END,
  updated_at = now()
WHERE
  name_ar LIKE '%????%'
  OR description_ar LIKE '%????%'
  OR COALESCE(color, '') LIKE '%????%'
  OR COALESCE(material, '') LIKE '%????%'
  OR COALESCE(size, '') LIKE '%????%';

UPDATE veils
SET
  name_ar = REPLACE(name_ar, '????', '????'),
  description_ar = REPLACE(description_ar, '????', '????'),
  updated_at = now()
WHERE name_ar LIKE '%????%' OR description_ar LIKE '%????%';

UPDATE dresses
SET
  name_ar = REPLACE(name_ar, '????', '????'),
  description_ar = REPLACE(description_ar, '????', '????'),
  updated_at = now()
WHERE name_ar LIKE '%????%' OR description_ar LIKE '%????%';

UPDATE categories
SET
  name_ar = REPLACE(name_ar, '????', '????'),
  description_ar = REPLACE(description_ar, '????', '????'),
  updated_at = now()
WHERE name_ar LIKE '%????%' OR description_ar LIKE '%????%';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'gallery_items'
  ) THEN
    UPDATE gallery_items
    SET
      title_ar = REPLACE(title_ar, '????', '????'),
      category = REPLACE(category, '????', '????')
    WHERE title_ar LIKE '%????%' OR category LIKE '%????%';
  END IF;
END $$;

-- Shop order line items (JSONB)
UPDATE shop_orders
SET items = REPLACE(items::text, '????', '????')::jsonb
WHERE items::text LIKE '%????%';

UPDATE shop_orders
SET notes = REPLACE(notes, '????', '????')
WHERE notes LIKE '%????%';

-- Bookings free text / JSON
UPDATE bookings
SET notes = REPLACE(notes, '????', '????')
WHERE notes LIKE '%????%';

UPDATE bookings
SET personalization = REPLACE(personalization::text, '????', '????')::jsonb
WHERE personalization IS NOT NULL AND personalization::text LIKE '%????%';

UPDATE bookings
SET gift_options = REPLACE(gift_options::text, '????', '????')::jsonb
WHERE gift_options IS NOT NULL AND gift_options::text LIKE '%????%';

-- Settings JSON blob (if any Arabic copy stored there)
UPDATE settings
SET value = REPLACE(value::text, '????', '????')::jsonb
WHERE value::text LIKE '%????%';

-- Verification
SELECT 'bridal_robes' AS src, COUNT(*) AS still_has_wrong
FROM bridal_robes
WHERE name_ar LIKE '%????%' OR description_ar LIKE '%????%'
UNION ALL
SELECT 'categories', COUNT(*)
FROM categories
WHERE name_ar LIKE '%????%' OR description_ar LIKE '%????%'
UNION ALL
SELECT 'shop_orders', COUNT(*)
FROM shop_orders
WHERE items::text LIKE '%????%' OR COALESCE(notes, '') LIKE '%????%';



-- #############################################################################
-- M5 / Migration 017 ? Shop order shipping columns
-- Source: supabase/APPLY_SHOP_SHIPPING.sql
-- #############################################################################

-- Apply in Supabase SQL Editor if migration runner is not used.
-- Same as migrations/017_shop_order_shipping.sql

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_required BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_full_name TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_phone TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_city TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_region TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_address TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_postal_code TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_notes TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC NOT NULL DEFAULT 0;
COMMENT ON COLUMN shop_orders.shipping_cost IS
  'Courier fee snapshot at checkout (DB column name is shipping_cost, not shipping_fee).';

DROP POLICY IF EXISTS "Public read shop_orders by id" ON shop_orders;
CREATE POLICY "Public read shop_orders by id" ON shop_orders
  FOR SELECT USING (true);



-- #############################################################################
-- M6 / Migration 018 ? Customer in-app notifications
-- Source: supabase/APPLY_CUSTOMER_NOTIFICATIONS.sql
-- #############################################################################

-- Apply in Supabase SQL Editor (same as migrations/018_customer_notifications.sql)
CREATE TABLE IF NOT EXISTS customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES shop_orders(id) ON DELETE CASCADE,
  customer_key TEXT,
  title_ar TEXT NOT NULL,
  body_ar TEXT NOT NULL DEFAULT '',
  order_status TEXT,
  href TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_order
  ON customer_notifications(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer
  ON customer_notifications(customer_key, created_at DESC)
  WHERE customer_key IS NOT NULL;

ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read customer_notifications" ON customer_notifications;
CREATE POLICY "Public read customer_notifications" ON customer_notifications
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public update customer_notifications read" ON customer_notifications;
CREATE POLICY "Public update customer_notifications read" ON customer_notifications
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin all customer_notifications" ON customer_notifications;
CREATE POLICY "Admin all customer_notifications" ON customer_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Public insert customer_notifications" ON customer_notifications;
CREATE POLICY "Public insert customer_notifications" ON customer_notifications
  FOR INSERT WITH CHECK (true);



-- #############################################################################
-- Notify prefs / Migration 019 ? Notification channel preferences
-- Source: supabase/APPLY_NOTIFICATION_PREFERENCES.sql
-- #############################################################################

-- =============================================================================
-- REQUIRED: Run in Supabase ? SQL Editor ? New query ? Run
-- Adds notification channel preferences to shop_orders and bookings.
-- Same as migrations/019_notification_channel_preferences.sql
-- Safe to run multiple times.
-- =============================================================================

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS notify_whatsapp BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS notify_whatsapp BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN shop_orders.notify_whatsapp IS
  'Customer opted in to WhatsApp order updates';
COMMENT ON COLUMN shop_orders.notify_email IS
  'Customer opted in to email order updates';
COMMENT ON COLUMN bookings.notify_whatsapp IS
  'Customer opted in to WhatsApp booking updates';
COMMENT ON COLUMN bookings.notify_email IS
  'Customer opted in to email booking updates';

NOTIFY pgrst, 'reload schema';



-- #############################################################################
-- M9 / Migration 020 ? Shipping regions + delivery method (CREATES shipping_regions)
-- Source: supabase/APPLY_SHIPPING_REGIONS.sql
-- #############################################################################

-- Apply in Supabase SQL Editor if migration runner is not used.
-- Same as migrations/020_shipping_regions_delivery.sql
-- Milestone 9: shipping regions + boutique pickup / delivery
-- Safe to re-run (idempotent).
--
-- Order matters:
--   1) create shipping_regions
--   2) add shop_orders.shipping_region_id (and related columns)
--   3) then seed / cleanup that may reference shipping_region_id

-- ---------------------------------------------------------------------------
-- shipping_regions catalog
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipping_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL DEFAULT '',
  shipping_fee NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  estimated_days INT,
  carrier_code TEXT,
  free_shipping_override NUMERIC,
  discount NUMERIC,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipping_regions_active
  ON shipping_regions(is_active);
CREATE INDEX IF NOT EXISTS idx_shipping_regions_sort
  ON shipping_regions(sort_order);

ALTER TABLE shipping_regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active shipping_regions" ON shipping_regions;
CREATE POLICY "Public read active shipping_regions" ON shipping_regions
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admin all shipping_regions" ON shipping_regions;
CREATE POLICY "Admin all shipping_regions" ON shipping_regions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- shop_orders: delivery method + extended address
-- (must run BEFORE seed DELETE that references shipping_region_id)
-- ---------------------------------------------------------------------------
ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS delivery_method TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_region_id UUID REFERENCES shipping_regions(id) ON DELETE SET NULL;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_region_name_ar TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_building_number TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_neighborhood TEXT;

-- Constrain delivery_method when set (NULL allowed for legacy / dress-only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shop_orders_delivery_method_check'
  ) THEN
    ALTER TABLE shop_orders
      ADD CONSTRAINT shop_orders_delivery_method_check
      CHECK (delivery_method IS NULL OR delivery_method IN ('pickup', 'delivery'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shop_orders_delivery_method
  ON shop_orders(delivery_method);
CREATE INDEX IF NOT EXISTS idx_shop_orders_shipping_region_id
  ON shop_orders(shipping_region_id);

COMMENT ON COLUMN shop_orders.delivery_method IS
  'pickup = boutique pickup; delivery = courier. NULL on legacy / non-shipping orders.';
COMMENT ON COLUMN shop_orders.shipping_region_id IS
  'FK to shipping_regions when delivery_method = delivery.';
COMMENT ON COLUMN shop_orders.shipping_region_name_ar IS
  'Denormalized Arabic region name snapshot at checkout.';

-- ---------------------------------------------------------------------------
-- Seed: regional groups + cities (stable UUIDs, idempotent)
-- Groups are inactive (not offered at checkout); cities are active.
-- meta.group_ar links cities to a top-level group without schema changes.
-- ---------------------------------------------------------------------------

-- Remove legacy Saudi seed rows if present (skip any still referenced by orders)
DELETE FROM shipping_regions sr
WHERE sr.id IN (
  'b1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000002',
  'b1000000-0000-4000-8000-000000000003',
  'b1000000-0000-4000-8000-000000000004',
  'b1000000-0000-4000-8000-000000000005',
  'b1000000-0000-4000-8000-000000000006',
  'b1000000-0000-4000-8000-000000000007',
  'b1000000-0000-4000-8000-000000000008',
  'b1000000-0000-4000-8000-000000000009',
  'b1000000-0000-4000-8000-000000000010',
  'b1000000-0000-4000-8000-000000000011'
)
AND NOT EXISTS (
  SELECT 1 FROM shop_orders o WHERE o.shipping_region_id = sr.id
);

INSERT INTO shipping_regions (id, name_ar, name_en, shipping_fee, is_active, sort_order, meta)
VALUES
  -- Top-level groups (inactive ? organizational only)
  ('c1000000-0000-4000-8000-000000000001', '??????', 'South', 0, false, 10,
   '{"kind":"group","group_key":"south"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000002', '??????', 'Center', 0, false, 20,
   '{"kind":"group","group_key":"center"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000003', '??????', 'Triangle', 0, false, 30,
   '{"kind":"group","group_key":"triangle"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000004', '??????', 'North', 0, false, 40,
   '{"kind":"group","group_key":"north"}'::jsonb),

  -- ??????
  ('c2000000-0000-4000-8000-000000000001', '???', 'Rahat', 45, true, 100,
   '{"kind":"city","group_key":"south","group_ar":"??????"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000002', '?? ?????', 'Tel Sheva', 45, true, 110,
   '{"kind":"city","group_key":"south","group_ar":"??????"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000003', '????', 'Hura', 45, true, 120,
   '{"kind":"city","group_key":"south","group_ar":"??????"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000004', '??????', 'Lakiya', 45, true, 130,
   '{"kind":"city","group_key":"south","group_ar":"??????"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000005', '???? ??????', 'Segev Shalom', 45, true, 140,
   '{"kind":"city","group_key":"south","group_ar":"??????"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000006', '?????', 'Kuseife', 45, true, 150,
   '{"kind":"city","group_key":"south","group_ar":"??????"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000007', '????? ?????', 'Arara BaNegev', 45, true, 160,
   '{"kind":"city","group_key":"south","group_ar":"??????"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000008', '??? ?????', 'Beer Sheva', 45, true, 170,
   '{"kind":"city","group_key":"south","group_ar":"??????"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000009', '???? ?????', 'Wadi al-Naam', 45, true, 180,
   '{"kind":"city","group_key":"south","group_ar":"??????"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000010', '??? ????', 'Abu Tulul', 45, true, 190,
   '{"kind":"city","group_key":"south","group_ar":"??????"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000011', '??????', 'Tarabin', 45, true, 200,
   '{"kind":"city","group_key":"south","group_ar":"??????"}'::jsonb),

  -- ??????
  ('c3000000-0000-4000-8000-000000000001', '?? ????', 'Tel Aviv', 40, true, 300,
   '{"kind":"city","group_key":"center","group_ar":"??????"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000002', '????', 'Jaffa', 40, true, 310,
   '{"kind":"city","group_key":"center","group_ar":"??????"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000003', '????', 'Lod', 40, true, 320,
   '{"kind":"city","group_key":"center","group_ar":"??????"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000004', '??????', 'Ramla', 40, true, 330,
   '{"kind":"city","group_key":"center","group_ar":"??????"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000005', '??????', 'Netanya', 40, true, 340,
   '{"kind":"city","group_key":"center","group_ar":"??????"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000006', '???????', 'Herzliya', 40, true, 350,
   '{"kind":"city","group_key":"center","group_ar":"??????"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000007', '????? ??????', 'Rishon LeZion', 40, true, 360,
   '{"kind":"city","group_key":"center","group_ar":"??????"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000008', '?????', 'Holon', 40, true, 370,
   '{"kind":"city","group_key":"center","group_ar":"??????"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000009', '??? ???', 'Bat Yam', 40, true, 380,
   '{"kind":"city","group_key":"center","group_ar":"??????"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000010', '???? ???', 'Ramat Gan', 40, true, 390,
   '{"kind":"city","group_key":"center","group_ar":"??????"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000011', '???? ????', 'Petah Tikva', 40, true, 400,
   '{"kind":"city","group_key":"center","group_ar":"??????"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000012', '???? ????', 'Kfar Saba', 40, true, 410,
   '{"kind":"city","group_key":"center","group_ar":"??????"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000013', '??????', 'Ra''anana', 40, true, 420,
   '{"kind":"city","group_key":"center","group_ar":"??????"}'::jsonb),

  -- ??????
  ('c4000000-0000-4000-8000-000000000001', '?? ?????', 'Umm al-Fahm', 40, true, 500,
   '{"kind":"city","group_key":"triangle","group_ar":"??????"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000002', '??????', 'Tayibe', 40, true, 510,
   '{"kind":"city","group_key":"triangle","group_ar":"??????"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000003', '??????', 'Tira', 40, true, 520,
   '{"kind":"city","group_key":"triangle","group_ar":"??????"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000004', '???? ???????', 'Baqa al-Gharbiyye', 40, true, 530,
   '{"kind":"city","group_key":"triangle","group_ar":"??????"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000005', '??? ????', 'Kafr Qasim', 40, true, 540,
   '{"kind":"city","group_key":"triangle","group_ar":"??????"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000006', '??? ???', 'Kafr Qara', 40, true, 550,
   '{"kind":"city","group_key":"triangle","group_ar":"??????"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000007', '???????', 'Jaljulia', 40, true, 560,
   '{"kind":"city","group_key":"triangle","group_ar":"??????"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000008', '??????', 'Qalansawe', 40, true, 570,
   '{"kind":"city","group_key":"triangle","group_ar":"??????"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000009', '????', 'Zemer', 40, true, 580,
   '{"kind":"city","group_key":"triangle","group_ar":"??????"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000010', '????', 'Ara', 40, true, 590,
   '{"kind":"city","group_key":"triangle","group_ar":"??????"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000011', '?????', 'Arara', 40, true, 600,
   '{"kind":"city","group_key":"triangle","group_ar":"??????"}'::jsonb),

  -- ??????
  ('c5000000-0000-4000-8000-000000000001', '???????', 'Nazareth', 45, true, 700,
   '{"kind":"city","group_key":"north","group_ar":"??????"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000002', '???????', 'Shefa-Amr', 45, true, 710,
   '{"kind":"city","group_key":"north","group_ar":"??????"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000003', '?????', 'Sakhnin', 45, true, 720,
   '{"kind":"city","group_key":"north","group_ar":"??????"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000004', '???', 'Acre', 45, true, 730,
   '{"kind":"city","group_key":"north","group_ar":"??????"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000005', '?????', 'Tiberias', 45, true, 740,
   '{"kind":"city","group_key":"north","group_ar":"??????"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000006', '???', 'Safed', 45, true, 750,
   '{"kind":"city","group_key":"north","group_ar":"??????"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000007', '????', 'Haifa', 45, true, 760,
   '{"kind":"city","group_key":"north","group_ar":"??????"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000008', '????', 'Tamra', 45, true, 770,
   '{"kind":"city","group_key":"north","group_ar":"??????"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000009', '??? ??????', 'Majd al-Krum', 45, true, 780,
   '{"kind":"city","group_key":"north","group_ar":"??????"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000010', '??? ???', 'Kafr Kanna', 45, true, 790,
   '{"kind":"city","group_key":"north","group_ar":"??????"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000011', '??????', 'Eilabun', 45, true, 800,
   '{"kind":"city","group_key":"north","group_ar":"??????"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000012', '??? ???', 'Deir Hanna', 45, true, 810,
   '{"kind":"city","group_key":"north","group_ar":"??????"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000013', '?????', 'Arraba', 45, true, 820,
   '{"kind":"city","group_key":"north","group_ar":"??????"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000014', '???', 'Nahf', 45, true, 830,
   '{"kind":"city","group_key":"north","group_ar":"??????"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  shipping_fee = EXCLUDED.shipping_fee,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  meta = EXCLUDED.meta,
  updated_at = now();

-- #############################################################################
-- M10 / Migration 021 ? Smart shipping (pending fees, tracking, estimates)
-- Source: supabase/APPLY_SMART_SHIPPING.sql
-- #############################################################################

-- =============================================================================
-- Milestone 10 ? Smart shipping (idempotent)
-- Same as migrations/021_smart_shipping.sql, but SELF-CONTAINED:
-- creates shipping_regions if missing (does not assume M9 was applied).
--
-- In APPLY_ALL this block runs AFTER section M10 only after M5+M9 above.
-- Standalone APPLY_SMART_SHIPPING.sql may create an empty shipping_regions
-- table if run alone; APPLY_ALL already seeded regions in M9.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Ensure shipping_regions exists (from M9 / 020)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipping_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL DEFAULT '',
  shipping_fee NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  estimated_days INT,
  carrier_code TEXT,
  free_shipping_override NUMERIC,
  discount NUMERIC,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipping_regions_active
  ON shipping_regions(is_active);
CREATE INDEX IF NOT EXISTS idx_shipping_regions_sort
  ON shipping_regions(sort_order);

ALTER TABLE shipping_regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active shipping_regions" ON shipping_regions;
CREATE POLICY "Public read active shipping_regions" ON shipping_regions
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admin all shipping_regions" ON shipping_regions;
CREATE POLICY "Admin all shipping_regions" ON shipping_regions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- shipping_regions: estimated delivery window + search indexes (M10)
-- ---------------------------------------------------------------------------
ALTER TABLE shipping_regions
  ADD COLUMN IF NOT EXISTS estimated_days_min INT;

ALTER TABLE shipping_regions
  ADD COLUMN IF NOT EXISTS estimated_days_max INT;

ALTER TABLE shipping_regions
  ADD COLUMN IF NOT EXISTS estimated_delivery_ar TEXT;

-- Backfill min/max from legacy estimated_days when present
UPDATE shipping_regions
SET
  estimated_days_min = COALESCE(estimated_days_min, estimated_days),
  estimated_days_max = COALESCE(estimated_days_max, estimated_days)
WHERE estimated_days IS NOT NULL
  AND (estimated_days_min IS NULL OR estimated_days_max IS NULL);

ALTER TABLE shipping_regions
  ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_shipping_regions_name_ar
  ON shipping_regions (name_ar);

CREATE INDEX IF NOT EXISTS idx_shipping_regions_name_en
  ON shipping_regions (name_en);

CREATE INDEX IF NOT EXISTS idx_shipping_regions_active_sort
  ON shipping_regions (is_active, sort_order);

-- ---------------------------------------------------------------------------
-- shop_orders: unknown region + pending fee + tracking readiness
-- Requires shop_orders to already exist.
-- ---------------------------------------------------------------------------
ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_fee_pending BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS shipping_region_custom TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS region_configured BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS tracking_number TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS tracking_url TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS internal_shipping_notes TEXT;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS carrier_code TEXT;

CREATE INDEX IF NOT EXISTS idx_shop_orders_shipping_fee_pending
  ON shop_orders (shipping_fee_pending)
  WHERE shipping_fee_pending = true;

CREATE INDEX IF NOT EXISTS idx_shop_orders_region_custom
  ON shop_orders (shipping_region_custom)
  WHERE shipping_region_custom IS NOT NULL;

COMMENT ON COLUMN shop_orders.shipping_fee_pending IS
  'True when delivery region was free-text / not in shipping_regions; fee awaits admin review.';
COMMENT ON COLUMN shop_orders.shipping_region_custom IS
  'Exact customer-entered region/city when no configured shipping_regions row matched.';
COMMENT ON COLUMN shop_orders.region_configured IS
  'False when checkout region did not match an active shipping_regions row.';
COMMENT ON COLUMN shop_orders.tracking_number IS
  'Carrier tracking number (future multi-carrier).';
COMMENT ON COLUMN shop_orders.tracking_url IS
  'Optional public tracking link.';
COMMENT ON COLUMN shop_orders.internal_shipping_notes IS
  'Admin-only shipping notes (not shown to customer).';
COMMENT ON COLUMN shop_orders.carrier_code IS
  'Nullable carrier identifier for future multi-carrier support.';
COMMENT ON COLUMN shipping_regions.estimated_days_min IS
  'Lower bound of estimated delivery days.';
COMMENT ON COLUMN shipping_regions.estimated_days_max IS
  'Upper bound of estimated delivery days.';
COMMENT ON COLUMN shipping_regions.estimated_delivery_ar IS
  'Optional Arabic free-text estimated delivery (overrides min/max display when set).';
COMMENT ON COLUMN shipping_regions.meta IS
  'JSONB bag for carriers, campaign prices, free-shipping overrides, etc.';

NOTIFY pgrst, 'reload schema';



-- #############################################################################
-- Migration 022 ? Soft delete / archive / audit
-- Source: supabase/migrations/022_soft_delete_archive_audit.sql
-- Same as: supabase/APPLY_SOFT_DELETE_ARCHIVE.sql
-- #############################################################################

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'shop_orders',
    'bookings',
    'dresses',
    'veils',
    'bridal_robes',
    'categories',
    'contact_messages',
    'notification_logs',
    'customer_notifications',
    'shipping_regions',
    'gallery_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false',
        t
      );
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ',
        t
      );
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_by UUID',
        t
      );
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ',
        t
      );
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS archived_by UUID',
        t
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_is_deleted ON %I (is_deleted)',
        t,
        t
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_archived_at ON %I (archived_at)',
        t,
        t
      );
    END IF;
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  actor_email TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_module_created
  ON audit_logs (module, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record
  ON audit_logs (module, record_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin all audit_logs" ON audit_logs;
CREATE POLICY "Admin all audit_logs" ON audit_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TABLE IF NOT EXISTS customer_admin_state (
  customer_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_admin_state_deleted
  ON customer_admin_state (is_deleted);
CREATE INDEX IF NOT EXISTS idx_customer_admin_state_archived
  ON customer_admin_state (archived_at);

ALTER TABLE customer_admin_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin all customer_admin_state" ON customer_admin_state;
CREATE POLICY "Admin all customer_admin_state" ON customer_admin_state
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );



-- #############################################################################
-- Migration 023 ? Report schedules (future-ready; no cron runner)
-- Source: supabase/migrations/023_report_schedules.sql / APPLY_REPORTS.sql
-- #############################################################################

CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  report_type TEXT NOT NULL,
  email TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_enabled
  ON report_schedules (enabled, frequency);

CREATE INDEX IF NOT EXISTS idx_report_schedules_report_type
  ON report_schedules (report_type);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'shop_orders'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_shop_orders_created_at ON shop_orders (created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_shop_orders_status_created ON shop_orders (status, created_at DESC)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bookings'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON bookings (status, created_at DESC)';
  END IF;
END $$;

ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin all report_schedules" ON report_schedules;
CREATE POLICY "Admin all report_schedules" ON report_schedules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

COMMENT ON TABLE report_schedules IS
  'Scheduled report email jobs. Future-ready: no cron/runner yet ? CRUD + API only; do not auto-send until a schedule runner is deployed.';


-- #############################################################################
-- Migration 024 ? Smart appointments
-- Source: supabase/migrations/024_smart_appointments.sql
--         supabase/APPLY_SMART_APPOINTMENTS.sql
-- #############################################################################

CREATE TABLE IF NOT EXISTS consultants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultants_active_sort
  ON consultants (active, sort_order);

ALTER TABLE consultants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active consultants" ON consultants;
CREATE POLICY "Public read active consultants" ON consultants
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Admin all consultants" ON consultants;
CREATE POLICY "Admin all consultants" ON consultants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

INSERT INTO consultants (name_ar, active, sort_order)
SELECT v.name_ar, true, v.sort_order
FROM (VALUES
  ('?????', 0),
  ('????', 1),
  ('???', 2)
) AS v(name_ar, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM consultants c WHERE c.name_ar = v.name_ar
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_source TEXT DEFAULT 'online';
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consultant_id UUID REFERENCES consultants(id) ON DELETE SET NULL;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_minutes INT NOT NULL DEFAULT 60;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS buffer_before INT NOT NULL DEFAULT 0;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS buffer_after INT NOT NULL DEFAULT 0;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMPTZ;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'bookings_booking_source_check'
    ) THEN
      ALTER TABLE bookings
        ADD CONSTRAINT bookings_booking_source_check
        CHECK (
          booking_source IS NULL OR booking_source IN ('online', 'phone', 'walk_in', 'admin')
        );
    END IF;

    CREATE INDEX IF NOT EXISTS idx_bookings_consultant_date
      ON bookings (consultant_id, date);
    CREATE INDEX IF NOT EXISTS idx_bookings_date_time
      ON bookings (date, time);
    CREATE INDEX IF NOT EXISTS idx_bookings_source
      ON bookings (booking_source);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS waiting_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  preferred_date DATE,
  preferred_time TIME,
  consultant_id UUID REFERENCES consultants(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'notified', 'booked', 'cancelled')),
  notify_whatsapp BOOLEAN NOT NULL DEFAULT true,
  notify_email BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waiting_list_status_created
  ON waiting_list (status, created_at);
CREATE INDEX IF NOT EXISTS idx_waiting_list_preferred_date
  ON waiting_list (preferred_date);

ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert waiting_list" ON waiting_list;
CREATE POLICY "Public insert waiting_list" ON waiting_list
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin all waiting_list" ON waiting_list;
CREATE POLICY "Admin all waiting_list" ON waiting_list
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TABLE IF NOT EXISTS special_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_date DATE NOT NULL,
  day_type TEXT NOT NULL
    CHECK (day_type IN ('holiday', 'vacation', 'maintenance', 'private_event')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (day_date)
);

CREATE INDEX IF NOT EXISTS idx_special_days_date ON special_days (day_date);

ALTER TABLE special_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read special_days" ON special_days;
CREATE POLICY "Public read special_days" ON special_days
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin all special_days" ON special_days;
CREATE POLICY "Admin all special_days" ON special_days
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

INSERT INTO settings (key, value, updated_at)
VALUES (
  'appointments',
  '{
    "opening_time": "10:00",
    "closing_time": "20:00",
    "working_days": [0, 1, 2, 3, 4, 6],
    "lunch_break": { "enabled": true, "start": "13:00", "end": "14:00" },
    "prayer_break": { "enabled": false, "start": "12:00", "end": "12:30" },
    "default_buffer_before": 0,
    "default_buffer_after": 15,
    "slot_interval_minutes": 30,
    "duration_presets": {
      "consultation": 60,
      "premium": 90,
      "fitting": 45
    },
    "reminders": {
      "enabled": true,
      "offsets": ["7d", "3d", "1d", "2h"]
    },
    "default_consultant_id": null
  }'::jsonb,
  now()
)
ON CONFLICT (key) DO NOTHING;
COMMENT ON TABLE consultants IS 'Smart appointments consultants (Phase D)';
COMMENT ON TABLE waiting_list IS 'Appointment waiting list when slots unavailable';
COMMENT ON TABLE special_days IS 'Blocked / holiday days for appointment availability';


-- #############################################################################
-- Migration 025 ? Drop obsolete dresses_category_check
-- Source: supabase/migrations/025_drop_dresses_category_check.sql
--         supabase/APPLY_DROP_CATEGORY_CHECK.sql
-- Must run late so no earlier legacy block can leave a hardcoded CHECK in place.
-- #############################################################################

DO $$
DECLARE
  r RECORD;
  t TEXT;
  tables TEXT[] := ARRAY['dresses', 'veils', 'bridal_robes'];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
      t,
      t || '_category_check'
    );

    FOR r IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class rel ON rel.oid = c.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = t
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%category%'
    LOOP
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', t, r.conname);
    END LOOP;
  END LOOP;
END $$;


-- #############################################################################
-- Migration 026 ? Drop obsolete bookings_service_type_check
-- Source: supabase/migrations/026_drop_bookings_service_type_check.sql
--         supabase/APPLY_DROP_BOOKINGS_SERVICE_TYPE_CHECK.sql
-- Must run last so no earlier legacy block can leave a hardcoded CHECK in place.
-- #############################################################################

DO $$
DECLARE
  r RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bookings'
  ) THEN
    NULL;
  ELSE
    ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;

    FOR r IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class rel ON rel.oid = c.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = 'bookings'
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%service_type%'
    LOOP
      EXECUTE format('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;
  END IF;
END $$;


-- #############################################################################
-- Migration 027 ? Product category_id FK + category product_kind / SEO
-- Source: supabase/migrations/027_product_category_id.sql
--         supabase/APPLY_PRODUCT_CATEGORY_ID.sql
-- #############################################################################

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS product_kind TEXT;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS seo_title_ar TEXT;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS seo_description_ar TEXT;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS seo_og_image_url TEXT;

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_product_kind_check;
ALTER TABLE categories
  ADD CONSTRAINT categories_product_kind_check
  CHECK (
    product_kind IS NULL
    OR product_kind IN (
      'dress',
      'veil',
      'bridal_robe',
      'accessories_group'
    )
  );

UPDATE categories
SET product_kind = CASE legacy_key
  WHEN 'wedding' THEN 'dress'
  WHEN 'rental' THEN 'dress'
  WHEN 'custom_design' THEN 'dress'
  WHEN 'nouf_dresses' THEN 'dress'
  WHEN 'veils' THEN 'veil'
  WHEN 'bridal_robes' THEN 'bridal_robe'
  WHEN 'bridal_accessories' THEN 'accessories_group'
  ELSE product_kind
END
WHERE legacy_key IS NOT NULL
  AND (product_kind IS NULL OR product_kind = '');

UPDATE categories
SET product_kind = 'dress'
WHERE product_kind IS NULL
  AND (legacy_key IS NULL OR legacy_key = '')
  AND parent_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_categories_product_kind
  ON categories(product_kind)
  WHERE product_kind IS NOT NULL;

ALTER TABLE dresses
  ADD COLUMN IF NOT EXISTS category_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dresses_category_id_fkey'
  ) THEN
    ALTER TABLE dresses
      ADD CONSTRAINT dresses_category_id_fkey
      FOREIGN KEY (category_id)
      REFERENCES categories(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dresses_category_id ON dresses(category_id);

UPDATE dresses d
SET category_id = c.id
FROM categories c
WHERE d.category_id IS NULL
  AND d.category IS NOT NULL
  AND (
    c.legacy_key = d.category
    OR c.slug = d.category
    OR (d.category = 'wedding_dress' AND c.legacy_key = 'wedding')
    OR (d.category = 'nouf_dress' AND c.legacy_key = 'nouf_dresses')
    OR c.slug = REPLACE(d.category, '_', '-')
  );

UPDATE dresses d
SET category = COALESCE(c.legacy_key, c.slug)
FROM categories c
WHERE d.category_id = c.id
  AND (d.category IS NULL OR btrim(d.category) = '');

-- #############################################################################
-- 31 ? Phase E customer auth: APPLY_CUSTOMER_AUTH.sql (= 028)
-- Creates: customers, customer_addresses, otp_requests, customer_sessions,
--          customer_devices, login_history, wishlist_items, customer_reviews,
--          customer_messages, saved_designs, loyalty_coupons, loyalty_transactions
-- MUST run before section 32 (guest). Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- #############################################################################
-- Phase E: Premium customer account & OTP authentication (idempotent)
-- MUST precede section 32 (guest flag / 029) ? both inlined in this file.
-- Same as migrations/028_customer_auth.sql

-- =============================================================================
-- customers ? linked to auth.users when signed in; guest identity via phone/email
-- =============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_key TEXT UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  birthday DATE,
  wedding_date DATE,
  preferred_language TEXT NOT NULL DEFAULT 'ar',
  default_address_id UUID,
  -- Loyalty stubs (future-ready; no product logic)
  reward_points INTEGER NOT NULL DEFAULT 0,
  vip_tier TEXT NOT NULL DEFAULT 'standard',
  store_credit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by UUID,
  -- Meta
  last_login_at TIMESTAMPTZ,
  login_count INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (lower(email));
CREATE INDEX IF NOT EXISTS idx_customers_auth_user ON customers (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_customers_customer_key ON customers (customer_key);
CREATE INDEX IF NOT EXISTS idx_customers_is_deleted ON customers (is_deleted);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_referred_by_fkey'
  ) THEN
    ALTER TABLE customers
      ADD CONSTRAINT customers_referred_by_fkey
      FOREIGN KEY (referred_by) REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- customer_addresses
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '??????',
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  city TEXT,
  region TEXT,
  street TEXT,
  building TEXT,
  apartment TEXT,
  postal_code TEXT,
  notes TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer
  ON customer_addresses (customer_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_default_address_id_fkey'
  ) THEN
    ALTER TABLE customers
      ADD CONSTRAINT customers_default_address_id_fkey
      FOREIGN KEY (default_address_id) REFERENCES customer_addresses(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- otp_requests ? phone/email OTP with rate limits & expiry
-- =============================================================================
CREATE TABLE IF NOT EXISTS otp_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL DEFAULT 'phone',
  destination TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_requests_destination_created
  ON otp_requests (destination, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_requests_expires
  ON otp_requests (expires_at);

-- =============================================================================
-- customer_sessions / customer_devices ? remember device + logout-all
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id UUID,
  session_token_hash TEXT,
  ip_address TEXT,
  user_agent TEXT,
  remember_device BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer
  ON customer_sessions (customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS customer_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  device_label TEXT,
  fingerprint_hash TEXT,
  platform TEXT,
  trusted BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_devices_customer
  ON customer_devices (customer_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customer_sessions_device_id_fkey'
  ) THEN
    ALTER TABLE customer_sessions
      ADD CONSTRAINT customer_sessions_device_id_fkey
      FOREIGN KEY (device_id) REFERENCES customer_devices(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- login_history
-- =============================================================================
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  method TEXT NOT NULL DEFAULT 'otp',
  success BOOLEAN NOT NULL DEFAULT true,
  ip_address TEXT,
  user_agent TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_history_customer
  ON login_history (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_auth_user
  ON login_history (auth_user_id, created_at DESC);

-- =============================================================================
-- wishlist_items
-- =============================================================================
CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_kind TEXT NOT NULL DEFAULT 'dress',
  product_id UUID NOT NULL,
  product_slug TEXT,
  product_title TEXT,
  product_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, product_kind, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_customer
  ON wishlist_items (customer_id, created_at DESC);

-- =============================================================================
-- customer_reviews (CRUD-ready; photos via URLs array)
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id UUID,
  product_kind TEXT,
  product_id UUID,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_reviews_customer
  ON customer_reviews (customer_id, created_at DESC);

-- =============================================================================
-- customer_messages ? basic boutique thread (attachments future-ready)
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sender TEXT NOT NULL DEFAULT 'customer', -- customer | boutique
  body TEXT NOT NULL DEFAULT '',
  attachment_urls TEXT[] NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_messages_customer
  ON customer_messages (customer_id, created_at ASC);

-- =============================================================================
-- saved_designs stub (custom design feature may be empty)
-- =============================================================================
CREATE TABLE IF NOT EXISTS saved_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '????? ?????',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_designs_customer
  ON saved_designs (customer_id, updated_at DESC);

-- =============================================================================
-- Loyalty stubs (schema only)
-- =============================================================================
CREATE TABLE IF NOT EXISTS loyalty_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  min_order NUMERIC(12, 2),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'points', -- points | credit | coupon | referral
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  note TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer
  ON loyalty_transactions (customer_id, created_at DESC);

-- Optional link from guest orders ? authenticated customer
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'shop_orders'
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

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS customer_id UUID;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'bookings_customer_id_fkey'
    ) THEN
      ALTER TABLE bookings
        ADD CONSTRAINT bookings_customer_id_fkey
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
    END IF;
    CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings (customer_id);
  END IF;
END $$;

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Helper: admin via profiles.role
-- Customers manage own rows via auth.uid() = customers.auth_user_id

DROP POLICY IF EXISTS "Admin all customers" ON customers;
CREATE POLICY "Admin all customers" ON customers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'manager', 'staff'))
  );

DROP POLICY IF EXISTS "Customer read own" ON customers;
CREATE POLICY "Customer read own" ON customers
  FOR SELECT USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Customer update own" ON customers;
CREATE POLICY "Customer update own" ON customers
  FOR UPDATE USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Admin all customer_addresses" ON customer_addresses;
CREATE POLICY "Admin all customer_addresses" ON customer_addresses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'manager', 'staff'))
  );

DROP POLICY IF EXISTS "Customer own addresses" ON customer_addresses;
CREATE POLICY "Customer own addresses" ON customer_addresses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_addresses.customer_id AND c.auth_user_id = auth.uid()
    )
  );

-- OTP: service-role only (no public policies) ? admin can read for support
DROP POLICY IF EXISTS "Admin read otp_requests" ON otp_requests;
CREATE POLICY "Admin read otp_requests" ON otp_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

DROP POLICY IF EXISTS "Admin all customer_sessions" ON customer_sessions;
CREATE POLICY "Admin all customer_sessions" ON customer_sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'manager', 'staff'))
  );

DROP POLICY IF EXISTS "Customer own sessions" ON customer_sessions;
CREATE POLICY "Customer own sessions" ON customer_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_sessions.customer_id AND c.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin all customer_devices" ON customer_devices;
CREATE POLICY "Admin all customer_devices" ON customer_devices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'manager', 'staff'))
  );

DROP POLICY IF EXISTS "Customer own devices" ON customer_devices;
CREATE POLICY "Customer own devices" ON customer_devices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_devices.customer_id AND c.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin all login_history" ON login_history;
CREATE POLICY "Admin all login_history" ON login_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'manager', 'staff'))
  );

DROP POLICY IF EXISTS "Customer own login_history" ON login_history;
CREATE POLICY "Customer own login_history" ON login_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = login_history.customer_id AND c.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin all wishlist" ON wishlist_items;
CREATE POLICY "Admin all wishlist" ON wishlist_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'manager', 'staff'))
  );

DROP POLICY IF EXISTS "Customer own wishlist" ON wishlist_items;
CREATE POLICY "Customer own wishlist" ON wishlist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = wishlist_items.customer_id AND c.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin all customer_reviews" ON customer_reviews;
CREATE POLICY "Admin all customer_reviews" ON customer_reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'manager', 'staff'))
  );

DROP POLICY IF EXISTS "Customer own reviews" ON customer_reviews;
CREATE POLICY "Customer own reviews" ON customer_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_reviews.customer_id AND c.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin all customer_messages" ON customer_messages;
CREATE POLICY "Admin all customer_messages" ON customer_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'manager', 'staff'))
  );

DROP POLICY IF EXISTS "Customer own messages" ON customer_messages;
CREATE POLICY "Customer own messages" ON customer_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_messages.customer_id AND c.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin all saved_designs" ON saved_designs;
CREATE POLICY "Admin all saved_designs" ON saved_designs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'manager', 'staff'))
  );

DROP POLICY IF EXISTS "Customer own designs" ON saved_designs;
CREATE POLICY "Customer own designs" ON saved_designs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = saved_designs.customer_id AND c.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin all loyalty_coupons" ON loyalty_coupons;
CREATE POLICY "Admin all loyalty_coupons" ON loyalty_coupons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'manager'))
  );

DROP POLICY IF EXISTS "Admin all loyalty_transactions" ON loyalty_transactions;
CREATE POLICY "Admin all loyalty_transactions" ON loyalty_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'manager', 'staff'))
  );

DROP POLICY IF EXISTS "Customer own loyalty_transactions" ON loyalty_transactions;
CREATE POLICY "Customer own loyalty_transactions" ON loyalty_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = loyalty_transactions.customer_id AND c.auth_user_id = auth.uid()
    )
  );

-- Seed customer_auth settings defaults (merge-safe)
INSERT INTO settings (key, value, updated_at)
VALUES (
  'customer_auth',
  jsonb_build_object(
    'otp_enabled', true,
    'google_enabled', true,
    'apple_enabled', true,
    'email_password_enabled', true,
    'facebook_enabled', false,
    'guest_checkout_enabled', true,
    'otp_expiration_seconds', 300,
    'otp_max_attempts', 5,
    'otp_resend_seconds', 60,
    'remember_device_days', 30
  ),
  now()
)
ON CONFLICT (key) DO NOTHING;


-- #############################################################################
-- 32 ? Phase E2 guest flag: APPLY_CUSTOMER_GUEST.sql (= 029)
-- ALTERs customers.is_guest; FKs shop_orders.customer_id ? customers(id)
-- Requires section 31 / customers table (inlined above). No separate APPLY_* needed.
-- #############################################################################
-- Phase E2: guest flag (idempotent) ? same as migrations/029_customer_guest_flag.sql
-- Runs AFTER section 31 (028) in this file. Requires public.customers.

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




-- #############################################################################
-- 33 - Phase E3 WhatsApp OTP: APPLY_WHATSAPP_AUTH.sql (= 030)
-- Adds customers.provider + merge_meta; ensures last_login_at.
-- Requires section 31 / customers. Idempotent.
-- #############################################################################

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


-- #############################################################################
-- 34 ׳’ג‚¬ג€ Phase G guest customers: APPLY_GUEST_CUSTOMERS.sql (= 031)
-- guest_customers, guest_carts, recently_viewed, wishlist guest_id,
-- guest_id on orders/bookings/designs. Idempotent. Requires customers (31).
-- #############################################################################

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

DO $
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

DO $
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

-- #############################################################################
-- 35 ׳’ג‚¬ג€ Phase G2 guest storefront RLS: APPLY_GUEST_STOREFRONT_RLS.sql (= 032)
-- Anon-key path for guest cart/session durability (no SERVICE_ROLE required).
-- Idempotent. Requires section 34 / guest_customers.
-- #############################################################################

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

DROP POLICY IF EXISTS "Storefront update guest_customers" ON guest_customers;
CREATE POLICY "Storefront update guest_customers" ON guest_customers
  FOR UPDATE
  USING (converted_to_customer_id IS NULL)
  WITH CHECK (converted_to_customer_id IS NULL);

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

-- =============================================================================
-- 36 ? Sprint N1: category navigation settings (= 033 / APPLY_CATEGORY_NAVIGATION)
-- Published = is_visible. Adds nav / homepage / featured flags.
-- =============================================================================

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS visible_in_navigation BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS show_on_homepage BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS featured_collection BOOLEAN NOT NULL DEFAULT false;

UPDATE categories
SET
  visible_in_navigation = true,
  show_on_homepage = true
WHERE is_visible = true
  AND (
    visible_in_navigation IS DISTINCT FROM true
    OR show_on_homepage IS DISTINCT FROM true
  );

CREATE INDEX IF NOT EXISTS idx_categories_visible_in_navigation
  ON categories (visible_in_navigation)
  WHERE visible_in_navigation = true;

CREATE INDEX IF NOT EXISTS idx_categories_show_on_homepage
  ON categories (show_on_homepage)
  WHERE show_on_homepage = true;

CREATE INDEX IF NOT EXISTS idx_categories_featured_collection
  ON categories (featured_collection)
  WHERE featured_collection = true;

-- =============================================================================
-- 37 ׳’ג‚¬ג€ Sprint S1: store settings seed (= 034 / APPLY_STORE_SETTINGS)
-- settings.key = 'store' JSONB bag. Payment providers live inside JSON
-- (not a separate table). Secrets never stored ׳’ג‚¬ג€ env refs + configured flags.
-- ON CONFLICT DO NOTHING so re-runs never overwrite admin edits.
-- =============================================================================

INSERT INTO settings (key, value, updated_at)
VALUES (
  'store',
  jsonb_build_object(
    'general', jsonb_build_object(
      'store_name', 'Nadeen Designs',
      'description', 'Luxury bridal boutique',
      'description_ar', '׳´ֲ¨ן¢ֻ†׳´ֳ—ן¢ֲן¢ֶ’ ן¢ֲ׳´ֲ§׳´ֲ®׳´ֲ± ן¢ג€ן¢ֲ׳´ֲ³׳´ֲ§׳´ֳ—ן¢ֲן¢ג€  ׳´ֲ§ן¢ג€׳´ֲ²ן¢ֲ׳´ֲ§ן¢ֲ ן¢ֻ†׳´ֲ§ן¢ג€׳´ֲ¥ן¢ֶ’׳´ֲ³׳´ֲ³ן¢ֻ†׳´ֲ§׳´ֲ±׳´ֲ§׳´ֳ—',
      'logo_url', '',
      'favicon_url', '',
      'business_email', 'hello@nadeendesigns.com',
      'business_phone', '+966500000000',
      'business_address', 'Riyadh, Saudi Arabia',
      'business_address_ar', '׳´ֲ§ן¢ג€׳´ֲ±ן¢ֲ׳´ֲ§׳´ֲ¶׳´ֲ ׳´ֲ§ן¢ג€ן¢ג€¦ן¢ג€¦ן¢ג€ן¢ֶ’׳´ֲ© ׳´ֲ§ן¢ג€׳´ֲ¹׳´ֲ±׳´ֲ¨ן¢ֲ׳´ֲ© ׳´ֲ§ן¢ג€׳´ֲ³׳´ֲ¹ן¢ֻ†׳´ֲ¯ן¢ֲ׳´ֲ©',
      'working_hours', 'Sat׳’ג‚¬ג€Thu 10:00׳’ג‚¬ג€21:00',
      'working_hours_ar', '׳´ֲ§ן¢ג€׳´ֲ³׳´ֲ¨׳´ֳ— - ׳´ֲ§ן¢ג€׳´ֲ®ן¢ג€¦ן¢ֲ׳´ֲ³: 10:00 ׳´ֲµ - 9:00 ן¢ג€¦',
      'currency', 'ILS',
      'language', 'ar',
      'timezone', 'Asia/Jerusalem'
    ),
    'payments', jsonb_build_object(
      'providers', jsonb_build_array(
        jsonb_build_object(
          'id', 'cod',
          'name', 'Cash on Delivery',
          'name_ar', '׳´ֲ§ן¢ג€׳´ֲ¯ן¢ֲ׳´ֲ¹ ׳´ֲ¹ן¢ג€ ׳´ֲ¯ ׳´ֲ§ן¢ג€׳´ֲ§׳´ֲ³׳´ֳ—ן¢ג€׳´ֲ§ן¢ג€¦',
          'enabled', true,
          'coming_soon', false,
          'sort_order', 0,
          'icon', 'banknote',
          'description', 'Pay when you receive your order',
          'description_ar', '׳´ֲ§׳´ֲ¯ן¢ֲ׳´ֲ¹ן¢ֲ ׳´ֲ¹ן¢ג€ ׳´ֲ¯ ׳´ֲ§׳´ֲ³׳´ֳ—ן¢ג€׳´ֲ§ן¢ג€¦ ׳´ֲ·ן¢ג€׳´ֲ¨ן¢ֶ’ן¢ֲ ן¢ג€¦ן¢ג€  ׳´ֲ§ן¢ג€׳´ֲ¨ן¢ֻ†׳´ֳ—ן¢ֲן¢ֶ’ ׳´ֲ£ן¢ֻ† ן¢ג€¦׳´ֲ¹ ׳´ֲ§ן¢ג€ן¢ג€¦ן¢ג€ ׳´ֲ¯ן¢ֻ†׳´ֲ¨',
          'configuration', '{}'::jsonb,
          'secret_env_ref', null,
          'configured', true
        ),
        jsonb_build_object(
          'id', 'stripe',
          'name', 'Stripe',
          'name_ar', '׳´ֲ³׳´ֳ—׳´ֲ±׳´ֲ§ן¢ֲ׳´ֲ¨',
          'enabled', false,
          'coming_soon', true,
          'sort_order', 1,
          'icon', 'credit-card',
          'description', 'Cards via Stripe',
          'description_ar', '׳´ֲ¨׳´ֲ·׳´ֲ§ן¢ג€׳´ֲ§׳´ֳ— ׳´ֲ¹׳´ֲ¨׳´ֲ± ׳´ֲ³׳´ֳ—׳´ֲ±׳´ֲ§ן¢ֲ׳´ֲ¨ ׳’ג‚¬ג€ ן¢ג€׳´ֲ±ן¢ֲ׳´ֲ¨׳´ֲ§ן¢ג€¹',
          'configuration', '{}'::jsonb,
          'secret_env_ref', 'STRIPE_SECRET_KEY',
          'configured', false
        ),
        jsonb_build_object(
          'id', 'paypal',
          'name', 'PayPal',
          'name_ar', '׳´ֲ¨׳´ֲ§ן¢ֲ ׳´ֲ¨׳´ֲ§ן¢ג€',
          'enabled', false,
          'coming_soon', true,
          'sort_order', 2,
          'icon', 'wallet',
          'description', 'PayPal checkout',
          'description_ar', '׳´ֲ¨׳´ֲ§ן¢ֲ ׳´ֲ¨׳´ֲ§ן¢ג€ ׳’ג‚¬ג€ ן¢ג€׳´ֲ±ן¢ֲ׳´ֲ¨׳´ֲ§ן¢ג€¹',
          'configuration', '{}'::jsonb,
          'secret_env_ref', 'PAYPAL_CLIENT_SECRET',
          'configured', false
        ),
        jsonb_build_object(
          'id', 'tranzila',
          'name', 'Tranzila',
          'name_ar', '׳´ֳ—׳´ֲ±׳´ֲ§ן¢ג€ ׳´ֲ²ן¢ֲן¢ג€׳´ֲ§',
          'enabled', false,
          'coming_soon', true,
          'sort_order', 3,
          'icon', 'credit-card',
          'description', 'Israeli payment gateway',
          'description_ar', '׳´ֲ¨ן¢ֻ†׳´ֲ§׳´ֲ¨׳´ֲ© ׳´ֳ—׳´ֲ±׳´ֲ§ן¢ג€ ׳´ֲ²ן¢ֲן¢ג€׳´ֲ§ ׳’ג‚¬ג€ ן¢ג€׳´ֲ±ן¢ֲ׳´ֲ¨׳´ֲ§ן¢ג€¹',
          'configuration', '{}'::jsonb,
          'secret_env_ref', 'TRANZILA_API_KEY',
          'configured', false
        )
      )
    ),
    'shipping', jsonb_build_object(
      'shipping_enabled', true,
      'shipping_flat_fee', 0,
      'shipping_free_threshold', 0,
      'boutique_pickup_enabled', true,
      'delivery_enabled', true,
      'estimated_delivery_ar', ''
    ),
    'contact', jsonb_build_object(
      'phone', '+966500000000',
      'email', 'hello@nadeendesigns.com',
      'whatsapp', '966500000000',
      'instagram_url', 'https://www.instagram.com/nadeendesign_/',
      'facebook_url', '',
      'tiktok_url', '',
      'location_ar', '׳´ֲ§ן¢ג€׳´ֲ±ן¢ֲ׳´ֲ§׳´ֲ¶׳´ֲ ׳´ֲ§ן¢ג€ן¢ג€¦ן¢ג€¦ן¢ג€ן¢ֶ’׳´ֲ© ׳´ֲ§ן¢ג€׳´ֲ¹׳´ֲ±׳´ֲ¨ן¢ֲ׳´ֲ© ׳´ֲ§ן¢ג€׳´ֲ³׳´ֲ¹ן¢ֻ†׳´ֲ¯ן¢ֲ׳´ֲ©',
      'google_maps_url', ''
    ),
    'social', jsonb_build_object(
      'instagram_url', 'https://www.instagram.com/nadeendesign_/',
      'facebook_url', '',
      'tiktok_url', '',
      'pinterest_url', '',
      'youtube_url', ''
    ),
    'homepage', jsonb_build_object(
      'hero', true,
      'featured_categories', true,
      'featured_products', true,
      'collections', true,
      'testimonials', false,
      'instagram', true,
      'newsletter', false
    ),
    'authentication', jsonb_build_object(
      'guest_checkout_enabled', true,
      'google_enabled', true,
      'apple_enabled', true,
      'email_password_enabled', true,
      'phone_otp_enabled', true,
      'registration_enabled', true
    ),
    'notifications', jsonb_build_object(
      'email_enabled', true,
      'whatsapp_enabled', true,
      'sms_enabled', false,
      'sms_coming_soon', true
    ),
    'seo', jsonb_build_object(
      'title', 'Nadeen Designs | ׳´ֲ¨ן¢ֻ†׳´ֳ—ן¢ֲן¢ֶ’ ן¢ֲ׳´ֲ³׳´ֲ§׳´ֳ—ן¢ֲן¢ג€  ׳´ֲ§ן¢ג€׳´ֲ²ן¢ֲ׳´ֲ§ן¢ֲ ׳´ֲ§ן¢ג€ן¢ֲ׳´ֲ§׳´ֲ®׳´ֲ±׳´ֲ©',
      'description', 'Nadeen Designs ׳’ג‚¬ג€ ׳´ֲ¨ן¢ֻ†׳´ֳ—ן¢ֲן¢ֶ’ ן¢ֲ׳´ֲ§׳´ֲ®׳´ֲ± ן¢ג€ן¢ֲ׳´ֲ³׳´ֲ§׳´ֳ—ן¢ֲן¢ג€  ׳´ֲ§ן¢ג€׳´ֲ²ן¢ֲ׳´ֲ§ן¢ֲ ן¢ֻ†׳´ֲ§ן¢ג€׳´ֲ¥ן¢ֲ׳´ֲ¬׳´ֲ§׳´ֲ±.',
      'keywords', 'ן¢ֲ׳´ֲ³׳´ֲ§׳´ֳ—ן¢ֲן¢ג€  ׳´ֲ²ן¢ֲ׳´ֲ§ן¢ֲ, ׳´ֲ¨ן¢ֻ†׳´ֳ—ן¢ֲן¢ֶ’ ׳´ֲ¹׳´ֲ±ן¢ֻ†׳´ֲ³, Nadeen Designs',
      'og_image_url', '',
      'robots_index', true,
      'robots_follow', true,
      'google_analytics_id', '',
      'meta_pixel_id', ''
    ),
    'security', jsonb_build_object(
      'session_timeout_minutes', 60,
      'maintenance_mode', false,
      'backup_status', 'unknown',
      'backup_last_at', null,
      'backup_note', '׳´ֲ§ן¢ג€ן¢ג€ ׳´ֲ³׳´ֲ® ׳´ֲ§ן¢ג€׳´ֲ§׳´ֲ­׳´ֳ—ן¢ֲ׳´ֲ§׳´ֲ·ן¢ֲ ן¢ֲן¢ֲ׳´ֲ¯׳´ֲ§׳´ֲ± ׳´ֲ¹׳´ֲ¨׳´ֲ± Supabase ׳’ג‚¬ג€ ׳´ֲ§ן¢ג€׳´ֲ­׳´ֲ§ן¢ג€׳´ֲ© ן¢ג€ן¢ג€׳´ֲ¹׳´ֲ±׳´ֲ¶ ן¢ֲן¢ג€׳´ֲ·'
    ),
    'integrations', '[]'::jsonb
  ),
  now()
)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 38 ׳’ג‚¬ג€ Sprint P1.1: product management core (= 035 / APPLY_PRODUCT_MANAGEMENT_CORE)
-- Additive dresses columns. Safe to re-run. Does not rewrite existing rows beyond
-- status backfill from is_available.
-- =============================================================================

ALTER TABLE dresses
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC,
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS collection_id UUID;

UPDATE dresses
SET status = CASE
  WHEN COALESCE(is_available, true) THEN 'published'
  ELSE 'hidden'
END
WHERE status IS NULL OR btrim(status) = '';

ALTER TABLE dresses
  ALTER COLUMN status SET DEFAULT 'published';

UPDATE dresses SET status = 'published' WHERE status IS NULL;

DO $$
BEGIN
  ALTER TABLE dresses
    ALTER COLUMN status SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dresses_status_check'
  ) THEN
    ALTER TABLE dresses
      ADD CONSTRAINT dresses_status_check
      CHECK (status IN ('published', 'draft', 'hidden'));
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dresses_collection_id_fkey'
  ) THEN
    ALTER TABLE dresses
      ADD CONSTRAINT dresses_collection_id_fkey
      FOREIGN KEY (collection_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dresses_slug_unique
  ON dresses (slug)
  WHERE slug IS NOT NULL AND btrim(slug) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_dresses_sku_unique
  ON dresses (sku)
  WHERE sku IS NOT NULL AND btrim(sku) <> '';

CREATE INDEX IF NOT EXISTS idx_dresses_status ON dresses (status);
CREATE INDEX IF NOT EXISTS idx_dresses_collection_id ON dresses (collection_id);
CREATE INDEX IF NOT EXISTS idx_dresses_tags ON dresses USING GIN (tags);

ALTER TABLE dresses
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();


-- =============================================================================
-- 39 - Product commerce / primary-action type (= 036 / APPLY_PRODUCT_COMMERCE_TYPE)
-- Storefront CTAs use product_type only - never category name/slug.
-- Values: ready_to_buy | bridal_accessory | rental_dress | custom_design | service
-- Veils + bridal_robes always bridal_accessory. Safe to re-run.
-- =============================================================================

ALTER TABLE dresses
  ADD COLUMN IF NOT EXISTS product_type TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dresses_product_type_check'
  ) THEN
    ALTER TABLE dresses
      ADD CONSTRAINT dresses_product_type_check
      CHECK (
        product_type IS NULL
        OR product_type IN (
          'ready_to_buy',
          'bridal_accessory',
          'rental_dress',
          'custom_design',
          'service',
          -- legacy aliases accepted until 037 rewrites rows
          'accessory',
          'rental'
        )
      );
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

ALTER TABLE dresses
  ALTER COLUMN product_type SET DEFAULT 'ready_to_buy';

-- Backfill from category_id -> categories (legacy_key / slug / product_kind)
UPDATE dresses d
SET product_type = CASE
  WHEN c.legacy_key IN ('rental')
    OR lower(replace(coalesce(c.slug, ''), '-', '_')) IN ('rental', 'rental_dresses', 'rental_dress')
    THEN 'rental_dress'
  WHEN c.legacy_key IN ('custom_design')
    OR lower(replace(coalesce(c.slug, ''), '-', '_')) IN ('custom_design', 'custom')
    THEN 'custom_design'
  WHEN c.product_kind IN ('veil', 'bridal_robe', 'accessories_group')
    OR c.legacy_key IN (
      'bridal_accessories',
      'veils',
      'veil',
      'bridal_robes',
      'bridal_robe',
      'bridal_cape'
    )
    OR lower(replace(coalesce(c.slug, ''), '-', '_')) IN (
      'bridal_accessories',
      'bridal_accessory',
      'veils',
      'veil',
      'bridal_robes',
      'bridal_robe',
      'robes',
      'robe'
    )
    THEN 'bridal_accessory'
  WHEN c.legacy_key IN ('wedding', 'nouf_dresses', 'nouf_dress')
    OR lower(replace(coalesce(c.slug, ''), '-', '_')) IN (
      'wedding',
      'wedding_dresses',
      'nouf_dresses',
      'nouf_dress'
    )
    THEN 'ready_to_buy'
  ELSE NULL
END
FROM categories c
WHERE d.category_id = c.id
  AND (d.product_type IS NULL OR btrim(d.product_type) = '');

-- Backfill from legacy dresses.category TEXT when still unset
UPDATE dresses
SET product_type = CASE
  WHEN lower(replace(btrim(category), '-', '_')) IN ('rental', 'rental_dress', 'rental_dresses')
    THEN 'rental_dress'
  WHEN lower(replace(btrim(category), '-', '_')) IN (
      'custom_design',
      'custom',
      'custom_designs'
    )
    THEN 'custom_design'
  WHEN lower(replace(btrim(category), '-', '_')) IN (
      'bridal_accessories',
      'bridal_accessory',
      'accessories',
      'accessory',
      'veils',
      'veil',
      'bridal_robes',
      'bridal_robe',
      'bridal_cape',
      'robes',
      'robe'
    )
    OR category ILIKE '%accessor%'
    OR category ILIKE '%veil%'
    OR category ILIKE '%robe%'
    OR category ILIKE '%״·״±״­״©%'
    OR category ILIKE '%״¨״±†״µ%'
    OR category ILIKE '%״§ƒ״³״³ˆ״§״±%'
    OR category ILIKE '%״¥ƒ״³״³ˆ״§״±%'
    THEN 'bridal_accessory'
  WHEN lower(replace(btrim(category), '-', '_')) IN (
      'wedding',
      'wedding_dress',
      'wedding_dresses',
      'nouf_dresses',
      'nouf_dress'
    )
    THEN 'ready_to_buy'
  WHEN price IS NULL AND rental_price IS NOT NULL
    THEN 'rental_dress'
  ELSE 'ready_to_buy'
END
WHERE product_type IS NULL OR btrim(product_type) = '';

UPDATE dresses SET product_type = 'ready_to_buy' WHERE product_type IS NULL;

DO $$
BEGIN
  ALTER TABLE dresses
    ALTER COLUMN product_type SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_dresses_product_type ON dresses (product_type);

-- ---------------------------------------------------------------------------
-- veils.product_type -- always bridal_accessory
-- ---------------------------------------------------------------------------
ALTER TABLE veils
  ADD COLUMN IF NOT EXISTS product_type TEXT;

UPDATE veils
SET product_type = 'bridal_accessory'
WHERE product_type IS NULL
   OR btrim(product_type) = ''
   OR product_type NOT IN ('bridal_accessory', 'accessory');

ALTER TABLE veils
  ALTER COLUMN product_type SET DEFAULT 'bridal_accessory';

DO $$
BEGIN
  ALTER TABLE veils
    ALTER COLUMN product_type SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'veils_product_type_check'
  ) THEN
    ALTER TABLE veils
      ADD CONSTRAINT veils_product_type_check
      CHECK (product_type IN ('bridal_accessory', 'accessory'));
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- bridal_robes.product_type -- always bridal_accessory
-- ---------------------------------------------------------------------------
ALTER TABLE bridal_robes
  ADD COLUMN IF NOT EXISTS product_type TEXT;

UPDATE bridal_robes
SET product_type = 'bridal_accessory'
WHERE product_type IS NULL
   OR btrim(product_type) = ''
   OR product_type NOT IN ('bridal_accessory', 'accessory');

ALTER TABLE bridal_robes
  ALTER COLUMN product_type SET DEFAULT 'bridal_accessory';

DO $$
BEGIN
  ALTER TABLE bridal_robes
    ALTER COLUMN product_type SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bridal_robes_product_type_check'
  ) THEN
    ALTER TABLE bridal_robes
      ADD CONSTRAINT bridal_robes_product_type_check
      CHECK (product_type IN ('bridal_accessory', 'accessory'));
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;


-- =============================================================================
-- 40 - Product experience foundation (= 037 / APPLY_PRODUCT_EXPERIENCE_FOUNDATION)
-- CRITICAL ORDER: DROP CHECK ג†’ normalize data ג†’ ADD CHECK ג†’ validate
-- Never UPDATE to bridal_accessory while old CHECK still rejects it.
-- =============================================================================

ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_product_type_check;
ALTER TABLE veils DROP CONSTRAINT IF EXISTS veils_product_type_check;
ALTER TABLE bridal_robes DROP CONSTRAINT IF EXISTS bridal_robes_product_type_check;

UPDATE dresses SET product_type = 'bridal_accessory' WHERE product_type = 'accessory';
UPDATE dresses SET product_type = 'rental_dress' WHERE product_type = 'rental';
UPDATE dresses SET product_type = 'custom_design' WHERE product_type = 'custom';
UPDATE dresses SET product_type = 'ready_to_buy'
WHERE product_type IS NULL OR btrim(product_type) = '';

UPDATE veils SET product_type = 'bridal_accessory';
UPDATE bridal_robes SET product_type = 'bridal_accessory';

ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_product_type_check;
ALTER TABLE dresses
  ADD CONSTRAINT dresses_product_type_check
  CHECK (
    product_type IN (
      'ready_to_buy',
      'bridal_accessory',
      'rental_dress',
      'custom_design',
      'service'
    )
  );

ALTER TABLE veils DROP CONSTRAINT IF EXISTS veils_product_type_check;
ALTER TABLE veils
  ADD CONSTRAINT veils_product_type_check
  CHECK (product_type = 'bridal_accessory');

ALTER TABLE bridal_robes DROP CONSTRAINT IF EXISTS bridal_robes_product_type_check;
ALTER TABLE bridal_robes
  ADD CONSTRAINT bridal_robes_product_type_check
  CHECK (product_type = 'bridal_accessory');

ALTER TABLE veils
  ALTER COLUMN product_type SET DEFAULT 'bridal_accessory';

ALTER TABLE bridal_robes
  ALTER COLUMN product_type SET DEFAULT 'bridal_accessory';

DO $$
DECLARE
  bad_dresses INT;
  bad_veils INT;
  bad_robes INT;
BEGIN
  SELECT COUNT(*) INTO bad_dresses
  FROM dresses
  WHERE product_type IS NULL
     OR product_type NOT IN (
       'ready_to_buy',
       'bridal_accessory',
       'rental_dress',
       'custom_design',
       'service'
     );

  SELECT COUNT(*) INTO bad_veils
  FROM veils
  WHERE product_type IS DISTINCT FROM 'bridal_accessory';

  SELECT COUNT(*) INTO bad_robes
  FROM bridal_robes
  WHERE product_type IS DISTINCT FROM 'bridal_accessory';

  IF bad_dresses > 0 OR bad_veils > 0 OR bad_robes > 0 THEN
    RAISE EXCEPTION
      '037 product_type validation failed: dresses=% veils=% bridal_robes=%',
      bad_dresses, bad_veils, bad_robes;
  END IF;
END $$;

ALTER TABLE dresses
  ADD COLUMN IF NOT EXISTS order_options_config JSONB;

ALTER TABLE dresses
  ADD COLUMN IF NOT EXISTS extra_services_config JSONB;

ALTER TABLE veils
  ADD COLUMN IF NOT EXISTS order_options_config JSONB;

ALTER TABLE veils
  ADD COLUMN IF NOT EXISTS extra_services_config JSONB;

ALTER TABLE bridal_robes
  ADD COLUMN IF NOT EXISTS order_options_config JSONB;

ALTER TABLE bridal_robes
  ADD COLUMN IF NOT EXISTS extra_services_config JSONB;

INSERT INTO settings (key, value, updated_at)
VALUES (
  'store',
  '{}'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;



-- =============================================================================
-- 41 - Product experience engine (= 038 / APPLY_PRODUCT_EXPERIENCE_ENGINE)
-- Global services library + experience templates + experience_config JSONB
-- =============================================================================

-- 038_product_experience_engine.sql
-- Sprint 2A MASTER: Global Services Library + Experience Templates + per-product experience_config.
-- Safe to re-run. Extends 037 ג€” does not remove existing columns or flows.

-- ---------------------------------------------------------------------------
-- 1) Global services library (IDs are stable text keys ג€” no hardcoded names)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  name_ar TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  pricing_mode TEXT NOT NULL DEFAULT 'FREE'
    CHECK (pricing_mode IN ('FREE', 'FIXED_PRICE')),
  price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  default_selected BOOLEAN NOT NULL DEFAULT FALSE,
  available_online BOOLEAN NOT NULL DEFAULT TRUE,
  available_in_store BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  -- Visibility scopes use IDs only: product_types[], category_ids[], collection_ids[], product_ids[]
  visibility JSONB NOT NULL DEFAULT '{"scope":"all"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS store_services_sort_idx
  ON store_services (sort_order, id);

CREATE INDEX IF NOT EXISTS store_services_enabled_idx
  ON store_services (enabled)
  WHERE enabled = TRUE;

ALTER TABLE store_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_services_admin_all" ON store_services;
CREATE POLICY "store_services_admin_all" ON store_services
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "store_services_public_read_enabled" ON store_services;
CREATE POLICY "store_services_public_read_enabled" ON store_services
  FOR SELECT
  USING (enabled = TRUE AND visible = TRUE AND available_online = TRUE);

-- Seed defaults when empty (idempotent)
INSERT INTO store_services (
  id, name, name_ar, description, description_ar,
  pricing_mode, price, enabled, visible, required, default_selected,
  available_online, available_in_store, sort_order, visibility
)
VALUES
  ('gift_wrap', 'Gift Wrap', '״×״÷„ ‡״¯״©', '', '', 'FREE', 0, FALSE, TRUE, FALSE, FALSE, TRUE, FALSE, 0, '{"scope":"all"}'::jsonb),
  ('greeting_card', 'Greeting Card', '״¨״·״§‚״© ״×‡†״¦״©', '', '', 'FREE', 0, FALSE, TRUE, FALSE, FALSE, TRUE, FALSE, 1, '{"scope":"all"}'::jsonb),
  ('luxury_box', 'Luxury Box', '״¹„״¨״© ״§״®״±״©', '', '', 'FREE', 0, FALSE, TRUE, FALSE, FALSE, TRUE, FALSE, 2, '{"scope":"all"}'::jsonb),
  ('express_delivery', 'Express Delivery', '״×ˆ״µ„ ״³״±״¹', '', '', 'FREE', 0, FALSE, TRUE, FALSE, FALSE, TRUE, FALSE, 3, '{"scope":"all"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Experience templates (DB-backed, reusable)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_experience_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  name_ar TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  -- Full ProductExperienceConfig JSON (sections order/settings)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_experience_templates_sort_idx
  ON product_experience_templates (sort_order, name_ar);

ALTER TABLE product_experience_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "experience_templates_admin_all" ON product_experience_templates;
CREATE POLICY "experience_templates_admin_all" ON product_experience_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "experience_templates_public_read" ON product_experience_templates;
CREATE POLICY "experience_templates_public_read" ON product_experience_templates
  FOR SELECT
  USING (TRUE);

-- Seed system templates when missing (idempotent by slug)
INSERT INTO product_experience_templates (
  slug, name, name_ar, description_ar, is_system, sort_order, config
)
VALUES
  (
    'gift',
    'Gift',
    '‡״¯״©',
    '״×״¬״±״¨״© ״´״±״§״¡ …†״§״³״¨״© „„‡״¯״§״§ ג€” ״®״¯…״§״× + ״®״§״±״§״× ״·„״¨ + …„״®״µ',
    TRUE,
    0,
    '{
      "sections": [
        {"id":"extra_services","enabled":true,"collapsed":false,"sort_order":0,"title_ar":"״®״¯…״§״× ״¥״¶״§״©","title":"Extra Services"},
        {"id":"gift_options","enabled":true,"collapsed":false,"sort_order":1,"title_ar":"״×״÷„ ‡״¯״©","title":"Gift Options"},
        {"id":"order_options","enabled":true,"collapsed":false,"sort_order":2,"title_ar":"״®״§״±״§״× ״§„״·„״¨","title":"Order Options"},
        {"id":"delivery","enabled":true,"collapsed":true,"sort_order":3,"title_ar":"״§„״×ˆ״µ„","title":"Delivery"},
        {"id":"order_notes","enabled":true,"collapsed":true,"sort_order":4,"title_ar":"…„״§״­״¸״§״×","title":"Order Notes"},
        {"id":"personalization","enabled":false,"collapsed":true,"sort_order":5,"title_ar":"״×״®״µ״µ ״§„ƒ״×״§״¨״©","title":"Personalization"},
        {"id":"summary","enabled":true,"collapsed":false,"sort_order":6,"title_ar":"…„״®״µ ״§„״³״¹״±","title":"Summary"}
      ]
    }'::jsonb
  ),
  (
    'accessory',
    'Accessory',
    '״¥ƒ״³״³ˆ״§״±',
    '״×״¬״±״¨״© ״¥ƒ״³״³ˆ״§״±״§״× ״§„״¹״±ˆ״³ ג€” ״×״®״µ״µ + ״®״¯…״§״× + …„״®״µ',
    TRUE,
    1,
    '{
      "sections": [
        {"id":"personalization","enabled":true,"collapsed":false,"sort_order":0,"title_ar":"״×״®״µ״µ ״§„ƒ״×״§״¨״©","title":"Personalization"},
        {"id":"gift_options","enabled":true,"collapsed":true,"sort_order":1,"title_ar":"״×״÷„ ‡״¯״©","title":"Gift Options"},
        {"id":"extra_services","enabled":true,"collapsed":false,"sort_order":2,"title_ar":"״®״¯…״§״× ״¥״¶״§״©","title":"Extra Services"},
        {"id":"order_options","enabled":true,"collapsed":true,"sort_order":3,"title_ar":"״®״§״±״§״× ״§„״·„״¨","title":"Order Options"},
        {"id":"delivery","enabled":false,"collapsed":true,"sort_order":4,"title_ar":"״§„״×ˆ״µ„","title":"Delivery"},
        {"id":"order_notes","enabled":true,"collapsed":true,"sort_order":5,"title_ar":"…„״§״­״¸״§״×","title":"Order Notes"},
        {"id":"summary","enabled":true,"collapsed":false,"sort_order":6,"title_ar":"…„״®״µ ״§„״³״¹״±","title":"Summary"}
      ]
    }'::jsonb
  ),
  (
    'ready_to_buy',
    'Ready to Buy',
    '״¬״§‡״² „„״´״±״§״¡',
    '״×״¬״±״¨״© ״¨״³״·״© „„…†״×״¬״§״× ״§„״¬״§‡״²״©',
    TRUE,
    2,
    '{
      "sections": [
        {"id":"extra_services","enabled":true,"collapsed":false,"sort_order":0,"title_ar":"״®״¯…״§״× ״¥״¶״§״©","title":"Extra Services"},
        {"id":"order_options","enabled":true,"collapsed":false,"sort_order":1,"title_ar":"״®״§״±״§״× ״§„״·„״¨","title":"Order Options"},
        {"id":"delivery","enabled":true,"collapsed":true,"sort_order":2,"title_ar":"״§„״×ˆ״µ„","title":"Delivery"},
        {"id":"order_notes","enabled":true,"collapsed":true,"sort_order":3,"title_ar":"…„״§״­״¸״§״×","title":"Order Notes"},
        {"id":"gift_options","enabled":false,"collapsed":true,"sort_order":4,"title_ar":"״×״÷„ ‡״¯״©","title":"Gift Options"},
        {"id":"personalization","enabled":false,"collapsed":true,"sort_order":5,"title_ar":"״×״®״µ״µ ״§„ƒ״×״§״¨״©","title":"Personalization"},
        {"id":"summary","enabled":true,"collapsed":false,"sort_order":6,"title_ar":"…„״®״µ ״§„״³״¹״±","title":"Summary"}
      ]
    }'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) Per-product experience designer config (JSONB)
-- ---------------------------------------------------------------------------
ALTER TABLE dresses
  ADD COLUMN IF NOT EXISTS experience_config JSONB;

ALTER TABLE veils
  ADD COLUMN IF NOT EXISTS experience_config JSONB;

ALTER TABLE bridal_robes
  ADD COLUMN IF NOT EXISTS experience_config JSONB;

-- Ensure store settings row exists (extra_services JSON remains dual-write mirror)
INSERT INTO settings (key, value, updated_at)
VALUES ('store', '{}'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';


-- =============================================================================
-- 42. Storefront experience checkout-only (= 039)
-- =============================================================================
UPDATE product_experience_templates
SET
  description_ar = 'تجربة شراء مناسبة للهدايا — خدمات + تغليف + ملخص السعر',
  config = '{
    "sections": [
      {"id":"extra_services","enabled":true,"collapsed":false,"sort_order":0,"title_ar":"خدمات إضافية","title":"Extra Services","description":"","description_ar":""},
      {"id":"gift_options","enabled":true,"collapsed":false,"sort_order":1,"title_ar":"تغليف هدية","title":"Gift Options","description":"","description_ar":""},
      {"id":"personalization","enabled":false,"collapsed":true,"sort_order":2,"title_ar":"تخصيص الكتابة","title":"Personalization","description":"","description_ar":""},
      {"id":"summary","enabled":true,"collapsed":false,"sort_order":3,"title_ar":"ملخص السعر","title":"Summary","description":"","description_ar":""},
      {"id":"order_options","enabled":false,"collapsed":true,"sort_order":4,"title_ar":"خيارات الطلب","title":"Order Options","description":"Checkout only","description_ar":"عند الدفع فقط"},
      {"id":"delivery","enabled":false,"collapsed":true,"sort_order":5,"title_ar":"التوصيل","title":"Delivery","description":"Checkout only","description_ar":"عند الدفع فقط"},
      {"id":"order_notes","enabled":false,"collapsed":true,"sort_order":6,"title_ar":"ملاحظات الطلب","title":"Order Notes","description":"Checkout only","description_ar":"عند الدفع فقط"}
    ]
  }'::jsonb,
  updated_at = NOW()
WHERE slug = 'gift' AND is_system = TRUE;

UPDATE product_experience_templates
SET
  description_ar = 'تجربة إكسسوارات العروس — تخصيص + خدمات + ملخص',
  config = '{
    "sections": [
      {"id":"personalization","enabled":true,"collapsed":false,"sort_order":0,"title_ar":"تخصيص الكتابة","title":"Personalization","description":"","description_ar":""},
      {"id":"gift_options","enabled":true,"collapsed":true,"sort_order":1,"title_ar":"تغليف هدية","title":"Gift Options","description":"","description_ar":""},
      {"id":"extra_services","enabled":true,"collapsed":false,"sort_order":2,"title_ar":"خدمات إضافية","title":"Extra Services","description":"","description_ar":""},
      {"id":"summary","enabled":true,"collapsed":false,"sort_order":3,"title_ar":"ملخص السعر","title":"Summary","description":"","description_ar":""},
      {"id":"order_options","enabled":false,"collapsed":true,"sort_order":4,"title_ar":"خيارات الطلب","title":"Order Options","description":"Checkout only","description_ar":"عند الدفع فقط"},
      {"id":"delivery","enabled":false,"collapsed":true,"sort_order":5,"title_ar":"التوصيل","title":"Delivery","description":"Checkout only","description_ar":"عند الدفع فقط"},
      {"id":"order_notes","enabled":false,"collapsed":true,"sort_order":6,"title_ar":"ملاحظات الطلب","title":"Order Notes","description":"Checkout only","description_ar":"عند الدفع فقط"}
    ]
  }'::jsonb,
  updated_at = NOW()
WHERE slug = 'accessory' AND is_system = TRUE;

UPDATE product_experience_templates
SET
  description_ar = 'تجربة بسيطة للمنتجات الجاهزة — خدمات + ملخص',
  config = '{
    "sections": [
      {"id":"extra_services","enabled":true,"collapsed":false,"sort_order":0,"title_ar":"خدمات إضافية","title":"Extra Services","description":"","description_ar":""},
      {"id":"gift_options","enabled":false,"collapsed":true,"sort_order":1,"title_ar":"تغليف هدية","title":"Gift Options","description":"","description_ar":""},
      {"id":"personalization","enabled":false,"collapsed":true,"sort_order":2,"title_ar":"تخصيص الكتابة","title":"Personalization","description":"","description_ar":""},
      {"id":"summary","enabled":true,"collapsed":false,"sort_order":3,"title_ar":"ملخص السعر","title":"Summary","description":"","description_ar":""},
      {"id":"order_options","enabled":false,"collapsed":true,"sort_order":4,"title_ar":"خيارات الطلب","title":"Order Options","description":"Checkout only","description_ar":"عند الدفع فقط"},
      {"id":"delivery","enabled":false,"collapsed":true,"sort_order":5,"title_ar":"التوصيل","title":"Delivery","description":"Checkout only","description_ar":"عند الدفع فقط"},
      {"id":"order_notes","enabled":false,"collapsed":true,"sort_order":6,"title_ar":"ملاحظات الطلب","title":"Order Notes","description":"Checkout only","description_ar":"عند الدفع فقط"}
    ]
  }'::jsonb,
  updated_at = NOW()
WHERE slug = 'ready_to_buy' AND is_system = TRUE;


-- =============================================================================
-- 43. Enterprise experience engine (= 040)
-- =============================================================================
CREATE TABLE IF NOT EXISTS experience_features (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  name_ar TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  group_key TEXT NOT NULL DEFAULT 'general'
    CHECK (group_key IN (
      'personalization',
      'commerce',
      'gift',
      'delivery',
      'booking',
      'general'
    )),
  maps_to TEXT,
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS experience_features_sort_idx
  ON experience_features (sort_order, id);

CREATE INDEX IF NOT EXISTS experience_features_group_idx
  ON experience_features (group_key);

ALTER TABLE experience_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "experience_features_admin_all" ON experience_features;
CREATE POLICY "experience_features_admin_all" ON experience_features
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "experience_features_public_read" ON experience_features;
CREATE POLICY "experience_features_public_read" ON experience_features
  FOR SELECT
  USING (enabled = TRUE);

INSERT INTO experience_features (
  id, name, name_ar, description_ar, group_key, maps_to, is_system, enabled, sort_order
)
VALUES
  ('veil_writing', 'Writing on Veil', 'كتابة على الطرحة', 'تخصيص كتابة الطرحة', 'personalization', 'personalization', TRUE, TRUE, 10),
  ('robe_writing', 'Writing on Robe', 'كتابة على البرنص', 'تخصيص كتابة البرنص', 'personalization', 'personalization', TRUE, TRUE, 20),
  ('font_selection', 'Font Selection', 'اختيار الخط', 'اختيار خط الكتابة', 'personalization', 'personalization', TRUE, TRUE, 30),
  ('color_selection', 'Color Selection', 'اختيار اللون', 'اختيار لون الكتابة', 'personalization', 'personalization', TRUE, TRUE, 40),
  ('gift_wrap', 'Gift Wrap', 'تغليف هدية', 'تغليف فاخر للهدايا', 'gift', 'gift_wrap', TRUE, TRUE, 50),
  ('gift_message', 'Gift Message', 'رسالة هدية', 'بطاقة تهنئة / رسالة', 'gift', 'greeting_card', TRUE, TRUE, 60),
  ('luxury_box', 'Luxury Box', 'علبة فاخرة', 'علبة تقديم فاخرة', 'gift', 'luxury_box', TRUE, TRUE, 70),
  ('express_delivery', 'Express Delivery', 'توصيل سريع', 'خيار توصيل سريع', 'delivery', 'express_delivery', TRUE, TRUE, 80),
  ('appointment_booking', 'Appointment Booking', 'حجز موعد', 'احجزي موعد معاينة', 'booking', 'book_appointment', TRUE, TRUE, 90),
  ('request_design', 'Request Design', 'طلب تصميم', 'اطلبي تصميم خاص', 'booking', 'request_design', TRUE, TRUE, 100),
  ('add_to_cart', 'Add to Cart', 'إضافة للسلة', 'زر أضف إلى السلة', 'commerce', 'add_to_cart', TRUE, TRUE, 110),
  ('buy_now', 'Buy Now', 'شراء الآن', 'زر شراء فوري', 'commerce', 'buy_now', TRUE, TRUE, 120),
  ('wishlist', 'Wishlist', 'المفضلة', 'إضافة للمفضلة', 'commerce', 'wishlist', TRUE, TRUE, 130)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE dresses
  ADD COLUMN IF NOT EXISTS features_config JSONB;

ALTER TABLE veils
  ADD COLUMN IF NOT EXISTS features_config JSONB;

ALTER TABLE bridal_robes
  ADD COLUMN IF NOT EXISTS features_config JSONB;

CREATE TABLE IF NOT EXISTS purchase_flows (
  id TEXT PRIMARY KEY,
  product_type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  name_ar TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  primary_cta TEXT NOT NULL DEFAULT 'add_to_cart'
    CHECK (primary_cta IN (
      'add_to_cart',
      'book_appointment',
      'request_design',
      'book_now'
    )),
  primary_label_ar TEXT NOT NULL DEFAULT '',
  secondary_ctas JSONB NOT NULL DEFAULT '[]'::jsonb,
  hide_cart BOOLEAN NOT NULL DEFAULT FALSE,
  hide_buy_now BOOLEAN NOT NULL DEFAULT FALSE,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS purchase_flows_sort_idx
  ON purchase_flows (sort_order, product_type);

ALTER TABLE purchase_flows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_flows_admin_all" ON purchase_flows;
CREATE POLICY "purchase_flows_admin_all" ON purchase_flows
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "purchase_flows_public_read" ON purchase_flows;
CREATE POLICY "purchase_flows_public_read" ON purchase_flows
  FOR SELECT
  USING (TRUE);

INSERT INTO purchase_flows (
  id, product_type, name, name_ar, description_ar,
  primary_cta, primary_label_ar, secondary_ctas,
  hide_cart, hide_buy_now, steps, is_system, sort_order
)
VALUES
  (
    'flow_rental_dress',
    'rental_dress',
    'Rental Dress',
    'فستان إيجار',
    'حجز موعد فقط — بدون سلة أو شراء فوري',
    'book_appointment',
    'احجزي موعد',
    '["wishlist"]'::jsonb,
    TRUE,
    TRUE,
    '["view","wishlist","book_appointment"]'::jsonb,
    TRUE,
    10
  ),
  (
    'flow_bridal_accessory',
    'bridal_accessory',
    'Bridal Accessory',
    'إكسسوار عروس',
    'شراء فوري + سلة + مفضلة',
    'add_to_cart',
    'أضف إلى السلة',
    '["buy_now","wishlist"]'::jsonb,
    FALSE,
    FALSE,
    '["view","configure","add_to_cart","buy_now","wishlist"]'::jsonb,
    TRUE,
    20
  ),
  (
    'flow_ready_to_buy',
    'ready_to_buy',
    'Ready to Buy',
    'جاهز للشراء',
    'Alias لسلوك الشراء مثل الإكسسوارات (سلة + شراء الآن)',
    'add_to_cart',
    'أضف إلى السلة',
    '["buy_now","wishlist"]'::jsonb,
    FALSE,
    FALSE,
    '["view","configure","add_to_cart","buy_now","wishlist"]'::jsonb,
    TRUE,
    30
  ),
  (
    'flow_custom_design',
    'custom_design',
    'Custom Design',
    'تصميم خاص',
    'طلب تصميم — بدون سلة أو شراء',
    'request_design',
    'اطلبي تصميم',
    '["wishlist"]'::jsonb,
    TRUE,
    TRUE,
    '["view","request_design","wishlist"]'::jsonb,
    TRUE,
    40
  ),
  (
    'flow_service',
    'service',
    'Service',
    'خدمة',
    'حجز خدمة (مستقبلي)',
    'book_now',
    'احجز الآن',
    '[]'::jsonb,
    TRUE,
    TRUE,
    '["view","book_now"]'::jsonb,
    TRUE,
    50
  )
ON CONFLICT (id) DO NOTHING;

UPDATE dresses d
SET product_type = 'rental_dress',
    updated_at = NOW()
FROM categories c
WHERE d.category_id = c.id
  AND d.product_type IN ('ready_to_buy', 'ready-to-buy')
  AND (
    c.legacy_key IN ('wedding', 'nouf_dresses', 'nouf_dress')
    OR lower(replace(coalesce(c.slug, ''), '-', '_')) IN (
      'wedding', 'wedding_dresses', 'wedding_dress',
      'nouf_dresses', 'nouf_dress'
    )
  );

UPDATE dresses
SET product_type = 'rental_dress',
    updated_at = NOW()
WHERE product_type IN ('ready_to_buy', 'ready-to-buy')
  AND category_id IS NULL
  AND lower(replace(btrim(coalesce(category, '')), '-', '_')) IN (
    'wedding', 'wedding_dress', 'wedding_dresses',
    'nouf_dresses', 'nouf_dress'
  );

UPDATE veils
SET features_config = jsonb_build_object(
  'use_custom', true,
  'enabled_ids', jsonb_build_array(
    'veil_writing', 'font_selection', 'color_selection',
    'gift_wrap', 'gift_message', 'luxury_box', 'express_delivery',
    'add_to_cart', 'buy_now', 'wishlist'
  )
)
WHERE features_config IS NULL;

UPDATE bridal_robes
SET features_config = jsonb_build_object(
  'use_custom', true,
  'enabled_ids', jsonb_build_array(
    'robe_writing', 'font_selection', 'color_selection',
    'gift_wrap', 'gift_message', 'luxury_box', 'express_delivery',
    'add_to_cart', 'buy_now', 'wishlist'
  )
)
WHERE features_config IS NULL;

UPDATE dresses
SET features_config = jsonb_build_object(
  'use_custom', true,
  'enabled_ids', jsonb_build_array('appointment_booking', 'wishlist')
)
WHERE features_config IS NULL
  AND product_type = 'rental_dress';

UPDATE dresses
SET features_config = jsonb_build_object(
  'use_custom', true,
  'enabled_ids', jsonb_build_array('request_design', 'wishlist')
)
WHERE features_config IS NULL
  AND product_type = 'custom_design';

UPDATE dresses
SET features_config = jsonb_build_object(
  'use_custom', true,
  'enabled_ids', jsonb_build_array(
    'gift_wrap', 'gift_message', 'luxury_box', 'express_delivery',
    'add_to_cart', 'buy_now', 'wishlist'
  )
)
WHERE features_config IS NULL
  AND product_type IN ('bridal_accessory', 'ready_to_buy');

UPDATE dresses
SET features_config = jsonb_build_object(
  'use_custom', true,
  'enabled_ids', jsonb_build_array('appointment_booking', 'wishlist')
)
WHERE features_config IS NULL;

NOTIFY pgrst, 'reload schema';


-- =============================================================================
-- END APPLY_ALL.sql
-- Reloads PostgREST schema cache when supported.
-- =============================================================================
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- 045 / APPLY_LEGAL_TAX_INVOICES (appended)
-- =============================================================================

-- Idempotent apply: legal/tax store bags + shop_orders invoice columns + sequence.
-- Safe to re-run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS invoice_sequence (
  id TEXT PRIMARY KEY DEFAULT 'shop_orders',
  prefix TEXT NOT NULL DEFAULT 'ND',
  next_number BIGINT NOT NULL DEFAULT 1 CHECK (next_number >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO invoice_sequence (id, prefix, next_number)
VALUES ('shop_orders', 'ND', 1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_type TEXT,
  ADD COLUMN IF NOT EXISTS invoice_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(6, 3),
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS invoice_subtotal NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS prices_include_vat BOOLEAN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shop_orders_invoice_type_check'
  ) THEN
    ALTER TABLE shop_orders
      ADD CONSTRAINT shop_orders_invoice_type_check
      CHECK (
        invoice_type IS NULL
        OR invoice_type IN ('receipt', 'tax_invoice', 'tax_invoice_receipt')
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS shop_orders_invoice_number_uidx
  ON shop_orders (invoice_number)
  WHERE invoice_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS shop_orders_invoice_issued_at_idx
  ON shop_orders (invoice_issued_at DESC NULLS LAST);

DO $$
DECLARE
  current_val JSONB;
BEGIN
  SELECT value INTO current_val FROM settings WHERE key = 'store';
  IF current_val IS NULL THEN
    RETURN;
  END IF;

  IF current_val->'tax' IS NULL THEN
    current_val := jsonb_set(
      current_val,
      '{tax}',
      jsonb_build_object(
        'business_id', '',
        'business_id_type', 'authorized_dealer',
        'vat_rate', 18,
        'prices_include_vat', true,
        'default_document_type', 'tax_invoice_receipt',
        'issue_trigger', 'on_order',
        'invoice_prefix', 'ND',
        'next_invoice_number', 1,
        'provider', 'none',
        'provider_coming_soon', true,
        'provider_notes',
          'Internal documents only. Israeli e-invoicing provider connection coming from Admin.'
      ),
      true
    );
  END IF;

  IF current_val->'legal' IS NULL THEN
    current_val := jsonb_set(
      current_val,
      '{legal}',
      jsonb_build_object(
        'show_template_banner', true,
        'require_checkout_acceptance', true,
        'updated_at', NULL
      ),
      true
    );
  END IF;

  UPDATE settings
  SET value = current_val, updated_at = now()
  WHERE key = 'store';
END $$;


NOTIFY pgrst, 'reload schema';

