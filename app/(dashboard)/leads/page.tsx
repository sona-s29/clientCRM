"use client";

import { Suspense, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { apiFetcher, apiPost, apiPatch, apiDelete, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  SortableTableHead,
} from "@/components/ui/table";
import { Badge, LeadStatusBadge, PriorityBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LeadForm, type LeadFormValues } from "@/components/leads/lead-form";
import { LEAD_STATUS_OPTIONS, PRIORITY_OPTIONS, toLabel } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Users2 } from "lucide-react";

interface LeadRow {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  status: string;
  priority: string;
  source: string;
  followUpDate: string | null;
  createdAt: string;
  assignedTo: { id: string; name: string; avatarUrl: string | null } | null;
}
interface LeadsResponse {
  data: LeadRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsPageInner />
    </Suspense>
  );
}

function LeadsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<LeadRow | null>(null);
  const [deleting, setDeleting] = useState<LeadRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const params = new URLSearchParams({
    page: String(page),
    pageSize: "10",
    sortBy,
    sortDir,
  });
  if (search) params.set("search", search);
  if (status !== "all") params.set("status", status);
  if (priority !== "all") params.set("priority", priority);

  const key = `/api/leads?${params.toString()}`;
  const { data, error, isLoading, mutate } = useSWR<LeadsResponse>(key, apiFetcher);

  function handleSort(field: string) {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortDir("desc");
    }
  }

  async function handleCreate(values: LeadFormValues) {
    await apiPost("/api/leads", values);
    toast.success("Lead created");
    setCreateOpen(false);
    mutate();
    globalMutate((k) => typeof k === "string" && k.startsWith("/api/dashboard"));
  }

  async function handleUpdate(values: LeadFormValues) {
    if (!editing) return;
    await apiPatch(`/api/leads/${editing.id}`, values);
    toast.success("Lead updated");
    setEditing(null);
    mutate();
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/api/leads/${deleting.id}`);
      toast.success("Lead deleted");
      setDeleting(null);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to delete lead");
    } finally {
      setDeleteLoading(false);
    }
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    router.replace(search ? `/leads?search=${encodeURIComponent(search)}` : "/leads");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Leads</h1>
          <p className="mt-1 text-sm text-foreground-muted">Track and manage your pipeline.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New lead
        </Button>
      </div>

      <Card className="p-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form onSubmit={submitSearch} className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or company…"
              className="pl-9"
            />
          </form>
          <div className="flex gap-2">
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {LEAD_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{toLabel(s)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v) => { setPriority(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{toLabel(p)}</SelectItem>)}
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
          <EmptyState
            icon={Users2}
            title="No leads found"
            description="Try adjusting your filters, or create a new lead to get started."
            actionLabel="New lead"
            onAction={() => setCreateOpen(true)}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead field="name" label="Name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <TableHead>Company</TableHead>
                  <SortableTableHead field="status" label="Status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortableTableHead field="priority" label="Priority" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <TableHead>Assigned to</TableHead>
                  <SortableTableHead field="followUpDate" label="Follow-up" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((lead) => (
                  <TableRow key={lead.id} clickable onClick={() => router.push(`/leads/${lead.id}`)}>
                    <TableCell>
                      <p className="font-medium text-foreground">{lead.name}</p>
                      <p className="text-xs text-foreground-muted">{lead.email || "—"}</p>
                    </TableCell>
                    <TableCell>{lead.company || "—"}</TableCell>
                    <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                    <TableCell><PriorityBadge priority={lead.priority} /></TableCell>
                    <TableCell>
                      {lead.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={lead.assignedTo.name} src={lead.assignedTo.avatarUrl} size="sm" />
                          <span className="text-sm">{lead.assignedTo.name}</span>
                        </div>
                      ) : (
                        <Badge variant="neutral">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(lead.followUpDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => setEditing(lead)} aria-label="Edit lead">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleting(lead)} aria-label="Delete lead">
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={data.pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title="Create lead" description="Add a new lead to your pipeline." className="max-w-xl">
          <LeadForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create lead" />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title="Edit lead" description="Update this lead's details." className="max-w-xl">
          {editing && (
            <LeadForm
              defaultValues={{
                name: editing.name,
                email: editing.email,
                company: editing.company,
                status: editing.status as LeadFormValues["status"],
                priority: editing.priority as LeadFormValues["priority"],
                source: editing.source as LeadFormValues["source"],
                assignedToId: editing.assignedTo?.id ?? null,
                followUpDate: editing.followUpDate,
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
              submitLabel="Save changes"
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete lead?"
        description={`This will permanently delete "${deleting?.name}". This cannot be undone.`}
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
