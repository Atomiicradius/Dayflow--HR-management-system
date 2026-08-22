import { EmployeeGrid } from "@/components/employees/EmployeeGrid";
import { mockEmployees } from "../mock-data";

export default function EmployeesPreviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Employee Directory</h1>
        <p className="text-sm text-muted-foreground">
          Browse the organization, check live attendance status, and explore the reporting tree.
        </p>
      </div>

      <EmployeeGrid initialEmployees={mockEmployees} />
    </div>
  );
}
