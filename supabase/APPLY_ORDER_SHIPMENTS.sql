-- Editor copy of 054_order_shipments.sql — run in Supabase SQL Editor.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS order_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  public_token TEXT NOT NULL UNIQUE,
  carrier TEXT,
  carrier_shipment_id TEXT,
  carrier_tracking_number TEXT,
  carrier_service TEXT,
  carrier_label_url TEXT,
  shipment_status TEXT NOT NULL DEFAULT 'pending',
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_shipments_status_check CHECK (
    shipment_status IN (
      'pending',
      'label_created',
      'in_transit',
      'delivered',
      'cancelled',
      'failed'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_order_shipments_order_id
  ON order_shipments (order_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_shipments_public_token
  ON order_shipments (public_token);

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_shipments_one_primary
  ON order_shipments (order_id)
  WHERE is_primary;

ALTER TABLE order_shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin all order_shipments" ON order_shipments;
CREATE POLICY "Admin all order_shipments" ON order_shipments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner', 'super_admin', 'manager', 'staff')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner', 'super_admin', 'manager', 'staff')
    )
  );

INSERT INTO order_shipments (
  order_id,
  public_token,
  carrier,
  carrier_tracking_number,
  shipment_status,
  is_primary
)
SELECT
  o.id,
  replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  NULLIF(btrim(COALESCE(o.carrier_code, '')), ''),
  NULLIF(btrim(COALESCE(o.tracking_number, '')), ''),
  CASE
    WHEN o.status IN ('delivered', 'completed') THEN 'delivered'
    WHEN o.status = 'shipped' THEN 'in_transit'
    WHEN o.status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END,
  true
FROM shop_orders o
WHERE NOT EXISTS (
  SELECT 1 FROM order_shipments s WHERE s.order_id = o.id AND s.is_primary
);

NOTIFY pgrst, 'reload schema';
