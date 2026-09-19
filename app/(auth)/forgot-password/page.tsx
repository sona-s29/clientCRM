"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { forgotPasswordSchema } from "@/lib/validations";
import { apiPost } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { z } from "zod";

type ForgotInput = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(data: ForgotInput) {
    const res = await apiPost<{ ok: boolean; devResetUrl?: string }>(
      "/api/auth/forgot-password",
      data
    );
    setDevResetUrl(res.devResetUrl);
    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Check your email</h2>
        <p className="mt-1.5 text-sm text-foreground-muted">
          If that address is registered, we&apos;ve generated a password reset link.
        </p>

        {devResetUrl && (
          <div className="mt-5 rounded-md border border-border bg-surface-muted px-3.5 py-3 text-xs">
            <p className="font-medium text-foreground">
              No email provider is configured in this project (development mode).
            </p>
            <p className="mt-1 text-foreground-muted">Use this link directly instead:</p>
            <Link href={devResetUrl} className="mt-1 block break-all text-accent hover:underline">
              {devResetUrl}
            </Link>
          </div>
        )}

        <Link
          href="/login"
          className="mt-6 flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Reset your password</h2>
      <p className="mt-1.5 text-sm text-foreground-muted">
        Enter your email and we&apos;ll generate a link to reset your password.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
        <div>
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" {...register("email")} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          <Mail className="h-4 w-4" />
          Send reset link
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
      </Link>
    </div>
  );
}
