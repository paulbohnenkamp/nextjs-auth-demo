import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { isProfileComplete } from "@/lib/validation";

/**
 * Returns a minimal, display-safe view of the current authenticated user.
 * Password hashes, profile details, cookies, and stored token hashes are never returned.
 * This endpoint is useful to browser code that needs session state, but protected Server Components
 * should call `getCurrentUser` directly and redirect before rendering sensitive content.
 *
 * @returns HTTP 200 with safe identity fields and server-derived profile completeness, or HTTP 401 with
 * `{ authenticated: false }` when the cookie is missing, unknown, or expired.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({
    authenticated: true,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    profileComplete: isProfileComplete(user),
  });
}
