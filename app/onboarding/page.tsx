"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { Check, ArrowRight, Users2, Building2, CreditCard, Target } from "lucide-react";
import { apiFetcher, apiPatch, apiPost, ApiClientError } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  tier: string;
  name: string;
  priceMonthly: number;
  features: string[];
}
interface OrgInfo {
  id: string;
  name: string;
  subscription: { plan: { tier: string } } | null;
}

const STEPS = ["Workspace", "Plan", "First lead", "Invite team"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [orgName, setOrgName] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadCompany, setLeadCompany] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: org, mutate: mutateOrg } = useSWR<OrgInfo>("/api/settings/organization", apiFetcher, {
    onSuccess: (data) => {
      if (!orgName) setOrgName(data.name);
      if (!selectedPlan && data.subscription) setSelectedPlan(data.subscription.plan.tier);
    },
  });
  const { data: plansData } = useSWR<{ data: Plan[] }>("/api/plans", apiFetcher);

  async function goNext() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function saveWorkspaceName() {
    setSaving(true);
    try {
      if (orgName && orgName !== org?.name) {
        await apiPatch("/api/settings/organization", { name: orgName });
        mutateOrg();
      }
      goNext();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function savePlan(tier: string) {
    setSelectedPlan(tier);
    setSaving(true);
    try {
      await apiPatch("/api/settings/organization", { planTier: tier });
      mutateOrg();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save plan");
    } finally {
      setSaving(false);
    }
  }

  async function createFirstLead() {
    if (!leadName.trim()) return goNext();
    setSaving(true);
    try {
      await apiPost("/api/leads", { name: leadName, company: leadCompany || null });
      toast.success("First lead created!");
      goNext();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to create lead");
    } finally {
      setSaving(false);
    }
  }

  function finish() {
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                i < step ? "bg-success text-white" : i === step ? "bg-accent text-accent-foreground" : "bg-surface-muted text-foreground-muted"
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={cn("h-px flex-1", i < step ? "bg-success" : "bg-border")} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card className="p-6">
          <Building2 className="h-6 w-6 text-accent" />
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">Welcome to clientCRM</h1>
          <p className="mt-1.5 text-sm text-foreground-muted">
            Confirm your workspace name — you can change it anytime in Settings.
          </p>
          <div className="mt-5">
            <Label htmlFor="orgName">Workspace name</Label>
            <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          </div>
          <Button className="mt-5 w-full" onClick={saveWorkspaceName} loading={saving}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      )}

      {step === 1 && (
        <Card className="p-6">
          <CreditCard className="h-6 w-6 text-accent" />
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">Choose a plan</h1>
          <p className="mt-1.5 text-sm text-foreground-muted">
            Start on Free — upgrade anytime. No card required for any tier in this build (see the
            Deployment Guide for wiring up real billing).
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(plansData?.data ?? []).map((plan) => (
              <button
                key={plan.id}
                onClick={() => savePlan(plan.tier)}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  selectedPlan === plan.tier ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-muted"
                )}
              >
                <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  ${plan.priceMonthly}
                  <span className="text-xs font-normal text-foreground-muted">/mo</span>
                </p>
              </button>
            ))}
          </div>
          <Button className="mt-5 w-full" onClick={goNext} loading={saving} disabled={!selectedPlan}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6">
          <Target className="h-6 w-6 text-accent" />
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">Add your first lead</h1>
          <p className="mt-1.5 text-sm text-foreground-muted">Optional — you can skip this and add leads later.</p>
          <div className="mt-5 space-y-3">
            <div>
              <Label htmlFor="leadName">Lead name</Label>
              <Input id="leadName" value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Acme Corp" />
            </div>
            <div>
              <Label htmlFor="leadCompany">Company</Label>
              <Input id="leadCompany" value={leadCompany} onChange={(e) => setLeadCompany(e.target.value)} placeholder="Acme Corp Inc." />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={goNext}>Skip</Button>
            <Button className="flex-1" onClick={createFirstLead} loading={saving}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-6">
          <Users2 className="h-6 w-6 text-accent" />
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">Invite your team</h1>
          <p className="mt-1.5 text-sm text-foreground-muted">
            Add employees from User Management, where you&apos;ll set each person&apos;s role
            (IT, Sales, or Digital Marketing) as you create their account. You can do this now or later.
          </p>
          <div className="mt-5 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={finish}>I&apos;ll do this later</Button>
            <Button className="flex-1" onClick={() => router.push("/settings/users")}>
              Go to User Management
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
