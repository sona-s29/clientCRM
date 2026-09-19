import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="block">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

/** Shared Recharts color palette pulled from the app's CSS variables. */
export const CHART_COLORS = {
  accent: "#b1592f",
  info: "#2f6690",
  success: "#2f7d5c",
  warning: "#b07a1f",
  danger: "#c1442c",
  neutral: "#96948a",
};

export const CHART_SERIES = [
  CHART_COLORS.accent,
  CHART_COLORS.info,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.neutral,
];
