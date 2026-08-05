-- APPLY_STORE_SETTINGS.sql — Sprint S1 Store Settings (standalone paste)
-- Same as: supabase/migrations/034_store_settings.sql
-- Prefer APPLY_ALL.sql section 37 on fresh setups. Safe to re-run.
--
-- Architecture: settings.key = 'store' JSONB bag (payment providers inside JSON).
-- No new tables. Secrets never stored — env refs + configured flags only.

INSERT INTO settings (key, value, updated_at)
VALUES (
  'store',
  jsonb_build_object(
    'general', jsonb_build_object(
      'store_name', 'Nadeen Designs',
      'description', 'Luxury bridal boutique',
      'description_ar', 'بوتيك فاخر لفساتين الزفاف والإكسسوارات',
      'logo_url', '',
      'favicon_url', '',
      'business_email', 'hello@nadeendesigns.com',
      'business_phone', '+966500000000',
      'business_address', 'Riyadh, Saudi Arabia',
      'business_address_ar', 'الرياض، المملكة العربية السعودية',
      'working_hours', 'Sat–Thu 10:00–21:00',
      'working_hours_ar', 'السبت - الخميس: 10:00 ص - 9:00 م',
      'currency', 'ILS',
      'language', 'ar',
      'timezone', 'Asia/Jerusalem'
    ),
    'payments', jsonb_build_object(
      'providers', jsonb_build_array(
        jsonb_build_object(
          'id', 'cod',
          'name', 'Cash on Delivery',
          'name_ar', 'الدفع عند الاستلام',
          'enabled', true,
          'coming_soon', false,
          'sort_order', 0,
          'icon', 'banknote',
          'description', 'Pay when you receive your order',
          'description_ar', 'ادفعي عند استلام طلبكِ من البوتيك أو مع المندوب',
          'configuration', '{}'::jsonb,
          'secret_env_ref', null,
          'configured', true
        ),
        jsonb_build_object(
          'id', 'stripe',
          'name', 'Stripe',
          'name_ar', 'سترايب',
          'enabled', false,
          'coming_soon', true,
          'sort_order', 1,
          'icon', 'credit-card',
          'description', 'Cards via Stripe',
          'description_ar', 'بطاقات عبر سترايب — قريباً',
          'configuration', '{}'::jsonb,
          'secret_env_ref', 'STRIPE_SECRET_KEY',
          'configured', false
        ),
        jsonb_build_object(
          'id', 'paypal',
          'name', 'PayPal',
          'name_ar', 'باي بال',
          'enabled', false,
          'coming_soon', true,
          'sort_order', 2,
          'icon', 'wallet',
          'description', 'PayPal checkout',
          'description_ar', 'باي بال — قريباً',
          'configuration', '{}'::jsonb,
          'secret_env_ref', 'PAYPAL_CLIENT_SECRET',
          'configured', false
        ),
        jsonb_build_object(
          'id', 'tranzila',
          'name', 'Tranzila',
          'name_ar', 'ترانزيلا',
          'enabled', false,
          'coming_soon', true,
          'sort_order', 3,
          'icon', 'credit-card',
          'description', 'Israeli payment gateway',
          'description_ar', 'بوابة ترانزيلا — قريباً',
          'configuration', '{}'::jsonb,
          'secret_env_ref', 'TRANZILA_API_KEY',
          'configured', false
        )
      )
    ),
    'shipping', jsonb_build_object(
      'shipping_enabled', true,
      'shipping_flat_fee', 0,
      'shipping_free_threshold', 0,
      'boutique_pickup_enabled', true,
      'delivery_enabled', true,
      'estimated_delivery_ar', ''
    ),
    'contact', jsonb_build_object(
      'phone', '+966500000000',
      'email', 'hello@nadeendesigns.com',
      'whatsapp', '966500000000',
      'instagram_url', 'https://www.instagram.com/nadeendesign_/',
      'facebook_url', '',
      'tiktok_url', '',
      'location_ar', 'الرياض، المملكة العربية السعودية',
      'google_maps_url', ''
    ),
    'social', jsonb_build_object(
      'instagram_url', 'https://www.instagram.com/nadeendesign_/',
      'facebook_url', '',
      'tiktok_url', '',
      'pinterest_url', '',
      'youtube_url', ''
    ),
    'homepage', jsonb_build_object(
      'hero', true,
      'featured_categories', true,
      'featured_products', true,
      'collections', true,
      'testimonials', false,
      'instagram', true,
      'newsletter', false
    ),
    'authentication', jsonb_build_object(
      'guest_checkout_enabled', true,
      'google_enabled', true,
      'apple_enabled', true,
      'email_password_enabled', true,
      'phone_otp_enabled', true,
      'registration_enabled', true
    ),
    'notifications', jsonb_build_object(
      'email_enabled', true,
      'whatsapp_enabled', true,
      'sms_enabled', false,
      'sms_coming_soon', true
    ),
    'seo', jsonb_build_object(
      'title', 'Nadeen Designs | بوتيك فساتين الزفاف الفاخرة',
      'description', 'Nadeen Designs — بوتيك فاخر لفساتين الزفاف والإيجار.',
      'keywords', 'فساتين زفاف, بوتيك عروس, Nadeen Designs',
      'og_image_url', '',
      'robots_index', true,
      'robots_follow', true,
      'google_analytics_id', '',
      'meta_pixel_id', ''
    ),
    'security', jsonb_build_object(
      'session_timeout_minutes', 60,
      'maintenance_mode', false,
      'backup_status', 'unknown',
      'backup_last_at', null,
      'backup_note', 'النسخ الاحتياطي يُدار عبر Supabase — الحالة للعرض فقط'
    ),
    'integrations', '[]'::jsonb
  ),
  now()
)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
