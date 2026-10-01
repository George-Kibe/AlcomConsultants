import { NextResponse, type NextRequest } from "next/server";

/** Dashboard pages anyone may open (everything else needs a session). */
const PUBLIC_DASHBOARD_PATHS = [
  "/dashboard/login",
  "/dashboard/forgot-password",
  "/dashboard/reset-password",
];

/**
 * Optimistic check only: send visitors without a session cookie to the login page.
 * The real authorisation happens in Django for every API request.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_DASHBOARD_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isPublic || request.cookies.has("sessionid")) return NextResponse.next();

  const login = new URL("/dashboard/login", request.url);
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/dashboard", "/dashboard/:path*"] };
