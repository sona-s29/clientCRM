import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTaskSchema } from "@/lib/validations";
import { requirePermission, withApiErrorHandling, ApiError } from "@/lib/api-helpers";
import { taskScopeWhere } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/tasks
 * Query: page, pageSize, search, status, priority, department, assignedToId,
 *        overdue=true, sortBy, sortDir
 * Auth: required. Permission: "task:view". `taskScopeWhere()` filters by
 * `organizationId` first (tenant isolation), then by department/own tasks
 * unless Org Admin.
 */
export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requirePermission("task:view");
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 10)));
    const search = sp.get("search")?.trim();
    const status = sp.get("status");
    const priority = sp.get("priority");
    const department = sp.get("department");
    const assignedToId = sp.get("assignedToId");
    const overdueOnly = sp.get("overdue") === "true";
    const sortBy = sp.get("sortBy") ?? "createdAt";
    const sortDir = sp.get("sortDir") === "asc" ? "asc" : "desc";

    const where: Prisma.TaskWhereInput = {
      AND: [
        taskScopeWhere(user),
        status ? { status: status as Prisma.EnumTaskStatusFilter["equals"] } : {},
        priority ? { priority: priority as Prisma.EnumPriorityFilter["equals"] } : {},
        department ? { department: department as Prisma.EnumRoleFilter["equals"] } : {},
        assignedToId ? { assignedToId } : {},
        overdueOnly
          ? { dueDate: { lt: new Date() }, status: { notIn: ["COMPLETED", "CANCELLED"] } }
          : {},
        search ? { title: { contains: search, mode: "insensitive" } } : {},
      ],
    };

    const sortable = new Set(["createdAt", "title", "dueDate", "priority", "status"]);
    const orderBy = { [sortable.has(sortBy) ? sortBy : "createdAt"]: sortDir };

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
          createdBy: { select: { id: true, name: true } },
          lead: { select: { id: true, name: true } },
          contact: { select: { id: true, name: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  });
}

/**
 * POST /api/tasks
 * Purpose: Create a task, optionally assigning it to an employee immediately.
 * Auth: required. Permission: "task:create".
 * Tenant isolation: assignee (and linked lead/contact, if provided) are
 *   looked up WITH an `organizationId` filter matching the caller's org.
 * Side effects: Activity log entry.
 */
export async function POST(req: Request) {
  return withApiErrorHandling(async () => {
    const user = await requirePermission("task:create");
    const data = createTaskSchema.parse(await req.json());

    if (data.assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: data.assignedToId, organizationId: user.organizationId },
      });
      if (!assignee) throw new ApiError("Assigned user not found in your organization.", 422);
    }
    if (data.leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: data.leadId, organizationId: user.organizationId },
      });
      if (!lead) throw new ApiError("Lead not found in your organization.", 422);
    }
    if (data.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: data.contactId, organizationId: user.organizationId },
      });
      if (!contact) throw new ApiError("Contact not found in your organization.", 422);
    }

    const task = await prisma.task.create({
      data: {
        organizationId: user.organizationId,
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        department: data.department,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assignedToId: data.assignedToId || null,
        leadId: data.leadId || null,
        contactId: data.contactId || null,
        createdById: user.id,
      },
      include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await logActivity({
      userId: user.id,
      organizationId: user.organizationId,
      action: "TASK_CREATED",
      description: `Created task "${task.title}"`,
      entityType: "task",
      entityId: task.id,
    });

    return task;
  });
}
