/**
 * lib/activity.ts
 * ----------------------------------------------------------------------------
 * Every meaningful write action in the app calls `logActivity()` right after
 * the Prisma mutation succeeds. This one model/helper serves as clientCRM's
 * ENTIRE audit trail — both the org-scoped "Employee Activity" screen Org
 * Admins see (app/(dashboard)/settings/activity), and the platform-scoped
 * audit log Super Admins see (app/(admin)/admin/audit-logs). See the
 * `Activity` model's comment in prisma/schema.prisma for why these are one
 * model instead of two.
 *
 * `organizationId` is REQUIRED for anything happening inside a tenant (pass
 * `user.organizationId` from a `requireOrgUser()`/`requirePermission()`
 * result) and explicitly `null` for platform-level Super Admin actions
 * (organization suspension, plan changes, etc.) — never guess; always pass
 * it explicitly so a missing value is a visible bug, not a silent one.
 */
import { prisma } from "@/lib/prisma";
import type { ActivityAction } from "@prisma/client";

interface LogActivityInput {
  userId: string;
  organizationId: string | null;
  action: ActivityAction;
  description: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(input: LogActivityInput) {
  try {
    await prisma.activity.create({
      data: {
        userId: input.userId,
        organizationId: input.organizationId,
        action: input.action,
        description: input.description,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata,
      },
    });
  } catch (err) {
    // Activity logging must never block or crash the primary operation.
    console.error("[activity log failed]", err);
  }
}
