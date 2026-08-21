-- Fix the "WWW" sub-category: it was created with product_kind = NULL, so its
-- admin link fell back to /admin/dresses and the product got saved into the
-- `dresses` table instead of `accessory_items`.

-- 0) The categories_product_kind_check constraint predates accessory_item —
--    widen it first or the UPDATE below fails with a check-constraint error.
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_product_kind_check;
ALTER TABLE categories
  ADD CONSTRAINT categories_product_kind_check
  CHECK (
    product_kind IS NULL
    OR product_kind IN (
      'dress',
      'veil',
      'bridal_robe',
      'accessories_group',
      'accessory_item'
    )
  );

-- 1) Correct the category kind so it now routes to the generic accessory manager.
UPDATE categories
SET product_kind = 'accessory_item'
WHERE id = '3bc60a26-e70b-41b8-bc87-c6586e892dd4';

-- 2) Find the product(s) that were wrongly saved under this category in `dresses`.
SELECT id, name_ar, category_id, price, images, is_available
FROM dresses
WHERE category_id = '3bc60a26-e70b-41b8-bc87-c6586e892dd4';

-- 3) Move them into accessory_items (adjust columns/values as needed), then
--    delete the dresses row. Run only after reviewing step 2's output.
-- INSERT INTO accessory_items (
--   category_id, name_ar, name_en, name_he, description_ar, price, sale_price,
--   images, color, material, size, stock_quantity, is_available, is_featured,
--   product_type
-- )
-- SELECT
--   category_id, name_ar, name_en, name_he, description_ar, price, sale_price,
--   images, color, material, size, COALESCE(stock_quantity, 0), is_available,
--   is_featured, 'bridal_accessory'
-- FROM dresses
-- WHERE category_id = '3bc60a26-e70b-41b8-bc87-c6586e892dd4';
--
-- DELETE FROM dresses WHERE category_id = '3bc60a26-e70b-41b8-bc87-c6586e892dd4';
