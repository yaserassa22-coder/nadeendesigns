-- Independent category: فساتين نوف (nouf_dresses)
-- Wedding dresses stay as: wedding
-- Safe to run multiple times.

ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_category_check;

-- Move legacy / misclassified Nouf products out of wedding
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

-- Normalize any remaining wedding_dress → wedding
UPDATE dresses
SET category = 'wedding',
    updated_at = now()
WHERE category = 'wedding_dress';

-- Ensure nouf_dress (singular legacy) → nouf_dresses
UPDATE dresses
SET category = 'nouf_dresses',
    updated_at = now()
WHERE category = 'nouf_dress';

-- Do NOT recreate dresses_category_check (dynamic categories; see migration 025)

-- Booking service_type CHECK obsolete (app Zod; see 026) — drop only, never re-ADD.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;

UPDATE bookings
SET service_type = 'nouf_dresses'
WHERE service_type = 'nouf_dress';
