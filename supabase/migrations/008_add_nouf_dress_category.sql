-- Legacy: once added nouf_dress to dresses_category_check.
-- Category CHECK dropped permanently (dynamic categories; see 016 / 025).
-- Booking service_type CHECK dropped permanently (app Zod; see 026).
ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_category_check;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;
