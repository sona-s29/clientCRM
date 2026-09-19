import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api-helpers";
import { requireOrgUser } from "@/lib/tenant";
import { leadScopeWhere, taskScopeWhere } from "@/lib/permissions";

/**
 * GET /api/dashboard/charts
 * Purpose: Single endpoint feeding every chart on the dashboard (Recharts
 *          components just consume this JSON — see components/charts/*).
 * Auth:    required, scoped exactly like /api/dashboard/stats.
 *
 * DATA FLOW (documented in full in clientCRM_INTERVIEW_GUIDE.md):
 *   PostgreSQL -> Prisma query -> this route handler -> JSON -> fetched by
 *   a client component -> passed as `data` prop into a <LineChart>/<BarChart>/
 *   <PieChart> from Recharts. Nothing here is hardcoded; add a lead or
 *   complete a task in the database and these numbers change on next fetch.
 */
export async function GET() {
  return withApiErrorHandling(async () => {
    const user = await requireOrgUser();
    const leadWhere = leadScopeWhere(user);
    const taskWhere = taskScopeWhere(user);

    // --- Leads created per month, last 6 months --------------------------
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const recentLeads = await prisma.lead.findMany({
      where: { AND: [leadWhere, { createdAt: { gte: sixMonthsAgo } }] },
      select: { createdAt: true, status: true },
    });

    const monthBuckets: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      monthBuckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("en-US", { month: "short" }),
      });
    }
    const leadsOverTime = monthBuckets.map(({ key, label }) => {
      const count = recentLeads.filter((l) => {
        const d = l.createdAt;
        return `${d.getFullYear()}-${d.getMonth()}` === key;
      }).length;
      return { month: label, leads: count };
    });

    // --- Lead source distribution -----------------------------------------
    const leadsBySourceRaw = await prisma.lead.groupBy({
      by: ["source"],
      where: leadWhere,
      _count: true,
    });
    const leadsBySource = leadsBySourceRaw.map((r) => ({ source: r.source, count: r._count }));

    // --- Lead status distribution -----------------------------------------
    const leadsByStatusRaw = await prisma.lead.groupBy({
      by: ["status"],
      where: leadWhere,
      _count: true,
    });
    const leadsByStatus = leadsByStatusRaw.map((r) => ({ status: r.status, count: r._count }));

    // --- Task completion trend, last 6 months ------------------------------
    const recentTasks = await prisma.task.findMany({
      where: { AND: [taskWhere, { createdAt: { gte: sixMonthsAgo } }] },
      select: { createdAt: true, status: true, completedAt: true },
    });
    const taskTrend = monthBuckets.map(({ key, label }) => {
      const created = recentTasks.filter((t) => {
        const d = t.createdAt;
        return `${d.getFullYear()}-${d.getMonth()}` === key;
      }).length;
      const completed = recentTasks.filter((t) => {
        if (!t.completedAt) return false;
        const d = t.completedAt;
        return `${d.getFullYear()}-${d.getMonth()}` === key;
      }).length;
      return { month: label, created, completed };
    });

    // --- Tasks by employee (Admin-relevant, harmless for others: scoped) ---
    const tasksByEmployeeRaw = await prisma.task.groupBy({
      by: ["assignedToId"],
      where: { AND: [taskWhere, { assignedToId: { not: null } }] },
      _count: true,
    });
    const employeeIds = tasksByEmployeeRaw.map((r) => r.assignedToId).filter(Boolean) as string[];
    const employees = await prisma.user.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, name: true },
    });
    const tasksByEmployee = tasksByEmployeeRaw.map((r) => ({
      employee: employees.find((e) => e.id === r.assignedToId)?.name ?? "Unassigned",
      count: r._count,
    }));

    return { leadsOverTime, leadsBySource, leadsByStatus, taskTrend, tasksByEmployee };
  });
}
