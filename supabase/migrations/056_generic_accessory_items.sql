-- 056_generic_accessory_items.sql
-- Generic bridal-accessory product type: any NEW sub-category under
-- Bridal Accessories (beyond veils/robes) uses this single table instead of
-- requiring a dedicated table/API/admin manager per type.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS accessory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  name_he TEXT,
  description_ar TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  sale_price NUMERIC,
  images JSONB DEFAULT '[]'::jsonb,
  color TEXT,
  material TEXT,
  size TEXT,
  stock_quantity INT NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  -- Always bridal_accessory — storefront CTA source of truth (matches veils/bridal_robes)
  product_type TEXT NOT NULL DEFAULT 'bridal_accessory'
    CHECK (product_type = 'bridal_accessory'),
  sku TEXT,
  order_options_config JSONB,
  extra_services_config JSONB,
  experience_config JSONB,
  features_config JSONB,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accessory_items_sku_unique
  ON accessory_items (sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accessory_items_category_id ON accessory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_accessory_items_featured ON accessory_items(is_featured);
CREATE INDEX IF NOT EXISTS idx_accessory_items_is_deleted ON accessory_items(is_deleted);
CREATE INDEX IF NOT EXISTS idx_accessory_items_archived_at ON accessory_items(archived_at);

ALTER TABLE accessory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read accessory_items" ON accessory_items;
CREATE POLICY "Public read accessory_items" ON accessory_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin all accessory_items" ON accessory_items;
CREATE POLICY "Admin all accessory_items" ON accessory_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
