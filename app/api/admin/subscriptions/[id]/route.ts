import { prisma } from "@/lib/prisma";
import { withApiErrorHandling, ApiError } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/tenant";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const updateSubscriptionSchema = z.object({
  planId: z.string().optional(),
  status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED", "SUSPENDED"]).optional(),
});

/**
 * PATCH /api/admin/subscriptions/[id]
 * Purpose: Super Admin manually changes an organization's plan tier or
 *          subscription status — this is the manual equivalent of what a
 *          Stripe webhook would do automatically in a production billing
 *          setup (see ARCHITECTURE.md "Billing" for exactly what wiring up
 *          real payments would change here).
 * Auth:    required. Super Admin only.
 */
export async function PATCH(req: Request, { params }: Params) {
  return withApiErrorHandling(async () => {
    const admin = await requireSuperAdmin();
    const { id } = await params;
    const existing = await prisma.subscription.findUnique({
      where: { id },
      include: { organization: true, plan: true },
    });
    if (!existing) throw new ApiError("Subscription not found.", 404);

    const data = updateSubscriptionSchema.parse(await req.json());

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        ...(data.planId !== undefined && { planId: data.planId }),
        ...(data.status !== undefined && { status: data.status }),
      },
      include: { organization: true, plan: true },
    });

    await logActivity({
      userId: admin.id,
      organizationId: null,
      action: data.planId ? "PLATFORM_PLAN_CHANGED" : "SUBSCRIPTION_CHANGED",
      description: `${data.planId ? `Changed plan for "${updated.organization.name}" to ${updated.plan.name}` : `Set subscription status for "${updated.organization.name}" to ${updated.status}`}`,
      entityType: "subscription",
      entityId: updated.id,
    });

    return updated;
  });
}
