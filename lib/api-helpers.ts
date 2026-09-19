/**
 * lib/api-helpers.ts
 * ----------------------------------------------------------------------------
 * Shared plumbing for API Route Handlers so every route follows the exact
 * same auth -> permission -> validate -> query pattern, and so error
 * responses are consistent and never leak internal details to the client.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { can, type Permission } from "@/lib/permissions";
import type { Role } from "@prisma/client";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Verifies there is a valid session. Every protected API route calls this
 * first. Throws a 401 ApiError if not authenticated. This is auth-only — it
 * says nothing about organization membership or permissions, so it's the
 * right (and only) check for routes any signed-in user may hit regardless of
 * tenant, such as their own profile/password settings.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("You must be signed in to do that.", 401);
  }
  return session.user; // { id, name, email, role, organizationId, isSuperAdmin, avatarUrl }
}

/**
 * Verifies the current session's ORGANIZATIONAL role has the given
 * permission, and that the caller is a tenant member at all — Super Admins
 * are explicitly excluded here (see lib/tenant.ts's `requireOrgUser`, which
 * this reuses the same guard as) because "permission" in this app's RBAC
 * model always means "permission within one's own organization." Throws a
 * 403 `ApiError` if either check fails. This is the SERVER-SIDE enforcement
 * — hiding a button on the frontend is not authorization, this call is.
 * Returns the user with `organizationId` guaranteed non-null, safe to pass
 * straight into any `*ScopeWhere()` helper.
 */
export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (user.isSuperAdmin || !user.organizationId) {
    throw new ApiError(
      "Super Admin accounts don't belong to an organization and can't access CRM data directly.",
      403
    );
  }
  if (!can(user.role as Role, permission)) {
    throw new ApiError("You do not have permission to perform this action.", 403);
  }
  return user as typeof user & { organizationId: string };
}

/** Wraps a route handler body, converting thrown errors into safe JSON responses. */
export async function withApiErrorHandling<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const result = await fn();
    // Some routes (e.g. CSV export) need to return a raw Response with
    // custom headers instead of a JSON envelope — pass those through as-is.
    if (result instanceof Response) return result as unknown as NextResponse;
    return NextResponse.json(result ?? { ok: true });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: err.flatten().fieldErrors },
        { status: 422 }
      );
    }
    // Never leak raw database/internal error messages to the client.
    console.error("[API ERROR]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
