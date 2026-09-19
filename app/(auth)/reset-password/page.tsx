"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { resetPasswordSchema } from "@/lib/validations";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { z } from "zod";

type ResetInput = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  async function onSubmit(data: ResetInput) {
    setServerError(null);
    try {
      await apiPost("/api/auth/reset-password", data);
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    }
  }

  if (!token) {
    return (
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Invalid link</h2>
        <p className="mt-1.5 text-sm text-foreground-muted">
          This password reset link is missing its token. Request a new one below.
        </p>
        <Link href="/forgot-password" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Password updated</h2>
        <p className="mt-1.5 text-sm text-foreground-muted">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Set a new password</h2>
      <p className="mt-1.5 text-sm text-foreground-muted">Choose a strong password for your account.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
        {serverError && (
          <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {serverError}
          </div>
        )}
        <input type="hidden" {...register("token")} />

        <div>
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
          <FieldError>{errors.confirmPassword?.message}</FieldError>
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          <KeyRound className="h-4 w-4" />
          Update password
        </Button>
      </form>
    </div>
  );
}
