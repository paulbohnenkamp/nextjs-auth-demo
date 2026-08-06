import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { parseJson, requireSameOrigin } from "@/lib/api";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { isRateLimited, requestKey } from "@/lib/rate-limit";
import { createOnboardingSession } from "@/lib/session";
import { signupSchema } from "@/lib/validation";

/**
 * Creates a password account and starts its restricted profile-completion session.
 *
 * The password is validated and Argon2id-hashed before persistence. A uniqueness race is handled as
 * a safe conflict, and the returned HTTP-only onboarding cookie cannot access the dashboard.
 * Origin validation and rate limiting run before password hashing to avoid expensive work for rejected
 * traffic. User creation precedes onboarding-session issuance; no normal session exists at this point.
 *
 * @param request - JSON request containing normalized/normalizable `email` and policy-compliant `password`.
 * @returns HTTP 201 with `nextStep: "profile"`; HTTP 409 with `nextStep: "signin"` for an existing
 * email; HTTP 400, 403, or 429 for validation, origin, or rate-limit failures.
 */
export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request))
    return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 });
  if (isRateLimited(requestKey(request, "signup"), 8))
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again shortly." },
      { status: 429 },
    );
  const parsed = await parseJson(request, signupSchema);
  if ("error" in parsed) return parsed.error;
  try {
    const user = await db.user.create({
      data: { email: parsed.data.email, passwordHash: await hashPassword(parsed.data.password) },
    });
    await createOnboardingSession(user.id);
    return NextResponse.json({ ok: true, nextStep: "profile" }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "An account already exists. Sign in instead.", nextStep: "signin" },
        { status: 409 },
      );
    }
    throw error;
  }
}
