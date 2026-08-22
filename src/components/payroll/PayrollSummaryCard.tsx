import { Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Leave } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

function asUntyped(supabase: Awaited<ReturnType<typeof createClient>>): SupabaseClient {
  return supabase as unknown as SupabaseClient;
}

export async function PayrollSummaryCard({ profile }: { profile: Profile }) {
  const supabase = await createClient();

  // Fetch employee payroll entry
  const { data: payroll } = await asUntyped(supabase)
    .from("payroll")
    .select("*")
    .eq("user_id", profile.id)
    .single();

  // Fetch approved unpaid leaves to calculate LOP deductions
  const { data: unpaidLeaves } = await asUntyped(supabase)
    .from("leaves")
    .select("*")
    .eq("user_id", profile.id)
    .eq("leave_type", "unpaid")
    .eq("status", "approved");

  const getDays = (sStr: string, eStr: string) => {
    const s = new Date(sStr);
    const e = new Date(eStr);
    return Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const lopDays = ((unpaidLeaves || []) as Leave[]).reduce((acc: number, curr) => {
    return acc + getDays(curr.start_date, curr.end_date);
  }, 0);

  const base = payroll?.base_salary ?? 0;
  const allowances = payroll?.allowances ?? 0;
  const deductions = payroll?.deductions ?? 0;
  
  const dailyRate = Math.round((base + allowances) / 30);
  const lopAmount = lopDays * dailyRate;
  const netSalary = Math.max(0, base + allowances - deductions - lopAmount);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <Card className="hover-card-trigger transition-elastic border border-border bg-card">
      <CardHeader className="flex-row items-center gap-2 pb-2">
        <Wallet className="size-4 text-primary" />
        <CardTitle className="text-sm font-bold text-foreground">Monthly Payout</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Net Take-Home Pay</span>
          <span className="text-xl font-bold text-[#1A3D63] block mt-0.5">
            {payroll ? formatCurrency(netSalary) : "₹0 (Not Configured)"}
          </span>
        </div>
        {lopDays > 0 && (
          <span className="text-[10px] text-rose-600 font-semibold block bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 max-w-max">
            -{formatCurrency(lopAmount)} LOP Deduction ({lopDays}d)
          </span>
        )}
      </CardContent>
    </Card>
  );
}
