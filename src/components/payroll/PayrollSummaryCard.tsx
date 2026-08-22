import { Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/types/database.types";

// PLACEHOLDER — Person D owns this file. Replace the contents; keep the
// exported name and the `profile` prop so app/dashboard/page.tsx (Person A)
// doesn't need to change.
export function PayrollSummaryCard({ profile }: { profile: Profile }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Wallet className="size-4 text-muted-foreground" />
        <CardTitle>Payroll</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Net salary summary for {profile.full_name}
        <br />
        <span className="text-xs">(Person D: replace with read-only salary breakdown)</span>
      </CardContent>
    </Card>
  );
}
