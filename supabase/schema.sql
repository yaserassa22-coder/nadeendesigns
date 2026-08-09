-- Nadeen Designs Supabase Schema
-- Run this in your Supabase SQL Editor

-- Dresses
CREATE TABLE IF NOT EXISTS dresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description_ar TEXT NOT NULL DEFAULT '',
  short_description TEXT,
  slug TEXT,
  sku TEXT,
  -- TEXT slug / legacy_key; kept for read compatibility during transition
  category TEXT NOT NULL,
  -- Preferred FK to dynamic categories (migration 027; FK added after categories table)
  category_id UUID,
  -- Optional collection (categories.featured_collection rows) — migration 035
  collection_id UUID,
  price NUMERIC,
  sale_price NUMERIC,
  cost_price NUMERIC,
  rental_price NUMERIC,
  size TEXT,
  color TEXT,
  style TEXT,
  tags TEXT[] DEFAULT '{}'::text[],
  -- published | draft | hidden (migration 035); dual-write with is_available
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'draft', 'hidden')),
  is_featured BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Veils (separate from dresses)
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

-- Bridal robes (برنص العروس)
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

-- Dynamic categories (shop sections + hierarchy)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  icon_url TEXT,
  cover_image_url TEXT,
  description_ar TEXT NOT NULL DEFAULT '',
  href TEXT,
  legacy_key TEXT,
  -- dress | veil | bridal_robe | accessories_group (migration 027)
  product_kind TEXT,
  seo_title_ar TEXT,
  seo_description_ar TEXT,
  seo_og_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT categories_no_self_parent CHECK (parent_id IS NULL OR parent_id <> id)
);

-- Link dresses to categories (after both tables exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dresses_category_id_fkey'
  ) THEN
    ALTER TABLE dresses
      ADD CONSTRAINT dresses_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dresses_category_id ON dresses(category_id);

-- Shop orders
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
  shipping_required BOOLEAN NOT NULL DEFAULT false,
  shipping_full_name TEXT,
  shipping_phone TEXT,
  shipping_city TEXT,
  shipping_region TEXT,
  shipping_address TEXT,
  shipping_postal_code TEXT,
  shipping_notes TEXT,
  shipping_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notification logs (email / WhatsApp)
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

-- Gallery
CREATE TABLE IF NOT EXISTS gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar TEXT NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'wedding',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Worn by You (homepage customer visual gallery)
CREATE TABLE IF NOT EXISTS worn_by_you_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_type TEXT NOT NULL DEFAULT 'image'
    CHECK (media_type IN ('image', 'video')),
  image_url TEXT NOT NULL,
  video_url TEXT,
  customer_name TEXT,
  caption TEXT,
  alt_text TEXT,
  product_kind TEXT
    CHECK (
      product_kind IS NULL
      OR product_kind IN ('dress', 'veil', 'bridal_robe')
    ),
  product_id TEXT,
  product_label TEXT,
  social_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  archived_at TIMESTAMPTZ,
  archived_by UUID
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  -- service_type: no DB CHECK — validated in app (Zod); see migration 026
  service_type TEXT NOT NULL,
  city TEXT,
  region TEXT,
  dress_id UUID REFERENCES dresses(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rescheduled', 'cancelled', 'completed')),
  delivery_required BOOLEAN DEFAULT false,
  delivery_address TEXT,
  delivery_region TEXT,
  delivery_city TEXT,
  delivery_phone TEXT,
  delivery_status TEXT CHECK (
    delivery_status IS NULL OR delivery_status IN ('pending', 'preparing', 'out_for_delivery', 'delivered')
  ),
  personalization JSONB,
  gift_options JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Contact messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles (admin)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin',
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE dresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE veils ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridal_robes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE worn_by_you_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Public read for dresses & gallery
DROP POLICY IF EXISTS "Public read dresses" ON dresses;
CREATE POLICY "Public read dresses" ON dresses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read veils" ON veils;
CREATE POLICY "Public read veils" ON veils FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read bridal_robes" ON bridal_robes;
CREATE POLICY "Public read bridal_robes" ON bridal_robes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read categories" ON categories;
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read gallery" ON gallery_items;
CREATE POLICY "Public read gallery" ON gallery_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read worn_by_you" ON worn_by_you_items;
CREATE POLICY "Public read worn_by_you" ON worn_by_you_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read settings" ON settings;
CREATE POLICY "Public read settings" ON settings FOR SELECT USING (true);

-- Public insert for bookings & contact
-- NOTE: contact_messages has INSERT for anon, NOT public SELECT (privacy).
-- Server routes must insert WITHOUT .select() when using the anon key fallback,
-- or use SUPABASE_SERVICE_ROLE_KEY. Do not add public SELECT on contact_messages.
DROP POLICY IF EXISTS "Public insert bookings" ON bookings;
CREATE POLICY "Public insert bookings" ON bookings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public insert contact" ON contact_messages;
CREATE POLICY "Public insert contact" ON contact_messages FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public insert shop_orders" ON shop_orders;
CREATE POLICY "Public insert shop_orders" ON shop_orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public read shop_orders by id" ON shop_orders;
CREATE POLICY "Public read shop_orders by id" ON shop_orders FOR SELECT USING (true);

-- Admin full access (authenticated users with admin profile)
DROP POLICY IF EXISTS "Admin all dresses" ON dresses;
CREATE POLICY "Admin all dresses" ON dresses FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admin all veils" ON veils;
CREATE POLICY "Admin all veils" ON veils FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admin all bridal_robes" ON bridal_robes;
CREATE POLICY "Admin all bridal_robes" ON bridal_robes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admin all categories" ON categories;
CREATE POLICY "Admin all categories" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admin all shop_orders" ON shop_orders;
CREATE POLICY "Admin all shop_orders" ON shop_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admin all gallery" ON gallery_items;
CREATE POLICY "Admin all gallery" ON gallery_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admin all worn_by_you" ON worn_by_you_items;
CREATE POLICY "Admin all worn_by_you" ON worn_by_you_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admin all bookings" ON bookings;
CREATE POLICY "Admin all bookings" ON bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admin all contact" ON contact_messages;
CREATE POLICY "Admin all contact" ON contact_messages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND lower(role) IN ('admin', 'owner', 'manager', 'staff', 'super_admin')
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND lower(role) IN ('admin', 'owner', 'manager', 'staff', 'super_admin')
  )
);
DROP POLICY IF EXISTS "Admin all settings" ON settings;
CREATE POLICY "Admin all settings" ON settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admin read profiles" ON profiles;
CREATE POLICY "Admin read profiles" ON profiles FOR SELECT USING (auth.uid() = id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dresses_category ON dresses(category);
CREATE INDEX IF NOT EXISTS idx_dresses_featured ON dresses(is_featured);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_delivery ON bookings(delivery_required);
CREATE INDEX IF NOT EXISTS idx_gallery_sort ON gallery_items(sort_order);
