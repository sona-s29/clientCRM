import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";
import { withApiErrorHandling } from "@/lib/api-helpers";

/**
 * POST /api/auth/forgot-password
 * Purpose:  Issue a password-reset token for a user, given their email.
 * Auth:     None required.
 * Body:     { email }
 * Response: { ok: true } ALWAYS — even if the email doesn't exist. This is
 *           deliberate: returning a different response for "email not found"
 *           lets attackers enumerate which emails have accounts. We always
 *           say "if that email exists, a reset link has been generated."
 * DB op:    prisma.passwordResetToken.create (1 hour expiry).
 *
 * NO EMAIL PROVIDER IS CONFIGURED IN THIS PROJECT.
 * clientCRM does not integrate a transactional email service (Resend,
 * SendGrid, Postmark, etc.) out of the box, since that requires a paid
 * account/API key we can't provision for you. In development, the generated
 * reset link is returned directly in the API response (and logged to the
 * server console) so you can test the flow end-to-end. Before going to
 * production, wire this route up to a real email provider and STOP
 * returning `resetUrl` in the JSON response (see clientCRM_DEPLOYMENT_GUIDE.md).
 */
export async function POST(req: Request) {
  return withApiErrorHandling(async () => {
    const body = await req.json();
    const { email } = forgotPasswordSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    let resetUrl: string | undefined;

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: { token, userId: user.id, expiresAt },
      });

      resetUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
      console.log(`[DEV] Password reset link for ${user.email}: ${resetUrl}`);
    }

    return {
      ok: true,
      message: "If that email is registered, a reset link has been generated.",
      // Only exposed because there is no email service configured yet.
      devResetUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined,
    };
  });
}
