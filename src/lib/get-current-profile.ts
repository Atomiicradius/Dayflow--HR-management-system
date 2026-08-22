import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database.types";

export async function getCurrentProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // Safe fallback if profile row creation is pending or in transition
    return {
      id: user.id,
      employee_id: `OI${(user.user_metadata?.full_name || "EM").substring(0, 2).toUpperCase()}${new Date().getFullYear()}0001`,
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      email: user.email || "",
      role: "employee",
      department: "General",
      designation: "Associate",
      manager: null,
      phone: user.user_metadata?.phone || null,
      address: null,
      avatar_url: null,
      date_of_joining: new Date().toISOString().split("T")[0],
      created_at: new Date().toISOString(),
    };
  }

  return profile as Profile;
}
