import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

/**
 * app/(dashboard)/layout.tsx
 * ----------------------------------------------------------------------------
 * Wraps every authenticated page (Dashboard, Leads, Contacts, Tasks, Reports,
 * Settings) with the fixed Sidebar + Topbar chrome. `middleware.ts` already
 * redirects unauthenticated requests before they get this far, but we check
 * `auth()` again here as defense-in-depth and to get the session data needed
 * to render the user's name/avatar/role in the Topbar without a client-side
 * fetch waterfall.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
