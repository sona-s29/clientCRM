import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Users2,
  Contact2,
  ListChecks,
  BarChart3,
  UserCog,
  ShieldCheck,
  UserPlus,
  ListTodo,
  Bell,
  TrendingUp,
  Search,
  BellIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: Users2, title: "Lead Management", desc: "Capture and nurture leads effectively." },
  { icon: Contact2, title: "Contact Management", desc: "Keep your customer information organized." },
  { icon: ListChecks, title: "Task Tracking", desc: "Never miss a follow-up or deadline." },
  { icon: BarChart3, title: "Reports & Analytics", desc: "Turn data into better decisions." },
  { icon: UserCog, title: "Team Management", desc: "Work together seamlessly, by department." },
  { icon: ShieldCheck, title: "Role-Based Access", desc: "Keep your data secure and organized." },
];

const WORKFLOW = [
  { icon: UserPlus, title: "Capture", desc: "Get new leads into one pipeline." },
  { icon: ListTodo, title: "Organize", desc: "Manage and segment your contacts." },
  { icon: Bell, title: "Follow Up", desc: "Stay on track with tasks and reminders." },
  { icon: TrendingUp, title: "Convert", desc: "Turn leads into loyal customers." },
  { icon: BarChart3, title: "Analyze", desc: "Measure performance and grow faster." },
];

export default function MarketingHomePage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 md:px-6 md:pb-24 md:pt-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
              <Sparkles className="h-3.5 w-3.5" /> Smarter Relationships. Stronger Business.
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-5xl">
              One workspace for <span className="text-accent">your entire team.</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-foreground-muted">
              Manage leads, customers, tasks, and performance from one simple CRM — with
              organization-level isolation and role-based access built in from day one.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button size="lg">
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/features">
                <Button size="lg" variant="outline">See features</Button>
              </Link>
            </div>
          </div>

          {/* Dashboard preview mockup — an illustrative CSS approximation, not a screenshot */}
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-accent-soft/60 blur-2xl" />
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
              <div className="flex items-center gap-1.5 border-b border-border bg-surface-muted px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                <div className="ml-3 flex-1 rounded-md bg-surface px-3 py-1 text-xs text-foreground-subtle">
                  <Search className="mr-1.5 inline h-3 w-3" /> app.clientcrm.com/dashboard
                </div>
              </div>
              <div className="flex">
                <div className="hidden w-32 shrink-0 space-y-1 bg-ink px-3 py-4 sm:block">
                  {["Dashboard", "Leads", "Contacts", "Tasks", "Reports"].map((item, i) => (
                    <div
                      key={item}
                      className={`rounded px-2 py-1.5 text-[10px] font-medium ${
                        i === 0 ? "bg-ink-active text-ink-foreground" : "text-ink-muted"
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <div className="flex-1 space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">Good morning, Admin 👋</p>
                    <BellIcon className="h-3.5 w-3.5 text-foreground-subtle" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Total Leads", value: "124", tone: "text-accent" },
                      { label: "Active Deals", value: "32", tone: "text-info" },
                      { label: "Tasks Due", value: "18", tone: "text-warning" },
                      { label: "Conversion", value: "24%", tone: "text-success" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg border border-border bg-surface-muted/50 p-2.5">
                        <p className="text-[9px] text-foreground-muted">{s.label}</p>
                        <p className={`text-sm font-semibold ${s.tone}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-border bg-surface-muted/50 p-2.5">
                    <p className="text-[9px] text-foreground-muted">Sales Overview</p>
                    <svg viewBox="0 0 200 40" className="mt-1 h-8 w-full">
                      <polyline
                        points="0,32 30,24 60,28 90,14 120,18 150,8 180,12 200,4"
                        fill="none"
                        stroke="var(--color-accent)"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <f.icon className="h-4.5 w-4.5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{f.title}</p>
              <p className="mt-1 text-xs text-foreground-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface-muted/50 py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">How it works</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              From lead to customer, without the chaos.
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {WORKFLOW.map((step) => (
              <div key={step.title} className="rounded-xl border border-border bg-surface p-5 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <step.icon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">{step.title}</p>
                <p className="mt-1 text-xs text-foreground-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="flex flex-col items-start gap-6 rounded-2xl bg-ink px-6 py-10 text-ink-foreground md:flex-row md:items-center md:justify-between md:px-10">
          <div>
            <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              Get started today
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              Ready to simplify your workflow?
            </h2>
            <p className="mt-2 max-w-md text-sm text-ink-muted">
              Bring your sales, customers, tasks, and team together in one workspace.
            </p>
          </div>
          <Link href="/signup">
            <Button size="lg" className="whitespace-nowrap">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
