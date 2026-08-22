/**
 * Seeds the first Admin account directly via Firebase Admin SDK + Supabase service role.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts "Priya Sharma" priya@company.com "TempPass123"
 */
import "dotenv/config";
import { config as loadEnvLocal } from "dotenv";
loadEnvLocal({ path: ".env.local" });

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!url || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  if (!getApps().length) {
    if (clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId: firebaseProjectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      initializeApp({ projectId: firebaseProjectId });
    }
  }

  const adminAuth = getAuth();
  const supabaseAdmin = createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Create or fetch Firebase User
  let firebaseUser;
  try {
    firebaseUser = await adminAuth.getUserByEmail(email);
  } catch {
    firebaseUser = await adminAuth.createUser({
      email,
      password,
      displayName: fullName,
      emailVerified: true,
    });
  }

  // 2. Generate employee ID & insert admin profile
  const joinYear = new Date().getFullYear();
  const { data: generatedEmpId } = await supabaseAdmin.rpc("generate_employee_id", {
    p_full_name: fullName,
    p_join_year: joinYear,
  });

  const fallbackId = `OI${fullName.substring(0, 2).toUpperCase()}${joinYear}0001`;
  const employeeId = (generatedEmpId as string) || fallbackId;

  const { error: upsertError } = await supabaseAdmin.from("profiles").upsert({
    id: firebaseUser.uid,
    employee_id: employeeId,
    full_name: fullName,
    email: email,
    role: "admin",
    date_of_joining: new Date().toISOString().split("T")[0],
  });

  if (upsertError) {
    console.error("Failed to set admin profile:", upsertError.message);
    process.exit(1);
  }

  console.log(`Admin account ready: ${email}`);
  console.log("They can sign in immediately at /login with the password provided.");
}

main();
