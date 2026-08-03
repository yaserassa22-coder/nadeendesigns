-- Apply in Supabase SQL Editor (same as migrations/018_customer_notifications.sql)
CREATE TABLE IF NOT EXISTS customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES shop_orders(id) ON DELETE CASCADE,
  customer_key TEXT,
  title_ar TEXT NOT NULL,
  body_ar TEXT NOT NULL DEFAULT '',
  order_status TEXT,
  href TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_order
  ON customer_notifications(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer
  ON customer_notifications(customer_key, created_at DESC)
  WHERE customer_key IS NOT NULL;

ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read customer_notifications" ON customer_notifications;
CREATE POLICY "Public read customer_notifications" ON customer_notifications
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public update customer_notifications read" ON customer_notifications;
CREATE POLICY "Public update customer_notifications read" ON customer_notifications
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin all customer_notifications" ON customer_notifications;
CREATE POLICY "Admin all customer_notifications" ON customer_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Public insert customer_notifications" ON customer_notifications;
CREATE POLICY "Public insert customer_notifications" ON customer_notifications
  FOR INSERT WITH CHECK (true);
