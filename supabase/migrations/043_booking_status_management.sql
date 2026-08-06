-- 043_booking_status_management.sql
-- Add rescheduled status + reply/history metadata for Admin booking workflow.
-- Safe to re-run.

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

COMMENT ON COLUMN bookings.last_reply_at IS 'When Admin last emailed the customer about this booking';
COMMENT ON COLUMN bookings.last_reply_status IS 'sent | failed | skipped';
COMMENT ON COLUMN bookings.status_history IS 'Append-only [{status,at,by,action,note}]';
