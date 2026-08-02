-- Add custom_design and keep robes (برنص عروس)
-- Prefer running 002_booking_delivery_and_service_types.sql for full update

ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_category_check;

ALTER TABLE dresses
  ADD CONSTRAINT dresses_category_check
  CHECK (category IN ('wedding', 'rental', 'custom_design', 'veils', 'robes'));
