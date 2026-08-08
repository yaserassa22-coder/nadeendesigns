# Commerce Providers — Developer Guide

Modular **payment** and **invoice** providers for Nadeen Designs.  
Admin configures everything under **Admin → Payments & Invoicing** (`/admin/payments`).  
No hardcoded credentials. Secrets are AES-256-GCM encrypted in `encrypted_secrets`.

---

## Architecture

```
Checkout → payment_provider_id on order
        → PaymentProvider.createPayment()
        → Webhook (/api/webhooks/payments/:id) → mark paid
        → InvoiceProvider.issueDocument()
        → PDF stored + email + retry queue
```

| Layer | Path |
|-------|------|
| Payment contract | `src/lib/payments/types.ts` |
| Payment registry | `src/lib/payments/registry.ts` |
| Payment plugins | `src/lib/payments/providers/*` |
| Invoice contract | `src/lib/invoicing/types.ts` |
| Invoice registry | `src/lib/invoicing/registry.ts` |
| Invoice plugins | `src/lib/invoicing/providers/*` |
| Secrets vault | `src/lib/commerce/secrets/*` |
| Settings | `settings.key = 'commerce'` + encrypted_secrets |
| SQL | `supabase/APPLY_COMMERCE_PAYMENTS_INVOICING.sql` |

**SOLID:** each gateway/invoicer is a plugin. Orchestration (`payments/service.ts`, `invoicing/service.ts`) depends only on interfaces — never on concrete Bit/Green Invoice code.

---

## How to add a payment provider

1. Create `src/lib/payments/providers/my-gateway.ts` implementing `PaymentProvider`.
2. Register it in `src/lib/payments/providers/index.ts` via `registerPaymentProvider(...)`.
3. Deploy. The Admin panel picks it up automatically (enable, credentials, webhook URL, test).
4. **Do not** edit checkout, webhook router, or order status handlers for the new id — they resolve providers by registry.

Minimal skeleton:

```ts
import type { PaymentProvider } from "../types";
import { registerPaymentProvider } from "../registry";

export const myGateway: PaymentProvider = {
  id: "my_gateway",
  label: { ar: "…", he: "…", en: "My Gateway" },
  defaultSortOrder: 20,
  implementationReady: true,
  credentialFields: [
    { key: "api_key", label: "API Key", kind: "secret", required: true },
    { key: "webhook_secret", label: "Webhook Secret", kind: "secret", required: true },
  ],
  requiredSecretKeys: ["api_key", "webhook_secret"],
  supportsWebhook: true,
  supportsRefund: false,
  supportsTestConnection: true,
  async createPayment(input) { /* call PSP */ },
  async verifyWebhook(input) { /* verify signature, map status */ },
  async testConnection(input) { /* ping PSP */ },
};

// in index.ts
registerPaymentProvider(myGateway);
```

Webhook URL shown in Admin:

`https://<domain>/api/webhooks/payments/my_gateway`

---

## How to add an invoice provider

1. Create `src/lib/invoicing/providers/my-invoice.ts` implementing `InvoiceProvider`.
2. Register in `src/lib/invoicing/providers/index.ts`.
3. Admin selects it as **Active** and enters API credentials.
4. On payment success, `afterPaymentSucceeded` calls the active provider. Failures leave the order **paid**, alert the admin, and enqueue `invoice_jobs` retries.

---

## Connect Green Invoice

1. Open **Admin → Payments & Invoicing → Invoicing**.
2. Expand **חשבונית ירוקה / Green Invoice**.
3. Enter **API Key** + **API Secret** (and Account ID if required).
4. Click **Test connection**, then set provider **Active**.
5. Save.

Live API calls activate when the Green Invoice adapter’s `implementationReady` is set and `issueDocument` is implemented against their API. Until then, credentials are stored encrypted; the system falls back to **internal** Hebrew invoices so checkout is never blocked.

---

## Connect Bit

1. Open **Admin → Payments & Invoicing → Payment providers**.
2. Enable **Bit**, enter:
   - API Key, Secret Key, Merchant ID, Webhook Secret
   - Optional **API Base URL** (or set env `BIT_API_BASE_URL`)
3. Copy the displayed **Webhook URL** into the Bit dashboard.
4. **Test connection** → Save.
5. Switch Mode to **Live** when going production.

Bit is a first-class provider (`src/lib/payments/providers/bit.ts`). When Bit changes API URLs, update **API Base URL** in Admin (or env) — no application code change required for credential rotation.

Env (optional):

```
COMMERCE_SECRETS_KEY=<64 hex chars>   # AES-256 key (required in production)
BIT_API_BASE_URL=https://api.example.com
CRON_SECRET=<random>                  # for /api/cron/invoice-retry
```

---

## Switch providers from Admin

| Goal | Action |
|------|--------|
| Show/hide checkout methods | Enable/disable + drag reorder on Payments tab |
| Test vs Live | Mode selector (top of Payments) |
| Invoice engine | Invoicing tab → set **Active** radio |
| Retry failed invoices | Logs tab → **Run invoice retries**, or cron `POST /api/cron/invoice-retry` with `Authorization: Bearer $CRON_SECRET` |

---

## Security checklist

- Secrets never returned in plaintext to the Admin UI (masked).
- Webhooks: per-provider signature verification + event_id dedupe.
- Rate limits on admin save/test and webhook endpoints.
- Settings changes written to `commerce_event_logs` (`settings_audit`).
- Mutations require `canMutateSettings` (owner/admin).

---

## Database apply

Run once in Supabase SQL editor:

`supabase/APPLY_COMMERCE_PAYMENTS_INVOICING.sql`

Creates: `encrypted_secrets`, `payment_transactions`, `payment_webhook_events`, `commerce_event_logs`, `invoice_documents`, `invoice_jobs`, and payment columns on `shop_orders`.

---

## Regression note

- **COD** remains the default live method.
- **Internal Hebrew invoice** remains the default invoice provider.
- Existing order workflow (`payment_received`) still triggers invoicing via commerce orchestration.
