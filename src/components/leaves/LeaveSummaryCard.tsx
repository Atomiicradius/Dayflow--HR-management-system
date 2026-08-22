import { Plane } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/types/database.types";

// PLACEHOLDER — Person D owns this file. Replace the contents; keep the
// exported name and the `profile` prop so app/dashboard/page.tsx (Person A)
// doesn't need to change.
export function LeaveSummaryCard({ profile }: { profile: Profile }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Plane className="size-4 text-muted-foreground" />
        <CardTitle>Time Off</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Leave balance for {profile.full_name}
        <br />
        <span className="text-xs">(Person D: replace with Paid/Sick/Unpaid balance cards)</span>
      </CardContent>
    </Card>
  );
}
