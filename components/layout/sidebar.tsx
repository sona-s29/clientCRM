"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users2,
  Contact2,
  ListChecks,
  BarChart3,
  Settings,
  ShieldCheck,
  X,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users2 },
  { href: "/contacts", label: "Contacts", icon: Contact2 },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: "/settings/users", label: "User Management", icon: ShieldCheck, adminOnly: true },
];

export function Sidebar({
  role,
  mobileOpen,
  onMobileClose,
}: {
  role: Role;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();

  const Content = (
    <div className="flex h-full flex-col bg-ink text-ink-foreground">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Building2 className="h-4.5 w-4.5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">clientCRM</p>
          <p className="text-[11px] text-ink-muted">Enterprise workspace</p>
        </div>
        <button
          onClick={onMobileClose}
          className="ml-auto rounded-md p-1 text-ink-muted hover:bg-ink-active hover:text-ink-foreground md:hidden"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto scroll-thin px-3 py-2">
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </div>

        {role === "ADMIN" && (
          <div>
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Administration
            </p>
            <div className="space-y-0.5">
              {ADMIN_ITEMS.map((item) => (
                <SidebarLink key={item.href} item={item} active={isActive(pathname, item.href)} />
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="px-3 py-3">
        <SidebarLink
          item={{ href: "/settings", label: "Settings", icon: Settings }}
          active={isActive(pathname, "/settings") && pathname === "/settings"}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: fixed, always visible, never scrolls with content */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-64 md:flex-col">
        {Content}
      </aside>

      {/* Mobile: slide-over drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden transition-opacity",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-64 transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {Content}
        </aside>
      </div>
    </>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
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
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
    </Link>
  );
}
