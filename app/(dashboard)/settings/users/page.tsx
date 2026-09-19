"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Plus, KeyRound, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { apiFetcher, apiPost, apiPatch, apiDelete, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { UserStatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { UserForm } from "@/components/settings/user-form";
import { ROLE_OPTIONS, ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { CreateUserInput } from "@/lib/validations";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "IT" | "SALES" | "DIGITAL_MARKETING";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  avatarUrl: string | null;
  jobTitle: string | null;
  lastLoginAt: string | null;
  _count: { assignedLeads: number; assignedTasks: number };
}
interface UsersResponse {
  data: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function UserManagementPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [deactivating, setDeactivating] = useState<UserRow | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{ name: string; password: string } | null>(null);

  const params = new URLSearchParams({ page: String(page), pageSize: "10" });
  if (search) params.set("search", search);
  if (role !== "all") params.set("role", role);
  if (status !== "all") params.set("status", status);

  const { data, error, isLoading, mutate } = useSWR<UsersResponse>(`/api/users?${params.toString()}`, apiFetcher);

  async function handleCreate(values: CreateUserInput) {
    await apiPost("/api/users", values);
    toast.success("Employee account created");
    setCreateOpen(false);
    mutate();
  }

  async function handleRoleChange(user: UserRow, newRole: string) {
    try {
      await apiPatch(`/api/users/${user.id}`, { role: newRole });
      toast.success("Role updated");
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update role");
    }
  }

  async function handleReactivate(user: UserRow) {
    try {
      await apiPatch(`/api/users/${user.id}`, { status: "ACTIVE" });
      toast.success(`${user.name} reactivated`);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to reactivate");
    }
  }

  async function handleDeactivate() {
    if (!deactivating) return;
    setDeactivateLoading(true);
    try {
      await apiDelete(`/api/users/${deactivating.id}`);
      toast.success(`${deactivating.name} deactivated`);
      setDeactivating(null);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to deactivate");
    } finally {
      setDeactivateLoading(false);
    }
  }

  async function handleResetPassword(user: UserRow) {
    try {
      const res = await apiPost<{ temporaryPassword: string }>(`/api/users/${user.id}/reset-password`);
      setResetResult({ name: user.name, password: res.temporaryPassword });
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to reset password");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" aria-label="Back to settings"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" /> User Management
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">Create employee accounts and manage roles, departments, and access.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New employee</Button>
      </div>

      <Card className="p-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or email…" className="flex-1" />
          <div className="flex gap-2">
            <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No employees found" description="Create your first employee account." actionLabel="New employee" onAction={() => setCreateOpen(true)} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Workload</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                        <div>
                          <p className="font-medium text-foreground">{u.name}</p>
                          <p className="text-xs text-foreground-muted">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={u.role} onValueChange={(v) => handleRoleChange(u, v)}>
                        <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><UserStatusBadge status={u.status} /></TableCell>
                    <TableCell className="text-xs text-foreground-muted">
                      {u._count.assignedLeads} leads · {u._count.assignedTasks} tasks
                    </TableCell>
                    <TableCell className="text-xs text-foreground-muted">{formatDate(u.lastLoginAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleResetPassword(u)} aria-label="Reset password">
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        {u.status === "ACTIVE" ? (
                          <Button variant="ghost" size="sm" onClick={() => setDeactivating(u)} className="text-danger">
                            Deactivate
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => handleReactivate(u)} className="text-success">
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
          </>
        )}
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title="Create employee account" className="max-w-lg">
          <UserForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deactivating}
        onOpenChange={(o) => !o && setDeactivating(null)}
        title="Deactivate employee?"
        description={`${deactivating?.name} will immediately lose the ability to sign in. Their historical leads, tasks, and activity are kept.`}
        confirmLabel="Deactivate"
        loading={deactivateLoading}
        onConfirm={handleDeactivate}
      />

      <Dialog open={!!resetResult} onOpenChange={(o) => !o && setResetResult(null)}>
        <DialogContent title="Temporary password generated" className="max-w-sm">
          <p className="text-sm text-foreground-muted">
            Share this temporary password with {resetResult?.name} through a secure channel. It will not be shown again.
          </p>
          <div className="mt-3 rounded-md border border-border bg-surface-muted px-3.5 py-2.5 font-mono text-sm text-foreground">
            {resetResult?.password}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setResetResult(null)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
