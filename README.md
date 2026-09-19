# clientCRM

clientCRM is a multi-tenant SaaS customer relationship management platform
for Sales, IT, and Digital Marketing teams. Each organization receives a
dedicated workspace for managing leads, contacts, tasks, reports, team
members, and activity history.

The platform includes a public marketing website, secure authentication,
organization-based access control, a guided onboarding experience, and a
Super Admin console for platform management.

## Features

- Organization workspaces with tenant-scoped CRM data
- Role-based access for Organization Admin, IT, Sales, and Digital Marketing
- Super Admin console for organizations, users, plans, subscriptions, and audit activity
- Lead management with search, filtering, sorting, assignment, and status tracking
- Contact management with organization-aware access
- Task management with priorities, due dates, assignments, and status tracking
- Dashboard KPIs and interactive Recharts visualizations
- Reports with CSV export
- Profile, password, and organization settings
- Public pages for Home, Features, Pricing, About, and Contact
- Signup, login, password recovery, and workspace onboarding
- Responsive interface with light, dark, and system themes

## Technology

- Next.js 16 with the App Router
- React 19 and TypeScript
- PostgreSQL and Prisma 6
- Auth.js with credentials authentication
- Tailwind CSS v4
- Radix UI and Lucide icons
- React Hook Form and Zod validation
- SWR for client-side data fetching
- Recharts for dashboard visualizations

## Getting Started

### Requirements

- Node.js 20 or later
- PostgreSQL database
- npm

### Installation

1. Install the project dependencies:

   ```bash
   npm install
   ```

2. Create your local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Add your PostgreSQL connection string and authentication secret to `.env`:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/clientcrm"
   AUTH_SECRET="your-local-auth-secret"
   ```

4. Generate the Prisma client and apply the database migration:

   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

5. Add the sample organizations, users, plans, leads, contacts, and tasks:

   ```bash
   npx prisma db seed
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Demo Accounts

The seed script creates sample accounts for local development:

| Account | Email | Password | Access |
|---|---|---|---|
| Organization Admin | `admin@northwind.clientcrm.com` | `Admin123!` | Northwind workspace |
| Organization Admin | `admin@globex.clientcrm.com` | `Admin123!` | Globex workspace |

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Create and apply a development migration |
| `npm run db:push` | Synchronize the schema with the database |
| `npm run db:seed` | Populate the database with sample data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:deploy` | Apply migrations for deployment |

## Project Structure

```text
clientcrm/
├── app/
│   ├── (marketing)/       Public marketing pages
│   ├── (auth)/            Login, signup, and password recovery
│   ├── (dashboard)/       CRM workspace pages
│   ├── (admin)/admin/     Super Admin console
│   ├── onboarding/        New workspace onboarding
│   └── api/               Application route handlers
├── components/            Reusable UI and feature components
├── lib/                   Authentication, permissions, validation, and utilities
├── prisma/                Database schema, migrations, and seed data
├── auth.ts                Auth.js configuration
├── middleware.ts          Route access middleware
└── public/                Public assets
```

## Access Model

Each organization owns its CRM records through an organization identifier.
Server-side permission checks and tenant-aware queries keep workspace data
organized for the signed-in organization. Organization roles control access
to CRM features, while the Super Admin role manages platform-level resources.

## Database

Prisma manages the PostgreSQL schema, migrations, and generated database
client. The main entities include organizations, users, plans,
subscriptions, leads, contacts, tasks, and activity records.

## License

This project is an internal clientCRM application.
