import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/tenant";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/audit-logs
 * Purpose: The platform-wide audit trail — every `Activity` row across
 *          every organization, PLUS platform-level actions (organizationId
 *          null: org suspensions, plan changes). This is the one query in
 *          the app that deliberately has no tenant filter, since seeing
 *          across tenants is the entire point of the Super Admin role. See
 *          the `Activity` model's schema comment for why this one table
 *          serves both the org-scoped Employee Activity screen and this
 *          platform-scoped view, instead of two separate models.
 * Auth:    required. Super Admin only.
 * Query:   page, pageSize, organizationId (filter to one tenant), action
 */
export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    await requireSuperAdmin();
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 25)));
    const organizationId = sp.get("organizationId");
    const action = sp.get("action");

    const where: Prisma.ActivityWhereInput = {
      AND: [
        organizationId ? { organizationId } : {},
        action ? { action: action as Prisma.EnumActivityActionFilter["equals"] } : {},
      ],
    };

    const [data, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          organization: { select: { id: true, name: true } },
        },
      }),
      prisma.activity.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  });
}
