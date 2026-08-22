# RECONCILIATION AUDIT: Person B (Profile & Employee Directory) vs. feat/auth-shell

This audit document reconciles Person B's feature scope (Profile, Employee Directory, and Profile Summary Card) against the authoritative `feat/auth-shell` branch in the Dayflow HRMS repository.

---

## 1. What was built, in full

### Files and Paths in Person B's Scope
1. **`src/app/dashboard/profile/page.tsx`**
   - **Auth Assumption**: Assumes a valid server-side user session retrieved via `getCurrentProfile()` from `@/lib/get-current-profile`.
   - **Schema Assumption**: Assumes `profiles` table contains `full_name`, `employee_id`, `email`, `role`, `department`, `designation`, `date_of_joining`, and `phone`.
   - **Dependencies**: Depends on `@/lib/get-current-profile` and `@/types/database.types`.

2. **`src/app/dashboard/employees/page.tsx`**
   - **Auth Assumption**: Assumes `getCurrentProfile()` supplies `profile.role` to restrict access strictly to `admin` (`if (profile.role !== "admin") redirect("/dashboard")`).
   - **Schema Assumption**: Assumes a queryable list of all employee records in `profiles`.
   - **Dependencies**: Depends on `@/lib/get-current-profile`.

3. **`src/components/profile/ProfileSummaryCard.tsx`**
   - **Contract**: Exported function component accepting `{ profile: Profile }`.
   - **Schema Assumption**: Consumes `profile.full_name` and `profile.employee_id`.
   - **Dependencies**: Rendered inside `src/app/dashboard/page.tsx` (Person A's shell).

### Assumed Schema Shapes

#### Table: `profiles`
The code in Person B's scope references and assumes the following schema fields:

| Assumed Field | Assumed Type | Nullable | Notes / Assumptions |
| :--- | :--- | :--- | :--- |
| `id` | `string` / `uuid` | No | Primary key matching authenticated user ID |
| `employee_id` | `text` | No | Unique generated ID format (e.g. `OIJODO20220001`) |
| `full_name` | `text` | No | Employee display name |
| `email` | `text` | No | Official email address |
| `role` | `'employee' \| 'admin'` | No | RBAC discriminator |
| `department` | `text` | Yes | Organizational department (default: `'General'`) |
| `designation` | `text` | Yes | Job title / position (default: `'Associate'`) |
| `manager` | `text` / `uuid` | Yes | Manager name or foreign key |
| `phone` | `text` | Yes | Contact phone number |
| `address` | `text` | Yes | Residential address |
| `avatar_url` | `text` | Yes | URL to image in Supabase storage bucket `employee-files` |
| `date_of_joining` | `date` / `string` | No | Joining date |
| `company_name` | `text` | Yes | Company entity name |
| `emergency_contact` | `text` | Yes | Emergency contact name/phone |

### UI Surfaces and Data Read/Write Operations

1. **My Profile View (`/dashboard/profile`)**
   - **Reads**: `profiles` row for the logged-in user (`id = auth.uid()`).
   - **Writes**: Edit modal / form updates `phone`, `address`, `avatar_url`, and personal details.
2. **Employee Directory View (`/dashboard/employees`)**
   - **Reads**: Full `profiles` table (`SELECT * FROM profiles ORDER BY full_name ASC`). Admin-only surface.
   - **Writes**: New employee provisioning dialog, role escalation, department/designation updates.
3. **Profile Summary Card (`ProfileSummaryCard.tsx`)**
   - **Reads**: Receives `profile: Profile` as props from `src/app/dashboard/page.tsx`.
   - **Writes**: None (read-only dashboard widget).

---

## 2. Exact Diff Against `feat/auth-shell`

### Authentication Model Diff
- **What Person B Assumes**:
  - Direct Supabase Auth session via cookies, `auth.uid()` mapped in PostgreSQL, and RLS policies active on `profiles` permitting `auth.uid() = id` (or `is_admin()`).
- **What Exists on `feat/auth-shell`**:
  - The repository maintains Supabase Auth via `@supabase/ssr` (after reverting the Firebase experiment).
  - Server Components fetch authenticated profiles via `getCurrentProfile()` in `src/lib/get-current-profile.ts`.
  - Service-role client `createAdminClient()` in `src/lib/supabase/admin.ts` exists for privileged bypass operations.

### Schema Field-by-Field Reconciliation

| Person B Assumed Column | Real Column in `0001_init.sql` | Real Type | Status / Conflict |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` (references `auth.users`) | **MATCH** |
| `employee_id` | `employee_id` | `text` (UNIQUE, NOT NULL) | **MATCH** |
| `full_name` | `full_name` | `text` (NOT NULL) | **MATCH** |
| `email` | `email` | `text` (NOT NULL) | **MATCH** |
| `role` | `role` | `text` (CHECK `role IN ('employee', 'admin')`) | **MATCH** |
| `department` | `department` | `text` (DEFAULT `'General'`) | **MATCH** |
| `designation` | `designation` | `text` (DEFAULT `'Associate'`) | **MATCH** |
| `manager` | `manager` | `text` | **MATCH** |
| `phone` | `phone` | `text` | **MATCH** |
| `address` | `address` | `text` | **MATCH** |
| `avatar_url` | `avatar_url` | `text` | **MATCH** |
| `date_of_joining` | `date_of_joining` | `date` (DEFAULT `current_date`) | **MATCH** |
| `created_at` | `created_at` | `timestamptz` | **MATCH** |
| `company_name` | *None* | *None* | **MISSING COLUMN** (Needs migration if stored in DB) |
| `emergency_contact` | *None* | *None* | **MISSING COLUMN** (Needs migration or store in JSON) |

### Missing Flows & Admin Employee Creation
- **Admin "Create Employee" Flow on `feat/auth-shell`**:
  - **Does NOT exist**.
  - Current sign-up is self-service at `/signup` (creates user via `supabase.auth.signUp()`, DB trigger `handle_new_user()` auto-inserts `profiles` row with `role = 'employee'`).
  - Admin accounts are seeded solely via `scripts/seed-admin.ts` using the service-role key.
- **Impact on Person B's `NewEmployeeDialog`**:
  - A client-side `NewEmployeeDialog` on `/dashboard/employees` **has no pre-built backend action on `feat/auth-shell` to call**.
  - If Person B builds an admin "Create Employee" dialog, they must write a dedicated Server Action using the Supabase Service-Role Admin Client (`createAdminClient().auth.admin.createUser()`) to create the user with pre-set/auto-generated credentials without signing out the current admin.

### Technology Stack & Version Comparison

| Package | Version on `feat/auth-shell` | Potential Conflict / Breaking Point |
| :--- | :--- | :--- |
| **Next.js** | `15.5.23` (App Router) | Async request APIs: `cookies()` and `headers()` must be `await`ed in Next 15. |
| **React / React-DOM** | `19.2.8` | React 19 rules apply (`useActionState`, async transitions). |
| **Tailwind CSS** | `^4.0.0` (Tailwind v4) | **CSS-first configuration**: Theme variables live in `src/app/globals.css` under `@theme inline`. There is **NO `tailwind.config.ts`**. Importing plugins like `@tailwindcss/forms` via `tailwind.config.js` will break. |
| **Icons** | `lucide-react` `^1.33.0` | Use standard Lucide icon components. |
| **Form Management** | `react-hook-form` `^7.86.0` + `@hookform/resolvers` `^5.9.1` + `zod` `^4.4.3` | Compatible. |
| **UI Primitives** | Custom hand-authored shadcn primitives in `src/components/ui/` | Primitives for Button, Input, Card, Avatar, DropdownMenu, Badge, Separator, Sonner are already present in `src/components/ui/`. |

### Layout & Navigation Implementation
- **Person A's Layout (`src/app/dashboard/layout.tsx`)**:
  - Standard CSS grid layout (`grid-cols-1 md:grid-cols-[16rem_1fr]`).
  - Fetches profile once at layout level with `await getCurrentProfile()`.
  - Header displays `profile.department`, `profile.designation`, and `UserMenu`.
  - Sidebar (`src/components/dashboard/sidebar-nav.tsx`) handles role-based item visibility (hides `/dashboard/employees` for non-admin users).
- **Conflict Risk**:
  - Person B must **NOT** create a separate dashboard shell or duplicate layout in `/dashboard/profile` or `/dashboard/employees`. They should only export the `page.tsx` default component for those route folders.

---

## 3. What is Salvageable As-Is

1. **`src/components/profile/ProfileSummaryCard.tsx`**:
   - The contract `export function ProfileSummaryCard({ profile }: { profile: Profile })` is already wired into `src/app/dashboard/page.tsx` and can be expanded without changing Person A's dashboard page.
2. **Profile Data Display (`src/app/dashboard/profile/page.tsx`)**:
   - Consuming `const profile = await getCurrentProfile()` directly in Server Components matches Person A's pattern seamlessly.
3. **Admin Route Role Check (`src/app/dashboard/employees/page.tsx`)**:
   - The guard `if (profile.role !== "admin") redirect("/dashboard")` aligns with the auth shell security model.
4. **UI Components**:
   - All components in `src/components/ui/*` (Card, Avatar, Badge, Button, Input, DropdownMenu) are ready for direct consumption.

---

## 4. Open Questions for the Team to Decide

1. **Employee Provisioning Mechanism**:
   - *Question*: Will new employees be created exclusively by the HR Admin via `/dashboard/employees` (with auto-generated temporary passwords), or will self-registration via `/signup` remain open?
   - *Action required*: If HR-only creation is required, a Server Action `createEmployeeAction` using `supabase.auth.admin.createUser()` must be implemented.

2. **Missing Schema Fields (`company_name`, `emergency_contact`)**:
   - *Question*: Should `company_name` and `emergency_contact` be added to `profiles` via an additive migration `0002_add_profile_fields.sql`, or should they be omitted / stored in metadata?
   - *Recommendation*: Add an additive migration if required by Person B's forms.

3. **Profile Editing Boundaries**:
   - *Question*: Which fields can an employee edit on `/dashboard/profile` (e.g. `phone`, `address`, `avatar_url`) versus admin-only fields (`role`, `department`, `designation`, `employee_id`)?
   - *Recommendation*: Enforce field-level validation in the update Server Action.

4. **Storage Bucket for Avatars**:
   - *Question*: `0001_init.sql` creates bucket `'employee-files'` (`public: false`). Should avatar images be public or accessed via signed URLs?
