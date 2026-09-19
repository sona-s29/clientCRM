"use client";

import useSWR from "swr";
import Link from "next/link";
import {
  Users2,
  Contact2,
  ListChecks,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  TrendingUp,
  Building2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { apiFetcher } from "@/lib/api-client";
import { StatCard, StatCardSkeleton } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { LeadsOverTimeChart } from "@/components/charts/leads-over-time-chart";
import { LeadStatusDonut } from "@/components/charts/lead-status-donut";
import { LeadSourceBarChart } from "@/components/charts/lead-source-bar-chart";
import { TaskTrendChart } from "@/components/charts/task-trend-chart";
import { TasksByEmployeeChart } from "@/components/charts/tasks-by-employee-chart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { toLabel } from "@/lib/constants";

interface DashboardStats {
  totalEmployees: number | null;
  totalLeads: number;
  totalContacts: number;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  highPriorityTasks: number;
  convertedLeads: number;
  conversionRate: number;
  myAssignedLeads: number;
  myAssignedTasks: number;
  departmentPerformance: { department: string; total: number; completed: number }[];
  employeePerformance: { id: string; name: string; completed: number; pending: number }[];
}

interface ChartsData {
  leadsOverTime: { month: string; leads: number }[];
  leadsBySource: { source: string; count: number }[];
  leadsByStatus: { status: string; count: number }[];
  taskTrend: { month: string; created: number; completed: number }[];
  tasksByEmployee: { employee: string; count: number }[];
}

interface RecentLead {
  id: string;
  name: string;
  company: string | null;
  status: string;
  priority: string;
  createdAt: string;
}
interface RecentTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedTo: { name: string } | null;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  const { data: stats, isLoading: statsLoading } = useSWR<DashboardStats>(
    "/api/dashboard/stats",
    apiFetcher
  );
  const { data: charts, isLoading: chartsLoading } = useSWR<ChartsData>(
    "/api/dashboard/charts",
    apiFetcher
  );
  const { data: recentLeads } = useSWR<{ data: RecentLead[] }>(
    "/api/leads?pageSize=5&sortBy=createdAt&sortDir=desc",
    apiFetcher
  );
  const { data: recentTasks } = useSWR<{ data: RecentTask[] }>(
    "/api/tasks?pageSize=5&sortBy=createdAt&sortDir=desc",
    apiFetcher
  );

  const isAdmin = role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {isAdmin ? "Organization overview" : "Your dashboard"}
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {isAdmin
            ? "Live performance across every department, straight from PostgreSQL."
            : "A live snapshot of your leads, tasks, and priorities."}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statsLoading || !stats ? (
          Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            {isAdmin && (
              <StatCard label="Total Employees" value={stats.totalEmployees ?? 0} icon={Users2} tone="accent" />
            )}
            <StatCard label="Total Leads" value={stats.totalLeads} icon={Users2} tone="accent" />
            <StatCard label="Total Contacts" value={stats.totalContacts} icon={Contact2} tone="neutral" />
            <StatCard label="Total Tasks" value={stats.totalTasks} icon={ListChecks} tone="neutral" />
            <StatCard label="Pending Tasks" value={stats.pendingTasks} icon={Clock} tone="warning" />
            <StatCard label="Completed Tasks" value={stats.completedTasks} icon={CheckCircle2} tone="success" />
            <StatCard label="Overdue Tasks" value={stats.overdueTasks} icon={AlertTriangle} tone="danger" />
            <StatCard label="High Priority" value={stats.highPriorityTasks} icon={Flame} tone="danger" />
            <StatCard label="Conversion Rate" value={stats.conversionRate} suffix="%" icon={TrendingUp} tone="success" />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Leads created" description="Last 6 months, live from PostgreSQL">
          {chartsLoading || !charts ? (
            <div className="h-[260px] animate-pulse rounded-md bg-surface-muted" />
          ) : (
            <LeadsOverTimeChart data={charts.leadsOverTime} />
          )}
        </ChartCard>

        <ChartCard title="Lead status distribution" description="Where every lead currently stands">
          {chartsLoading || !charts ? (
            <div className="h-[260px] animate-pulse rounded-md bg-surface-muted" />
          ) : (
            <LeadStatusDonut data={charts.leadsByStatus} />
          )}
        </ChartCard>

        <ChartCard title="Lead sources" description="Where leads are coming from">
          {chartsLoading || !charts ? (
            <div className="h-[260px] animate-pulse rounded-md bg-surface-muted" />
          ) : (
            <LeadSourceBarChart data={charts.leadsBySource} />
          )}
        </ChartCard>

        <ChartCard title="Task completion trend" description="Created vs. completed per month">
          {chartsLoading || !charts ? (
            <div className="h-[260px] animate-pulse rounded-md bg-surface-muted" />
          ) : (
            <TaskTrendChart data={charts.taskTrend} />
          )}
        </ChartCard>

        {isAdmin && (
          <ChartCard title="Tasks by employee" description="Workload distribution" className="lg:col-span-2">
            {chartsLoading || !charts ? (
              <div className="h-[260px] animate-pulse rounded-md bg-surface-muted" />
            ) : (
              <TasksByEmployeeChart data={charts.tasksByEmployee} />
            )}
          </ChartCard>
        )}
      </div>

      {/* Admin-only: department performance */}
      {isAdmin && stats && stats.departmentPerformance.length > 0 && (
        <Card>
          <CardHeader className="block">
            <CardTitle>Department performance</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3">
            {stats.departmentPerformance.map((d) => {
              const pct = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
              return (
                <div key={d.department} className="rounded-md border border-border p-3.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-foreground-subtle" />
                    <p className="text-sm font-medium text-foreground">{toLabel(d.department)}</p>
                  </div>
                  <p className="mt-2 text-xl font-semibold text-foreground">{pct}%</p>
                  <p className="text-xs text-foreground-muted">
                    {d.completed} of {d.total} tasks completed
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recent activity row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent leads</CardTitle>
            <Link href="/leads" className="text-xs font-medium text-accent hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {!recentLeads ? (
              <div className="p-4 text-sm text-foreground-muted">Loading…</div>
            ) : recentLeads.data.length === 0 ? (
              <EmptyState title="No leads yet" description="Create your first lead to see it here." />
            ) : (
              <ul className="divide-y divide-border">
                {recentLeads.data.map((lead) => (
                  <li key={lead.id}>
                    <Link href={`/leads/${lead.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-muted">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{lead.name}</p>
                        <p className="truncate text-xs text-foreground-muted">{lead.company || "No company"}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <PriorityBadge priority={lead.priority} />
                        <Badge variant="neutral">{toLabel(lead.status)}</Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent tasks</CardTitle>
            <Link href="/tasks" className="text-xs font-medium text-accent hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {!recentTasks ? (
              <div className="p-4 text-sm text-foreground-muted">Loading…</div>
            ) : recentTasks.data.length === 0 ? (
              <EmptyState title="No tasks yet" description="Create a task to see it here." />
            ) : (
              <ul className="divide-y divide-border">
                {recentTasks.data.map((task) => (
                  <li key={task.id}>
                    <Link href={`/tasks/${task.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-muted">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                        <p className="truncate text-xs text-foreground-muted">
                          {task.assignedTo?.name ?? "Unassigned"}
                          {task.dueDate ? ` · Due ${formatDate(task.dueDate)}` : ""}
                        </p>
                      </div>
                      <PriorityBadge priority={task.priority} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
