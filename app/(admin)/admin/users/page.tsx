"use client";

import { useState } from "react";
import useSWR from "swr";
import { Users2 } from "lucide-react";
import { apiFetcher } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RoleBadge, UserStatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { TableSkeleton, EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  organization: { id: string; name: string; slug: string } | null;
}
interface UsersResponse {
  data: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), pageSize: "15" });
  if (search) params.set("search", search);

  const { data, error, isLoading, mutate } = useSWR<UsersResponse>(
    `/api/admin/users?${params.toString()}`,
    apiFetcher
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Platform users</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Every user across every organization. To manage one organization&apos;s team in detail, use
          that organization&apos;s User Management screen instead — this is a directory, not an editor.
        </p>
      </div>

      <Card className="p-3.5">
        <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or email…" />
      </Card>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState icon={Users2} title="No users found" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} size="sm" />
                        <div>
                          <p className="font-medium text-foreground">{u.name}</p>
                          <p className="text-xs text-foreground-muted">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground-muted">
                      {u.organization?.name ?? "—"}
                    </TableCell>
                    <TableCell><RoleBadge role={u.role} /></TableCell>
                    <TableCell><UserStatusBadge status={u.status} /></TableCell>
                    <TableCell className="text-xs text-foreground-muted">{formatDate(u.lastLoginAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
