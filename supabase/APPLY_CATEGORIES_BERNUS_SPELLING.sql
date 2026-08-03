-- Fix category labels to official spelling: برنص العروس
-- Safe / idempotent.

UPDATE categories
SET
  name_ar = REPLACE(name_ar, 'برنس', 'برنص'),
  description_ar = REPLACE(description_ar, 'برنس', 'برنص'),
  updated_at = now()
WHERE name_ar LIKE '%برنس%' OR description_ar LIKE '%برنس%';

-- Optional: product text (already mostly برنص in live data)
UPDATE bridal_robes
SET
  name_ar = REPLACE(name_ar, 'برنس', 'برنص'),
  description_ar = REPLACE(description_ar, 'برنس', 'برنص'),
  updated_at = now()
WHERE name_ar LIKE '%برنس%' OR description_ar LIKE '%برنس%';

SELECT slug, name_ar, description_ar
FROM categories
WHERE slug IN ('robes', 'bridal-accessories')
ORDER BY slug;
