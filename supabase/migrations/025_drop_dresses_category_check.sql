-- Drop obsolete hardcoded category CHECK constraints.
-- Categories are dynamic (categories table + app validation); dresses.category is TEXT slug/legacy_key.
-- Idempotent. Does NOT delete or rewrite product rows.
-- Safe to run multiple times.

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

    -- Named legacy constraint (most common)
    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
      t,
      t || '_category_check'
    );

    -- Any other CHECK on category (e.g. inline from schema.sql with a different name)
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
