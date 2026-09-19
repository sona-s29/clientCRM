"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

// useSearchParams() (used to read ?callbackUrl=) must be wrapped in Suspense
// per Next.js App Router requirements — otherwise the build opts the whole
// route into client-only rendering with a warning.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    setServerError(null);
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setServerError("Invalid email or password. Please try again.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h2>
      <p className="mt-1.5 text-sm text-foreground-muted">Sign in to your clientCRM workspace.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
        {serverError && (
          <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {serverError}
          </div>
        )}

        <div>
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...register("email")}
          />
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-accent hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground-muted">
          <input type="checkbox" className="h-3.5 w-3.5 rounded border-border" {...register("remember")} />
          Remember me on this device
        </label>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          <LogIn className="h-4 w-4" />
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          Create one
        </Link>
      </p>

      {/* <div className="mt-8 rounded-md border border-border bg-surface-muted px-3.5 py-3 text-xs text-foreground-muted">
        <p className="font-medium text-foreground">Demo credentials</p>
        <p className="mt-1">superadmin@clientcrm.com / Super123! <span className="text-foreground-subtle">(platform console)</span></p>
        <p>admin@northwind.clientcrm.com / Admin123! <span className="text-foreground-subtle">(Org Admin, org A)</span></p>
        <p>admin@globex.clientcrm.com / Admin123! <span className="text-foreground-subtle">(Org Admin, org B)</span></p>
        <p className="mt-1 text-foreground-subtle">Full list in clientCRM_SETUP_GUIDE.md</p>
      </div> */}
    </div>
  );
}
