-- =============================================================================
-- 051_announcement_bar_rotation.sql
-- Extend settings.key='store' announcement bag for multi-item editorial rotation.
-- Merge-safe: preserves existing single-message fields; adds rotation + items[].
-- =============================================================================

DO $$
DECLARE
  current_val JSONB;
  ann JSONB;
  items JSONB;
  legacy_ar TEXT;
  legacy_he TEXT;
  legacy_en TEXT;
  legacy_link TEXT;
BEGIN
  SELECT value INTO current_val FROM settings WHERE key = 'store';
  IF current_val IS NULL THEN
    RETURN;
  END IF;

  ann := COALESCE(current_val->'announcement', '{}'::jsonb);

  IF ann->'rotation_enabled' IS NULL THEN
    ann := jsonb_set(ann, '{rotation_enabled}', 'true'::jsonb, true);
  END IF;

  IF ann->'rotation_interval' IS NULL THEN
    ann := jsonb_set(ann, '{rotation_interval}', '6'::jsonb, true);
  END IF;

  IF ann->'items' IS NULL OR jsonb_typeof(ann->'items') <> 'array' THEN
    legacy_ar := COALESCE(ann->>'text_ar', '');
    legacy_he := COALESCE(ann->>'text_he', '');
    legacy_en := COALESCE(ann->>'text_en', '');
    legacy_link := COALESCE(ann->>'link', '');

    IF legacy_ar <> '' OR legacy_he <> '' OR legacy_en <> '' OR legacy_link <> '' THEN
      items := jsonb_build_array(
        jsonb_build_object(
          'id', 'ann_legacy_01',
          'enabled', true,
          'order', 0,
          'text_ar', legacy_ar,
          'text_he', legacy_he,
          'text_en', legacy_en,
          'link', legacy_link
        )
      );
    ELSE
      items := '[]'::jsonb;
    END IF;

    ann := jsonb_set(ann, '{items}', items, true);
  END IF;

  current_val := jsonb_set(current_val, '{announcement}', ann, true);

  UPDATE settings
  SET value = current_val,
      updated_at = now()
  WHERE key = 'store';
END $$;
