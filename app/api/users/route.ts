import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createUserSchema } from "@/lib/validations";
import { requirePermission, withApiErrorHandling, ApiError } from "@/lib/api-helpers";
import { requireOrgUser } from "@/lib/tenant";
import { logActivity } from "@/lib/activity";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/users
 * Purpose:    List employees for the User Management screen (and for
 *             "assign to" dropdowns elsewhere in the app — a lighter-weight
 *             `?forAssignment=true` mode returns only id/name/role/avatar).
 * Auth:       required in BOTH modes. Permission: "user:view" (Org Admin
 *             only) for the full listing.
 * Tenant isolation: `forAssignment=true` MUST still be scoped to the
 *   caller's own organization — this mode previously (pre-multi-tenancy) had
 *   no organization concept to scope by; without this filter, converting the
 *   app to multi-tenant would have silently turned it into a cross-tenant
 *   directory leak (any signed-in user from any org could list every
 *   employee of every other org). `requireOrgUser()` closes that: it both
 *   requires authentication and returns the caller's `organizationId`,
 *   which the query below filters on unconditionally.
 */
export async function GET(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const sp = req.nextUrl.searchParams;
    const forAssignment = sp.get("forAssignment") === "true";

    if (forAssignment) {
      const caller = await requireOrgUser();
      const users = await prisma.user.findMany({
        where: { organizationId: caller.organizationId, status: "ACTIVE" },
        select: { id: true, name: true, role: true, avatarUrl: true },
        orderBy: { name: "asc" },
      });
      return { data: users };
    }

    const admin = await requirePermission("user:view");

    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") ?? 10)));
    const search = sp.get("search")?.trim();
    const role = sp.get("role");
    const status = sp.get("status");

    const where: Prisma.UserWhereInput = {
      AND: [
        { organizationId: admin.organizationId },
        role ? { role: role as Prisma.EnumRoleFilter["equals"] } : {},
        status ? { status: status as Prisma.EnumUserStatusFilter["equals"] } : {},
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
          department: true,
          status: true,
          avatarUrl: true,
          jobTitle: true,
          lastLoginAt: true,
          createdAt: true,
          _count: { select: { assignedLeads: true, assignedTasks: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  });
}

/**
 * POST /api/users
 * Purpose:    Org Admin creates a new employee account directly within their
 *             own organization (as opposed to the public SaaS signup form,
 *             which creates a brand new organization — see
 *             /api/auth/register).
 * Auth:       required. Permission: "user:create" (Org Admin only).
 * Tenant isolation: the new user's `organizationId` is always the caller's
 *   own — never accepted from the request body.
 * DB op:      prisma.user.create with a bcrypt-hashed password.
 */
export async function POST(req: Request) {
  return withApiErrorHandling(async () => {
    const admin = await requirePermission("user:create");
    const data = createUserSchema.parse(await req.json());

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) throw new ApiError("A user with this email already exists.", 409);

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        organizationId: admin.organizationId,
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role,
        department: data.department ?? data.role,
        jobTitle: data.jobTitle || null,
        phone: data.phone || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        status: true,
        createdAt: true,
      },
    });

    await logActivity({
      userId: admin.id,
      organizationId: admin.organizationId,
      action: "USER_CREATED",
      description: `Created employee account for ${user.name} (${user.role})`,
      entityType: "user",
      entityId: user.id,
    });

    return user;
  });
}
