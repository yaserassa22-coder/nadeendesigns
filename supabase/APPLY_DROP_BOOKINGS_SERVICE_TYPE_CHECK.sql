-- =============================================================================
-- APPLY_DROP_BOOKINGS_SERVICE_TYPE_CHECK.sql
-- Run in Supabase → SQL Editor if APPLY_ALL is not used, OR immediately if
-- APPLY_ALL fails with bookings_service_type_check "violated by some row" (that
-- error means a STALE script tried to ADD CONSTRAINT — run this DROP-only
-- file instead, then re-paste the latest APPLY_ALL from the repo).
-- Same as migrations/026_drop_bookings_service_type_check.sql
--
-- Removes obsolete bookings_service_type_check.
-- Preserves all booking rows. Does NOT recreate a hardcoded CHECK.
-- Validation stays in the app (Zod). Safe to run multiple times.
-- =============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bookings'
  ) THEN
    RETURN;
  END IF;

  ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;

  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'bookings'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%service_type%'
  LOOP
    EXECUTE format('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
