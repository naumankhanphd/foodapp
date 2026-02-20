# Authentication and RBAC Decisions

## Session Strategy

- Strategy: signed JWT in an HTTP-only cookie (`foodapp_session`)
- Signature: `HS256` using `AUTH_SECRET`
- Lifetime: 12 hours
- Why: enables stateless auth checks in middleware and route handlers without a central session service in this scaffold.

## Guest Checkout Policy

- Guests can browse: home, menu, offers, auth pages.
- Checkout restriction: user must be authenticated as `CUSTOMER` and have verified phone.
- Staff dashboard restriction: requires `STAFF` or `ADMIN` role.

## Google Auth in This Scaffold

- Implemented as a mock OAuth callback endpoint that receives profile fields.
- If mandatory profile fields are missing (`phone`, `address`, `location`), user is redirected to completion flow before access is granted.
- Production integration can replace this route with a real Google OAuth provider while keeping the completion flow.

## Mandatory Google Completion Fields

- Phone
- Address line
- City
- Latitude
- Longitude
