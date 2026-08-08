-- Optional Hebrew product/category labels for AR/HE/EN storefront.
-- Safe to re-run. Falls back to name_ar in app when empty.

ALTER TABLE dresses ADD COLUMN IF NOT EXISTS name_he TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_he TEXT;
ALTER TABLE veils ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE veils ADD COLUMN IF NOT EXISTS name_he TEXT;
ALTER TABLE bridal_robes ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE bridal_robes ADD COLUMN IF NOT EXISTS name_he TEXT;

ALTER TABLE shipping_regions ADD COLUMN IF NOT EXISTS name_he TEXT;
ALTER TABLE shipping_regions ADD COLUMN IF NOT EXISTS estimated_delivery_he TEXT;
ALTER TABLE shipping_regions ADD COLUMN IF NOT EXISTS estimated_delivery_en TEXT;

COMMENT ON COLUMN dresses.name_he IS 'Optional Hebrew product name for locale=he';
COMMENT ON COLUMN shipping_regions.name_he IS 'Optional Hebrew region name for locale=he';
