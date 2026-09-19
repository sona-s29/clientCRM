import { prisma } from "@/lib/prisma";
import { withApiErrorHandling, ApiError } from "@/lib/api-helpers";
import { requireOrgUser } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

/**
 * GET /api/settings/organization
 * Purpose: Fetch the caller's own organization + its subscription/plan —
 *          powers the onboarding flow's plan-selection step and the
 *          Settings > Organization tab. Any signed-in tenant member can
 *          VIEW this (not just the Org Admin); only PATCH is restricted.
 * Auth:    required, tenant user only (`requireOrgUser()`).
 */
export async function GET() {
  return withApiErrorHandling(async () => {
    const user = await requireOrgUser();
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      include: { subscription: { include: { plan: true } }, _count: { select: { users: true } } },
    });
    if (!organization) throw new ApiError("Organization not found.", 404);
    return organization;
  });
}

const updateOrgSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  planTier: z.enum(["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]).optional(),
});

/**
 * PATCH /api/settings/organization
 * Purpose: Org Admin renames their organization and/or self-selects a plan
 *          tier. Permission: "settings:manage-org" (Org Admin only).
 * IMPORTANT: this is plan SELECTION, not real billing — there is no payment
 *   step, no card capture, no Stripe checkout session. Choosing a paid tier
 *   here just updates the `Subscription.planId` record, exactly the way a
 *   Stripe webhook would in a production build once payments are wired up
 *   (see ARCHITECTURE.md "Billing"). Selecting a plan never fails for lack
 *   of payment because none is collected in this build — documented,
 *   not hidden.
 */
export async function PATCH(req: Request) {
  return withApiErrorHandling(async () => {
    const user = await requireOrgUser();
    if (!can(user.role, "settings:manage-org")) {
      throw new ApiError("You do not have permission to manage organization settings.", 403);
    }
    const data = updateOrgSchema.parse(await req.json());

    if (data.name) {
      await prisma.organization.update({ where: { id: user.organizationId }, data: { name: data.name } });
    }

    if (data.planTier) {
      const plan = await prisma.plan.findUnique({ where: { tier: data.planTier } });
      if (!plan) throw new ApiError("That plan is not available.", 422);
      await prisma.subscription.update({
        where: { organizationId: user.organizationId },
        data: { planId: plan.id, status: data.planTier === "FREE" ? "ACTIVE" : "ACTIVE" },
      });
    }

    await logActivity({
      userId: user.id,
      organizationId: user.organizationId,
      action: data.planTier ? "SUBSCRIPTION_CHANGED" : "ORG_UPDATED",
      description: data.planTier
        ? `Changed plan to ${data.planTier}`
        : `Updated organization settings`,
      entityType: data.planTier ? "subscription" : "organization",
    });

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      include: { subscription: { include: { plan: true } } },
    });
    return organization;
  });
}
