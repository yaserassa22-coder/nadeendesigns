-- Commerce: modular payments + invoicing (plugin architecture)
-- Extends shop_orders; does not remove COD or internal invoices.

-- Encrypted credential vault (AES-256-GCM ciphertext)
CREATE TABLE IF NOT EXISTS encrypted_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('payment_provider', 'invoice_provider')),
  scope_id TEXT NOT NULL,
  key_name TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NULL,
  UNIQUE (scope, scope_id, key_name)
);

CREATE INDEX IF NOT EXISTS encrypted_secrets_scope_idx
  ON encrypted_secrets (scope, scope_id);

-- Payment transactions (one row per attempt / capture)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'test' CHECK (mode IN ('test', 'live')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'requires_action', 'processing',
      'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded'
    )),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ILS',
  external_id TEXT,
  idempotency_key TEXT,
  client_secret TEXT,
  redirect_url TEXT,
  error_code TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_idempotency_uidx
  ON payment_transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_transactions_order_idx
  ON payment_transactions (order_id);

CREATE INDEX IF NOT EXISTS payment_transactions_external_idx
  ON payment_transactions (provider_id, external_id);

-- Webhook inbox (signature verified + deduped)
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  event_id TEXT,
  event_type TEXT,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  processing_status TEXT NOT NULL DEFAULT 'received'
    CHECK (processing_status IN (
      'received', 'processed', 'ignored', 'failed', 'duplicate'
    )),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  order_id UUID REFERENCES shop_orders(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_webhook_events_dedupe_uidx
  ON payment_webhook_events (provider_id, event_id)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_webhook_events_provider_idx
  ON payment_webhook_events (provider_id, received_at DESC);

-- Unified commerce event log (payments, invoices, webhooks, API errors)
CREATE TABLE IF NOT EXISTS commerce_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'payment', 'payment_failed', 'refund',
    'invoice', 'invoice_failed',
    'webhook', 'api_error', 'settings_audit'
  )),
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error')),
  provider_id TEXT,
  order_id UUID,
  transaction_id UUID,
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commerce_event_logs_cat_idx
  ON commerce_event_logs (category, created_at DESC);

CREATE INDEX IF NOT EXISTS commerce_event_logs_order_idx
  ON commerce_event_logs (order_id)
  WHERE order_id IS NOT NULL;

-- External / stored invoice documents (PDF + provider refs)
CREATE TABLE IF NOT EXISTS invoice_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'issued', 'failed', 'voided', 'emailed'
    )),
  document_number TEXT,
  external_id TEXT,
  pdf_storage_path TEXT,
  pdf_url TEXT,
  email_sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_documents_order_idx
  ON invoice_documents (order_id);

-- Retry queue for failed invoice generation
CREATE TABLE IF NOT EXISTS invoice_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_jobs_due_idx
  ON invoice_jobs (status, next_attempt_at)
  WHERE status IN ('pending', 'failed');

-- Extend shop_orders with payment fields (nullable — COD remains default)
ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS payment_provider_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_transaction_id UUID,
  ADD COLUMN IF NOT EXISTS payment_paid_at TIMESTAMPTZ;

-- Seed commerce platform settings row if missing
INSERT INTO settings (key, value, updated_at)
VALUES (
  'commerce',
  jsonb_build_object(
    'mode', 'test',
    'payments', jsonb_build_object('providers', '[]'::jsonb),
    'invoicing', jsonb_build_object(
      'active_provider_id', 'internal',
      'auto_issue_on_payment', true,
      'auto_email_on_issue', true,
      'retry_max_attempts', 5,
      'retry_backoff_seconds', 120
    )
  ),
  now()
)
ON CONFLICT (key) DO NOTHING;
