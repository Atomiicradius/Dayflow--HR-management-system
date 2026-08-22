"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validation/auth";

export interface AuthActionState {
  error?: string;
  success?: boolean;
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    loginIdentifier: formData.get("loginIdentifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  let emailToAuth = parsed.data.loginIdentifier;

  // If user entered an Employee ID (e.g. OIJODO20220001) instead of an email address
  if (!emailToAuth.includes("@")) {
    const { data: resolvedEmail } = await (
      supabase as unknown as import("@supabase/supabase-js").SupabaseClient
    ).rpc("resolve_login_email", { p_employee_id: emailToAuth });

    if (!resolvedEmail) {
      return { error: "No account found matching this Login ID." };
    }
    emailToAuth = resolvedEmail as string;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: emailToAuth,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function signupAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone ?? null,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
