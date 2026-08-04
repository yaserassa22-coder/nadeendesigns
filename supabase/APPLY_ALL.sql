-- =============================================================================
-- APPLY_ALL.sql — SINGLE-FILE master setup for NadEEN Designs
--
-- ONE FILE. Run once or repeatedly. No other APPLY_*.sql required.
-- Paste this entire file into Supabase → SQL Editor → Run.
-- Safe on fresh DB and existing DB (IF NOT EXISTS / DROP POLICY IF EXISTS /
-- ON CONFLICT / ADD COLUMN IF NOT EXISTS / guarded DO $$ blocks).
--
-- Standalone APPLY_*.sql files in this folder are optional single-purpose
-- recovery scripts only. This file already inlines all of them in order.
-- Do NOT \i / include other files — everything below is self-contained.
--
-- ⚠ CRITICAL — dresses_category_check (and veils/bridal_robes category CHECKs):
--   NEVER re-ADD a hardcoded CHECK (category IN (...)). Categories are dynamic
--   (categories table + app validation). Re-adding fails with:
--     check constraint "dresses_category_check" ... is violated by some row
--   when existing products use free/dynamic slugs. This file only DROPs those
--   constraints (early + end) and never recreates them.
--
-- ⚠ CRITICAL — bookings_service_type_check:
--   NEVER re-ADD a hardcoded CHECK (service_type IN (...)). The allowed list grew
--   over time (nouf_dress / nouf_dresses, etc.); early incomplete ADD fails with:
--     check constraint "bookings_service_type_check" ... is violated by some row
--   Validation is app-level (Zod). This file only DROPs the constraint (early + end).
--
-- INLINED ORDER (migrations 001–029 + APPLY_* overlays):
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
--   23. M9: APPLY_SHIPPING_REGIONS (= 020)  — creates shipping_regions
--   24. M10: APPLY_SMART_SHIPPING (= 021) — pending fees / tracking / estimates
--   25. Soft delete / archive / audit: APPLY_SOFT_DELETE_ARCHIVE (= 022)
--   26. Reports schedules: APPLY_REPORTS (= 023)
--   27. Smart appointments: APPLY_SMART_APPOINTMENTS (= 024)
--   28. Drop obsolete dresses_category_check: APPLY_DROP_CATEGORY_CHECK (= 025)
--   29. Drop obsolete bookings_service_type_check: APPLY_DROP_BOOKINGS_SERVICE_TYPE_CHECK (= 026)
--   30. Product category_id FK + product_kind/SEO: APPLY_PRODUCT_CATEGORY_ID (= 027)
--   31. Phase E customer auth: APPLY_CUSTOMER_AUTH (= 028)
--       *** customers + related tables created HERE — precedes 029 ***
--   32. Phase E2 guest flag: APPLY_CUSTOMER_GUEST (= 029)
--
-- Prerequisite: core tables (dresses, bookings, profiles, settings) must already
-- exist from the main schema / earlier project setup. This file applies
-- incremental migrations on top (and creates shop/customer tables if missing).
--
-- NOTE: dresses.category is TEXT (slug / legacy_key). Hardcoded CHECK constraints
-- are obsolete after dynamic categories (016). APPLY_ALL drops the constraint and
-- never recreates it — existing product rows are preserved.
-- NOTE: bookings.service_type is TEXT; hardcoded service_type CHECK is obsolete
-- (app Zod validation). APPLY_ALL drops it and never recreates it.
-- =============================================================================

-- #############################################################################
-- 00 — Early drop obsolete category CHECKs (idempotent; preserves all rows)
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
-- 00b — Early drop obsolete bookings_service_type_check
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
-- Migration 001 — Custom design category
-- Source: supabase/migrations/001_add_custom_design_category.sql
-- #############################################################################

-- Add custom_design and keep robes (برنص عروس)
-- Delivery/service-type updates continue in section 002 below (inlined).
-- Hardcoded dresses_category_check removed: categories are dynamic (see 016 / 025).
-- Do NOT ADD CONSTRAINT dresses_category_check here (or anywhere in this file).

ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_category_check;



-- #############################################################################
-- Migration 002 — Booking delivery & service types
-- Source: supabase/migrations/002_booking_delivery_and_service_types.sql
-- #############################################################################

