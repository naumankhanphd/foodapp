# FoodApp Vibe Coding Commands (Copy/Paste)

Use these prompts in order with your AI coding tool (Cursor, Codex, Claude Code, etc.).
Each prompt tells the AI exactly what to build and keeps all `specs.md` requirements covered.

## Command 0: Load Context and Plan

```text
Read specs.md in this repo and create a complete implementation plan for a food ordering web app.

Output:
1) final tech stack (frontend, backend, database, auth, realtime, notifications, payments, deployment)
2) phased roadmap with milestones
3) data model list
4) API module list
5) UI pages list for customer + staff
6) risks/unknowns with recommended decisions

Important: do not miss any requirement from specs.md.
```

## Command 1: Scaffold Project

```text
Create the full project scaffold for the food app using a production-ready stack.

Requirements:
- Customer web app + staff admin dashboard
- Backend API
- Database migrations and seed setup
- Environment variable template
- Docker/dev scripts
- Lint/format/test setup

Then run the project and confirm local startup commands.
```

## Command 2: Database Schema (All Core Entities)

```text
Implement database schema and migrations for all required modules from specs.md.

Must include:
- users, roles (customer/staff/admin), sessions/JWT support
- customer profile: phone, address, geolocation fields
- phone verification codes
- password reset tokens
- menu categories
- menu items: name, description, images, base price, availability, prep time, dietary tags, allergens
- modifiers/add-ons with rules: required/optional, min/max selections
- carts, cart items, item modifiers, special instructions, quantity
- orders (dine-in, delivery, self pickup)
- order status timeline
- delivery addresses + delivery notes
- delivery zones + fee rules (flat/distance/zone)
- payments + payment states (unpaid/authorized/paid/failed/refunded partial or full)
- offers/discounts: percentage, fixed amount, free delivery, min/max price, duration, applicability (dine-in/delivery/both)
- notifications
- reports aggregates (sales/popular items materialization strategy)

Also add indexes and constraints for performance and correctness.
```

## Command 3: Authentication and RBAC

```text
Implement full authentication and authorization.

Requirements:
- customer + staff login/signup
- email/password auth
- Google auth
- if Google login has missing mandatory fields (phone/address/location), show completion flow
- phone code verification flow
- password reset via email
- secure session handling (JWT or server sessions, explain choice)
- RBAC middleware for customer/staff/admin
- guest support (can browse; define checkout restriction policy clearly)

Add API routes + frontend pages/forms + validation + error handling + basic tests.
```

## Command 4: Menu and Admin Menu Management

```text
Build menu module end-to-end.

Customer side:
- browse categories and items
- view item details, images, dietary tags, allergens, availability

Staff dashboard:
- create/edit/delete categories
- create/edit/delete items
- manage prices
- toggle availability active/inactive
- set prep time
- manage add-ons/modifiers and min/max/required rules

Include server validation, pagination/search for admin, and audit-friendly update timestamps.
```

## Command 5: Cart and Checkout

```text
Implement cart + checkout flow.

Cart requirements:
- add/remove items
- choose modifiers/add-ons
- change quantity
- special instructions per item

Checkout requirements:
- order type: dine-in, delivery, self pickup
- calculate subtotal, discount, tax/VAT, delivery fee, total
- if VAT/tax not included, show it clearly in pricing/menu display
- payment method selection

Add robust validations (availability, modifier limits, minimum order, etc.).
```

## Command 6: Order Lifecycle and Tracking

```text
Implement complete order lifecycle for customer + staff.

Staff:
- receive new orders with clear visual queue
- update statuses:
  Accepted -> Preparing -> Ready/Out for delivery -> Completed
  Delivery-specific final status can be Delivered (map consistently)

Customer:
- live order status timeline
- estimated preparation/delivery time
- order history
- repeat order (recommended feature)

Add APIs, UI, and state transition guards.
```

## Command 7: Delivery Module

```text
Implement delivery-specific features.

Requirements:
- saved addresses
- delivery notes (gate code, call on arrival)
- delivery fee modes: flat OR distance-based OR zone-based
- delivery zones with out-of-zone behavior (block checkout with clear message)
- delivery status flow: Accepted -> Preparing -> Out for delivery -> Delivered

Include admin tools to manage zones and fee rules.
```

## Command 8: Payments (Flatpay + Cash)

