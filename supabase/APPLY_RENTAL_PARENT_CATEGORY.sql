-- APPLY_RENTAL_PARENT_CATEGORY.sql
-- Same as migrations/042_rental_parent_category.sql — safe to re-run in SQL editor.

DO $$
DECLARE
  rental_id UUID;
BEGIN
  SELECT id INTO rental_id
  FROM categories
  WHERE legacy_key IN ('rental', 'rental_dresses')
     OR slug IN ('rental-dresses', 'rental_dresses')
  ORDER BY sort_order
  LIMIT 1;

  IF rental_id IS NULL THEN
    RAISE NOTICE 'rental parent category not found — skip';
    RETURN;
  END IF;

  UPDATE categories
  SET
    visible_in_navigation = false,
    show_on_homepage = false,
    updated_at = NOW()
  WHERE id = rental_id;

  UPDATE categories
  SET
    parent_id = rental_id,
    updated_at = NOW()
  WHERE id <> rental_id
    AND parent_id IS NULL
    AND (
      legacy_key IN (
        'wedding',
        'wedding_dress',
        'nouf_dresses',
        'nouf_dress'
      )
      OR slug IN (
        'wedding-dresses',
        'wedding_dresses',
        'nouf-dresses',
        'nouf_dresses'
      )
    );
END $$;
