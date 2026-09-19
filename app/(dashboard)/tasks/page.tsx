"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Search, Trash2, Pencil, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { apiFetcher, apiPost, apiPatch, apiDelete, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, SortableTableHead } from "@/components/ui/table";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TaskForm } from "@/components/tasks/task-form";
import { TASK_STATUS_OPTIONS, PRIORITY_OPTIONS, toLabel } from "@/lib/constants";
import { formatDate, isOverdue } from "@/lib/utils";
import type { CreateTaskInput } from "@/lib/validations";

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignedTo: { id: string; name: string; avatarUrl: string | null } | null;
}
interface TasksResponse {
  data: TaskRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function TasksPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [deleting, setDeleting] = useState<TaskRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const params = new URLSearchParams({ page: String(page), pageSize: "10", sortBy, sortDir });
  if (search) params.set("search", search);
  if (status !== "all") params.set("status", status);
  if (priority !== "all") params.set("priority", priority);
  if (overdueOnly) params.set("overdue", "true");

  const { data, error, isLoading, mutate } = useSWR<TasksResponse>(`/api/tasks?${params.toString()}`, apiFetcher);

  function handleSort(field: string) {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortDir("desc"); }
  }

  async function handleCreate(values: CreateTaskInput) {
    await apiPost("/api/tasks", values);
    toast.success("Task created");
    setCreateOpen(false);
    mutate();
  }

  async function handleUpdate(values: CreateTaskInput) {
    if (!editing) return;
    await apiPatch(`/api/tasks/${editing.id}`, values);
    toast.success("Task updated");
    setEditing(null);
    mutate();
  }

  async function handleQuickStatus(task: TaskRow, newStatus: string) {
    try {
      await apiPatch(`/api/tasks/${task.id}`, { status: newStatus });
      toast.success("Task status updated");
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update task");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/api/tasks/${deleting.id}`);
      toast.success("Task deleted");
      setDeleting(null);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to delete task");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Tasks</h1>
          <p className="mt-1 text-sm text-foreground-muted">Stay on top of what needs to get done.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New task</Button>
      </div>

      <Card className="p-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search tasks…" className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {TASK_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{toLabel(s)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v) => { setPriority(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{toLabel(p)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant={overdueOnly ? "default" : "outline"}
              size="sm"
              onClick={() => { setOverdueOnly((v) => !v); setPage(1); }}
            >
              Overdue only
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={ListChecks} title="No tasks found" description="Create a task to get started." actionLabel="New task" onAction={() => setCreateOpen(true)} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead field="title" label="Title" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortableTableHead field="status" label="Status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortableTableHead field="priority" label="Priority" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <TableHead>Assigned to</TableHead>
                  <SortableTableHead field="dueDate" label="Due date" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((task) => {
                  const overdue = isOverdue(task.dueDate, task.status);
                  return (
                    <TableRow key={task.id} clickable onClick={() => router.push(`/tasks/${task.id}`)}>
                      <TableCell>
                        <p className="font-medium text-foreground">{task.title}</p>
                        {overdue && <Badge variant="danger" className="mt-1">Overdue</Badge>}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select value={task.status} onValueChange={(v) => handleQuickStatus(task, v)}>
                          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TASK_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{toLabel(s)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><PriorityBadge priority={task.priority} /></TableCell>
                      <TableCell>
                        {task.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={task.assignedTo.name} src={task.assignedTo.avatarUrl} size="sm" />
                            <span className="text-sm">{task.assignedTo.name}</span>
                          </div>
                        ) : <Badge variant="neutral">Unassigned</Badge>}
                      </TableCell>
                      <TableCell>{formatDate(task.dueDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => setEditing(task)} aria-label="Edit task">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" onClick={() => setDeleting(task)} aria-label="Delete task">
                              <Trash2 className="h-4 w-4 text-danger" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
          </>
        )}
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title="Create task" className="max-w-xl">
          <TaskForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create task" canAssign />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title="Edit task" className="max-w-xl">
          {editing && (
            <TaskForm
              defaultValues={{
                title: editing.title,
                status: editing.status as CreateTaskInput["status"],
                priority: editing.priority as CreateTaskInput["priority"],
                assignedToId: editing.assignedTo?.id ?? null,
                dueDate: editing.dueDate,
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
              submitLabel="Save changes"
              canAssign={isAdmin}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete task?"
        description={`This will permanently delete "${deleting?.title}". This cannot be undone.`}
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
