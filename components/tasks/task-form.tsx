"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR from "swr";
import { useState } from "react";
import { createTaskSchema, type CreateTaskInput } from "@/lib/validations";
import { apiFetcher, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Textarea } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { TASK_STATUS_OPTIONS, PRIORITY_OPTIONS, DEPARTMENT_OPTIONS, toLabel } from "@/lib/constants";

interface AssignableUser { id: string; name: string; role: string }
interface LeadOption { id: string; name: string }

export function TaskForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Create task",
  canAssign = true,
}: {
  defaultValues?: Partial<CreateTaskInput>;
  onSubmit: (data: CreateTaskInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  canAssign?: boolean;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { data: usersData } = useSWR<{ data: AssignableUser[] }>("/api/users?forAssignment=true", apiFetcher);
  const { data: leadsData } = useSWR<{ data: LeadOption[] }>("/api/leads?pageSize=50", apiFetcher);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof createTaskSchema>, unknown, CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { status: "PENDING", priority: "MEDIUM", department: "SALES", ...defaultValues },
  });

  async function submit(data: CreateTaskInput) {
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
          <Label htmlFor="title">Title *</Label>
          <Input id="title" placeholder="Follow up with prospect" {...register("title")} />
          <FieldError>{errors.title?.message}</FieldError>
        </div>
        <div className="col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={3} placeholder="What needs to happen…" {...register("description")} />
        </div>

        <div>
          <Label>Status</Label>
          <Select defaultValue={defaultValues?.status ?? "PENDING"} onValueChange={(v) => setValue("status", v as CreateTaskInput["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TASK_STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{toLabel(s)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Priority</Label>
          <Select defaultValue={defaultValues?.priority ?? "MEDIUM"} onValueChange={(v) => setValue("priority", v as CreateTaskInput["priority"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{toLabel(p)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Department</Label>
          <Select defaultValue={defaultValues?.department ?? "SALES"} onValueChange={(v) => setValue("department", v as CreateTaskInput["department"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DEPARTMENT_OPTIONS.filter((d) => d !== "ADMIN").map((d) => <SelectItem key={d} value={d}>{toLabel(d)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="dueDate">Due date</Label>
          <Input
            id="dueDate"
            type="date"
            onChange={(e) => setValue("dueDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
            defaultValue={defaultValues?.dueDate ? defaultValues.dueDate.slice(0, 10) : undefined}
          />
        </div>

        <div className="col-span-2">
          <Label>Assign to</Label>
          <Select
            defaultValue={defaultValues?.assignedToId ?? undefined}
            onValueChange={(v) => setValue("assignedToId", v === "unassigned" ? null : v)}
            disabled={!canAssign}
          >
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {usersData?.data.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} · {toLabel(u.role)}</SelectItem>)}
            </SelectContent>
          </Select>
          {!canAssign && (
            <p className="mt-1 text-xs text-foreground-muted">Only Admins can reassign tasks to another employee.</p>
          )}
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
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}
