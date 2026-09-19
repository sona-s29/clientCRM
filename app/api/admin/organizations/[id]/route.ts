import { prisma } from "@/lib/prisma";
import { withApiErrorHandling, ApiError } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/tenant";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const updateOrgSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  status: z.enum(["ACTIVE", "TRIAL", "SUSPENDED"]).optional(),
});

/**
 * GET /api/admin/organizations/[id]
 * Purpose: Full detail view of one organization for the Super Admin console
 *          — plan/subscription, user list, and CRM data volume. Super Admin
 *          intentionally CAN see this (it's the whole point of the role),
 *          but note it still doesn't expose individual Leads/Contacts/Tasks
 *          content — just counts and the user roster. Super Admin manages
 *          the platform, not a back door into reading every tenant's sales
 *          pipeline.
 */
export async function GET(_req: Request, { params }: Params) {
  return withApiErrorHandling(async () => {
    await requireSuperAdmin();
    const { id } = await params;
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        subscription: { include: { plan: true } },
        users: {
          select: { id: true, name: true, email: true, role: true, status: true, lastLoginAt: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { leads: true, contacts: true, tasks: true } },
      },
    });
    if (!org) throw new ApiError("Organization not found.", 404);
    return org;
  });
}

/**
 * PATCH /api/admin/organizations/[id]
 * Purpose: Rename an organization, or change its status — most importantly
 *          SUSPENDED, which is how a Super Admin locks out an entire tenant
 *          (e.g. for a billing violation or ToS issue). A suspended
 *          organization's users can no longer authenticate — enforced in
 *          `auth.ts`'s `authorize()`, which checks `user.organization.status`
 *          on every login attempt, not just the individual `User.status`.
 * Auth:    required. Super Admin only.
 */
export async function PATCH(req: Request, { params }: Params) {
  return withApiErrorHandling(async () => {
    const admin = await requireSuperAdmin();
    const { id } = await params;
    const existing = await prisma.organization.findUnique({ where: { id } });
    if (!existing) throw new ApiError("Organization not found.", 404);

    const data = updateOrgSchema.parse(await req.json());

    const updated = await prisma.organization.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    await logActivity({
      userId: admin.id,
      organizationId: null,
      action:
        data.status === "SUSPENDED"
          ? "PLATFORM_ORG_SUSPENDED"
          : data.status && existing.status === "SUSPENDED" && data.status !== "SUSPENDED"
          ? "PLATFORM_ORG_REACTIVATED"
          : "ORG_UPDATED",
      description: `${data.status === "SUSPENDED" ? "Suspended" : "Updated"} organization "${updated.name}"`,
      entityType: "organization",
      entityId: updated.id,
    });

    return updated;
  });
}
