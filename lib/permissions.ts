/**
 * lib/permissions.ts
 * ----------------------------------------------------------------------------
 * Central RBAC module for clientCRM SaaS. Two INDEPENDENT axes of access:
 *
 *   1. Organization role (`Role` enum: ADMIN | IT | SALES | DIGITAL_MARKETING)
 *      — what this user can do INSIDE their own organization. Checked with
 *      `can(role, permission)` and scoped with the `*ScopeWhere()` helpers
 *      below, which ALWAYS filter by `organizationId` first.
 *
 *   2. Platform flag (`User.isSuperAdmin: boolean`) — a completely separate
 *      concept. A Super Admin manages the SaaS platform itself (see
 *      app/api/admin/**) and has NO organizational role and NO visibility
 *      into any tenant's CRM data. It is checked directly
 *      (`user.isSuperAdmin === true`), never through the Role permission
 *      table, because "Organization Admin" and "Super Admin" are not the
 *      same thing at different strengths — they operate on different data
 *      entirely (one org's rows vs. the `Organization`/`Plan`/`Subscription`
 *      tables). See ARCHITECTURE.md "Two access axes" for the full rationale.
 *
 * Every API route MUST call `requirePermission()`/`requireSuperAdmin()`
 * (lib/api-helpers.ts) before mutating data, and MUST apply the relevant
 * `*ScopeWhere()` to any list/read query. The frontend also uses `can()` to
 * decide what to render, but that is a UX convenience only — the backend
 * check is what actually protects the data.
 */

import type { Role } from "@prisma/client";

export type Permission =
  // Users / administration (within one's own organization)
  | "user:view"
  | "user:create"
  | "user:update"
  | "user:delete"
  | "user:reset-password"
  // Leads
  | "lead:view"
  | "lead:create"
  | "lead:update"
  | "lead:delete"
  | "lead:assign"
  // Contacts
  | "contact:view"
  | "contact:create"
  | "contact:update"
  | "contact:delete"
  // Tasks
  | "task:view"
  | "task:create"
  | "task:update"
  | "task:delete"
  | "task:assign"
  // Reports & analytics
  | "report:view"
  | "report:view:all-departments"
  // Activity / audit log (organization-scoped)
  | "activity:view"
  | "activity:view:all"
  // Settings
  | "settings:manage-account"
  | "settings:manage-org";

/**
 * The permission matrix. This is the ONLY place role -> permission mappings
 * are defined. To change what a role can do inside its organization, edit
 * this table — nothing else. (Super Admin platform permissions are NOT part
 * of this table — see the module comment above.)
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    "user:view",
    "user:create",
    "user:update",
    "user:delete",
    "user:reset-password",
    "lead:view",
    "lead:create",
    "lead:update",
    "lead:delete",
    "lead:assign",
    "contact:view",
    "contact:create",
    "contact:update",
    "contact:delete",
    "task:view",
    "task:create",
    "task:update",
    "task:delete",
    "task:assign",
    "report:view",
    "report:view:all-departments",
    "activity:view",
    "activity:view:all",
    "settings:manage-account",
    "settings:manage-org",
  ],
  SALES: [
    "lead:view",
    "lead:create",
    "lead:update",
    "contact:view",
    "contact:create",
    "contact:update",
    "task:view",
    "task:create",
    "task:update",
    "report:view",
    "activity:view",
    "settings:manage-account",
  ],
  IT: [
    "lead:view",
    "contact:view",
    "task:view",
    "task:create",
    "task:update",
    "report:view",
    "activity:view",
    "settings:manage-account",
  ],
  DIGITAL_MARKETING: [
    "lead:view",
    "lead:create",
    "lead:update",
    "contact:view",
    "contact:create",
    "task:view",
    "task:create",
    "task:update",
    "report:view",
    "activity:view",
    "settings:manage-account",
  ],
};

/** Core permission check. Use this everywhere — API routes and UI alike. */
export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Convenience for checking several permissions at once (ANY match). */
export function canAny(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Organization Admin",
  IT: "IT",
  SALES: "Sales",
  DIGITAL_MARKETING: "Digital Marketing",
};

/**
 * Minimal shape of the currently authenticated user, as attached to the
 * session/JWT. Kept intentionally small — only what's needed for scoping.
 * `organizationId` is null ONLY for Super Admins.
 */
export interface SessionUser {
  id: string;
  role: Role;
  organizationId: string | null;
  isSuperAdmin: boolean;
}

/**
 * Row-level scoping, ALWAYS filtered by organization first — this is the
 * tenant-isolation boundary. Within that organization: Org Admin sees
 * everything; every other role sees their own department's rows plus
 * anything individually assigned to or created by them.
 *
 * These helpers assume the caller is a normal tenant user (organizationId is
 * non-null) — routes that use them call `requireOrgUser()` first, which
 * throws before a Super Admin (no organizationId) could ever reach here.
 *
 * Returns a Prisma `where` fragment — spread it into your query's `where`.
 */
export function leadScopeWhere(user: SessionUser) {
  const orgFilter = { organizationId: user.organizationId };
  if (user.role === "ADMIN") return orgFilter;
  return {
    AND: [
      orgFilter,
      { OR: [{ department: user.role }, { assignedToId: user.id }, { createdById: user.id }] },
    ],
  };
}

export function taskScopeWhere(user: SessionUser) {
  const orgFilter = { organizationId: user.organizationId };
  if (user.role === "ADMIN") return orgFilter;
  return {
    AND: [
      orgFilter,
      { OR: [{ department: user.role }, { assignedToId: user.id }, { createdById: user.id }] },
    ],
  };
}

export function contactScopeWhere(user: SessionUser) {
  const orgFilter = { organizationId: user.organizationId };
  if (user.role === "ADMIN") return orgFilter;
  return {
    AND: [orgFilter, { OR: [{ assignedToId: user.id }, { createdById: user.id }] }],
  };
}

/** Org Admin sees the whole organization's activity; others see just their own. */
export function activityScopeWhere(user: SessionUser) {
  const orgFilter = { organizationId: user.organizationId };
  if (can(user.role, "activity:view:all")) return orgFilter;
  return { AND: [orgFilter, { userId: user.id }] };
}

/** Every user-management query is scoped to the caller's own organization. */
export function userScopeWhere(user: SessionUser) {
  return { organizationId: user.organizationId };
}
