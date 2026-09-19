import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Building2 } from "lucide-react";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.isSuperAdmin) redirect("/admin");

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center gap-2.5 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Building2 className="h-4.5 w-4.5" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-foreground">clientCRM</span>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-12">{children}</main>
    </div>
  );
}
