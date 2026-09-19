import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLeadSchema } from "@/lib/validations";
import { requirePermission, withApiErrorHandling, ApiError } from "@/lib/api-helpers";
import { leadScopeWhere } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/leads
 * Purpose:   List leads with search, filtering, sorting, and pagination.
 * Auth:      Required (any signed-in tenant user — Super Admins are rejected
 *            by `requirePermission`, since they have no organization).
 * Permission: "lead:view"
 * Query:     page, pageSize, search, status, priority, source, department,
 *            assignedToId, sortBy, sortDir
 * Response:  { data: Lead[], total, page, pageSize, totalPages }
 * DB op:     prisma.lead.findMany + prisma.lead.count. `leadScopeWhere()`
 *            filters by `organizationId` FIRST (tenant isolation), then by
 *            role: Org Admin sees the whole organization's leads; other
 *            roles see their department's leads plus anything individually
 *            assigned to / created by them.
 */
export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requirePermission("lead:view");
    const sp = req.nextUrl.searchParams;

    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 10)));
    const search = sp.get("search")?.trim();
    const status = sp.get("status");
    const priority = sp.get("priority");
    const source = sp.get("source");
    const department = sp.get("department");
    const assignedToId = sp.get("assignedToId");
    const sortBy = sp.get("sortBy") ?? "createdAt";
    const sortDir = sp.get("sortDir") === "asc" ? "asc" : "desc";

    const where: Prisma.LeadWhereInput = {
      AND: [
        leadScopeWhere(user),
        status ? { status: status as Prisma.EnumLeadStatusFilter["equals"] } : {},
        priority ? { priority: priority as Prisma.EnumPriorityFilter["equals"] } : {},
        source ? { source: source as Prisma.EnumLeadSourceFilter["equals"] } : {},
        department ? { department: department as Prisma.EnumRoleFilter["equals"] } : {},
        assignedToId ? { assignedToId } : {},
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

    const sortableFields = new Set(["createdAt", "name", "status", "priority", "followUpDate", "company"]);
    const orderBy = { [sortableFields.has(sortBy) ? sortBy : "createdAt"]: sortDir };

    const [data, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { tasks: true, contacts: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  });
}

/**
 * POST /api/leads
 * Purpose:    Create a new lead within the caller's own organization.
 * Auth:       Required. Permission: "lead:create"
 * Body:       CreateLeadInput (see lib/validations.ts) — note there is no
 *             `organizationId` field in that schema at all; it is never
 *             accepted from the client (see lib/tenant.ts).
 * Response:   The created Lead.
 * Side effects: Activity log entry ("LEAD_CREATED").
 * Tenant isolation: if `assignedToId` is provided, the assignee is looked up
 *   WITH an `organizationId` filter matching the caller's own org — this is
 *   what stops a request from assigning a lead to a user in a different
 *   organization (an IDOR otherwise possible if the lookup only checked the
 *   user's `id`).
 * DB op:      prisma.lead.create
 */
export async function POST(req: Request) {
  return withApiErrorHandling(async () => {
    const user = await requirePermission("lead:create");
    const body = await req.json();
    const data = createLeadSchema.parse(body);

    if (data.assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: data.assignedToId, organizationId: user.organizationId },
      });
      if (!assignee) throw new ApiError("Assigned user not found in your organization.", 422);
    }

    const lead = await prisma.lead.create({
      data: {
        organizationId: user.organizationId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        company: data.company || null,
        status: data.status,
        priority: data.priority,
        source: data.source,
        department: data.department,
        notes: data.notes || null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        assignedToId: data.assignedToId || null,
        createdById: user.id,
      },
      include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await logActivity({
      userId: user.id,
      organizationId: user.organizationId,
      action: "LEAD_CREATED",
      description: `Created lead "${lead.name}"`,
      entityType: "lead",
      entityId: lead.id,
    });

    return lead;
  });
}
