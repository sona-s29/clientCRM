import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations";
import { withApiErrorHandling, ApiError } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity";

/**
 * POST /api/auth/reset-password
 * Purpose:  Complete a password reset using the token issued by
 *           /api/auth/forgot-password.
 * Auth:     None required (the token itself IS the credential).
 * Body:     { token, password, confirmPassword }
 * Response: { ok: true }
 * Errors:   400 invalid/expired/used token, 422 validation failure.
 * DB op:    Transaction: update user.passwordHash + mark token as used.
 */
export async function POST(req: Request) {
  return withApiErrorHandling(async () => {
    const body = await req.json();
    const { token, password } = resetPasswordSchema.parse(body);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: { select: { organizationId: true } } },
    });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new ApiError("This reset link is invalid or has expired.", 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await logActivity({
      userId: resetToken.userId,
      organizationId: resetToken.user.organizationId,
      action: "USER_UPDATED",
      description: "Password reset via forgot-password flow",
      entityType: "user",
      entityId: resetToken.userId,
    });

    return { ok: true };
  });
}
