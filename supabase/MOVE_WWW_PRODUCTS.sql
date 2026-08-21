-- Actually move the "WWW" sub-category product(s) from `dresses` into
-- `accessory_items` so they show up in the Bridal Accessories editorial
-- slideshow / collection (which reads veils + bridal_robes + accessory_items,
-- never `dresses`).

-- 1) Preview what will be moved.
SELECT id, name_ar, category_id, price, images, is_available
FROM dresses
WHERE category_id = '3bc60a26-e70b-41b8-bc87-c6586e892dd4';

-- 2) Copy them into accessory_items.
-- Note: dresses has no `material` or `stock_quantity` column — map style →
-- material, default stock to 1, and default a null price to 0 (accessory_items
-- requires price NOT NULL). Update the price afterwards in the admin manager.
INSERT INTO accessory_items (
  category_id, name_ar, name_en, name_he, description_ar, price, sale_price,
  images, color, material, size, stock_quantity, is_available, is_featured,
  product_type
)
SELECT
  category_id, name_ar, name_en, name_he, description_ar, COALESCE(price, 0), sale_price,
  images, color, style, size, 1, is_available,
  is_featured, 'bridal_accessory'
FROM dresses
WHERE category_id = '3bc60a26-e70b-41b8-bc87-c6586e892dd4';

-- 3) Remove the now-duplicated rows from `dresses`.
DELETE FROM dresses WHERE category_id = '3bc60a26-e70b-41b8-bc87-c6586e892dd4';

-- 4) Confirm the move.
SELECT id, name_ar, category_id, price, is_available
FROM accessory_items
WHERE category_id = '3bc60a26-e70b-41b8-bc87-c6586e892dd4';
