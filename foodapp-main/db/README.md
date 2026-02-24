# Database Scaffold

This scaffold uses MySQL SQL migrations and seed scripts.
Scripts execute through local `mysql` CLI using `DATABASE_URL` from `.env`.

## Local Run

1. Ensure local MySQL is running and `DATABASE_URL` in `.env` points to it.

2. Apply migrations:

```powershell
npm run db:migrate
```

3. Seed sample data:

```powershell
npm run db:seed
```

## Notes

- Migration files live in `db/migrations/`.
- Seed files live in `db/seed/`.
- Scripts iterate SQL files in lexical order.
- `010_drop_unused_tables.sql` removes legacy cart/order/payment/reporting tables not used by runtime code.
