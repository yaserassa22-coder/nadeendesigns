-- 040_enterprise_experience_engine.sql
-- Sprint: Enterprise Product Management & Experience Engine
-- Feature library + purchase flows + per-product feature assignment.
-- Safe to re-run. Extends Sprint 2A — does not remove existing flows.

-- ---------------------------------------------------------------------------
-- 1) Feature library (reusable once — assigned per product)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experience_features (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  name_ar TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  -- Grouping for Admin UI only (not storefront logic)
  group_key TEXT NOT NULL DEFAULT 'general'
    CHECK (group_key IN (
      'personalization',
      'commerce',
      'gift',
      'delivery',
      'booking',
      'general'
    )),
  -- Optional link to store_services.id or experience section id
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

-- Seed feature library (idempotent)
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

-- ---------------------------------------------------------------------------
-- 2) Per-product feature assignment (JSONB — matches experience_config pattern)
--    Shape: { "enabled_ids": ["wishlist","add_to_cart",...], "use_custom": true }
--    null / missing = inherit smart defaults from product_type + shop kind
-- ---------------------------------------------------------------------------
ALTER TABLE dresses
  ADD COLUMN IF NOT EXISTS features_config JSONB;

ALTER TABLE veils
  ADD COLUMN IF NOT EXISTS features_config JSONB;

ALTER TABLE bridal_robes
  ADD COLUMN IF NOT EXISTS features_config JSONB;

-- ---------------------------------------------------------------------------
-- 3) Purchase flows (drive storefront CTAs by product_type)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_flows (
  id TEXT PRIMARY KEY,
  product_type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  name_ar TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  -- Primary CTA kind: add_to_cart | book_appointment | request_design | book_now
  primary_cta TEXT NOT NULL DEFAULT 'add_to_cart'
    CHECK (primary_cta IN (
      'add_to_cart',
      'book_appointment',
      'request_design',
      'book_now'
    )),
  primary_label_ar TEXT NOT NULL DEFAULT '',
  -- Secondary CTAs shown alongside primary (buy_now, wishlist, …)
  secondary_ctas JSONB NOT NULL DEFAULT '[]'::jsonb,
  hide_cart BOOLEAN NOT NULL DEFAULT FALSE,
  hide_buy_now BOOLEAN NOT NULL DEFAULT FALSE,
  -- Ordered step keys for Admin preview (informational)
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

-- ---------------------------------------------------------------------------
-- 4) Backfill wedding + nouf → rental_dress (behavior, not category CTA)
--    Only rewrite rows still on ready_to_buy that belong to wedding/nouf.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 5) Backfill features_config when null (smart defaults by surface)
-- ---------------------------------------------------------------------------

-- Veils: veil writing + font/color + commerce + gift defaults
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

-- Bridal robes: robe writing + font/color + commerce + gift
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

-- Rental dresses: appointment + wishlist
UPDATE dresses
SET features_config = jsonb_build_object(
  'use_custom', true,
  'enabled_ids', jsonb_build_array('appointment_booking', 'wishlist')
)
WHERE features_config IS NULL
  AND product_type = 'rental_dress';

-- Custom design: request design + wishlist
UPDATE dresses
SET features_config = jsonb_build_object(
  'use_custom', true,
  'enabled_ids', jsonb_build_array('request_design', 'wishlist')
)
WHERE features_config IS NULL
  AND product_type = 'custom_design';

-- Bridal accessories (dresses table rows) + ready_to_buy: commerce CTAs
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

-- Service / remaining
UPDATE dresses
SET features_config = jsonb_build_object(
  'use_custom', true,
  'enabled_ids', jsonb_build_array('appointment_booking', 'wishlist')
)
WHERE features_config IS NULL;

NOTIFY pgrst, 'reload schema';
