-- APPLY_CATEGORY_NAVIGATION.sql — Sprint N1 category nav settings (standalone paste)
-- Same as: supabase/migrations/033_category_navigation_settings.sql
-- Prefer APPLY_ALL.sql section 36 on fresh setups. Safe to re-run.

-- Sprint N1: Luxury Navigation — category display settings
-- Idempotent. Safe to re-run.
--
-- Published visibility remains `is_visible` (clear existing column).
-- Adds navigation / homepage / featured flags for DB-driven storefront nav.
-- Soft-delete / archive filters stay in the app (is_deleted / archived_at).

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS visible_in_navigation BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS show_on_homepage BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS featured_collection BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing published (visible) categories → nav + homepage on.
UPDATE categories
SET
  visible_in_navigation = true,
  show_on_homepage = true
WHERE is_visible = true
  AND (
    visible_in_navigation IS DISTINCT FROM true
    OR show_on_homepage IS DISTINCT FROM true
  );

CREATE INDEX IF NOT EXISTS idx_categories_visible_in_navigation
  ON categories (visible_in_navigation)
  WHERE visible_in_navigation = true;

CREATE INDEX IF NOT EXISTS idx_categories_show_on_homepage
  ON categories (show_on_homepage)
  WHERE show_on_homepage = true;

CREATE INDEX IF NOT EXISTS idx_categories_featured_collection
  ON categories (featured_collection)
  WHERE featured_collection = true;

NOTIFY pgrst, 'reload schema';
