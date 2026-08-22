import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/types/database.types";

// PLACEHOLDER — Person C owns this file. Replace the contents; keep the
// exported name and the `profile` prop so app/dashboard/page.tsx (Person A)
// doesn't need to change.
export function AttendanceSummaryCard({ profile }: { profile: Profile }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <CalendarClock className="size-4 text-muted-foreground" />
        <CardTitle>Attendance</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Today&apos;s punch state for {profile.full_name}
        <br />
        <span className="text-xs">(Person C: replace with check-in/out widget + weekly hours)</span>
      </CardContent>
    </Card>
  );
}
