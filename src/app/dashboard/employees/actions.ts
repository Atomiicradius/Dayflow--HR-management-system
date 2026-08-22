"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentProfile } from "@/lib/get-current-profile";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export interface CreateEmployeeState {
  error?: string;
  success?: boolean;
  employeeId?: string;
  tempPassword?: string;
}

const newEmployeeSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the employee's full name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  manager: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});

function generateTempPassword(): string {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const pick = (set: string) => set[randomBytes(1)[0] % set.length];

  const chars = [
    pick(upper),
    pick(lower),
    pick(digits),
    ...Array.from({ length: 9 }, () => pick(lower + upper + digits)),
  ];

  // Fisher–Yates shuffle so the guaranteed upper/lower/digit aren't always in positions 0-2.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

/**
 * Admin-only. Creates a Supabase Auth user for a new employee with a
 * generated temporary password; `handle_new_user()` (0001_init.sql) fires
 * synchronously on the auth.users insert and creates the `profiles` row
 * (employee_id, full_name, email, role='employee'). We then fill in the
 * organizational fields the admin form collected.
 */
export async function createEmployeeAction(
  _prev: CreateEmployeeState,
  formData: FormData
): Promise<CreateEmployeeState> {
  const actingProfile = await getCurrentProfile();
  if (actingProfile.role !== "admin") {
    return { error: "Only admins can add employees." };
  }

  const parsed = newEmployeeSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    department: formData.get("department") || undefined,
    designation: formData.get("designation") || undefined,
    manager: formData.get("manager") || undefined,
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { fullName, email, department, designation, manager, phone } = parsed.data;
  const tempPassword = generateTempPassword();
  const admin = createUntypedAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    return { error: createError?.message ?? "Could not create the employee's account." };
  }

  const { data: profileRow, error: updateError } = await admin
    .from("profiles")
    .update({
      department: department || "General",
      designation: designation || "Associate",
      manager: manager || null,
      phone: phone || null,
    })
    .eq("id", created.user.id)
    .select("employee_id")
    .maybeSingle();

  if (updateError) {
    return { error: `Account created, but profile setup failed: ${updateError.message}` };
  }

  revalidatePath("/dashboard/employees");
  return {
    success: true,
    employeeId: profileRow?.employee_id,
    tempPassword,
  };
}
