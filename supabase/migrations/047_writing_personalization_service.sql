-- Seed writing personalization into the global services library (مكتبة الخدمات).
-- Idempotent — safe on re-run. Price is managed in Admin → Store Settings → Services.

INSERT INTO store_services (
  id, name, name_ar, description, description_ar,
  pricing_mode, price, enabled, visible, required, default_selected,
  available_online, available_in_store, sort_order, visibility
)
VALUES
  (
    'writing_personalization',
    'Writing Personalization',
    'تخصيص الكتابة',
    'Fee charged when the customer adds writing personalization',
    'رسوم تُحتسب عند إضافة تخصيص الكتابة',
    'FREE',
    0,
    FALSE,
    TRUE,
    FALSE,
    FALSE,
    TRUE,
    FALSE,
    0,
    '{"scope":"all"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;
