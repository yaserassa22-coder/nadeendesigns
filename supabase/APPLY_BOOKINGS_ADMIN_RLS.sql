-- =============================================================================
-- RUN IN SUPABASE → SQL Editor (does NOT change table columns)
-- Ensures authenticated admins can SELECT / UPDATE / DELETE all bookings.
-- Public INSERT remains allowed for the booking form.
-- =============================================================================

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Keep public insert for the website form
DROP POLICY IF EXISTS "Public insert bookings" ON bookings;
CREATE POLICY "Public insert bookings" ON bookings
  FOR INSERT
  WITH CHECK (true);

-- Admin full access (read + write) via profiles.role = 'admin'
DROP POLICY IF EXISTS "Admin all bookings" ON bookings;
CREATE POLICY "Admin all bookings" ON bookings
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

-- Optional: explicit SELECT policy (some projects prefer this clarity)
DROP POLICY IF EXISTS "Admin select bookings" ON bookings;
CREATE POLICY "Admin select bookings" ON bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';
