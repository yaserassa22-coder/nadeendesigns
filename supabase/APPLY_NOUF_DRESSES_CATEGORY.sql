-- =============================================================================
-- RUN IN SUPABASE → SQL Editor  (REQUIRED for saving فساتين نوف)
-- Without this, POST /api/dresses with category=nouf_dresses fails with
-- check constraint dresses_category_check (HTTP 400).
-- Safe to run multiple times.
-- =============================================================================

ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_category_check;

UPDATE dresses
SET category = 'nouf_dresses',
    updated_at = now()
WHERE category IN ('wedding', 'wedding_dress', 'nouf_dress')
  AND (
    category = 'nouf_dress'
    OR name_ar ILIKE '%نوف%'
    OR name_ar ILIKE '%nouf%'
    OR description_ar ILIKE '%نوف%'
  );

UPDATE dresses
SET category = 'wedding',
    updated_at = now()
WHERE category = 'wedding_dress';

UPDATE dresses
SET category = 'nouf_dresses',
    updated_at = now()
WHERE category = 'nouf_dress';

ALTER TABLE dresses
  ADD CONSTRAINT dresses_category_check
  CHECK (category IN ('wedding', 'rental', 'custom_design', 'nouf_dresses'));

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_service_type_check
  CHECK (
    service_type IN (
      'wedding_dress',
      'rental_dress',
      'custom_design',
      'nouf_dresses',
      'nouf_dress',
      'veil',
      'bridal_cape',
      'fitting',
      'consultation',
      'rental',
      'purchase'
    )
  );

UPDATE bookings
SET service_type = 'nouf_dresses'
WHERE service_type = 'nouf_dress';
