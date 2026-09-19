import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Public marketing site — always reachable, logged in or not, tenant or Super
// Admin. This is the "front door" of the SaaS product.
const MARKETING_PATHS = ["/", "/features", "/pricing", "/about", "/contact"];

// Auth pages — reachable only while signed OUT. A signed-in visitor is
// bounced to the area appropriate for their account type instead.
const AUTH_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];

// The Super Admin console — a completely separate area from the tenant CRM.
const SUPER_ADMIN_PREFIX = "/admin";

function isExactOrChild(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(path + "/");
}

export default auth((req) => {
  const { nextUrl } = req;
  const { pathname } = nextUrl;
  const isLoggedIn = !!req.auth;
  const isSuperAdmin = !!req.auth?.user?.isSuperAdmin;

  const isMarketing =
    pathname === "/" || MARKETING_PATHS.filter((p) => p !== "/").some((p) => isExactOrChild(pathname, p));
  const isAuthPage = AUTH_PATHS.some((p) => isExactOrChild(pathname, p));
  const isSuperAdminArea = isExactOrChild(pathname, SUPER_ADMIN_PREFIX);

  // Marketing pages are always public — no redirects either way.
  if (isMarketing) return NextResponse.next();

  // Auth pages: only for signed-out visitors. Signed-in users are routed to
  // the home base appropriate for their account type.
  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(isSuperAdmin ? "/admin" : "/dashboard", nextUrl.origin));
    }
    return NextResponse.next();
  }

  // Everything else requires a session.
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Super Admin console: only Super Admins. A tenant user (Org Admin
  // included) who somehow lands on /admin is sent back to their dashboard —
  // the REAL enforcement is server-side in every /api/admin/** route
  // (`requireSuperAdmin()`), this is just the UX-level redirect.
  if (isSuperAdminArea && !isSuperAdmin) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }

  // Tenant app area: Super Admins don't have an organization, so the CRM
  // pages would have nothing to render for them — send them to their own
  // console instead.
  if (!isSuperAdminArea && isSuperAdmin) {
    return NextResponse.redirect(new URL("/admin", nextUrl.origin));
  }

  return NextResponse.next();
});

// Run the middleware on every route except static assets and API auth routes
// (the auth API routes must stay reachable while unauthenticated, e.g. to
// POST credentials in the first place). API routes under /api/** enforce
// their own auth/permission checks directly (see lib/api-helpers.ts and
// lib/tenant.ts) rather than relying on this middleware, since Route
// Handlers need precise 401/403 JSON responses, not redirects.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
