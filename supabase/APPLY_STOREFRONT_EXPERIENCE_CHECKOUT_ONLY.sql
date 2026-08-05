-- APPLY_STOREFRONT_EXPERIENCE_CHECKOUT_ONLY.sql
-- Manual apply for Sprint 2A MASTER Final (mirrors migration 039).
-- Product Experience PDP never collects order options / delivery / notes.

UPDATE product_experience_templates
SET
  description_ar = 'تجربة شراء مناسبة للهدايا — خدمات + تغليف + ملخص السعر',
  config = '{
    "sections": [
      {"id":"extra_services","enabled":true,"collapsed":false,"sort_order":0,"title_ar":"خدمات إضافية","title":"Extra Services","description":"","description_ar":""},
      {"id":"gift_options","enabled":true,"collapsed":false,"sort_order":1,"title_ar":"تغليف هدية","title":"Gift Options","description":"","description_ar":""},
      {"id":"personalization","enabled":false,"collapsed":true,"sort_order":2,"title_ar":"تخصيص الكتابة","title":"Personalization","description":"","description_ar":""},
      {"id":"summary","enabled":true,"collapsed":false,"sort_order":3,"title_ar":"ملخص السعر","title":"Summary","description":"","description_ar":""},
      {"id":"order_options","enabled":false,"collapsed":true,"sort_order":4,"title_ar":"خيارات الطلب","title":"Order Options","description":"Checkout only","description_ar":"عند الدفع فقط"},
      {"id":"delivery","enabled":false,"collapsed":true,"sort_order":5,"title_ar":"التوصيل","title":"Delivery","description":"Checkout only","description_ar":"عند الدفع فقط"},
      {"id":"order_notes","enabled":false,"collapsed":true,"sort_order":6,"title_ar":"ملاحظات الطلب","title":"Order Notes","description":"Checkout only","description_ar":"عند الدفع فقط"}
    ]
  }'::jsonb,
  updated_at = NOW()
WHERE slug = 'gift' AND is_system = TRUE;

UPDATE product_experience_templates
SET
  description_ar = 'تجربة إكسسوارات العروس — تخصيص + خدمات + ملخص',
  config = '{
    "sections": [
      {"id":"personalization","enabled":true,"collapsed":false,"sort_order":0,"title_ar":"تخصيص الكتابة","title":"Personalization","description":"","description_ar":""},
      {"id":"gift_options","enabled":true,"collapsed":true,"sort_order":1,"title_ar":"تغليف هدية","title":"Gift Options","description":"","description_ar":""},
      {"id":"extra_services","enabled":true,"collapsed":false,"sort_order":2,"title_ar":"خدمات إضافية","title":"Extra Services","description":"","description_ar":""},
      {"id":"summary","enabled":true,"collapsed":false,"sort_order":3,"title_ar":"ملخص السعر","title":"Summary","description":"","description_ar":""},
      {"id":"order_options","enabled":false,"collapsed":true,"sort_order":4,"title_ar":"خيارات الطلب","title":"Order Options","description":"Checkout only","description_ar":"عند الدفع فقط"},
      {"id":"delivery","enabled":false,"collapsed":true,"sort_order":5,"title_ar":"التوصيل","title":"Delivery","description":"Checkout only","description_ar":"عند الدفع فقط"},
      {"id":"order_notes","enabled":false,"collapsed":true,"sort_order":6,"title_ar":"ملاحظات الطلب","title":"Order Notes","description":"Checkout only","description_ar":"عند الدفع فقط"}
    ]
  }'::jsonb,
  updated_at = NOW()
WHERE slug = 'accessory' AND is_system = TRUE;

UPDATE product_experience_templates
SET
  description_ar = 'تجربة بسيطة للمنتجات الجاهزة — خدمات + ملخص',
  config = '{
    "sections": [
      {"id":"extra_services","enabled":true,"collapsed":false,"sort_order":0,"title_ar":"خدمات إضافية","title":"Extra Services","description":"","description_ar":""},
      {"id":"gift_options","enabled":false,"collapsed":true,"sort_order":1,"title_ar":"تغليف هدية","title":"Gift Options","description":"","description_ar":""},
      {"id":"personalization","enabled":false,"collapsed":true,"sort_order":2,"title_ar":"تخصيص الكتابة","title":"Personalization","description":"","description_ar":""},
      {"id":"summary","enabled":true,"collapsed":false,"sort_order":3,"title_ar":"ملخص السعر","title":"Summary","description":"","description_ar":""},
      {"id":"order_options","enabled":false,"collapsed":true,"sort_order":4,"title_ar":"خيارات الطلب","title":"Order Options","description":"Checkout only","description_ar":"عند الدفع فقط"},
      {"id":"delivery","enabled":false,"collapsed":true,"sort_order":5,"title_ar":"التوصيل","title":"Delivery","description":"Checkout only","description_ar":"عند الدفع فقط"},
      {"id":"order_notes","enabled":false,"collapsed":true,"sort_order":6,"title_ar":"ملاحظات الطلب","title":"Order Notes","description":"Checkout only","description_ar":"عند الدفع فقط"}
    ]
  }'::jsonb,
  updated_at = NOW()
WHERE slug = 'ready_to_buy' AND is_system = TRUE;

NOTIFY pgrst, 'reload schema';
