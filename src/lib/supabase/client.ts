"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

// One browser-side Supabase client, safe to import anywhere in client components.
// Uses the anon key — every table is protected by RLS (see supabase/migrations/0001_init.sql),
// so this client can only ever see/change what the logged-in user is allowed to.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
