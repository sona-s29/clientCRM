"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Download, BarChart3 } from "lucide-react";
import { apiFetcher } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/ui/empty-state";
import { toLabel } from "@/lib/constants";

interface ReportResponse {
  type: string;
  rows: Record<string, unknown>[];
}

const REPORT_TYPES = [
  { value: "leads", label: "Lead report", adminOnly: false },
  { value: "tasks", label: "Task report", adminOnly: false },
  { value: "overdue-tasks", label: "Overdue task report", adminOnly: false },
  { value: "conversion", label: "Conversion report", adminOnly: false },
  { value: "employee-performance", label: "Employee performance", adminOnly: true },
  { value: "department-performance", label: "Department performance", adminOnly: true },
];

export default function ReportsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [type, setType] = useState("leads");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = new URLSearchParams({ type });
  if (from) params.set("from", new Date(from).toISOString());
  if (to) params.set("to", new Date(to).toISOString());

  const { data, error, isLoading } = useSWR<ReportResponse>(`/api/reports?${params.toString()}`, apiFetcher);

  const columns = data?.rows[0] ? Object.keys(data.rows[0]) : [];
  const visibleTypes = REPORT_TYPES.filter((t) => isAdmin || !t.adminOnly);

  function downloadCsv() {
    const csvParams = new URLSearchParams(params);
    csvParams.set("format", "csv");
    window.open(`/api/reports?${csvParams.toString()}`, "_blank");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Every number below is queried live from PostgreSQL, scoped to what your role can see.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
          <div className="w-full sm:w-56">
            <Label>Report type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {visibleTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-40">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="w-full sm:w-40">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button variant="outline" onClick={downloadCsv} disabled={!data || data.rows.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <CardHeader className="block px-5 py-4">
          <CardTitle>{REPORT_TYPES.find((t) => t.value === type)?.label}</CardTitle>
          <CardDescription>{data ? `${data.rows.length} record${data.rows.length === 1 ? "" : "s"}` : "Loading…"}</CardDescription>
        </CardHeader>
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : error ? (
          <ErrorState />
        ) : !data || data.rows.length === 0 ? (
          <EmptyState icon={BarChart3} title="No data for this report" description="Try a different date range or report type." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => <TableHead key={c}>{toLabel(c)}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell key={c}>{formatCell(row[c])}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return String(value);
}
