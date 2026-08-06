# Authentication code flow

## UI state machine

`AuthModal` owns a discriminated union rather than independent visibility flags:

```text
email
  ├─ existing address ─> password/signin
  └─ new address ──────> password/signup ─> profile

password/signin
  ├─ complete profile ─> dashboard
  └─ incomplete ───────> profile ─> dashboard
```

Closing the modal resets its local state. Editing the email during onboarding revokes the scoped onboarding cookie before returning to the email step. Loading and server errors are explicit state shared by the active step.

## Request and data sequence

```text
Browser                    Next.js API                 PostgreSQL / Prisma
   |                            |                                |
   |-- POST /check-email ------>|                                |
   |                            |-- normalized email lookup ---->|
   |                            |<-- exists or absent ------------|
   |<-- signin or signup -------|                                |
   |                            |                                |
   |-- POST /login or /signup ->|                                |
   |                            |-- verify or create password --->|
   |                            |                                |
   |        Complete profile    |-- store normal session hash -->|
   |<-- normal HTTP-only cookie-|                                |
   |                            |                                |
   |        Incomplete profile  |-- store onboarding hash ------>|
   |<-- onboarding cookie ------|                                |
   |-- POST /profile ---------->|                                |
   |                            |-- resolve onboarding cookie --->|
   |                            |-- update profile -------------->|
   |                            |-- consume onboarding session -->|
   |                            |-- store normal session hash --->|
   |<-- normal HTTP-only cookie-|                                |
   |                            |                                |
   |-- GET /dashboard --------->|-- resolve normal session ------>|
   |<-- dashboard or redirect --|                                |
```

The diagram uses a plain-text code block so it renders consistently in VS Code's built-in Markdown preview without a Mermaid extension.

## File guide

- `components/auth/AuthModal.tsx` coordinates the client state machine and API calls.
- `app/api/auth/*` validates requests and performs server-authorized transitions.
- `lib/validation.ts` is the shared input and profile-completeness policy.
- `lib/password.ts` contains Argon2id operations.
- `lib/session.ts` creates, resolves, expires, consumes, and revokes opaque sessions.
- `prisma/schema.prisma` defines durable users and both session scopes.

API payloads never contain a user ID or authorization flag. `/api/auth/profile` derives the account exclusively from the HTTP-only onboarding cookie. `/api/session` exposes only safe display fields.
