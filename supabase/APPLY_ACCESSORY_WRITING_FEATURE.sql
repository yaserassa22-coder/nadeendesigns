-- Add generic writing personalization for all bridal accessory products.
-- Safe to run more than once.
INSERT INTO experience_features (
  id,
  name,
  name_ar,
  description,
  description_ar,
  group_key,
  maps_to,
  is_system,
  enabled,
  sort_order
)
VALUES (
  'accessory_writing',
  'Writing on Accessory',
  'إضافة كتابة',
  'Personalize the accessory with writing',
  'إضافة كتابة مخصصة على المنتج',
  'personalization',
  'personalization',
  TRUE,
  TRUE,
  25
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  group_key = EXCLUDED.group_key,
  maps_to = EXCLUDED.maps_to,
  is_system = EXCLUDED.is_system,
  enabled = EXCLUDED.enabled,
  sort_order = EXCLUDED.sort_order;

NOTIFY pgrst, 'reload schema';
