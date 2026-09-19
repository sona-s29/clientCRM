"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR from "swr";
import { useState } from "react";
import { createLeadSchema, type CreateLeadInput } from "@/lib/validations";
import { apiFetcher, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Textarea } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  LEAD_STATUS_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  PRIORITY_OPTIONS,
  DEPARTMENT_OPTIONS,
  toLabel,
} from "@/lib/constants";

interface AssignableUser {
  id: string;
  name: string;
  role: string;
}

export type LeadFormValues = CreateLeadInput;

export function LeadForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Create lead",
}: {
  defaultValues?: Partial<LeadFormValues>;
  onSubmit: (data: LeadFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { data: usersData } = useSWR<{ data: AssignableUser[] }>(
    "/api/users?forAssignment=true",
    apiFetcher
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      status: "NEW",
      priority: "MEDIUM",
      source: "OTHER",
      department: "SALES",
      ...defaultValues,
    },
  });

  async function submit(data: LeadFormValues) {
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
          <Input id="name" placeholder="Jane Cooper" {...register("name")} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="jane@company.com" {...register("email")} />
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

        <div>
          <Label>Status</Label>
          <Select defaultValue={defaultValues?.status ?? "NEW"} onValueChange={(v) => setValue("status", v as LeadFormValues["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEAD_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{toLabel(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Priority</Label>
          <Select defaultValue={defaultValues?.priority ?? "MEDIUM"} onValueChange={(v) => setValue("priority", v as LeadFormValues["priority"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{toLabel(p)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Source</Label>
          <Select defaultValue={defaultValues?.source ?? "OTHER"} onValueChange={(v) => setValue("source", v as LeadFormValues["source"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEAD_SOURCE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{toLabel(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Department</Label>
          <Select defaultValue={defaultValues?.department ?? "SALES"} onValueChange={(v) => setValue("department", v as LeadFormValues["department"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DEPARTMENT_OPTIONS.filter((d) => d !== "ADMIN").map((d) => <SelectItem key={d} value={d}>{toLabel(d)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <Label>Assign to</Label>
          <Select
            defaultValue={defaultValues?.assignedToId ?? undefined}
            onValueChange={(v) => setValue("assignedToId", v === "unassigned" ? null : v)}
          >
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {usersData?.data.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name} · {toLabel(u.role)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <Label htmlFor="followUpDate">Follow-up date</Label>
          <Input
            id="followUpDate"
            type="date"
            onChange={(e) =>
              setValue("followUpDate", e.target.value ? new Date(e.target.value).toISOString() : null)
            }
            defaultValue={defaultValues?.followUpDate ? defaultValues.followUpDate.slice(0, 10) : undefined}
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={3} placeholder="Additional context…" {...register("notes")} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
