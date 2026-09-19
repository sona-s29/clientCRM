import { ROLE_LABELS } from "@/lib/permissions";

export const LEAD_STATUS_OPTIONS = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "CONVERTED",
  "LOST",
] as const;

export const LEAD_SOURCE_OPTIONS = [
  "WEBSITE",
  "REFERRAL",
  "SOCIAL_MEDIA",
  "EMAIL_CAMPAIGN",
  "COLD_CALL",
  "EVENT",
  "ADVERTISEMENT",
  "OTHER",
] as const;

export const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const TASK_STATUS_OPTIONS = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export const DEPARTMENT_OPTIONS = ["SALES", "IT", "DIGITAL_MARKETING", "ADMIN"] as const;

export const ROLE_OPTIONS = ["ADMIN", "IT", "SALES", "DIGITAL_MARKETING"] as const;

export { ROLE_LABELS };

export function toLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
