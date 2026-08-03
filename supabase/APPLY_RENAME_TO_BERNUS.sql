-- Official naming: برنص العروس (not برنس العروس)
-- Run in Supabase SQL Editor. Idempotent via REPLACE.

-- Product catalog
UPDATE bridal_robes
SET
  name_ar = REPLACE(name_ar, 'برنس', 'برنص'),
  description_ar = REPLACE(description_ar, 'برنس', 'برنص'),
  color = CASE WHEN color IS NULL THEN NULL ELSE REPLACE(color, 'برنس', 'برنص') END,
  material = CASE WHEN material IS NULL THEN NULL ELSE REPLACE(material, 'برنس', 'برنص') END,
  size = CASE WHEN size IS NULL THEN NULL ELSE REPLACE(size, 'برنس', 'برنص') END,
  updated_at = now()
WHERE
  name_ar LIKE '%برنس%'
  OR description_ar LIKE '%برنس%'
  OR COALESCE(color, '') LIKE '%برنس%'
  OR COALESCE(material, '') LIKE '%برنس%'
  OR COALESCE(size, '') LIKE '%برنس%';

UPDATE veils
SET
  name_ar = REPLACE(name_ar, 'برنس', 'برنص'),
  description_ar = REPLACE(description_ar, 'برنس', 'برنص'),
  updated_at = now()
WHERE name_ar LIKE '%برنس%' OR description_ar LIKE '%برنس%';

UPDATE dresses
SET
  name_ar = REPLACE(name_ar, 'برنس', 'برنص'),
  description_ar = REPLACE(description_ar, 'برنس', 'برنص'),
  updated_at = now()
WHERE name_ar LIKE '%برنس%' OR description_ar LIKE '%برنس%';

UPDATE categories
SET
  name_ar = REPLACE(name_ar, 'برنس', 'برنص'),
  description_ar = REPLACE(description_ar, 'برنس', 'برنص'),
  updated_at = now()
WHERE name_ar LIKE '%برنس%' OR description_ar LIKE '%برنس%';

UPDATE gallery_items
SET
  title_ar = REPLACE(title_ar, 'برنس', 'برنص'),
  category = REPLACE(category, 'برنس', 'برنص')
WHERE title_ar LIKE '%برنس%' OR category LIKE '%برنس%';

-- Shop order line items (JSONB)
UPDATE shop_orders
SET items = REPLACE(items::text, 'برنس', 'برنص')::jsonb
WHERE items::text LIKE '%برنس%';

UPDATE shop_orders
SET notes = REPLACE(notes, 'برنس', 'برنص')
WHERE notes LIKE '%برنس%';

-- Bookings free text / JSON
UPDATE bookings
SET notes = REPLACE(notes, 'برنس', 'برنص')
WHERE notes LIKE '%برنس%';

UPDATE bookings
SET personalization = REPLACE(personalization::text, 'برنس', 'برنص')::jsonb
WHERE personalization IS NOT NULL AND personalization::text LIKE '%برنس%';

UPDATE bookings
SET gift_options = REPLACE(gift_options::text, 'برنس', 'برنص')::jsonb
WHERE gift_options IS NOT NULL AND gift_options::text LIKE '%برنس%';

-- Settings JSON blob (if any Arabic copy stored there)
UPDATE settings
SET value = REPLACE(value::text, 'برنس', 'برنص')::jsonb
WHERE value::text LIKE '%برنس%';

-- Verification
SELECT 'bridal_robes' AS src, COUNT(*) AS still_has_wrong
FROM bridal_robes
WHERE name_ar LIKE '%برنس%' OR description_ar LIKE '%برنس%'
UNION ALL
SELECT 'categories', COUNT(*)
FROM categories
WHERE name_ar LIKE '%برنس%' OR description_ar LIKE '%برنس%'
UNION ALL
SELECT 'shop_orders', COUNT(*)
FROM shop_orders
WHERE items::text LIKE '%برنس%' OR COALESCE(notes, '') LIKE '%برنس%';
