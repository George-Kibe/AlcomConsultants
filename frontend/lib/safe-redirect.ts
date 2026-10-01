/** Only follow `?next=` to dashboard pages on this site (prevents open redirects). */
export function safeNext(
  next: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!next || !next.startsWith("/dashboard") || next.startsWith("//"))
    return fallback;
  return next;
}
