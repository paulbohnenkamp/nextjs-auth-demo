import { NextRequest, NextResponse } from "next/server";
import { parseJson, requireSameOrigin } from "@/lib/api";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { isRateLimited, requestKey } from "@/lib/rate-limit";
import { createOnboardingSession, createSession } from "@/lib/session";
import { isProfileComplete, loginSchema } from "@/lib/validation";

/**
 * Verifies email/password credentials and selects the server-authorized next step.
 *
 * Complete users receive a normal session. Incomplete users receive only a short-lived onboarding
 * session. Missing users and incorrect passwords share the same public error message.
 * The database user, not client state, supplies both the stored hash and profile fields. Argon2
 * verification completes before the server selects either session scope.
 *
 * @param request - JSON request containing `email` and the candidate `password`.
 * @returns HTTP 200 with `nextStep: "dashboard"` and a normal cookie, or `nextStep: "profile"` and an
 * onboarding cookie. Invalid credentials return HTTP 401 without distinguishing their cause.
 */
export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request))
    return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 });
  if (isRateLimited(requestKey(request, "login"), 10))
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again shortly." },
      { status: 429 },
    );
  const parsed = await parseJson(request, loginSchema);
  if ("error" in parsed) return parsed.error;
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
    return NextResponse.json(
      { ok: false, error: "Email or password is incorrect" },
      { status: 401 },
    );
  }
  if (!isProfileComplete(user)) {
    await createOnboardingSession(user.id);
    return NextResponse.json({ ok: true, nextStep: "profile" });
  }
  await createSession(user.id);
  return NextResponse.json({ ok: true, nextStep: "dashboard" });
}
