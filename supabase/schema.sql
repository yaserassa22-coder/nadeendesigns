-- Nadeen Designs Supabase Schema
-- Run this in your Supabase SQL Editor

-- Dresses
CREATE TABLE IF NOT EXISTS dresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('wedding', 'rental', 'custom_design', 'nouf_dresses')),
  price NUMERIC,
  rental_price NUMERIC,
  size TEXT,
  color TEXT,
  style TEXT,
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

-- Bridal robes (برنص عروس)
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
      'confirmed',
      'under_review',
      'in_production',
      'ready_for_pickup',
      'shipped',
      'delivered',
      'cancelled',
      'completed'
    )),
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

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  service_type TEXT NOT NULL CHECK (
    service_type IN (
      'wedding_dress',
      'rental_dress',
      'custom_design',
      'nouf_dresses',
      'nouf_dress',
      'veil',
      'bridal_cape',
      'fitting',
      'consultation',
      'rental',
      'purchase'
    )
  ),
  city TEXT,
  region TEXT,
  dress_id UUID REFERENCES dresses(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
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
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Public read for dresses & gallery
CREATE POLICY "Public read dresses" ON dresses FOR SELECT USING (true);
CREATE POLICY "Public read veils" ON veils FOR SELECT USING (true);
CREATE POLICY "Public read bridal_robes" ON bridal_robes FOR SELECT USING (true);
CREATE POLICY "Public read gallery" ON gallery_items FOR SELECT USING (true);
CREATE POLICY "Public read settings" ON settings FOR SELECT USING (true);

-- Public insert for bookings & contact
CREATE POLICY "Public insert bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert contact" ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert shop_orders" ON shop_orders FOR INSERT WITH CHECK (true);

-- Admin full access (authenticated users with admin profile)
CREATE POLICY "Admin all dresses" ON dresses FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin all veils" ON veils FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin all bridal_robes" ON bridal_robes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin all shop_orders" ON shop_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin all gallery" ON gallery_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin all bookings" ON bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin all contact" ON contact_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin all settings" ON settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin read profiles" ON profiles FOR SELECT USING (auth.uid() = id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dresses_category ON dresses(category);
CREATE INDEX IF NOT EXISTS idx_dresses_featured ON dresses(is_featured);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_delivery ON bookings(delivery_required);
CREATE INDEX IF NOT EXISTS idx_gallery_sort ON gallery_items(sort_order);
