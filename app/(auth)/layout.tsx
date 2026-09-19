import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="flex flex-col justify-between bg-ink px-10 py-10 text-ink-foreground md:px-14 md:py-14">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Building2 className="h-4.5 w-4.5" />
          </div>
          <span className="text-sm font-semibold tracking-tight">clientCRM</span>
        </div>

        <div className="hidden md:block">
          <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            One workspace for Sales, IT, and Marketing.
          </h1>
          <p className="mt-4 max-w-sm text-sm text-ink-muted">
            Track leads, manage tasks, and see real performance data — with
            role-based access built in from day one.
          </p>
        </div>

        <p className="text-xs text-ink-muted">© {new Date().getFullYear()} clientCRM. Internal demo build.</p>
      </div>

      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
