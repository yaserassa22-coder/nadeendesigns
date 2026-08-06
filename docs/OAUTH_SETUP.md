# OAuth Setup — Google & Apple (NadEEN Designs)

Phase G customer login uses **Supabase Auth OAuth**. No secrets belong in the repo or cookies.

Active primary login providers: **Google**, **Apple**, **Guest**.  
WhatsApp OTP is reserved in the UI as **قريباً** (module kept for a future plug-in).

---

## 1. Environment variables

Set in `.env.local` / hosting (Vercel / etc.). Never commit real values.

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server only

# Optional site URL for OAuth redirects
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

Google / Apple credentials are configured **inside the Supabase dashboard** (Auth → Providers), not as app env secrets for the client. The app only needs Supabase URL + keys.

Optional readiness heuristics (if you add them later):

```bash
# Not required by current code — providers are “ready” when Supabase OAuth is enabled
# and the provider returns an authorize URL.
```

---

## 2. Supabase Auth — redirect URLs

In **Supabase → Authentication → URL Configuration**:

| Setting | Value |
|---------|--------|
| Site URL | `https://your-domain.com` (and `http://localhost:3000` for local) |
| Redirect URLs | `https://your-domain.com/api/auth/callback` |
| | `http://localhost:3000/api/auth/callback` |
| | `https://your-domain.com/api/auth/callback?**` (wildcard query) |
| | `http://localhost:3000/api/auth/callback?**` |

**Critical:** Email confirmation and password-recovery links must land on
`/api/auth/callback` (not `/`). The app exchanges `code` or `token_hash`+`type`
there and sets session cookies on the redirect.

Use Supabase email template `{{ .ConfirmationURL }}` / `{{ .TokenHash }}` flows
that redirect to the callback. Do **not** set Site URL alone as the only
destination without allow-listing the callback path above.

The app starts OAuth via `POST /api/auth/oauth` and completes at `GET /api/auth/callback`.
Sign-up uses `emailRedirectTo = getAuthCallbackUrl("/account")`.

---

## 3. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create **OAuth 2.0 Client ID** (Web application).
3. Authorized JavaScript origins:
   - `https://YOUR_PROJECT.supabase.co`
   - `http://localhost:3000` (dev)
4. Authorized redirect URIs (critical — use Supabase callback):
   - `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
5. Copy **Client ID** + **Client Secret**.
6. Supabase → Authentication → Providers → **Google** → paste ID/secret → Enable.

App toggles: Admin → Settings → Customer auth → Google enabled.

---

## 4. Apple Developer

1. [Apple Developer](https://developer.apple.com/) → Certificates, Identifiers & Profiles.
2. Create an **App ID** with Sign In with Apple.
3. Create a **Services ID** (used as Client ID in Supabase).
4. Configure domains & return URLs:
   - Domains: `YOUR_PROJECT.supabase.co`
   - Return URL: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
5. Create a **Key** for Sign In with Apple; note Key ID + Team ID; download `.p8`.
6. Supabase → Authentication → Providers → **Apple** → enable and paste:
   - Services ID (Client ID)
   - Team ID, Key ID, private key (`.p8` contents)
7. Admin → Settings → Customer auth → Apple enabled.

---

## 5. Guest sessions (no OAuth)

- First visit creates HttpOnly cookie `guest_id` (UUID only, 365 days, Secure, SameSite=Lax).
- Table `guest_customers` + durable `guest_carts` / guest wishlist.
- On Google/Apple sign-in, guest data merges into the customer (`converted_to_customer_id`).
- On logout, a **new** guest session is minted so shopping continues.

Apply SQL: `supabase/migrations/031_guest_customers.sql` + `032_guest_storefront_rls.sql`, or paste `APPLY_GUEST_CUSTOMERS.sql` then `APPLY_GUEST_STOREFRONT_RLS.sql` / re-run `APPLY_ALL.sql` (sections 34–35).

Guest cart APIs use the server anon key when `SUPABASE_SERVICE_ROLE_KEY` is unset; migration **032** adds RLS so `guest_customers` / `guest_carts` upserts succeed without the service role.

---

## 6. Modular AuthProvider registry

Providers live under `src/lib/customer-auth/providers/`:

| File | Role |
|------|------|
| `google.ts` | OAuth |
| `apple.ts` | OAuth |
| `guest.ts` | Guest browsing |
| `whatsapp.ts` | **comingSoon** — reserved UI only |
| `email.ts` | Secondary password path |
| `registry.ts` | Plug-in registration |

Adding WhatsApp later: set `comingSoon: false` and restore `enabled()` / OTP endpoints — no changes needed to wishlist, cart, orders, or merge logic (they are provider-agnostic).

---

## 7. Smoke test

1. Open storefront → account icon → modal shows Google, Apple, Guest, WhatsApp **قريباً**.
2. Continue with Google → lands on `/account`, `customers.provider` / `last_login_at` set.
3. As guest: add wishlist without login → toast `❤️ تمت الإضافة إلى قائمة الأمنيات`.
4. Sign in → wishlist/cart merge; admin **ضيوف المتجر** shows converted guest.
