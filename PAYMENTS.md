# Payments & Invoicing

Nadeen Designs uses one Admin surface for payments and invoices:

**Admin → Payments & Invoicing** (`/admin/payments`)

```
Payments & Invoicing
├── Payment providers
├── Invoicing
└── Logs
```

Do not add a second payments settings page. New gateways and invoicers are plugins in the existing registries.

---

## 1. Existing payment architecture

Checkout stores `payment_provider_id` on the order. After insert, the server calls `startOrderPayment()` (`src/lib/payments/service.ts`), which:

1. Loads the plugin from `src/lib/payments/registry.ts`.
2. Reads non-secret config from `settings.key = 'commerce'`.
3. Reads secrets from `encrypted_secrets` (`scope = payment_provider`).
4. Calls `PaymentProvider.createPayment()`.
5. Stores a `payment_transactions` row (`redirect_url`, `external_id`, metadata).

Hosted methods (PayPlus, Bit when configured) return `redirectUrl`. Checkout sends the customer to that URL. **Returning from the success URL does not mark the order paid.** Only a verified server-side webhook/IPN does.

| Layer | Path |
|-------|------|
| Contract | `src/lib/payments/types.ts` |
| Registry | `src/lib/payments/registry.ts` |
| Plugins | `src/lib/payments/providers/*` |
| Orchestration | `src/lib/payments/service.ts` |
| Webhook | `POST` / `GET` `/api/webhooks/payments/[provider]` |

Registered payment plugins: `cod` (live default), `payplus` (ready, **disabled**), `bit` (ready when credentials + API base exist), plus placeholders (`credit_card`, `paypal`, `apple_pay`, `google_pay`).

Mode **Test / Live** at the top of Payment providers selects the environment for every live adapter. PayPlus Test → `https://restapidev.payplus.co.il/api/v1.0/`. PayPlus Live → `https://restapi.payplus.co.il/api/v1.0/`. Staging credentials must never be used against production URLs (the Mode switch keeps them apart).

---

## 2. Existing invoice architecture

A single **Active invoice provider** is stored as `commerce.invoicing.active_provider_id`. After a payment is marked paid, `afterPaymentSucceeded()` runs if **Auto-issue after payment** is on (default). Failures do **not** un-pay the order; they alert admin and enqueue `invoice_jobs`.

| Layer | Path |
|-------|------|
| Contract | `src/lib/invoicing/types.ts` |
| Registry | `src/lib/invoicing/registry.ts` |
| Plugins | `src/lib/invoicing/providers/*` |
| Orchestration | `src/lib/invoicing/service.ts` |

Registered invoice plugins: `internal` (default, live), `green_invoice` (חשבונית ירוקה), `morning`, `icount`, `easycount`, `payplus`.

External Israeli providers other than PayPlus remain credential placeholders until their adapters are implemented; if selected while `implementationReady` is false, orchestration falls back to **internal** so checkout is never blocked. PayPlus invoicing is `implementationReady: true` but **cannot be selected** until the invoice module is enabled in Admin.

---

## 3. PayPlus integration

PayPlus is **one provider with two independent capabilities**:

```
PayPlus
├── Payment capability  (Payment providers tab → Enable)
└── Invoice capability  (Invoicing tab → invoice module + Active)
```

It is **not** two unrelated integrations. Payment and invoice selections stay independent, so these combinations work:

| Payment | Invoice | Behavior |
|---------|---------|----------|
| PayPlus | PayPlus | Hosted payment + `initial_invoice: true`; attach PayPlus document (no second invoice) |
| PayPlus | iCount / Morning / EasyCount / Internal / Green Invoice | Hosted payment with `initial_invoice: false`; existing invoice plugin runs after paid |
| COD / Bit / other | PayPlus | Other payment; PayPlus Invoice+ `POST /books/docs/new/{docType}` after paid |

PayPlus stays **disabled** until you enable it in Admin. No live charges or invoices are sent until then.

---

## 4. PayPlus payment capability

Official flow (no raw cards in Nadeen):

```
Checkout
 → pending order
 → POST /PaymentPages/generateLink
 → customer redirected to PayPlus hosted page
 → PayPlus callback / IPN
 → server verifies HMAC + POST /PaymentPages/ipn
 → order payment_status = paid, status = payment_received
 → invoice orchestration (active invoice provider)
```

Refunds: `POST /Transactions/RefundByTransactionUID` via `PaymentProvider.refund` / `refundOrderPayment()`.

---

## 5. PayPlus invoice capability

Requires **Invoice module enabled on PayPlus account** in Admin (Invoice+ entitlement). Until that checkbox is on (and API credentials exist), the Active radio is disabled and the UI shows:

```
PayPlus invoicing is not configured or enabled.
```

When PayPlus also collected payment, the invoice is taken from the payment callback / `POST /Invoice/GetDocuments` — not created again.

When another method collected payment, PayPlus creates a document with `POST /books/docs/new/{docType}` (`inv_tax_receipt` by default).

---

## 6. Payment only

1. Payment providers → PayPlus → Enable ON, enter credentials, Test, Save.
2. Invoicing → leave Active on Internal / iCount / Morning / etc.
3. Do **not** turn on the PayPlus invoice module (or leave Active on another invoicer).

`generateLink` sends `initial_invoice: false` so PayPlus does not also invoice.

---

## 7. Invoicing only

1. Payment providers → PayPlus Enable **OFF** (or use COD/Bit).
2. Invoicing → PayPlus → check invoice module, Test, set **Active**, Save.

