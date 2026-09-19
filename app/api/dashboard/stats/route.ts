import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api-helpers";
import { requireOrgUser } from "@/lib/tenant";
import { leadScopeWhere, taskScopeWhere, contactScopeWhere } from "@/lib/permissions";

/**
 * GET /api/dashboard/stats
 * Purpose:  Feed the KPI cards at the top of the dashboard. Every number
 *           here is a live COUNT/AGGREGATE query against PostgreSQL — none
 *           of it is hardcoded. Org Admins get org-wide numbers (for THEIR
 *           org only); other roles get numbers scoped to their department +
 *           their own assignments (same scoping rules used by the
 *           Leads/Tasks/Contacts list APIs).
 * Auth:     required, and must be a tenant user (`requireOrgUser()` rejects
 *           Super Admins — they have no organization to report on; see the
 *           Super Admin's own /api/admin/dashboard for platform metrics).
 * Tenant isolation fix: the pre-multi-tenancy version of this route queried
 *   `totalEmployees`, `departmentPerformance`, and `employeePerformance`
 *   WITHOUT any organization filter at all — harmless with one tenant, but
 *   a real cross-tenant data leak (every org's Admin would see platform-wide
 *   counts) the moment a second organization existed. Every query below is
 *   now explicitly scoped to `organizationId`.
 */
export async function GET() {
  return withApiErrorHandling(async () => {
    const user = await requireOrgUser();
    const leadWhere = leadScopeWhere(user);
    const taskWhere = taskScopeWhere(user);
    const contactWhere = contactScopeWhere(user);
    const now = new Date();

    const [
      totalEmployees,
      totalLeads,
      totalContacts,
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      highPriorityTasks,
      convertedLeads,
      leadsByStatusRaw,
      tasksByPriorityRaw,
      myAssignedLeads,
      myAssignedTasks,
    ] = await Promise.all([
      user.role === "ADMIN"
        ? prisma.user.count({ where: { organizationId: user.organizationId, status: "ACTIVE" } })
        : Promise.resolve(null),
      prisma.lead.count({ where: leadWhere }),
      prisma.contact.count({ where: contactWhere }),
      prisma.task.count({ where: taskWhere }),
      prisma.task.count({ where: { AND: [taskWhere, { status: "PENDING" }] } }),
      prisma.task.count({ where: { AND: [taskWhere, { status: "IN_PROGRESS" }] } }),
      prisma.task.count({ where: { AND: [taskWhere, { status: "COMPLETED" }] } }),
      prisma.task.count({
        where: {
          AND: [taskWhere, { dueDate: { lt: now } }, { status: { notIn: ["COMPLETED", "CANCELLED"] } }],
        },
      }),
      prisma.task.count({
        where: { AND: [taskWhere, { priority: { in: ["HIGH", "CRITICAL"] } }, { status: { notIn: ["COMPLETED", "CANCELLED"] } }] },
      }),
      prisma.lead.count({ where: { AND: [leadWhere, { status: "CONVERTED" }] } }),
      prisma.lead.groupBy({ by: ["status"], where: leadWhere, _count: true }),
      prisma.task.groupBy({ by: ["priority"], where: taskWhere, _count: true }),
      prisma.lead.count({ where: { organizationId: user.organizationId, assignedToId: user.id } }),
      prisma.task.count({
        where: {
          organizationId: user.organizationId,
          assignedToId: user.id,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      }),
    ]);

    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 1000) / 10 : 0;

    let departmentPerformance: { department: string; total: number; completed: number }[] = [];
    if (user.role === "ADMIN") {
      const depts = ["SALES", "IT", "DIGITAL_MARKETING"] as const;
      departmentPerformance = await Promise.all(
        depts.map(async (department) => {
          const [total, completed] = await Promise.all([
            prisma.task.count({ where: { organizationId: user.organizationId, department } }),
            prisma.task.count({
              where: { organizationId: user.organizationId, department, status: "COMPLETED" },
            }),
          ]);
          return { department, total, completed };
        })
      );
    }

    let employeePerformance: { id: string; name: string; completed: number; pending: number }[] = [];
    if (user.role === "ADMIN") {
      const employees = await prisma.user.findMany({
        where: { organizationId: user.organizationId, status: "ACTIVE", role: { not: "ADMIN" } },
        select: { id: true, name: true },
      });
      employeePerformance = await Promise.all(
        employees.map(async (e) => {
          const [completed, pending] = await Promise.all([
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
          ]);
          return { id: e.id, name: e.name, completed, pending };
        })
      );
    }

    return {
      totalEmployees,
      totalLeads,
      totalContacts,
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      highPriorityTasks,
      convertedLeads,
      conversionRate,
      myAssignedLeads,
      myAssignedTasks,
      leadsByStatus: leadsByStatusRaw.map((r) => ({ status: r.status, count: r._count })),
      tasksByPriority: tasksByPriorityRaw.map((r) => ({ priority: r.priority, count: r._count })),
      departmentPerformance,
      employeePerformance,
    };
  });
}
