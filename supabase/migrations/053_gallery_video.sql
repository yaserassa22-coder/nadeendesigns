-- Gallery items: optional video (same CMS as photos). Existing image rows stay valid.

ALTER TABLE gallery_items
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image';

ALTER TABLE gallery_items
  ADD COLUMN IF NOT EXISTS video_url TEXT;

UPDATE gallery_items
SET media_type = 'image'
WHERE media_type IS NULL OR btrim(media_type) = '';

ALTER TABLE gallery_items
  DROP CONSTRAINT IF EXISTS gallery_items_media_type_check;

ALTER TABLE gallery_items
  ADD CONSTRAINT gallery_items_media_type_check
  CHECK (media_type IN ('image', 'video'));

ALTER TABLE gallery_items
  ALTER COLUMN image_url DROP NOT NULL;

ALTER TABLE gallery_items
  DROP CONSTRAINT IF EXISTS gallery_items_media_check;

ALTER TABLE gallery_items
  ADD CONSTRAINT gallery_items_media_check CHECK (
    (
      media_type = 'image'
      AND image_url IS NOT NULL
      AND btrim(image_url) <> ''
    )
    OR (
      media_type = 'video'
      AND video_url IS NOT NULL
      AND btrim(video_url) <> ''
    )
  );
