import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-surface-muted text-foreground-muted border border-border",
        accent: "bg-accent-soft text-accent",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        info: "bg-info-soft text-info",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// --- Domain-specific badge mappings ------------------------------------------

const LEAD_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  NEW: "info",
  CONTACTED: "accent",
  QUALIFIED: "warning",
  PROPOSAL: "warning",
  NEGOTIATION: "warning",
  CONVERTED: "success",
  LOST: "danger",
};

const TASK_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  PENDING: "neutral",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
};

const PRIORITY_VARIANT: Record<string, BadgeProps["variant"]> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "danger",
};

const USER_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  SUSPENDED: "danger",
};

const ORG_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  ACTIVE: "success",
  TRIAL: "info",
  SUSPENDED: "danger",
};

const SUBSCRIPTION_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  TRIAL: "info",
  ACTIVE: "success",
  PAST_DUE: "warning",
  CANCELLED: "neutral",
  SUSPENDED: "danger",
};

function label(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function LeadStatusBadge({ status }: { status: string }) {
  return <Badge variant={LEAD_STATUS_VARIANT[status] ?? "neutral"}>{label(status)}</Badge>;
}
export function TaskStatusBadge({ status }: { status: string }) {
  return <Badge variant={TASK_STATUS_VARIANT[status] ?? "neutral"}>{label(status)}</Badge>;
}
export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge variant={PRIORITY_VARIANT[priority] ?? "neutral"}>{label(priority)}</Badge>;
}
export function UserStatusBadge({ status }: { status: string }) {
  return <Badge variant={USER_STATUS_VARIANT[status] ?? "neutral"}>{label(status)}</Badge>;
}
export function RoleBadge({ role }: { role: string }) {
  return <Badge variant="accent">{label(role)}</Badge>;
}
export function OrgStatusBadge({ status }: { status: string }) {
  return <Badge variant={ORG_STATUS_VARIANT[status] ?? "neutral"}>{label(status)}</Badge>;
}
export function SubscriptionStatusBadge({ status }: { status: string }) {
  return <Badge variant={SUBSCRIPTION_STATUS_VARIANT[status] ?? "neutral"}>{label(status)}</Badge>;
}