-- Categories + booking delivery fields + expanded service types
-- Safe to run on existing databases

-- 1) Dress categories — drop obsolete CHECK only (do not recreate hardcoded list)
ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_category_check;

-- 2) Booking service_type — drop obsolete CHECK only (app Zod validates; see 026).
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
-- Migration 003 — Normalize dress styles (AR)
-- Source: supabase/migrations/003_normalize_dress_styles_ar.sql
-- #############################################################################

-- Normalize legacy style values to Arabic options
UPDATE dresses SET style = 'ملكي' WHERE style IN ('Classic Luxury', 'royal', 'Royal');
UPDATE dresses SET style = 'كلاسيكي' WHERE style IN ('classic', 'Classic', 'vintage', 'Vintage', 'فintage');
UPDATE dresses SET style = 'عصري' WHERE style IN ('modern', 'Modern', 'حديث');
UPDATE dresses SET style = 'فاخر' WHERE style IN ('luxury', 'Luxury');
UPDATE dresses SET style = 'ناعم' WHERE style IN ('soft', 'Soft');
UPDATE dresses SET style = 'بسيط' WHERE style IN ('simple', 'Simple');
UPDATE dresses SET style = 'أميري' WHERE style IN ('أميرة', 'princess', 'Princess');
UPDATE dresses SET style = 'حورية البحر' WHERE style IN ('mermaid', 'Mermaid', 'مermaid');
UPDATE dresses SET style = 'قصة A (قصة حرف A)' WHERE style IN ('A-Line', 'A Line', 'a-line');
UPDATE dresses SET style = 'منفوش' WHERE style IN ('ballgown', 'Ballgown');
UPDATE dresses SET style = 'مستقيم' WHERE style IN ('sheath', 'Sheath');
UPDATE dresses SET style = 'بوهيمي' WHERE style IN ('بوهو', 'boho', 'Boho', 'Bohemian');
UPDATE dresses SET style = 'دانتيل فاخر' WHERE style IN ('lace', 'Lace');
UPDATE dresses SET style = 'ساتان فاخر' WHERE style IN ('satin', 'Satin');
UPDATE dresses SET style = 'تول فاخر' WHERE style IN ('tulle', 'Tulle');
UPDATE dresses SET style = 'تصميم مخصص' WHERE style IN ('custom', 'Custom');



-- #############################################################################
-- Migration 004 — Normalize dress colors (AR)
-- Source: supabase/migrations/004_normalize_dress_colors_ar.sql
-- #############################################################################


-- Normalize legacy color values to Arabic options
UPDATE dresses SET color = 'أوف وايت' WHERE color IN ('Off White', 'off white', 'off-white', 'OffWhite');
UPDATE dresses SET color = 'أبيض' WHERE color IN ('white', 'White');
UPDATE dresses SET color = 'عاجي' WHERE color IN ('ivory', 'Ivory');
UPDATE dresses SET color = 'كريمي' WHERE color IN ('cream', 'Cream');
UPDATE dresses SET color = 'بيج' WHERE color IN ('beige', 'Beige');
UPDATE dresses SET color = 'شامبين' WHERE color IN ('champagne', 'Champagne', 'شampagne');
UPDATE dresses SET color = 'ذهبي' WHERE color IN ('gold', 'Gold', 'golden');
UPDATE dresses SET color = 'فضي' WHERE color IN ('silver', 'Silver');
UPDATE dresses SET color = 'وردي فاتح' WHERE color IN ('blush', 'Blush');
UPDATE dresses SET color = 'وردي' WHERE color IN ('pink', 'Pink');
UPDATE dresses SET color = 'موف' WHERE color IN ('mauve', 'Mauve');
UPDATE dresses SET color = 'بنفسجي' WHERE color IN ('purple', 'Purple');
UPDATE dresses SET color = 'أزرق سماوي' WHERE color IN ('sky blue', 'Sky Blue');
UPDATE dresses SET color = 'أزرق ملكي' WHERE color IN ('royal blue', 'Royal Blue');
UPDATE dresses SET color = 'كحلي' WHERE color IN ('navy', 'Navy');
UPDATE dresses SET color = 'أخضر زمردي' WHERE color IN ('emerald', 'Emerald');
UPDATE dresses SET color = 'أخضر زيتوني' WHERE color IN ('olive', 'Olive');
UPDATE dresses SET color = 'أحمر' WHERE color IN ('red', 'Red');
UPDATE dresses SET color = 'خمري' WHERE color IN ('burgundy', 'Burgundy');
UPDATE dresses SET color = 'بني' WHERE color IN ('brown', 'Brown');
UPDATE dresses SET color = 'أسود' WHERE color IN ('black', 'Black');
UPDATE dresses SET color = 'رمادي' WHERE color IN ('gray', 'grey', 'Gray', 'Grey');



