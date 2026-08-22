import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/firebase/admin";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/types/database.types";

export async function getCurrentProfile(): Promise<Profile> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("dayflow_session")?.value;

  if (!sessionCookie) redirect("/login");

  const decodedToken = await verifySession(sessionCookie);
  if (!decodedToken || !decodedToken.uid) redirect("/login");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key && !url.includes("placeholder") && !key.includes("placeholder")) {
    try {
      const supabaseAdmin = createUntypedAdminClient();
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", decodedToken.uid)
        .maybeSingle();

      if (profile) return profile as Profile;
    } catch (e) {
      console.warn("Failed to fetch profile from Supabase:", e);
    }
  }

  // Fallback profile object if Supabase is placeholder or profile row pending
  const fullName = decodedToken.name || decodedToken.email?.split("@")[0] || "User";
  const firstInit = fullName.substring(0, 2).toUpperCase();
  const joinYear = new Date().getFullYear();

  return {
    id: decodedToken.uid,
    employee_id: `OI${firstInit}${joinYear}0001`,
    full_name: fullName,
    email: decodedToken.email || "",
    role: "employee",
    department: "General",
    designation: "Associate",
    manager: null,
    phone: null,
    address: null,
    avatar_url: decodedToken.picture || null,
    date_of_joining: new Date().toISOString().split("T")[0],
    created_at: new Date().toISOString(),
  };
}
