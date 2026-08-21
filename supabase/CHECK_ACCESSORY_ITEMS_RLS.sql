-- Quick diagnostic: run in Supabase SQL editor to confirm the public
-- storefront can actually read accessory_items rows (RLS check).

-- 1) Confirm the table + row exist
SELECT id, category_id, name_ar, is_available, is_deleted, archived_at
FROM accessory_items
ORDER BY created_at DESC
LIMIT 20;

-- 2) Confirm RLS is enabled and the public SELECT policy exists
SELECT polname, polcmd, polroles
FROM pg_policy
WHERE polrelid = 'accessory_items'::regclass;

-- Expect a row named "Public read accessory_items" with polcmd = 'r'.
-- If it's missing, re-run APPLY_GENERIC_ACCESSORY_ITEMS.sql.
