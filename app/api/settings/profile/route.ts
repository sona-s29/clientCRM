import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validations";
import { requireUser, withApiErrorHandling } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity";

/**
 * GET  /api/settings/profile — fetch the signed-in user's own profile.
 * PATCH /api/settings/profile — update name / job title / phone / avatar.
 * Auth: required. Every user may edit their OWN profile only — there is no
 * `id` param here on purpose; it always acts on `session.user.id`.
 */
export async function GET() {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        jobTitle: true,
        phone: true,
        avatarUrl: true,
        emailDigestOptIn: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    return profile;
  });
}

export async function PATCH(req: Request) {
  return withApiErrorHandling(async () => {
    const user = await requireUser();
    const data = updateProfileSchema.parse(await req.json());

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.jobTitle !== undefined && { jobTitle: data.jobTitle }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.emailDigestOptIn !== undefined && { emailDigestOptIn: data.emailDigestOptIn }),
      },
      select: { id: true, name: true, jobTitle: true, phone: true, avatarUrl: true, emailDigestOptIn: true },
    });

    await logActivity({
      userId: user.id,
      organizationId: user.organizationId,
      action: "SETTINGS_UPDATED",
      description: "Updated profile settings",
      entityType: "user",
      entityId: user.id,
    });

    return updated;
  });
}
