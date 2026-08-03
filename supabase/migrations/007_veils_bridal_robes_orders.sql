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
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
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

CREATE POLICY "Public read veils" ON veils FOR SELECT USING (true);
CREATE POLICY "Public read bridal_robes" ON bridal_robes FOR SELECT USING (true);
CREATE POLICY "Public insert shop_orders" ON shop_orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin all veils" ON veils FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin all bridal_robes" ON bridal_robes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin all shop_orders" ON shop_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE INDEX IF NOT EXISTS idx_veils_featured ON veils(is_featured);
CREATE INDEX IF NOT EXISTS idx_bridal_robes_featured ON bridal_robes(is_featured);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON shop_orders(status);
