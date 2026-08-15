-- Editor copy of 055_shipping_providers.sql — run in Supabase SQL Editor.
-- Shipping provider config + future rates. Does NOT replace order_shipments.
-- Credentials live in secrets_enc (server-only). Never selected by public APIs.
-- Idempotent.

CREATE TABLE IF NOT EXISTS shipping_providers (
  code TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  environment TEXT NOT NULL DEFAULT 'test'
    CHECK (environment IN ('test', 'production')),
  public_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled_services TEXT[] NOT NULL DEFAULT '{}',
  last_test_at TIMESTAMPTZ,
  last_test_ok BOOLEAN,
  last_test_message TEXT,
  is_active_provider BOOLEAN NOT NULL DEFAULT false,
  secrets_enc JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipping_providers_one_active
  ON shipping_providers ((true))
  WHERE is_active_provider;

ALTER TABLE shipping_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin all shipping_providers" ON shipping_providers;
CREATE POLICY "Admin all shipping_providers" ON shipping_providers
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

COMMENT ON TABLE shipping_providers IS
  'Admin-managed carrier connections. Adapter catalog lives in code; credentials/enablement live here.';
COMMENT ON COLUMN shipping_providers.secrets_enc IS
  'AES-256-GCM blob of API credentials. Never return this column to the browser.';
COMMENT ON COLUMN shipping_providers.public_config IS
  'Non-secret provider fields (account id, etc.).';
COMMENT ON COLUMN shipping_providers.is_active_provider IS
  'At most one row may be the active carrier used when Admin creates a shipment.';

CREATE TABLE IF NOT EXISTS shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code TEXT NOT NULL REFERENCES shipping_providers(code) ON DELETE CASCADE,
  service_code TEXT NOT NULL,
  service_name TEXT,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  free_shipping_threshold NUMERIC(12, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_code, service_code)
);

CREATE INDEX IF NOT EXISTS idx_shipping_rates_provider
  ON shipping_rates (provider_code, sort_order);

ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin all shipping_rates" ON shipping_rates;
CREATE POLICY "Admin all shipping_rates" ON shipping_rates
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

COMMENT ON TABLE shipping_rates IS
  'Configurable carrier service rates for a future checkout path. Current checkout still uses shipping_regions.';

NOTIFY pgrst, 'reload schema';
