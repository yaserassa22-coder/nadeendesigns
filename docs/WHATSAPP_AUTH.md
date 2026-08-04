# WhatsApp OTP Authentication — NadEEN Designs

Production customer login via **WhatsApp Business OTP**, with Google, Apple, and Guest kept.

## Architecture

```
LoginModal
  → POST /api/auth/whatsapp/send-code
      → hash OTP (SHA-256) → otp_requests
      → WhatsAppProvider (meta | twilio | 360dialog)
  → POST /api/auth/whatsapp/verify-code
      → verify hash, invalidate OTP
      → establishPhoneSession → Supabase Auth cookie
      → customers upsert (provider=whatsapp) + guest merge
```

Legacy routes `/api/auth/otp/request` and `/api/auth/otp/verify` delegate to the same WhatsApp handlers.

Provider selection: `src/lib/customer-auth/whatsapp/`  
OTP security helpers: `src/lib/customer-auth/otp.ts` + `otp-service.ts`

## Security defaults

| Rule | Value |
|------|--------|
| Code length | 6 digits |
| Expiry | 5 minutes (`otp_expiration_seconds`, default 300) |
| Max attempts | 5 |
| Resend cooldown | 60 seconds |
| Rate limit (phone) | 3 sends / 15 min |
| Rate limit (IP) | 10 sends / 15 min |
| Storage | `code_hash` only — never plaintext |
| Credentials | Server env only — never exposed to client |

## Environment variables

### Provider switch

```bash
# meta | twilio | 360dialog | auto (default: prefer Meta if configured, else Twilio, else 360dialog)
WHATSAPP_PROVIDER=meta
```

### Meta WhatsApp Cloud API (preferred)

```bash
WHATSAPP_META_TOKEN=EAAxxxx          # System User permanent token
WHATSAPP_META_PHONE_NUMBER_ID=1234567890
WHATSAPP_META_API_VERSION=v21.0     # optional
WHATSAPP_META_OTP_TEMPLATE=nadeen_otp   # approved Authentication template name (production)
WHATSAPP_META_OTP_TEMPLATE_LANG=ar
# Set to false if your template has no URL button with OTP copy
WHATSAPP_META_OTP_TEMPLATE_BUTTON=true
```

Without `WHATSAPP_META_OTP_TEMPLATE`, the server sends a free-form text message (works in the 24h customer-care window / sandbox; production business-initiated OTP usually needs an **Authentication** template).

### Twilio WhatsApp

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
# Optional Content API template (variable {{1}} = OTP)
# TWILIO_WHATSAPP_CONTENT_SID=HXxxxxxxxx
```

### 360dialog

```bash
WHATSAPP_360DIALOG_API_KEY=xxxxxxxx
WHATSAPP_360DIALOG_BASE_URL=https://waba.360dialog.io
# WHATSAPP_360DIALOG_OTP_TEMPLATE=nadeen_otp
# WHATSAPP_360DIALOG_OTP_TEMPLATE_LANG=ar
```

### Dev / other auth

```bash
# Expose OTP in API JSON when no WhatsApp provider is configured (never in production)
OTP_DEV_EXPOSE=true

NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true
NEXT_PUBLIC_APPLE_AUTH_ENABLED=true
# Redirect allowlist in Supabase: {NEXT_PUBLIC_SITE_URL}/api/auth/callback
```

## Meta Cloud API setup (brief)

1. Create a Meta Business + WhatsApp Business App in [Meta for Developers](https://developers.facebook.com/).
2. Add the **WhatsApp** product; note **Phone number ID** and create a **System User** token with `whatsapp_business_messaging`.
3. Set `WHATSAPP_META_TOKEN` + `WHATSAPP_META_PHONE_NUMBER_ID`.
4. For production OTP, create an **Authentication** message template (Arabic), approve it, then set `WHATSAPP_META_OTP_TEMPLATE` to the template name. Body variable `{{1}}` = code; if the template includes a one-tap URL button, keep `WHATSAPP_META_OTP_TEMPLATE_BUTTON=true`.
5. Set `WHATSAPP_PROVIDER=meta` (or leave `auto`).
6. Apply DB: paste `supabase/APPLY_WHATSAPP_AUTH.sql` (or full `APPLY_ALL.sql`) in the Supabase SQL editor.

## Database

- Migration: `supabase/migrations/030_customer_whatsapp_provider.sql`
- Standalone: `supabase/APPLY_WHATSAPP_AUTH.sql`
- Folded into `supabase/APPLY_ALL.sql` section 33

Adds on `customers`:

- `provider` — `whatsapp` | `google` | `apple` | `guest` | `email`
- `merge_meta` — light guest→registered merge audit JSON
- ensures `last_login_at`

## Guest merge

On WhatsApp / OAuth / email login, `attachGuestOrdersToCustomer` links:

- orphan `shop_orders` + `bookings` by phone/email
- wishlist + addresses from guest customer rows with the same contact

Counts are stored in `customers.merge_meta` (admin customer detail shows them).

## API

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/whatsapp/send-code` | Create hashed OTP + send WhatsApp |
| POST | `/api/auth/whatsapp/verify-code` | Verify → session → `/account` |
| POST | `/api/auth/otp/request` | Deprecated alias → send-code |
| POST | `/api/auth/otp/verify` | Deprecated alias → verify-code |
