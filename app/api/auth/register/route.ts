import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validations";
import { withApiErrorHandling, ApiError } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity";

const TRIAL_LENGTH_DAYS = 14;

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "workspace"
  );
}

/**
 * POST /api/auth/register
 * Purpose:   Public SaaS signup. This is the "Signup → Create Organization"
 *            step of the flow described in ARCHITECTURE.md — NOT "join an
 *            existing team." It always creates a brand-new `Organization`,
 *            a `Subscription` on the FREE plan in TRIAL status, and one
 *            `User` who becomes that organization's Org Admin (`role:
 *            "ADMIN"`). There is no role picker on this form; every other
 *            team member is added afterward by that Org Admin (via
 *            POST /api/users, or the onboarding "invite" step), and only
 *            THEY get assigned IT/Sales/Digital Marketing roles.
 * Auth:      None required (this IS how an organization comes to exist).
 * Body:      { name, email, organizationName, password, confirmPassword }
 * Response:  { id, name, email, role, organizationId, organizationSlug }
 *            (never the password/hash)
 * Errors:    409 if email already registered, 422 on validation failure,
 *            500 if the FREE plan can't be found/created (see below).
 * DB op:     A single `prisma.$transaction` — organization, plan lookup,
 *            subscription, and user are created together, or none are: a
 *            half-created organization with no admin user would be an
 *            unreachable, orphaned tenant.
 */
export async function POST(req: Request) {
  return withApiErrorHandling(async () => {
    const body = await req.json();
    const data = signupSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      throw new ApiError("An account with this email already exists.", 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const baseSlug = slugify(data.organizationName);
    const slug = `${baseSlug}-${crypto.randomBytes(3).toString("hex")}`;
    const trialEndsAt = new Date(Date.now() + TRIAL_LENGTH_DAYS * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      // The FREE plan is normally seeded (see prisma/seed.ts), but signup
      // must not hard-fail on a database that hasn't been seeded yet — so
      // we upsert it here as a safety net rather than assuming it exists.
      const freePlan = await tx.plan.upsert({
        where: { tier: "FREE" },
        update: {},
        create: {
          tier: "FREE",
          name: "Free",
          priceMonthly: 0,
          maxUsers: 3,
          maxLeads: 100,
          features: ["Up to 3 users", "Up to 100 leads", "Core CRM features", "Community support"],
        },
      });

      const organization = await tx.organization.create({
        data: { name: data.organizationName, slug, status: "TRIAL" },
      });

      await tx.subscription.create({
        data: {
          organizationId: organization.id,
          planId: freePlan.id,
          status: "TRIAL",
          trialEndsAt,
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          name: data.name,
          email: data.email.toLowerCase(),
          passwordHash,
          role: "ADMIN",
          department: "ADMIN",
        },
        select: { id: true, name: true, email: true, role: true },
      });

      return { user, organization };
    });

    await logActivity({
      userId: result.user.id,
      organizationId: result.organization.id,
      action: "ORG_CREATED",
      description: `${result.user.name} created the organization "${result.organization.name}"`,
      entityType: "organization",
      entityId: result.organization.id,
    });

    return {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      organizationId: result.organization.id,
      organizationSlug: result.organization.slug,
    };
  });
}
