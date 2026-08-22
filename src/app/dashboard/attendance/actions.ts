"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCurrentProfile } from "@/lib/get-current-profile";
import { createClient } from "@/lib/supabase/server";
import { calculateDistance } from "@/lib/haversine";
import type { Attendance } from "@/types/database.types";

// Casting helper to bypass @supabase/supabase-js 2.112.x query-builder type bug
function asUntyped(supabase: any): SupabaseClient {
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
 * Timezone Helpers to compute times and dates in Indian Standard Time (IST, UTC+5:30)
 * regardless of the server's default timezone (e.g. Vercel's UTC).
 */
function getISTDate(): Date {
  const utcMs = Date.now();
  return new Date(utcMs + 5.5 * 60 * 60 * 1000);
}

function formatISTDate(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatISTTime(d: Date): string {
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
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

  // Retrieve global office configuration
  const { data: office, error: officeError } = await asUntyped(supabase)
    .from("office_location")
    .select("*")
    .maybeSingle();

  if (officeError) {
    return { error: "Failed to verify office geofence configuration." };
  }

  // Validate geofence boundaries
  if (office) {
    const distance = calculateDistance(latitude, longitude, office.latitude, office.longitude);
    if (distance > office.radius_meters) {
      return {
        error: `You must be within office premises to check in. (Your distance: ${Math.round(
          distance
        )}m, Allowed: ${Math.round(office.radius_meters)}m).`,
      };
    }
  } else {
    return { error: "Office location geofence coordinates are not configured by the administrator." };
  }

  // Determine local date and time in Indian Standard Time (IST)
  const istDate = getISTDate();
  const dateStr = formatISTDate(istDate);
  const timeStr = formatISTTime(istDate);

  // Check if today is Saturday or Sunday in IST
  const dayOfWeek = istDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const status = isWeekend ? "weekend" : "present";

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
        status,
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
export async function checkOutAction(_prev: AttendanceState): Promise<AttendanceState> {
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

  // Status auto-transitions: if weekend, status becomes weekend;
  // else if hours < 4, status becomes half_day, else present.
  // Preserve status if manually overridden or on leave.
  let status = typedExisting.status;
  if (!typedExisting.is_manual_override && typedExisting.status !== "leave") {
    const dayOfWeek = istDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
      status = "weekend";
    } else {
      status = totalHours < 4.0 ? "half_day" : "present";
    }
  }

  // Update check-out logs
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
