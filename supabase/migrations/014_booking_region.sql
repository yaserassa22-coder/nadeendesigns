-- Align bookings with form: region column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS region TEXT;

COMMENT ON COLUMN bookings.region IS 'Delivery region (required when delivery_required = true)';
COMMENT ON COLUMN bookings.city IS 'Customer city';
