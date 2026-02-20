# FoodApp Implementation Plan (Command 0)

This plan maps directly to `specs.md` and is structured to execute in phases without missing requirements.

## 1) Final Tech Stack

- Frontend: Next.js (App Router) + TypeScript + React + Tailwind CSS + component primitives (`shadcn/ui` style)
- Backend: Next.js Route Handlers (REST APIs) + Server Actions where useful
- Validation: Zod shared between client and server
- Database: PostgreSQL
- ORM/Migrations: Prisma
- Authentication: Auth.js (Credentials + Google OAuth), JWT session strategy, RBAC middleware
- Phone verification: OTP provider adapter (Twilio-like interface, pluggable)
- Email: transactional email provider adapter (Resend/Nodemailer style interface)
- Realtime: SSE (Server-Sent Events) + fallback polling
- Notifications: in-app notifications table + optional email/SMS channels
- Payments: Flatpay adapter abstraction + webhook processor + mock mode for development
- Caching/Queues: Redis for short-lived caches and background jobs (notification fanout, webhook retries, report refresh)
- File storage: S3-compatible bucket for menu images
- Testing: Vitest/Jest for unit, Playwright for E2E, Supertest-style API integration tests
- Deployment: Vercel (web/API) + managed Postgres + managed Redis; local services for development parity
- Observability: structured logs + error tracking hooks
- UX baseline: mobile-first responsive design for customer and staff views

## 2) Phased Roadmap With Milestones

### Phase 1: Foundation and Architecture

- Initialize Next.js App Router project with strict TypeScript
- Configure Prisma + PostgreSQL + migration pipeline
- Setup Tailwind, shared UI primitives, form system, validation layer
- Add CI baseline (lint, typecheck, tests)
- Milestone: app boots locally with working DB and CI checks

### Phase 2: Auth, Profiles, and RBAC

- Implement signup/login for email+password
- Implement Google auth + mandatory profile completion flow
- Add phone verification code flow
- Add password reset via email
- Implement role model: customer, staff/admin, guest browsing
- Milestone: protected routes and role guards fully working

### Phase 3: Menu and Catalog Management

- Build menu categories and menu item CRUD
- Add item metadata: images, tags, allergens, prep time, availability
- Implement modifiers/add-ons with required/optional + min/max rules
- Build customer menu browsing and staff menu management UI
- Milestone: staff can manage catalog and customer can browse complete menu

### Phase 4: Cart, Checkout, and Pricing Engine

- Build cart API/UI with modifiers, quantity, special instructions
- Implement checkout for dine-in, delivery, self pickup
- Build pricing engine: subtotal, discounts, VAT/tax, delivery fee, total
- Ensure tax display clarity when not included in listed item prices
- Milestone: valid orders can be created from checkout with correct totals

### Phase 5: Orders, Queue, and Realtime Tracking

- Implement order lifecycle/status transitions for staff
- Build staff live order queue + notifications
- Build customer order timeline + ETA
- Add order history and repeat order
- Add SSE stream + polling fallback for realtime
- Milestone: end-to-end ordering with live status updates works

### Phase 6: Delivery, Payments, and Offers

- Implement address book + delivery notes
- Implement delivery zone checks and out-of-zone blocking
- Implement delivery fee strategies: flat, distance-based, zone-based
- Implement Flatpay payment adapter + webhook-based status updates
- Implement cash handling for dine-in, pickup, and COD flows
- Implement offers engine (percentage, fixed amount, free delivery, limits, duration, scope)
- Milestone: delivery + payments + discounts fully integrated

### Phase 7: Notifications, Reports, and Dashboard Completion

- Finalize in-app notifications + optional email/SMS channel hooks
- Complete staff dashboard modules: orders, menu, offers, payment settings
- Build reports for sales and popular items with filters
- Milestone: operational staff dashboard production-ready

### Phase 8: Hardening and Release

- Add security controls (rate limiting, brute-force protection, input sanitization)
- Add robust tests (unit/integration/E2E) and fix gaps
- Add monitoring/logging and incident runbook
- Deploy staging + production with migration and rollback procedures
- Milestone: release-ready deployment with operational documentation

