import Link from "next/link";
import {
  Users2,
  Contact2,
  ListChecks,
  BarChart3,
  ShieldCheck,
  UserCog,
  LayoutDashboard,
  Building2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Users2,
    title: "Lead Management",
    desc: "Track every lead through a real pipeline — New, Contacted, Qualified, Proposal, Negotiation, Converted, or Lost — with priority, source, and follow-up dates. Server-side search, filtering, sorting, and pagination, not a client-side toy list.",
  },
  {
    icon: Contact2,
    title: "Contact Management",
    desc: "Keep the people behind your leads organized, with company, phone, address, and notes, and an optional link back to the lead that produced them.",
  },
  {
    icon: ListChecks,
    title: "Task Tracking",
    desc: "Assign work with due dates and priorities. Overdue status is computed live from the due date, not a field that can silently go stale.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    desc: "Lead, task, conversion, and (for Organization Admins) department/employee performance reports, with date filtering and real CSV export.",
  },
  {
    icon: UserCog,
    title: "Team Management",
    desc: "Organization Admins create employee accounts, assign IT/Sales/Digital Marketing roles, deactivate accounts, and reset passwords — scoped to their own organization only.",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Access",
    desc: "Every permission is enforced on the server, not just hidden in the UI — see how in the Interview Guide bundled with the source code.",
  },
  {
    icon: LayoutDashboard,
    title: "Role-Aware Dashboard",
    desc: "KPIs and charts scoped to what each role should see: an Org Admin sees the whole organization; a Sales rep sees their department's pipeline.",
  },
  {
    icon: Building2,
    title: "Multi-Tenant Organizations",
    desc: "Every organization's data is isolated at the database query level — the same account can never see another organization's leads, contacts, tasks, or team.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Everything your team needs, nothing it doesn&apos;t.
        </h1>
        <p className="mt-4 text-base text-foreground-muted">
          Every feature below is implemented and working — this page describes the actual product,
          not a roadmap.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <f.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">{f.title}</p>
            <p className="mt-1.5 text-sm text-foreground-muted">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 flex flex-col items-start gap-4 rounded-2xl border border-border bg-surface-muted/50 p-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-foreground">See it running with your own data.</p>
          <p className="mt-1 text-sm text-foreground-muted">Free to start — no card required.</p>
        </div>
        <Link href="/signup">
          <Button size="lg">Get Started Free <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      </div>
    </div>
  );
}
