"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { apiFetcher } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { timeAgo } from "@/lib/utils";
import { toLabel } from "@/lib/constants";

interface ActivityRow {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null; role: string };
}
interface ActivityResponse {
  data: ActivityRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ACTIONS = [
  "LOGIN",
  "USER_CREATED",
  "USER_UPDATED",
  "USER_DEACTIVATED",
  "LEAD_CREATED",
  "LEAD_UPDATED",
  "LEAD_DELETED",
  "LEAD_ASSIGNED",
  "CONTACT_CREATED",
  "CONTACT_UPDATED",
  "CONTACT_DELETED",
  "TASK_CREATED",
  "TASK_UPDATED",
  "TASK_ASSIGNED",
  "TASK_COMPLETED",
  "TASK_DELETED",
  "SETTINGS_UPDATED",
];

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("all");

  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (action !== "all") params.set("action", action);

  const { data, error, isLoading, mutate } = useSWR<ActivityResponse>(
    `/api/activity?${params.toString()}`,
    apiFetcher
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" aria-label="Back to settings"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <History className="h-5 w-5 text-accent" /> Employee Activity
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">A full audit trail of who did what, and when.</p>
        </div>
        <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {ACTIONS.map((a) => <SelectItem key={a} value={a}>{toLabel(a)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <TableSkeleton cols={3} />
        ) : error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={History} title="No activity yet" description="Actions taken across the app will show up here." />
        ) : (
          <>
            <ul className="divide-y divide-border">
              {data.data.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                  <Avatar name={a.user.name} src={a.user.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{a.user.name}</span> {a.description}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground-subtle">{timeAgo(a.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
