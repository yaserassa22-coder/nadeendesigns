-- Carrier-independent shipments: Product → Order → Shipment → Carrier
-- Idempotent. Tracking lives on the shipment, never on the product.

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

-- One primary shipment per existing order. Token is random, not the order UUID.
INSERT INTO order_shipments (
  order_id,
  public_token,
  carrier,
  carrier_tracking_number,
  shipment_status,
  shipped_at,
  delivered_at,
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
  CASE WHEN o.status = 'shipped' THEN o.created_at ELSE NULL END,
  CASE WHEN o.status IN ('delivered', 'completed') THEN o.created_at ELSE NULL END,
  true
FROM shop_orders o
WHERE NOT EXISTS (
  SELECT 1 FROM order_shipments s WHERE s.order_id = o.id AND s.is_primary
);

COMMENT ON TABLE order_shipments IS
  'Internal shipment per order. Carrier fields optional until a courier adapter is connected.';
COMMENT ON COLUMN order_shipments.public_token IS
  'Unguessable QR / lookup token. Never encode customer PII or carrier tracking in the QR.';
COMMENT ON COLUMN order_shipments.carrier_tracking_number IS
  'Filled automatically by a connected carrier adapter; optional manual fallback on the order row.';

NOTIFY pgrst, 'reload schema';
