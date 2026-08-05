-- Sync: sale_price on veils / bridal_robes (matches dresses).
-- Apply via Supabase SQL editor or APPLY_ACCESSORY_SALE_PRICE.sql.

ALTER TABLE public.veils
  ADD COLUMN IF NOT EXISTS sale_price numeric(12, 2);

ALTER TABLE public.bridal_robes
  ADD COLUMN IF NOT EXISTS sale_price numeric(12, 2);

COMMENT ON COLUMN public.veils.sale_price IS
  'Optional sale price; when set and lower than price, storefront shows sale UI.';
COMMENT ON COLUMN public.bridal_robes.sale_price IS
  'Optional sale price; when set and lower than price, storefront shows sale UI.';
