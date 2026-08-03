-- Customer notification channel preferences (checkout + booking)
-- Safe to re-run. Existing rows default to both channels enabled.

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS notify_whatsapp BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS notify_whatsapp BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN shop_orders.notify_whatsapp IS
  'Customer opted in to WhatsApp order updates';
COMMENT ON COLUMN shop_orders.notify_email IS
  'Customer opted in to email order updates';
COMMENT ON COLUMN bookings.notify_whatsapp IS
  'Customer opted in to WhatsApp booking updates';
COMMENT ON COLUMN bookings.notify_email IS
  'Customer opted in to email booking updates';

NOTIFY pgrst, 'reload schema';
