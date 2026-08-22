import { Plane, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Leave } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ANNUAL_ALLOCATION } from "@/lib/leave-policy";

function asUntyped(supabase: Awaited<ReturnType<typeof createClient>>): SupabaseClient {
  return supabase as unknown as SupabaseClient;
}

export async function LeaveSummaryCard({ profile }: { profile: Profile }) {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;
  const endOfYear = `${currentYear}-12-31`;

  const { data: leaves } = await asUntyped(supabase)
    .from("leaves")
    .select("*")
    .eq("user_id", profile.id)
    .eq("status", "approved")
    .gte("start_date", startOfYear)
    .lte("end_date", endOfYear);

  const used = { paid: 0, sick: 0, unpaid: 0 };
  const getDays = (sStr: string, eStr: string) => {
    const s = new Date(sStr);
    const e = new Date(eStr);
    return Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  ((leaves || []) as Leave[]).forEach((l) => {
    const duration = getDays(l.start_date, l.end_date);
    if (l.leave_type === "paid") used.paid += duration;
    else if (l.leave_type === "sick") used.sick += duration;
    else if (l.leave_type === "unpaid") used.unpaid += duration;
  });

  const remaining = {
    paid: Math.max(0, ANNUAL_ALLOCATION.paid - used.paid),
    sick: Math.max(0, ANNUAL_ALLOCATION.sick - used.sick),
  };

  return (
    <Card className="hover-card-trigger transition-elastic border border-border bg-card">
      <CardHeader className="flex-row items-center gap-2 pb-2">
        <Plane className="size-4 text-primary" />
        <CardTitle className="text-sm font-bold text-foreground">Time Off Balance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-[#F6FAFD] rounded-lg p-2 border border-[#B3CFE5]/30">
            <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Paid (Remaining)</span>
            <span className="text-xl font-bold text-[#1A3D63]">{remaining.paid} / {ANNUAL_ALLOCATION.paid}</span>
          </div>
          <div className="bg-[#F6FAFD] rounded-lg p-2 border border-[#B3CFE5]/30">
            <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Sick (Remaining)</span>
            <span className="text-xl font-bold text-emerald-700">{remaining.sick} / {ANNUAL_ALLOCATION.sick}</span>
          </div>
        </div>
        {used.unpaid > 0 && (
          <div className="flex items-center justify-between bg-amber-50 text-amber-800 text-xs px-2.5 py-2 rounded-lg border border-amber-200/50">
            <div className="flex items-center gap-1 font-semibold">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>Loss of Pay (LOP) Leaves</span>
            </div>
            <span className="font-bold">{used.unpaid} Day{used.unpaid > 1 ? 's' : ''}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
