/** Django's CSRF token, read from its cookie (same-origin, so the browser has it). */
export function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith("csrftoken="))
    ?.split("=")[1];
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function withCsrf(method: string, headers: Headers): Headers {
  const token = getCsrfToken();
  if (token && !SAFE_METHODS.has(method.toUpperCase())) {
    headers.set("X-CSRFToken", token);
  }
  return headers;
}