-- #############################################################################
-- Migration 005 — Booking personalization
-- Source: supabase/migrations/005_booking_personalization.sql
-- #############################################################################

-- Structured personalization for veils & bridal robes (برنص عروس)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS personalization JSONB;

COMMENT ON COLUMN bookings.personalization IS
  'Optional veil/robe embroidery personalization payload';



-- #############################################################################
-- Migration 006 — Booking gift options
-- Source: supabase/migrations/006_booking_gift_options.sql
-- #############################################################################

-- Optional premium gift wrapping & gift card for veils / bridal robes
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS gift_options JSONB;

COMMENT ON COLUMN bookings.gift_options IS
  'Optional gift wrapping and gift card payload for veils/robes';



-- #############################################################################
-- Migration 007 — Veils, bridal robes, shop_orders (+ APPLY_SHOP_CHECKOUT)
-- Source: supabase/migrations/007_veils_bridal_robes_orders.sql
-- Reinforced again in section 009 (IF NOT EXISTS — safe duplicate).
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

-- Drop obsolete category CHECK (do not recreate — dynamic categories; see 016 / 025)
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
-- Migration 008 — Nouf dress category
-- Source: supabase/migrations/008_add_nouf_dress_category.sql
-- #############################################################################

-- Legacy: once added nouf_dress to dresses_category_check.
-- CHECK dropped permanently (dynamic categories); keep booking service_type widen.
ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_category_check;

-- Booking service_type CHECK obsolete (app Zod; see 026) — drop only, never re-ADD.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;



-- #############################################################################
-- Migration 009 — Ensure shop tables & RLS
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
-- Migration 010 — Nouf dresses independent category
-- Source: supabase/migrations/010_nouf_dresses_independent_category.sql
-- #############################################################################

-- Independent category: فساتين نوف (nouf_dresses)
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
    OR name_ar ILIKE '%نوف%'
    OR name_ar ILIKE '%nouf%'
    OR description_ar ILIKE '%نوف%'
  );

-- Normalize any remaining wedding_dress → wedding
UPDATE dresses
SET category = 'wedding',
    updated_at = now()
WHERE category = 'wedding_dress';

-- Ensure nouf_dress (singular legacy) → nouf_dresses
UPDATE dresses
SET category = 'nouf_dresses',
    updated_at = now()
WHERE category = 'nouf_dress';

-- Do NOT recreate dresses_category_check (dynamic categories; see migration 025)

-- Booking service_type CHECK obsolete (app Zod; see 026) — drop only, never re-ADD.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;

UPDATE bookings
SET service_type = 'nouf_dresses'
WHERE service_type = 'nouf_dress';



-- #############################################################################
-- APPLY_NOUF_DRESSES_CATEGORY — Nouf category overlay
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
    OR name_ar ILIKE '%نوف%'
    OR name_ar ILIKE '%nouf%'
    OR description_ar ILIKE '%نوف%'
  );

UPDATE dresses
SET category = 'wedding',
    updated_at = now()
WHERE category = 'wedding_dress';

UPDATE dresses
SET category = 'nouf_dresses',
    updated_at = now()
WHERE category = 'nouf_dress';

-- Booking service_type CHECK obsolete (app Zod; see 026) — drop only, never re-ADD.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;

UPDATE bookings
SET service_type = 'nouf_dresses'
WHERE service_type = 'nouf_dress';



-- #############################################################################
-- Migration 011 — Order notifications
-- Source: supabase/migrations/011_order_notifications.sql
-- #############################################################################

-- Expand shop order statuses + notification_logs
-- Safe to run multiple times.
-- NOTE: Do NOT re-ADD an incomplete status list here — live DBs may already have
-- awaiting_payment / payment_received (full list applied in migration 012 below).

