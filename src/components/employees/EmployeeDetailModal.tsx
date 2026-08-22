"use client";

import { Building2, Calendar, Mail, Phone, UserRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EmployeeDirectoryCardData } from "./types";
import { StatusBadge } from "./StatusDot";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Field({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function EmployeeDetailModal({
  employee,
  open,
  onOpenChange,
}: {
  employee: EmployeeDirectoryCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {employee && (
          <>
            <DialogHeader>
              <DialogTitle>Employee Profile</DialogTitle>
              <DialogDescription>View-only.</DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-4">
              <Avatar className="size-14">
                <AvatarImage src={employee.avatar_url ?? undefined} alt={employee.full_name} />
                <AvatarFallback className="text-base">{initials(employee.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-base font-semibold text-foreground">{employee.full_name}</p>
                <p className="font-mono text-xs text-muted-foreground">{employee.employee_id}</p>
              </div>
              <div className="ml-auto">
                <StatusBadge status={employee.workStatus} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field icon={Mail} label="Email" value={employee.email} />
              <Field icon={Phone} label="Phone" value={employee.phone ?? "—"} />
              <Field icon={Building2} label="Department" value={employee.department ?? "General"} />
              <Field icon={UserRound} label="Designation" value={employee.designation ?? "Associate"} />
              <Field icon={UserRound} label="Manager" value={employee.manager ?? "—"} />
              <Field icon={Calendar} label="Date of Joining" value={formatDate(employee.date_of_joining)} />
            </div>

            {employee.address && (
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="text-sm text-foreground">{employee.address}</p>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
