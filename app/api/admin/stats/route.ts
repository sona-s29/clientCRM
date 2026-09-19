import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/tenant";

/**
 * GET /api/admin/stats
 * Purpose:  Feed the Super Admin dashboard's KPI cards — every number is a
 *           live query, scoped to nothing (Super Admin sees the whole
 *           platform by design; this is the one place in the app that is
 *           deliberately NOT tenant-scoped).
 * Auth:     required. Must be a Super Admin (`requireSuperAdmin()`) — a
 *           tenant Org Admin gets a 403 even though they also have "ADMIN"
 *           as their organizational role; see lib/permissions.ts module
 *           comment on the two independent access axes.
 */
export async function GET() {
  return withApiErrorHandling(async () => {
    await requireSuperAdmin();

    const [
      totalOrganizations,
      activeOrganizations,
      trialOrganizations,
      suspendedOrganizations,
      totalUsers,
      activeSubscriptions,
      trialSubscriptions,
      pastDueSubscriptions,
      totalLeads,
      totalTasks,
      planCounts,
      recentOrganizations,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { status: "ACTIVE" } }),
      prisma.organization.count({ where: { status: "TRIAL" } }),
      prisma.organization.count({ where: { status: "SUSPENDED" } }),
      prisma.user.count({ where: { isSuperAdmin: false } }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.subscription.count({ where: { status: "TRIAL" } }),
      prisma.subscription.count({ where: { status: "PAST_DUE" } }),
      prisma.lead.count(),
      prisma.task.count(),
      prisma.subscription.groupBy({ by: ["planId"], _count: true }),
      prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          createdAt: true,
          _count: { select: { users: true } },
        },
      }),
    ]);

    const plans = await prisma.plan.findMany();
    const usageByPlan = planCounts.map((p) => ({
      plan: plans.find((pl) => pl.id === p.planId)?.name ?? "Unknown",
      count: p._count,
    }));

    return {
      totalOrganizations,
      activeOrganizations,
      trialOrganizations,
      suspendedOrganizations,
      totalUsers,
      activeSubscriptions,
      trialSubscriptions,
      pastDueSubscriptions,
      totalLeads,
      totalTasks,
      usageByPlan,
      recentOrganizations,
    };
  });
}
