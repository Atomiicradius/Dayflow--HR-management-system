# Dayflow HRMS — Person A Foundation & Handoff to Person B

**Branch:** `feat/auth-shell`  
**Status:** Clean, verified, and ready for Person B to build against.

---

## 1. What Person A Built (The Foundation)

Person A has implemented and tested the complete authentication system, database schema, layout shell, and role-based route gating:

### 1. Database & Security
- **`supabase/migrations/0001_init.sql`**: Authoritative PostgreSQL schema defining:
  - `profiles` table (`id uuid references auth.users`, `employee_id`, `full_name`, `email`, `role`, `department`, `designation`, `manager`, `phone`, `address`, `avatar_url`, `date_of_joining`).
  - Row-Level Security (RLS) policies: `profiles_select_own_or_admin`, `profiles_update_own_or_admin`.
  - `handle_new_user()` trigger: Automatically assigns unique `employee_id` (e.g. `OIJODO20220001`) via `generate_employee_id()` and inserts a `profiles` record with `role = 'employee'` upon sign-up.
  - Storage bucket `employee-files` (`public: false`) with authenticated upload/download policies.
- **`scripts/seed-admin.ts`**: Admin provisioning script using `supabase.auth.admin.createUser()` with pre-confirmed email. Run via `npm run seed:admin -- "Name" email@company.com "Password"`.

### 2. Authentication & Server Actions
- **`src/app/(auth)/actions.ts`**:
  - `loginAction(formData)`: Supports sign-in via **Email OR Employee ID** (e.g. `OIJODO20220001`), resolving the email automatically before authenticating with `supabase.auth.signInWithPassword`.
  - `signupAction(formData)`: Signs up new employees and passes metadata.
  - `logoutAction()`: Calls `supabase.auth.signOut()`.
- **`src/app/(auth)/login/page.tsx` & `signup/page.tsx`**: Clean, accessible forms with password show/hide toggles and purple theme styling.

### 3. Middleware & Session Management
- **`src/middleware.ts` & `src/lib/supabase/middleware.ts`**:
  - Automatically refreshes cookie sessions on every request via `@supabase/ssr`.
  - Redirects unauthenticated traffic away from `/dashboard/**` to `/login`.
  - Gated access: Redirects non-admins away from `/dashboard/admin/**` and `/dashboard/employees/**` to `/dashboard`.
  - Redirects logged-in users away from `/login` and `/signup` to `/dashboard`.

### 4. Dashboard Shell & Layout
- **`src/app/dashboard/layout.tsx`**: Sidebar navigation + top header + `UserMenu` avatar dropdown.
- **`src/app/dashboard/page.tsx`**: 4-slot summary grid rendering `ProfileSummaryCard`, `AttendanceSummaryCard`, `LeaveSummaryCard`, and `PayrollSummaryCard`.
- **`src/lib/get-current-profile.ts`**: Server-side helper that retrieves the logged-in user's profile with `supabase.auth.getUser()`.

---

## 2. Person B's Assigned Scope & Files to Build

Person B owns **Profile Management** and the **Employee Directory**:

| File / Route | Ownership | Expected Implementation |
| :--- | :--- | :--- |
| **`src/components/profile/ProfileSummaryCard.tsx`** | Person B | Replace placeholder contents to display avatar, designation, department, and edit shortcut. **Keep the `{ profile: Profile }` prop contract intact.** |
| **`src/app/dashboard/profile/page.tsx`** | Person B | Build the "My Profile" view showing employment details and personal contact info. |
| **`src/app/dashboard/profile/actions.ts`** | Person B | Server Action `updateOwnProfileAction` for self-service updates (allowlist: `phone`, `address`, `avatar_url`). |
| **`src/app/dashboard/employees/page.tsx`** | Person B | Build the Employee Directory table (admin-only view listing all employees). |
| **`src/app/dashboard/employees/actions.ts`** | Person B | Server Action `createEmployeeAction` using `createAdminClient()` to provision employees with auto-generated temp passwords. |

---

## 3. How to Consume Shared Contracts

### Fetching the Current User's Profile
In any Server Component:
```typescript
import { getCurrentProfile } from "@/lib/get-current-profile";

export default async function MyPage() {
  const profile = await getCurrentProfile(); // returns Profile object
  // ...
}
```

### Querying Supabase
- **Server Components & Server Actions**:
  ```typescript
  import { createClient } from "@/lib/supabase/server";
  const supabase = await createClient();
  ```
- **Admin Operations (Bypassing RLS for employee creation)**:
  ```typescript
  import { createAdminClient } from "@/lib/supabase/admin";
  const adminClient = createAdminClient();
  ```
- **Client Components**:
  ```typescript
  import { createClient } from "@/lib/supabase/client";
  const supabase = createClient();
  ```

---

## 4. Schema Change Protocol Note

If Person B needs extra columns (e.g. `company_name`, `emergency_contact`):
1. **Do not modify `0001_init.sql` directly.**
2. Propose the new columns as an additive migration (e.g. `0002_profile_extra_fields.sql`) and request Person A to update `src/types/database.types.ts` to prevent merge conflicts on core files.

---

## 5. Verification Status

- **TypeScript Typecheck (`npx tsc --noEmit`)**: `0 errors` ✅
- **Production Build (`npm run build`)**: Compiled all routes cleanly (`exit code 0`) ✅
- **Git Branch**: Committed and pushed to `origin/feat/auth-shell` ✅
