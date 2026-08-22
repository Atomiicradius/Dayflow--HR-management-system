"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import { LayoutGrid, Network, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EmployeeDirectoryCardData } from "./types";
import { EmployeeCard } from "./EmployeeCard";
import { EmployeeDetailModal } from "./EmployeeDetailModal";
import { NewEmployeeDialog } from "./NewEmployeeDialog";
import { OrgChartView } from "./OrgChartView";

type ViewMode = "grid" | "org";

function matchesQuery(employee: EmployeeDirectoryCardData, query: string): boolean {
  const haystack = [
    employee.full_name,
    employee.employee_id,
    employee.department,
    employee.designation,
    employee.workStatus,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function EmployeeGrid({ initialEmployees }: { initialEmployees: EmployeeDirectoryCardData[] }) {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selected, setSelected] = useState<EmployeeDirectoryCardData | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return initialEmployees;
    return initialEmployees.filter((employee) => matchesQuery(employee, query));
  }, [initialEmployees, query]);

  useEffect(() => {
    if (viewMode !== "grid" || !gridRef.current) return;
    const cards = gridRef.current.querySelectorAll(".employee-card");
    animate(cards, {
      translateY: [8, 0],
      opacity: [0, 1],
      duration: 220,
      delay: stagger(30),
      ease: "outQuad",
    });
  }, [filtered, viewMode]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, employee ID, department..."
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-input p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === "grid"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="size-3.5" />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("org")}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === "org"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Network className="size-3.5" />
              Org Tree
            </button>
          </div>

          <NewEmployeeDialog
            onCreated={() => {
              // The new hire's row is admin-managed and best re-fetched from the
              // server (their live attendance status starts as "absent" anyway),
              // so a full reload is simpler and more correct than faking the row.
              window.location.reload();
            }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No employees match &ldquo;{query}&rdquo;.
        </p>
      ) : viewMode === "grid" ? (
        <div ref={gridRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              className="employee-card"
              onClick={() => setSelected(employee)}
            />
          ))}
        </div>
      ) : (
        <OrgChartView employees={filtered} onSelectEmployee={setSelected} />
      )}

      <EmployeeDetailModal
        employee={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
