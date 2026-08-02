-- Optional premium gift wrapping & gift card for veils / bridal robes
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS gift_options JSONB;

COMMENT ON COLUMN bookings.gift_options IS
  'Optional gift wrapping and gift card payload for veils/robes';
