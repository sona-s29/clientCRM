import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createContactSchema } from "@/lib/validations";
import { requirePermission, withApiErrorHandling, ApiError } from "@/lib/api-helpers";
import { contactScopeWhere } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/contacts — list contacts (search/sort/paginate), scoped by role.
 * POST /api/contacts — create a contact.
 * Auth: required. Permissions: "contact:view" / "contact:create".
 */
export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requirePermission("contact:view");
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 10)));
    const search = sp.get("search")?.trim();
    const sortBy = sp.get("sortBy") ?? "createdAt";
    const sortDir = sp.get("sortDir") === "asc" ? "asc" : "desc";

    const where: Prisma.ContactWhereInput = {
      AND: [
        contactScopeWhere(user),
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { company: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    };

    const sortable = new Set(["createdAt", "name", "company"]);
    const orderBy = { [sortable.has(sortBy) ? sortBy : "createdAt"]: sortDir };

    const [data, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
          lead: { select: { id: true, name: true } },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  });
}

export async function POST(req: Request) {
  return withApiErrorHandling(async () => {
    const user = await requirePermission("contact:create");
    const data = createContactSchema.parse(await req.json());

    // Tenant isolation: a linked lead or an explicit assignee must belong to
    // the caller's own organization — never trust the id alone.
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

    const contact = await prisma.contact.create({
      data: {
        organizationId: user.organizationId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        company: data.company || null,
        address: data.address || null,
        notes: data.notes || null,
        leadId: data.leadId || null,
        assignedToId: data.assignedToId || user.id,
        createdById: user.id,
      },
      include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await logActivity({
      userId: user.id,
      organizationId: user.organizationId,
      action: "CONTACT_CREATED",
      description: `Created contact "${contact.name}"`,
      entityType: "contact",
      entityId: contact.id,
    });

    return contact;
  });
}
