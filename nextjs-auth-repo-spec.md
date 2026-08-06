# `nextjs-auth` Repository Build Specification

Create a production-quality starter repository named **`nextjs-auth`** that demonstrates a complete sign-in and account-creation flow using:

- Next.js App Router with TypeScript
- React client components only where interactivity is required
- Prisma ORM
- PostgreSQL
- Secure, HTTP-only cookie sessions
- Tailwind CSS or an equivalent clean CSS implementation
- Zod validation
- A polished responsive UI matching the supplied reference screenshots

The goal is a working repository that can be run locally with PostgreSQL, not merely a visual mockup.

## Product behavior

The home page may be simple: show a centered **Sign In** button. Clicking it opens an accessible modal dialog.

The modal implements this state flow:

```text
Home page
  -> Sign In modal: enter email
       -> email does not exist: create account flow
       -> email exists: enter password
            -> invalid password: show error
            -> valid password + profile complete: create session and log in
            -> valid password + profile incomplete: collect profile data
                 -> save profile data, create session, log in
```

The database is authoritative. Do not decide whether an account exists from client-side state.

## Screens and visual requirements

Use the supplied screenshots as visual references:

1. Password screen with a filled password field.
2. Password screen with an empty password field.
3. Profile-completion screen.

The sign-in modal should have:

- Dark page background or backdrop
- White rounded modal panel
- Demo wordmark treatment, implemented as text or a local placeholder asset unless a logo asset is provided
- Large, centered heading
- Supporting explanatory text
- Email field with an **Edit** action after the email is accepted
- Password field with show/hide toggle
- **Reset password** link
- Full-width blue **Continue** button
- **Don't have an account? Sign up** action
- Keyboard navigation, visible focus states, Escape-to-close behavior, and appropriate ARIA labels

The profile-completion screen should include:

- First Name and Last Name side by side on desktop and stacked on narrow screens
- Country selector/default of `US`
- Cell Phone
- Birthday
- ZIP Code
- Read-only or disabled email field with an edit icon/action
- Full-width **Next** button
- Terms and privacy acknowledgment text
- **Log Out** action

Use the screenshots for spacing, typography, borders, rounded corners, colors, and hierarchy. Do not copy proprietary assets; use a clearly marked placeholder wordmark if no logo is available.

## Recommended repository structure

```text
nextjs-auth/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── check-email/route.ts
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   ├── profile/route.ts
│   │   │   └── signup/route.ts
│   │   └── session/route.ts
│   ├── dashboard/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── auth/
│   │   ├── AuthModal.tsx
│   │   ├── EmailStep.tsx
│   │   ├── PasswordStep.tsx
│   │   ├── ProfileStep.tsx
│   │   └── AuthError.tsx
│   └── ui/
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── password.ts
│   ├── session.ts
│   └── validation.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
├── tests/
├── .env.example
├── docker-compose.yml
├── package.json
├── README.md
└── tsconfig.json
```

## Database model

Use Prisma with PostgreSQL. At minimum, create these models:

```prisma
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String
  firstName       String?
  lastName        String?
  country         String?   @default("US")
  cellPhone       String?
  birthday        DateTime?
  zipCode         String?
  termsAcceptedAt DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  sessions        Session[]
}

model Session {
  id        String   @id @default(cuid())
  tokenHash String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@index([expiresAt])
}
```

Never store plaintext passwords or raw session tokens in the database. Hash passwords with Argon2id or bcrypt and hash session tokens before persistence.

## Authentication rules

- Normalize emails by trimming and lowercasing before lookup.
- Validate all request bodies on the server with Zod.
- Never trust client-provided `userId`, profile-complete flags, or authorization state.
- Use an HTTP-only, Secure cookie in production with SameSite protection.
- Expire sessions and delete them on logout.
- Use generic account-existence messaging where appropriate to reduce email enumeration.
- Add basic rate limiting or clearly document where it should be added.
- Do not log passwords, session tokens, or sensitive profile data.
- Protect dashboard/server data by resolving the current session server-side.

## API behavior

### `POST /api/auth/check-email`

Input:

```json
{ "email": "person@example.com" }
```

Return whether the next UI step is sign-in or account creation. Include a server-derived `profileComplete` indicator only for the authenticated password flow; do not expose unnecessary user data.

### `POST /api/auth/signup`

Create a user from email and password. If the email already exists, return a safe conflict response and direct the UI to sign in. Password policy must be explicit and tested.

### `POST /api/auth/login`

Verify email and password, then:

- If credentials are invalid, return a generic authentication error.
- If credentials are valid and all required profile fields are present, create a session and return success.
- If credentials are valid but profile data is incomplete, return a state telling the UI to show the profile-completion step. Do not create a fully authenticated session until profile completion is submitted, unless the implementation deliberately uses a short-lived onboarding session.

### `POST /api/auth/profile`

Save and validate first name, last name, country, phone, birthday, ZIP code, and terms acceptance. Complete onboarding, create the normal session, and return success.

### `POST /api/auth/logout`

Delete or invalidate the current session and clear the cookie.

## Client state machine

Represent the modal flow with a discriminated union or equivalent explicit state model. Avoid scattering boolean flags such as `isEmailStep`, `isPasswordStep`, and `isProfileStep` throughout the component tree.

Suggested states:

```ts
type AuthStep =
  | { kind: "email" }
  | { kind: "password"; email: string }
  | { kind: "profile"; email: string }
  | { kind: "success" };
```

Handle loading, field errors, server errors, retry behavior, and modal close/reset behavior explicitly.

## Testing requirements

Include tests for:

- Email normalization and validation
- Password hashing and verification
- Profile completeness calculation
- New email routing to account creation
- Existing email routing to password entry
- Invalid credentials
- Valid credentials with complete profile
- Valid credentials with incomplete profile
- Profile submission and terms acceptance
- Logout and expired sessions
- API authorization boundaries

Add at least one end-to-end test covering the complete new-user flow and one covering an existing-user login.

## Local development

Provide a `docker-compose.yml` for PostgreSQL and document:

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate dev
npm run dev
```

The README must explain:

- Required Node.js version
- PostgreSQL connection string
- Prisma migration and seed commands
- How to run tests and linting
- How to inspect the database with Prisma Studio
- How to replace the placeholder demo wordmark
- Which parts are demo-only and what would be required for production deployment

Use environment variables such as:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nextjs_auth"
SESSION_SECRET="replace-with-a-long-random-development-secret"
NODE_ENV="development"
```

## Definition of done

The repository is complete when:

1. `npm run dev` starts the application against local PostgreSQL.
2. The home page opens the sign-in modal.
3. A new email follows the create-account path.
4. An existing email follows the password path.
5. Invalid passwords are rejected without revealing sensitive details.
6. Complete profiles log in immediately after valid credentials.
7. Incomplete profiles show the third screenshot-inspired form.
8. Completing the form persists data and logs the user in.
9. Refreshing the browser preserves the session.
10. Logout invalidates the session.
11. Prisma migrations, seed data, tests, and README instructions are included.
12. The implementation is responsive and accessible.

## Important implementation note

This repository is intended as a clean authentication-flow demonstration. Keep the first implementation focused on the end-to-end flow, database correctness, secure sessions, and visual fidelity. Avoid adding social login, email delivery, multi-factor authentication, payments, or a full account-management area unless they are clearly isolated as future extensions.
