/** Only follow `?next=` to dashboard pages on this site (prevents open redirects). */
export function safeNext(
  next: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!next || !next.startsWith("/dashboard") || next.startsWith("//"))
    return fallback;
  return next;
}

/** Follow `?next=` only to a path on this site (no "//host" or "/\\host" tricks). */
export function safeLocalPath(
  next: string | null | undefined,
  fallback: string,
): string {
  if (!next || !next.startsWith("/") || /^\/[/\\]/.test(next)) return fallback;
  return next;
}
