"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { signupSchema, type SignupInput } from "@/lib/validations";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

function passwordScore(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}
const STRENGTH_LABEL = ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
const STRENGTH_COLOR = ["bg-danger", "bg-danger", "bg-warning", "bg-warning", "bg-success", "bg-success"];

/**
 * This form creates a brand-new ORGANIZATION, not a member account inside an
 * existing one — see the doc comment on `signupSchema` (lib/validations.ts)
 * and `POST /api/auth/register`. That's why there's a workspace-name field
 * and no role picker: the person signing up always becomes their new
 * organization's Org Admin. Teammates are invited afterward from
 * /settings/users, where the Org Admin assigns THEM an IT/Sales/Digital
 * Marketing role.
 */
export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  const password = watch("password") ?? "";
  const strength = useMemo(() => passwordScore(password), [password]);

  async function onSubmit(data: SignupInput) {
    setServerError(null);
    try {
      await apiPost("/api/auth/register", data);
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        router.push("/login");
        return;
      }
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Create your workspace</h2>
      <p className="mt-1.5 text-sm text-foreground-muted">
        Set up a new clientCRM organization — free to start, no card required.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
        {serverError && (
          <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
            {serverError}
          </div>
        )}

        <div>
          <Label htmlFor="organizationName">Workspace name</Label>
          <Input id="organizationName" autoComplete="organization" placeholder="Acme Inc." {...register("organizationName")} />
          <FieldError>{errors.organizationName?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="name">Your full name</Label>
          <Input id="name" autoComplete="name" placeholder="Jordan Rivera" {...register("name")} />
          <FieldError>{errors.name?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" {...register("email")} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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
          {password && (
            <div className="mt-1.5">
              <div className="flex h-1 gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full ${i < strength ? STRENGTH_COLOR[strength] : "bg-surface-muted"}`}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-foreground-muted">{STRENGTH_LABEL[strength]}</p>
            </div>
          )}
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
          <FieldError>{errors.confirmPassword?.message}</FieldError>
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Create workspace
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground-muted">
        Already have a workspace?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
