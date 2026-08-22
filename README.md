# Dayflow — HR Management System

Every workday, perfectly aligned.

Next.js 15 (App Router) + Firebase (Authentication) / Supabase (Postgres, Storage) + shadcn-style UI on Tailwind CSS v4.

## Authentication & Backend Overview

- **Authentication**: Firebase Authentication is designated for user authentication, sign-in/sign-up flows, and identity management (with Supabase Auth support).
- **Database & Storage**: Supabase (Postgres, Storage) manages HR data schema (`profiles`, `attendance`, `leaves`, `payroll`) with RLS policies.

## What's here (Person A's scope)

- `supabase/migrations/0001_init.sql` — full schema (`profiles`, `attendance`, `leaves`, `payroll`), RLS policies, the `handle_new_user` trigger that auto-creates a `profiles` row (always `role = 'employee'`) on sign-up, and the `generate_employee_id` function that produces IDs like `OIJODO20220001`.
- `src/lib/supabase/{client,server,middleware,admin}.ts` — the four Supabase client flavors (browser, server component/action, middleware, service-role).
- `src/middleware.ts` — refreshes the session on every request; redirects signed-out users away from `/dashboard/**`, and non-admins away from `/dashboard/admin/**` and `/dashboard/employees/**`.
- `src/app/(auth)/login`, `src/app/(auth)/signup` — email/password auth forms for user sign in and registration. Sign-up has no role picker; every account starts as `employee`.
- `src/app/dashboard/layout.tsx` — sidebar, header, role badge, avatar menu with logout.
- `src/app/dashboard/page.tsx` — renders four summary card slots, one per teammate (see below).
- `scripts/seed-admin.ts` — the *only* way to create an admin account, run once from the command line with the service-role key.
- `src/components/ui/*` — hand-authored shadcn-equivalent primitives (Button, Input, Card, Avatar, DropdownMenu, Badge, Separator, Sonner toaster). `components.json` is in place, so `npx shadcn add <component>` works normally on a machine that can reach `ui.shadcn.com` (it's blocked in the sandbox this was built in, hence "hand-authored").

## Setup

1. **Create the Supabase project** at supabase.com (free tier is fine) in the org you're using for this hackathon.
2. **Run the migration**: open the SQL Editor in the Supabase dashboard, paste the contents of `supabase/migrations/0001_init.sql`, run it.
3. **Turn on email confirmation**: Authentication → Providers → Email → make sure "Confirm email" is on (this is what makes sign-up require email verification).
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
- Your summary card: replace the placeholder in `src/components/profile/ProfileSummaryCard.tsx` (B), `src/components/attendance/AttendanceSummaryCard.tsx` (C), `src/components/leaves/LeaveSummaryCard.tsx` and `src/components/payroll/PayrollSummaryCard.tsx` (D). Keep the exported name and the `profile: Profile` prop — `app/dashboard/page.tsx` already imports them and won't need to change.
- Get the logged-in user's profile in any Server Component with `getCurrentProfile()` from `@/lib/get-current-profile`.
- Query Supabase from a Server Component/Action with `createClient()` from `@/lib/supabase/server`; from a Client Component with `createClient()` from `@/lib/supabase/client`. RLS already restricts every table to "your own row, or any row if you're admin" — you don't need to add your own auth checks for that part.
- Need an extra column? Ping Person A rather than editing the migration yourself — one shared schema, one person merging changes to it.
- `npx shadcn add <component>` to pull in any base component not already in `src/components/ui/`.

## Known deviations from the plan doc

- Scaffolded on **Next.js 15.5.23** (pinned down from the "latest" 16.x that `create-next-app` installs by default) to match what the plan specifies and what most Supabase/shadcn examples assume.
- Tailwind v4's CSS-first config means there's no `tailwind.config.ts` — theme tokens live in `src/app/globals.css` under `@theme inline`.
- `src/components/ui/*` were hand-written to match shadcn's own source rather than pulled via `npx shadcn init`, because this sandbox can't reach `ui.shadcn.com`. Functionally identical; regenerate via the CLI later if you want the exact upstream files.
