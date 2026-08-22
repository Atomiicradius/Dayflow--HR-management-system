/**
 * Seeds the first Admin account directly via the Supabase service role,
 * bypassing the public sign-up form entirely — this is deliberate. The
 * plan calls for "no unauthorized privilege self-selection", so the ONLY
 * way to get role = 'admin' is for someone who already holds the service
 * role key (i.e. Person A, right now) to run this once.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts "Priya Sharma" priya@company.com "TempPass123"
 *
 * Requires .env.local to have NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY set (get both from Project Settings → API).
 */
import "dotenv/config";
import { config as loadEnvLocal } from "dotenv";
loadEnvLocal({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const [fullName, email, password] = process.argv.slice(2);

  if (!fullName || !email || !password) {
    console.error(
      'Usage: npx tsx scripts/seed-admin.ts "Full Name" email@company.com "Password123"'
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Create the auth user directly — email pre-confirmed, no verification
  //    email needed for a seeded account.
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    console.error("Failed to create auth user:", createError?.message);
    process.exit(1);
  }

  // 2. The DB trigger (handle_new_user) already inserted a 'profiles' row
  //    with role = 'employee'. Promote it to admin here — this is the one
  //    and only place in the codebase that sets role = 'admin'.
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", created.user.id);

  if (updateError) {
    console.error("User created, but failed to promote to admin:", updateError.message);
    process.exit(1);
  }

  console.log(`Admin account ready: ${email}`);
  console.log("They can sign in immediately with the password you just set.");
}

main();