## 3) Data Model List

- `User`: identity, email, password hash (nullable for OAuth-only), status
- `UserRole`: relation of user to role (`CUSTOMER`, `STAFF`, `ADMIN`)
- `OAuthAccount`: provider linkage (Google)
- `Session` or JWT metadata table (if needed for revocation/audit)
- `CustomerProfile`: phone, phoneVerifiedAt, default address refs, optional geolocation
- `PhoneVerificationCode`: OTP code hash, expiry, attempts, channel
- `PasswordResetToken`: token hash, expiry, consumedAt
- `Address`: customer saved addresses + label + geocoordinates + delivery notes
- `MenuCategory`: name, sort order, active
- `MenuItem`: category, name, description, base price, active, prep estimate
- `MenuItemImage`: image URLs + ordering
- `DietaryTag`: veg/vegan/spicy tags (M:N with items)
- `Allergen`: allergen tags (M:N with items)
- `ModifierGroup`: title, required flag, min/max selections, item relation
- `ModifierOption`: option name, price delta, availability
- `Cart`: owner (customer/guest session), order type context
- `CartItem`: item, quantity, unit snapshot price, instructions
- `CartItemModifier`: selected options and price deltas
- `Offer`: rule type (percentage/fixed/free-delivery), constraints, schedule, scope
- `OfferRedemption`: tracking optional usage limits
- `DeliveryZone`: polygon or postal/city zone definitions, active
- `DeliveryFeeRule`: strategy config (flat/distance/zone thresholds)
- `Order`: order number, customer, type (`DINE_IN`, `DELIVERY`, `PICKUP`), pricing snapshots
- `OrderItem`: item snapshot, quantity, price, instructions
- `OrderItemModifier`: selected modifier snapshots
- `OrderStatusEvent`: transition log for timeline and auditing
- `Payment`: provider, method, state, amount, transaction IDs
- `PaymentEvent`: webhook/event log for idempotent payment processing
- `Refund`: partial/full refund metadata and reason
- `Notification`: in-app notification payload, read state
- `NotificationPreference`: user channel preferences
- `ReportDailySales`: aggregated daily revenue/orders
- `ReportPopularItems`: aggregated item performance by period
- `AuditLog`: staff/admin critical actions

## 4) API Module List

### Auth and Identity APIs

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google/callback` (handled by Auth.js provider flow)
- `POST /api/auth/complete-profile`
- `POST /api/auth/phone/send-code`
- `POST /api/auth/phone/verify-code`
- `POST /api/auth/password/forgot`
- `POST /api/auth/password/reset`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Menu APIs

- `GET /api/menu/categories`
- `GET /api/menu/items`
- `GET /api/menu/items/:id`
- `POST /api/admin/menu/categories`
- `PATCH /api/admin/menu/categories/:id`
- `DELETE /api/admin/menu/categories/:id`
- `POST /api/admin/menu/items`
- `PATCH /api/admin/menu/items/:id`
- `DELETE /api/admin/menu/items/:id`
- `POST /api/admin/menu/items/:id/modifier-groups`
- `PATCH /api/admin/menu/modifier-groups/:id`
- `DELETE /api/admin/menu/modifier-groups/:id`

### Cart and Checkout APIs

- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:id`
- `DELETE /api/cart/items/:id`
- `POST /api/checkout/quote`
- `POST /api/orders`

### Orders and Tracking APIs

- `GET /api/orders`
- `GET /api/orders/:id`
- `GET /api/orders/:id/timeline`
- `POST /api/orders/:id/repeat`
- `POST /api/staff/orders/:id/status`
- `GET /api/staff/orders/queue`
- `GET /api/realtime/orders/stream` (SSE)

### Delivery APIs

- `GET /api/addresses`
- `POST /api/addresses`
- `PATCH /api/addresses/:id`
- `DELETE /api/addresses/:id`
- `POST /api/delivery/validate-zone`
- `GET /api/admin/delivery/zones`
- `POST /api/admin/delivery/zones`
- `PATCH /api/admin/delivery/zones/:id`
- `DELETE /api/admin/delivery/zones/:id`
- `GET /api/admin/delivery/fee-rules`
- `PATCH /api/admin/delivery/fee-rules`

