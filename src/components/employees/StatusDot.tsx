import { CheckCircle2, Clock, Plane } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types/database.types";

const STATUS_CONFIG: Record<AttendanceStatus, { dot: string; label: string }> = {
  present: { dot: "bg-success", label: "Present today" },
  leave: { dot: "bg-sky-500", label: "On approved leave" },
  absent: { dot: "bg-warning", label: "Absent" },
  half_day: { dot: "bg-warning", label: "Half day" },
};

export function StatusDot({ status, className }: { status: AttendanceStatus; className?: string }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      title={config.label}
      className={cn("inline-flex size-2.5 shrink-0 rounded-full", config.dot, className)}
    />
  );
}

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = status === "leave" ? Plane : status === "present" ? CheckCircle2 : Clock;
  const variant = status === "present" ? "success" : status === "leave" ? "secondary" : "warning";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
        variant === "success" && "border-transparent bg-success/15 text-success",
        variant === "warning" && "border-transparent bg-warning/20 text-warning",
        variant === "secondary" && "border-transparent bg-secondary text-secondary-foreground"
      )}
    >
      <Icon className="size-3" />
      {config.label}
    </span>
  );
}
