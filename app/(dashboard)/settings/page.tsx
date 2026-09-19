"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { ShieldCheck, KeyRound, Bell, User as UserIcon, History, Building2 } from "lucide-react";
import { apiFetcher, apiPatch, ApiClientError } from "@/lib/api-client";
import { updateProfileSchema, changePasswordSchema } from "@/lib/validations";
import type { z } from "zod";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/empty-state";
import { ROLE_LABELS } from "@/lib/permissions";

type ProfileInput = z.infer<typeof updateProfileSchema>;
type PasswordInput = z.infer<typeof changePasswordSchema>;

interface Profile {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "IT" | "SALES" | "DIGITAL_MARKETING";
  department: string | null;
  jobTitle: string | null;
  phone: string | null;
  avatarUrl: string | null;
  emailDigestOptIn: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const { data: profile, isLoading, mutate } = useSWR<Profile>("/api/settings/profile", apiFetcher);

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-foreground-muted">Manage your profile, security, and preferences.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile"><UserIcon className="mr-1.5 h-3.5 w-3.5 inline" />Profile</TabsTrigger>
          <TabsTrigger value="account"><KeyRound className="mr-1.5 h-3.5 w-3.5 inline" />Account</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-1.5 h-3.5 w-3.5 inline" />Notifications</TabsTrigger>
          <TabsTrigger value="organization"><Building2 className="mr-1.5 h-3.5 w-3.5 inline" />Organization</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          {isLoading || !profile ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ProfileTab profile={profile} onSaved={() => mutate()} />
          )}
        </TabsContent>

        <TabsContent value="account">
          <PasswordTab />
        </TabsContent>

        <TabsContent value="notifications">
          {isLoading || !profile ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <NotificationsTab profile={profile} onSaved={() => mutate()} />
          )}
        </TabsContent>

        <TabsContent value="organization">
          <OrganizationTab isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>

      {isAdmin && (
        <Card>
          <CardHeader className="block">
            <CardTitle>Administration</CardTitle>
            <CardDescription>Manage employees, roles, and view the organization&apos;s activity log.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 pt-4">
            <Link href="/settings/users">
              <Button variant="outline"><ShieldCheck className="h-4 w-4" /> User management</Button>
            </Link>
            <Link href="/settings/activity">
              <Button variant="outline"><History className="h-4 w-4" /> Employee activity</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ProfileTab({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: profile.name, jobTitle: profile.jobTitle, phone: profile.phone },
  });

  async function onSubmit(data: ProfileInput) {
    try {
      await apiPatch("/api/settings/profile", data);
      toast.success("Profile updated");
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update profile");
    }
  }

  return (
    <Card>
      <CardHeader className="block">
        <CardTitle>Your profile</CardTitle>
        <CardDescription>This information is visible to your team across leads, tasks, and activity.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-5 flex items-center gap-4">
          <Avatar name={profile.name} src={profile.avatarUrl} size="lg" />
          <div>
            <p className="text-sm font-medium text-foreground">{profile.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <RoleBadge role={profile.role} />
              <span className="text-xs text-foreground-muted">{ROLE_LABELS[profile.role]}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" {...register("name")} />
              <FieldError>{errors.name?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="jobTitle">Job title</Label>
              <Input id="jobTitle" placeholder="Account Executive" {...register("jobTitle")} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="+1 (555) 000-0000" {...register("phone")} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save changes</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordTab() {
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(data: PasswordInput) {
    setSuccess(false);
    try {
      await apiPatch("/api/settings/password", data);
      toast.success("Password changed");
      setSuccess(true);
      reset();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to change password");
    }
  }

  return (
    <Card>
      <CardHeader className="block">
        <CardTitle>Change password</CardTitle>
        <CardDescription>You&apos;ll need your current password to set a new one.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-sm space-y-4" noValidate>
          <div>
            <Label htmlFor="currentPassword">Current password</Label>
            <Input id="currentPassword" type="password" autoComplete="current-password" {...register("currentPassword")} />
            <FieldError>{errors.currentPassword?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="newPassword">New password</Label>
            <Input id="newPassword" type="password" autoComplete="new-password" {...register("newPassword")} />
            <FieldError>{errors.newPassword?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
            <FieldError>{errors.confirmPassword?.message}</FieldError>
          </div>
          {success && <p className="text-sm text-success">Password updated successfully.</p>}
          <Button type="submit" loading={isSubmitting}>Update password</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function NotificationsTab({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  // No local mirror of `profile.emailDigestOptIn` — the switch reflects the
  // server value directly (via SWR's cache), and `onSaved()` (SWR mutate)
  // is what makes a successful toggle appear immediately, avoiding the need
  // to sync local state to a prop in an effect.
  const [saving, setSaving] = useState(false);

  async function toggle(value: boolean) {
    setSaving(true);
    try {
      await apiPatch("/api/settings/profile", { emailDigestOptIn: value });
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save preference");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="block">
        <CardTitle>Notification preferences</CardTitle>
        <CardDescription>
          clientCRM doesn&apos;t have an in-app notification bell — see NOTIFICATIONS_GUIDE.md
          for how to add real-time notifications with Socket.IO if you want to build that in.
          This one preference below is real and saved to your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Email digest</p>
            <p className="text-xs text-foreground-muted">
              This preference is saved to your account, but no email provider is configured in this
              demo build — see the Deployment Guide to wire one up.
            </p>
          </div>
          <Switch checked={profile.emailDigestOptIn} disabled={saving} onCheckedChange={toggle} />
        </div>
      </CardContent>
    </Card>
  );
}

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  subscription: { status: string; trialEndsAt: string | null; plan: { tier: string; name: string; priceMonthly: number } } | null;
  _count: { users: number };
}

function OrganizationTab({ isAdmin }: { isAdmin: boolean }) {
  const { data: org, isLoading, mutate } = useSWR<OrgInfo>("/api/settings/organization", apiFetcher);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  if (isLoading || !org) return <Skeleton className="h-64 w-full" />;

  async function saveName() {
    setSaving(true);
    try {
      await apiPatch("/api/settings/organization", { name: name || org!.name });
      toast.success("Organization updated");
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update organization");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="block">
          <CardTitle>Organization profile</CardTitle>
          <CardDescription>
            {org._count.users} team member{org._count.users === 1 ? "" : "s"} · workspace since {new Date(org.createdAt).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="orgName">Organization name</Label>
          <div className="flex gap-2">
            <Input id="orgName" defaultValue={org.name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} />
            {isAdmin && <Button onClick={saveName} loading={saving}>Save</Button>}
          </div>
          {!isAdmin && (
            <p className="mt-2 text-xs text-foreground-muted">Only an Organization Admin can rename the workspace.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="block">
          <CardTitle>Plan & billing</CardTitle>
          <CardDescription>
            No real payment processor is connected in this build — see the Deployment Guide.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{org.subscription?.plan.name ?? "No plan"}</p>
            <p className="text-xs text-foreground-muted">
              ${org.subscription?.plan.priceMonthly ?? 0}/mo · status: {org.subscription?.status ?? "—"}
            </p>
          </div>
          {isAdmin && (
            <Link href="/onboarding">
              <Button variant="outline">Change plan</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
