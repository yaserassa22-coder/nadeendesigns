-- 038_product_experience_engine.sql
-- Sprint 2A MASTER: Global Services Library + Experience Templates + per-product experience_config.
-- Safe to re-run. Extends 037 — does not remove existing columns or flows.

-- ---------------------------------------------------------------------------
-- 1) Global services library (IDs are stable text keys — no hardcoded names)
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
  ('gift_wrap', 'Gift Wrap', 'تغليف هدية', '', '', 'FREE', 0, FALSE, TRUE, FALSE, FALSE, TRUE, FALSE, 0, '{"scope":"all"}'::jsonb),
  ('greeting_card', 'Greeting Card', 'بطاقة تهنئة', '', '', 'FREE', 0, FALSE, TRUE, FALSE, FALSE, TRUE, FALSE, 1, '{"scope":"all"}'::jsonb),
  ('luxury_box', 'Luxury Box', 'علبة فاخرة', '', '', 'FREE', 0, FALSE, TRUE, FALSE, FALSE, TRUE, FALSE, 2, '{"scope":"all"}'::jsonb),
  ('express_delivery', 'Express Delivery', 'توصيل سريع', '', '', 'FREE', 0, FALSE, TRUE, FALSE, FALSE, TRUE, FALSE, 3, '{"scope":"all"}'::jsonb)
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

-- Seed system templates when missing (idempotent by slug).
-- PDP/modal sections only — order_options/delivery/order_notes are checkout-only (disabled).
INSERT INTO product_experience_templates (
  slug, name, name_ar, description_ar, is_system, sort_order, config
)
VALUES
  (
    'gift',
    'Gift',
    'هدية',
    'تجربة شراء مناسبة للهدايا — خدمات + تغليف + ملخص السعر',
    TRUE,
    0,
    '{
      "sections": [
        {"id":"extra_services","enabled":true,"collapsed":false,"sort_order":0,"title_ar":"خدمات إضافية","title":"Extra Services"},
        {"id":"gift_options","enabled":true,"collapsed":false,"sort_order":1,"title_ar":"تغليف هدية","title":"Gift Options"},
        {"id":"personalization","enabled":false,"collapsed":true,"sort_order":2,"title_ar":"تخصيص الكتابة","title":"Personalization"},
        {"id":"summary","enabled":true,"collapsed":false,"sort_order":3,"title_ar":"ملخص السعر","title":"Summary"},
        {"id":"order_options","enabled":false,"collapsed":true,"sort_order":4,"title_ar":"خيارات الطلب","title":"Order Options"},
        {"id":"delivery","enabled":false,"collapsed":true,"sort_order":5,"title_ar":"التوصيل","title":"Delivery"},
        {"id":"order_notes","enabled":false,"collapsed":true,"sort_order":6,"title_ar":"ملاحظات الطلب","title":"Order Notes"}
      ]
    }'::jsonb
  ),
  (
    'accessory',
    'Accessory',
    'إكسسوار',
    'تجربة إكسسوارات العروس — تخصيص + خدمات + ملخص',
    TRUE,
    1,
    '{
      "sections": [
        {"id":"personalization","enabled":true,"collapsed":false,"sort_order":0,"title_ar":"تخصيص الكتابة","title":"Personalization"},
        {"id":"gift_options","enabled":true,"collapsed":true,"sort_order":1,"title_ar":"تغليف هدية","title":"Gift Options"},
        {"id":"extra_services","enabled":true,"collapsed":false,"sort_order":2,"title_ar":"خدمات إضافية","title":"Extra Services"},
        {"id":"summary","enabled":true,"collapsed":false,"sort_order":3,"title_ar":"ملخص السعر","title":"Summary"},
        {"id":"order_options","enabled":false,"collapsed":true,"sort_order":4,"title_ar":"خيارات الطلب","title":"Order Options"},
        {"id":"delivery","enabled":false,"collapsed":true,"sort_order":5,"title_ar":"التوصيل","title":"Delivery"},
        {"id":"order_notes","enabled":false,"collapsed":true,"sort_order":6,"title_ar":"ملاحظات الطلب","title":"Order Notes"}
      ]
    }'::jsonb
  ),
  (
    'ready_to_buy',
    'Ready to Buy',
    'جاهز للشراء',
    'تجربة بسيطة للمنتجات الجاهزة — خدمات + ملخص',
    TRUE,
    2,
    '{
      "sections": [
        {"id":"extra_services","enabled":true,"collapsed":false,"sort_order":0,"title_ar":"خدمات إضافية","title":"Extra Services"},
        {"id":"gift_options","enabled":false,"collapsed":true,"sort_order":1,"title_ar":"تغليف هدية","title":"Gift Options"},
        {"id":"personalization","enabled":false,"collapsed":true,"sort_order":2,"title_ar":"تخصيص الكتابة","title":"Personalization"},
        {"id":"summary","enabled":true,"collapsed":false,"sort_order":3,"title_ar":"ملخص السعر","title":"Summary"},
        {"id":"order_options","enabled":false,"collapsed":true,"sort_order":4,"title_ar":"خيارات الطلب","title":"Order Options"},
        {"id":"delivery","enabled":false,"collapsed":true,"sort_order":5,"title_ar":"التوصيل","title":"Delivery"},
        {"id":"order_notes","enabled":false,"collapsed":true,"sort_order":6,"title_ar":"ملاحظات الطلب","title":"Order Notes"}
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
