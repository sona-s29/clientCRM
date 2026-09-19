"use client";

import { use, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, Building2, MapPin, Pencil, Trash2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { apiFetcher, apiPatch, apiDelete, ApiClientError } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, TaskStatusBadge, PriorityBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ContactForm } from "@/components/contacts/contact-form";
import type { CreateContactInput } from "@/lib/validations";
import { ErrorState, Skeleton } from "@/components/ui/empty-state";

interface ContactDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  notes: string | null;
  assignedTo: { id: string; name: string; avatarUrl: string | null; email: string } | null;
  lead: { id: string; name: string } | null;
  tasks: { id: string; title: string; status: string; priority: string }[];
}

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: contact, error, isLoading, mutate } = useSWR<ContactDetail>(`/api/contacts/${id}`, apiFetcher);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleUpdate(values: CreateContactInput) {
    await apiPatch(`/api/contacts/${id}`, values);
    toast.success("Contact updated");
    setEditOpen(false);
    mutate();
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await apiDelete(`/api/contacts/${id}`);
      toast.success("Contact deleted");
      router.push("/contacts");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to delete contact");
      setDeleteLoading(false);
    }
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /></div>;
  }
  if (error || !contact) {
    return <ErrorState message="Contact not found or you don't have access to it." onRetry={() => mutate()} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/contacts")} aria-label="Back to contacts">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{contact.name}</h1>
          <p className="text-sm text-foreground-muted">{contact.company || "No company"}</p>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>
        <Button variant="danger" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" /> Delete</Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow icon={Mail} label="Email" value={contact.email || "—"} />
              <InfoRow icon={Phone} label="Phone" value={contact.phone || "—"} />
              <InfoRow icon={Building2} label="Company" value={contact.company || "—"} />
              <InfoRow icon={MapPin} label="Address" value={contact.address || "—"} />
              {contact.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-foreground-muted">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{contact.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Related tasks</CardTitle>
              <Badge variant="neutral">{contact.tasks.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {contact.tasks.length === 0 ? (
                <p className="px-5 py-6 text-sm text-foreground-muted">No tasks linked to this contact yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {contact.tasks.map((t) => (
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
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Assigned to</CardTitle></CardHeader>
            <CardContent>
              {contact.assignedTo ? (
                <div className="flex items-center gap-3">
                  <Avatar name={contact.assignedTo.name} src={contact.assignedTo.avatarUrl} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{contact.assignedTo.name}</p>
                    <p className="text-xs text-foreground-muted">{contact.assignedTo.email}</p>
                  </div>
                </div>
              ) : <p className="text-sm text-foreground-muted">Unassigned</p>}
            </CardContent>
          </Card>

          {contact.lead && (
            <Card>
              <CardHeader><CardTitle>Linked lead</CardTitle></CardHeader>
              <CardContent>
                <Link href={`/leads/${contact.lead.id}`} className="text-sm font-medium text-accent hover:underline">
                  {contact.lead.name}
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title="Edit contact" className="max-w-xl">
          <ContactForm
            defaultValues={{
              name: contact.name,
              email: contact.email,
              phone: contact.phone,
              company: contact.company,
              address: contact.address,
              notes: contact.notes,
              assignedToId: contact.assignedTo?.id ?? null,
              leadId: contact.lead?.id ?? null,
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
        title="Delete contact?"
        description={`This will permanently delete "${contact.name}". This cannot be undone.`}
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
