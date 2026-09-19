/**
 * prisma/seed.ts
 * ----------------------------------------------------------------------------
 * Populates a fresh database with realistic MULTI-TENANT demo data: the four
 * pricing plans, a platform Super Admin, and TWO separate demo organizations
 * (each with its own Org Admin, IT/Sales/Marketing employees, leads,
 * contacts, tasks, and activity) — specifically so you can log in as one
 * organization, then the other, and see for yourself that neither can see
 * the other's data. That side-by-side comparison is the single best way to
 * demonstrate tenant isolation in a demo or interview.
 *
 * Run with:  npx prisma db seed
 * (or it runs automatically after `npx prisma migrate dev` on a fresh DB)
 *
 * ⚠️  DEMO CREDENTIALS ONLY. Every account below uses an obviously-fake
 * password meant for local development. Change or delete these accounts
 * before deploying anywhere real users can reach them.
 */
import { PrismaClient, Role, LeadStatus, LeadSource, Priority, TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 10); // lower cost factor for fast local seeding
}

function daysAgoDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}
function daysFromNowDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

const PLAN_DEFS = [
  { tier: "FREE" as const, name: "Free", priceMonthly: 0, maxUsers: 3, maxLeads: 100, features: ["Up to 3 users", "Up to 100 leads", "Core CRM features", "Community support"] },
  { tier: "STARTER" as const, name: "Starter", priceMonthly: 29, maxUsers: 10, maxLeads: 1000, features: ["Up to 10 users", "Up to 1,000 leads", "Reports & CSV export", "Email support"] },
  { tier: "PROFESSIONAL" as const, name: "Professional", priceMonthly: 79, maxUsers: 50, maxLeads: 10000, features: ["Up to 50 users", "Up to 10,000 leads", "Department performance reports", "Priority support"] },
  { tier: "ENTERPRISE" as const, name: "Enterprise", priceMonthly: 249, maxUsers: 999999, maxLeads: 999999, features: ["Unlimited users", "Unlimited leads", "Dedicated onboarding", "SLA-backed support"] },
];

interface OrgSeedConfig {
  orgName: string;
  slug: string;
  planTier: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  subscriptionStatus: "TRIAL" | "ACTIVE";
  emailDomain: string;
  people: { name: string; emailLocal: string; role: Role; password: string; jobTitle: string }[];
}

