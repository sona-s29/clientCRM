"use client";

import useSWR from "swr";
import Link from "next/link";
import { Building2, Users2, CreditCard, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { apiFetcher } from "@/lib/api-client";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

interface AdminStats {
  totalOrganizations: number;
  activeOrganizations: number;
  trialOrganizations: number;
  suspendedOrganizations: number;
  totalUsers: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  totalLeads: number;
  totalTasks: number;
  usageByPlan: { plan: string; count: number }[];
  recentOrganizations: {
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: string;
    _count: { users: number };
  }[];
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useSWR<AdminStats>("/api/admin/stats", apiFetcher);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Platform overview</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Live metrics across every organization on clientCRM. Nothing here is scoped to a tenant —
          that&apos;s the point of this console.
        </p>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Total organizations" value={data.totalOrganizations} icon={Building2} tone="accent" />
            <StatCard label="Active organizations" value={data.activeOrganizations} icon={TrendingUp} tone="success" />
            <StatCard label="Trial organizations" value={data.trialOrganizations} icon={Clock} tone="warning" />
            <StatCard label="Suspended" value={data.suspendedOrganizations} icon={AlertTriangle} tone="danger" />
            <StatCard label="Platform users" value={data.totalUsers} icon={Users2} tone="neutral" />
            <StatCard label="Active subscriptions" value={data.activeSubscriptions} icon={CreditCard} tone="success" />
            <StatCard label="Total leads (platform)" value={data.totalLeads} icon={TrendingUp} tone="neutral" />
            <StatCard label="Total tasks (platform)" value={data.totalTasks} icon={TrendingUp} tone="neutral" />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Organizations by plan</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                {data.usageByPlan.length === 0 ? (
                  <p className="text-sm text-foreground-muted">No subscriptions yet.</p>
                ) : (
                  data.usageByPlan.map((p) => (
                    <div key={p.plan} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{p.plan}</span>
                      <span className="font-medium text-foreground-muted">{p.count} orgs</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Recently created organizations</CardTitle>
                <Link href="/admin/organizations" className="text-xs font-medium text-accent hover:underline">
                  View all
                </Link>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {data.recentOrganizations.length === 0 ? (
                  <p className="text-sm text-foreground-muted">No organizations yet.</p>
                ) : (
                  data.recentOrganizations.map((org) => (
                    <div key={org.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-foreground">{org.name}</p>
                        <p className="text-xs text-foreground-muted">
                          {org._count.users} users · {formatDate(org.createdAt)}
                        </p>
                      </div>
                      <Badge variant={org.status === "ACTIVE" ? "success" : org.status === "SUSPENDED" ? "danger" : "warning"}>
                        {org.status}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
