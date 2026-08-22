# Dayflow — HR Management System

Every workday, perfectly aligned.

Next.js 15 (App Router) + Supabase (Postgres, Auth, Storage) + shadcn-style UI on Tailwind CSS v4.

## Features

- **Auth** — email or Employee ID login (e.g. `OIJODO20220001`), self-service signup, role-gated routes (admin vs. employee).
- **Employee Directory & Profiles** — searchable directory with a live org chart, admin-only employee provisioning, self-service profile editing (contact info, avatar upload).
- **Attendance** — geofenced check-in/check-out (GPS distance against an admin-configured office radius), automatic present/half-day status, weekly hours tracking.
- **Leave & Time-Off** — paid/sick/unpaid leave requests with balance enforcement and overlap detection, admin approval workflow.
- **Payroll** — admin-managed salary structures, automatic Loss-of-Pay deductions for unpaid leave, PDF payslip export, compensation breakdown chart.

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Backend**: Supabase (Postgres, Auth, Storage, Row Level Security)
- **Styling**: Tailwind CSS v4, hand-authored shadcn-style UI primitives
- **Other**: Anime.js (motion), jsPDF (payslip export), Zod + react-hook-form (validation)

## Setup

1. **Create a Supabase project** at supabase.com (free tier is fine).
2. **Run the migrations**: open the SQL Editor in the Supabase dashboard and run each file in `supabase/migrations/` in order (`0001_init.sql`, `0002_employee_files_storage_policies.sql`, then the two `0003_*.sql` files).
3. **Turn on email confirmation**: Authentication → Providers → Email → make sure "Confirm email" is on.
4. **Copy env vars**: `cp .env.local.example .env.local`, fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from Project Settings → API.
5. **Install & run**:
   ```bash
   npm install
   npm run dev
   ```
6. **Seed an admin account** (one-time, from your machine — never from a client):
   ```bash
   npm run seed:admin -- "Your Name" you@company.com "TempPass123"
   ```
   That account signs in immediately at `/login` with `role = admin`. Everyone else uses `/signup` and gets `role = employee`.

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # login, signup
│   └── dashboard/
│       ├── attendance/      # check-in/out, office geofence config
│       ├── employees/       # directory (admin-only), org chart
│       ├── leaves/          # time-off requests + approval
│       ├── payroll/         # salary structures + payslips
│       └── profile/         # self-service profile editing
├── components/              # feature components, grouped by domain
├── lib/                     # Supabase clients, shared helpers
└── types/database.types.ts  # hand-written types matching the schema
supabase/migrations/         # schema, RLS policies, and additive changes
```

Row Level Security is enabled on every table, scoped to "your own row, or any row if you're admin" — most reads/writes don't need extra auth checks in application code beyond that.
