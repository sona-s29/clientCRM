import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/tenant";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/subscriptions
 * Purpose: List every organization's subscription — plan, status, trial/
 *          renewal dates — for the Super Admin console. No real payment
 *          processor is integrated (see README/ARCHITECTURE.md); this is
 *          the subscription *record*, which in production would be kept in
 *          sync by Stripe webhooks instead of only changing here.
 * Auth:    required. Super Admin only.
 */
export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    await requireSuperAdmin();
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 15)));
    const status = sp.get("status");

    const where: Prisma.SubscriptionWhereInput = status
      ? { status: status as Prisma.EnumSubscriptionStatusFilter["equals"] }
      : {};

    const [data, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { organization: { select: { id: true, name: true, slug: true } }, plan: true },
      }),
      prisma.subscription.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  });
}
