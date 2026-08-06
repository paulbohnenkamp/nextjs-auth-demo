import { NextRequest, NextResponse } from "next/server";
import { parseJson } from "@/lib/api";
import { db } from "@/lib/db";
import { isRateLimited, requestKey } from "@/lib/rate-limit";
import { checkEmailSchema } from "@/lib/validation";

/**
 * Determines whether a normalized email should enter the sign-in or signup UI.
 *
 * The database is authoritative. The response deliberately contains no user record or profile data.
 * Requests are IP-rate-limited because this endpoint reveals whether an account exists.
 *
 * Processing order is rate limit, strict JSON/Zod parsing, canonical email lookup, then a minimal
 * transition response. The unique email index makes the lookup deterministic and efficient.
 *
 * @param request - JSON request containing only `{ email }`.
 * @returns HTTP 200 with `nextStep: "signin" | "signup"`, HTTP 400 for malformed input, or HTTP 429
 * when the process-local discovery limit is exceeded.
 */
export async function POST(request: NextRequest) {
  if (isRateLimited(requestKey(request, "check-email"), 20))
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again shortly." },
      { status: 429 },
    );
  const parsed = await parseJson(request, checkEmailSchema);
  if ("error" in parsed) return parsed.error;
  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, nextStep: user ? "signin" : "signup" });
}
