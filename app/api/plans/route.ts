import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api-helpers";

/**
 * GET /api/plans
 * Purpose: List pricing plans. Deliberately PUBLIC (no auth required) — it
 *          backs both the public /pricing marketing page (visitors aren't
 *          signed in yet) and the onboarding wizard's plan-selection step.
 *          Contains no tenant or user data, just plan definitions, so there
 *          is nothing here to scope or protect.
 */
export async function GET() {
  return withApiErrorHandling(async () => {
    const plans = await prisma.plan.findMany({ orderBy: { priceMonthly: "asc" } });
    return { data: plans };
  });
}
