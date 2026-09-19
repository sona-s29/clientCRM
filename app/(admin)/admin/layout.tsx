import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SuperAdminShell } from "@/components/layout/super-admin-shell";

/**
 * app/(admin)/admin/layout.tsx
 * ----------------------------------------------------------------------------
 * A deliberately SEPARATE shell from app/(dashboard)/layout.tsx — different
 * sidebar, different nav, different color accent even — so it's visually
 * unmistakable that you're in the platform console, not inside any one
 * organization's CRM. `middleware.ts` already redirects non-Super-Admins
 * away from `/admin/*`; this server check is defense in depth plus the
 * source of the session data the shell needs to render.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.isSuperAdmin) redirect("/dashboard");

  return <SuperAdminShell user={session.user}>{children}</SuperAdminShell>;
}
