"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, Textarea } from "@/components/ui/input";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  company: z.string().optional(),
  subject: z.string().min(2, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});
type ContactFormInput = z.infer<typeof contactFormSchema>;

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormInput>({ resolver: zodResolver(contactFormSchema) });

  async function onSubmit(data: ContactFormInput) {
    setServerError(null);
    try {
      await apiPost("/api/contact", data);
      setSent(true);
      reset();
    } catch (err) {
      setServerError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Get in touch</h1>
      <p className="mt-4 text-base text-foreground-muted">
        Questions about clientCRM? Send a message and it&apos;ll be stored for review — this demo
        build doesn&apos;t have a live support team on the other end.
      </p>

      {sent ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-success/30 bg-success-soft px-6 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-success" />
          <p className="text-base font-semibold text-foreground">Message sent</p>
          <p className="text-sm text-foreground-muted">Thanks for reaching out — we&apos;ll be in touch.</p>
          <Button variant="outline" className="mt-2" onClick={() => setSent(false)}>Send another message</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
          {serverError && (
            <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
              {serverError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} />
              <FieldError>{errors.name?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              <FieldError>{errors.email?.message}</FieldError>
            </div>
          </div>
          <div>
            <Label htmlFor="company">Company (optional)</Label>
            <Input id="company" {...register("company")} />
          </div>
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" {...register("subject")} />
            <FieldError>{errors.subject?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" rows={5} {...register("message")} />
            <FieldError>{errors.message?.message}</FieldError>
          </div>
          <Button type="submit" loading={isSubmitting}>
            Send message <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
