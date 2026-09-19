"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CHART_SERIES } from "./chart-card";
import { toLabel } from "@/lib/constants";

export function LeadStatusDonut({ data }: { data: { status: string; count: number }[] }) {
  const chartData = data.map((d) => ({ name: toLabel(d.status), value: d.count }));
  if (chartData.every((d) => d.value === 0)) {
    return <div className="flex h-[260px] items-center justify-center text-sm text-foreground-muted">No lead data yet.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={2}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: "var(--color-foreground-muted)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
