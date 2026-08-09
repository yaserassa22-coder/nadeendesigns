-- Worn by You: poster optional when item is a video (video-only allowed).

ALTER TABLE worn_by_you_items
  ALTER COLUMN image_url DROP NOT NULL;

ALTER TABLE worn_by_you_items
  DROP CONSTRAINT IF EXISTS worn_by_you_items_media_check;

ALTER TABLE worn_by_you_items
  ADD CONSTRAINT worn_by_you_items_media_check CHECK (
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
