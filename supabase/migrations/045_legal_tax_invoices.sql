-- =============================================================================
-- 045_legal_tax_invoices.sql
-- Legal pages live in settings.key='store' JSON (legal + tax bags).
-- Shop order tax documents: sequential invoice numbers + metadata columns.
-- No external tax-authority / Green Invoice API — internal documents only.
-- =============================================================================

-- Sequential invoice counter (atomic allocation via UPDATE … RETURNING)
CREATE TABLE IF NOT EXISTS invoice_sequence (
  id TEXT PRIMARY KEY DEFAULT 'shop_orders',
  prefix TEXT NOT NULL DEFAULT 'ND',
  next_number BIGINT NOT NULL DEFAULT 1 CHECK (next_number >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO invoice_sequence (id, prefix, next_number)
VALUES ('shop_orders', 'ND', 1)
ON CONFLICT (id) DO NOTHING;

-- Tax document metadata on shop_orders (nullable = legacy / not yet issued)
ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_type TEXT,
  ADD COLUMN IF NOT EXISTS invoice_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(6, 3),
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS invoice_subtotal NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS prices_include_vat BOOLEAN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shop_orders_invoice_type_check'
  ) THEN
    ALTER TABLE shop_orders
      ADD CONSTRAINT shop_orders_invoice_type_check
      CHECK (
        invoice_type IS NULL
        OR invoice_type IN ('receipt', 'tax_invoice', 'tax_invoice_receipt')
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS shop_orders_invoice_number_uidx
  ON shop_orders (invoice_number)
  WHERE invoice_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS shop_orders_invoice_issued_at_idx
  ON shop_orders (invoice_issued_at DESC NULLS LAST);

COMMENT ON COLUMN shop_orders.invoice_number IS
  'Sequential internal tax document number (e.g. ND-000001). Not a government allocation.';
COMMENT ON COLUMN shop_orders.invoice_type IS
  'receipt=קבלה | tax_invoice=חשבונית מס | tax_invoice_receipt=חשבונית מס / קבלה';
COMMENT ON TABLE invoice_sequence IS
  'Atomic counter for shop order tax documents. Future providers can sync separately.';

-- Ensure store settings JSON has legal + tax keys (merge-safe; does not wipe admin data)
DO $$
DECLARE
  current_val JSONB;
BEGIN
  SELECT value INTO current_val FROM settings WHERE key = 'store';
  IF current_val IS NULL THEN
    RETURN;
  END IF;

  IF current_val->'tax' IS NULL THEN
    current_val := jsonb_set(
      current_val,
      '{tax}',
      jsonb_build_object(
        'business_id', '',
        'business_id_type', 'authorized_dealer',
        'vat_rate', 18,
        'prices_include_vat', true,
        'default_document_type', 'tax_invoice_receipt',
        'issue_trigger', 'on_order',
        'invoice_prefix', 'ND',
        'next_invoice_number', 1,
        'provider', 'none',
        'provider_coming_soon', true,
        'provider_notes',
          'المستندات داخلية حاليًا. ربط مزوّد فوترة إسرائيلي قادم من لوحة الإدارة.'
      ),
      true
    );
  END IF;

  IF current_val->'legal' IS NULL THEN
    current_val := jsonb_set(
      current_val,
      '{legal}',
      jsonb_build_object(
        'show_template_banner', true,
        'require_checkout_acceptance', true,
        'updated_at', NULL
      ),
      true
    );
  END IF;

  UPDATE settings
  SET value = current_val, updated_at = now()
  WHERE key = 'store';
END $$;
