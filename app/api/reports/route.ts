import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, withApiErrorHandling, ApiError } from "@/lib/api-helpers";
import { leadScopeWhere, taskScopeWhere } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(","));
  return lines.join("\n");
}

/**
 * GET /api/reports?type=<type>&from=&to=&department=&employeeId=&format=json|csv
 * Purpose: One flexible endpoint backing the Reports section. `type` selects
 *          which report to build; date/department/employee filters narrow
 *          it; `format=csv` returns a downloadable CSV instead of JSON.
 * Auth:    required. Permission: "report:view". Non-admins are automatically
 *          scoped to their own department's data regardless of filters
 *          supplied (an IT employee cannot request a Sales report by editing
 *          the URL — the scope where-clause is applied server-side either way).
 * Types:   leads | tasks | employee-performance | department-performance |
 *          conversion | productivity | overdue-tasks
 */
export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requirePermission("report:view");
    const sp = req.nextUrl.searchParams;
    const type = sp.get("type") ?? "leads";
    const format = sp.get("format") === "csv" ? "csv" : "json";
    const from = sp.get("from") ? new Date(sp.get("from")!) : undefined;
    const to = sp.get("to") ? new Date(sp.get("to")!) : undefined;
    const dateRange = from || to ? { gte: from, lte: to } : undefined;

    let rows: Record<string, unknown>[] = [];
    let title = "report";

    switch (type) {
      case "leads": {
        title = "leads-report";
        const where: Prisma.LeadWhereInput = {
          AND: [leadScopeWhere(user), dateRange ? { createdAt: dateRange } : {}],
        };
        const leads = await prisma.lead.findMany({
          where,
          include: { assignedTo: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        });
        rows = leads.map((l) => ({
          name: l.name,
          company: l.company ?? "",
          status: l.status,
          priority: l.priority,
          source: l.source,
          department: l.department,
          assignedTo: l.assignedTo?.name ?? "Unassigned",
          createdAt: l.createdAt.toISOString(),
        }));
        break;
      }
      case "tasks": {
        title = "tasks-report";
        const where: Prisma.TaskWhereInput = {
          AND: [taskScopeWhere(user), dateRange ? { createdAt: dateRange } : {}],
        };
        const tasks = await prisma.task.findMany({
          where,
          include: { assignedTo: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        });
        rows = tasks.map((t) => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
          department: t.department,
          assignedTo: t.assignedTo?.name ?? "Unassigned",
          dueDate: t.dueDate?.toISOString() ?? "",
          completedAt: t.completedAt?.toISOString() ?? "",
        }));
        break;
      }
      case "overdue-tasks": {
        title = "overdue-tasks-report";
        const tasks = await prisma.task.findMany({
          where: {
            AND: [
              taskScopeWhere(user),
              { dueDate: { lt: new Date() } },
              { status: { notIn: ["COMPLETED", "CANCELLED"] } },
            ],
          },
          include: { assignedTo: { select: { name: true } } },
          orderBy: { dueDate: "asc" },
        });
        rows = tasks.map((t) => ({
          title: t.title,
          priority: t.priority,
          assignedTo: t.assignedTo?.name ?? "Unassigned",
          dueDate: t.dueDate?.toISOString() ?? "",
        }));
        break;
      }
      case "conversion": {
        title = "conversion-report";
        const where: Prisma.LeadWhereInput = { AND: [leadScopeWhere(user)] };
        const [total, converted, lost] = await Promise.all([
          prisma.lead.count({ where }),
          prisma.lead.count({ where: { AND: [leadScopeWhere(user), { status: "CONVERTED" }] } }),
          prisma.lead.count({ where: { AND: [leadScopeWhere(user), { status: "LOST" }] } }),
        ]);
        rows = [
          {
            totalLeads: total,
            converted,
            lost,
            conversionRatePct: total > 0 ? Math.round((converted / total) * 1000) / 10 : 0,
          },
        ];
        break;
      }
      case "employee-performance": {
        if (user.role !== "ADMIN") throw new ApiError("Only Org Admins can view employee performance reports.", 403);
        title = "employee-performance-report";
        const employees = await prisma.user.findMany({
          where: { organizationId: user.organizationId, role: { not: "ADMIN" } },
        });
        rows = await Promise.all(
          employees.map(async (e) => {
            const [completed, pending, overdue] = await Promise.all([
              prisma.task.count({
                where: { organizationId: user.organizationId, assignedToId: e.id, status: "COMPLETED" },
              }),
              prisma.task.count({
                where: {
                  organizationId: user.organizationId,
                  assignedToId: e.id,
                  status: { in: ["PENDING", "IN_PROGRESS"] },
                },
              }),
              prisma.task.count({
                where: {
                  organizationId: user.organizationId,
                  assignedToId: e.id,
                  dueDate: { lt: new Date() },
                  status: { notIn: ["COMPLETED", "CANCELLED"] },
                },
              }),
            ]);
            return { employee: e.name, department: e.role, completed, pending, overdue };
          })
        );
        break;
      }
      case "department-performance": {
        if (user.role !== "ADMIN") throw new ApiError("Only Org Admins can view department performance reports.", 403);
        title = "department-performance-report";
        const depts = ["SALES", "IT", "DIGITAL_MARKETING"] as const;
        rows = await Promise.all(
          depts.map(async (department) => {
            const [totalTasks, completedTasks, totalLeads, convertedLeads] = await Promise.all([
              prisma.task.count({ where: { organizationId: user.organizationId, department } }),
              prisma.task.count({
                where: { organizationId: user.organizationId, department, status: "COMPLETED" },
              }),
              prisma.lead.count({ where: { organizationId: user.organizationId, department } }),
              prisma.lead.count({
                where: { organizationId: user.organizationId, department, status: "CONVERTED" },
              }),
            ]);
            return { department, totalTasks, completedTasks, totalLeads, convertedLeads };
          })
        );
        break;
      }
      default:
        throw new ApiError("Unknown report type.", 400);
    }

    if (format === "csv") {
      const csv = toCsv(rows);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${title}.csv"`,
        },
      });
    }

    return { type, rows };
  });
}
