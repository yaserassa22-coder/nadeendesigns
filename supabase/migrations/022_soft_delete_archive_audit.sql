-- Soft delete / archive / audit foundation (idempotent)
-- Same as APPLY_SOFT_DELETE_ARCHIVE.sql

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'shop_orders',
    'bookings',
    'dresses',
    'veils',
    'bridal_robes',
    'categories',
    'contact_messages',
    'notification_logs',
    'customer_notifications',
    'shipping_regions',
    'gallery_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false',
        t
      );
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ',
        t
      );
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_by UUID',
        t
      );
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ',
        t
      );
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS archived_by UUID',
        t
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_is_deleted ON %I (is_deleted)',
        t,
        t
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%s_archived_at ON %I (archived_at)',
        t,
        t
      );
    END IF;
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  actor_email TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_module_created
  ON audit_logs (module, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record
  ON audit_logs (module, record_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin all audit_logs" ON audit_logs;
CREATE POLICY "Admin all audit_logs" ON audit_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TABLE IF NOT EXISTS customer_admin_state (
  customer_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  archived_at TIMESTAMPTZ,
  archived_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_admin_state_deleted
  ON customer_admin_state (is_deleted);
CREATE INDEX IF NOT EXISTS idx_customer_admin_state_archived
  ON customer_admin_state (archived_at);

ALTER TABLE customer_admin_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin all customer_admin_state" ON customer_admin_state;
CREATE POLICY "Admin all customer_admin_state" ON customer_admin_state
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

NOTIFY pgrst, 'reload schema';
