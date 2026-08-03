-- =============================================================================
-- APPLY_REPORTS.sql
-- Report schedules + helpful report indexes. Idempotent.
-- Run in Supabase SQL Editor. Same as migrations/023_report_schedules.sql
--
-- FUTURE-READY: report_schedules stores daily/weekly/monthly email jobs.
-- No cron runner is included — schedules will not auto-send until a runner
-- is deployed. Use the admin Reports → Email flow for manual sends.
-- =============================================================================

CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  report_type TEXT NOT NULL,
  email TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_enabled
  ON report_schedules (enabled, frequency);

CREATE INDEX IF NOT EXISTS idx_report_schedules_report_type
  ON report_schedules (report_type);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'shop_orders'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_shop_orders_created_at ON shop_orders (created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_shop_orders_status_created ON shop_orders (status, created_at DESC)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bookings'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON bookings (status, created_at DESC)';
  END IF;
END $$;

ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin all report_schedules" ON report_schedules;
CREATE POLICY "Admin all report_schedules" ON report_schedules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

COMMENT ON TABLE report_schedules IS
  'Scheduled report email jobs. Future-ready: no cron/runner yet — CRUD + API only; do not auto-send until a schedule runner is deployed.';

NOTIFY pgrst, 'reload schema';
