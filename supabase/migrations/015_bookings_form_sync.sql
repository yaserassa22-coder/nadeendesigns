-- Sync bookings columns with booking form + POST /api/bookings payload
-- Safe to run multiple times.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS time TIME;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dress_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_required BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_region TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_city TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_status TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS personalization JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gift_options JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_service_type_check
  CHECK (
    service_type IS NULL
    OR service_type IN (
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

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (
    status IS NULL
    OR status IN ('pending', 'confirmed', 'cancelled', 'completed')
  );

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_delivery_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_delivery_status_check
  CHECK (
    delivery_status IS NULL
    OR delivery_status IN ('pending', 'preparing', 'out_for_delivery', 'delivered')
  );

NOTIFY pgrst, 'reload schema';
