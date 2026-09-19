"use client";

import useSWR from "swr";
import { Check, CreditCard } from "lucide-react";
import { apiFetcher } from "@/lib/api-client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton, EmptyState } from "@/components/ui/empty-state";

interface Plan {
  id: string;
  tier: string;
  name: string;
  priceMonthly: number;
  maxUsers: number;
  maxLeads: number;
  features: string[];
  _count: { subscriptions: number };
}

export default function AdminPlansPage() {
  const { data, isLoading } = useSWR<{ data: Plan[] }>("/api/admin/plans", apiFetcher);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Plans</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          The pricing tiers offered on the public pricing page, and how many organizations are on each.
          Plans are seeded data in this build — see PROJECT_EXPLANATION.md for what a full plan-editing
          UI would add.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 w-full" />)}
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState icon={CreditCard} title="No plans configured" description="Sign up once through the public site to auto-create the Free plan, or seed the database." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.data.map((plan) => (
            <Card key={plan.id} className="flex flex-col p-5">
              <CardHeader className="block p-0">
                <CardTitle>{plan.name}</CardTitle>
              </CardHeader>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                ${plan.priceMonthly}
                <span className="text-sm font-normal text-foreground-muted">/mo</span>
              </p>
              <p className="mt-3 text-xs text-foreground-muted">
                Up to {plan.maxUsers >= 999999 ? "unlimited" : plan.maxUsers} users · up to{" "}
                {plan.maxLeads >= 999999 ? "unlimited" : plan.maxLeads} leads
              </p>
              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-border pt-3 text-xs text-foreground-muted">
                {plan._count.subscriptions} organization{plan._count.subscriptions === 1 ? "" : "s"} subscribed
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
