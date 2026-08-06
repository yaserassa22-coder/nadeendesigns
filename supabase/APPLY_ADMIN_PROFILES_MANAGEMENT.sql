-- Apply Administrator Management columns on profiles.
-- Safe to re-run.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS profiles_admin_role_idx
  ON profiles (role)
  WHERE role IS NOT NULL;
