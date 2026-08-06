import { PrismaClient } from "@prisma/client";
import { getServerEnv } from "@/lib/env";

getServerEnv();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Shared Prisma Client used by server code.
 *
 * Development stores the instance on `globalThis` so Next.js hot reloads do not create a new
 * PostgreSQL connection pool on every module refresh.
 * `getServerEnv` runs before construction, so invalid database/security configuration fails at startup.
 * Production avoids the global assignment and relies on the module singleton for the process lifetime.
 */
export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
