/**
 * lib/api-client.ts
 * ----------------------------------------------------------------------------
 * Thin fetch wrapper used by every client component. Centralizes:
 *   - JSON request/response handling
 *   - Throwing a readable Error when the API returns { error }
 *   - Attaching credentials (cookies) so the session is sent automatically
 *
 * Used together with SWR (`useSWR`) for GET requests (caching + polling +
 * revalidate-on-focus) and directly for mutations (POST/PATCH/DELETE).
 */

export class ApiClientError extends Error {
  status: number;
  issues?: Record<string, string[] | undefined>;
  constructor(message: string, status: number, issues?: Record<string, string[] | undefined>) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

async function handle(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (!res.ok) throw new ApiClientError("Request failed", res.status);
    return res; // e.g. CSV download — caller handles the raw Response
  }
  const body = await res.json();
  if (!res.ok) {
    throw new ApiClientError(body?.error ?? "Request failed", res.status, body?.issues);
  }
  return body;
}

export const apiFetcher = (url: string) => fetch(url, { credentials: "include" }).then(handle);

export async function apiGet<T = unknown>(url: string): Promise<T> {
  return handle(await fetch(url, { credentials: "include" })) as Promise<T>;
}

export async function apiPost<T = unknown>(url: string, body?: unknown): Promise<T> {
  return handle(
    await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  ) as Promise<T>;
}

export async function apiPatch<T = unknown>(url: string, body?: unknown): Promise<T> {
  return handle(
    await fetch(url, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  ) as Promise<T>;
}

export async function apiDelete<T = unknown>(url: string): Promise<T> {
  return handle(await fetch(url, { method: "DELETE", credentials: "include" })) as Promise<T>;
}