async function seedOrganization(config: OrgSeedConfig, plans: Record<string, { id: string }>) {
  const organization = await prisma.organization.create({
    data: {
      name: config.orgName,
      slug: config.slug,
      status: config.subscriptionStatus === "ACTIVE" ? "ACTIVE" : "TRIAL",
    },
  });

  await prisma.subscription.create({
    data: {
      organizationId: organization.id,
      planId: plans[config.planTier].id,
      status: config.subscriptionStatus,
      trialEndsAt: config.subscriptionStatus === "TRIAL" ? daysFromNowDate(14) : null,
    },
  });

  const users = await Promise.all(
    config.people.map((p) =>
      prisma.user.create({
        data: {
          organizationId: organization.id,
          name: p.name,
          email: `${p.emailLocal}@${config.emailDomain}`,
          passwordHash: bcrypt.hashSync(p.password, 10),
          role: p.role,
          department: p.role,
          jobTitle: p.jobTitle,
          status: "ACTIVE",
        },
      })
    )
  );

  const admin = users.find((u) => u.role === "ADMIN")!;
  const itUser = users.find((u) => u.role === "IT")!;
  const salesUsers = users.filter((u) => u.role === "SALES");
  const mktUsers = users.filter((u) => u.role === "DIGITAL_MARKETING");

  // --- Leads --------------------------------------------------------------
  const leadDefs: Array<{
    name: string; company: string; status: LeadStatus; priority: Priority;
    source: LeadSource; department: Role; assignedTo: string; daysAgo: number;
  }> = [
    { name: "Northwind Traders", company: "Northwind Traders Inc.", status: "NEW", priority: "HIGH", source: "WEBSITE", department: "SALES", assignedTo: salesUsers[0].id, daysAgo: 1 },
    { name: "Globex Corp", company: "Globex Corporation", status: "CONTACTED", priority: "MEDIUM", source: "REFERRAL", department: "SALES", assignedTo: salesUsers[0].id, daysAgo: 3 },
    { name: "Initech Solutions", company: "Initech", status: "QUALIFIED", priority: "HIGH", source: "COLD_CALL", department: "SALES", assignedTo: salesUsers[1]?.id ?? salesUsers[0].id, daysAgo: 6 },
    { name: "Umbrella Retail", company: "Umbrella Retail Group", status: "PROPOSAL", priority: "CRITICAL", source: "EVENT", department: "SALES", assignedTo: salesUsers[1]?.id ?? salesUsers[0].id, daysAgo: 10 },
    { name: "Stark Industries", company: "Stark Industries", status: "NEGOTIATION", priority: "CRITICAL", source: "REFERRAL", department: "SALES", assignedTo: salesUsers[0].id, daysAgo: 14 },
    { name: "Wayne Enterprises", company: "Wayne Enterprises", status: "CONVERTED", priority: "HIGH", source: "WEBSITE", department: "SALES", assignedTo: salesUsers[1]?.id ?? salesUsers[0].id, daysAgo: 40 },
    { name: "Acme Retail Co.", company: "Acme Retail", status: "LOST", priority: "LOW", source: "ADVERTISEMENT", department: "SALES", assignedTo: salesUsers[0].id, daysAgo: 55 },
    { name: "Hooli Cloud", company: "Hooli", status: "NEW", priority: "MEDIUM", source: "SOCIAL_MEDIA", department: "DIGITAL_MARKETING", assignedTo: mktUsers[0].id, daysAgo: 2 },
    { name: "Pied Piper", company: "Pied Piper Inc.", status: "CONTACTED", priority: "MEDIUM", source: "EMAIL_CAMPAIGN", department: "DIGITAL_MARKETING", assignedTo: mktUsers[0].id, daysAgo: 5 },
    { name: "Cyberdyne Systems", company: "Cyberdyne Systems", status: "NEW", priority: "HIGH", source: "OTHER", department: "IT", assignedTo: itUser.id, daysAgo: 1 },
    { name: "Tyrell Corp", company: "Tyrell Corporation", status: "CONTACTED", priority: "LOW", source: "REFERRAL", department: "IT", assignedTo: itUser.id, daysAgo: 12 },
  ];

  const leads = [];
  for (const def of leadDefs) {
    const createdAt = daysAgoDate(def.daysAgo);
    leads.push(
      await prisma.lead.create({
        data: {
          organizationId: organization.id,
          name: def.name,
          company: def.company,
          email: `contact@${def.company.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example`,
          phone: "555-01" + String(10 + leads.length),
          status: def.status,
          priority: def.priority,
          source: def.source,
          department: def.department,
          assignedToId: def.assignedTo,
          createdById: admin.id,
          followUpDate: def.status === "LOST" || def.status === "CONVERTED" ? null : daysFromNowDate(3),
          notes: `Initial notes for ${def.name}.`,
          convertedAt: def.status === "CONVERTED" ? daysAgoDate(Math.max(def.daysAgo - 5, 0)) : null,
          createdAt,
          updatedAt: createdAt,
        },
      })
    );
  }

  // --- Contacts -------------------------------------------------------------
  const contactNames = ["Diane Foster", "Marcus Webb", "Renee Cho", "Trevor Banks", "Lena Ortiz", "Grace Kim"];
  const contacts = [];
  for (let i = 0; i < contactNames.length && i < leads.length; i++) {
    contacts.push(
      await prisma.contact.create({
        data: {
          organizationId: organization.id,
          name: contactNames[i],
          email: `${contactNames[i].split(" ")[0].toLowerCase()}@${leads[i].company?.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example`,
          company: leads[i].company,
          phone: "555-02" + String(10 + i),
          address: "123 Market Street, Springfield",
          notes: "Primary point of contact.",
          leadId: leads[i].id,
          assignedToId: leads[i].assignedToId,
          createdById: admin.id,
        },
      })
    );
  }

  // --- Tasks -----------------------------------------------------------------
  const taskDefs: Array<{
    title: string; status: TaskStatus; priority: Priority; department: Role;
    assignedTo: string; dueInDays: number; leadIdx?: number;
  }> = [
    { title: "Send proposal to Northwind Traders", status: "PENDING", priority: "HIGH", department: "SALES", assignedTo: salesUsers[0].id, dueInDays: 2, leadIdx: 0 },
    { title: "Follow up call with Globex", status: "PENDING", priority: "MEDIUM", department: "SALES", assignedTo: salesUsers[0].id, dueInDays: 5, leadIdx: 1 },
    { title: "Prepare contract for Umbrella Retail", status: "IN_PROGRESS", priority: "CRITICAL", department: "SALES", assignedTo: salesUsers[1]?.id ?? salesUsers[0].id, dueInDays: 1, leadIdx: 3 },
    { title: "Negotiation call — Stark Industries", status: "IN_PROGRESS", priority: "CRITICAL", department: "SALES", assignedTo: salesUsers[0].id, dueInDays: -1, leadIdx: 4 },
    { title: "Close-out paperwork — Wayne Enterprises", status: "COMPLETED", priority: "MEDIUM", department: "SALES", assignedTo: salesUsers[1]?.id ?? salesUsers[0].id, dueInDays: -10, leadIdx: 5 },
    { title: "Qualify Initech budget", status: "PENDING", priority: "HIGH", department: "SALES", assignedTo: salesUsers[1]?.id ?? salesUsers[0].id, dueInDays: -2, leadIdx: 2 },
    { title: "Launch retargeting campaign — Hooli", status: "IN_PROGRESS", priority: "MEDIUM", department: "DIGITAL_MARKETING", assignedTo: mktUsers[0].id, dueInDays: 4 },
    { title: "Draft email sequence — Pied Piper", status: "PENDING", priority: "MEDIUM", department: "DIGITAL_MARKETING", assignedTo: mktUsers[0].id, dueInDays: 6, leadIdx: 8 },
    { title: "Fix SSO login issue for Cyberdyne", status: "IN_PROGRESS", priority: "CRITICAL", department: "IT", assignedTo: itUser.id, dueInDays: 1, leadIdx: 9 },
    { title: "Provision sandbox environment — Tyrell", status: "PENDING", priority: "MEDIUM", department: "IT", assignedTo: itUser.id, dueInDays: 3, leadIdx: 10 },
    { title: "Quarterly access audit", status: "CANCELLED", priority: "LOW", department: "IT", assignedTo: itUser.id, dueInDays: -15 },
  ];

  const tasks = [];
  for (const def of taskDefs) {
    tasks.push(
      await prisma.task.create({
        data: {
          organizationId: organization.id,
          title: def.title,
          description: `Details for: ${def.title}`,
          status: def.status,
          priority: def.priority,
          department: def.department,
          assignedToId: def.assignedTo,
          createdById: admin.id,
          dueDate: daysFromNowDate(def.dueInDays),
          completedAt: def.status === "COMPLETED" ? daysAgoDate(Math.abs(def.dueInDays) + 1) : null,
          leadId: def.leadIdx !== undefined ? leads[def.leadIdx]?.id : null,
        },
      })
    );
  }

  // --- Activity log ------------------------------------------------------------
  await prisma.activity.createMany({
    data: [
      { userId: admin.id, organizationId: organization.id, action: "ORG_CREATED", description: `${admin.name} created the organization "${organization.name}"`, entityType: "organization", entityId: organization.id },
      { userId: admin.id, organizationId: organization.id, action: "USER_CREATED", description: `Created employee account for ${itUser.name} (IT)`, entityType: "user", entityId: itUser.id },
      { userId: salesUsers[0].id, organizationId: organization.id, action: "LEAD_CREATED", description: `Created lead "${leads[0].name}"`, entityType: "lead", entityId: leads[0].id },
      { userId: salesUsers[0].id, organizationId: organization.id, action: "LEAD_UPDATED", description: `Updated lead "${leads[1].name}"`, entityType: "lead", entityId: leads[1].id },
      { userId: itUser.id, organizationId: organization.id, action: "TASK_CREATED", description: `Created task "${tasks[8].title}"`, entityType: "task", entityId: tasks[8].id },
    ],
  });

  return { organization, users, admin };
}

