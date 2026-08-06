import argon2 from "argon2";

const options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * Creates a salted Argon2id password hash suitable for `User.passwordHash`.
 *
 * The native library generates a fresh random salt and encodes the algorithm, salt, cost settings,
 * and derived value into the returned string. The configured memory/time costs balance local-demo
 * speed with a meaningful password-cracking cost; production should benchmark them on deployment hardware.
 *
 * @param password - Policy-validated plaintext that must never be logged or persisted.
 * @returns An encoded Argon2id string safe to store in PostgreSQL.
 */
export function hashPassword(password: string) {
  return argon2.hash(password, options);
}

/**
 * Compares a candidate password with an encoded Argon2 hash.
 * Malformed hashes are treated as failed authentication rather than leaked as errors.
 *
 * @param hash - Encoded value read from `User.passwordHash`.
 * @param password - Candidate plaintext received over the authenticated request boundary.
 * @returns `true` only when Argon2 verification succeeds; otherwise `false`.
 */
export async function verifyPassword(hash: string, password: string) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
