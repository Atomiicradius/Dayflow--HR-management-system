"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EmployeeDirectoryCardData } from "./types";
import { StatusDot } from "./StatusDot";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function EmployeeCard({
  employee,
  onClick,
  className,
}: {
  employee: EmployeeDirectoryCardData;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Card
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "relative cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <div className="absolute top-4 right-4">
        <StatusDot status={employee.workStatus} />
      </div>

      <div className="flex flex-col items-start gap-3">
        <Avatar className="size-12">
          <AvatarImage src={employee.avatar_url ?? undefined} alt={employee.full_name} />
          <AvatarFallback>{initials(employee.full_name)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{employee.full_name}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{employee.employee_id}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="max-w-full truncate">
            {employee.designation ?? "Associate"}
          </Badge>
          <Badge variant="outline" className="max-w-full truncate">
            {employee.department ?? "General"}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
