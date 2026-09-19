"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CHART_COLORS } from "./chart-card";

export function TaskTrendChart({
  data,
}: {
  data: { month: string; created: number; completed: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--color-foreground-muted)" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--color-foreground-muted)" }} axisLine={false} tickLine={false} width={28} />
        <Tooltip
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "var(--color-foreground-muted)" }} iconType="circle" iconSize={8} />
        <Line type="monotone" dataKey="created" name="Created" stroke={CHART_COLORS.neutral} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="completed" name="Completed" stroke={CHART_COLORS.success} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
