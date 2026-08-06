# Repository file guide

This guide explains where each source file runs, why it exists, and what its important imports contribute. Generated directories such as `node_modules`, `.next`, and `docs/reference` are intentionally omitted.

## Authentication API routes

Every `route.ts` file is a Next.js Route Handler. Next.js maps its exported HTTP-method function directly to the file's URL. These files run only on the server.

| File                                | URL and purpose                                                                                                                                                              | Important imports                                                                                                                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/api/auth/check-email/route.ts` | `POST /api/auth/check-email`; normalizes an email, asks PostgreSQL if it exists, and returns `signin` or `signup`.                                                           | `NextRequest`/`NextResponse` provide HTTP primitives; `parseJson` validates JSON; `db` queries Prisma; `checkEmailSchema` defines the body; rate-limit helpers constrain discovery attempts. |
| `app/api/auth/signup/route.ts`      | `POST /api/auth/signup`; validates a new password, creates a user, and issues a profile-only onboarding cookie.                                                              | Prisma's error type identifies unique-email conflicts; `hashPassword` applies Argon2id; `createOnboardingSession` stores only a token hash; `requireSameOrigin` checks browser origin.       |
| `app/api/auth/login/route.ts`       | `POST /api/auth/login`; verifies credentials and issues either a normal session or an onboarding session.                                                                    | `verifyPassword` checks Argon2; `isProfileComplete` makes the server-side branch decision; session helpers set scoped HTTP-only cookies.                                                     |
| `app/api/auth/profile/route.ts`     | `POST /api/auth/profile`; resolves the onboarding cookie, validates required fields, records terms acceptance, then exchanges onboarding authorization for a normal session. | `getOnboardingUser` supplies identity without trusting a user ID; `profileSchema` validates the form; `db.user.update` persists it.                                                          |
| `app/api/auth/logout/route.ts`      | `POST /api/auth/logout`; removes both session types and clears their cookies.                                                                                                | `revokeAuth` centralizes database and cookie cleanup; `requireSameOrigin` prevents a cross-origin browser logout request.                                                                    |
| `app/api/session/route.ts`          | `GET /api/session`; returns a small safe representation of the current user or HTTP 401.                                                                                     | `getCurrentUser` resolves the opaque cookie; `isProfileComplete` reports server-derived profile state.                                                                                       |

### How to read a Route Handler

Read each route from top to bottom as a security boundary:

1. Check request origin and/or rate limit.
2. Parse JSON with a strict Zod schema.
3. Derive identity or state from PostgreSQL and secure cookies.
4. Perform the smallest database mutation.
5. Return a stable JSON envelope with an appropriate HTTP status.

The browser never supplies a trusted `userId`, profile-completion flag, session token hash, or terms timestamp.

## Pages and application shell

| File                                                  | Purpose                                                                     | Important imports                                                                                                                          |
| ----------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/layout.tsx`                                      | Root HTML shell, global CSS import, title, and description.                 | Next.js `Metadata` statically types page metadata.                                                                                         |
| `app/page.tsx`                                        | Public landing page containing the button that launches authentication.     | `AuthLauncher` is the small client boundary controlling modal visibility.                                                                  |
| `app/dashboard/page.tsx`                              | Server Component that protects authenticated content.                       | `getCurrentUser` reads the request cookie server-side; `redirect` prevents anonymous rendering; `LogoutButton` handles interactive logout. |
| `app/loading.tsx`                                     | App Router loading fallback.                                                | No imports are needed.                                                                                                                     |
| `app/error.tsx`                                       | Client error boundary with a retry callback.                                | The `"use client"` directive permits the click handler.                                                                                    |
| `app/terms/page.tsx`                                  | Demo legal placeholder.                                                     | Next.js `Link` performs internal navigation.                                                                                               |
| `app/privacy/page.tsx`                                | Demo privacy placeholder.                                                   | Next.js `Link` performs internal navigation.                                                                                               |
| `app/docs/page.tsx` and `app/docs/[...slug]/page.tsx` | Entry routes for the browser documentation index and nested Markdown paths. | The shared `DocumentationPage` renderer receives either an empty or captured slug.                                                         |
| `app/globals.css`                                     | Tailwind import plus the screenshot-inspired responsive visual system.      | `@import "tailwindcss"` supplies utility support; most styling uses named local classes for readability.                                   |

## Authentication components

These files run in the browser because authentication is an interactive modal. Only `AuthLauncher`, `AuthModal`, and `LogoutButton` require the `"use client"` directive; their imported children inherit the client boundary.

