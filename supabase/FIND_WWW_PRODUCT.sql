-- Locate a product across all product tables by name (case-insensitive).
-- Replace 'WWW' with the actual product name if needed.

SELECT 'dresses' AS source, id, name_ar, category_id, is_available
FROM dresses WHERE name_ar ILIKE '%WWW%' OR name_en ILIKE '%WWW%'
UNION ALL
SELECT 'veils', id, name_ar, NULL, is_available
FROM veils WHERE name_ar ILIKE '%WWW%' OR name_en ILIKE '%WWW%'
UNION ALL
SELECT 'bridal_robes', id, name_ar, NULL, is_available
FROM bridal_robes WHERE name_ar ILIKE '%WWW%' OR name_en ILIKE '%WWW%'
UNION ALL
SELECT 'accessory_items', id, name_ar, category_id, is_available
FROM accessory_items WHERE name_ar ILIKE '%WWW%' OR name_en ILIKE '%WWW%';

-- Also check the sub-category's configured product_kind (should be
-- 'accessory_item' for it to route to the generic manager/table):
SELECT id, name_ar, slug, parent_id, product_kind
FROM categories
WHERE name_ar ILIKE '%WWW%' OR slug ILIKE '%www%';
