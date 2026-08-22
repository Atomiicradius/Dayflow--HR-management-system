"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // Cleanup only, via the service-role client: files uploaded before
  // 0002_employee_files_storage_policies.sql landed were written by the old
  // admin-client upload path below, so they carry a null `owner` (service-role
  // requests have no user JWT for Postgres to attribute). A null owner never
  // matches `owner = auth.uid()`, so the user's own session client can't see
  // or remove those orphans via RLS — admin bypasses that. Scoped to this
  // user's own folder, so it can't touch anyone else's files.
  const adminStorage = createAdminClient().storage;
  const { data: existingFiles } = await adminStorage.from("employee-files").list(user.id);
  if (existingFiles && existingFiles.length > 0) {
    await adminStorage
      .from("employee-files")
      .remove(existingFiles.map((f) => `${user.id}/${f.name}`));
  }

  // The actual upload runs through the user's own session client (not admin)
  // so Postgres attributes `owner = auth.uid()` on the object — required for
  // 0002's owner-scoped RLS policies to ever let this user manage their own
  // avatar afterwards. Any conflicting old row was already cleared above, so
  // this is always a fresh insert, not an RLS-gated update.
  const storage = supabase.storage;

  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/avatar.${extension}`;

  const { error: uploadError } = await storage
    .from("employee-files")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
  const { data: signed, error: signError } = await storage
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
