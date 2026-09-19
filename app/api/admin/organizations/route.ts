import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/tenant";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/organizations
 * Purpose: List every organization on the platform, with user/lead/task
 *          counts and subscription status, for the Super Admin console.
 * Auth:    required. Super Admin only.
 */
export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    await requireSuperAdmin();
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 10)));
    const search = sp.get("search")?.trim();
    const status = sp.get("status");

    const where: Prisma.OrganizationWhereInput = {
      AND: [
        status ? { status: status as Prisma.EnumOrganizationStatusFilter["equals"] } : {},
        search
          ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { slug: { contains: search, mode: "insensitive" } }] }
          : {},
      ],
    };

    const [data, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          subscription: { include: { plan: true } },
          _count: { select: { users: true, leads: true, tasks: true } },
        },
      }),
      prisma.organization.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  });
}
