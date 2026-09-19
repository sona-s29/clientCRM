"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { apiFetcher, apiPatch, ApiClientError } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { OrgStatusBadge } from "@/components/ui/badge";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDate } from "@/lib/utils";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "TRIAL" | "SUSPENDED";
  createdAt: string;
  subscription: { plan: { name: string } } | null;
  _count: { users: number; leads: number; tasks: number };
}
interface OrgResponse {
  data: OrgRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function AdminOrganizationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [suspending, setSuspending] = useState<OrgRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const params = new URLSearchParams({ page: String(page), pageSize: "10" });
  if (search) params.set("search", search);
  if (status !== "all") params.set("status", status);

  const { data, error, isLoading, mutate } = useSWR<OrgResponse>(
    `/api/admin/organizations?${params.toString()}`,
    apiFetcher
  );

  async function handleSuspend() {
    if (!suspending) return;
    setActionLoading(true);
    try {
      await apiPatch(`/api/admin/organizations/${suspending.id}`, { status: "SUSPENDED" });
      toast.success(`${suspending.name} suspended — its users can no longer log in.`);
      setSuspending(null);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to suspend organization");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReactivate(org: OrgRow) {
    try {
      await apiPatch(`/api/admin/organizations/${org.id}`, { status: "ACTIVE" });
      toast.success(`${org.name} reactivated`);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to reactivate");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Organizations</h1>
        <p className="mt-1 text-sm text-foreground-muted">Every tenant on the platform.</p>
      </div>

      <Card className="p-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or slug…" className="flex-1" />
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="TRIAL">Trial</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={Building2} title="No organizations found" description="Organizations appear here as people sign up." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{org.name}</p>
                      <p className="text-xs text-foreground-muted">/{org.slug}</p>
                    </TableCell>
                    <TableCell className="text-sm text-foreground-muted">
                      {org.subscription?.plan.name ?? "—"}
                    </TableCell>
                    <TableCell><OrgStatusBadge status={org.status} /></TableCell>
                    <TableCell className="text-xs text-foreground-muted">
                      {org._count.users} users · {org._count.leads} leads · {org._count.tasks} tasks
                    </TableCell>
                    <TableCell className="text-xs text-foreground-muted">{formatDate(org.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {org.status === "SUSPENDED" ? (
                        <Button variant="ghost" size="sm" className="text-success" onClick={() => handleReactivate(org)}>
                          Reactivate
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-danger" onClick={() => setSuspending(org)}>
                          Suspend
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!suspending}
        onOpenChange={(o) => !o && setSuspending(null)}
        title="Suspend organization?"
        description={`Every user in "${suspending?.name}" will immediately be unable to log in. Their data is kept and nothing is deleted — you can reactivate at any time.`}
        confirmLabel="Suspend"
        loading={actionLoading}
        onConfirm={handleSuspend}
      />
    </div>
  );
}
