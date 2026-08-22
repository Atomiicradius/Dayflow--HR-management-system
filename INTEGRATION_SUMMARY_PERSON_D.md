# 🌊 Dayflow HRMS — Leaves & Payroll Integration Summary (Person D)

This document summarizes the porting and integration of **Person D's features** (Leave Management & Payroll Engine) into the team's official codebase branch (`feat/auth-shell`), fully wired to the **real Supabase schema and Auth foundation**.

---

## 🚀 Key Integration Details

### 1. Leave & Time-Off Management
* **Database Wiring**: Wired inputs directly to the Supabase `leaves` table.
* **Server Actions** (`src/app/dashboard/leaves/actions.ts`):
  * `createLeaveRequestAction`: Submits leave requests. Automatically tracks annual usage metrics (12 Paid, 6 Sick allowed). Enforces **unpaid leave blocking rules** — users cannot apply for Loss of Pay (LOP) unless they have completely exhausted their available Paid and Sick balances.
  * `reviewLeaveAction`: Admin-gated action to approve/reject requests with reviewer comments.
* **Overlap / Collision Warnings**: Renders a warning widget inside [`LeaveApplyModal.tsx`](./src/components/leaves/LeaveApplyModal.tsx) when selecting dates if another team member has an approved or pending leave during the same date range. Also highlighted for admins inside the approval table.
* **Summary Widget**: Replaced the placeholder [`LeaveSummaryCard.tsx`](./src/components/leaves/LeaveSummaryCard.tsx) to query the active user's approved leaves from Supabase and display running balances.

### 2. Payroll & Salary Engine
* **Database Wiring**: Reads and updates values in the Supabase `payroll` table.
* **Server Actions** (`src/app/dashboard/payroll/actions.ts`):
  * `saveSalaryStructureAction`: Admin-only action to set base salary, allowances, and tax deductions for any employee.
* **Payment of Wages Act Deductions**: Deducts Loss of Pay (LOP) automatically for approved unpaid leaves based on calendar-day wage calculations:
  $$\text{Daily LOP Rate} = \frac{\text{Base Salary} + \text{Allowances}}{30}$$
  $$\text{LOP Deduction} = \text{LOP Days} \times \text{Daily LOP Rate}$$
* **Payslip PDF Exporter**: Integrated client-side `jsPDF` to compile and export official A4 statement invoices containing itemized LOP deductions. Styled matching the brand color palette.
* **SVG Donut Chart**: Renders compensation splits dynamically on load with a $1.4\text{s}$ ease-out spring-draw animation.
* **Summary Widget**: Replaced the placeholder [`PayrollSummaryCard.tsx`](./src/components/payroll/PayrollSummaryCard.tsx) to display take-home pay and deduction tags on the dashboard.

### 3. Visual Identity & Motion UI
* **Ocean-Blue Color System**: Updated `src/app/globals.css` variable tokens to support your custom color scheme:
  * `#0A1931` (Deep Navy) — Primary text & text headers.
  * `#1A3D63` (Dark Slate Blue) — Primary buttons & layout details.
  * `#4A7FA7` (Muted Steel Blue) — Secondary indicators & card outlines.
  * `#B3CFE5` (Ice Blue) — Input focuses & active hover states.
  * `#F6FAFD` (Ice White) — Body background.
* **Glow Trailer**: Added a hardware-accelerated, blurred radial `<CursorGlow />` trailing background blob to the main dashboard layout.
* **Word Reveals**: Added staggered, slide-up description headers (`AnimatedText.tsx`) on route navigation.
* **Counter Reveals**: Stats count up on screen render (`AnimatedCounter.tsx`).

---

## 📁 Modified and Added Files

* **Configurations**:
  * `package.json` / `package-lock.json` — Installed `jspdf` dependency.
  * `src/app/globals.css` — Integrated hex palettes, spring keyframes, and animations.
* **Layouts**:
  * `src/app/dashboard/layout.tsx` — Embedded `CursorGlow` background trailer.
* **Leaves Route**:
  * `src/app/dashboard/leaves/page.tsx` — Server component fetching leaves list from Supabase.
  * `src/app/dashboard/leaves/actions.ts` — Server Actions for leave applications and admin reviews.
  * `src/components/leaves/LeaveSummaryCard.tsx` — Dashboard card displaying balances.
  * `src/components/leaves/LeaveApplyModal.tsx` — Client leave apply form with overlap alert.
  * `src/components/leaves/LeaveApprovalTable.tsx` — Client review table.
  * `src/components/leaves/LeavesContainer.tsx` — Coordinator dashboard panel.
* **Payroll Route**:
  * `src/app/dashboard/payroll/page.tsx` — Server component fetching salaries list.
  * `src/app/dashboard/payroll/actions.ts` — Server Actions for HR admins to update payrolls.
  * `src/components/payroll/PayrollSummaryCard.tsx` — Dashboard card displaying payout.
  * `src/components/payroll/SalaryChart.tsx` — Animated SVG Donut chart.
  * `src/components/payroll/PaySlipDownload.tsx` — Statement downloader.
  * `src/components/payroll/SalaryStructureEditor.tsx` — Structure edit form.
  * `src/components/payroll/PayrollContainer.tsx` — Coordinator dashboard panel.
* **Animations UI**:
  * `src/components/ui/CursorGlow.tsx` — Background cursor trailer component.
  * `src/components/ui/AnimatedText.tsx` — Header word-reveal component.
  * `src/components/ui/AnimatedCounter.tsx` — Stat count-up component.

---

## ⚡ Verification Status

* **TypeScript Compilation**: `npx tsc --noEmit` checks succeeded with `code 0`.
* **Production Build Check**: `npm run build` compiles into a fully optimized bundle successfully with no lint or import errors.
