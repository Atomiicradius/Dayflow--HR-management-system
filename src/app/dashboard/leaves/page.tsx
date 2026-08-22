import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/get-current-profile";
import { createClient } from "@/lib/supabase/server";
import LeavesContainer from "@/components/leaves/LeavesContainer";
import type { LeaveWithProfile } from "@/components/leaves/LeaveApplyModal";

export default async function LeavesPage() {
  const currentUser = await getCurrentProfile();
  const supabase = (await createClient()) as unknown as SupabaseClient;

  // Fetch leaves joined with the profiles relation
  const { data: leavesData, error } = await supabase
    .from("leaves")
    .select("*, profiles(full_name)")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error.message}
      </p>
    );
  }

  const leaves = (leavesData || []) as LeaveWithProfile[];

  return <LeavesContainer currentUser={currentUser} initialLeaves={leaves} />;
}
