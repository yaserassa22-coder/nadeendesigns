-- =============================================================================
-- RUN ONCE IN SUPABASE → SQL Editor
-- Syncs bookings table with every field submitted by the booking form / API.
-- Safe to run multiple times (IF NOT EXISTS).
-- =============================================================================

-- Core contact + appointment
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS time TIME;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dress_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT;

-- Location
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS region TEXT;

-- Delivery
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_required BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_region TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_city TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_status TEXT;

-- JSON extras from form (personalization / gift)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS personalization JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gift_options JSONB;

-- Workflow
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Service types: drop obsolete CHECK only (app Zod; see 026). Never re-ADD.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check;

-- Status check
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (
    status IS NULL
    OR status IN ('pending', 'confirmed', 'cancelled', 'completed')
  );

-- Delivery status check
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_delivery_status_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_delivery_status_check
  CHECK (
    delivery_status IS NULL
    OR delivery_status IN ('pending', 'preparing', 'out_for_delivery', 'delivered')
  );

-- Optional FK (only if dresses table exists and dress_id has no FK yet)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dresses'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND constraint_name = 'bookings_dress_id_fkey'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_dress_id_fkey
      FOREIGN KEY (dress_id) REFERENCES dresses(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN bookings.city IS 'Customer city (booking form)';
COMMENT ON COLUMN bookings.region IS 'Delivery region (required when delivery_required)';
COMMENT ON COLUMN bookings.delivery_address IS 'Delivery address (required when delivery_required)';
COMMENT ON COLUMN bookings.personalization IS 'Optional veil/robe embroidery JSON';
COMMENT ON COLUMN bookings.gift_options IS 'Optional gift wrapping JSON';

-- Reload PostgREST schema cache (fixes "Could not find the column" after ALTER)
NOTIFY pgrst, 'reload schema';
