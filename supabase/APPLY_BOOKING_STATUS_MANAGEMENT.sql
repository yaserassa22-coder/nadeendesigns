-- APPLY_BOOKING_STATUS_MANAGEMENT.sql
-- Same as migrations/043_booking_status_management.sql — safe to re-run.

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (
    status IS NULL
    OR status IN (
      'pending',
      'confirmed',
      'rescheduled',
      'cancelled',
      'completed'
    )
  );

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS last_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_reply_status TEXT,
  ADD COLUMN IF NOT EXISTS last_reply_subject TEXT,
  ADD COLUMN IF NOT EXISTS last_reply_by TEXT,
  ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;
