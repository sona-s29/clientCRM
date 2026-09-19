import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/tenant";

/**
 * GET /api/admin/plans
 * Purpose: List the platform's pricing plans with how many organizations
 *          are subscribed to each — backs /admin/plans. Plans themselves
 *          are seeded data (prisma/seed.ts), not created ad hoc through
 *          this UI in this build; see PROJECT_EXPLANATION.md for what a
 *          full plan-editing admin UI would add.
 * Auth:    required. Super Admin only.
 */
export async function GET() {
  return withApiErrorHandling(async () => {
    await requireSuperAdmin();
    const plans = await prisma.plan.findMany({
      orderBy: { priceMonthly: "asc" },
      include: { _count: { select: { subscriptions: true } } },
    });
    return { data: plans };
  });
}
