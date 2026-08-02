-- Structured personalization for veils & bridal robes (برنص عروس)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS personalization JSONB;

COMMENT ON COLUMN bookings.personalization IS
  'Optional veil/robe embroidery personalization payload';
