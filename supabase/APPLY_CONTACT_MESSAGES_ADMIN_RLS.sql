-- APPLY_CONTACT_MESSAGES_ADMIN_RLS.sql
-- Align contact_messages admin RLS with ADMIN_ROLES (admin|owner|manager|staff).
-- Keeps public INSERT for the Contact Form; does NOT grant public SELECT.
-- Run in Supabase SQL Editor if Admin Messages is empty while rows exist.

DROP POLICY IF EXISTS "Admin all contact" ON contact_messages;
CREATE POLICY "Admin all contact" ON contact_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner', 'manager', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'owner', 'manager', 'staff')
    )
  );

-- Public submit (Contact Form) — INSERT only
DROP POLICY IF EXISTS "Public insert contact" ON contact_messages;
CREATE POLICY "Public insert contact" ON contact_messages
  FOR INSERT
  WITH CHECK (true);
