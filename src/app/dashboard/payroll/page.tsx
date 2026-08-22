import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/get-current-profile";
import { createClient } from "@/lib/supabase/server";
import PayrollContainer from "@/components/payroll/PayrollContainer";
import type { Payroll, Profile, Leave } from "@/types/database.types";

export default async function PayrollPage() {
  const currentUser = await getCurrentProfile();
  const supabase = (await createClient()) as unknown as SupabaseClient;

  // Query payroll structures, LOP leaves, and employee profiles in parallel
  const [{ data: payrolls }, { data: leaves }, { data: profiles }] = await Promise.all([
    supabase.from("payroll").select("*"),
    supabase.from("leaves").select("*").eq("leave_type", "unpaid").eq("status", "approved"),
    supabase.from("profiles").select("*").order("full_name", { ascending: true })
  ]);

  return (
    <PayrollContainer
      currentUser={currentUser}
      initialPayrolls={(payrolls || []) as Payroll[]}
      initialLeaves={(leaves || []) as Leave[]}
      profiles={(profiles || []) as Profile[]}
    />
  );
}
