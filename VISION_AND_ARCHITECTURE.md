# Dayflow HRMS — Vision, Architecture & Execution Blueprint

## 1. Executive Summary & Problem Space
Traditional Human Resource Management Systems (HRMS) often present cluttered interfaces, confusing navigation, and opaque approval workflows[cite: 1, 2]. **Dayflow** is an enterprise-focused HRMS engineered for high scannability, reliable attendance verification, and transparent request pipelines[cite: 1, 2].
---

## 2. Core Pain Points & Solutions

* **Opaque Approval Chains:** Eliminates ambiguity with a visual status tracker (*Submitted* → *Manager Review* → *HR Approved* → *Completed*)[cite: 1].
* **Proxy & Inaccurate Punch-Ins:** Enforces browser-level geolocation validation using the Haversine formula to confirm the employee is within a 100-meter office perimeter.
* **Attendance Discrepancies:** Replaces manual logs with a live ticking digital stopwatch and automatic overtime calculations[cite: 1].
* **Admin Data Overload:** Provides quick-filter approval tables and real-time attendance metric cards to streamline HR reviews[cite: 1].

---

## 3. Product Features & Modules

### Employee Workstation
* **Geofenced Punch-In/Out:** Validates real-time device coordinates against office coordinates. Punch-in is disabled when outside the 100-meter radius.
* **Live Session Stopwatch:** Dynamic digital timer (`HH:MM:SS`) tracking shift progress, break times, and active hours.
* **Smart Activity Calendar:** Monthly interactive calendar with status indicators and an official business tagging modal (*Client Meeting*, *On-Site Visit*, *Deep Work*).
* **Attendance Analytics:** Recharts bar charts displaying weekly logged hours against an 8-hour target benchmark and punctuality trends.

### Admin & Management Console
* **Geofence Perimeter Manager:** Settings panel to configure office latitude, longitude, and radius tolerances.
* **Headcount Metrics:** Instant overview of employees currently online, on leave, or working remotely[cite: 1].
* **Bulk Approval Matrix:** Filterable request table with inline validation to prevent schedule overlaps[cite: 1].

---

## 4. Technical Architecture
* **Frontend:** React with Tailwind CSS and `shadcn/ui` primitives[cite: 2].
* **Visual Transitions:** Native Tailwind CSS utilities and lightweight Framer Motion transitions (150ms–250ms ease-out curves)[cite: 2].
* **Data Visualization:** `Recharts` for distribution histograms and weekly hours tracking.
* **Persistence & Offline Fallback:** Active clock states, calendar tags, and attendance history persist to `localStorage` for smooth offline resilience.

---

## 5. Design System & Status Tokens

* **Aesthetic Guardrails:** No emojis[cite: 2]. State is communicated solely through solid CSS indicator dots, semantic Lucide SVG icons, and neutral badge borders[cite: 2].
* **Typography:** Sans-serif (`Inter` / system sans) for standard text; tabular monospace (`font-mono` / `tabular-nums`) for coordinates, hours, and timestamps[cite: 2].
* **Color Palette:** Slate/Zinc dark backgrounds (`#09090B` / `#0F172A`) paired with clean flat surfaces and subtle 1px dividers (`border-slate-200` / `border-zinc-800`)[cite: 2].

| Status | CSS Indicator Token | Lucide Icon | Badge Styling |
| :--- | :--- | :--- | :--- |
| **Present / In-Range** | `bg-emerald-500`[cite: 2] | `CheckCircle2`[cite: 2] | `bg-emerald-50 text-emerald-700 border-emerald-200`[cite: 2] |
| **Out of Bounds** | `bg-rose-500` | `MapPinOff` | `bg-rose-50 text-rose-700 border-rose-200` |
| **On Leave** | `bg-sky-500`[cite: 2] | `Plane`[cite: 2] | `bg-sky-50 text-sky-700 border-sky-200`[cite: 2] |
| **Pending / Overtime** | `bg-amber-500`[cite: 2] | `Clock`[cite: 2] | `bg-amber-50 text-amber-700 border-amber-200`[cite: 2] |
