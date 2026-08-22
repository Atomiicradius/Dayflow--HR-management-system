"use client";

import { useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface OrgNode {
  employee: EmployeeDirectoryCardData;
  children: OrgNode[];
}

function buildOrgTree(employees: EmployeeDirectoryCardData[]): OrgNode[] {
  const byName = new Map(employees.map((e) => [e.full_name, e]));
  const childrenByManager = new Map<string, EmployeeDirectoryCardData[]>();

  for (const employee of employees) {
    if (!employee.manager || employee.manager === employee.full_name) continue;
    const bucket = childrenByManager.get(employee.manager) ?? [];
    bucket.push(employee);
    childrenByManager.set(employee.manager, bucket);
  }

  function toNode(employee: EmployeeDirectoryCardData, ancestors: Set<string>): OrgNode {
    const nextAncestors = new Set(ancestors).add(employee.full_name);
    const directReports = (childrenByManager.get(employee.full_name) ?? []).filter(
      (child) => !nextAncestors.has(child.full_name)
    );
    return { employee, children: directReports.map((child) => toNode(child, nextAncestors)) };
  }

  const roots = employees.filter(
    (e) => !e.manager || !byName.has(e.manager) || e.manager === e.full_name
  );

  if (roots.length === 0 && employees.length > 0) {
    return employees.map((e) => toNode(e, new Set()));
  }

  return roots.map((employee) => toNode(employee, new Set()));
}

function TreeNode({
  node,
  onSelectEmployee,
  hoveredId,
  setHoveredId,
}: {
  node: OrgNode;
  onSelectEmployee: (employee: EmployeeDirectoryCardData) => void;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
}) {
  const childIds = useMemo(() => node.children.map((c) => c.employee.id), [node.children]);
  const isHighlighted = hoveredId !== null && childIds.includes(hoveredId);

  return (
    <li className="relative">
      <button
        type="button"
        onClick={() => onSelectEmployee(node.employee)}
        onMouseEnter={() => setHoveredId(node.employee.id)}
        onMouseLeave={() => setHoveredId(null)}
        className={cn(
          "flex w-64 items-center gap-3 rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isHighlighted && "border-primary/60 ring-1 ring-primary/40"
        )}
      >
        <Avatar className="size-9 shrink-0">
          <AvatarImage src={node.employee.avatar_url ?? undefined} alt={node.employee.full_name} />
          <AvatarFallback>{initials(node.employee.full_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-foreground">{node.employee.full_name}</p>
            <StatusDot status={node.employee.workStatus} />
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {node.employee.designation ?? "Associate"}
          </p>
        </div>
      </button>

      {node.children.length > 0 && (
        <ul className="mt-3 ml-8 space-y-3 border-l border-border pl-8">
          {node.children.map((child) => (
            <TreeNode
              key={child.employee.id}
              node={child}
              onSelectEmployee={onSelectEmployee}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrgChartView({
  employees,
  onSelectEmployee,
}: {
  employees: EmployeeDirectoryCardData[];
  onSelectEmployee: (employee: EmployeeDirectoryCardData) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const roots = useMemo(() => buildOrgTree(employees), [employees]);

  if (employees.length === 0) {
    return <p className="text-sm text-muted-foreground">No employees to display.</p>;
  }

  return (
    <div className="overflow-x-auto pb-4">
      <ul className="space-y-3">
        {roots.map((node) => (
          <TreeNode
            key={node.employee.id}
            node={node}
            onSelectEmployee={onSelectEmployee}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
          />
        ))}
      </ul>
    </div>
  );
}
