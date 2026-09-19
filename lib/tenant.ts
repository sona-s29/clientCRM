/**
 * lib/tenant.ts
 * ----------------------------------------------------------------------------
 * The tenant-isolation boundary. This is the single place that decides "which
 * organization is this request allowed to touch" — and the answer NEVER comes
 * from the client. It always comes from `auth()`, i.e. the signed, server-
 * verified session.
 *
 * THE CENTRAL RULE OF THIS FILE:
 * No API route ever accepts an `organizationId` in a request body or query
 * string and uses it to scope a query. If you find yourself writing
 * `req.nextUrl.searchParams.get("organizationId")` anywhere outside
 * app/api/admin/**, that is a tenant-isolation bug — stop and use
 * `requireOrgUser()` instead, which derives the organization from the
 * session.
 */
import { auth } from "@/auth";
import { ApiError } from "@/lib/api-helpers";
import type { SessionUser } from "@/lib/permissions";

/**
 * Verifies there is a valid session AND that it belongs to a normal tenant
 * user (i.e. NOT a Super Admin — Super Admins have no organizationId and no
 * organizational role, so they are explicitly excluded from every tenant
 * route). Returns a fully-typed `SessionUser` with a guaranteed non-null
 * `organizationId`, safe to pass straight into any `*ScopeWhere()` helper.
 *
 * This is the function almost every CRM API route (leads/contacts/tasks/
 * users/activity/dashboard/reports/settings) calls first.
 */
export async function requireOrgUser(): Promise<SessionUser & { organizationId: string }> {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("You must be signed in to do that.", 401);
  }
  if (session.user.isSuperAdmin || !session.user.organizationId) {
    throw new ApiError(
      "Super Admin accounts don't belong to an organization and can't access CRM data directly.",
      403
    );
  }
  return {
    id: session.user.id,
    role: session.user.role,
    organizationId: session.user.organizationId,
    isSuperAdmin: false,
  };
}

/**
 * Verifies there is a valid session AND that it belongs to a Super Admin.
 * Used by every route under app/api/admin/**. Throws 403 for any tenant
 * user, however senior their organizational role — Org Admin is not Super
 * Admin, and this check is what enforces that boundary server-side (not
 * just by hiding the /admin link in the sidebar).
 */
export async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("You must be signed in to do that.", 401);
  }
  if (!session.user.isSuperAdmin) {
    throw new ApiError("This area is restricted to platform administrators.", 403);
  }
  return session.user;
}

/**
 * Builds the required `organizationId` filter for a create/write payload.
 * Always call this instead of spreading a client-supplied `organizationId`
 * into a Prisma `create`/`update` — it guarantees the value came from the
 * session, not the request body, closing off the IDOR class of bug where a
 * malicious client sends `{ ..., organizationId: "someone-elses-org" }`.
 */
export function withOrg<T extends Record<string, unknown>>(
  user: { organizationId: string },
  data: T
): T & { organizationId: string } {
  return { ...data, organizationId: user.organizationId };
}
