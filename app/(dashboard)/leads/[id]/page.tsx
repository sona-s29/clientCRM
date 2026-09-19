"use client";

import { use, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, Building2, Calendar, Pencil, Trash2, ListChecks, Contact2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetcher, apiPatch, apiDelete, ApiClientError } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, LeadStatusBadge, PriorityBadge, TaskStatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LeadForm, type LeadFormValues } from "@/components/leads/lead-form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatDate, formatDateTime } from "@/lib/utils";
import { LEAD_STATUS_OPTIONS, toLabel } from "@/lib/constants";
import { ErrorState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/empty-state";

interface LeadDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  priority: string;
  source: string;
  department: string;
  notes: string | null;
  followUpDate: string | null;
  createdAt: string;
  assignedTo: { id: string; name: string; avatarUrl: string | null; email: string } | null;
  createdBy: { id: string; name: string };
  contacts: { id: string; name: string; email: string | null }[];
  tasks: { id: string; title: string; status: string; priority: string; dueDate: string | null }[];
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: lead, error, isLoading, mutate } = useSWR<LeadDetail>(`/api/leads/${id}`, apiFetcher);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  async function handleUpdate(values: LeadFormValues) {
    await apiPatch(`/api/leads/${id}`, values);
    toast.success("Lead updated");
    setEditOpen(false);
    mutate();
  }

  async function handleStatusChange(status: string) {
    setStatusSaving(true);
    try {
      await apiPatch(`/api/leads/${id}`, { status });
      toast.success("Status updated");
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
      await apiDelete(`/api/leads/${id}`);
      toast.success("Lead deleted");
      router.push("/leads");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to delete lead");
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
  if (error || !lead) {
    return <ErrorState message="Lead not found or you don't have access to it." onRetry={() => mutate()} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/leads")} aria-label="Back to leads">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{lead.name}</h1>
          <p className="text-sm text-foreground-muted">{lead.company || "No company"}</p>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
        <Button variant="danger" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow icon={Mail} label="Email" value={lead.email || "—"} />
              <InfoRow icon={Phone} label="Phone" value={lead.phone || "—"} />
              <InfoRow icon={Building2} label="Company" value={lead.company || "—"} />
              <InfoRow icon={Calendar} label="Follow-up date" value={formatDate(lead.followUpDate)} />
              <div>
                <p className="text-xs font-medium text-foreground-muted">Source</p>
                <p className="mt-1 text-sm text-foreground">{toLabel(lead.source)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground-muted">Department</p>
                <p className="mt-1 text-sm text-foreground">{toLabel(lead.department)}</p>
              </div>
              {lead.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-foreground-muted">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{lead.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Related tasks</CardTitle>
              <Badge variant="neutral">{lead.tasks.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {lead.tasks.length === 0 ? (
                <p className="px-5 py-6 text-sm text-foreground-muted">No tasks linked to this lead yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {lead.tasks.map((t) => (
                    <li key={t.id}>
                      <Link href={`/tasks/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-muted">
                        <div className="flex items-center gap-2 min-w-0">
                          <ListChecks className="h-4 w-4 shrink-0 text-foreground-subtle" />
                          <span className="truncate text-sm text-foreground">{t.title}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <PriorityBadge priority={t.priority} />
                          <TaskStatusBadge status={t.status} />
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
              <CardTitle>Related contacts</CardTitle>
              <Badge variant="neutral">{lead.contacts.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {lead.contacts.length === 0 ? (
                <p className="px-5 py-6 text-sm text-foreground-muted">No contacts linked to this lead yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {lead.contacts.map((c) => (
                    <li key={c.id}>
                      <Link href={`/contacts/${c.id}`} className="flex items-center gap-2 px-5 py-3 hover:bg-surface-muted">
                        <Contact2 className="h-4 w-4 shrink-0 text-foreground-subtle" />
                        <span className="text-sm text-foreground">{c.name}</span>
                        <span className="text-xs text-foreground-muted">{c.email}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Status</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={lead.status} onValueChange={handleStatusChange} disabled={statusSaving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{toLabel(s)}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground-muted">Priority</span>
                <PriorityBadge priority={lead.priority} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Assigned to</CardTitle></CardHeader>
            <CardContent>
              {lead.assignedTo ? (
                <div className="flex items-center gap-3">
                  <Avatar name={lead.assignedTo.name} src={lead.assignedTo.avatarUrl} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{lead.assignedTo.name}</p>
                    <p className="text-xs text-foreground-muted">{lead.assignedTo.email}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground-muted">Unassigned</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Metadata</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs text-foreground-muted">
              <p>Created by {lead.createdBy.name}</p>
              <p>{formatDateTime(lead.createdAt)}</p>
              <LeadStatusBadge status={lead.status} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title="Edit lead" className="max-w-xl">
          <LeadForm
            defaultValues={{
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              company: lead.company,
              status: lead.status as LeadFormValues["status"],
              priority: lead.priority as LeadFormValues["priority"],
              source: lead.source as LeadFormValues["source"],
              department: lead.department as LeadFormValues["department"],
              assignedToId: lead.assignedTo?.id ?? null,
              followUpDate: lead.followUpDate,
              notes: lead.notes,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditOpen(false)}
            submitLabel="Save changes"
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete lead?"
        description={`This will permanently delete "${lead.name}". This cannot be undone.`}
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground-muted">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
        <Icon className="h-3.5 w-3.5 text-foreground-subtle" />
        {value}
      </p>
    </div>
  );
}