Other PSPs can still collect money; PayPlus only issues the tax document after paid.

---

## 8. Payment + invoice together

1. Enable PayPlus payments and save credentials.
2. Enable the PayPlus invoice module and set PayPlus Active.
3. `generateLink` sends `initial_invoice: true`.
4. After IPN, invoicing attaches the PayPlus document. Duplicate callbacks and existing `invoice_documents` rows are skipped.

---

## 9. Required credentials

Entered in Admin only. Never commit them. Never `NEXT_PUBLIC_*`.

| Field | Where | Secret? |
|-------|--------|---------|
| API Key | Payment providers (reused for invoices if invoice fields are blank) | Yes |
| Secret Key | Payment providers | Yes |
| Payment Page UID | Payment providers | No |
| Terminal UID | Optional, for Test connection (`PaymentPages/list`) | No |
| Cashier UID | Optional | No |
| Invoice module enabled | Invoicing → PayPlus | No |
| Document type | Invoicing → PayPlus (`inv_tax_receipt` / `inv_tax` / `inv_receipt`) | No |

Official docs: [PayPlus REST API](https://docs.payplus.co.il). Auth headers: `api-key`, `secret-key`.

---

## 10. Test / Staging vs Production

| Admin Mode | PayPlus environment | Base URL |
|------------|---------------------|----------|
| Test | Staging | `https://restapidev.payplus.co.il/api/v1.0/` |
| Live | Production | `https://restapi.payplus.co.il/api/v1.0/` |

Use matching credentials for each environment. Switching Mode does not copy secrets; store the pair that matches the environment you are testing.

---

## 11. Admin configuration

1. Open **Admin → Payments & Invoicing**.
2. Set **Mode** (Test or Live).
3. **Payment providers** → expand **PayPlus** → paste API Key, Secret Key, Payment Page UID → Test → Enable only when you are ready → Save.
4. **Invoicing** → expand **PayPlus** → optionally reuse payment secrets → check **Invoice module enabled** → Test connection → set Active if you want PayPlus invoices → Save.
5. Copy the displayed **Webhook URL** into the PayPlus dashboard if they require it. The app also sends `refURL_callback` on each `generateLink`.

Webhook path:

`{site origin}/api/webhooks/payments/payplus`

Origin comes from the incoming request (localhost, Vercel preview, custom domain) or `NEXT_PUBLIC_SITE_URL` when shown in Admin. The production domain is never hard-coded.

---

## 12. Callback flow

1. PayPlus POSTs (or GETs) `/api/webhooks/payments/payplus`.
2. Validate `user-agent: PayPlus` and `hash` = HMAC-SHA256(body, secret-key) base64 ([docs](https://docs.payplus.co.il/reference/validate-requests-received-from-payplus)).
3. Confirm with official `POST /PaymentPages/ipn` (`payment_request_uid` / `transaction_uid`). **IPN is authoritative.**
4. `status_code === "000"` → mark paid → invoice. Other codes → `failed` / `cancelled`; order stays unpaid; no invoice unless existing business logic already required it (it does not).
5. Duplicate `event_id` in `payment_webhook_events` returns `{ duplicate: true }` with no second charge or invoice.
6. Card PAN/CVV/`card_information` and secret keys are stripped before logs/payload storage.

**Local development:** PayPlus cannot reach `localhost`. Use a public tunnel or a Vercel preview URL for callbacks. Success/cancel browser redirects still work locally; paid status waits for a reachable webhook.

---

## 13. Security

- Secrets live in `encrypted_secrets` (AES-256-GCM), key `COMMERCE_SECRETS_KEY`.
- Admin UI shows masked values only (`••••1234`).
- Secrets are never sent to Client Components, `localStorage`, public APIs, or HTML.
- No raw card data is collected or stored.
- Webhooks are rate-limited.

---

## 14. Refunds

`PaymentProvider.refund` is implemented for PayPlus (`RefundByTransactionUID`). Call `refundOrderPayment()` from server code. There is no separate refund Admin page yet; do not simulate a successful refund in the UI.

---

## 15. How to activate PayPlus later (no code changes)

1. Buy PayPlus and obtain API Key, Secret Key, Payment Page UID (and Invoice+ if you need invoicing).
2. Admin → Payments & Invoicing → Mode Test → enter staging credentials → Test connection.
3. Place a test order, pay on the PayPlus page, confirm Logs show webhook verification and paid status.
4. Switch Mode to Live, enter production credentials, Test, Enable PayPlus payments.
5. If using PayPlus invoices: enable the invoice module, Test, set Active.
6. Save. Checkout will offer PayPlus only while it is enabled and configured.

Until step 4, PayPlus remains disabled and customers are not sent to PayPlus.

---

## Identifiers

| Question | Stored in |
|----------|-----------|
| Which PayPlus payment belongs to this order? | `shop_orders.payment_transaction_id` → `payment_transactions` (`provider_id = payplus`, `external_id`, `metadata.page_request_uid`, `metadata.transaction_uid`) |
| Which invoice belongs to this payment? | `invoice_documents.order_id` + `external_id` (PayPlus `docUID` / uuid) |
| Which provider generated the invoice? | `invoice_documents.provider_id` |

---

## Related

Developer plugin guide: [`docs/commerce-providers.md`](docs/commerce-providers.md).
SQL: `supabase/APPLY_COMMERCE_PAYMENTS_INVOICING.sql` (existing tables; PayPlus does not require a new schema).
