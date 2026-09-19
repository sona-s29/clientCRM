import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/empty-state";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  suffix,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  suffix?: string;
}) {
  const toneClasses: Record<string, string> = {
    neutral: "bg-surface-muted text-foreground-muted",
    accent: "bg-accent-soft text-accent",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-foreground-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
            {value}
            {suffix && <span className="ml-0.5 text-base font-medium text-foreground-muted">{suffix}</span>}
          </p>
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", toneClasses[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2.5 h-7 w-14" />
    </Card>
  );
}
