import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePermission, withApiErrorHandling, ApiError } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/users/[id]/reset-password
 * Purpose:  Org Admin forces a password reset for an employee in their own
 *           organization (e.g. they're locked out). Generates a random
 *           temporary password, hashes it, stores the hash, and returns the
 *           PLAINTEXT temporary password ONE TIME so the Admin can relay it
 *           to the employee. It is never stored or logged in plaintext
 *           anywhere.
 * Auth:     required. Permission: "user:reset-password" (Org Admin only).
 * Tenant isolation: org-scoped lookup — an Org Admin cannot reset a
 *   password for a user outside their own organization.
 */
export async function POST(_req: Request, { params }: Params) {
  return withApiErrorHandling(async () => {
    const admin = await requirePermission("user:reset-password");
    const { id } = await params;

    const user = await prisma.user.findFirst({
      where: { id, organizationId: admin.organizationId },
    });
    if (!user) throw new ApiError("User not found.", 404);

    const tempPassword = crypto.randomBytes(9).toString("base64url"); // e.g. "aB3-xy9Kq2Lp"
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({ where: { id }, data: { passwordHash } });

    await logActivity({
      userId: admin.id,
      organizationId: admin.organizationId,
      action: "USER_UPDATED",
      description: `Reset password for ${user.name}`,
      entityType: "user",
      entityId: id,
    });

    return { ok: true, temporaryPassword: tempPassword };
  });
}
