-- Categories + booking delivery fields + expanded service types
-- Safe to run on existing databases

-- 1) Dress categories — drop obsolete CHECK only (dynamic categories; see 016 / 025)
ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_category_check;

-- 2) Booking service_type — drop obsolete CHECK only (app Zod validates; see 026).
-- Do NOT ADD CONSTRAINT bookings_service_type_check (incomplete lists fail on live rows).
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;

-- 3) Delivery fields
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS delivery_required BOOLEAN DEFAULT false;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS delivery_region TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS delivery_city TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS delivery_address TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS delivery_phone TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS delivery_status TEXT;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_delivery_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_delivery_status_check
  CHECK (
    delivery_status IS NULL
    OR delivery_status IN ('pending', 'preparing', 'out_for_delivery', 'delivered')
  );

CREATE INDEX IF NOT EXISTS idx_bookings_delivery ON bookings(delivery_required);
