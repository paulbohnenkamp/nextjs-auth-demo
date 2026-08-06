const windows = new Map<string, { count: number; resetAt: number }>();

/**
 * Applies a fixed-window, process-local request limit.
 * @remarks This educational limiter must be replaced by shared storage in a scaled deployment.
 * @param key - Stable action/client identity produced by {@link requestKey}.
 * @param limit - Maximum requests allowed during one window before rejection begins.
 * @param windowMs - Fixed-window duration in milliseconds.
 * @returns `true` when the current request exceeds the limit and should receive HTTP 429.
 */
export function isRateLimited(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}

/**
 * Builds a limiter key from an action name and the first forwarded client address.
 *
 * @remarks Production must accept `x-forwarded-for` only from a configured trusted proxy; otherwise
 * clients can spoof it. Requests without the header share the `local` development bucket.
 * @param request - Request containing proxy headers.
 * @param action - Endpoint-specific namespace such as `login` or `signup`.
 * @returns A string suitable for the in-memory limiter map.
 */
export function requestKey(request: Request, action: string) {
  return `${action}:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"}`;
}
