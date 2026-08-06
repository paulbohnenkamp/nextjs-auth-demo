import { NextRequest, NextResponse } from "next/server";
import type { ZodType } from "zod";

/**
 * Parses a JSON request body through a Zod schema and converts validation failures into the API's
 * stable error envelope.
 *
 * @typeParam T - Server-trusted value produced by the schema after transforms and coercion.
 * @param request - Next.js request whose body may be consumed once.
 * @param schema - Strict request contract, including any normalization transforms.
 * @returns `{ data }` on success or `{ error }` containing an HTTP 400 `NextResponse`. The disjoint
 * keys allow route handlers to narrow with `"error" in parsed`.
 */
export async function parseJson<T>(request: NextRequest, schema: ZodType<T>) {
  try {
    const result = schema.safeParse(await request.json());
    if (result.success) return { data: result.data } as const;
    return {
      error: NextResponse.json(
        {
          ok: false,
          error: "Please correct the highlighted fields",
          fieldErrors: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      ),
    } as const;
  } catch {
    return {
      error: NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 }),
    } as const;
  }
}

/**
 * Performs a lightweight CSRF check for state-changing routes.
 * Non-browser clients without an Origin header are allowed; browser origins must match the request.
 *
 * @param request - Incoming request whose parsed URL supplies the expected origin.
 * @returns Whether the request may continue. Routes translate `false` into HTTP 403.
 */
export function requireSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}
