-- Phase E: Premium customer account & OTP authentication (idempotent)
-- Same as APPLY_CUSTOMER_AUTH.sql

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

NOTIFY pgrst, 'reload schema';