ALTER TABLE shop_orders DROP CONSTRAINT IF EXISTS shop_orders_status_check;

-- Normalize legacy completed → delivered
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
-- Migration 012 — Order workflow notifications
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
-- APPLY_NOTIFICATIONS — Workflow statuses + notification_logs
-- Source: supabase/APPLY_NOTIFICATIONS.sql
-- #############################################################################

-- =============================================================================
-- RUN IN SUPABASE → SQL Editor
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
-- Migration 013 — Booking city
-- Source: supabase/migrations/013_booking_city.sql
-- #############################################################################

-- Add city column for booking form
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS city TEXT;
COMMENT ON COLUMN bookings.city IS 'Customer city (required on booking form)';



-- #############################################################################
-- Migration 014 — Booking region
-- Source: supabase/migrations/014_booking_region.sql
-- #############################################################################

-- Align bookings with form: region column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS region TEXT;

COMMENT ON COLUMN bookings.region IS 'Delivery region (required when delivery_required = true)';
COMMENT ON COLUMN bookings.city IS 'Customer city';



-- #############################################################################
-- Migration 015 — Bookings form sync
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

-- Booking service_type CHECK obsolete (app Zod; see 026) — drop only, never re-ADD.
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
-- APPLY_BOOKINGS_COMPLETE — Full bookings column sync
-- Source: supabase/APPLY_BOOKINGS_COMPLETE.sql
-- #############################################################################

-- =============================================================================
-- RUN ONCE IN SUPABASE → SQL Editor
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
-- APPLY_BOOKINGS_FIX — Bookings fixes
-- Source: supabase/APPLY_BOOKINGS_FIX.sql
-- #############################################################################

-- =============================================================================
-- RUN IN SUPABASE → SQL Editor
-- Booking form fixes: city column + service_type constraint
-- Safe to run multiple times.
-- =============================================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS region TEXT;

-- Booking service_type CHECK obsolete (app Zod; see 026) — drop only, never re-ADD.
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
-- APPLY_BOOKINGS_ADMIN_RLS — Bookings admin RLS
-- Source: supabase/APPLY_BOOKINGS_ADMIN_RLS.sql
-- #############################################################################

-- =============================================================================
-- RUN IN SUPABASE → SQL Editor (does NOT change table columns)
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
-- M2 / Migration 016 — Dynamic categories
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
  ('a1000000-0000-4000-8000-000000000001', 'فساتين الزفاف', 'wedding-dresses', NULL, 10, true, '', '/wedding-dresses', 'wedding'),
  ('a1000000-0000-4000-8000-000000000002', 'فساتين للإيجار', 'rental-dresses', NULL, 20, true, '', '/rental-dresses', 'rental'),
  ('a1000000-0000-4000-8000-000000000003', 'تصميم فستان خاص', 'custom-design', NULL, 30, true, '', '/custom-design', 'custom_design'),
  ('a1000000-0000-4000-8000-000000000004', 'فساتين نوف', 'nouf-dresses', NULL, 40, true, '', '/nouf-dresses', 'nouf_dresses'),
  ('a1000000-0000-4000-8000-000000000005', 'اكسسوارات العروس', 'bridal-accessories', NULL, 50, true, 'طرحة العروس وبرنص العروس', NULL, 'bridal_accessories'),
  ('a1000000-0000-4000-8000-000000000006', 'طرحة العروس', 'veils', 'a1000000-0000-4000-8000-000000000005', 10, true, '', '/veils', 'veils'),
  ('a1000000-0000-4000-8000-000000000007', 'برنص العروس', 'robes', 'a1000000-0000-4000-8000-000000000005', 20, true, '', '/robes', 'bridal_robes')
ON CONFLICT (slug) DO NOTHING;



-- #############################################################################
-- M1 — Categories برنص spelling fix
-- Source: supabase/APPLY_CATEGORIES_BERNUS_SPELLING.sql
-- #############################################################################

-- Fix category labels to official spelling: برنص العروس
-- Safe / idempotent.

UPDATE categories
SET
  name_ar = REPLACE(name_ar, 'برنس', 'برنص'),
  description_ar = REPLACE(description_ar, 'برنس', 'برنص'),
  updated_at = now()
WHERE name_ar LIKE '%برنس%' OR description_ar LIKE '%برنس%';

