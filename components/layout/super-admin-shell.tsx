"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Building2,
  Users2,
  CreditCard,
  Receipt,
  History,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar } from "@/components/ui/avatar";

const NAV = [
  { href: "/admin", label: "Platform overview", icon: LayoutDashboard },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/admin/users", label: "Platform users", icon: Users2 },
  { href: "/admin/plans", label: "Plans", icon: CreditCard },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: Receipt },
  { href: "/admin/audit-logs", label: "Audit logs", icon: History },
];

interface AdminUser {
  name: string;
  email: string;
  avatarUrl: string | null;
}

export function SuperAdminShell({ user, children }: { user: AdminUser; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ink text-ink-foreground md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-danger text-white">
            <ShieldAlert className="h-4.5 w-4.5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">clientCRM</p>
            <p className="text-[11px] text-ink-muted">Super Admin console</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-ink-active text-ink-foreground"
                    : "text-ink-muted hover:bg-ink-active/60 hover:text-ink-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-3 py-3">
          <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{user.name}</p>
              <p className="truncate text-[11px] text-ink-muted">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-1 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-ink-muted hover:bg-ink-active/60 hover:text-ink-foreground"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground md:hidden">
            <ShieldAlert className="h-4 w-4 text-danger" /> Super Admin
          </div>
          <div className="hidden text-sm text-foreground-muted md:block">
            Platform-wide view — not scoped to any single organization.
          </div>
          <ThemeToggle />
        </header>
        <main className="px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
