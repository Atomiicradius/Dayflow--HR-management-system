"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

// @supabase/supabase-js 2.112.x's stricter query-builder types collapse to
// `never` on this project's hand-written Database type in a few call shapes
// (see get-current-profile.ts's `as Profile` cast for the same workaround).
// Casting to an untyped client for the `.from(...)` calls below sidesteps it
// without touching the shared Database type or the pinned dependency version.
function asUntyped(supabase: Awaited<ReturnType<typeof createClient>>): SupabaseClient {
  return supabase as unknown as SupabaseClient;
}

export interface UpdateProfileState {
  error?: string;
  success?: boolean;
}

const updateProfileSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{6,14}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(500, "Keep the address under 500 characters").optional(),
});

/**
 * Self-service update, allowlisted to `phone` / `address` per
 * WALKTHROUGH_PERSON_B.md — every other profiles column (role, department,
 * designation, employee_id, ...) is admin-managed and intentionally not
 * exposed here.
 */
export async function updateOwnProfileAction(
  _prev: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const parsed = updateProfileSchema.safeParse({
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { error } = await asUntyped(supabase)
    .from("profiles")
    .update({
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  return { success: true };
}

export interface UploadAvatarState {
  error?: string;
  success?: boolean;
  avatarUrl?: string;
}

/**
 * `employee-files` (0001_init.sql) is a private bucket, so a plain public
 * URL won't render the image — we mint a long-lived signed URL at upload
 * time and store that in `profiles.avatar_url`. Re-upload to refresh once it
 * expires; whether avatars should move to a public bucket instead is tracked
 * as an open question in RECONCILIATION_AUDIT.md §4.
 */
export async function uploadAvatarAction(formData: FormData): Promise<UploadAvatarState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No file provided." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Please upload an image file." };
  }
  if (file.size > 4 * 1024 * 1024) {
    return { error: "Image must be smaller than 4MB." };
  }

  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/avatar-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("employee-files")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
  const { data: signed, error: signError } = await supabase.storage
    .from("employee-files")
    .createSignedUrl(path, ONE_YEAR_SECONDS);

  if (signError || !signed) {
    return { error: signError?.message ?? "Could not generate an image URL." };
  }

  const { error: updateError } = await asUntyped(supabase)
    .from("profiles")
    .update({ avatar_url: signed.signedUrl })
    .eq("id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  return { success: true, avatarUrl: signed.signedUrl };
}
