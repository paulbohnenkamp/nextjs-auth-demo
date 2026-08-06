import { NextRequest, NextResponse } from "next/server";
import { requireSameOrigin } from "@/lib/api";
import { revokeAuth } from "@/lib/session";

/**
 * Revokes any normal or onboarding session presented by the browser and clears both cookies.
 * Calling logout repeatedly is safe and returns the email step each time.
 * Database deletion happens before cookie clearing so a copied token cannot continue authenticating.
 *
 * @param request - Same-origin POST request; no JSON body is required.
 * @returns HTTP 200 with `nextStep: "email"`, or HTTP 403 for a cross-origin browser request.
 */
export async function POST(request: NextRequest) {
  if (!requireSameOrigin(request))
    return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 });
  await revokeAuth();
  return NextResponse.json({ ok: true, nextStep: "email" });
}
