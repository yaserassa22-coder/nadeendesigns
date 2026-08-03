-- Dynamic shop categories (name, slug, parent, sort, visibility, icon, cover, description)
-- Safe to re-run. Does not alter product tables yet (wiring in M3).

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
  -- Optional public path / legacy product mapping (Phase 1 keeps existing routes)
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

-- Seed current shop sections (idempotent via legacy_key)
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
