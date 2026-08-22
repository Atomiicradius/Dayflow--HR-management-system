"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validation/profile";
import { updateOwnProfileAction, uploadAvatarAction } from "@/app/dashboard/profile/actions";
import type { Profile } from "@/types/database.types";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfileEditForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [isUploading, startUploading] = useTransition();
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      phone: profile.phone ?? "",
      address: profile.address ?? "",
    },
  });

  const onSubmit = (data: UpdateProfileInput) => {
    const formData = new FormData();
    formData.set("phone", data.phone ?? "");
    formData.set("address", data.address ?? "");

    startSaving(async () => {
      const result = await updateOwnProfileAction({}, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Profile updated.");
      router.refresh();
    });
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setAvatarUrl(preview);

    const formData = new FormData();
    formData.append("file", file);

    startUploading(async () => {
      const result = await uploadAvatarAction(formData);
      if (result.error) {
        toast.error(result.error);
        setAvatarUrl(profile.avatar_url);
        return;
      }
      toast.success("Profile photo updated.");
      router.refresh();
    });

    event.target.value = "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Details</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="group relative size-16 shrink-0">
            <Avatar className="size-16">
              <AvatarImage src={avatarUrl ?? undefined} alt={profile.full_name} />
              <AvatarFallback className="text-base">{initials(profile.full_name)}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              aria-label="Change profile photo"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100 disabled:cursor-wait"
            >
              {isUploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Pencil className="size-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Click the photo to upload a new one (max 4MB).
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" placeholder="+91 98765 43210" {...register("phone")} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Residing Address</Label>
            <Textarea id="address" rows={3} {...register("address")} />
            {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
          </div>

          <Button type="submit" disabled={isSaving} className="self-start">
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
