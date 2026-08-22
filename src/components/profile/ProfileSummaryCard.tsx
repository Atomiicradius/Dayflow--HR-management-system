import { User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/types/database.types";

// PLACEHOLDER — Person B owns this file. Replace the contents; keep the
// exported name and the `profile` prop so app/dashboard/page.tsx (Person A)
// doesn't need to change.
export function ProfileSummaryCard({ profile }: { profile: Profile }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <User className="size-4 text-muted-foreground" />
        <CardTitle>My Profile</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {profile.full_name} · {profile.employee_id}
        <br />
        <span className="text-xs">(Person B: replace with avatar, position, edit shortcut)</span>
      </CardContent>
    </Card>
  );
}
