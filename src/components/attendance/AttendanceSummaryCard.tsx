import type { SupabaseClient } from "@supabase/supabase-js";
import { CalendarClock, CheckCircle2, Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Attendance, Profile } from "@/types/database.types";

export async function AttendanceSummaryCard({ profile }: { profile: Profile }) {
  const supabase = (await createClient()) as unknown as SupabaseClient;
  const todayStr = new Date().toISOString().slice(0, 10);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const weekStartStr = sevenDaysAgo.toISOString().slice(0, 10);

  const [{ data: todayRow }, { data: weekRows }] = await Promise.all([
    supabase.from("attendance").select("*").eq("user_id", profile.id).eq("date", todayStr).maybeSingle(),
    supabase.from("attendance").select("total_hours").eq("user_id", profile.id).gte("date", weekStartStr),
  ]);

  const today = todayRow as Attendance | null;
  const weeklyHours = ((weekRows ?? []) as { total_hours: number }[]).reduce(
    (sum, row) => sum + (row.total_hours ?? 0),
    0
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <CalendarClock className="size-4 text-muted-foreground" />
        <CardTitle>Attendance</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          {today?.check_in ? (
            <CheckCircle2 className="size-3.5 text-success" />
          ) : (
            <Clock className="size-3.5 text-muted-foreground" />
          )}
          <span className="text-sm font-semibold text-foreground">
            {today?.check_in ? `Checked in at ${today.check_in}` : "Not checked in yet"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{weeklyHours.toFixed(1)}h logged this week</p>
      </CardContent>
    </Card>
  );
}