-- Optional: product text (already mostly برنص in live data)
UPDATE bridal_robes
SET
  name_ar = REPLACE(name_ar, 'برنس', 'برنص'),
  description_ar = REPLACE(description_ar, 'برنس', 'برنص'),
  updated_at = now()
WHERE name_ar LIKE '%برنس%' OR description_ar LIKE '%برنس%';

SELECT slug, name_ar, description_ar
FROM categories
WHERE slug IN ('robes', 'bridal-accessories')
ORDER BY slug;



-- #############################################################################
-- M1 — Rename برنس → برنص across catalog
-- Source: supabase/APPLY_RENAME_TO_BERNUS.sql
-- #############################################################################

-- Official naming: برنص العروس (not برنس العروس)
-- Run in Supabase SQL Editor. Idempotent via REPLACE.

-- Product catalog
UPDATE bridal_robes
SET
  name_ar = REPLACE(name_ar, 'برنس', 'برنص'),
  description_ar = REPLACE(description_ar, 'برنس', 'برنص'),
  color = CASE WHEN color IS NULL THEN NULL ELSE REPLACE(color, 'برنس', 'برنص') END,
  material = CASE WHEN material IS NULL THEN NULL ELSE REPLACE(material, 'برنس', 'برنص') END,
  size = CASE WHEN size IS NULL THEN NULL ELSE REPLACE(size, 'برنس', 'برنص') END,
  updated_at = now()
WHERE
  name_ar LIKE '%برنس%'
  OR description_ar LIKE '%برنس%'
  OR COALESCE(color, '') LIKE '%برنس%'
  OR COALESCE(material, '') LIKE '%برنس%'
  OR COALESCE(size, '') LIKE '%برنس%';

UPDATE veils
SET
  name_ar = REPLACE(name_ar, 'برنس', 'برنص'),
  description_ar = REPLACE(description_ar, 'برنس', 'برنص'),
  updated_at = now()
WHERE name_ar LIKE '%برنس%' OR description_ar LIKE '%برنس%';

UPDATE dresses
SET
  name_ar = REPLACE(name_ar, 'برنس', 'برنص'),
  description_ar = REPLACE(description_ar, 'برنس', 'برنص'),
  updated_at = now()
WHERE name_ar LIKE '%برنس%' OR description_ar LIKE '%برنس%';

UPDATE categories
SET
  name_ar = REPLACE(name_ar, 'برنس', 'برنص'),
  description_ar = REPLACE(description_ar, 'برنس', 'برنص'),
  updated_at = now()
WHERE name_ar LIKE '%برنس%' OR description_ar LIKE '%برنس%';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'gallery_items'
  ) THEN
    UPDATE gallery_items
    SET
      title_ar = REPLACE(title_ar, 'برنس', 'برنص'),
      category = REPLACE(category, 'برنس', 'برنص')
    WHERE title_ar LIKE '%برنس%' OR category LIKE '%برنس%';
  END IF;
END $$;

-- Shop order line items (JSONB)
UPDATE shop_orders
SET items = REPLACE(items::text, 'برنس', 'برنص')::jsonb
WHERE items::text LIKE '%برنس%';

UPDATE shop_orders
SET notes = REPLACE(notes, 'برنس', 'برنص')
WHERE notes LIKE '%برنس%';

-- Bookings free text / JSON
UPDATE bookings
SET notes = REPLACE(notes, 'برنس', 'برنص')
WHERE notes LIKE '%برنس%';

UPDATE bookings
SET personalization = REPLACE(personalization::text, 'برنس', 'برنص')::jsonb
WHERE personalization IS NOT NULL AND personalization::text LIKE '%برنس%';

UPDATE bookings
SET gift_options = REPLACE(gift_options::text, 'برنس', 'برنص')::jsonb
WHERE gift_options IS NOT NULL AND gift_options::text LIKE '%برنس%';

-- Settings JSON blob (if any Arabic copy stored there)
UPDATE settings
SET value = REPLACE(value::text, 'برنس', 'برنص')::jsonb
WHERE value::text LIKE '%برنس%';

