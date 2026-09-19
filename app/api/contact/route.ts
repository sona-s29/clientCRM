import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/api-helpers";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  company: z.string().max(150).optional().nullable(),
  subject: z.string().min(2).max(200),
  message: z.string().min(10).max(4000),
});

/**
 * POST /api/contact
 * Purpose:  Public contact form submission handler.
 * Auth:     None required (visitors aren't signed in).
 * Body:     { name, email, company?, subject, message }
 * Response: { ok: true }
 * DB op:    prisma.contactSubmission.create
 *
 * NO EMAIL PROVIDER IS CONFIGURED. Submissions are stored in the database
 * only — nothing is emailed to anyone. See README/DEPLOYMENT_GUIDE for how
 * to wire up a real transactional email service (e.g. Resend) so this
 * actually notifies a support inbox. Until then, a Super Admin (or anyone
 * with direct database access) can review submissions via `npx prisma
 * studio` — there is deliberately no admin UI for reading them yet, since
 * building a full support-inbox UI is out of scope here.
 */
export async function POST(req: Request) {
  return withApiErrorHandling(async () => {
    const body = await req.json();
    const data = contactSchema.parse(body);

    await prisma.contactSubmission.create({
      data: {
        name: data.name,
        email: data.email,
        company: data.company || null,
        subject: data.subject,
        message: data.message,
      },
    });

    return { ok: true };
  });
}
