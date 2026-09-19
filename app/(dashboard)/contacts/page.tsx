"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2, Pencil, Contact2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetcher, apiPost, apiPatch, apiDelete, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, SortableTableHead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ContactForm } from "@/components/contacts/contact-form";
import type { CreateContactInput } from "@/lib/validations";

interface ContactRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  createdAt: string;
  assignedTo: { id: string; name: string; avatarUrl: string | null } | null;
  lead: { id: string; name: string } | null;
}
interface ContactsResponse {
  data: ContactRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function ContactsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [deleting, setDeleting] = useState<ContactRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const params = new URLSearchParams({ page: String(page), pageSize: "10", sortBy, sortDir });
  if (search) params.set("search", search);

  const { data, error, isLoading, mutate } = useSWR<ContactsResponse>(
    `/api/contacts?${params.toString()}`,
    apiFetcher
  );

  function handleSort(field: string) {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortDir("desc"); }
  }

  async function handleCreate(values: CreateContactInput) {
    await apiPost("/api/contacts", values);
    toast.success("Contact created");
    setCreateOpen(false);
    mutate();
  }

  async function handleUpdate(values: CreateContactInput) {
    if (!editing) return;
    await apiPatch(`/api/contacts/${editing.id}`, values);
    toast.success("Contact updated");
    setEditing(null);
    mutate();
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/api/contacts/${deleting.id}`);
      toast.success("Contact deleted");
      setDeleting(null);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to delete contact");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Contacts</h1>
          <p className="mt-1 text-sm text-foreground-muted">Everyone you&apos;re in touch with.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New contact</Button>
      </div>

      <Card className="p-3.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, or company…"
            className="pl-9"
          />
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            icon={Contact2}
            title="No contacts found"
            description="Add your first contact to get started."
            actionLabel="New contact"
            onAction={() => setCreateOpen(true)}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead field="name" label="Name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortableTableHead field="company" label="Company" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <TableHead>Phone</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Linked lead</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((c) => (
                  <TableRow key={c.id} clickable onClick={() => router.push(`/contacts/${c.id}`)}>
                    <TableCell>
                      <p className="font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-foreground-muted">{c.email || "—"}</p>
                    </TableCell>
                    <TableCell>{c.company || "—"}</TableCell>
                    <TableCell>{c.phone || "—"}</TableCell>
                    <TableCell>
                      {c.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={c.assignedTo.name} src={c.assignedTo.avatarUrl} size="sm" />
                          <span className="text-sm">{c.assignedTo.name}</span>
                        </div>
                      ) : <Badge variant="neutral">Unassigned</Badge>}
                    </TableCell>
                    <TableCell>{c.lead ? c.lead.name : "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => setEditing(c)} aria-label="Edit contact">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleting(c)} aria-label="Delete contact">
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
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
        <DialogContent title="Create contact" className="max-w-xl">
          <ContactForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} submitLabel="Create contact" />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent title="Edit contact" className="max-w-xl">
          {editing && (
            <ContactForm
              defaultValues={{
                name: editing.name,
                email: editing.email,
                phone: editing.phone,
                company: editing.company,
                assignedToId: editing.assignedTo?.id ?? null,
                leadId: editing.lead?.id ?? null,
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
        title="Delete contact?"
        description={`This will permanently delete "${deleting?.name}". This cannot be undone.`}
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
