"use client";

import Link from "next/link";
import useSWR from "swr";
import { Check } from "lucide-react";
import { apiFetcher } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  tier: string;
  name: string;
  priceMonthly: number;
  maxUsers: number;
  maxLeads: number;
  features: string[];
}

export default function PricingPage() {
  const { data, isLoading } = useSWR<{ data: Plan[] }>("/api/plans", apiFetcher);
  const plans = data?.data ?? [];
  const highlightTier = "PROFESSIONAL";

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Simple, transparent pricing.
        </h1>
        <p className="mt-4 text-base text-foreground-muted">
          Start free. Upgrade when your team grows. No payment processor is connected in this demo
          build — signup and plan selection are fully functional, checkout is not.
        </p>
      </div>

      {isLoading ? (
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-96 w-full" />)}
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-2xl border p-6",
                plan.tier === highlightTier ? "border-accent bg-accent-soft/40 shadow-lg" : "border-border bg-surface"
              )}
            >
              {plan.tier === highlightTier && (
                <span className="mb-3 inline-block w-fit rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                  Most popular
                </span>
              )}
              <p className="text-sm font-semibold text-foreground">{plan.name}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                ${plan.priceMonthly}
                <span className="text-sm font-normal text-foreground-muted">/month</span>
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                {plan.maxUsers >= 999999 ? "Unlimited" : `Up to ${plan.maxUsers}`} users
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-6">
                <Button className="w-full" variant={plan.tier === highlightTier ? "default" : "outline"}>
                  Get started
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      <p className="mt-10 text-center text-xs text-foreground-subtle">
        Every plan includes the full feature set in this build — limits shown are the data model&apos;s
        design, not currently enforced at signup. See ARCHITECTURE.md for what enforcing them would add.
      </p>
    </div>
  );
}
