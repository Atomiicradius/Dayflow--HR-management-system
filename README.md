# Dayflow — HR Management System

Every workday, perfectly aligned.

Next.js 15 (App Router) + Supabase (Postgres, Auth, Storage) + shadcn-style UI on Tailwind CSS v4.

## What's here (Person A's scope)

- `supabase/migrations/0001_init.sql` — full schema (`profiles`, `attendance`, `leaves`, `payroll`), RLS policies, the `handle_new_user` trigger that auto-creates a `profiles` row (always `role = 'employee'`) on sign-up, and the `generate_employee_id` function that produces IDs like `OIJODO20220001`.
- `src/lib/supabase/{client,server,middleware,admin}.ts` — the four Supabase client flavors (browser, server component/action, middleware, service-role).
- `src/middleware.ts` — refreshes the session on every request; redirects signed-out users away from `/dashboard/**`, and non-admins away from `/dashboard/admin/**` and `/dashboard/employees/**`.
- `src/app/(auth)/login`, `src/app/(auth)/signup` — email/login ID and password auth. Supports signing in via registered email or generated Employee ID (`OIJODO20220001`).
- `src/app/dashboard/layout.tsx` — sidebar, header, role badge, avatar menu with logout.
- `src/app/dashboard/page.tsx` — renders four summary card slots, one per teammate.
- `scripts/seed-admin.ts` — the *only* way to create an admin account, run once from the command line with the service-role key.
- `src/components/ui/*` — hand-authored shadcn-equivalent primitives (Button, Input, Card, Avatar, DropdownMenu, Badge, Separator, Sonner toaster).

## Setup

1. **Create the Supabase project** at supabase.com (free tier is fine) in the org you're using for this hackathon.
2. **Run the migration**: open the SQL Editor in the Supabase dashboard, paste the contents of `supabase/migrations/0001_init.sql`, run it.
3. **Turn on email confirmation**: Authentication → Providers → Email → make sure "Confirm email" is on.
4. **Copy env vars**: `cp .env.local.example .env.local`, fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from Project Settings → API.
5. **Install & run**:
   ```bash
   npm install
   npm run dev
   ```
6. **Seed the admin account** (do this once, from your machine — never from a client):
   ```bash
   npm run seed:admin -- "Your Name" you@company.com "TempPass123"
   ```
   That account can sign in immediately at `/login` with `role = admin`. Everyone else uses `/signup` and gets `role = employee`.

## For Persons B, C, D

You don't need to wait on any of the above to start:

- Your page routes: `/dashboard/profile` (B), `/dashboard/employees` (B, admin-only), `/dashboard/attendance` (C), `/dashboard/leaves` and `/dashboard/payroll` (D). Create these under `src/app/dashboard/`.
- Your summary card: replace the placeholder in `src/components/profile/ProfileSummaryCard.tsx` (B), `src/components/attendance/AttendanceSummaryCard.tsx` (C), `src/components/leaves/LeaveSummaryCard.tsx` and `src/components/payroll/PayrollSummaryCard.tsx` (D).
- Query Supabase with `createClient()` from `@/lib/supabase/server` or `@/lib/supabase/client`. RLS already restricts every table to "your own row, or any row if you're admin".
