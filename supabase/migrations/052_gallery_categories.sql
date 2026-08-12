-- Gallery filter categories (تفاصيل / البوتيك / فعاليات / …) — admin-managed.
-- Existing gallery_items.category values stay as slug strings.

CREATE TABLE IF NOT EXISTS gallery_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label_ar TEXT NOT NULL,
  label_he TEXT NOT NULL DEFAULT '',
  label_en TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gallery_categories_slug_format CHECK (
    slug ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'
  )
);

CREATE INDEX IF NOT EXISTS idx_gallery_categories_sort
  ON gallery_categories (sort_order, slug);

CREATE INDEX IF NOT EXISTS idx_gallery_categories_active
  ON gallery_categories (is_active);

ALTER TABLE gallery_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read gallery categories" ON gallery_categories;
CREATE POLICY "Public read gallery categories"
  ON gallery_categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin all gallery categories" ON gallery_categories;
CREATE POLICY "Admin all gallery categories"
  ON gallery_categories FOR ALL
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

-- Seed the current hardcoded filters (idempotent).
INSERT INTO gallery_categories (slug, label_ar, label_he, label_en, sort_order, is_active)
VALUES
  ('wedding', 'زفاف', 'חתונה', 'Wedding', 10, true),
  ('nouf_dresses', 'فساتين نوف', 'שמלות נוף', 'Nouf dresses', 20, true),
  ('details', 'تفاصيل', 'פרטים', 'Details', 30, true),
  ('boutique', 'البوتيك', 'הבוטיק', 'Boutique', 40, true),
  ('events', 'فعاليات', 'אירועים', 'Events', 50, true)
ON CONFLICT (slug) DO NOTHING;
