"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Leave, Profile } from "@/types/database.types";

function asUntyped(supabase: Awaited<ReturnType<typeof createClient>>): SupabaseClient {
  return supabase as unknown as SupabaseClient;
}

const leaveRequestSchema = z.object({
  leave_type: z.enum(["paid", "sick", "unpaid"]),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format"),
  remarks: z.string().trim().min(3, "Remarks must be at least 3 characters").max(500, "Remarks must be under 500 characters"),
});

export interface LeaveActionState {
  error?: string;
  success?: boolean;
}

export const ANNUAL_ALLOCATION = {
  paid: 12,
  sick: 6,
  unpaid: 999,
};

export async function createLeaveRequestAction(
  _prev: LeaveActionState,
  formData: FormData
): Promise<LeaveActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const rawData = {
    leave_type: formData.get("leave_type") as string,
    start_date: formData.get("start_date") as string,
    end_date: formData.get("end_date") as string,
    remarks: formData.get("remarks") as string,
  };

  const parsed = leaveRequestSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form input." };
  }

  const { leave_type, start_date, end_date, remarks } = parsed.data;
  const start = new Date(start_date);
  const end = new Date(end_date);

  if (end < start) {
    return { error: "End date cannot be before start date." };
  }

  const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // 1. Fetch current year's approved leave requests to compute balances
  const currentYear = start.getFullYear();
  const startOfYear = `${currentYear}-01-01`;
  const endOfYear = `${currentYear}-12-31`;

  const { data: userLeaves, error: fetchError } = await asUntyped(supabase)
    .from("leaves")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .gte("start_date", startOfYear)
    .lte("end_date", endOfYear);

  if (fetchError) {
    return { error: "Failed to fetch leave history for balance verification." };
  }

  // Calculate used leaves
  const used = { paid: 0, sick: 0, unpaid: 0 };
  ((userLeaves || []) as Leave[]).forEach((l) => {
    const lStart = new Date(l.start_date);
    const lEnd = new Date(l.end_date);
    const lDuration = Math.ceil((lEnd.getTime() - lStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (l.leave_type === "paid" || l.leave_type === "sick" || l.leave_type === "unpaid") {
      used[l.leave_type as "paid" | "sick" | "unpaid"] += lDuration;
    }
  });

  const remaining = {
    paid: ANNUAL_ALLOCATION.paid - used.paid,
    sick: ANNUAL_ALLOCATION.sick - used.sick,
  };

  // Enforce leave balance rules
  if (leave_type === "paid" && duration > remaining.paid) {
    return { error: `Requested Paid Leave (${duration} days) exceeds your remaining balance (${remaining.paid} days).` };
  }

  if (leave_type === "sick" && duration > remaining.sick) {
    return { error: `Requested Sick Leave (${duration} days) exceeds your remaining balance (${remaining.sick} days).` };
  }

  if (leave_type === "unpaid") {
    // Unpaid leave is allowed ONLY if paid and sick leave balances are completely exhausted
    if (remaining.paid > 0 || remaining.sick > 0) {
      return { error: "Unpaid Leave (LOP) can only be requested if both Paid and Sick leave balances are fully exhausted." };
    }
  }

  // 2. Insert leave request
  const { error: insertError } = await asUntyped(supabase)
    .from("leaves")
    .insert({
      user_id: user.id,
      leave_type,
      start_date,
      end_date,
      remarks,
      status: "pending"
    });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function reviewLeaveAction(
  _prev: LeaveActionState,
  formData: FormData
): Promise<LeaveActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Verify that the active user is an admin
  const { data: activeProfile } = await asUntyped(supabase)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const profile = activeProfile as Profile | null;
  if (!profile || profile.role !== "admin") {
    return { error: "Only HR administrators can review leave requests." };
  }

  const leaveId = formData.get("leave_id") as string;
  const status = formData.get("status") as "approved" | "rejected";
  const adminComment = formData.get("admin_comment") as string;

  if (!leaveId || !status || !["approved", "rejected"].includes(status)) {
    return { error: "Invalid review parameters." };
  }

  const { error: updateError } = await asUntyped(supabase)
    .from("leaves")
    .update({
      status,
      admin_comment: adminComment || null,
    })
    .eq("id", leaveId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard");
  return { success: true };
}
