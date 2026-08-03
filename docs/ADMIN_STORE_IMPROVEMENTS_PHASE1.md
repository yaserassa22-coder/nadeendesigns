# Admin & Store Improvements — Phase 1 (Updated Plan)

**Branch:** `feature/admin-improvements`  
**Approved:** with required additions (card carousel, featured image, category fields, in-app notifications, git/QA gates, unlimited images, descriptions, shipping-for-all, final acceptance).

---

## Cross-cutting requirements (apply to all milestones)

### Git workflow
- **Before** each milestone: create a start commit.
- **After** each milestone: create a descriptive completion commit.
- On regressions: **stop**, explain, wait for approval. Do not continue with known regressions.

### Quality gates (end of every milestone)
- TypeScript check (`tsc --noEmit` or project equivalent)
- Lint (if configured)
- Production build
- Responsive sanity (desktop + mobile)
- Do **not** start the next milestone if the current one fails validation

### Final acceptance (project complete only if)
- Zero TypeScript errors, zero build errors, zero console errors
- Responsive on Desktop, Tablet, Mobile
- Product galleries work everywhere (PDP + cards)
- Categories fully dynamic
- Shipping works for all products (no category auto-disables shipping)
- Order notifications function (email + in-app; WhatsApp-ready)
- Admin Dashboard stable; customer purchase flow tested
- Existing functionality intact

---

## Architecture notes

| Area | Approach |
|------|----------|
| Categories | New `categories` table (name, slug, parent, sort, visibility, icon, cover, description). Keep existing routes in Phase 1; wire gradually. |
| Featured image | Convention: `images[0]` is featured. Reorder/set featured → updates cards, cart, checkout, orders, admin, related, search. |
| Images | Keep JSONB arrays (unlimited). No fixed cap. |
| Descriptions | Multiline textarea; render with whitespace preservation (`whitespace-pre-wrap`); AR/EN. |
| Shipping | Bridal accessories only (طرحة / برنص / future under اكسسوارات العروس). Flat fee in site settings. Dresses use booking, not shop shipping. |
| Notifications | Email (existing) + in-app notification center; architecture ready for WhatsApp. |
| Card carousel | Shared component: swipe (mobile), arrows (desktop), dots, hide chrome if single image, smooth + performant. |

---

## Milestones

### M1 — Rename + accessories parent ✅
- Labels: الطرحات → طرحة العروس; برنص عروس → برنص العروس
- Parent: اكسسوارات العروس (children: طرحة العروس, برنص العروس)
- Files: types, Header, ServicesSection, AdminSidebar, veils/robes pages, cart/checkout/booking copy, layout keywords

### M2 — Dynamic categories CRUD ✅
- DB: `categories` table + seed existing shop sections
- Admin: full CRUD for name, slug, parent, sort_order, is_visible, icon_url, cover_image_url, description
- API + validation + sidebar link
- QA: create / edit / delete empty / reorder / parent-child / visibility / persistence after refresh
- **Does not yet** fully replace all public nav (that is M3)

### M3 — Wire products / nav / search + featured image contract ✅
- Nav, homepage, search, related products consume categories where safe
- Enforce `images[0]` as featured everywhere (cards, cart, checkout, order summary, admin lists)
- Block cross-kind product moves (veil↔dress); allow same-kind category moves
- **Product card carousels** (pulled forward from M7): swipe on mobile, arrows on desktop, dots, hide chrome if single image — homepage, category/shop/search, related
- Keep existing public routes (`/wedding-dresses`, `/veils`, `/robes`, `/dresses/[id]`, …) for SEO

### M4 — Hero typography + opaque mobile menu ✅
- Hero: “تفاصيل تصنع الفرق” typography polish
- Mobile menu: fully opaque background

### M5 — Shipping for bridal accessories ✅
- Shipping for **اكسسوارات العروس only** (طرحة العروس، برنص العروس، future accessory products)
- Dresses do **not** use shop checkout shipping (booking flow unchanged)
- Checkout shipping section when cart has accessories (incl. mixed cart)
- DB-backed settings: `shipping_enabled`, `shipping_flat_fee`, `shipping_free_threshold`
- Checkout summary: products total + shipping fee + grand total
- Admin order details: order / shipping / customer / payment sections
- Customer order page: `/orders/[id]`
- Existing orders without shipping remain safe (nullable columns)

### M6 — Order confirm + in-app notification center
- Confirm/status notifications (create, confirm, status change, ready, delivered)
- Customer in-app notification center
- Keep email; leave WhatsApp integration path open

### M7 — Unlimited images, descriptions, PDP gallery polish
- Unlimited images (JSONB if sufficient)
- Multiline descriptions with exact whitespace rendering
- PDP gallery polish (card carousels delivered in M3)
- Keep card carousel behavior performant across surfaces

### M8 — Cards/admin polish + final QA
- Visual polish; run full acceptance checklist
- Fix any remaining regressions

---

## Milestone report template (end of each M)

1. Files modified  
2. Database changes  
3. Commits created  
4. Tests performed  
5. Issues discovered  
6. Recommendations before next milestone  