### Payments APIs

- `POST /api/payments/create-intent`
- `POST /api/payments/confirm`
- `POST /api/payments/webhook/flatpay`
- `POST /api/payments/:id/refund`
- `GET /api/admin/payments/settings`
- `PATCH /api/admin/payments/settings`

### Offers APIs

- `GET /api/offers/active`
- `POST /api/admin/offers`
- `PATCH /api/admin/offers/:id`
- `DELETE /api/admin/offers/:id`
- `POST /api/checkout/apply-offer`

### Notifications APIs

- `GET /api/notifications`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `GET /api/notifications/stream` (SSE)
- `GET /api/notifications/preferences`
- `PATCH /api/notifications/preferences`

### Reports APIs

- `GET /api/admin/reports/sales`
- `GET /api/admin/reports/popular-items`

## 5) UI Pages List (Customer + Staff)

### Customer/Guest Pages

- `/` landing/home (offers highlights + quick actions)
- `/menu` menu list with categories/filters
- `/menu/[itemId]` item detail with modifiers
- `/cart` cart management
- `/checkout` checkout with order type, pricing breakdown, payment method
- `/orders/[orderId]` live tracking timeline + ETA
- `/orders/history` historical orders + repeat order
- `/offers` active offers and terms
- `/auth/login`
- `/auth/signup`
- `/auth/complete-profile` (post-Google required fields)
- `/auth/verify-phone`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/account/profile`
- `/account/addresses`
- `/account/notifications`

### Staff/Admin Pages

- `/staff/login`
- `/staff` dashboard overview
- `/staff/orders` live queue
- `/staff/orders/[orderId]` detail + status actions
- `/staff/menu/categories`
- `/staff/menu/items`
- `/staff/menu/modifiers`
- `/staff/offers`
- `/staff/delivery/zones`
- `/staff/payments/settings`
- `/staff/reports/sales`
- `/staff/reports/popular-items`
- `/staff/notifications`

### Mobile-Friendly UI Rules

- Mobile-first layout baseline (`320px` and up)
- Sticky bottom CTA actions on customer flow (`Add to cart`, `Checkout`)
- Tap target minimum 44px
- Realtime order status card optimized for one-hand mobile use
- Staff dashboard adapts to tablet widths for counter use

## 6) Risks/Unknowns and Recommended Decisions

- Flatpay integration details are not in `specs.md`.
- Recommendation: implement provider adapter + sandbox mock first; swap in real credentials later.

- Tax/VAT behavior is partially specified.
- Recommendation: store configurable tax settings and always show explicit line-item breakdown at checkout/menu notice.

- Guest policy is not explicitly defined for order submission.
- Recommendation: allow guest browsing and cart; require login/verified contact before placing order for reliable tracking and notifications.

- Notification channel scope is unclear ("I don't know how").
- Recommendation: ship in-app notifications first, then optional email/SMS channel toggles.

- Realtime requirement is uncertain ("Should we?").
- Recommendation: yes, implement SSE + polling fallback for robust order tracking.

- Delivery fee precedence (flat vs distance vs zone) is not defined.
- Recommendation: define per-restaurant active strategy with strict single strategy at a time to prevent pricing conflicts.

- Delivery zone geometry format is not defined.
- Recommendation: start with postal-code/area lists, then optionally extend to polygon geofencing.

- Single-store vs multi-store scope not specified.
- Recommendation: implement single-store v1 with schema extension points for future multi-branch support.

- Offers conflict handling is not specified.
- Recommendation: by default apply best customer-benefit single offer unless explicitly marked stackable.

- ETA formula is not specified.
- Recommendation: ETA = prep estimate + queue delay + delivery segment; continuously adjust on status updates.

- Payment method availability by order type can conflict with operational reality.
- Recommendation: configure allowed methods per order type in admin payment settings.

## Execution Note

After approval of this plan, run `Command 1` from `VIBE_CODING_COMMANDS.md` to scaffold the app and start implementation.
