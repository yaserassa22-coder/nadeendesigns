-- =============================================================================
-- APPLY_DROP_CATEGORY_CHECK.sql
-- Run in Supabase → SQL Editor if APPLY_ALL is not used.
-- Same as migrations/025_drop_dresses_category_check.sql
--
-- Removes obsolete dresses_category_check (and sibling category CHECKs).
-- Preserves all product data. Does NOT recreate a hardcoded CHECK.
-- Safe to run multiple times.
-- =============================================================================

DO $$
DECLARE
  r RECORD;
  t TEXT;
  tables TEXT[] := ARRAY['dresses', 'veils', 'bridal_robes'];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
      t,
      t || '_category_check'
    );

    FOR r IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class rel ON rel.oid = c.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = t
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%category%'
    LOOP
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', t, r.conname);
    END LOOP;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
