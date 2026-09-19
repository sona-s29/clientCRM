import { prisma } from "@/lib/prisma";
import { updateTaskSchema } from "@/lib/validations";
import { requirePermission, withApiErrorHandling, ApiError } from "@/lib/api-helpers";
import { can, taskScopeWhere } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/tasks/[id]
 * Purpose: Update a task — status transitions, priority changes, editing
 *          details, or reassignment.
 * Auth:    required. Permission: "task:update". Reassigning to a different
 *          user requires "task:assign" (Org Admin-only by default — see
 *          lib/permissions.ts). This is what "Org Admin can assign/reassign
 *          tasks, employees can only update their own" means in practice.
 * Tenant isolation: the task lookup is org-scoped; if reassigning, the new
 *   assignee is looked up WITH an `organizationId` filter.
 * Side effects: Activity log; sets `completedAt` when status flips to
 *          COMPLETED and logs a TASK_COMPLETED activity entry.
 */
export async function PATCH(req: Request, { params }: Params) {
  return withApiErrorHandling(async () => {
    const user = await requirePermission("task:update");
    const { id } = await params;
    const existing = await prisma.task.findFirst({ where: { id, AND: taskScopeWhere(user) } });
    if (!existing) throw new ApiError("Task not found.", 404);

    const data = updateTaskSchema.parse(await req.json());

    const isReassigning =
      data.assignedToId !== undefined && data.assignedToId !== existing.assignedToId;
    if (isReassigning && !can(user.role, "task:assign")) {
      throw new ApiError("You do not have permission to assign tasks.", 403);
    }
    if (isReassigning && data.assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: data.assignedToId, organizationId: user.organizationId },
      });
      if (!assignee) throw new ApiError("Assigned user not found in your organization.", 422);
    }

    const isCompleting = data.status === "COMPLETED" && existing.status !== "COMPLETED";

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
        ...(isReassigning && { assignedToId: data.assignedToId || null }),
        ...(data.leadId !== undefined && { leadId: data.leadId || null }),
        ...(data.contactId !== undefined && { contactId: data.contactId || null }),
        ...(isCompleting && { completedAt: new Date() }),
      },
      include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await logActivity({
      userId: user.id,
      organizationId: user.organizationId,
      action: isCompleting ? "TASK_COMPLETED" : isReassigning ? "TASK_ASSIGNED" : "TASK_UPDATED",
      description: isCompleting
        ? `Completed task "${updated.title}"`
        : isReassigning
        ? `Reassigned task "${updated.title}"`
        : `Updated task "${updated.title}"`,
      entityType: "task",
      entityId: updated.id,
    });

    return updated;
  });
}

/**
 * DELETE /api/tasks/[id]
 * Auth: required. Permission: "task:delete" (Org Admin only). Org-scoped
 * existence check — see `DELETE /api/leads/[id]` for why this matters.
 */
export async function DELETE(_req: Request, { params }: Params) {
  return withApiErrorHandling(async () => {
    const user = await requirePermission("task:delete");
    const { id } = await params;
    const existing = await prisma.task.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new ApiError("Task not found.", 404);

    await prisma.task.delete({ where: { id } });

    await logActivity({
      userId: user.id,
      organizationId: user.organizationId,
      action: "TASK_DELETED",
      description: `Deleted task "${existing.title}"`,
      entityType: "task",
      entityId: id,
    });

    return { ok: true };
  });
}
