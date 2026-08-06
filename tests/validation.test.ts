import { describe, expect, it } from "vitest";
import {
  checkEmailSchema,
  isProfileComplete,
  passwordSchema,
  profileSchema,
} from "@/lib/validation";

describe("authentication validation", () => {
  it("normalizes valid email addresses", () => {
    expect(checkEmailSchema.parse({ email: "  Person@Example.COM " }).email).toBe(
      "person@example.com",
    );
  });
  it("rejects invalid email addresses", () =>
    expect(() => checkEmailSchema.parse({ email: "invalid" })).toThrow());
  it("enforces every password policy rule", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("StrongPassword1!").success).toBe(true);
  });
  it("calculates profile completeness", () => {
    const complete = {
      firstName: "A",
      lastName: "B",
      country: "US",
      cellPhone: "3035550100",
      birthday: new Date("1990-01-01"),
      zipCode: "80202",
      termsAcceptedAt: new Date(),
    };
    expect(isProfileComplete(complete)).toBe(true);
    expect(isProfileComplete({ ...complete, termsAcceptedAt: null })).toBe(false);
  });
  it("requires valid profile fields and a past birthday", () => {
    expect(
      profileSchema.safeParse({
        firstName: "A",
        lastName: "B",
        country: "US",
        cellPhone: "3035550100",
        birthday: "1990-01-01",
        zipCode: "80202",
      }).success,
    ).toBe(true);
    expect(
      profileSchema.safeParse({
        firstName: "",
        lastName: "B",
        country: "USA",
        cellPhone: "1",
        birthday: "2990-01-01",
        zipCode: "",
      }).success,
    ).toBe(false);
  });
});
