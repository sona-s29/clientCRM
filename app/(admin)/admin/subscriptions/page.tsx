"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Receipt } from "lucide-react";
import { apiFetcher, apiPatch, ApiClientError } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

interface SubRow {
  id: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  organization: { id: string; name: string; slug: string };
  plan: { id: string; name: string };
}
interface SubResponse {
  data: SubRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const STATUS_OPTIONS = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED", "SUSPENDED"] as const;

export default function AdminSubscriptionsPage() {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), pageSize: "15" });
  if (status !== "all") params.set("status", status);

  const { data, error, isLoading, mutate } = useSWR<SubResponse>(
    `/api/admin/subscriptions?${params.toString()}`,
    apiFetcher
  );

  async function handleStatusChange(sub: SubRow, newStatus: string) {
    try {
      await apiPatch(`/api/admin/subscriptions/${sub.id}`, { status: newStatus });
      toast.success(`Subscription status updated for ${sub.organization.name}`);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update subscription");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Subscriptions</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            No real payment processor is connected — see ARCHITECTURE.md for the Stripe integration
            points. Status here is set manually, the way a webhook would set it automatically in production.
          </p>
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={Receipt} title="No subscriptions found" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trial ends</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium text-foreground">{sub.organization.name}</TableCell>
                    <TableCell className="text-sm text-foreground-muted">{sub.plan.name}</TableCell>
                    <TableCell>
                      <Select value={sub.status} onValueChange={(v) => handleStatusChange(sub, v)}>
                        <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-foreground-muted">{formatDate(sub.trialEndsAt)}</TableCell>
                    <TableCell className="text-xs text-foreground-muted">{formatDate(sub.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
