# AWS Amplify Deployment Guide

This project is configured for Amplify Hosting using the monorepo build spec in `../amplify.yml`.

## 1) Connect repository in Amplify

1. Open AWS Amplify -> **Hosting** -> **Create app**.
2. Choose your Git provider and repository.
3. Branch: choose your deploy branch.
4. Amplify will detect `amplify.yml` at repo root.
5. Confirm app root is `foodapp-main`.

## 2) Add environment variables (Amplify Console)

In Amplify app settings -> **Environment variables**, add:

- `NODE_ENV=production`
- `NEXT_PUBLIC_BASE_URL=https://<your-amplify-domain-or-custom-domain>`
- `AUTH_SECRET=<long-random-secret>`
- `DATABASE_URL=mysql://<user>:<password>@<host>:3306/foodapp`
- `ASSET_BASE_URL=https://<cdn-domain>` (optional, can be blank)
- `AWS_REGION=<region>`
- `AWS_S3_BUCKET=<bucket-name>`

Do not commit `.env` with real secrets.

## 3) Database connectivity note

Amplify Hosting SSR cannot directly attach your app runtime to private VPC resources.

Practical options:

- Use a publicly reachable MySQL endpoint with strict DB credentials and TLS.
- Or move DB access behind an API service that is VPC-enabled.

If you use Amazon RDS MySQL directly, you must ensure the DB endpoint is reachable from Amplify runtime.

## 4) Run migrations against production DB

Run migrations from your trusted machine/CI with the production `DATABASE_URL`:

```powershell
npm run db:migrate
```

Seed only when needed:

```powershell
npm run db:seed
```

## 5) Deploy

1. Push code to your connected branch.
2. Amplify auto-builds using:
   - `npm ci`
   - `npm run build`
3. After success, open the generated Amplify URL.

## 6) Recommended post-deploy

- Add custom domain in Amplify.
- Rotate `AUTH_SECRET` if exposed.
- Configure CloudWatch alarms and AWS Budgets.
- Enable SSL enforcement and secure cookie behavior (already tied to `NODE_ENV=production`).
