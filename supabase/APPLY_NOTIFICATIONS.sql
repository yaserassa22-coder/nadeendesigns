-- =============================================================================
-- RUN IN SUPABASE → SQL Editor
-- Full order workflow statuses + notification_logs
-- Safe to run multiple times.
--
-- Required when Admin status changes fail with 23514 / shop_orders_status_check.
-- Live DBs created from early shop_orders (pending|confirmed|cancelled|completed)
-- reject under_review, awaiting_payment, payment_received, in_production,
-- ready_for_pickup, shipped, delivered until this CHECK is expanded.
-- Same block is included in APPLY_MISSING_MIGRATIONS.sql.
-- =============================================================================

ALTER TABLE shop_orders DROP CONSTRAINT IF EXISTS shop_orders_status_check;

UPDATE shop_orders SET status = 'delivered' WHERE status = 'completed';

ALTER TABLE shop_orders
  ADD CONSTRAINT shop_orders_status_check
  CHECK (
    status IN (
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
    )
  );

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES shop_orders(id) ON DELETE SET NULL,
  customer_id TEXT,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  order_status TEXT,
  recipient TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('sent', 'failed', 'pending_retry')),
  delivery_result TEXT,
  error_message TEXT,
  attempts INT NOT NULL DEFAULT 1,
  payload JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS delivery_result TEXT;

CREATE INDEX IF NOT EXISTS idx_notification_logs_order ON notification_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_dedupe
  ON notification_logs(order_id, notification_type, channel, order_status, status);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin all notification_logs" ON notification_logs;
CREATE POLICY "Admin all notification_logs" ON notification_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Allow service role inserts (edge/API) via existing admin client; no public insert.
