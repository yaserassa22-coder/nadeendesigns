-- =============================================================================
-- RUN IN SUPABASE → SQL Editor
-- Booking form fixes: city column + service_type constraint
-- Safe to run multiple times.
-- =============================================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS region TEXT;

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

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_delivery_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_delivery_status_check
  CHECK (
    delivery_status IS NULL
    OR delivery_status IN ('pending', 'preparing', 'out_for_delivery', 'delivered')
  );

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS personalization JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gift_options JSONB;

COMMENT ON COLUMN bookings.city IS 'Customer city (required on booking form)';
