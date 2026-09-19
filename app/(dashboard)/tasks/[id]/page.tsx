"use client";

import { use, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Calendar, Pencil, Trash2, Users2, Contact2, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { apiFetcher, apiPatch, apiDelete, ApiClientError } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TaskForm } from "@/components/tasks/task-form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatDate, formatDateTime, isOverdue } from "@/lib/utils";
import { TASK_STATUS_OPTIONS, toLabel } from "@/lib/constants";
import { ErrorState, Skeleton } from "@/components/ui/empty-state";
import type { CreateTaskInput } from "@/lib/validations";

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  department: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  assignedTo: { id: string; name: string; avatarUrl: string | null } | null;
  createdBy: { id: string; name: string };
  lead: { id: string; name: string } | null;
  contact: { id: string; name: string } | null;
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const { data: task, error, isLoading, mutate } = useSWR<TaskDetail>(`/api/tasks/${id}`, apiFetcher);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  async function handleUpdate(values: CreateTaskInput) {
    await apiPatch(`/api/tasks/${id}`, values);
    toast.success("Task updated");
    setEditOpen(false);
    mutate();
  }

  async function handleStatusChange(status: string) {
    setStatusSaving(true);
    try {
      await apiPatch(`/api/tasks/${id}`, { status });
      toast.success(status === "COMPLETED" ? "Task marked complete" : "Status updated");
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await apiDelete(`/api/tasks/${id}`);
      toast.success("Task deleted");
      router.push("/tasks");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to delete task");
      setDeleteLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (error || !task) {
    return <ErrorState message="Task not found or you don't have access to it." onRetry={() => mutate()} />;
  }

  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/tasks")} aria-label="Back to tasks">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{task.title}</h1>
          <p className="text-sm text-foreground-muted">
            {toLabel(task.department)} {overdue && <span className="text-danger font-medium">· Overdue</span>}
          </p>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
        {isAdmin && (
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {task.description || "No description provided."}
              </p>
            </CardContent>
          </Card>

          {(task.lead || task.contact) && (
            <Card>
              <CardHeader><CardTitle>Linked records</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {task.lead && (
                  <Link href={`/leads/${task.lead.id}`} className="flex items-center gap-2 rounded-md border border-border px-3.5 py-2.5 text-sm hover:bg-surface-muted">
                    <Users2 className="h-4 w-4 text-foreground-subtle" /> {task.lead.name}
                  </Link>
                )}
                {task.contact && (
                  <Link href={`/contacts/${task.contact.id}`} className="flex items-center gap-2 rounded-md border border-border px-3.5 py-2.5 text-sm hover:bg-surface-muted">
                    <Contact2 className="h-4 w-4 text-foreground-subtle" /> {task.contact.name}
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={task.status} onValueChange={handleStatusChange} disabled={statusSaving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{toLabel(s)}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground-muted">Priority</span>
                <PriorityBadge priority={task.priority} />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <Calendar className="h-3.5 w-3.5" /> Due {formatDate(task.dueDate)}
              </div>
              {task.completedAt && (
                <p className="text-xs text-success">Completed {formatDateTime(task.completedAt)}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Assigned to</CardTitle></CardHeader>
            <CardContent>
              {task.assignedTo ? (
                <div className="flex items-center gap-3">
                  <Avatar name={task.assignedTo.name} src={task.assignedTo.avatarUrl} />
                  <p className="text-sm font-medium text-foreground">{task.assignedTo.name}</p>
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-sm text-foreground-muted">
                  <UserCircle className="h-4 w-4" /> Unassigned
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Metadata</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs text-foreground-muted">
              <p>Created by {task.createdBy.name}</p>
              <p>{formatDateTime(task.createdAt)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title="Edit task" className="max-w-xl">
          <TaskForm
            defaultValues={{
              title: task.title,
              description: task.description,
              status: task.status as CreateTaskInput["status"],
              priority: task.priority as CreateTaskInput["priority"],
              department: task.department as CreateTaskInput["department"],
              assignedToId: task.assignedTo?.id ?? null,
              dueDate: task.dueDate,
              leadId: task.lead?.id ?? null,
              contactId: task.contact?.id ?? null,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditOpen(false)}
            submitLabel="Save changes"
            canAssign={isAdmin}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete task?"
        description={`This will permanently delete "${task.title}". This cannot be undone.`}
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
