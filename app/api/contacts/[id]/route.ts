import { prisma } from "@/lib/prisma";
import { updateContactSchema } from "@/lib/validations";
import { requirePermission, withApiErrorHandling, ApiError } from "@/lib/api-helpers";
import { contactScopeWhere } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return withApiErrorHandling(async () => {
    const user = await requirePermission("contact:view");
    const { id } = await params;
    const contact = await prisma.contact.findFirst({
      where: { id, AND: contactScopeWhere(user) },
      include: {
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        lead: { select: { id: true, name: true } },
        tasks: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!contact) throw new ApiError("Contact not found.", 404);
    return contact;
  });
}

export async function PATCH(req: Request, { params }: Params) {
  return withApiErrorHandling(async () => {
    const user = await requirePermission("contact:update");
    const { id } = await params;
    const existing = await prisma.contact.findFirst({ where: { id, AND: contactScopeWhere(user) } });
    if (!existing) throw new ApiError("Contact not found.", 404);

    const data = updateContactSchema.parse(await req.json());

    if (data.leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: data.leadId, organizationId: user.organizationId },
      });
      if (!lead) throw new ApiError("Lead not found in your organization.", 422);
    }
    if (data.assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: data.assignedToId, organizationId: user.organizationId },
      });
      if (!assignee) throw new ApiError("Assigned user not found in your organization.", 422);
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.company !== undefined && { company: data.company || null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.leadId !== undefined && { leadId: data.leadId || null }),
        ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId || null }),
      },
      include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await logActivity({
      userId: user.id,
      organizationId: user.organizationId,
      action: "CONTACT_UPDATED",
      description: `Updated contact "${updated.name}"`,
      entityType: "contact",
      entityId: updated.id,
    });

    return updated;
  });
}

/**
 * DELETE — the existence check is org-scoped (`findFirst` +
 * `organizationId`), not a bare `findUnique`, for the same tenant-isolation
 * reason documented in `DELETE /api/leads/[id]`.
 */
export async function DELETE(_req: Request, { params }: Params) {
  return withApiErrorHandling(async () => {
    const user = await requirePermission("contact:delete");
    const { id } = await params;
    const existing = await prisma.contact.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new ApiError("Contact not found.", 404);

    await prisma.contact.delete({ where: { id } });

    await logActivity({
      userId: user.id,
      organizationId: user.organizationId,
      action: "CONTACT_DELETED",
      description: `Deleted contact "${existing.name}"`,
      entityType: "contact",
      entityId: id,
    });

    return { ok: true };
  });
}
