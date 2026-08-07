# Next.js Auth Demo

A complete email/password authentication example built with Next.js App Router, TypeScript, Prisma, PostgreSQL, Argon2id, Zod, Tailwind CSS, Vitest, and Playwright. The responsive modal is inspired by the supplied screenshots while using neutral demo branding.

## Requirements and setup

- Node.js 20.9 or newer (Node 22 LTS recommended)
- Docker with Compose, or an equivalent PostgreSQL 15+ server

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open <http://localhost:3000>. Seed accounts use password `DemoPassword1!`:

- `complete@example.com` signs directly into the dashboard.
- `incomplete@example.com` demonstrates profile completion.

Generate a development secret with `openssl rand -base64 32` and replace the example `SESSION_SECRET`. `DATABASE_URL` uses the Compose database by default.

## Database workflow and Prisma Studio

```bash
npx prisma validate
npx prisma migrate dev --name describe_change
npm run db:seed
npx prisma studio
```

Keep `docker compose up -d` running before starting Studio. Prisma Studio opens a browser GUI where the `User`, `Session`, and `OnboardingSession` tables can be viewed and edited. Stop services with `docker compose down`; add `-v` only when you intentionally want to delete local database data.

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Integration and browser tests expect the local PostgreSQL database to be migrated and seeded. The Playwright configuration starts the development server automatically.

## How authentication works

The database decides whether an email follows sign-in or signup. Passwords are Argon2id hashes. A complete account receives a seven-day opaque session cookie; incomplete accounts receive a 15-minute, profile-only onboarding cookie. Only SHA-256 token hashes are stored. Profile completion consumes onboarding authorization and creates a normal session. The dashboard resolves its user on the server and redirects anonymous visitors.

See [Development workflows](docs/development-workflows.md) for all day-to-day commands, [Authentication flow](docs/auth-flow.md) for the detailed code path, [Repository file guide](docs/file-guide.md) for every file's purpose and imports, and [Security notes](docs/security.md) for security decisions.

Generate symbol-level Markdown from the source TSDoc comments with:

```bash
npm run docs
```

Generated pages are written to `docs/reference/`. Run `npm run docs:check` in CI to validate documentation generation without retaining output.

With the development server running, browse the complete documentation portal at <http://localhost:3000/docs>.

## Customization and troubleshooting

- Replace the text in `.wordmark` elements with a licensed image or your own brand component, then update its accessible label.
- If port 5432 is occupied, change the host port in `docker-compose.yml` and the matching port in `DATABASE_URL`.
- If Prisma cannot connect, run `docker compose ps`, confirm the database is healthy, and check `.env`.
- If native Argon2 installation fails, use a supported Node LTS release and reinstall dependencies.
- After schema edits, create and commit a migration; do not use `db push` as the production migration workflow.

## Demo versus production

The example uses an in-memory per-process rate limiter and a placeholder reset-password action. Production needs a shared rate-limit store, verified proxy/IP configuration, email delivery and expiring reset tokens, observability with sensitive-field redaction, secret management, TLS, backups, dependency scanning, and organization-specific legal text. For higher-risk applications add MFA, breached-password screening, session management, audit events, and a deliberate account-enumeration policy.

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE).
