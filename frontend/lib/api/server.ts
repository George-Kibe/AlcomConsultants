import createClient from "openapi-fetch";

import type { paths } from "./schema";

/**
 * Server-side client for React Server Components. Inside Docker this calls Django directly
 * (API_INTERNAL_URL=http://backend:8000); elsewhere it goes through the local Nginx.
 */
export const serverApi = createClient<paths>({
  baseUrl: process.env.API_INTERNAL_URL ?? "http://localhost:8080",
});

/**
 * Run an API call; resolve to `null` (instead of throwing) when the API is unreachable or
 * errors, so pages can render a friendly fallback.
 */
export async function safely<T>(
  call: () => Promise<{ data?: T; response: Response }>,
): Promise<{ data: T | null; status: number }> {
  try {
    const { data, response } = await call();
    return {
      data: response.ok && data !== undefined ? data : null,
      status: response.status,
    };
  } catch {
    return { data: null, status: 503 };
  }
}
