"use server";

import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function createSession(idToken: string) {
  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in ms
  try {
    let sessionCookie = idToken; // dev fallback: store the raw ID token

    if (adminAuth) {
      try {
        sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
      } catch {
        // Admin SDK unavailable or token invalid — keep raw ID token
      }
    }

    const cookieStore = await cookies();
    cookieStore.set("dayflow_session", sessionCookie, {
      maxAge: 60 * 60 * 24 * 5,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return { success: true };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Failed to create session.";
    return { error: errMessage };
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("dayflow_session");
  return { success: true };
}

export async function syncProfile(uid: string, email: string, fullName: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || url.includes("placeholder") || key.includes("placeholder")) {
    console.warn("Supabase credentials are placeholder or missing. Skipping profile DB sync.");
    return { success: true };
  }

  try {
    const supabaseAdmin = createUntypedAdminClient();

    // Check if profile already exists
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", uid)
      .maybeSingle();

    if (existing) {
      return { success: true };
    }

    const joinYear = new Date().getFullYear();
    const { data: generatedEmpId } = await supabaseAdmin.rpc("generate_employee_id", {
      p_full_name: fullName,
      p_join_year: joinYear,
    });

    const fallbackId = `OI${fullName.substring(0, 2).toUpperCase()}${joinYear}0001`;
    const employeeId = (generatedEmpId as string) || fallbackId;

    const { error: insertError } = await supabaseAdmin.from("profiles").insert({
      id: uid,
      employee_id: employeeId,
      full_name: fullName,
      email: email,
      role: "employee",
      date_of_joining: new Date().toISOString().split("T")[0],
    });

    if (insertError) {
      console.warn("Supabase profile insert error:", insertError.message);
    }

    return { success: true };
  } catch (error) {
    console.warn("Failed to sync profile to Supabase:", error);
    return { success: true };
  }
}
