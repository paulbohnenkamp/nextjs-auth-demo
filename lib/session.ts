import { createHash, randomBytes } from "node:crypto";
import type { User } from "@prisma/client";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

/** Browser cookie containing the opaque normal-session token. */
export const SESSION_COOKIE = "nextjs_auth_session";
/** Browser cookie containing the restricted profile-completion token. */
export const ONBOARDING_COOKIE = "nextjs_auth_onboarding";
/** Normal session lifetime in seconds: seven days. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
/** Onboarding session lifetime in seconds: fifteen minutes. */
export const ONBOARDING_MAX_AGE = 60 * 15;

/**
 * Converts a raw opaque token into the one-way value persisted in PostgreSQL.
 *
 * Raw tokens exist only in HTTP-only browser cookies. Hashing means a database read alone cannot be
 * used as a session credential. SHA-256 is appropriate here because tokens have 256 bits of random
 * entropy and do not require the intentionally slow treatment used for human passwords.
 *
 * @param token - Base64url cookie value generated from cryptographically secure random bytes.
 * @returns Lowercase hexadecimal SHA-256 digest used for indexed lookup.
 */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");
const expiresIn = (seconds: number) => new Date(Date.now() + seconds * 1000);

/**
 * Returns the shared security attributes used by normal and onboarding cookies.
 *
 * JavaScript cannot read HTTP-only cookies; SameSite Lax reduces cross-site request attachment; and
 * production enables Secure so browsers send them only over HTTPS. Both cookies are site-wide because
 * the dashboard and API handlers need access.
 *
 * @param maxAge - Browser lifetime in seconds, matching the corresponding database expiry policy.
 * @returns Cookie options accepted by Next.js's async cookie store.
 */
export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/**
 * Creates a normal authenticated session for a profile-complete user.
 *
 * A new 256-bit opaque token is generated for every call. The transaction removes the user's expired
 * sessions and stores only the token hash with a seven-day expiry; afterward the raw token is written
 * to the outgoing HTTP-only cookie. This function must run in a Route Handler or Server Function where
 * Next.js permits response-cookie mutation.
 *
 * @param userId - Database ID established by signup/login/profile server logic, never arbitrary client JSON.
 * @returns A promise that resolves after database persistence and cookie creation.
 */
export async function createSession(userId: string) {
  const token = newToken();
  await db.$transaction([
    db.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } }),
    db.session.create({
      data: { userId, tokenHash: hashToken(token), expiresAt: expiresIn(SESSION_MAX_AGE) },
    }),
  ]);
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(SESSION_MAX_AGE));
}

/**
 * Creates restricted authorization for profile completion without authenticating the dashboard.
 *
 * Existing onboarding rows for the user are removed so only the newest browser token remains useful.
 * The stored hash expires after fifteen minutes. Routes resolve this separate cookie only through
 * {@link getOnboardingUser}; normal session resolution never accepts it.
 *
 * @param userId - User verified by signup or password login.
 * @returns A promise that resolves after replacing database authorization and setting the cookie.
 */
export async function createOnboardingSession(userId: string) {
  const token = newToken();
  await db.$transaction([
    db.onboardingSession.deleteMany({ where: { userId } }),
    db.onboardingSession.create({
      data: { userId, tokenHash: hashToken(token), expiresAt: expiresIn(ONBOARDING_MAX_AGE) },
    }),
  ]);
  (await cookies()).set(ONBOARDING_COOKIE, token, cookieOptions(ONBOARDING_MAX_AGE));
}

/**
 * Resolves the request's normal cookie into the authoritative Prisma user.
 *
 * The raw cookie is hashed before indexed lookup. Missing and unknown tokens return `null`; expired
 * records are deleted on discovery and also return `null`. Callers must treat `null` as anonymous and
 * must never fall back to client state. This read-only cookie usage is safe in Server Components.
 *
 * @returns The related `User` for a live normal session, otherwise `null`.
 */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return session.user;
}

/**
 * Resolves restricted onboarding authorization to the profile owner.
 *
 * This mirrors normal session lookup but queries `OnboardingSession`, keeping the two capabilities
 * structurally separate. An expired row is removed when observed. Possessing this cookie permits only
 * routes that explicitly call this helper; it is never accepted by the dashboard.
 *
 * @returns The related user for an unexpired onboarding record, otherwise `null`.
 */
export async function getOnboardingUser(): Promise<User | null> {
  const token = (await cookies()).get(ONBOARDING_COOKIE)?.value;
  if (!token) return null;
  const session = await db.onboardingSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date()) {
    if (session)
      await db.onboardingSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return session.user;
}

/**
 * Revokes every authentication capability currently presented by the browser.
 *
 * Normal and onboarding token hashes are deleted concurrently, then both cookie names are cleared.
 * `deleteMany` makes logout idempotent when a token is missing, already expired, or already revoked.
 * It intentionally affects only the presented tokens, not every session belonging to the user.
 *
 * @returns A promise that resolves after database revocation and outgoing cookie deletion.
 */
export async function revokeAuth() {
  const store = await cookies();
  const sessionToken = store.get(SESSION_COOKIE)?.value;
  const onboardingToken = store.get(ONBOARDING_COOKIE)?.value;
  await Promise.all([
    sessionToken
      ? db.session.deleteMany({ where: { tokenHash: hashToken(sessionToken) } })
      : undefined,
    onboardingToken
      ? db.onboardingSession.deleteMany({ where: { tokenHash: hashToken(onboardingToken) } })
      : undefined,
  ]);
  store.delete(SESSION_COOKIE);
  store.delete(ONBOARDING_COOKIE);
}

/**
 * Exchanges a completed profile's restricted onboarding capability for a normal session.
 *
 * The presented onboarding hash is deleted and its cookie cleared before {@link createSession} writes
 * a new independent random credential. The caller must first resolve onboarding, validate fields, and
 * persist the completed profile; this function trusts the server-established `userId`, not request JSON.
 *
 * @param userId - User whose validated profile has just been completed.
 * @returns A promise that resolves after onboarding consumption and normal-session issuance.
 */
export async function consumeOnboardingAndCreateSession(userId: string) {
  const store = await cookies();
  const token = store.get(ONBOARDING_COOKIE)?.value;
  if (token) await db.onboardingSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(ONBOARDING_COOKIE);
  await createSession(userId);
}