async function main() {
  console.log("🌱 Seeding clientCRM SaaS demo data...");

  // Wipe existing data in dependency order (idempotent re-seeding for local dev).
  await prisma.contactSubmission.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.plan.deleteMany();

  // --- Plans ------------------------------------------------------------------
  const plans: Record<string, { id: string }> = {};
  for (const def of PLAN_DEFS) {
    plans[def.tier] = await prisma.plan.create({ data: def });
  }
  console.log(`✅ ${PLAN_DEFS.length} plans created`);

  // --- Platform Super Admin (no organization) ------------------------------------
  const superAdmin = await prisma.user.create({
    data: {
      name: "Taylor Quinn",
      email: "superadmin@clientcrm.com",
      passwordHash: await hash("Super123!"),
      role: "ADMIN", // organizational role is irrelevant for a Super Admin; kept for schema consistency
      status: "ACTIVE",
      isSuperAdmin: true,
      jobTitle: "Platform Administrator",
    },
  });
  console.log("✅ Super Admin created:", superAdmin.email);

  // --- Two demo organizations, to make tenant isolation obvious ------------------
  const orgA = await seedOrganization(
    {
      orgName: "Northwind Traders",
      slug: "northwind-traders",
      planTier: "PROFESSIONAL",
      subscriptionStatus: "ACTIVE",
      emailDomain: "northwind.clientcrm.com",
      people: [
        { name: "Alex Morgan", emailLocal: "admin", role: "ADMIN", password: "Admin123!", jobTitle: "Organization Admin" },
        { name: "Priya Nair", emailLocal: "it", role: "IT", password: "It12345!", jobTitle: "IT Support Lead" },
        { name: "Jordan Blake", emailLocal: "sales", role: "SALES", password: "Sales123!", jobTitle: "Account Executive" },
        { name: "Sofia Ramirez", emailLocal: "sofia.sales", role: "SALES", password: "Sales123!", jobTitle: "Sales Development Rep" },
        { name: "Marcus Lee", emailLocal: "marketing", role: "DIGITAL_MARKETING", password: "Market123!", jobTitle: "Growth Marketer" },
      ],
    },
    plans
  );
  console.log("✅ Organization A seeded:", orgA.organization.name);

  const orgB = await seedOrganization(
    {
      orgName: "Globex Marketing Group",
      slug: "globex-marketing-group",
      planTier: "FREE",
      subscriptionStatus: "TRIAL",
      emailDomain: "globex.clientcrm.com",
      people: [
        { name: "Morgan Reyes", emailLocal: "admin", role: "ADMIN", password: "Admin123!", jobTitle: "Organization Admin" },
        { name: "Devon Ellis", emailLocal: "it", role: "IT", password: "It12345!", jobTitle: "IT Administrator" },
        { name: "Casey Nolan", emailLocal: "sales", role: "SALES", password: "Sales123!", jobTitle: "Sales Lead" },
        { name: "Riley Chen", emailLocal: "marketing", role: "DIGITAL_MARKETING", password: "Market123!", jobTitle: "Marketing Manager" },
      ],
    },
    plans
  );
  console.log("✅ Organization B seeded:", orgB.organization.name);

  // A deactivated account within Org A, to demonstrate the status system.
  await prisma.user.create({
    data: {
      organizationId: orgA.organization.id,
      name: "Former Employee",
      email: "inactive@northwind.clientcrm.com",
      passwordHash: await hash("Inactive123!"),
      role: "SALES",
      department: "SALES",
      status: "INACTIVE",
    },
  });

  console.log("\n🎉 Seed complete! Demo accounts (passwords shown for local dev only):\n");
  console.table([
    { scope: "PLATFORM", org: "—", role: "Super Admin", email: superAdmin.email, password: "Super123!" },
    { scope: "Org A", org: orgA.organization.name, role: "Org Admin", email: "admin@northwind.clientcrm.com", password: "Admin123!" },
    { scope: "Org A", org: orgA.organization.name, role: "IT", email: "it@northwind.clientcrm.com", password: "It12345!" },
    { scope: "Org A", org: orgA.organization.name, role: "Sales", email: "sales@northwind.clientcrm.com", password: "Sales123!" },
    { scope: "Org A", org: orgA.organization.name, role: "Digital Marketing", email: "marketing@northwind.clientcrm.com", password: "Market123!" },
    { scope: "Org B", org: orgB.organization.name, role: "Org Admin", email: "admin@globex.clientcrm.com", password: "Admin123!" },
    { scope: "Org B", org: orgB.organization.name, role: "IT", email: "it@globex.clientcrm.com", password: "It12345!" },
    { scope: "Org B", org: orgB.organization.name, role: "Sales", email: "sales@globex.clientcrm.com", password: "Sales123!" },
    { scope: "Org B", org: orgB.organization.name, role: "Digital Marketing", email: "marketing@globex.clientcrm.com", password: "Market123!" },
  ]);
  console.log(
    "\nTip: log in as admin@northwind.clientcrm.com, note the lead/task counts, then log in as\n" +
    "admin@globex.clientcrm.com in a different browser/incognito window — you'll see completely\n" +
    "different data. That's tenant isolation working.\n"
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
