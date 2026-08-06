-- APPLY_CONTACT_MESSAGE_REPLIES.sql
-- Reply metadata on contact_messages (Admin → customer via Resend).
-- Safe to re-run.

ALTER TABLE contact_messages
  ADD COLUMN IF NOT EXISTS last_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_reply_status TEXT,
  ADD COLUMN IF NOT EXISTS last_reply_subject TEXT,
  ADD COLUMN IF NOT EXISTS last_reply_error TEXT;

COMMENT ON COLUMN contact_messages.last_reply_at IS 'When Admin last sent a Resend reply';
COMMENT ON COLUMN contact_messages.last_reply_status IS 'sent | failed';
COMMENT ON COLUMN contact_messages.last_reply_subject IS 'Subject used on last reply';
COMMENT ON COLUMN contact_messages.last_reply_error IS 'Last send error (dev/ops; not shown to customers)';
