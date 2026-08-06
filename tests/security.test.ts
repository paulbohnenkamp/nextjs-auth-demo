import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import { cookieOptions, hashToken, ONBOARDING_MAX_AGE, SESSION_MAX_AGE } from "@/lib/session";

describe("security primitives", () => {
  it("hashes and verifies passwords without retaining plaintext", async () => {
    const password = "StrongPassword1!";
    const hash = await hashPassword(password);
    expect(hash).not.toContain(password);
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, password)).toBe(true);
    expect(await verifyPassword(hash, "WrongPassword1!")).toBe(false);
  });
  it("hashes session tokens deterministically", () => {
    expect(hashToken("secret")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken("secret")).not.toBe("secret");
  });
  it("uses hardened cookie settings and bounded expiries", () => {
    expect(cookieOptions(SESSION_MAX_AGE)).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    expect(ONBOARDING_MAX_AGE).toBeLessThan(SESSION_MAX_AGE);
  });
});
