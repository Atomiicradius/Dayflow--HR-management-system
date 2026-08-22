import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCurrentProfile } from "@/lib/get-current-profile";
import { createClient } from "@/lib/supabase/server";
import { EmployeeGrid } from "@/components/employees/EmployeeGrid";
import type { EmployeeDirectoryCardData } from "@/components/employees/types";
import type { AttendanceStatus, Profile } from "@/types/database.types";

export default async function EmployeesPage() {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  // See src/app/dashboard/profile/actions.ts for why this is untyped:
  // @supabase/supabase-js 2.112.x collapses this project's Database type to
  // `never` on multi-column .select() chains.
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: profiles, error }, { data: attendanceRows }, { data: leaveRows }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name", { ascending: true }),
    supabase.from("attendance").select("user_id, status").eq("date", today),
    supabase
      .from("leaves")
      .select("user_id")
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today),
  ]);

  if (error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error.message}
      </p>
    );
  }

  const typedProfiles = (profiles ?? []) as Profile[];
  const typedAttendance = (attendanceRows ?? []) as { user_id: string; status: AttendanceStatus }[];
  const typedLeaves = (leaveRows ?? []) as { user_id: string }[];

  const attendanceToday = new Map(typedAttendance.map((row) => [row.user_id, row.status]));
  const onLeaveToday = new Set(typedLeaves.map((row) => row.user_id));

  const employees: EmployeeDirectoryCardData[] = typedProfiles.map((row) => {
    let workStatus: AttendanceStatus = "absent";
    if (attendanceToday.has(row.id)) {
      workStatus = attendanceToday.get(row.id) as AttendanceStatus;
    } else if (onLeaveToday.has(row.id)) {
      workStatus = "leave";
    }
    return { ...row, workStatus };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Employee Directory</h1>
        <p className="text-sm text-muted-foreground">
          Browse the organization, check live attendance status, and explore the reporting tree.
        </p>
      </div>

      <EmployeeGrid initialEmployees={employees} />
    </div>
  );
}
