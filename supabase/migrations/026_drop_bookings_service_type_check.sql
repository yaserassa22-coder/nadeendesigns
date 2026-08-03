-- Drop obsolete hardcoded bookings_service_type_check.
-- Service types are validated in the app (Zod BOOKING_SERVICE_TYPES); the DB list
-- was repeatedly expanded (nouf_dress → nouf_dresses, etc.) and APPLY_ALL's early
-- incomplete ADD fails on existing rows (e.g. nouf_dresses).
-- Idempotent. Does NOT delete or rewrite booking rows. Does NOT recreate the CHECK.
-- Safe to run multiple times.

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

  -- Any other CHECK on service_type (e.g. inline from schema.sql with a different name)
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
