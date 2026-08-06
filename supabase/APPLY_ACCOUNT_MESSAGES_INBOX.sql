-- Bridge account (customer_messages) → Admin Messages (contact_messages).
-- Safe to re-run.

ALTER TABLE contact_messages
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'contact';

ALTER TABLE contact_messages
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE contact_messages
  ADD COLUMN IF NOT EXISTS account_message_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_messages_account_message_id
  ON contact_messages (account_message_id)
  WHERE account_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_messages_customer_id
  ON contact_messages (customer_id)
  WHERE customer_id IS NOT NULL;

COMMENT ON COLUMN contact_messages.source IS 'contact | account';
COMMENT ON COLUMN contact_messages.account_message_id IS 'Originating customer_messages.id when source=account';
