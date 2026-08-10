-- =============================================================================
-- 050_announcement_bar.sql
-- Store announcement bar settings live in settings.key='store' JSON (announcement bag).
-- No new table — merge-safe defaults only.
-- =============================================================================

DO $$
DECLARE
  current_val JSONB;
BEGIN
  SELECT value INTO current_val FROM settings WHERE key = 'store';
  IF current_val IS NULL THEN
    RETURN;
  END IF;

  IF current_val->'announcement' IS NULL THEN
    current_val := jsonb_set(
      current_val,
      '{announcement}',
      jsonb_build_object(
        'enabled', false,
        'text_ar', '',
        'text_he', '',
        'text_en', '',
        'link', '',
        'desktop_enabled', true,
        'mobile_enabled', true,
        'background_color', '#f0ebe3',
        'text_color', '#2c2419'
      ),
      true
    );

    UPDATE settings
    SET value = current_val,
        updated_at = now()
    WHERE key = 'store';
  END IF;
END $$;
