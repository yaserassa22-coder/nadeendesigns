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
