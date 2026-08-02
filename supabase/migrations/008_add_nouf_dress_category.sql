-- Add فستان نوف (nouf_dress) to dresses category check
ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_category_check;
ALTER TABLE dresses
  ADD CONSTRAINT dresses_category_check
  CHECK (category IN ('wedding', 'rental', 'custom_design', 'nouf_dress'));

-- Allow booking service type for نوف dresses
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_service_type_check
  CHECK (
    service_type IN (
      'wedding_dress',
      'rental_dress',
      'custom_design',
      'nouf_dress',
      'veil',
      'bridal_cape',
      'fitting',
      'consultation',
      'rental',
      'purchase'
    )
  );
