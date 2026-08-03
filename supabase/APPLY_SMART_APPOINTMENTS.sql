-- =============================================================================
-- APPLY_SMART_APPOINTMENTS.sql
-- Smart Appointment Management. Idempotent.
-- Run in Supabase SQL Editor. Same as migrations/024_smart_appointments.sql
-- =============================================================================

-- Consultants
CREATE TABLE IF NOT EXISTS consultants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultants_active_sort
  ON consultants (active, sort_order);

ALTER TABLE consultants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active consultants" ON consultants;
CREATE POLICY "Public read active consultants" ON consultants
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Admin all consultants" ON consultants;
CREATE POLICY "Admin all consultants" ON consultants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

INSERT INTO consultants (name_ar, active, sort_order)
SELECT v.name_ar, true, v.sort_order
FROM (VALUES
  ('نادين', 0),
  ('سارة', 1),
  ('ريم', 2)
) AS v(name_ar, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM consultants c WHERE c.name_ar = v.name_ar
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_source TEXT DEFAULT 'online';
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS consultant_id UUID REFERENCES consultants(id) ON DELETE SET NULL;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_minutes INT NOT NULL DEFAULT 60;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS buffer_before INT NOT NULL DEFAULT 0;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS buffer_after INT NOT NULL DEFAULT 0;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMPTZ;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'bookings_booking_source_check'
    ) THEN
      ALTER TABLE bookings
        ADD CONSTRAINT bookings_booking_source_check
        CHECK (
          booking_source IS NULL OR booking_source IN ('online', 'phone', 'walk_in', 'admin')
        );
    END IF;

    CREATE INDEX IF NOT EXISTS idx_bookings_consultant_date
      ON bookings (consultant_id, date);
    CREATE INDEX IF NOT EXISTS idx_bookings_date_time
      ON bookings (date, time);
    CREATE INDEX IF NOT EXISTS idx_bookings_source
      ON bookings (booking_source);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS waiting_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  preferred_date DATE,
  preferred_time TIME,
  consultant_id UUID REFERENCES consultants(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'notified', 'booked', 'cancelled')),
  notify_whatsapp BOOLEAN NOT NULL DEFAULT true,
  notify_email BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waiting_list_status_created
  ON waiting_list (status, created_at);
CREATE INDEX IF NOT EXISTS idx_waiting_list_preferred_date
  ON waiting_list (preferred_date);

ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert waiting_list" ON waiting_list;
CREATE POLICY "Public insert waiting_list" ON waiting_list
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin all waiting_list" ON waiting_list;
CREATE POLICY "Admin all waiting_list" ON waiting_list
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TABLE IF NOT EXISTS special_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_date DATE NOT NULL,
  day_type TEXT NOT NULL
    CHECK (day_type IN ('holiday', 'vacation', 'maintenance', 'private_event')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (day_date)
);

CREATE INDEX IF NOT EXISTS idx_special_days_date ON special_days (day_date);

ALTER TABLE special_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read special_days" ON special_days;
CREATE POLICY "Public read special_days" ON special_days
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin all special_days" ON special_days;
CREATE POLICY "Admin all special_days" ON special_days
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

INSERT INTO settings (key, value, updated_at)
VALUES (
  'appointments',
  '{
    "opening_time": "10:00",
    "closing_time": "20:00",
    "working_days": [0, 1, 2, 3, 4, 6],
    "lunch_break": { "enabled": true, "start": "13:00", "end": "14:00" },
    "prayer_break": { "enabled": false, "start": "12:00", "end": "12:30" },
    "default_buffer_before": 0,
    "default_buffer_after": 15,
    "slot_interval_minutes": 30,
    "duration_presets": {
      "consultation": 60,
      "premium": 90,
      "fitting": 45
    },
    "reminders": {
      "enabled": true,
      "offsets": ["7d", "3d", "1d", "2h"]
    },
    "default_consultant_id": null
  }'::jsonb,
  now()
)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE consultants IS 'Smart appointments consultants (Phase D)';
COMMENT ON TABLE waiting_list IS 'Appointment waiting list when slots unavailable';
COMMENT ON TABLE special_days IS 'Blocked / holiday days for appointment availability';

-- Race mitigation: app-level overlap check + insert. Optional Postgres EXCLUDE
-- on tstzrange deferred (nullable consultant_id / legacy rows).

NOTIFY pgrst, 'reload schema';
