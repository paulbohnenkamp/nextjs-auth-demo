import { z } from "zod";

/**
 * Produces the single email representation used by every lookup and write.
 *
 * @param email - Already syntactically validated or candidate email text.
 * @returns Leading/trailing whitespace removed and all characters lowercased.
 */
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Shared Zod email contract: trims, validates syntax, then applies {@link normalizeEmail}.
 * The transformed output—not the original spelling—is used by Prisma's unique index.
 */
export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address")
  .transform(normalizeEmail);

/**
 * Account-creation password policy.
 *
 * New passwords require at least twelve characters plus lowercase, uppercase, numeric, and symbol
 * categories. Login intentionally accepts any non-empty string so older hashes could remain usable if
 * policy changes later; only signup applies this schema.
 */
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number")
  .regex(/[^A-Za-z0-9]/, "Include a symbol");

/** Strict `{ email }` body for account-existence routing; unknown properties are rejected. */
export const checkEmailSchema = z.object({ email: emailSchema }).strict();
/** Strict login body using canonical email and any non-empty candidate password. */
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1) }).strict();
/** Strict signup body combining canonical email with the current creation policy. */
export const signupSchema = z.object({ email: emailSchema, password: passwordSchema }).strict();

const pastBirthday = z.coerce
  .date()
  .refine((date) => date < new Date(), "Birthday must be in the past");

/**
 * Strict profile-completion request contract.
 *
 * Names are trimmed and bounded, country is normalized to a two-letter uppercase code, birthday is
 * coerced from the native date input and must be in the past, and phone/postal fields remain strings.
 * Email, user ID, terms timestamp, and completion state are intentionally absent because the server
 * derives them from onboarding authorization and request time.
 */
export const profileSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(80),
    lastName: z.string().trim().min(1, "Last name is required").max(80),
    country: z.string().trim().length(2, "Use a two-letter country code").toUpperCase(),
    cellPhone: z.string().trim().min(7, "Enter a valid phone number").max(30),
    birthday: pastBirthday,
    zipCode: z.string().trim().min(3, "Enter a valid ZIP or postal code").max(12),
  })
  .strict();

/** Parsed profile output: trimmed strings, uppercase country, and a real `Date` birthday. */
export type ProfileInput = z.infer<typeof profileSchema>;

/**
 * Minimal database-derived shape needed by {@link isProfileComplete}.
 * It matches nullable Prisma `User` fields without coupling the policy to the full generated model.
 */
export type ProfileLike = {
  firstName: string | null;
  lastName: string | null;
  country: string | null;
  cellPhone: string | null;
  birthday: Date | null;
  zipCode: string | null;
  termsAcceptedAt: Date | null;
};

/**
 * Applies the server-side gate between onboarding and normal authentication.
 *
 * Every required string must contain non-whitespace text, birthday must exist and be in the past, and
 * a server-generated terms timestamp must be present. Routes calculate this from the database record;
 * a browser-provided boolean is never accepted.
 *
 * @param user - Nullable profile fields selected from a Prisma user record.
 * @returns `true` only when the user may receive a normal session.
 */
export function isProfileComplete(user: ProfileLike) {
  return Boolean(
    user.firstName?.trim() &&
    user.lastName?.trim() &&
    user.country?.trim() &&
    user.cellPhone?.trim() &&
    user.birthday &&
    user.birthday < new Date() &&
    user.zipCode?.trim() &&
    user.termsAcceptedAt,
  );
}
