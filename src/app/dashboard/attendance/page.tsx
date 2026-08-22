import type { SupabaseClient } from "@supabase/supabase-js";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/get-current-profile";
import { createClient } from "@/lib/supabase/server";
import { CheckInPanel } from "@/components/attendance/CheckInPanel";
import { OfficeLocationForm } from "@/components/attendance/OfficeLocationForm";
import type { Attendance, OfficeLocation } from "@/types/database.types";

function formatHours(row: Attendance) {
  if (!row.check_in) return "—";
  return row.total_hours ? `${row.total_hours}h` : "In progress";
}

export default async function AttendancePage() {
  const profile = await getCurrentProfile();
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  const weekStartStr = sevenDaysAgo.toISOString().slice(0, 10);

  const [{ data: todayRow }, { data: weekRows }, officeResult] = await Promise.all([
    supabase.from("attendance").select("*").eq("user_id", profile.id).eq("date", todayStr).maybeSingle(),
    supabase
      .from("attendance")
      .select("*")
      .eq("user_id", profile.id)
      .gte("date", weekStartStr)
      .order("date", { ascending: false }),
    profile.role === "admin"
      ? supabase.from("office_location").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const weeklyHours = ((weekRows ?? []) as Attendance[]).reduce((sum, row) => sum + (row.total_hours ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-sm text-muted-foreground">Check in from the office and track your hours.</p>
      </div>

      <CheckInPanel today={(todayRow as Attendance | null) ?? null} />

      <Card>
        <CardHeader>
          <CardTitle>This Week ({weeklyHours.toFixed(2)}h logged)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Check-in</th>
                  <th className="py-2 pr-4">Check-out</th>
                  <th className="py-2">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {((weekRows ?? []) as Attendance[]).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      No attendance recorded this week yet.
                    </td>
                  </tr>
                ) : (
                  ((weekRows ?? []) as Attendance[]).map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-4 font-mono">{row.date}</td>
                      <td className="py-2 pr-4 capitalize">{row.status.replace("_", " ")}</td>
                      <td className="py-2 pr-4 font-mono">{row.check_in ?? "—"}</td>
                      <td className="py-2 pr-4 font-mono">{row.check_out ?? "—"}</td>
                      <td className="py-2">{formatHours(row)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {profile.role === "admin" && (
        <OfficeLocationForm current={(officeResult.data as OfficeLocation | null) ?? null} />
      )}
    </div>
  );
}
