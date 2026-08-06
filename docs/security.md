# Security architecture

This document explains what is protected, where each control lives in source, and what each security dependency contributes. It describes this repository as implemented; the final section identifies controls still required for production.

## Security model at a glance

The application has three authorization states:

1. **Anonymous:** no recognized authentication cookie. Public pages and account-entry APIs remain available.
2. **Onboarding-authorized:** a valid `nextjs_auth_onboarding` cookie identifies one user for profile completion only. It does not grant dashboard or `/api/session` access.
3. **Authenticated:** a valid `nextjs_auth_session` cookie resolves to a normal `Session` and its user. It grants dashboard and session-data access.

These states use different database tables, cookie names, lookup functions, and lifetimes. The client state machine improves the interface but grants no authority; every protected server entry point resolves its cookie and database record again.

## Route protection matrix

There is no global authentication middleware. Each protected page or API route performs the appropriate check at its server entry point.

| Route                        | Access                               | Protection and source                                                                                                                                                                 |
| ---------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /`                      | Public                               | Landing page in `app/page.tsx`; contains no private data.                                                                                                                             |
| `GET /docs` and `/docs/*`    | Public                               | Documentation routes in `app/docs`; file paths are allow-listed and constrained beneath the repository `docs` directory by `components/docs/DocumentationPage.tsx`.                   |
| `GET /terms`, `GET /privacy` | Public                               | Demo legal placeholders contain no account data.                                                                                                                                      |
| `GET /dashboard`             | **Normal session required**          | `app/dashboard/page.tsx` calls `getCurrentUser()` before rendering and redirects to `/` when it returns `null`.                                                                       |
| `POST /api/auth/check-email` | Public, rate-limited                 | Strict Zod body plus process-local discovery limit in `app/api/auth/check-email/route.ts`. It returns only the next UI state.                                                         |
| `POST /api/auth/signup`      | Public, origin-checked, rate-limited | Strict signup schema, password policy, unique-email handling, and Argon2id hashing in `app/api/auth/signup/route.ts`. Success creates onboarding authorization, not a normal session. |
| `POST /api/auth/login`       | Public, origin-checked, rate-limited | Generic credential errors and Argon2 verification in `app/api/auth/login/route.ts`. The database profile determines which session scope is issued.                                    |
| `POST /api/auth/profile`     | **Onboarding session required**      | `app/api/auth/profile/route.ts` calls `getOnboardingUser()` before parsing or writing profile data. The user ID and acceptance time never come from JSON.                             |
| `GET /api/session`           | **Normal session required**          | `app/api/session/route.ts` calls `getCurrentUser()` and returns HTTP 401 without it. Only safe display fields are returned.                                                           |
| `POST /api/auth/logout`      | Public/idempotent, origin-checked    | `app/api/auth/logout/route.ts` revokes any presented session hashes and cookies. It does not require login so logout remains safe when a session has expired.                         |

“Public” does not mean unvalidated. It means the caller does not need an existing session. Public mutation and credential routes still validate bodies, apply origin checks where relevant, and/or enforce rate limits.

## Protection examples

### Protected page: dashboard

The dashboard is a React Server Component, so authentication happens before HTML containing the account is produced:

```ts
const user = await getCurrentUser();
if (!user) redirect("/");
```

Opening <http://localhost:3000/dashboard> in an incognito window redirects to `/`. A normal session cookie allows it; an onboarding cookie alone does not.

### Protected API: current session

Without a normal session:

```bash
curl -i http://localhost:3000/api/session
```

The response is HTTP 401 with:

```json
{ "authenticated": false }
```

After UI login, the browser sends its HTTP-only cookie automatically and receives only `id`, `email`, `firstName`, `lastName`, and server-derived profile completeness.

### Onboarding-only API: profile

An anonymous request is rejected before its body can identify or modify anyone:

```bash
curl -i -X POST http://localhost:3000/api/auth/profile \
  -H 'Content-Type: application/json' \
  -d '{}'
```

The response is HTTP 401. After signup or valid login for an incomplete account, the onboarding cookie authorizes this route but still cannot open `/dashboard`.

### Public API: email routing

No session is needed because this endpoint begins authentication:

```bash
curl -i -X POST http://localhost:3000/api/auth/check-email \
  -H 'Content-Type: application/json' \
  -d '{"email":"complete@example.com"}'
```

It returns `signin` or `signup`, never a user ID, hash, session, or profile. This behavior inherently reveals account existence to the caller, so the source applies a basic limiter; production should decide whether to replace it with enumeration-resistant UX.

## Source map by security responsibility

| Responsibility                       | Primary source files                                                                                                        | What happens there                                                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Request validation and normalization | `lib/validation.ts`, `lib/api.ts`                                                                                           | Zod schemas define accepted JSON, transformations, field errors, and strict rejection of unknown keys.                        |
| Password storage                     | `lib/password.ts`, signup/login routes                                                                                      | Argon2id creates salted encoded hashes and verifies candidate passwords without decrypting anything.                          |
| Session credential generation        | `lib/session.ts`                                                                                                            | Node `crypto.randomBytes(32)` produces opaque 256-bit tokens; SHA-256 hashes are stored instead of raw tokens.                |
| Session persistence and relations    | `prisma/schema.prisma`, migration SQL                                                                                       | Separate `Session` and `OnboardingSession` tables reference users, index token hashes/expiries, and cascade on user deletion. |
| Cookie protection                    | `lib/session.ts`                                                                                                            | Cookies are HTTP-only, SameSite Lax, site-wide, time-limited, and Secure in production.                                       |
| Protected page authorization         | `app/dashboard/page.tsx`                                                                                                    | Resolves a normal session in server rendering and redirects before rendering private data.                                    |
| Protected API authorization          | profile/session routes                                                                                                      | Resolves onboarding or normal authorization before returning or changing protected state.                                     |
| CSRF boundary                        | `lib/api.ts` and state-changing auth routes                                                                                 | Browser requests with an Origin header must exactly match `request.nextUrl.origin`; SameSite cookies add defense in depth.    |
| Abuse throttling                     | `lib/rate-limit.ts`, check-email/signup/login routes                                                                        | Fixed-window counters limit repeated requests by action and forwarded address in one Node process.                            |
| Environment validation               | `lib/env.ts`, `lib/db.ts`                                                                                                   | Zod fails startup for a missing database URL or short session secret.                                                         |
| Client trust boundary                | `components/auth/AuthModal.tsx` and step components                                                                         | Client state controls presentation only; passwords are short-lived local state and no client `userId` is sent.                |
| Security regression tests            | `tests/security.test.ts`, `tests/integration/database.test.ts`, `tests/e2e/authorization.spec.ts`, `tests/e2e/auth.spec.ts` | Tests cover primitives, database scope/cascades, route boundaries, session persistence, invalid credentials, and logout.      |

## What Zod is and how it is used

[Zod](https://zod.dev/) is a runtime schema-validation library designed for TypeScript. TypeScript types disappear when JavaScript runs, so a TypeScript annotation cannot make incoming JSON safe. Zod checks actual runtime values and can transform them into a trusted server-side representation.

This repository uses Zod in `lib/validation.ts` for:

- email syntax, trimming, and lowercase normalization;
- new-password length and character-category policy;
- strict login, signup, and email-routing object shapes;
- profile name bounds, two-letter uppercase country codes, phone/postal bounds, and past birthdays;
- rejecting unknown properties through `.strict()`, including attempted client `userId`, `termsAcceptedAt`, or authorization flags.

`parseJson()` in `lib/api.ts` accepts any route-specific Zod schema. A successful parse returns transformed `data`; invalid JSON or schema failures become stable HTTP 400 responses with field errors. Route code only uses the parsed result.

Zod is validation, not authentication and not general HTML sanitization. Authorization still comes from sessions, and React performs its own text escaping when values are rendered.

## What Argon2id is and how passwords are handled

[Argon2](https://www.rfc-editor.org/rfc/rfc9106.html) is a password-hashing family designed to make offline guessing expensive. Argon2id combines resistance properties suited to password storage and is intentionally much slower and more memory-intensive than general-purpose hashes.

`lib/password.ts` configures:

- algorithm: Argon2id;
- memory cost: 19,456 KiB;
- time cost: 2 iterations;
- parallelism: 1 lane.

`hashPassword()` receives a policy-validated password, generates a random salt through the Argon2 library, and returns one encoded string containing the algorithm, parameters, salt, and derived hash. Only that string is stored in `User.passwordHash`; there is no plaintext password and no decryption operation.

`verifyPassword()` passes the stored encoded hash and login candidate to Argon2. Malformed hashes and mismatches both return `false`. API responses use the same message for a missing user and a wrong password.

Password policy and password hashing solve different problems: Zod rejects weak new choices, while Argon2 limits damage if stored hashes are stolen. Existing-user login accepts any non-empty candidate so future policy changes do not lock out older valid hashes.

## Why session tokens use SHA-256 instead of Argon2

Sessions use machine-generated tokens, not human-selected secrets. `randomBytes(32)` provides 256 bits of entropy, so brute-force guessing is infeasible without the cookie. A fast SHA-256 digest is appropriate for indexed database lookup; the expensive password-hashing properties of Argon2 are unnecessary for uniformly random tokens.

The browser receives the raw base64url token in an HTTP-only cookie. PostgreSQL receives only `SHA-256(rawToken)`. A database-only compromise therefore does not directly provide a cookie credential.

## Normal sessions versus onboarding sessions

`lib/session.ts` keeps capabilities separate:

- Normal sessions last seven days and resolve through `getCurrentUser()`.
- Onboarding sessions last fifteen minutes and resolve through `getOnboardingUser()`.
- Creating onboarding authorization removes previous onboarding rows for that user.
- Completing the profile deletes the presented onboarding row/cookie and generates an independent normal token.
- Expired records are rejected and removed when observed.
- Logout deletes hashes for both presented cookies before clearing them.

The database schema enforces unique token hashes, indexes lookups and expiry, and cascades sessions when a user is deleted. Raw tokens and passwords are never logged or returned by APIs.

## Cookie and CSRF behavior

Authentication cookies use:

- `httpOnly: true`: browser JavaScript cannot read them;
- `sameSite: "lax"`: browsers generally do not attach them to cross-site subrequests or POSTs;
- `secure: true` in production: cookies travel only over HTTPS;
- `path: "/"`: pages and APIs can use the same credential;
- `maxAge`: browser lifetime matches the corresponding server policy.

SameSite is supplemented by `requireSameOrigin()` for state-changing routes. If a browser supplies an Origin header, it must exactly equal the request origin. Requests without Origin are allowed for non-browser tools, so API clients must still protect their own credentials. This demo does not implement synchronizer CSRF tokens.

## Prisma and PostgreSQL security role

Prisma supplies parameterized database operations rather than assembling SQL from request strings. The schema provides unique email/token constraints and foreign keys. Prisma does not decide authorization automatically: routes must still resolve the appropriate session and constrain every query to the server-derived user.

`npx prisma studio` is an administrative development tool with direct editing access to the configured database. Do not expose Studio publicly or run it against production without a separately secured administrative access path.

## Rate limiting limitations

`lib/rate-limit.ts` uses a `Map` inside one Node process. It demonstrates where throttling belongs, but:

- server restarts clear counts;
- multiple processes or serverless instances do not share counts;
- keys can accumulate until process restart;
- `x-forwarded-for` is trustworthy only behind a correctly configured proxy;
- it is not a durable denial-of-service control.

Production should use an atomic shared store such as Redis and combine per-IP, per-account, and global limits with trusted proxy configuration and monitoring.

## Security tests

Run all unit and database security tests:

```bash
npm test
```

Run browser-level route-boundary and complete-flow tests:

```bash
npm run test:e2e
```

Coverage includes:

- Argon2 hashing, successful verification, and failed verification;
- deterministic token hashing without raw-token persistence;
- cookie flags and shorter onboarding lifetime;
- database separation of onboarding from normal sessions and cascading deletion;
- anonymous dashboard redirect;
- public page and public email-route access;
- HTTP 401 from normal-session and onboarding-protected APIs without their cookies;
- onboarding cookies being insufficient for dashboard or `/api/session` access;
- cross-origin mutation rejection;
- valid login, invalid credentials, session persistence across refresh, and logout invalidation.

## Production deployment checklist

1. Store database credentials and all secrets in a platform secret manager. `SESSION_SECRET` is validated for extension readiness but current opaque sessions derive security from random tokens rather than signing with this value.
2. Terminate TLS correctly and run with `NODE_ENV=production` so cookies are Secure.
3. Replace the process-local limiter with shared atomic storage and trusted proxy/IP handling.
4. Add email delivery and single-use, short-lived, hashed password-reset tokens without revealing account existence.
5. Add structured audit events and metrics while excluding passwords, tokens, birthdays, phone numbers, and request bodies.
6. Configure PostgreSQL TLS, least-privilege credentials, network isolation, encrypted backups, restore testing, retention, and deletion procedures.
7. Define Content Security Policy and related security headers appropriate to deployment.
8. Replace demo legal copy; review accessibility, enumeration policy, session lifetime, and privacy obligations.
9. Add MFA, breached-password screening, session-management UI, and security notifications when product risk requires them.
10. Run dependency, secret, SAST, DAST, and container scanning in CI; use `prisma migrate deploy` for releases.
