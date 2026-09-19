import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validations";
import { requireUser, withApiErrorHandling, ApiError } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity";

/**
 * PATCH /api/settings/password
 * Purpose: Let a signed-in user change their own password, after verifying
 *          their current password (prevents a hijacked session with a
 *          stolen cookie from silently locking the real owner out forever).
 * Auth:    required.
 */
export async function PATCH(req: Request) {
  return withApiErrorHandling(async () => {
    const sessionUser = await requireUser();
    const data = changePasswordSchema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!user) throw new ApiError("User not found.", 404);

    const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isValid) throw new ApiError("Current password is incorrect.", 400);

    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    await logActivity({
      userId: user.id,
      organizationId: sessionUser.organizationId,
      action: "SETTINGS_UPDATED",
      description: "Changed account password",
      entityType: "user",
      entityId: user.id,
    });

    return { ok: true };
  });
}