-- Verification
SELECT 'bridal_robes' AS src, COUNT(*) AS still_has_wrong
FROM bridal_robes
WHERE name_ar LIKE '%برنس%' OR description_ar LIKE '%برنس%'
UNION ALL
SELECT 'categories', COUNT(*)
FROM categories
WHERE name_ar LIKE '%برنس%' OR description_ar LIKE '%برنس%'
UNION ALL
SELECT 'shop_orders', COUNT(*)
FROM shop_orders
WHERE items::text LIKE '%برنس%' OR COALESCE(notes, '') LIKE '%برنس%';



-- #############################################################################
-- M5 / Migration 017 — Shop order shipping columns
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
-- M6 / Migration 018 — Customer in-app notifications
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
-- Notify prefs / Migration 019 — Notification channel preferences
-- Source: supabase/APPLY_NOTIFICATION_PREFERENCES.sql
-- #############################################################################

-- =============================================================================
-- REQUIRED: Run in Supabase → SQL Editor → New query → Run
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
-- M9 / Migration 020 — Shipping regions + delivery method (CREATES shipping_regions)
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
  -- Top-level groups (inactive — organizational only)
  ('c1000000-0000-4000-8000-000000000001', 'الجنوب', 'South', 0, false, 10,
   '{"kind":"group","group_key":"south"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000002', 'المركز', 'Center', 0, false, 20,
   '{"kind":"group","group_key":"center"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000003', 'المثلث', 'Triangle', 0, false, 30,
   '{"kind":"group","group_key":"triangle"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000004', 'الشمال', 'North', 0, false, 40,
   '{"kind":"group","group_key":"north"}'::jsonb),

  -- الجنوب
  ('c2000000-0000-4000-8000-000000000001', 'رهط', 'Rahat', 45, true, 100,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000002', 'تل السبع', 'Tel Sheva', 45, true, 110,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000003', 'حورة', 'Hura', 45, true, 120,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000004', 'اللقية', 'Lakiya', 45, true, 130,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000005', 'شقيب السلام', 'Segev Shalom', 45, true, 140,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000006', 'كسيفة', 'Kuseife', 45, true, 150,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000007', 'عرعرة النقب', 'Arara BaNegev', 45, true, 160,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000008', 'بئر السبع', 'Beer Sheva', 45, true, 170,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000009', 'وادي النعم', 'Wadi al-Naam', 45, true, 180,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000010', 'أبو تلول', 'Abu Tulul', 45, true, 190,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),
  ('c2000000-0000-4000-8000-000000000011', 'ترابين', 'Tarabin', 45, true, 200,
   '{"kind":"city","group_key":"south","group_ar":"الجنوب"}'::jsonb),

  -- المركز
  ('c3000000-0000-4000-8000-000000000001', 'تل أبيب', 'Tel Aviv', 40, true, 300,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000002', 'يافا', 'Jaffa', 40, true, 310,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000003', 'اللد', 'Lod', 40, true, 320,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000004', 'الرملة', 'Ramla', 40, true, 330,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000005', 'نتانيا', 'Netanya', 40, true, 340,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000006', 'هرتسليا', 'Herzliya', 40, true, 350,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000007', 'ريشون لتسيون', 'Rishon LeZion', 40, true, 360,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000008', 'حولون', 'Holon', 40, true, 370,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000009', 'بات يام', 'Bat Yam', 40, true, 380,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000010', 'رمات غان', 'Ramat Gan', 40, true, 390,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000011', 'بيتح تكفا', 'Petah Tikva', 40, true, 400,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000012', 'كفار سابا', 'Kfar Saba', 40, true, 410,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),
  ('c3000000-0000-4000-8000-000000000013', 'رענانا', 'Ra''anana', 40, true, 420,
   '{"kind":"city","group_key":"center","group_ar":"المركز"}'::jsonb),

  -- المثلث
  ('c4000000-0000-4000-8000-000000000001', 'أم الفحم', 'Umm al-Fahm', 40, true, 500,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000002', 'الطيبة', 'Tayibe', 40, true, 510,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000003', 'الطيرة', 'Tira', 40, true, 520,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000004', 'باقة الغربية', 'Baqa al-Gharbiyye', 40, true, 530,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000005', 'كفر قاسم', 'Kafr Qasim', 40, true, 540,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000006', 'كفر قرع', 'Kafr Qara', 40, true, 550,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000007', 'جلجولية', 'Jaljulia', 40, true, 560,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000008', 'قلنسوة', 'Qalansawe', 40, true, 570,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000009', 'زيمر', 'Zemer', 40, true, 580,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000010', 'عارة', 'Ara', 40, true, 590,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),
  ('c4000000-0000-4000-8000-000000000011', 'عرعرة', 'Arara', 40, true, 600,
   '{"kind":"city","group_key":"triangle","group_ar":"المثلث"}'::jsonb),

  -- الشمال
  ('c5000000-0000-4000-8000-000000000001', 'الناصرة', 'Nazareth', 45, true, 700,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000002', 'شفاعمرو', 'Shefa-Amr', 45, true, 710,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000003', 'سخنين', 'Sakhnin', 45, true, 720,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000004', 'عكا', 'Acre', 45, true, 730,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000005', 'طبريا', 'Tiberias', 45, true, 740,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000006', 'صفد', 'Safed', 45, true, 750,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000007', 'حيفا', 'Haifa', 45, true, 760,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000008', 'طمرة', 'Tamra', 45, true, 770,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000009', 'مجد الكروم', 'Majd al-Krum', 45, true, 780,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000010', 'كفر كنا', 'Kafr Kanna', 45, true, 790,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000011', 'عيلبون', 'Eilabun', 45, true, 800,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000012', 'دير حنا', 'Deir Hanna', 45, true, 810,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000013', 'عرابة', 'Arraba', 45, true, 820,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb),
  ('c5000000-0000-4000-8000-000000000014', 'نحف', 'Nahf', 45, true, 830,
   '{"kind":"city","group_key":"north","group_ar":"الشمال"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  shipping_fee = EXCLUDED.shipping_fee,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  meta = EXCLUDED.meta,
  updated_at = now();

-- #############################################################################
-- M10 / Migration 021 — Smart shipping (pending fees, tracking, estimates)
-- Source: supabase/APPLY_SMART_SHIPPING.sql
-- #############################################################################

-- =============================================================================
-- Milestone 10 – Smart shipping (idempotent)
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
-- Migration 022 — Soft delete / archive / audit
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
-- Migration 023 — Report schedules (future-ready; no cron runner)
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
  'Scheduled report email jobs. Future-ready: no cron/runner yet — CRUD + API only; do not auto-send until a schedule runner is deployed.';


-- #############################################################################
-- Migration 024 — Smart appointments
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
  ('نادين', 0),
  ('سارة', 1),
  ('ريم', 2)
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
-- Migration 025 — Drop obsolete dresses_category_check
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
-- Migration 026 — Drop obsolete bookings_service_type_check
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
-- Migration 027 — Product category_id FK + category product_kind / SEO
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
-- 31 — Phase E customer auth: APPLY_CUSTOMER_AUTH.sql (= 028)
-- Creates: customers, customer_addresses, otp_requests, customer_sessions,
--          customer_devices, login_history, wishlist_items, customer_reviews,
--          customer_messages, saved_designs, loyalty_coupons, loyalty_transactions
-- MUST run before section 32 (guest). Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- #############################################################################
-- Phase E: Premium customer account & OTP authentication (idempotent)
-- MUST precede section 32 (guest flag / 029) — both inlined in this file.
-- Same as migrations/028_customer_auth.sql

-- =============================================================================
-- customers — linked to auth.users when signed in; guest identity via phone/email
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
  label TEXT NOT NULL DEFAULT 'المنزل',
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
-- otp_requests — phone/email OTP with rate limits & expiry
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
-- customer_sessions / customer_devices — remember device + logout-all
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
-- customer_messages — basic boutique thread (attachments future-ready)
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
  title TEXT NOT NULL DEFAULT 'تصميم محفوظ',
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

-- Optional link from guest orders → authenticated customer
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

-- OTP: service-role only (no public policies) — admin can read for support
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
-- 32 — Phase E2 guest flag: APPLY_CUSTOMER_GUEST.sql (= 029)
-- ALTERs customers.is_guest; FKs shop_orders.customer_id → customers(id)
-- Requires section 31 / customers table (inlined above). No separate APPLY_* needed.
-- #############################################################################
-- Phase E2: guest flag (idempotent) — same as migrations/029_customer_guest_flag.sql
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


-- =============================================================================
-- END APPLY_ALL.sql
-- Reloads PostgREST schema cache when supported.
-- =============================================================================
NOTIFY pgrst, 'reload schema';