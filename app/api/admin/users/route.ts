import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api-helpers";
import { requireSuperAdmin } from "@/lib/tenant";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/users
 * Purpose: Platform-wide user directory — every user, across every
 *          organization, with the organization's name attached. This is
 *          the Super Admin's "platform users/overview," distinct from any
 *          single tenant's own User Management screen (which only ever
 *          sees its own org — see GET /api/users).
 * Auth:    required. Super Admin only.
 */
export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    await requireSuperAdmin();
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 15)));
    const search = sp.get("search")?.trim();

    const where: Prisma.UserWhereInput = {
      AND: [
        { isSuperAdmin: false },
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          organization: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  });
}
