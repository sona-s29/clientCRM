import { prisma } from "@/lib/prisma";
import { updateUserSchema } from "@/lib/validations";
import { requirePermission, withApiErrorHandling, ApiError } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/users/[id]
 * Tenant isolation: `findFirst` with `organizationId: admin.organizationId`,
 * NOT a bare `findUnique({ where: { id } })` — the latter would let an Org
 * Admin view a user belonging to a DIFFERENT organization just by knowing
 * their id. Same class of bug fixed across every `[id]` route in this pass.
 */
export async function GET(_req: Request, { params }: Params) {
  return withApiErrorHandling(async () => {
    const admin = await requirePermission("user:view");
    const { id } = await params;
    const user = await prisma.user.findFirst({
      where: { id, organizationId: admin.organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        status: true,
        avatarUrl: true,
        jobTitle: true,
        phone: true,
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { assignedLeads: true, assignedTasks: true, assignedContacts: true } },
      },
    });
    if (!user) throw new ApiError("User not found.", 404);
    return user;
  });
}

/**
 * PATCH /api/users/[id]
 * Purpose: Org Admin edits an employee IN THEIR OWN ORGANIZATION — name,
 *          role, department, status (active/inactive/suspended), job title,
 *          phone.
 * Auth:    required. Permission: "user:update" (Org Admin only).
 * Tenant isolation: org-scoped existence check (see GET above).
 * Guard:   an Org Admin cannot demote/deactivate their OWN account through
 *          this endpoint, to prevent accidentally locking their organization
 *          out of having any Admin at all.
 */
export async function PATCH(req: Request, { params }: Params) {
  return withApiErrorHandling(async () => {
    const admin = await requirePermission("user:update");
    const { id } = await params;

    const existing = await prisma.user.findFirst({
      where: { id, organizationId: admin.organizationId },
    });
    if (!existing) throw new ApiError("User not found.", 404);

    const data = updateUserSchema.parse(await req.json());

    if (id === admin.id && (data.role || data.status) && (data.role !== "ADMIN" || data.status !== "ACTIVE")) {
      throw new ApiError("You cannot change your own role or deactivate your own account.", 400);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.jobTitle !== undefined && { jobTitle: data.jobTitle }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        status: true,
        avatarUrl: true,
      },
    });

    await logActivity({
      userId: admin.id,
      organizationId: admin.organizationId,
      action: data.status && data.status !== "ACTIVE" ? "USER_DEACTIVATED" : "USER_UPDATED",
      description: `Updated employee ${updated.name}`,
      entityType: "user",
      entityId: updated.id,
    });

    return updated;
  });
}

/**
 * DELETE /api/users/[id]
 * Purpose: Deactivate an employee (soft delete) IN THE CALLER'S OWN
 *          ORGANIZATION. We never hard-delete users because their id is
 *          referenced by leads/tasks/activity as createdById
 *          (onDelete: Restrict) — deleting them would either fail or orphan
 *          historical records. "Delete" in the UI sets status to INACTIVE,
 *          which immediately blocks login.
 * Auth:    required. Permission: "user:delete" (Org Admin only).
 * Tenant isolation: org-scoped existence check.
 */
export async function DELETE(_req: Request, { params }: Params) {
  return withApiErrorHandling(async () => {
    const admin = await requirePermission("user:delete");
    const { id } = await params;
    if (id === admin.id) throw new ApiError("You cannot deactivate your own account.", 400);

    const existing = await prisma.user.findFirst({
      where: { id, organizationId: admin.organizationId },
    });
    if (!existing) throw new ApiError("User not found.", 404);

    await prisma.user.update({ where: { id }, data: { status: "INACTIVE" } });

    await logActivity({
      userId: admin.id,
      organizationId: admin.organizationId,
      action: "USER_DEACTIVATED",
      description: `Deactivated employee ${existing.name}`,
      entityType: "user",
      entityId: id,
    });

    return { ok: true };
  });
}
