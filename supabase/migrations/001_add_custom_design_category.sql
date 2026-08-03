-- Add custom_design and keep robes (برنص عروس)
-- Prefer running 002_booking_delivery_and_service_types.sql for full update
-- Hardcoded dresses_category_check removed: categories are dynamic (see 016 / 025).

ALTER TABLE dresses DROP CONSTRAINT IF EXISTS dresses_category_check;
