# 🌊 Dayflow HRMS — Every workday, perfectly aligned.

Dayflow HRMS is a next-generation, minimalist Human Resource Management System built for modern teams. Designed with an aesthetic, high-fidelity Ocean-Blue color palette and creative motion design patterns (inspired by [Zajno](https://motion.zajno.com/) and [Shadcn UI](https://ui.shadcn.com/)), this portal facilitates seamless employee requests and HR administrative controls.

This project was built as a hackathon entry, specifically focusing on the implementation of **Person D's deliverables** (Leave Management & Payroll Engines) alongside advanced frontend animations.

---

## ✨ Key Features & Business Logic (Person D)

### 1. Leave & Time-Off Management
* **Smart Leave Balance Tracker**: Tracks Paid Leave (annual), Sick Leave, and Unpaid Leave (Loss of Pay) balances in real-time.
* **Smart Leave Collision Detection**: A warning widget flags overlapping time-off requests with other team members in real-time as dates are entered in the modal.
* **Positive Balance Enforcements**: Prevents negative allowances by checking requests against remaining balances.
* **Leave Exhaustion Validation**: Enforces strict business rules blocking employees from applying for Unpaid Leave (LOP) unless they have completely exhausted their available Paid Leave and Sick Leave balances.
* **HR Admin Approval Console**: Toggles to an HR Admin workspace where pending leaves can be evaluated, commented on, and approved/rejected. Overlap warnings are shown as badges directly in the approval table.

### 2. Payroll & Salary Engine
* **Dynamic Payment of Wages Act Calculations**: Automatically subtracts Loss of Pay (LOP) deductions for approved unpaid leave days using standard calendar-day calculations:
  $$\text{Daily LOP Rate} = \frac{\text{Base Salary} + \text{Allowances}}{30}$$
* **Interactive SVG Donut Chart**: Renders compensation breakdowns dynamically on page load with a $1.4s$ spring sweeping draw animation. Hovering segments details individual allocations.
* **Loss of Pay (LOP) Warning Cards**: Renders detailed warning indicators on the employee's breakdown sheet highlighting the unpaid day count, daily deduction rate, and total subtracted amount.
* **One-Click PDF Payslip Generator**: Integrates client-side `jspdf` to compile, structure, and export official A4 salary statement invoices containing itemized LOP deductions.

### 3. Motion Graphics & Interactive UI
* **Global Cursor Glow Trailer**: Projects a hardware-accelerated, blurred radial gradient blob that trails the user's cursor across the page using smooth CSS ease-out springs.
* **Staggered Word Reveal Typography**: Animates main headers and descriptions sliding up word-by-word on route mount for a premium, editorial feel.
* **Ease-Out Ticking Counters**: Currencies and stats transition from $0$ to their target values on load.
* **Instant Demo Role Toggler**: Includes a header switcher widget that immediately swaps the user state in `localStorage` and dispatches global event signals to let you present both Employee and HR Admin workflows seamlessly.

---

## 🎨 Visual Identity & Color Palette
The application is styled around a bespoke ocean-blue color system:

* 🌌 **Deep Navy (`#0A1931`)**: Page headers, text, and main navigation background.
* 🛡️ **Dark Slate Blue (`#1A3D63`)**: Active navigation states, primary buttons, and card title accents.
* 🌊 **Muted Steel Blue (`#4A7FA7`)**: Interactive indicator bars, avatar borders, and metadata accents.
* ❄️ **Ice Blue (`#B3CFE5`)**: Inactive navigation text and header dividers.
* 🧼 **Ice White (`#F6FAFD`)**: Overall dashboard page body background and modal surfaces.

---

## 🛠️ Technical Stack
* **Framework**: Next.js 15.1.0 (App Router)
* **Language**: TypeScript
* **Styling**: Tailwind CSS
* **Icons**: Lucide React
* **PDF Exporter**: jsPDF
* **Database**: Persistent Local Storage DB Simulator (`src/utils/mockStore.ts`)

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your computer.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/dayflow-hrms.git
   cd dayflow-hrms
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   * **[http://localhost:3000](http://localhost:3000)** (or `http://localhost:3001` if port 3000 is occupied).

### Production Build
To check type validations, linting, and compile an optimized production-ready bundle:
```bash
npm run build
```
