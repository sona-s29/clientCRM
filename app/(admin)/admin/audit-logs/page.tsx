"use client";

import { useState } from "react";
import useSWR from "swr";
import { History } from "lucide-react";
import { apiFetcher } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { timeAgo } from "@/lib/utils";
import { toLabel } from "@/lib/constants";

interface LogRow {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
  organization: { id: string; name: string } | null;
}
interface LogResponse {
  data: LogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);

  const { data, error, isLoading, mutate } = useSWR<LogResponse>(
    `/api/admin/audit-logs?page=${page}&pageSize=25`,
    apiFetcher
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Audit logs</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Every recorded action across every organization, plus platform-level actions (organization
          suspensions, plan changes) with no organization attached. This is the same underlying table
          as each organization&apos;s own Employee Activity screen — see DATABASE_GUIDE.md.
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <TableSkeleton cols={3} />
        ) : error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={History} title="No activity yet" />
        ) : (
          <>
            <ul className="divide-y divide-border">
              {data.data.map((log) => (
                <li key={log.id} className="flex items-start gap-3 px-5 py-3.5">
                  <Avatar name={log.user.name} src={log.user.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{log.user.name}</span> {log.description}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-xs text-foreground-subtle">{timeAgo(log.createdAt)}</p>
                      {log.organization ? (
                        <Badge variant="neutral">{log.organization.name}</Badge>
                      ) : (
                        <Badge variant="accent">Platform</Badge>
                      )}
                      <Badge variant="neutral">{toLabel(log.action)}</Badge>
                    </div>
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
