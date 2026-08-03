-- Legacy: once added nouf_dress to dresses_category_check.
-- CHECK dropped permanently (dynamic categories; see 016 / 025); keep booking service_type widen.
ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_category_check;

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
