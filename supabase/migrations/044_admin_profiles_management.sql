-- Administrator Management: disable flag on profiles (demote keeps customer data).
-- Role remains the capability source; is_disabled blocks admin access without deleting rows.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

COMMENT ON COLUMN profiles.is_disabled IS
  'When true, user keeps profiles.role for restore but cannot access admin.';

CREATE INDEX IF NOT EXISTS profiles_admin_role_idx
  ON profiles (role)
  WHERE role IS NOT NULL;
