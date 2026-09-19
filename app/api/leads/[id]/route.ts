import { prisma } from "@/lib/prisma";
import { updateLeadSchema } from "@/lib/validations";
import { requirePermission, withApiErrorHandling, ApiError } from "@/lib/api-helpers";
import { can, leadScopeWhere, type SessionUser } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

async function findScopedLead(id: string, user: SessionUser) {
  const lead = await prisma.lead.findFirst({
    where: { id, AND: leadScopeWhere(user) },
    include: {
      assignedTo: { select: { id: true, name: true, avatarUrl: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      contacts: true,
      tasks: { orderBy: { createdAt: "desc" }, include: { assignedTo: { select: { id: true, name: true } } } },
    },
  });
  return lead;
}

/**
 * GET /api/leads/[id]
 * Purpose:    Fetch a single lead with its related contacts and tasks.
 * Auth:       Required. Permission: "lead:view".
 * Response:   Lead with relations, or 404 if it doesn't exist, belongs to a
 *             DIFFERENT organization, or is simply outside the user's role
 *             scope (all three cases return 404, not 403 — this is what
 *             stops cross-tenant ID enumeration from ever confirming a
 *             record exists in someone else's organization).
 */
export async function GET(_req: Request, { params }: Params) {
  return withApiErrorHandling(async () => {
    const user = await requirePermission("lead:view");
    const { id } = await params;
    const lead = await findScopedLead(id, user);
    if (!lead) throw new ApiError("Lead not found.", 404);
    return lead;
  });
}

/**
 * PATCH /api/leads/[id]
 * Purpose:    Update a lead's fields, including status changes and
 *             reassignment.
 * Auth:       Required. Permission: "lead:update". Reassigning to a
 *             different user additionally requires "lead:assign" — Org Admin
 *             has both by default; Sales/IT/Marketing can update their own
 *             leads but cannot reassign to someone else.
 * Body:       Partial<CreateLeadInput>
 * Side effects: Activity log entry.
 * Tenant isolation: the lead lookup is org-scoped (via `findScopedLead`), and
 *   if reassigning, the new assignee is looked up WITH an `organizationId`
 *   filter — both closing the same class of cross-tenant IDOR described in
 *   `POST /api/leads`.
 * DB op:      prisma.lead.update
 */
export async function PATCH(req: Request, { params }: Params) {
  return withApiErrorHandling(async () => {
    const user = await requirePermission("lead:update");
    const { id } = await params;
    const existing = await findScopedLead(id, user);
    if (!existing) throw new ApiError("Lead not found.", 404);

    const body = await req.json();
    const data = updateLeadSchema.parse(body);

    const isReassigning =
      data.assignedToId !== undefined && data.assignedToId !== existing.assignedToId;
    if (isReassigning && !can(user.role, "lead:assign")) {
      throw new ApiError("You do not have permission to reassign leads.", 403);
    }
    if (isReassigning && data.assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: data.assignedToId, organizationId: user.organizationId },
      });
      if (!assignee) throw new ApiError("Assigned user not found in your organization.", 422);
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.company !== undefined && { company: data.company || null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.source !== undefined && { source: data.source }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.followUpDate !== undefined && {
          followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        }),
        ...(isReassigning && { assignedToId: data.assignedToId || null }),
        ...(data.status === "CONVERTED" && !existing.convertedAt && { convertedAt: new Date() }),
      },
      include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await logActivity({
      userId: user.id,
      organizationId: user.organizationId,
      action: isReassigning ? "LEAD_ASSIGNED" : "LEAD_UPDATED",
      description: isReassigning
        ? `Reassigned lead "${updated.name}"`
        : `Updated lead "${updated.name}"`,
      entityType: "lead",
      entityId: updated.id,
    });

    return updated;
  });
}

/**
 * DELETE /api/leads/[id]
 * Purpose:    Permanently delete a lead.
 * Auth:       Required. Permission: "lead:delete" (Org Admin only by default).
 * Tenant isolation: the existence check is org-scoped (`findFirst` with
 *   `organizationId`), NOT a bare `findUnique({ where: { id } })` — the
 *   latter would let an Org Admin delete a lead belonging to a different
 *   organization simply by guessing/knowing its id. This was the exact bug
 *   class flagged in the security review; fixed here.
 * DB op:      prisma.lead.delete (contacts/tasks referencing it are
 *             detached via onDelete: SetNull in the schema, not deleted).
 */
export async function DELETE(_req: Request, { params }: Params) {
  return withApiErrorHandling(async () => {
    const user = await requirePermission("lead:delete");
    const { id } = await params;
    const existing = await prisma.lead.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new ApiError("Lead not found.", 404);

    await prisma.lead.delete({ where: { id } });

    await logActivity({
      userId: user.id,
      organizationId: user.organizationId,
      action: "LEAD_DELETED",
      description: `Deleted lead "${existing.name}"`,
      entityType: "lead",
      entityId: id,
    });

    return { ok: true };
  });
}
