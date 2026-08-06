import { NextRequest, NextResponse } from "next/server";
import { parseJson, requireSameOrigin } from "@/lib/api";
import { db } from "@/lib/db";
import { consumeOnboardingAndCreateSession, getOnboardingUser } from "@/lib/session";
import { profileSchema } from "@/lib/validation";

/**
 * Completes the profile belonging to the current onboarding cookie.
 *
 * No user identifier is accepted in the body. Successful completion records terms acceptance,
 * consumes the onboarding session, and issues a normal authenticated session.
 * Profile fields are written only after the onboarding cookie resolves to an unexpired database record.
 * The acceptance timestamp is generated on the server at write time rather than trusted from JSON.
 *
 * @param request - JSON containing names, country, phone, birthday, and ZIP/postal code only.
 * @returns HTTP 200 with `nextStep: "dashboard"` and a normal session; HTTP 401 when onboarding is
 * missing/expired; HTTP 400 or 403 when validation or origin checks fail.
 */
export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request))
    return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 });
  const user = await getOnboardingUser();
  if (!user)
    return NextResponse.json(
      { ok: false, error: "Your setup session expired. Sign in again." },
      { status: 401 },
    );
  const parsed = await parseJson(request, profileSchema);
  if ("error" in parsed) return parsed.error;
  await db.user.update({
    where: { id: user.id },
    data: { ...parsed.data, termsAcceptedAt: new Date() },
  });
  await consumeOnboardingAndCreateSession(user.id);
  return NextResponse.json({ ok: true, nextStep: "dashboard" });
}