```text
Implement payment module with provider abstraction.

Online provider:
- Flatpay integration adapter structure
- methods listed in specs: Visa, Mastercard, Google Pay, Apple Pay, PayPal, Klarna, MobilePay
- if provider APIs are unavailable, add mock/stub mode with same interfaces

Cash:
- support cash for dine-in and self pickup
- support cash on delivery / pay at counter behavior based on order type

Payment states:
- unpaid, authorized, paid, failed, refunded (partial/full)

Add webhook handling and idempotency protections.
```

## Command 9: Offers and Discounts

```text
Build offers/discount engine + management UI.

Must support:
- percentage discount
- fixed amount discount
- free delivery
- min/max order price limits
- active duration schedule
- applicability scope: dine-in only / delivery only / both
- optional daily/weekly offers section in customer UI

Include conflict resolution rules when multiple offers match.
```

## Command 10: Notifications

```text
Implement notification system for customers and staff.

Events to notify:
- new order for staff
- order accepted/preparing/ready/out for delivery/completed or delivered
- payment success/failure/refund
- optional offer announcements

Channels:
- in-app notifications mandatory
- email/SMS/push optional but design extensible interfaces

Add notification preferences and unread/read tracking.
```

## Command 11: Real-Time Updates

```text
Implement real-time mechanism for order queue and order tracking.

Requirements:
- customer order tracking updates in near real-time
- staff live order queue updates
- fallback polling strategy if websocket fails
- reconnect handling and event de-duplication

Document architecture decisions (WebSocket/SSE/polling hybrid).
```

## Command 12: Staff Dashboard and Reports

```text
Complete admin/staff dashboard.

Must include:
- login-protected dashboard
- live order queue
- status update controls
- menu management
- offers management
- payment settings management
- reports: sales and popular items with date filters

Focus on clear UX for high-speed restaurant operations.
```

## Command 13: Customer UX Completion

```text
Finish customer-facing UI/flows end-to-end.

Must include:
- register/login + guest browse
- menu browsing and filtering
- cart and checkout
- choose order type (dine-in/delivery/self pickup)
- choose payment type (online/cash where allowed)
- view status timeline and ETA
- order history + repeat order
- offers section

Ensure mobile-first responsive design.
```

## Command 14: Testing and QA

```text
Add comprehensive tests and QA checks.

Include:
- unit tests for pricing, discounts, fees, status transitions
- integration tests for auth, checkout, payment state handling
- end-to-end tests for customer order flow and staff fulfillment flow
- RBAC security tests
- webhook idempotency tests

Then run all tests and fix failures.
```

## Command 15: Security, Performance, and Reliability

```text
Harden the app for production.

Implement:
- input validation and sanitization
- rate limiting and brute-force protection
- secure cookie/token practices
- logging and audit trails for critical actions
- DB query optimization and caching where needed
- graceful error handling and monitoring hooks

Then provide a short security/performance report.
```

## Command 16: Deployment and Ops

```text
Prepare production deployment.

Deliver:
- production env var documentation
- migration/deploy scripts
- CI pipeline for lint/test/build
- backup and rollback strategy
- minimal runbook for incidents

Provide exact commands to deploy staging and production.
```

## Command 17: Final Traceability Checklist

```text
Create a final requirements traceability matrix mapping every requirement from specs.md to:
- implemented file/module
- API endpoint
- UI screen
- test coverage

Highlight any unresolved ambiguity and propose default decisions.
Do not leave any requirement unmapped.
```

## One-Shot Master Command (Optional)

```text
Read specs.md and implement the complete food ordering platform end-to-end with customer app and staff dashboard.
Do it in production quality with iterative commits/milestones.

You must include:
- auth: email/password, Google, phone verification, password reset, RBAC, guest behavior
- menu management: categories, items, images, dietary tags, allergens, availability, modifiers rules
- ordering: cart, checkout, subtotal/discount/tax/delivery/total, payment selection
- order types: dine-in, delivery, self pickup
- order lifecycle + real-time tracking + ETA + history + repeat order
- delivery: addresses, notes, zone checks, fee rules flat/distance/zone, out-of-zone handling
- payments: Flatpay-compatible adapter with listed methods + cash methods + payment states
- offers: percentage/fixed/free-delivery/min-max/duration/applicability + optional daily/weekly section
- notifications: staff new order + customer status/payment notifications
- staff dashboard: live queue, order updates, menu/offers/payment settings, reports sales/popular items
- tests (unit/integration/e2e), security hardening, performance, CI/CD, deployment docs
- final requirement traceability matrix to ensure nothing from specs.md is missed

If any requirement is ambiguous, choose a sensible default, implement it, and document the decision.
```
