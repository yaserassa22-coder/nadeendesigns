-- Add city column for booking form
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS city TEXT;
COMMENT ON COLUMN bookings.city IS 'Customer city (required on booking form)';
