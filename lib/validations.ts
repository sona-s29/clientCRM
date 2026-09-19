/**
 * lib/validations.ts
 * ----------------------------------------------------------------------------
 * Zod schemas used on BOTH sides of every form:
 *   - Frontend: react-hook-form's zodResolver uses these for instant UX feedback.
 *   - Backend:  every API route re-parses the request body with the SAME
 *               schema before touching the database. Never trust the client.
 */
import { z } from "zod";

// --- Auth --------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

const passwordRules = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Include at least one uppercase letter")
  .regex(/[a-z]/, "Include at least one lowercase letter")
  .regex(/[0-9]/, "Include at least one number");

/**
 * Public SaaS signup — this is "create a new organization," not "join an
 * existing one." The person signing up always becomes that organization's
 * Org Admin (there is no role picker here); teammates are added afterward
 * via User Management (POST /api/users) or the onboarding "invite" step,
 * and THEY get assigned IT/Sales/Digital Marketing roles by the Org Admin.
 */
export const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Enter a valid email address"),
    organizationName: z.string().min(2, "Workspace name must be at least 2 characters").max(120),
    password: passwordRules,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type SignupInput = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordRules,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordRules,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// --- Users / administration ---------------------------------------------------

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: passwordRules,
  role: z.enum(["ADMIN", "IT", "SALES", "DIGITAL_MARKETING"]),
  department: z.enum(["ADMIN", "IT", "SALES", "DIGITAL_MARKETING"]).nullable().optional(),
  jobTitle: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(["ADMIN", "IT", "SALES", "DIGITAL_MARKETING"]).optional(),
  department: z.enum(["ADMIN", "IT", "SALES", "DIGITAL_MARKETING"]).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  jobTitle: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  jobTitle: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  emailDigestOptIn: z.boolean().optional(),
});

// --- Leads ---------------------------------------------------------------------

export const leadStatusEnum = z.enum([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "CONVERTED",
  "LOST",
]);
export const leadSourceEnum = z.enum([
  "WEBSITE",
  "REFERRAL",
  "SOCIAL_MEDIA",
  "EMAIL_CAMPAIGN",
  "COLD_CALL",
  "EVENT",
  "ADVERTISEMENT",
  "OTHER",
]);
export const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const departmentEnum = z.enum(["ADMIN", "IT", "SALES", "DIGITAL_MARKETING"]);

export const createLeadSchema = z.object({
  name: z.string().min(2, "Name is required").max(150),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")).nullable(),
  phone: z.string().max(30).optional().nullable(),
  company: z.string().max(150).optional().nullable(),
  status: leadStatusEnum.default("NEW"),
  priority: priorityEnum.default("MEDIUM"),
  source: leadSourceEnum.default("OTHER"),
  department: departmentEnum.default("SALES"),
  assignedToId: z.string().optional().nullable(),
  followUpDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = createLeadSchema.partial();

// --- Contacts --------------------------------------------------------------------

export const createContactSchema = z.object({
  name: z.string().min(2, "Name is required").max(150),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")).nullable(),
  phone: z.string().max(30).optional().nullable(),
  company: z.string().max(150).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  leadId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
});
export type CreateContactInput = z.infer<typeof createContactSchema>;

export const updateContactSchema = createContactSchema.partial();

// --- Tasks ---------------------------------------------------------------------

export const taskStatusEnum = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

export const createTaskSchema = z.object({
  title: z.string().min(2, "Title is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  status: taskStatusEnum.default("PENDING"),
  priority: priorityEnum.default("MEDIUM"),
  department: departmentEnum.default("SALES"),
  assignedToId: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  leadId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial();

// --- Shared list/query params ----------------------------------------------------

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});
