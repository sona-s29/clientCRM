"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR from "swr";
import { useState } from "react";
import { createContactSchema, type CreateContactInput } from "@/lib/validations";
import { apiFetcher, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Textarea } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toLabel } from "@/lib/constants";

interface AssignableUser { id: string; name: string; role: string }
interface LeadOption { id: string; name: string }

export function ContactForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Create contact",
}: {
  defaultValues?: Partial<CreateContactInput>;
  onSubmit: (data: CreateContactInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { data: usersData } = useSWR<{ data: AssignableUser[] }>("/api/users?forAssignment=true", apiFetcher);
  const { data: leadsData } = useSWR<{ data: LeadOption[] }>("/api/leads?pageSize=50", apiFetcher);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateContactInput>({
    resolver: zodResolver(createContactSchema),
    defaultValues,
  });

  async function submit(data: CreateContactInput) {
    setServerError(null);
    try {
      await onSubmit(data);
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      {serverError && (
        <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {serverError}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label htmlFor="name">Full name *</Label>
          <Input id="name" placeholder="Alex Morgan" {...register("name")} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="alex@company.com" {...register("email")} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" placeholder="+1 555 010 1234" {...register("phone")} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="company">Company</Label>
          <Input id="company" placeholder="Acme Inc." {...register("company")} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" placeholder="123 Main St, Springfield" {...register("address")} />
        </div>

        <div className="col-span-2">
          <Label>Linked lead</Label>
          <Select defaultValue={defaultValues?.leadId ?? undefined} onValueChange={(v) => setValue("leadId", v === "none" ? null : v)}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {leadsData?.data.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <Label>Assign to</Label>
          <Select defaultValue={defaultValues?.assignedToId ?? undefined} onValueChange={(v) => setValue("assignedToId", v === "unassigned" ? null : v)}>
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {usersData?.data.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} · {toLabel(u.role)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={3} placeholder="Additional context…" {...register("notes")} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}
