import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
});

/**
 * Validates security-sensitive environment variables before server infrastructure is initialized.
 *
 * `DATABASE_URL` must be a URL understood by Prisma and `SESSION_SECRET` must contain at least 32
 * characters. Zod throws a structured configuration error immediately instead of allowing a later,
 * less-explanatory database or security failure.
 *
 * @returns Parsed server configuration with required values narrowed to strings.
 * @throws `ZodError` when the environment is missing or malformed.
 */
export function getServerEnv() {
  return serverEnvSchema.parse(process.env);
}
