-- Worn by You — admin-managed customer visual gallery for the homepage.
-- Idempotent. Public read of active, non-deleted rows; admin full access.

CREATE TABLE IF NOT EXISTS worn_by_you_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_type TEXT NOT NULL DEFAULT 'image'
    CHECK (media_type IN ('image', 'video')),
  -- Required poster / still (also used as video poster)
  image_url TEXT NOT NULL,
  video_url TEXT,
  customer_name TEXT,
  caption TEXT,
  alt_text TEXT,
  product_kind TEXT
    CHECK (
      product_kind IS NULL
      OR product_kind IN ('dress', 'veil', 'bridal_robe')
    ),
  product_id TEXT,
  product_label TEXT,
  social_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  archived_at TIMESTAMPTZ,
  archived_by UUID
);

CREATE INDEX IF NOT EXISTS idx_worn_by_you_sort
  ON worn_by_you_items (sort_order ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_worn_by_you_active
  ON worn_by_you_items (is_active)
  WHERE is_deleted = false AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_worn_by_you_is_deleted
  ON worn_by_you_items (is_deleted);

CREATE INDEX IF NOT EXISTS idx_worn_by_you_archived_at
  ON worn_by_you_items (archived_at);

ALTER TABLE worn_by_you_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read worn_by_you" ON worn_by_you_items;
CREATE POLICY "Public read worn_by_you" ON worn_by_you_items
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin all worn_by_you" ON worn_by_you_items;
CREATE POLICY "Admin all worn_by_you" ON worn_by_you_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Merge homepage toggle into existing store settings JSON (default on).
UPDATE settings
SET value = jsonb_set(
  COALESCE(value, '{}'::jsonb),
  '{homepage,worn_by_you}',
  'true'::jsonb,
  true
),
updated_at = now()
WHERE key = 'store'
  AND (
    value->'homepage'->>'worn_by_you' IS NULL
  );