| File                                    | Purpose                                                                                                                | Important imports                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `components/auth/AuthLauncher.tsx`      | Opens/closes the modal and restores focus to the Sign In button.                                                       | React state/ref hooks; `AuthModal`.                                             |
| `components/auth/AuthModal.tsx`         | Owns the discriminated-union state machine, API calls, errors, focus trap, Escape handling, and successful navigation. | React event/hooks; Next.js `useRouter`; the three step components.              |
| `components/auth/EmailStep.tsx`         | Email form used before the database selects signup or sign-in.                                                         | React `FormEvent`; shared `AuthError`.                                          |
| `components/auth/PasswordStep.tsx`      | Sign-in or signup password form with show/hide and edit-email actions.                                                 | React local state; shared `AuthError`.                                          |
| `components/auth/ProfileStep.tsx`       | Required profile form and terms acknowledgment.                                                                        | React `FormEvent`; shared `AuthError`.                                          |
| `components/auth/AuthError.tsx`         | Consistent visible and screen-reader-announced error output.                                                           | No imports are needed with the configured JSX transform.                        |
| `components/auth/LogoutButton.tsx`      | Calls logout, replaces browser history with `/`, and refreshes server state.                                           | React state; Next.js `useRouter`.                                               |
| `components/docs/DocumentationPage.tsx` | Safely reads repository Markdown, renders GitHub-flavored content, and rewrites links through the browser portal.      | Node `fs`/`path`; `react-markdown`; `remark-gfm`; Next.js links and `notFound`. |

## Server libraries

| File                | Purpose                                                                                                            | Important imports                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `lib/db.ts`         | Creates one reusable Prisma Client and avoids connection-pool multiplication during hot reload.                    | `PrismaClient`; `getServerEnv`.                                                    |
| `lib/env.ts`        | Fails fast when the database URL or session secret is missing/weak.                                                | Zod.                                                                               |
| `lib/validation.ts` | Canonical email, password policy, request schemas, profile parsing, and completeness policy.                       | Zod.                                                                               |
| `lib/password.ts`   | Argon2id hashing and safe verification.                                                                            | Native `argon2` package.                                                           |
| `lib/session.ts`    | Token generation/hashing, cookies, normal/onboarding persistence, resolution, expiry, consumption, and revocation. | Node `crypto`; Prisma's `User` type; Next.js async `cookies`; `db`.                |
| `lib/api.ts`        | Shared JSON parsing/error envelopes and same-origin verification.                                                  | Next.js request/response types; generic Zod schema type.                           |
| `lib/rate-limit.ts` | Educational in-memory fixed-window limiter.                                                                        | No imports; production should replace its process-local `Map` with shared storage. |

## Database

| File                                                  | Purpose                                                                                                                          |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                | Declares PostgreSQL, Prisma Client generation, `User`, normal `Session`, relations, indexes, and restricted `OnboardingSession`. |
| `prisma/migrations/20260805000000_init/migration.sql` | Reproducibly creates the schema in PostgreSQL.                                                                                   |
| `prisma/migrations/migration_lock.toml`               | Locks migrations to the PostgreSQL provider.                                                                                     |
| `prisma/seed.ts`                                      | Idempotently creates one complete and one incomplete user with Argon2id password hashes.                                         |

## Tests

| File                                 | Purpose                                                                                                             | Important imports                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `tests/validation.test.ts`           | Unit-tests normalization, schemas, password policy, and profile completeness.                                       | Vitest and `lib/validation`.                            |
| `tests/security.test.ts`             | Unit-tests Argon2, token hashing, cookie flags, and session lifetimes.                                              | Vitest, password helpers, and session primitives.       |
| `tests/integration/database.test.ts` | Verifies hashed credentials, onboarding scope, and cascading deletion against PostgreSQL.                           | Vitest, Prisma singleton, password and session helpers. |
| `tests/e2e/auth.spec.ts`             | Drives new-account and existing-account flows through a real browser.                                               | Playwright fixtures and assertions.                     |
| `tests/e2e/accessibility.spec.ts`    | Verifies dialog visibility, Escape close, focus restoration, and the mobile project.                                | Playwright fixtures and assertions.                     |
| `tests/e2e/authorization.spec.ts`    | Verifies public access, anonymous rejection, onboarding isolation, dashboard redirects, and cross-origin rejection. | Playwright request and browser fixtures.                |

## Tool configuration

| File                                 | Purpose                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| `package.json` / `package-lock.json` | Dependencies, pinned reproducible versions, Node requirement, and developer scripts. |
| `tsconfig.json`                      | Strict TypeScript and the `@/` repository-root import alias.                         |
| `next.config.ts`                     | Typed routes, header hardening, and explicit Turbopack root.                         |
| `eslint.config.mjs`                  | Next.js Core Web Vitals and TypeScript lint rules.                                   |
| `postcss.config.mjs`                 | Loads Tailwind's PostCSS integration.                                                |
| `vitest.config.mts`                  | Node test environment, source alias, E2E exclusion, and coverage output.             |
| `playwright.config.ts`               | Desktop/mobile Chromium projects and automatic dev-server startup.                   |
| `typedoc.json`                       | Expands production TypeScript entry points into generated Markdown API reference.    |
| `prisma.config.ts`                   | Configures Prisma schema discovery, migration storage, and the seed command.         |
| `docker-compose.yml`                 | Local PostgreSQL service, persistent volume, port, and health check.                 |
| `.env.example`                       | Safe-to-commit environment variable template.                                        |

## Generated API reference

TSDoc comments are the source of truth for symbol-level documentation. Generate browsable Markdown from them with:

```bash
npm run docs
```

The output is written to `docs/reference/` and is gitignored because it can always be regenerated. Validate the comments and TypeDoc configuration without retaining output with:

```bash
npm run docs:check
```
