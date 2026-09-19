import Link from "next/link";
import { ArrowRight, Target, Layers, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        About clientCRM
      </h1>
      <p className="mt-5 text-base leading-relaxed text-foreground-muted">
        clientCRM is a multi-tenant CRM built for teams with Sales, IT, and Digital Marketing
        departments working under one Organization Admin — and, at the platform level, a Super Admin
        overseeing every organization on clientCRM itself. It started as a single-team CRM and was
        rebuilt into a proper SaaS architecture: each signup creates its own isolated organization,
        with its own users, leads, contacts, tasks, and data that no other organization can ever see.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5">
          <Target className="h-5 w-5 text-accent" />
          <p className="mt-3 text-sm font-semibold text-foreground">The problem</p>
          <p className="mt-1.5 text-xs text-foreground-muted">
            Small teams outgrow spreadsheets fast, but most CRMs are either too simple (no real
            permissions) or too complex (enterprise software nobody enjoys using).
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <Layers className="h-5 w-5 text-accent" />
          <p className="mt-3 text-sm font-semibold text-foreground">Who it&apos;s for</p>
          <p className="mt-1.5 text-xs text-foreground-muted">
            Organizations with a handful of departments that each need their own lane — visible to
            their Org Admin, invisible to every other organization on the platform.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <p className="mt-3 text-sm font-semibold text-foreground">How it&apos;s built</p>
          <p className="mt-1.5 text-xs text-foreground-muted">
            Next.js, PostgreSQL, and Prisma, with every permission and every tenant boundary enforced
            server-side — never just a hidden button in the UI.
          </p>
        </div>
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-surface-muted/50 p-8 text-center">
        <p className="text-lg font-semibold text-foreground">Curious how it works under the hood?</p>
        <p className="mt-1 text-sm text-foreground-muted">
          The project ships with a full architecture writeup and an interview-style Q&amp;A guide.
        </p>
        <Link href="/signup" className="mt-5 inline-block">
          <Button size="lg">Try it yourself <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      </div>
    </div>
  );
}
