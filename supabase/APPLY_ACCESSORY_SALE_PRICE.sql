-- APPLY: veil / bridal_robe sale_price (sync with dresses)
-- Idempotent — safe to re-run in Supabase SQL Editor.

ALTER TABLE public.veils
  ADD COLUMN IF NOT EXISTS sale_price numeric(12, 2);

ALTER TABLE public.bridal_robes
  ADD COLUMN IF NOT EXISTS sale_price numeric(12, 2);
