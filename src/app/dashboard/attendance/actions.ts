"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCurrentProfile } from "@/lib/get-current-profile";
import { createClient } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { calculateDistance } from "@/lib/haversine";
import type { Attendance, OfficeLocation } from "@/types/database.types";

// Casting helper to bypass @supabase/supabase-js 2.112.x query-builder type bug
// (see get-current-profile.ts's `as Profile` cast for the same workaround).
function asUntyped(supabase: Awaited<ReturnType<typeof createClient>>): SupabaseClient {
  return supabase as unknown as SupabaseClient;
}

export interface AttendanceState {
  error?: string;
  success?: boolean;
}

const checkInSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  tag: z.string().trim().optional(),
});

/**
 * Timezone helpers to compute times and dates in Indian Standard Time (IST,
 * UTC+5:30) regardless of the server's default timezone (e.g. Vercel's UTC).
 * Shift the instant by +5:30 and then read it back with the UTC getters —
 * every getter call below must stay on getUTC*() or this silently
 * double-shifts against the server's local timezone.
 */
function getISTDate(): Date {
  const utcMs = Date.now();
  return new Date(utcMs + 5.5 * 60 * 60 * 1000);
}

function formatISTDate(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatISTTime(d: Date): string {
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const seconds = String(d.getUTCSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function isWeekendIST(d: Date): boolean {
  const dayOfWeek = d.getUTCDay(); // 0 = Sunday, 6 = Saturday
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * Handles employee secure geofenced check-in.
 */
export async function checkInAction(
  _prev: AttendanceState,
  formData: FormData
): Promise<AttendanceState> {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const istDate = getISTDate();

  // `attendance.status` is constrained to present/absent/half_day/leave
  // (0001_init.sql) — there's no 'weekend' value, unlike the old Prisma
  // version this was ported from. Rather than widen a shared CHECK
  // constraint unilaterally, weekends simply don't get an attendance row.
  if (isWeekendIST(istDate)) {
    return { error: "It's the weekend — no check-in needed." };
  }

  const latStr = formData.get("latitude");
  const lngStr = formData.get("longitude");
  const rawTag = formData.get("tag") as string | null;
  const tag = rawTag && rawTag.trim() !== "" ? rawTag.trim() : "Regular";

  const parsed = checkInSchema.safeParse({
    latitude: latStr ? parseFloat(latStr as string) : undefined,
    longitude: lngStr ? parseFloat(lngStr as string) : undefined,
    tag,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid coordinates or tag." };
  }

  const { latitude, longitude } = parsed.data;

  // Retrieve global office configuration. `.limit(1)` guards `.maybeSingle()`
  // against ever throwing if more than one config row exists in the future.
  const { data: office, error: officeError } = await asUntyped(supabase)
    .from("office_location")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (officeError) {
    return { error: "Failed to verify office geofence configuration." };
  }

  if (!office) {
    return { error: "Office location geofence coordinates are not configured by the administrator." };
  }

  const typedOffice = office as OfficeLocation;
  const distance = calculateDistance(latitude, longitude, typedOffice.latitude, typedOffice.longitude);
  if (distance > typedOffice.radius_meters) {
    return {
      error: `You must be within office premises to check in. (Your distance: ${Math.round(
        distance
      )}m, Allowed: ${Math.round(typedOffice.radius_meters)}m).`,
    };
  }

  const dateStr = formatISTDate(istDate);
  const timeStr = formatISTTime(istDate);

  // Upsert the daily check-in record
  const { error: dbError } = await asUntyped(supabase)
    .from("attendance")
    .upsert(
      {
        user_id: profile.id,
        date: dateStr,
        check_in: timeStr,
        check_in_lat: latitude,
        check_in_lng: longitude,
        status: "present",
        tag,
        is_manual_override: false,
      },
      { onConflict: "user_id,date" }
    );

  if (dbError) {
    return { error: dbError.message };
  }

  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Handles employee check-out.
 */
export async function checkOutAction(): Promise<AttendanceState> {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const istDate = getISTDate();
  const dateStr = formatISTDate(istDate);

  // Find existing daily log
  const { data: existing, error: findError } = await asUntyped(supabase)
    .from("attendance")
    .select("*")
    .eq("user_id", profile.id)
    .eq("date", dateStr)
    .maybeSingle();

  if (findError) {
    return { error: findError.message };
  }

  if (!existing) {
    return { error: "No check-in record found for today. Please check in first." };
  }

  const typedExisting = existing as Attendance;

  if (typedExisting.check_out) {
    return { error: "You have already checked out for today." };
  }

  const timeStr = formatISTTime(istDate);

  // Calculate shift duration in hours
  const checkInParts = typedExisting.check_in ? typedExisting.check_in.split(":").map(Number) : [9, 0, 0];
  const outH = istDate.getUTCHours();
  const outM = istDate.getUTCMinutes();
  const outS = istDate.getUTCSeconds();

  const checkInMs = (checkInParts[0] * 3600 + checkInParts[1] * 60 + (checkInParts[2] || 0)) * 1000;
  const checkOutMs = (outH * 3600 + outM * 60 + outS) * 1000;
  let diffMs = checkOutMs - checkInMs;

  if (diffMs < 0) {
    diffMs += 24 * 60 * 60 * 1000; // Handle shift crossing midnight boundary
  }

  const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

  // Status auto-transitions: if hours < 4, half_day, else present.
  // Preserve status if manually overridden by an admin or if on leave.
  // (No weekend branch here — a row is never created on a weekend, see
  // checkInAction, so there's nothing to transition into that status.)
  let status = typedExisting.status;
  if (!typedExisting.is_manual_override && typedExisting.status !== "leave") {
    status = totalHours < 4.0 ? "half_day" : "present";
  }

  const { error: updateError } = await asUntyped(supabase)
    .from("attendance")
    .update({
      check_out: timeStr,
      total_hours: totalHours,
      status,
    })
    .eq("id", typedExisting.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard");
  return { success: true };
}

const officeLocationSchema = z.object({
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  radius_meters: z.number().positive(),
});

/**
 * Admin-only. Sets the single global office geofence config. Upserts onto
 * the most recent existing row rather than always inserting, so repeated
 * saves update in place instead of accumulating rows office_location has no
 * unique constraint to prevent.
 */
export async function saveOfficeLocationAction(
  _prev: AttendanceState,
  formData: FormData
): Promise<AttendanceState> {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") {
    return { error: "Only admins can configure the office location." };
  }

  const parsed = officeLocationSchema.safeParse({
    latitude: parseFloat(formData.get("latitude") as string),
    longitude: parseFloat(formData.get("longitude") as string),
    radius_meters: parseFloat(formData.get("radius_meters") as string),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid coordinates." };
  }

  const untypedAdmin = createUntypedAdminClient();

  const { data: existing } = await untypedAdmin
    .from("office_location")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = existing
    ? await untypedAdmin
        .from("office_location")
        .update({ ...parsed.data, updated_at: new Date().toISOString() })
        .eq("id", (existing as { id: string }).id)
    : await untypedAdmin.from("office_location").insert(parsed.data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/attendance");
  return { success: true };
}
