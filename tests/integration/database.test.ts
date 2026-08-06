import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { hashToken, ONBOARDING_MAX_AGE } from "@/lib/session";

const email = "integration@example.com";
describe.skipIf(!process.env.DATABASE_URL)("database authentication boundaries", () => {
  beforeAll(async () => {
    await db.user.deleteMany({ where: { email } });
  });
  afterAll(async () => {
    await db.user.deleteMany({ where: { email } });
    await db.$disconnect();
  });
  it("persists password hashes and scoped onboarding sessions", async () => {
    const user = await db.user.create({
      data: { email, passwordHash: await hashPassword("Integration1!") },
    });
    expect(await verifyPassword(user.passwordHash, "Integration1!")).toBe(true);
    const raw = "raw-onboarding-token";
    const record = await db.onboardingSession.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + ONBOARDING_MAX_AGE * 1000),
      },
    });
    expect(record.tokenHash).not.toBe(raw);
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
  });
  it("cascades auth records when a user is removed", async () => {
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    await db.user.delete({ where: { id: user.id } });
    expect(await db.onboardingSession.count({ where: { userId: user.id } })).toBe(0);
  });
});
