"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database.types";

function asUntyped(supabase: Awaited<ReturnType<typeof createClient>>): SupabaseClient {
  return supabase as unknown as SupabaseClient;
}

const payrollSchema = z.object({
  user_id: z.string().uuid("Invalid user reference"),
  base_salary: z.number().nonnegative("Base salary must be a positive number"),
  allowances: z.number().nonnegative("Allowances must be a positive number"),
  deductions: z.number().nonnegative("Deductions must be a positive number"),
});

export interface PayrollActionState {
  error?: string;
  success?: boolean;
}

export async function saveSalaryStructureAction(
  _prev: PayrollActionState,
  data: { user_id: string; base_salary: number; allowances: number; deductions: number }
): Promise<PayrollActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Check admin role
  const { data: activeProfile } = await asUntyped(supabase)
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const profile = activeProfile as Profile | null;
  if (!profile || profile.role !== "admin") {
    return { error: "Only HR administrators can update payroll structures." };
  }

  const parsed = payrollSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form input." };
  }

  const { user_id, base_salary, allowances, deductions } = parsed.data;

  // Insert or update (upsert) the payroll entry
  // Because user_id has a UNIQUE constraint on payroll, upsert will update if user_id matches
  const { error: upsertError } = await asUntyped(supabase)
    .from("payroll")
    .upsert({
      user_id,
      base_salary,
      allowances,
      deductions,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (upsertError) {
    return { error: upsertError.message };
  }

  revalidatePath("/dashboard/payroll");
  revalidatePath("/dashboard");
  return { success: true };
}
