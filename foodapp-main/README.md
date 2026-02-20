# FoodApp Scaffold

Production-oriented scaffold for a mobile-friendly food ordering platform with customer and staff surfaces.

## Included in this scaffold

- Next.js App Router + TypeScript web app
- Customer routes: `/menu`, `/cart`, `/checkout`, `/offers`, `/orders/[orderId]`
- Staff routes: `/staff`, `/staff/orders`, `/staff/menu`
- API route handlers:
  - `/api/health`
  - `/api/menu`
  - `/api/cart`
  - `/api/cart/items`
  - `/api/cart/items/[cartItemId]`
  - `/api/checkout/preview`
  - `/api/checkout/place`
  - `/api/offers`
  - `/api/orders/[orderId]`
  - `/api/staff/orders`
  - `/api/auth/signup`
  - `/api/auth/login`
  - `/api/auth/logout`
  - `/api/auth/me`
  - `/api/auth/google`
  - `/api/auth/complete-profile`
  - `/api/auth/phone/send-code`
  - `/api/auth/phone/verify`
  - `/api/auth/password/forgot`
  - `/api/auth/password/reset`
- SQL database setup:
  - migrations in `db/migrations/`
  - seed scripts in `db/seed/`
  - Prisma schema mapped to SQL tables in `prisma/schema.prisma`
- Project setup:
  - `.env.example`
  - helper scripts in `scripts/`
- Quality:
  - ESLint scripts
  - format scripts (eslint fix based)
  - Node test runner setup in `tests/`

## Auth and RBAC (Command 3)

- JWT cookie auth (`foodapp_session`) with role claims
- Email/password signup + login for customer/staff
- Google login mock flow with required profile completion fields
- Phone verification code send/verify flow
- Password reset request + reset flow
- RBAC middleware for staff/admin and checkout restrictions
- Guest policy: browse allowed, checkout blocked unless logged in as verified customer
- Details documented in `AUTH_POLICY.md`

## Cart and Checkout (Command 5)

- Cart APIs support add/remove/update items, quantity, special instructions, and modifier choices.
- Checkout supports dine-in, delivery, and self pickup.
- Checkout summary computes subtotal, discount, tax/VAT, delivery fee, and total.
- Validation covers item availability, modifier min/max/required rules, quantity bounds, and delivery minimum order.

## Local startup

1. Ensure local MySQL is running and matches `DATABASE_URL` in `.env`.

2. Start app:

```powershell
npm run dev
```

3. Open:
- `http://localhost:3000`

## Database commands

These commands use local `mysql` CLI and `DATABASE_URL` from `.env`.

Run migration files:

```powershell
npm run db:migrate
```

Run seed files:

```powershell
npm run db:seed
```

Report aggregates (materialized strategy):

```sql
CALL refresh_report_materializations();
```

## AWS deployment (EC2 + RDS + S3)

- Host app on EC2 (`Amazon Linux 2023`, Node 20).
- Use RDS MySQL for `DATABASE_URL`.
- Store menu images in S3 and save either:
  - full `https://...` links in DB, or
  - relative paths (`/images/...`) with `ASSET_BASE_URL=https://<cdn-or-s3-domain>`.

Suggested production env values:

```env
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://your-domain
DATABASE_URL=mysql://<user>:<password>@<rds-endpoint>:3306/foodapp
AUTH_SECRET=<long-random-secret>
ASSET_BASE_URL=https://<cloudfront-or-s3-domain>
AWS_REGION=<region>
AWS_S3_BUCKET=<bucket-name>
```

Detailed console steps: `docs/AWS_CONSOLE_SETUP.md`

## Verification commands

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

## Notes about this environment

If package installation is blocked by offline cache policy, this scaffold still runs with current dependencies and keeps Prisma/advanced tooling structure ready for when installs are available.
