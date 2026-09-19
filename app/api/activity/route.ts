import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, withApiErrorHandling } from "@/lib/api-helpers";
import { activityScopeWhere } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/activity
 * Purpose:  Power the Employee Activity / audit-trail screen.
 * Auth:     required. Permission: "activity:view". Admins see everyone's
 *           activity (activity:view:all); everyone else sees only their own
 *           (see lib/permissions.ts -> activityScopeWhere).
 * Query:    page, pageSize, userId (Admin can filter by employee), action
 */
export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const user = await requirePermission("activity:view");
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 20)));
    const userIdFilter = sp.get("userId");
    const action = sp.get("action");

    const where: Prisma.ActivityWhereInput = {
      AND: [
        activityScopeWhere(user),
        userIdFilter ? { userId: userIdFilter } : {},
        action ? { action: action as Prisma.EnumActivityActionFilter["equals"] } : {},
      ],
    };

    const [data, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } },
      }),
      prisma.activity.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  });
}
