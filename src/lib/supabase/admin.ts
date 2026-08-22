import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// Service-role client — BYPASSES RLS ENTIRELY. Server-only.
// Never import this from a Client Component or expose SUPABASE_SERVICE_ROLE_KEY
// to the browser. Used for: seeding the first admin, and any future
// admin-triggered action (e.g. creating an employee record on someone's behalf)
// that legitimately needs to write across every row regardless of RLS.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
